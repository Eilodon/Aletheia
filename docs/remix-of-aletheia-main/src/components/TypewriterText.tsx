import { useState, useEffect } from "react";

/**
 * Typewriter effect — reveals text character by character for dramatic impact.
 */
export default function TypewriterText({
  text,
  speed = 22,
  className = "",
}: {
  text: string;
  speed?: number;
  className?: string;
}) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timer = setInterval(() => {
      i++;
      if (i >= text.length) {
        setDisplayed(text);
        setDone(true);
        clearInterval(timer);
      } else {
        setDisplayed(text.slice(0, i));
      }
    }, speed);
    return () => clearInterval(timer);
  }, [text, speed]);

  return (
    <p className={className}>
      {displayed}
      {!done && (
        <span className="inline-block w-[2px] h-[1em] bg-gold/50 ml-0.5 align-middle animate-glow-pulse" />
      )}
    </p>
  );
}
