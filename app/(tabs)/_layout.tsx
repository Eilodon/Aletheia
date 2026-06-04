import { Tabs } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { HapticTab } from "@/components/haptic-tab";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { Platform } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { useLayout } from "@/hooks/use-layout";
import { useStrings } from "@/lib/i18n";

export default function TabLayout() {
  const colors = useColors();
  const s = useStrings();
  const insets = useSafeAreaInsets();
  const { isCompact } = useLayout();
  const bottomPadding = Platform.OS === "web" ? 12 : Math.max(insets.bottom, 8);
  const tabBarHeight = 62 + bottomPadding;

  const compactTabBarStyle = {
    paddingTop: 10,
    paddingBottom: bottomPadding,
    height: tabBarHeight,
    backgroundColor: colors.surface + "EE",
    borderTopColor: colors.primary + "24",
    borderTopWidth: 1,
    position: "absolute" as const,
    left: 14,
    right: 14,
    bottom: 10,
    borderRadius: 22,
  };

  const railTabBarStyle = {
    backgroundColor: colors.surface + "EE",
    borderRightColor: colors.primary + "24",
    borderRightWidth: 1,
    paddingTop: insets.top + 8,
    paddingBottom: insets.bottom + 8,
    width: 72,
  };

  return (
    <Tabs
      tabBarPosition={isCompact ? "bottom" : "left"}
      screenOptions={{
        tabBarActiveTintColor: colors.tint,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarShowLabel: isCompact,
        tabBarStyle: isCompact ? compactTabBarStyle : railTabBarStyle,
        tabBarLabelStyle: isCompact ? { fontSize: 11, letterSpacing: 0.5 } : undefined,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: s.tabs.home,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="house.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="mirror"
        options={{
          title: s.tabs.mirror,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="book.fill" color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: s.tabs.settings,
          tabBarIcon: ({ color }) => <IconSymbol size={28} name="gearshape.fill" color={color} />,
        }}
      />
    </Tabs>
  );
}
