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

serve(async (req) => {
  const supabase = createClient(
    "https://axdnmsjjofythsclelgu.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF4ZG5tc2pqb2Z5dGhzY2xlbGd1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwNTI4ODEsImV4cCI6MjA2NDYyODg4MX0.VeC9ToiMvcyFSAXmISqJkdMDo-CVq1B7jliLxwyH4kk"
  );

  const { user_id, userLatitude, userLongitude } = await req.json();
  if (!user_id || !userLatitude || !userLongitude) {
    return new Response(JSON.stringify({ error: "Missing user_id or location" }), { status: 400 });
  }

  // 1. Fetch user information
  const { data: user, error: userError } = await supabase
    .from("users")
    .select("*")
    .eq("user_id", user_id)
    .single();
  
  if (userError) {
    return new Response(JSON.stringify({ error: userError.message }), { status: 500 });
  }

  // 2. Fetch recent interactions
  const { data: interactions, error: interactionError } = await supabase
    .from("user_interactions")
    .select("*")
    .eq("user_id", user_id)
    .order("action_occurred", { ascending: false });

  if (interactionError) {
    return new Response(JSON.stringify({ error: interactionError.message }), { status: 500 });
  }

  // 3. Fetch all events
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
  // prioritize events within 100 miles
  const filteredEvents = events.filter((event) => {
    if (
      event.min_age == null ||
      event.max_age == null ||
      event.latitude == null ||
      event.longitude == null
    ) return false;

    const isAgeMatch = userAge >= event.min_age && userAge <= event.max_age;
    const isWithinNext30Days = new Date(event.start_time).getTime() - Date.now() <= 30 * 24 * 60 * 60 * 1000;

    return isAgeMatch && isWithinNext30Days;
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
    .sort((a, b) => a.distance - b.distance);

  return new Response(JSON.stringify(sortedEvents), {
    headers: { "Content-Type": "application/json" },
    status: 200,
  });
});