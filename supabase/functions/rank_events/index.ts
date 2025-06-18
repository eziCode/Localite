// eslint-disable-next-line import/no-unresolved
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// eslint-disable-next-line import/no-unresolved
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getDistanceFromLatLonInMiles(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

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

  const { data: interactions, error: interactionError } = await supabase
    .from("user_interactions")
    .select("target_id")
    .eq("user_id", user_id);

  if (interactionError) {
    return new Response(JSON.stringify({ error: interactionError.message }), { status: 500 });
  }

  const interactedWithSet = new Set(interactions.map((i) => i.target_id));

  const collectedEvents: any[] = [];
  let moreToFetch = true;
  let absoluteOffset = offset;
  const LOOKAHEAD_SIZE = pageSize * 2;

  while (collectedEvents.length < pageSize && moreToFetch) {
    const { data: events, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("post_only_to_group", false)
      .gt("start_time", new Date().toISOString())
      .order("id", { ascending: true })
      .range(absoluteOffset, absoluteOffset + LOOKAHEAD_SIZE - 1);

    if (eventError) {
      return new Response(JSON.stringify({ error: eventError.message }), { status: 500 });
    }

    if (!events || events.length === 0) {
      moreToFetch = false;
      break;
    }

    const filtered = events.filter(
      (e) => userAge >= e.min_age && userAge <= e.max_age
    );

    const groupIds = filtered.map(e => e.group_id);

    const { data: groups } = await supabase
      .from("groups")
      .select("id, members")
      .in("id", groupIds);

    const groupMap = new Map(groups?.map(group => [group.id, group]));

    const scoredEvents: any[] = [];
    for (const event of filtered) {
      const group = groupMap.get(event.group_id);
      const isUserInGroup = group?.members?.includes(user_id) || false;
      const interactedWithCount = group?.members?.filter(id => interactedWithSet.has(id)).length || 0;

      const distance = getDistanceFromLatLonInMiles(
        userLatitude,
        userLongitude,
        event.latitude,
        event.longitude
      );

      const countWithOrganizer = interactedWithSet.has(event.organizer_id) ? 1 : 0;

      const eventRecency = (new Date(event.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24);
      const recencyScore = Math.max(0, 30 - eventRecency);

      const popularityScore = event.upvotes || 0;
      const ageBracketMatchQuality = Math.max(
        0,
        Math.min(1, (userAge - event.min_age) / (event.max_age - event.min_age))
      );

      const score =
        (1 / (1 + distance)) * 10 +
        (isUserInGroup ? 5 : 0) +
        (countWithOrganizer * 2) +
        interactedWithCount +
        recencyScore +
        (popularityScore * 0.1) +
        (ageBracketMatchQuality * 5);

      scoredEvents.push({ ...event, score });
    }

    scoredEvents.sort((a, b) => (b.score || 0) - (a.score || 0));
    collectedEvents.push(...scoredEvents);

    absoluteOffset += events.length;
    if (events.length < LOOKAHEAD_SIZE) moreToFetch = false;
  }

  return new Response(
    JSON.stringify({
      events: collectedEvents,
      has_more: moreToFetch,
      next_offset: moreToFetch ? absoluteOffset : null,
    }),
    {
      headers: { "Content-Type": "application/json" },
      status: 200,
    }
  );
});
