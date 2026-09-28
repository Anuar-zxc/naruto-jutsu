import type { HandShapeId, SignDefinition } from "@/types/gestures";
import { HAND_SHAPES } from "@/lib/vision/gestureDefinitions";

/**
 * Procedural pictogram of a seal, generated from its definition so the
 * picture can never drift out of sync with what the classifier expects.
 */
const FINGER_H = { index: 34, middle: 38, ring: 35, pinky: 28 } as const;

function Hand({ shape, side, x }: { shape: HandShapeId; side: "left" | "right"; x: number }) {
  const f = HAND_SHAPES[shape].fingers;
  // Index finger on the inner side (toward the other hand).
  const order = side === "left" ? (["pinky", "ring", "middle", "index"] as const) : (["index", "middle", "ring", "pinky"] as const);
  const thumbOpen = shape === "OPEN";
  const inner = side === "left" ? 1 : -1;
  return (
    <g transform={`translate(${x} 0)`}>
      {order.map((name, i) => {
        const up = f[name] === 1;
        const h = up ? FINGER_H[name] : 11;
        const fx = 6 + i * 11;
        return <rect key={name} x={fx} y={52 - h} width={9} height={h + 6} rx={4.5} className={up ? "pic-finger up" : "pic-finger"} />;
      })}
      <rect x={4} y={48} width={46} height={40} rx={12} className="pic-palm" />
      {thumbOpen ? (
        <rect
          x={side === "left" ? 38 : 7}
          y={56}
          width={9}
          height={20}
          rx={4.5}
          className="pic-finger up"
          transform={`rotate(${inner * 22} ${side === "left" ? 42 : 11} 74)`}
        />
      ) : (
        <rect x={side === "left" ? 22 : 10} y={58} width={24} height={9} rx={4.5} className="pic-thumb" />
      )}
    </g>
  );
}

export function HandPictogram({ def, size = 120 }: { def: SignDefinition; size?: number }) {
  const gap = def.distance?.max != null ? 4 : def.distance?.min != null ? 44 : 16;
  const width = 54 * 2 + gap;
  const wide = def.distance?.min != null;
  return (
    <svg className="pictogram" viewBox={`-4 -2 ${width + 8} ${wide ? 100 : 94}`} width={size} height={(size * 94) / (width + 8)} aria-hidden>
      <Hand shape={def.shapes[0]} side="left" x={0} />
      <Hand shape={def.shapes[1]} side="right" x={54 + gap} />
      {wide && <path d={`M${58} 96 L${50 + gap} 96 M${58} 96 l5 -3 M${58} 96 l5 3 M${50 + gap} 96 l-5 -3 M${50 + gap} 96 l-5 3`} className="pic-arrow" />}
    </svg>
  );
}
