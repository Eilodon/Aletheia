import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number; size: number; speedY: number; speedX: number;
  opacity: number; phase: number; life: number; maxLife: number;
  type: "dust" | "trail" | "ember"; trail: { x: number; y: number }[]; hue: number;
}

interface FogLayer {
  x: number; y: number; radius: number; speed: number; phase: number; opacity: number;
}

/**
 * Phase 1: Visibility-aware particles, respects prefers-reduced-motion.
 */
export default function AmbientParticles({ count = 18, className = "" }: { count?: number; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number>(0);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mq.matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let visible = true;
    let dpr = window.devicePixelRatio || 1;
    const resize = () => {
      dpr = window.devicePixelRatio || 1;
      canvas.width = canvas.offsetWidth * dpr;
      canvas.height = canvas.offsetHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);

    const handleVis = () => { visible = !document.hidden; if (visible) animate(); };
    document.addEventListener("visibilitychange", handleVis);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const createParticle = (): Particle => {
      const type = Math.random() < 0.3 ? "trail" : Math.random() < 0.5 ? "ember" : "dust";
      return {
        x: Math.random() * w(), y: type === "ember" ? h() + 10 : Math.random() * h(),
        size: type === "trail" ? Math.random() * 1.2 + 0.8 : Math.random() * 2 + 0.5,
        speedY: type === "ember" ? -(Math.random() * 0.8 + 0.3) : -(Math.random() * 0.3 + 0.08),
        speedX: (Math.random() - 0.5) * 0.2, opacity: 0, phase: Math.random() * Math.PI * 2,
        life: 0, maxLife: type === "ember" ? 150 + Math.random() * 200 : 400 + Math.random() * 500,
        type, trail: [], hue: type === "ember" ? 25 + Math.random() * 20 : 42,
      };
    };

    const fogLayers: FogLayer[] = Array.from({ length: 5 }, () => ({
      x: Math.random() * w(), y: h() * 0.5 + Math.random() * h() * 0.5,
      radius: 80 + Math.random() * 160, speed: (Math.random() - 0.5) * 0.15,
      phase: Math.random() * Math.PI * 2, opacity: 0.02 + Math.random() * 0.03,
    }));

    const particles: Particle[] = Array.from({ length: count }, createParticle);
    particles.forEach(p => { p.y = Math.random() * h(); p.life = Math.random() * p.maxLife; });

    const animate = () => {
      if (!visible) return;
      ctx.clearRect(0, 0, w(), h());
      const time = Date.now() * 0.001;

      for (const fog of fogLayers) {
        fog.x += fog.speed + Math.sin(time * 0.3 + fog.phase) * 0.1;
        fog.y += Math.sin(time * 0.2 + fog.phase * 2) * 0.15;
        if (fog.x > w() + fog.radius) fog.x = -fog.radius;
        if (fog.x < -fog.radius) fog.x = w() + fog.radius;
        const fg = ctx.createRadialGradient(fog.x, fog.y, 0, fog.x, fog.y, fog.radius);
        const pulse = Math.sin(time * 0.5 + fog.phase) * 0.3 + 0.7;
        fg.addColorStop(0, `hsla(280, 30%, 40%, ${fog.opacity * pulse})`);
        fg.addColorStop(0.4, `hsla(270, 25%, 35%, ${fog.opacity * pulse * 0.5})`);
        fg.addColorStop(1, `hsla(240, 20%, 30%, 0)`);
        ctx.beginPath(); ctx.arc(fog.x, fog.y, fog.radius, 0, Math.PI * 2);
        ctx.fillStyle = fg; ctx.fill();
      }

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.life++;
        if (p.type === "trail" && p.life % 3 === 0) {
          p.trail.push({ x: p.x, y: p.y });
          if (p.trail.length > 12) p.trail.shift();
        }
        const drift = p.type === "trail" ? Math.sin(time * 0.8 + p.phase) * 0.25 : Math.sin(time * 0.5 + p.phase) * 0.08;
        p.y += p.speedY; p.x += p.speedX + drift;
        const lr = p.life / p.maxLife;
        if (lr < 0.1) p.opacity = lr * 10;
        else if (lr > 0.75) p.opacity = (1 - lr) * 4;
        else p.opacity = 1;
        if (p.life >= p.maxLife || p.y < -20) { particles[i] = createParticle(); continue; }
        const flicker = Math.sin(time * 3 + p.phase) * 0.2 + 0.8;
        const alpha = p.opacity * flicker;

        if (p.type === "trail") {
          if (p.trail.length > 1) {
            ctx.beginPath(); ctx.moveTo(p.trail[0].x, p.trail[0].y);
            for (let j = 1; j < p.trail.length; j++) ctx.lineTo(p.trail[j].x, p.trail[j].y);
            ctx.lineTo(p.x, p.y); ctx.strokeStyle = `hsla(${p.hue}, 65%, 55%, ${alpha * 0.15})`;
            ctx.lineWidth = p.size * 0.5; ctx.stroke();
          }
          const tg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4);
          tg.addColorStop(0, `hsla(${p.hue}, 70%, 60%, ${alpha * 0.5})`);
          tg.addColorStop(0.5, `hsla(${p.hue}, 65%, 52%, ${alpha * 0.15})`);
          tg.addColorStop(1, `hsla(${p.hue}, 60%, 45%, 0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 4, 0, Math.PI * 2); ctx.fillStyle = tg; ctx.fill();
        } else if (p.type === "ember") {
          const eg = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          eg.addColorStop(0, `hsla(${p.hue}, 80%, 65%, ${alpha * 0.7})`);
          eg.addColorStop(0.4, `hsla(${p.hue}, 70%, 50%, ${alpha * 0.25})`);
          eg.addColorStop(1, `hsla(${p.hue}, 60%, 40%, 0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fillStyle = eg; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(45, 90%, 80%, ${alpha * 0.9})`; ctx.fill();
        } else {
          const g1 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 7);
          g1.addColorStop(0, `hsla(280, 30%, 45%, ${alpha * 0.12})`); g1.addColorStop(1, `hsla(280, 30%, 35%, 0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 7, 0, Math.PI * 2); ctx.fillStyle = g1; ctx.fill();
          const g2 = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
          g2.addColorStop(0, `hsla(42, 65%, 55%, ${alpha * 0.5})`);
          g2.addColorStop(0.6, `hsla(42, 65%, 52%, ${alpha * 0.15})`);
          g2.addColorStop(1, `hsla(25, 70%, 42%, 0)`);
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fillStyle = g2; ctx.fill();
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(45, 75%, 70%, ${alpha * 0.8})`; ctx.fill();
        }
      }
      frameRef.current = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVis);
    };
  }, [count]);

  return (
    <canvas ref={canvasRef} className={`absolute inset-0 pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%" }} aria-hidden="true" />
  );
}