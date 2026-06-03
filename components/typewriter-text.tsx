import { useEffect, useState } from "react";
import { Text, TextStyle } from "react-native";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";

interface TypewriterTextProps {
  text: string;
  speed?: number;
  style?: TextStyle;
  className?: string;
  onComplete?: () => void;
  showCursor?: boolean;
}

export function TypewriterText({
  text,
  speed = 45,
  style,
  className,
  onComplete,
  showCursor = true,
}: TypewriterTextProps) {
  const colors = useColors();
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Reset when text prop changes
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    setCursorVisible(true);
  }, [text]);

  useEffect(() => {
    if (displayed.length >= text.length) {
      setDone(true);
      onComplete?.();
      return;
    }

    const id = setInterval(() => {
      setDisplayed((prev) => {
        const next = text.slice(0, prev.length + 1);
        if (next.length >= text.length) {
          clearInterval(id);
          setDone(true);
          onComplete?.();
        }
        return next;
      });
    }, speed);

    return () => clearInterval(id);
  }, [text, speed, displayed.length, onComplete]);

  // Cursor blinks while typing; hides once done
  useEffect(() => {
    if (done || !showCursor) return;

    const id = setInterval(() => {
      setCursorVisible((v) => !v);
    }, 530);

    return () => clearInterval(id);
  }, [done, showCursor]);

  const cursor = showCursor && !done ? (cursorVisible ? "▍" : " ") : "";

  return (
    <Text
      className={className}
      style={[
        { fontFamily: Fonts?.body, color: colors.foreground },
        style,
      ]}
    >
      {displayed}
      {cursor}
    </Text>
  );
}
