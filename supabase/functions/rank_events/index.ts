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
  const R = 3958.8; // Radius of the Earth in miles
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
    .select("*")
    .eq("user_id", user_id);
  
  if (interactionError) {
    return new Response(JSON.stringify({ error: interactionError.message }), { status: 500 });
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

    const scoredEvents = filtered.map((event) => {
      // Score each event based on a few factors:
      // Distance from user
      const distance = getDistanceFromLatLonInMiles(
        userLatitude,
        userLongitude,
        event.latitude,
        event.longitude
      );

      // User part of the group hosting the event
      const { data: groupHostingEvent, error: groupError } = await supabase
        .from("groups")
        .select("*")
        .eq("id", event.group_id)
        .single();
      if (groupError) {
        console.error("Error fetching group for event:", groupError);
        return null; // Skip this event if group fetch fails
      }
      const isUserInGroup = groupHostingEvent?.members?.includes(user_id) || false;

      // User interacted with user who created the event
      const { data: organizerUser, error: organizerError } = await supabase
        .from("users")
        .select("*")
        .eq("user_id", event.organizer_id)
        .single();
      if (organizerError) {
        console.error("Error fetching organizer user for event:", organizerError);
        return null; // Skip this event if organizer user fetch fails
      }
      const hasInteractedWithOrganizer = interactions.some(
        (interaction) => interaction.target_id === organizerUser.id
      );

      // User interacted with person/people in group hosting the event
      const numberOfInteractedWithGroupMembers = groupHostingEvent?.members?.filter(
        (memberId) => interactions.some((interaction) => interaction.target_id === memberId)
      ).length || 0;

      // Event recency
      // Upvotes/popularity of the event
      // Age bracket match quality (small bonus if user is in midrange of min_age and max_age)
      // Event repeat attendance (if user has attended before, give a bonus)
      // Penalize events that conflict with those already on user's calendar
      // LLM-based similarity score based on event description and user interests
      // Social hints (e.g., friends attending, mutual connections)
    });

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
