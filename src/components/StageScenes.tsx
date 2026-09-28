/**
 * Original location backgrounds drawn in SVG (no image assets).
 * Generic scenery only: a misty bridge, a giant forest, a rainy industrial
 * city, a war-torn plain, a red-sky crater and a lunar dimension.
 */
import type { SceneId } from "@/lib/game/locations";

const range = (n: number) => Array.from({ length: n }, (_, i) => i);

export function StageScene({ scene }: { scene: SceneId }) {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="scene">
      {scene === "bridge" && <Bridge />}
      {scene === "forest" && <Forest />}
      {scene === "rain" && <Rain />}
      {scene === "battlefield" && <Battlefield />}
      {scene === "crater" && <Crater />}
      {scene === "moon" && <Moon />}
    </svg>
  );
}

function Bridge() {
  return (
    <>
      <defs>
        <linearGradient id="br-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1c2b33" />
          <stop offset="60%" stopColor="#5b7a82" />
          <stop offset="100%" stopColor="#a9c2c4" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#br-sky)" />
      <rect y="190" width="400" height="110" fill="#314a52" />
      {/* long bridge deck with pylons fading into the mist */}
      <path d="M-10 170 L410 150 L410 162 L-10 184Z" fill="#1a262b" />
      {range(9).map((i) => (
        <rect key={i} x={10 + i * 48} y={176 - i * 2.4} width="7" height={70 - i * 3} fill="#1a262b" opacity={1 - i * 0.07} />
      ))}
      <path d="M-10 152 Q100 120 200 150 T410 132" stroke="#1a262b" strokeWidth="2" fill="none" />
      <g className="bd-fog">
        <rect y="120" width="400" height="80" fill="#dfeef0" opacity="0.25" />
        <ellipse cx="80" cy="200" rx="160" ry="30" fill="#e8f4f5" opacity="0.35" />
        <ellipse cx="320" cy="170" rx="180" ry="28" fill="#e8f4f5" opacity="0.3" />
      </g>
    </>
  );
}

function Forest() {
  const trees = [20, 75, 140, 260, 320, 375];
  return (
    <>
      <defs>
        <linearGradient id="fo-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#07120b" />
          <stop offset="100%" stopColor="#1d3a22" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#fo-sky)" />
      {range(14).map((i) => (
        <rect key={i} x={i * 30 + 5} y={0} width={10 + (i % 3) * 4} height={300} fill="#12251a" opacity="0.7" />
      ))}
      {trees.map((x, i) => (
        <g key={x} fill="#050c07">
          <rect x={x} y={-10} width={i % 2 ? 34 : 44} height={320} />
          <path d={`M${x - 20} 300 Q${x + 5} 250 ${x + 10} 230 Q${x + 30} 250 ${x + 70} 300Z`} />
        </g>
      ))}
      <path d="M0 250 Q200 225 400 250 L400 300 L0 300Z" fill="#040a05" />
      <g className="bd-fog">
        <rect y="200" width="400" height="100" fill="#6fcf8a" opacity="0.06" />
      </g>
      {range(10).map((i) => (
        <circle key={i} cx={(i * 43) % 400} cy={120 + ((i * 29) % 120)} r="1.2" fill="#b6ff9c" opacity="0.7" className="bd-blink" style={{ animationDelay: `${i * 0.4}s` }} />
      ))}
    </>
  );
}

function Rain() {
  return (
    <>
      <defs>
        <linearGradient id="rn-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#121820" />
          <stop offset="100%" stopColor="#2c3a44" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#rn-sky)" />
      <g fill="#0b1015">
        <rect x="30" y="80" width="40" height="220" />
        <rect x="90" y="40" width="55" height="260" />
        <rect x="160" y="100" width="30" height="200" />
        <rect x="215" y="20" width="70" height="280" />
        <rect x="300" y="70" width="45" height="230" />
        <rect x="355" y="110" width="40" height="190" />
        {/* pipes */}
        <path d="M70 150 H90 M145 120 H160 M190 180 H215 M285 140 H300 M345 200 H355" stroke="#0b1015" strokeWidth="6" />
      </g>
      {range(30).map((i) => (
        <rect key={i} x={95 + (i % 5) * 9} y={60 + Math.floor(i / 5) * 30} width="4" height="6" fill="#e0773a" opacity={i % 3 ? 0.15 : 0.6} />
      ))}
      <g stroke="#9fb7c9" strokeWidth="1" opacity="0.35" className="bd-rain">
        {range(60).map((i) => (
          <line key={i} x1={(i * 37) % 400} y1={(i * 53) % 300} x2={((i * 37) % 400) - 4} y2={((i * 53) % 300) + 18} />
        ))}
      </g>
      <rect y="270" width="400" height="30" fill="#0e161c" />
    </>
  );
}

function Battlefield() {
  return (
    <>
      <defs>
        <linearGradient id="bf-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2a1a12" />
          <stop offset="55%" stopColor="#a0562c" />
          <stop offset="100%" stopColor="#e3a45f" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bf-sky)" />
      <path d="M0 200 L60 170 L130 190 L200 160 L260 185 L330 165 L400 180 L400 300 L0 300Z" fill="#5e3419" />
      <path d="M0 235 Q120 215 220 232 T400 225 L400 300 L0 300Z" fill="#2c180c" />
      {[70, 190, 310].map((x, i) => (
        <g key={x} className="bd-smoke" style={{ animationDelay: `${i * 1.3}s` }}>
          <ellipse cx={x} cy="150" rx="18" ry="40" fill="#1a0f09" opacity="0.5" />
          <ellipse cx={x + 8} cy="100" rx="26" ry="36" fill="#1a0f09" opacity="0.35" />
        </g>
      ))}
      {/* broken blades stuck in the ground */}
      {[40, 110, 250, 360].map((x, i) => (
        <path key={x} d={`M${x} 262 l${i % 2 ? 6 : -6} -30 l3 0 l${i % 2 ? -3 : 3} 30Z`} fill="#0d0805" />
      ))}
    </>
  );
}

function Crater() {
  return (
    <>
      <defs>
        <linearGradient id="cr-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a0205" />
          <stop offset="60%" stopColor="#7a0c16" />
          <stop offset="100%" stopColor="#d23a2a" />
        </linearGradient>
        <radialGradient id="cr-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ffdada" />
          <stop offset="60%" stopColor="#ff3b3b" />
          <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#cr-sky)" />
      <circle cx="300" cy="80" r="60" fill="url(#cr-moon)" className="bd-pulse" />
      <circle cx="300" cy="80" r="22" fill="#ffd0d0" />
      <path d="M0 220 Q60 180 120 215 Q200 250 280 212 Q340 185 400 215 L400 300 L0 300Z" fill="#2a0508" />
      <ellipse cx="200" cy="262" rx="170" ry="30" fill="#0f0204" />
      <ellipse cx="200" cy="258" rx="120" ry="16" fill="#ff3b3b" opacity="0.15" className="bd-pulse" />
    </>
  );
}

function Moon() {
  return (
    <>
      <defs>
        <radialGradient id="mo-planet" cx="40%" cy="40%" r="60%">
          <stop offset="0%" stopColor="#dbe9ff" />
          <stop offset="70%" stopColor="#5a6ea3" />
          <stop offset="100%" stopColor="#1b2240" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="#04040c" />
      {range(60).map((i) => (
        <circle key={i} cx={(i * 67) % 400} cy={(i * 41) % 170} r={i % 7 === 0 ? 1.4 : 0.7} fill="#fff" opacity={0.4 + (i % 3) * 0.2} className={i % 5 === 0 ? "bd-blink" : undefined} />
      ))}
      <circle cx="90" cy="90" r="70" fill="url(#mo-planet)" />
      <path d="M0 210 Q100 195 200 212 T400 205 L400 300 L0 300Z" fill="#c9c6d8" />
      <path d="M0 240 Q120 228 240 244 T400 238 L400 300 L0 300Z" fill="#9f9bb4" />
      {[60, 170, 300].map((x) => (
        <ellipse key={x} cx={x} cy="262" rx="26" ry="6" fill="#7d7896" />
      ))}
    </>
  );
}
