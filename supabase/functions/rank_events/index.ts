// ✅ BACKEND — supabase/functions/rank_events/index.ts

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

  const { user_id, userLatitude, userLongitude, userAge, offset = 0, pageSize = 25 } = await req.json();

  if (!user_id || !userLatitude || !userLongitude || !userAge) {
    return new Response(JSON.stringify({ error: "Missing required parameters" }), { status: 400 });
  }

  const collectedEvents: any[] = [];
  let currentOffset = offset;
  let moreToFetch = true;

  while (collectedEvents.length < pageSize && moreToFetch) {
    const { data: events, error } = await supabase
      .from("events")
      .select("*")
      .eq("post_only_to_group", false)
      .gt("start_time", new Date().toISOString())
      .range(currentOffset, currentOffset + pageSize * 2 - 1);

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    if (!events || events.length === 0) {
      moreToFetch = false;
      break;
    }

    const filtered = events
      .filter(e =>
        e.latitude != null &&
        e.longitude != null &&
        (e.min_age == null || userAge >= e.min_age) &&
        (e.max_age == null || userAge <= e.max_age)
      )
      .map(e => ({
        ...e,
        distance: getDistanceMiles(userLatitude, userLongitude, e.latitude, e.longitude),
      }));

    collectedEvents.push(...filtered);
    currentOffset += pageSize * 2;

    if (events.length < pageSize * 2) {
      moreToFetch = false;
    }
  }

  const sliced = collectedEvents.slice(0, pageSize);
  const hasMore = collectedEvents.length > pageSize || moreToFetch;
  const nextOffset = hasMore ? currentOffset : null;

  return new Response(JSON.stringify({
    events: sliced,
    has_more: hasMore,
    next_offset: nextOffset,
  }), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});
