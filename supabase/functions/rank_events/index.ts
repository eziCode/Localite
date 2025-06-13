// supabase/functions/rank_events/index.ts

// eslint-disable-next-line import/no-unresolved
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// eslint-disable-next-line import/no-unresolved
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    "https://axdnmsjjofythsclelgu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTI4ODEsImV4cCI6MjA2NDYyODg4MX0.VeC9ToiMvcyFSAXmISqJkdMDo-CVq1B7jliLxwyH4kk"
  );

  const { user_id } = await req.json();
  if (!user_id) {
    return new Response(JSON.stringify({ error: "Missing user_id" }), { status: 400 });
  }

  // 1. Fetch recent interactions
  const { data: interactions, error: interactionError } = await supabase
    .from("user_interactions")
    .select("action, metadata, action_occurred")
    .eq("user_id", user_id)
    .order("action_occurred", { ascending: false });

  if (interactionError) {
    return new Response(JSON.stringify({ error: interactionError.message }), { status: 500 });
  }

  // 2. Fetch all events
  const { data: events, error: eventError } = await supabase
    .from("events")
    .select("*")
    .eq("post_only_to_group", false) // event is public
    .gt("start_time", new Date().toISOString()) // event is in the future
    .order("start_time", { ascending: true });

  if (eventError) {
    return new Response(JSON.stringify({ error: eventError.message }), { status: 500 });
  }

  // Scoring and filtering

  return new Response(JSON.stringify(events), { // todo: implement scoring and filtering logic
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});