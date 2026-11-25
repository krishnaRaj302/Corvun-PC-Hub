import { useEffect, useRef } from "react";

const THEME_PALETTES = {
  redline: ["255, 46, 56", "255, 110, 115", "220, 38, 38"],
  cyber: ["217, 70, 239", "56, 189, 248", "168, 85, 247"],
  arctic: ["56, 189, 248", "186, 230, 253", "255, 255, 255"],
  rgb: ["255, 46, 56", "34, 197, 94", "56, 189, 248", "217, 70, 239", "250, 204, 21"],
};

export function HeroParticlesCanvas({ theme = "redline", isTurbo = false }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let width = 0;
    let height = 0;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      const rect = canvas.parentElement?.getBoundingClientRect();
      width = rect ? rect.width : window.innerWidth;
      height = rect ? rect.height : 640;
      canvas.width = Math.max(1, Math.floor(width * dpr));
      canvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    resize();
    window.addEventListener("resize", resize);

    const count = 48;
    const palette = THEME_PALETTES[theme] || THEME_PALETTES.redline;
    const particles = Array.from({ length: count }, (_, i) => ({
      x: width * (0.25 + Math.random() * 0.75),
      y: Math.random() * height,
      r: 1 + Math.random() * 2.4,
      vx: (Math.random() - 0.5) * 0.35,
      vy: -(0.35 + Math.random() * 0.85),
      alpha: 0.25 + Math.random() * 0.65,
      phase: Math.random() * Math.PI * 2,
      color: palette[i % palette.length],
      isStreak: i % 6 === 0,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);
      const speedMult = isTurbo ? 2.4 : 1;

      for (const p of particles) {
        p.phase += 0.02 * speedMult;
        p.x += (p.vx + Math.sin(p.phase) * 0.25) * speedMult;
        p.y += p.vy * speedMult;

        if (p.y < -20) {
          p.y = height + 15;
          p.x = width * (0.28 + Math.random() * 0.72);
        }
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;

        const flicker = 0.65 + 0.35 * Math.sin(p.phase * 1.7);
        const alpha = Math.min(1, p.alpha * flicker * (isTurbo ? 1.25 : 1));

        ctx.save();
        if (p.isStreak) {
          const grad = ctx.createLinearGradient(p.x, p.y, p.x, p.y + 18 * speedMult);
          grad.addColorStop(0, `rgba(${p.color}, ${alpha})`);
          grad.addColorStop(1, `rgba(${p.color}, 0)`);
          ctx.strokeStyle = grad;
          ctx.lineWidth = Math.max(1, p.r * 0.7);
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x, p.y + 18 * speedMult);
          ctx.stroke();
        } else {
          ctx.shadowBlur = isTurbo ? 14 : 9;
          ctx.shadowColor = `rgba(${p.color}, ${alpha})`;
          ctx.fillStyle = `rgba(${p.color}, ${alpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, [theme, isTurbo]);

  return <canvas ref={canvasRef} className="hero-particles-canvas" aria-hidden="true" />;
}

export default function HeroCabinetStage({
  activeTheme,
  setActiveTheme,
  isTurbo,
  setIsTurbo,
}) {
  return (
    <div className={`hero-cinematic-hud ${isTurbo ? "hud--turbo" : ""}`}>
      {/* Top-Right Live Hardware Telemetry Strip */}
      <div className="hero-rig-telemetry-stack">
        <div className="hero-rig-chip">
          <span className="rig-chip-dot" />
          <span className="rig-chip-label">CLOCK</span>
          <span className="rig-chip-val">{isTurbo ? "6.05 GHz" : "5.85 GHz"}</span>
        </div>
        <div className="hero-rig-chip">
          <span className="rig-chip-dot dot-blue" />
          <span className="rig-chip-label">GPU</span>
          <span className="rig-chip-val">RTX 4090 24GB</span>
        </div>
        <div className="hero-rig-chip">
          <span className="rig-chip-dot dot-green" />
          <span className="rig-chip-label">LOOP</span>
          <span className="rig-chip-val">{isTurbo ? "36°C // MAX FLOW" : "31°C // SILENT"}</span>
        </div>
      </div>

      {/* Bottom-Right Floating Glassmorphic Controls */}
      <div className="hero-floating-dock">
        <button
          type="button"
          className={`hero-turbo-pill ${isTurbo ? "turbo-on" : ""}`}
          onClick={() => setIsTurbo((prev) => !prev)}
        >
          <span>⚡</span>
          <span>{isTurbo ? "TURBO ACTIVE" : "TURBO BOOST"}</span>
        </button>

        <div className="hero-argb-switcher" role="group" aria-label="Select workstation lighting">
          <button
            type="button"
            className={`hero-rgb-dot-btn ${activeTheme === "redline" ? "active" : ""}`}
            onClick={() => setActiveTheme("redline")}
            title="Crimson Redline"
            aria-label="Crimson Redline theme"
          >
            <span className="rgb-swatch swatch-redline" />
          </button>
          <button
            type="button"
            className={`hero-rgb-dot-btn ${activeTheme === "cyber" ? "active" : ""}`}
            onClick={() => setActiveTheme("cyber")}
            title="Cyber Neon"
            aria-label="Cyber Neon theme"
          >
            <span className="rgb-swatch swatch-cyber" />
          </button>
          <button
            type="button"
            className={`hero-rgb-dot-btn ${activeTheme === "arctic" ? "active" : ""}`}
            onClick={() => setActiveTheme("arctic")}
            title="Arctic Ice"
            aria-label="Arctic Ice theme"
          >
            <span className="rgb-swatch swatch-arctic" />
          </button>
          <button
            type="button"
            className={`hero-rgb-dot-btn ${activeTheme === "rgb" ? "active" : ""}`}
            onClick={() => setActiveTheme("rgb")}
            title="Mixed RGB Spectrum"
            aria-label="Mixed RGB Spectrum theme"
          >
            <span className="rgb-swatch swatch-rgb" />
          </button>
        </div>
      </div>
    </div>
  );
}
