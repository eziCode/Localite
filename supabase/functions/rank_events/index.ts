// supabase/functions/rank_events/index.ts

// eslint-disable-next-line import/no-unresolved
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// eslint-disable-next-line import/no-unresolved
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

serve(async (req) => {
  const supabase = createClient(
    "https://axdnmsjjofythsclelgu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTI4ODEsImV4cCI6MjA2NDYyODg4MX0.VeC9ToiMvcyFSAXmISqJkdMDo-CVq1B7jliLxwyH4kk"
  );

  const { user_id, userLatitude, userLongitude, userAge, page = 1, pageSize = 25 } = await req.json();

  if (!user_id || !userLatitude || !userLongitude || !userAge) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
  }

  // Step 1: Fetch interactions
  const { data: interactions, error: interactionError } = await supabase
    .from("user_interactions")
    .select("*")
    .eq("user_id", user_id);

  if (interactionError) {
    return new Response(JSON.stringify({ error: interactionError.message }), { status: 500 });
  }

  const seenEventIds = new Set();
  const collectedEvents: any[] = [];
  let fetchOffset = (page - 1) * pageSize * 2;
  let moreToFetch = true;
  let loopCount = 0;

  while (collectedEvents.length < pageSize && moreToFetch) {
    const { data: events, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("post_only_to_group", false)
      .gt("start_time", new Date().toISOString())
      .order("start_time", { ascending: true })
      .range(fetchOffset, fetchOffset + pageSize * 2 - 1);

    if (eventError) {
      return new Response(JSON.stringify({ error: eventError.message }), { status: 500 });
    }

    if (!events || events.length === 0) {
      break;
    }

    const filtered = events
      .filter(e =>
        e.latitude != null &&
        e.longitude != null &&
        !seenEventIds.has(e.id) &&
        (e.min_age == null || userAge >= e.min_age) &&
        (e.max_age == null || userAge <= e.max_age)
      )
      .map(e => ({
        ...e,
        distance: getDistanceMiles(userLatitude, userLongitude, e.latitude, e.longitude),
      }));

    collectedEvents.push(...filtered);

    fetchOffset += pageSize * 2;

    if (events.length < pageSize * 2) {
      // No more events in the database
      moreToFetch = false;
    }
    loopCount++;
  }

  // Only send up to `pageSize` events, but indicate if more are available
  const sliced = collectedEvents.slice(0, pageSize);
  const hasMore = collectedEvents.length > pageSize || moreToFetch;
  const nextPage = hasMore ? page + loopCount : null;


  return new Response(JSON.stringify({
    events: sliced,
    has_more: hasMore,
    next_page: nextPage,
  }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});