// supabase/functions/rank_events/index.ts

// eslint-disable-next-line import/no-unresolved
import { serve } from "https://deno.land/std@0.192.0/http/server.ts";
// eslint-disable-next-line import/no-unresolved
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

function getDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const toRad = (x: number) => (x * Math.PI) / 180;
  const R = 3958.8; // Radius of Earth in miles
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const DESIRED_EVENT_BATCH_SIZE = 25; // Number of events to return

serve(async (req) => {
  const retrieved_events: any[] = [];

  let amount_retrieved_on_current_iteration = 0;
  let amount_attempted_to_retrieve = 0;

  const supabase = createClient(
    "https://axdnmsjjofythsclelgu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTI4ODEsImV4cCI6MjA2NDYyODg4MX0.VeC9ToiMvcyFSAXmISqJkdMDo-CVq1B7jliLxwyH4kk"
  );

  const { user_id, userLatitude, userLongitude, userAge } = await req.json();
  if (!user_id || !userLatitude || !userLongitude || !userAge) {
    return new Response(JSON.stringify({ error: "Missing user_id or location or age" }), { status: 400 });
  }

  while (retrieved_events.length < DESIRED_EVENT_BATCH_SIZE || amount_retrieved_on_current_iteration < amount_attempted_to_retrieve) {
    // Fetch the next batch of events
    // 1. Fetch recent interactions
    const { data: interactions, error: interactionError } = await supabase
      .from("user_interactions")
      .select("*")
      .eq("user_id", user_id)
      .order("action_occurred", { ascending: false });

    if (interactionError) {
      return new Response(JSON.stringify({ error: interactionError.message }), { status: 500 });
    }

    amount_attempted_to_retrieve = Math.ceil((DESIRED_EVENT_BATCH_SIZE - retrieved_events.length) * 1.5);

    // 2. Fetch all events
    const { data: events, error: eventError } = await supabase
      .from("events")
      .select("*")
      .eq("post_only_to_group", false) // event is public
      .gt("start_time", new Date().toISOString()) // event is in the future
      .lte("max_age", userAge) // event is suitable for user's age
      .gte("min_age", userAge) // event is suitable for user's age
      .order("start_time", { ascending: true })
      .limit(amount_attempted_to_retrieve); // Fetch more than needed to account for filtering

    amount_retrieved_on_current_iteration = events?.length || 0;

    if (eventError) {
      return new Response(JSON.stringify({ error: eventError.message }), { status: 500 });
    }

    const filteredEvents = events.filter(event => {
      return true; // Add any additional filtering logic here if needed
    });

    const sortedEvents = filteredEvents
      .map(event => ({
        ...event,
        distance: getDistanceMiles(
          userLatitude,
          userLongitude,
          event.latitude,
          event.longitude
        ),
      }))
      .sort((a, b) => {
        const timeA = new Date(a.start_time).getTime();
        const timeB = new Date(b.start_time).getTime();

        if (timeA !== timeB) {
          return timeA - timeB;
        }
        
        return a.distance - b.distance;
      });


      retrieved_events.push(...sortedEvents);
    }

  return new Response(JSON.stringify(retrieved_events), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});