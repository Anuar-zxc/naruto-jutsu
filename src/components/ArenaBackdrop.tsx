/**
 * Original arena backgrounds (inline SVG, no image assets).
 * One stage per round: Ember Ridge → Moon Bamboo → Storm Shrine (then loops).
 */
const STAGES = ["ember", "bamboo", "storm"] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_NAMES: Record<Stage, string> = {
  ember: "Ember Ridge",
  bamboo: "Moon Bamboo Grove",
  storm: "Storm Shrine",
};

export function stageForRound(round: number): Stage {
  return STAGES[(round - 1) % STAGES.length];
}

export function ArenaBackdrop({ stage }: { stage: Stage }) {
  return (
    <div className={`backdrop backdrop-${stage}`} aria-hidden>
      {stage === "ember" && <Ember />}
      {stage === "bamboo" && <Bamboo />}
      {stage === "storm" && <Storm />}
      <div className="backdrop-shade" />
    </div>
  );
}

function Ember() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="em-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#2b0a1c" />
          <stop offset="45%" stopColor="#8a1f22" />
          <stop offset="75%" stopColor="#ff7a2a" />
          <stop offset="100%" stopColor="#ffc46b" />
        </linearGradient>
        <radialGradient id="em-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff1c9" />
          <stop offset="60%" stopColor="#ffb14a" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff6a1f" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#em-sky)" />
      <circle cx="270" cy="170" r="70" fill="url(#em-sun)" className="bd-pulse" />
      <path d="M0 190 L50 150 L90 175 L140 120 L190 165 L240 135 L300 170 L350 140 L400 160 L400 300 L0 300Z" fill="#5a1420" opacity="0.8" />
      <path d="M0 220 L40 195 L100 215 L150 180 L210 210 L260 190 L330 215 L400 195 L400 300 L0 300Z" fill="#33091a" />
      {/* distant pagoda silhouette */}
      <g fill="#1c0510" transform="translate(70 150)">
        <rect x="14" y="30" width="12" height="50" />
        <path d="M0 34 L40 34 L30 26 L10 26Z M4 20 L36 20 L28 12 L12 12Z M8 6 L32 6 L24 -2 L16 -2Z" />
        <rect x="18" y="-10" width="4" height="10" />
      </g>
      <path d="M0 250 Q100 230 200 248 T400 240 L400 300 L0 300Z" fill="#12030a" />
      <g className="bd-embers" fill="#ffb347">
        {Array.from({ length: 18 }, (_, i) => (
          <circle key={i} cx={(i * 53) % 400} cy={220 + ((i * 37) % 70)} r={0.8 + (i % 3) * 0.6} style={{ animationDelay: `${(i % 6) * 0.7}s` }} />
        ))}
      </g>
    </svg>
  );
}

function Bamboo() {
  const stalks = [18, 52, 80, 118, 300, 328, 352, 384];
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="bb-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#040a1c" />
          <stop offset="70%" stopColor="#0d2a45" />
          <stop offset="100%" stopColor="#123f4a" />
        </linearGradient>
        <radialGradient id="bb-moon" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#f4fbff" />
          <stop offset="55%" stopColor="#bfe6ff" stopOpacity="0.85" />
          <stop offset="100%" stopColor="#4cc9f0" stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width="400" height="300" fill="url(#bb-sky)" />
      <circle cx="200" cy="95" r="80" fill="url(#bb-moon)" opacity="0.5" />
      <circle cx="200" cy="95" r="34" fill="#eaf6ff" />
      <path d="M0 230 Q120 200 200 225 T400 215 L400 300 L0 300Z" fill="#0a2230" />
      {stalks.map((x, i) => (
        <g key={x} className="bd-sway" style={{ animationDelay: `${i * 0.4}s`, transformOrigin: `${x}px 300px` }}>
          <rect x={x} y={-10} width={i % 2 ? 7 : 10} height={320} fill="#07161f" />
          {[40, 100, 160, 220].map((y) => (
            <rect key={y} x={x - 1} y={y + (i % 3) * 12} width={i % 2 ? 9 : 12} height={3} fill="#0f2a36" />
          ))}
          <path d={`M${x + 5} ${60 + i * 9} q ${i % 2 ? 26 : -26} -8 ${i % 2 ? 40 : -40} 6 q ${i % 2 ? -18 : 18} -2 ${i % 2 ? -40 : 40} -6Z`} fill="#0b2029" />
        </g>
      ))}
      <rect y="220" width="400" height="80" fill="#9be7ff" opacity="0.06" className="bd-fog" />
    </svg>
  );
}

function Storm() {
  return (
    <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="st-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0c0718" />
          <stop offset="60%" stopColor="#2a1650" />
          <stop offset="100%" stopColor="#140b24" />
        </linearGradient>
      </defs>
      <rect width="400" height="300" fill="url(#st-sky)" />
      <rect width="400" height="300" fill="#d9ccff" className="bd-lightning" />
      <g fill="#1a1030" opacity="0.9">
        <ellipse cx="80" cy="40" rx="120" ry="40" />
        <ellipse cx="300" cy="30" rx="140" ry="45" />
        <ellipse cx="200" cy="70" rx="110" ry="30" />
      </g>
      <path d="M250 0 L238 60 L252 62 L232 130" stroke="#e3f1ff" strokeWidth="2" fill="none" className="bd-bolt" />
      {/* shrine gate + stone lanterns (generic) */}
      <g fill="#07040d">
        <rect x="150" y="150" width="10" height="110" />
        <rect x="240" y="150" width="10" height="110" />
        <path d="M128 142 Q200 128 272 142 L268 152 Q200 140 132 152Z" />
        <rect x="144" y="164" width="112" height="7" />
        <path d="M40 250 h24 v-8 h-6 v-14 h6 l-4 -8 h-16 l-4 8 h6 v14 h-6Z" />
        <path d="M336 250 h24 v-8 h-6 v-14 h6 l-4 -8 h-16 l-4 8 h6 v14 h-6Z" />
      </g>
      <path d="M0 255 L400 255 L400 300 L0 300Z" fill="#05030a" />
      <g stroke="#b28cff" strokeWidth="1" opacity="0.25" className="bd-rain">
        {Array.from({ length: 40 }, (_, i) => (
          <line key={i} x1={(i * 41) % 400} y1={(i * 67) % 300} x2={((i * 41) % 400) - 6} y2={((i * 67) % 300) + 16} />
        ))}
      </g>
    </svg>
  );
}
