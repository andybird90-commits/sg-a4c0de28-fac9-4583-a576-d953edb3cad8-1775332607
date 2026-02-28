import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  throw new Error("SUPABASE_URL or SERVICE_ROLE_KEY is not set for purge-old-claims function");
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

serve(async () => {
  const cutoff = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase
    .from("claims")
    .delete()
    .lt("deleted_at", cutoff);

  if (error) {
    console.error("[purge-old-claims] Error purging claims:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify({ success: true }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});