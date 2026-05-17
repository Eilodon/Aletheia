import { StyleSheet, View } from "react-native";
import Svg, {
  Defs,
  Filter,
  FeTurbulence,
  FeColorMatrix,
  Rect,
} from "react-native-svg";

interface FilmGrainProps {
  opacity?: number;
}

export function FilmGrain({ opacity = 0.04 }: FilmGrainProps) {
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <Svg
        width="100%"
        height="100%"
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      >
        <Defs>
          <Filter id="grain">
            <FeTurbulence
              type="fractalNoise"
              baseFrequency="0.65"
              numOctaves={3}
              stitchTiles="stitch"
            />
            <FeColorMatrix type="saturate" values="0" />
          </Filter>
        </Defs>
        <Rect
          width="100%"
          height="100%"
          filter="url(#grain)"
          fill="transparent"
          opacity={opacity}
        />
      </Svg>
    </View>
  );
}
