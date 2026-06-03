import { BottomTabBarButtonProps } from "@react-navigation/bottom-tabs";
import { PlatformPressable } from "@react-navigation/elements";
import { haptic } from "@/lib/utils/haptics";

export function HapticTab(props: BottomTabBarButtonProps) {
  return (
    <PlatformPressable
      {...props}
      onPressIn={(ev) => {
        haptic("navigation");
        props.onPressIn?.(ev);
      }}
    />
  );
}
