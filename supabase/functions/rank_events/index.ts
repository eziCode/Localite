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

    const scoredEvents: any[] = [];
    for (let i = 0; i < filtered.length; i++) {
      const event = filtered[i];

      // Score each event based on a few factors:
      // Distance from user
      const distance = getDistanceFromLatLonInMiles(
        userLatitude,
        userLongitude,
        event.latitude,
        event.longitude
      );

      // User part of the group hosting the event
      let userInGroupHostinEvent = false;
      let groupHostingEvent;
      try {
        const { data: groupHostingEvent } = await supabase
          .from("groups")
          .select("*")
          .eq("id", event.group_id)
          .single();

        userInGroupHostinEvent = groupHostingEvent?.members?.includes(user_id) || false;
        groupHostingEvent = groupHostingEvent;
      } catch (error) {
        console.error("Error fetching group for event:", error);
      }

      // Count of times user interacted with organizer of event
      let countOfUserInteractionsWithOrganizer = 0;
      try {
        const { data: organizerInteractions } = await supabase
          .from("users")
          .select("*")
          .eq("user_id", user_id)
          .eq("target_id", event.organizer_id);

        countOfUserInteractionsWithOrganizer = interactions.filter(
          (interaction) => interaction.target_id === organizerInteractions[0].id
        ).length || 0;
      } catch (error) {
        console.error("Error fetching organizer user for event:", error);
      }

      // User interacted with person/people in group hosting the event
      const numberOfInteractedWithGroupMembers = groupHostingEvent?.members?.filter(
        (memberId) => interactions.some((interaction) => interaction.target_id === memberId)
      ).length || 0;

      // Event recency (prioritize closer events)
      const eventRecency = (new Date(event.start_time).getTime() - Date.now()) / (1000 * 60 * 60 * 24); // in days
      const recencyScore = Math.max(0, 30 - eventRecency); // Score out of 30 days

      // Upvotes/popularity of the event
      const popularityScore = event.upvotes || 0;

      // Age bracket match quality (small bonus if user is in midrange of min_age and max_age)
      const ageBracketMatchQuality = Math.max(
        0,
        Math.min(1, (userAge - event.min_age) / (event.max_age - event.min_age))
      );

      // Event repeat attendance (if user has attended before, give a bonus)
      // TODO: Implement logic to track what events the user has attended

      // LLM-based similarity score based on event description and user interests
      // TODO: Implement LLM-based scoring

      // Social hints (e.g., friends attending, mutual connections)
      // TODO: Implement social hints scoring

      // Calculate final score
      const score = (
        (1 / (1 + distance)) * 10 + // Inverse distance score
        (userInGroupHostinEvent ? 5 : 0) + // Group membership bonus
        (countOfUserInteractionsWithOrganizer * 2) + // Interaction with organizer
        (numberOfInteractedWithGroupMembers * 1) + // Interaction with group members
        recencyScore + // Recency score
        (popularityScore * 0.1) + // Popularity score
        (ageBracketMatchQuality * 5) // Age bracket match quality
      );
      const scoredEvent = {
        ...event,
        score,
      };
      scoredEvents.push(scoredEvent);
    }

    // sort events by score in descending order
    scoredEvents.sort((a, b) => (b?.score || 0) - (a?.score || 0));

    collectedEvents.push(...scoredEvents);

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
