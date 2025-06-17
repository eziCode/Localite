// eslint-disable-next-line import/no-unresolved
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// eslint-disable-next-line import/no-unresolved
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabase = createClient(
    "https://axdnmsjjofythsclelgu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTI4ODEsImV4cCI6MjA2NDYyODg4MX0.VeC9ToiMvcyFSAXmISqJkdMDo-CVq1B7jliLxwyH4kk"
  );

  const {
    user_id,
    userLatitude,
    userLongitude,
    userAge,
    offset = 0,
    pageSize = 25,
  } = await req.json();

  if (!user_id || !userLatitude || !userLongitude || !userAge) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), {
      status: 400,
    });
  }

  const collectedEvents: any[] = [];
  let moreToFetch = true;
  let absoluteOffset = offset;

  const LOOKAHEAD_SIZE = pageSize * 2; // or set to whatever logic you want

  while (collectedEvents.length < pageSize && moreToFetch) {
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("post_only_to_group", false)
      .gt("start_time", new Date().toISOString())
      .order("id", { ascending: true })
      .range(absoluteOffset, absoluteOffset + LOOKAHEAD_SIZE - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!events || events.length === 0) {
      moreToFetch = false;
      break;
    }

    const filtered = events.filter((e) =>
      (userAge >= e.min_age) &&
      (userAge <= e.max_age)
    );

    collectedEvents.push(...filtered);

    // Advance by raw number of events fetched to preserve paging
    absoluteOffset += events.length;

    if (events.length < LOOKAHEAD_SIZE) {
      // If we fetched less than the expected range, no more events to fetch
      moreToFetch = false;
    }
  }

  const hasMore = moreToFetch;
  const nextOffset = hasMore ? absoluteOffset : null;

  return new Response(
    JSON.stringify({
      events: collectedEvents,
      has_more: hasMore,
      next_offset: nextOffset,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
});
