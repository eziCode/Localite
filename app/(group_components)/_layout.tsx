import { Stack } from "expo-router";

export default function SwipeLayout() {
  return (
    <Stack
      screenOptions={{
        presentation: "transparentModal",
        animation: "slide_from_right",
        gestureEnabled: true,
      }}
    />
  );
}