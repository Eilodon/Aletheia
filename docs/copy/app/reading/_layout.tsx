import { Stack } from "expo-router";
import { ReadingProvider } from "@/lib/context/reading-context";

export default function ReadingLayout() {
  return (
    <ReadingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          animation: "fade_from_bottom",
        }}
      >
        <Stack.Screen name="situation" />
        <Stack.Screen name="wildcard" />
        <Stack.Screen name="ritual" />
        <Stack.Screen name="passage" />
        <Stack.Screen name="ai-streaming" />
        <Stack.Screen name="[id]" />
        <Stack.Screen
          name="share-card"
          options={{
            animation: "slide_from_bottom",
          }}
        />
      </Stack>
    </ReadingProvider>
  );
}
