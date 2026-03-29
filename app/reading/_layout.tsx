import { Stack } from "expo-router";

export default function ReadingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: "slide_from_right",
      }}
    >
      <Stack.Screen name="situation" />
      <Stack.Screen name="wildcard" />
      <Stack.Screen name="ritual" />
      <Stack.Screen name="passage" />
      <Stack.Screen name="ai-streaming" />
    </Stack>
  );
}
