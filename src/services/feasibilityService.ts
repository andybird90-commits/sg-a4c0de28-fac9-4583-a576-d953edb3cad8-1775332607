import { supabase } from "@/integrations/supabase/client";

export interface FeasibilityInput {
  ideaDescription: string;
  sector?: string;
  stage?: string;
  projectId?: string; // Optional project ID to link analysis
}

export interface FeasibilityAnalysis {
  id: string;
  user_id: string;
  organisation_id: string;
  project_id?: string;
  idea_description: string;
  sector?: string;
  stage?: string;
  idea_title?: string;
  summary?: string;
  sector_guess?: string;
  technical_rating?: "low" | "medium" | "high";
  technical_reasoning?: string;
  technical_constraints?: string[];
  commercial_rating?: "low" | "medium" | "high";
  commercial_reasoning?: string;
  target_customers?: string[];
  revenue_ideas?: string[];
  delivery_complexity?: "low" | "medium" | "high";
  delivery_timeframe_months?: number;
  delivery_dependencies?: string[];
  notable_risks?: string[];
  regulatory_issues?: string[];
  rd_tax_flag?: "yes" | "maybe" | "no";
  rd_tax_reasoning?: string;
  next_actions?: string[];
  created_at: string;
}

export const feasibilityService = {
  async submitForAnalysis(input: FeasibilityInput): Promise<FeasibilityAnalysis> {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      throw new Error("Not authenticated");
    }

    const response = await fetch("/api/feasibility/analyze", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`
      },
      body: JSON.stringify(input)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Failed to analyze idea");
    }

    return response.json();
  },

  async getAnalyses(organisationId: string): Promise<FeasibilityAnalysis[]> {
    const { data, error } = await supabase
      .from("feasibility_analyses")
      .select("*")
      .eq("organisation_id", organisationId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as FeasibilityAnalysis[]) || [];
  },

  async getAnalysisById(id: string): Promise<FeasibilityAnalysis | null> {
    const { data, error } = await supabase
      .from("feasibility_analyses")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as FeasibilityAnalysis;
  },

  async getAnalysesByProject(projectId: string): Promise<FeasibilityAnalysis[]> {
    const { data, error } = await supabase
      .from("feasibility_analyses")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as unknown as FeasibilityAnalysis[]) || [];
  },

  async getAllAnalyses(): Promise<FeasibilityAnalysis[]> {
    const { data, error } = await supabase
      .from("feasibility_analyses")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;
    return (data as FeasibilityAnalysis[]) || [];
  },

  async updateAnalysis(id: string, updates: Partial<FeasibilityAnalysis>): Promise<void> {
    const { error } = await supabase
      .from("feasibility_analyses")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  async deleteAnalysis(id: string): Promise<void> {
    const { error } = await supabase
      .from("feasibility_analyses")
      .delete()
      .eq("id", id);

    if (error) throw error;
  }
};