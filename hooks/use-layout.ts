import { useWindowDimensions } from "react-native";

export type LayoutBreakpoint = "compact" | "medium" | "expanded";

export interface LayoutInfo {
  width: number;
  height: number;
  breakpoint: LayoutBreakpoint;
  isCompact: boolean;
  isMedium: boolean;
  isExpanded: boolean;
  /** Max readable content width. Phone = screen width; tablet caps at 560; desktop at 720. */
  contentMaxWidth: number;
  /** Multiplier for decorative circular ornaments. 360dp→1.0, 600dp→1.1, 900dp+→1.3. */
  ornamentScale: number;
  /** Multiplier for display (heading) font sizes only. Body text is never scaled. */
  typeScale: number;
}

export function useLayout(): LayoutInfo {
  const { width, height } = useWindowDimensions();

  const breakpoint: LayoutBreakpoint =
    width >= 900 ? "expanded" : width >= 600 ? "medium" : "compact";

  const isCompact = breakpoint === "compact";
  const isMedium = breakpoint === "medium";
  const isExpanded = breakpoint === "expanded";

  const contentMaxWidth = isExpanded ? 720 : isMedium ? 560 : width;

  // Linear interpolation: 1.0 at 360dp, 1.3 at 1080dp. Capped at 1.3, floored at 1.0.
  const ornamentScale = Math.min(1.3, Math.max(1.0, 1.0 + (width - 360) / 2400));

  const typeScale = isExpanded ? 1.2 : isMedium ? 1.1 : 1.0;

  return {
    width,
    height,
    breakpoint,
    isCompact,
    isMedium,
    isExpanded,
    contentMaxWidth,
    ornamentScale,
    typeScale,
  };
}
