/**
 * Geometry for the three-circle diagram on the Overlap tab, and the honesty
 * budget it has to live inside.
 *
 * Two circles can be drawn so that every area on the picture is to scale. Three
 * cannot, in general: the seven regions of a three-set diagram are over-determined
 * for the six numbers (three centres, three radii) a circle layout has to spend.
 * So this spends them where they buy the most truth and says out loud what it
 * could not buy:
 *
 *   - Every circle's own area is exact, the outer one that stands for the whole
 *     langtags denominator included, all on one pixels-per-writing-system scale.
 *   - Each PAIR's overlap area is exact — the centre distance is solved for it.
 *   - The middle region, where all three meet, is whatever that leaves. Its
 *     printed count is right; its area is not.
 *
 * The centre distance for a wanted overlap has no closed form — lens area is
 * transcendental in it — so it is found by bisection, which converges in a few
 * dozen steps and costs nothing at this size.
 */

export type Point = { x: number; y: number };
export type Circle = { cx: number; cy: number; r: number };

export type SetKey = "sldr" | "bloom" | "ebible";

export type RegionKey =
  | "sldrOnly"
  | "bloomOnly"
  | "ebibleOnly"
  | "sldrBloom"
  | "sldrEbible"
  | "bloomEbible"
  | "all"
  | "none";

/** A label's spot, and how much room it has: the distance to the nearest edge
 * that would put it in a different region. A sliver of a region gets a small
 * number here and the caller prints less, or nothing, inside it. */
export type LabelSpot = Point & { clearance: number };

export type VennLayout = {
  frame: { width: number; height: number };
  circles: Record<SetKey, Circle>;
  /** The whole langtags denominator, holding the other three. */
  outer: Circle;
  /**
   * False when the three solved distances cannot form a triangle, so one pair's
   * overlap had to be drawn wrong. The caption says so when it happens.
   */
  pairwiseExact: boolean;
  /**
   * False when the denominator circle had to be grown past its true area to
   * hold the other three — it cannot shrink to fit, so it stops being to scale.
   */
  outerToScale: boolean;
  /** Where each region's figures go; null for a region with no area on screen. */
  labels: Record<RegionKey, LabelSpot | null>;
};

/** Area of the lens where two circles of radius r1, r2 overlap at distance d. */
function lensArea(r1: number, r2: number, d: number): number {
  if (d >= r1 + r2) return 0;
  if (d <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2;
  const a1 = r1 * r1 * Math.acos((d * d + r1 * r1 - r2 * r2) / (2 * d * r1));
  const a2 = r2 * r2 * Math.acos((d * d + r2 * r2 - r1 * r1) / (2 * d * r2));
  const wedge =
    0.5 *
    Math.sqrt((-d + r1 + r2) * (d + r1 - r2) * (d - r1 + r2) * (d + r1 + r2));
  return a1 + a2 - wedge;
}

/** The distance that makes the lens the wanted area. Monotonic in d, so bisect. */
function distanceForOverlap(r1: number, r2: number, target: number): number {
  const contained = Math.abs(r1 - r2);
  const apart = r1 + r2;
  if (target <= 0) return apart;
  if (target >= Math.PI * Math.min(r1, r2) ** 2) return contained;
  let low = contained;
  let high = apart;
  for (let step = 0; step < 60; step++) {
    const mid = (low + high) / 2;
    // Overlap shrinks as the centres move apart.
    if (lensArea(r1, r2, mid) > target) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Space kept between the drawing and the frame, so no circle touches the edge. */
const PADDING = 40;

/** A circle as a path, so it can be a clip shape as well as a drawn one. */
export function circlePath({ cx, cy, r }: Circle): string {
  return (
    `M ${cx - r} ${cy} a ${r} ${r} 0 1 0 ${r * 2} 0 ` +
    `a ${r} ${r} 0 1 0 ${-r * 2} 0 Z`
  );
}

/**
 * Everything in the frame EXCEPT this circle, as one path. Drawn with
 * `clip-rule="evenodd"` it is the clip shape for "outside this set".
 */
export function outsidePath(
  circle: Circle,
  frame: { width: number; height: number }
): string {
  return `M 0 0 H ${frame.width} V ${frame.height} H 0 Z ${circlePath(circle)}`;
}

/** The lens where two circles overlap, or null when they do not meet. */
export function lensPath(one: Circle, two: Circle): string | null {
  const dx = two.cx - one.cx;
  const dy = two.cy - one.cy;
  const d = Math.hypot(dx, dy);
  if (d === 0 || d >= one.r + two.r) return null;
  if (d <= Math.abs(one.r - two.r))
    return circlePath(one.r < two.r ? one : two);

  // Along the line of centres, and across it.
  const ux = dx / d;
  const uy = dy / d;
  const reach = (d * d + one.r * one.r - two.r * two.r) / (2 * d);
  const half = Math.sqrt(Math.max(one.r * one.r - reach * reach, 0));
  const midX = one.cx + reach * ux;
  const midY = one.cy + reach * uy;
  // The crossing points, one either side of that line.
  const startX = midX + half * uy;
  const startY = midY - half * ux;
  const endX = midX - half * uy;
  const endY = midY + half * ux;
  // An arc reaching past its own centre is the major one.
  const large1 = reach < 0 ? 1 : 0;
  const large2 = d - reach < 0 ? 1 : 0;
  return (
    `M ${startX} ${startY} ` +
    `A ${one.r} ${one.r} 0 ${large1} 1 ${endX} ${endY} ` +
    `A ${two.r} ${two.r} 0 ${large2} 1 ${startX} ${startY} Z`
  );
}

const inside = (circle: Circle, x: number, y: number) =>
  Math.hypot(x - circle.cx, y - circle.cy) <= circle.r;

/** Which region a point falls in, or null for outside the denominator entirely. */
function regionAt(
  circles: Record<SetKey, Circle>,
  outer: Circle,
  x: number,
  y: number
): RegionKey | null {
  if (!inside(outer, x, y)) return null;
  const s = inside(circles.sldr, x, y);
  const b = inside(circles.bloom, x, y);
  const e = inside(circles.ebible, x, y);
  if (s && b && e) return "all";
  if (s && b) return "sldrBloom";
  if (s && e) return "sldrEbible";
  if (b && e) return "bloomEbible";
  if (s) return "sldrOnly";
  if (b) return "bloomOnly";
  if (e) return "ebibleOnly";
  return "none";
}

/**
 * A label point per region: the point furthest from every boundary that region
 * has, found by sampling. A centroid would fall outside a crescent; this cannot,
 * and it also gives each label the most room it can have.
 */
function labelPoints(
  circles: Record<SetKey, Circle>,
  outer: Circle,
  frame: { width: number; height: number }
): Record<RegionKey, LabelSpot | null> {
  const best: Record<string, LabelSpot> = {};
  const step = 3;
  const edge = (circle: Circle, x: number, y: number) =>
    Math.abs(Math.hypot(x - circle.cx, y - circle.cy) - circle.r);
  for (let x = 0; x <= frame.width; x += step) {
    for (let y = 0; y <= frame.height; y += step) {
      const key = regionAt(circles, outer, x, y);
      if (!key) continue;
      // How far this point sits from the nearest thing that would change which
      // region it is in — any circle's edge, the denominator's included.
      const clearance = Math.min(
        edge(circles.sldr, x, y),
        edge(circles.bloom, x, y),
        edge(circles.ebible, x, y),
        edge(outer, x, y)
      );
      if (!best[key] || clearance > best[key].clearance)
        best[key] = { x, y, clearance };
    }
  }
  const points = {} as Record<RegionKey, LabelSpot | null>;
  for (const key of [
    "sldrOnly",
    "bloomOnly",
    "ebibleOnly",
    "sldrBloom",
    "sldrEbible",
    "bloomEbible",
    "all",
    "none",
  ] as RegionKey[])
    points[key] = best[key] ?? null;
  return points;
}

export function vennLayout(
  denominator: number,
  totals: Record<SetKey, number>,
  /** Each pair's whole intersection, the three-way part included. */
  pairs: { sldrBloom: number; sldrEbible: number; bloomEbible: number },
  /** The area the whole denominator is worth, which the outer circle spends. */
  area = 700 * 460
): VennLayout {
  const perSystem = area / Math.max(denominator, 1);
  const radius = (total: number) => Math.sqrt((total * perSystem) / Math.PI);
  const rS = radius(totals.sldr);
  const rB = radius(totals.bloom);
  const rE = radius(totals.ebible);

  const dSB = distanceForOverlap(rS, rB, pairs.sldrBloom * perSystem);
  const dSE = distanceForOverlap(rS, rE, pairs.sldrEbible * perSystem);
  const dBE = distanceForOverlap(rB, rE, pairs.bloomEbible * perSystem);

  // SLDR at the origin, Bloom out along the x axis, eBible where the other two
  // distances put it. If those three lengths cannot close a triangle, eBible's
  // distance to SLDR is the one kept and the picture says it is approximate.
  const ex = (dSE * dSE - dBE * dBE + dSB * dSB) / (2 * dSB);
  const eySquared = dSE * dSE - ex * ex;
  const pairwiseExact = eySquared >= 0;
  const raw: Record<SetKey, Circle> = {
    sldr: { cx: 0, cy: 0, r: rS },
    bloom: { cx: dSB, cy: 0, r: rB },
    ebible: pairwiseExact
      ? { cx: ex, cy: Math.sqrt(eySquared), r: rE }
      : { cx: dSE, cy: 0, r: rE },
  };

  const keys: SetKey[] = ["sldr", "bloom", "ebible"];

  // The denominator's own circle has to hold the other three, so start from the
  // smallest one that does — bounding-box centre, then a few steps toward
  // whichever circle is currently reaching furthest out.
  let cx = (Math.min(...keys.map((k) => raw[k].cx - raw[k].r)) +
    Math.max(...keys.map((k) => raw[k].cx + raw[k].r))) / 2;
  let cy = (Math.min(...keys.map((k) => raw[k].cy - raw[k].r)) +
    Math.max(...keys.map((k) => raw[k].cy + raw[k].r))) / 2;
  const reach = () => {
    let worst = keys[0];
    let far = -Infinity;
    for (const key of keys) {
      const out = Math.hypot(raw[key].cx - cx, raw[key].cy - cy) + raw[key].r;
      if (out > far) {
        far = out;
        worst = key;
      }
    }
    return { far, worst };
  };
  for (let step = 0; step < 200; step++) {
    const { worst } = reach();
    cx += (raw[worst].cx - cx) * 0.02;
    cy += (raw[worst].cy - cy) * 0.02;
  }
  const needed = reach().far + PADDING;

  // Area-true if it can be: a circle of the denominator's own area, on the same
  // scale as the other three. It only fails to fit when the three sets between
  // them cover nearly everything, and then it grows and says so rather than
  // being drawn over its own contents.
  const trueRadius = Math.sqrt(area / Math.PI);
  const outerToScale = trueRadius >= needed;
  const outerRadius = outerToScale ? trueRadius : needed;

  const frame = { width: outerRadius * 2, height: outerRadius * 2 };
  const offsetX = outerRadius - cx;
  const offsetY = outerRadius - cy;
  const circles = {} as Record<SetKey, Circle>;
  for (const key of keys)
    circles[key] = {
      cx: raw[key].cx + offsetX,
      cy: raw[key].cy + offsetY,
      r: raw[key].r,
    };
  const outer = { cx: outerRadius, cy: outerRadius, r: outerRadius };

  return {
    frame,
    circles,
    outer,
    pairwiseExact,
    outerToScale,
    labels: labelPoints(circles, outer, frame),
  };
}
