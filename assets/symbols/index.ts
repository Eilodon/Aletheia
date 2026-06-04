/**
 * AletheiA Symbol Assets Registry
 * 
 * This file maps the symbol identifiers to their corresponding high-quality image assets.
 * All images should be organized with a consistent naming convention: {ID}_{Name}.png
 */

import { ImageSourcePropType } from "react-native";

export type SymbolId = "earth" | "water" | "lightning" | "fire" | "wind" | "mirror";

export const SymbolAssets: Record<SymbolId, ImageSourcePropType> = {
  earth: require("./01_earth.png"),
  water: require("./02_water.png"),
  lightning: require("./03_lightning.png"),
  fire: require("./04_fire.png"),
  wind: require("./05_wind.png"),
  mirror: require("./06_mirror.png"),
} as Record<SymbolId, ImageSourcePropType>; // Cast temporarily until all are generated

const ARCHETYPES: SymbolId[] = ["earth", "water", "lightning", "fire", "wind", "mirror"];

const archetypeMap: Record<string, SymbolId> = {
  root: "earth", seed: "earth", stone: "earth", mountain: "earth", cave: "earth", summit: "earth", desert: "earth", ash: "earth", turtle: "earth", elephant: "earth",
  leaf: "wind", branch: "wind", cloud: "wind", wind: "wind", forest: "wind", eagle: "wind", crane: "wind",
  flame: "fire", sun: "fire", star: "fire", shooting_star: "fire", dawn_sky: "fire", dusk: "fire", incense: "fire", tiger: "fire", fox: "fire",
  droplet: "water", river: "water", ocean: "water", delta: "water", shore: "water", bowl: "water", valley: "water", snake: "water",
  thunder: "lightning", lightning: "lightning", eclipse: "lightning", galaxy: "lightning", wolf: "lightning",
  moon: "mirror", crescent: "mirror", full_moon: "mirror", mirror: "mirror",
};

export const getSymbolAsset = (id: SymbolId | string): ImageSourcePropType | null => {
  if (id in SymbolAssets) {
    return SymbolAssets[id as SymbolId];
  }
  if (id in archetypeMap) {
    return SymbolAssets[archetypeMap[id]];
  }
  const index = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % ARCHETYPES.length;
  return SymbolAssets[ARCHETYPES[index]];
};
