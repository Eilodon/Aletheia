export const ANIMATIONS = {
  fast: 200,
  normal: 300,
  slow: 500,
  spring: {
    damping: 15,
    stiffness: 150,
    speed: 50,
    bounciness: 8,
  },
};

export const EASINGS = {
  easeIn: "cubic-bezier(0.4, 0, 1, 1)",
  easeOut: "cubic-bezier(0, 0, 0.2, 1)",
  easeInOut: "cubic-bezier(0.4, 0, 0.2, 1)",
  spring: "cubic-bezier(0.22, 1, 0.36, 1)",
};

export const DURATION = {
  instant: 100,
  fast: 200,
  normal: 300,
  slow: 500,
  slower: 700,
  slowest: 1000,
};

export const STYLES = {
  borderRadius: {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  colors: {
    primary: "#0a7ea4",
    background: "#151718",
    surface: "#1e2022",
    foreground: "#ECEDEE",
    muted: "#9BA1A6",
    border: "#334155",
    success: "#4ADE80",
    warning: "#FBBF24",
    error: "#F87171",
  },
};
