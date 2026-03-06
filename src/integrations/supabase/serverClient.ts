import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}

// For server-side code we EXPECT to have the service role key.
// If it's missing, fail fast rather than silently falling back to an RLS-restricted key.
if (!serviceKey) {
  // This does not log the actual key, only the fact that it's missing.
  // Check your environment settings in Softgen: SUPABASE_SERVICE_ROLE_KEY must be set.
  console.warn("SUPABASE_SERVICE_ROLE_KEY is not set; supabaseServer cannot bypass RLS and will throw.");
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set. Configure it in your environment so server-side APIs can bypass RLS safely.");
}

export const supabaseServer = createClient<Database>(supabaseUrl, serviceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});