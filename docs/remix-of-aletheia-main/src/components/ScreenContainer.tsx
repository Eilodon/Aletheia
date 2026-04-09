import { ReactNode } from "react";
import FilmGrain from "./FilmGrain";

interface ScreenContainerProps {
  children: ReactNode;
  className?: string;
  noGrain?: boolean;
}

export default function ScreenContainer({ children, className = "", noGrain = false }: ScreenContainerProps) {
  return (
    <div className={`min-h-dvh bg-background flex flex-col relative overflow-hidden vignette parchment-texture gradient-mesh-bg ${className}`}>
      {!noGrain && <FilmGrain opacity={0.035} />}
      <div className="relative z-[2] flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
}