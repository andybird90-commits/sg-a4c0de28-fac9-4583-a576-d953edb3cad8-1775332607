import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

export interface AuthUser {
  id: string;
  email: string;
  user_metadata?: any;
  created_at?: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

// Dynamic URL Helper
const getURL = () => {
  let url = process?.env?.NEXT_PUBLIC_VERCEL_URL ?? 
           process?.env?.NEXT_PUBLIC_SITE_URL ?? 
           "http://localhost:3000";
  
  if (!url) {
    url = "http://localhost:3000";
  }
  
  url = url.startsWith("http") ? url : `https://${url}`;
  url = url.endsWith("/") ? url : `${url}/`;
  
  return url;
};

export const authService = {
  async getCurrentUser(): Promise<AuthUser | null> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (error && (error.message?.includes("session") || error.message?.includes("JWT") || error.status === 403)) {
        await this.clearInvalidSession();
        return null;
      }
      
      return user ? {
        id: user.id,
        email: user.email || "",
        user_metadata: user.user_metadata,
        created_at: user.created_at
      } : null;
    } catch (error: any) {
      console.error("Error getting current user:", error);
      if (error?.status === 403 || error?.message?.includes("session")) {
        await this.clearInvalidSession();
      }
      return null;
    }
  },

  async getCurrentSession(): Promise<Session | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  },

  async signUp(email: string, password: string, fullName?: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${getURL()}auth/confirm-email`,
          data: fullName ? { full_name: fullName } : undefined
        }
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign up" } 
      };
    }
  },

  async signIn(email: string, password: string): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during sign in" } 
      };
    }
  },

  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during sign out" } 
      };
    }
  },

  async resetPassword(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${getURL()}auth/reset-password`,
      });

      if (error) {
        return { error: { message: error.message } };
      }

      return { error: null };
    } catch (error) {
      return { 
        error: { message: "An unexpected error occurred during password reset" } 
      };
    }
  },

  async confirmEmail(token: string, type: "signup" | "recovery" | "email_change" = "signup"): Promise<{ user: AuthUser | null; error: AuthError | null }> {
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: type
      });

      if (error) {
        return { user: null, error: { message: error.message, code: error.status?.toString() } };
      }

      const authUser = data.user ? {
        id: data.user.id,
        email: data.user.email || "",
        user_metadata: data.user.user_metadata,
        created_at: data.user.created_at
      } : null;

      return { user: authUser, error: null };
    } catch (error) {
      return { 
        user: null, 
        error: { message: "An unexpected error occurred during email confirmation" } 
      };
    }
  },

  onAuthStateChange(callback: (event: string, session: Session | null) => void) {
    return supabase.auth.onAuthStateChange(callback);
  },

  async clearInvalidSession() {
    try {
      if (typeof window !== "undefined") {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.includes("supabase")) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((key) => localStorage.removeItem(key));
        sessionStorage.clear();
        console.log("Invalid session cleared (client-side only)");
      }
    } catch (error: any) {
      if (
        error?.name === "AbortError" ||
        error?.message?.toString().toLowerCase().includes("aborted")
      ) {
        console.warn("AbortError while clearing invalid session, ignoring:", error);
        return;
      }
      console.error("Error clearing invalid session:", error);
    }
  },

  async validateSession() {
    try {
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        const anyError = error as any;
        if (
          anyError?.name === "AbortError" ||
          anyError?.message?.toString().toLowerCase().includes("aborted")
        ) {
          console.warn("Session validation aborted, skipping invalidation:", error);
          return session ?? null;
        }

        console.error("Session validation error:", error);
        await this.clearInvalidSession();
        return null;
      }

      if (!session) {
        return null;
      }

      const { error: userError } = await supabase.auth.getUser();
      if (userError) {
        const anyUserError = userError as any;
        if (
          anyUserError?.name === "AbortError" ||
          anyUserError?.message?.toString().toLowerCase().includes("aborted")
        ) {
          console.warn("User validation aborted, skipping invalidation:", userError);
          return session;
        }

        console.error("User validation error:", userError);
        await this.clearInvalidSession();
        return null;
      }

      return session;
    } catch (error: any) {
      if (
        error?.name === "AbortError" ||
        error?.message?.toString().toLowerCase().includes("aborted")
      ) {
        console.warn("Session validation aborted in catch, skipping invalidation:", error);
        return null;
      }

      console.error("Session validation error:", error);
      await this.clearInvalidSession();
      return null;
    }
  },

  setupGlobalErrorHandler() {
    if (typeof window !== "undefined") {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          const response = await originalFetch(...args);
          
          const input = args[0];
          let url = "";
          
          if (typeof input === "string") {
            url = input;
          } else if (input instanceof URL) {
            url = input.toString();
          } else if (input && typeof input === "object" && "url" in input) {
            url = (input as Request).url;
          }
          
          if (url && url.includes("supabase.co/auth") && response.status === 403) {
            console.warn("403 error from Supabase auth, clearing session");
            await this.clearInvalidSession();
            
            if (window.location.pathname !== "/") {
              window.location.href = "/";
            }
          }
          
          return response;
        } catch (error) {
          throw error;
        }
      };
    }
  }
};
