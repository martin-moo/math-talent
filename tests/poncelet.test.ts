/**
 * poncelet.test.ts — stage-2 acceptance suite (PONCELET_NOTES §5).
 *
 *  1. n = 3, circles ⇒ s = 0.5 to 1e-12 (Euler's case).
 *  2. n = 3..30: after solving, |T^n(P) − P| < 1e-9 for 100 seeded
 *     pseudo-random starts (reproducible).
 *  3. Circles: solver agrees with cos(π/n) for all tested n (Mode A).
 *  4. Ellipse a/b = 1.6: same closure guarantee; rotation number strictly
 *     monotone in s on a sampled grid.
 *  5. Vertices lie on O (residual < 1e-12); edges tangent to I_s
 *     (center-to-line distance = s-scaled apothem = support function).
 */

import { describe, expect, it } from "vitest";
import {
  ponceletStep,
  rotationNumber,
  solveInnerScale,
  vertices,
  type Vec2,
} from "../src/lib/poncelet/engine";

const TWO_PI = 2 * Math.PI;

/** mulberry32: tiny seeded PRNG so the random starts are reproducible. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Iterate the Poncelet map k times from P. */
function iterate(P: Vec2, k: number, a: number, b: number, s: number): Vec2 {
  let Q = { x: P.x, y: P.y };
  for (let i = 0; i < k; i++) Q = ponceletStep(Q, a, b, s);
  return Q;
}

/** Max |T^n(P) − P| over `count` seeded random starts on O = (a, b). */
function worstClosureError(
  n: number,
  a: number,
  b: number,
  s: number,
  count: number,
  seed: number,
): number {
  const rand = mulberry32(seed);
  let worst = 0;
  for (let i = 0; i < count; i++) {
    const t = rand() * TWO_PI;
    const P = { x: a * Math.cos(t), y: b * Math.sin(t) };
    const Q = iterate(P, n, a, b, s);
    worst = Math.max(worst, Math.hypot(Q.x - P.x, Q.y - P.y));
  }
  return worst;
}

// ---------------------------------------------------------------- §5.1 —

it("§5.1: n = 3 on circles closes at s = 1/2 (Euler) to 1e-12", () => {
  expect(Math.abs(solveInnerScale(3, 1, 1) - 0.5)).toBeLessThan(1e-12);
});

// ---------------------------------------------------------------- §5.2 —

describe("§5.2: closure from 100 random starts, n = 3..30 (circles)", () => {
  for (let n = 3; n <= 30; n++) {
    it(`n = ${n}: |T^n(P) − P| < 1e-9`, () => {
      const s = solveInnerScale(n, 1, 1);
      // Distinct reproducible seed per n.
      expect(worstClosureError(n, 1, 1, s, 100, 0x9e3779b9 ^ n)).toBeLessThan(1e-9);
    });
  }
});

// ---------------------------------------------------------------- §5.3 —

it("§5.3: circles — solver agrees with cos(π/n) for n = 3..30", () => {
  for (let n = 3; n <= 30; n++) {
    const exact = Math.cos(Math.PI / n); // n=4 ⇒ √2/2 (Fuss), etc.
    expect(Math.abs(solveInnerScale(n, 1, 1) - exact)).toBeLessThan(1e-12);
  }
});

// ---------------------------------------------------------------- §5.4 —

describe("§5.4: ellipse a/b = 1.6", () => {
  const a = 1.6;
  const b = 1;

  describe("same closure guarantee (100 random starts each)", () => {
    for (let n = 3; n <= 30; n++) {
      it(`n = ${n}: |T^n(P) − P| < 1e-9`, () => {
        const s = solveInnerScale(n, a, b);
        expect(worstClosureError(n, a, b, s, 100, 0x51ed270b ^ n)).toBeLessThan(1e-9);
      });
    }
  });

  it("rotation number is strictly monotone in s on a sampled grid", () => {
    // NB: PONCELET_NOTES §3.2 claims ρ is "strictly increasing (bigger inner
    // conic ⇒ faster winding)". The mathematics says the opposite: the
    // per-step advance shrinks as the inner conic grows — for this family
    // ρ(s) = acos(s)/π exactly — so ρ is strictly *decreasing*
    // (s → 0 ⇒ ρ → 1/2; s → 1 ⇒ ρ → 0). Monotonicity, which is what the
    // bisection needs, holds; we assert the true direction.
    let prev = Number.POSITIVE_INFINITY;
    for (let i = 0; i <= 15; i++) {
      const s = 0.2 + (0.75 * i) / 15; // 0.20 … 0.95
      const rho = rotationNumber(s, 8, a, b);
      expect(rho).toBeGreaterThan(0);
      expect(rho).toBeLessThan(0.5);
      expect(rho).toBeLessThan(prev);
      prev = rho;
    }
  });

  it("ρ(s) equals acos(s)/π (affine conjugacy to circles)", () => {
    // The diagonal map (x,y) ↦ (x/a, y/b) conjugates the construction to
    // concentric circles and is the identity in anomaly coordinates, so the
    // ellipse Poncelet map is an exact rigid rotation by 2·acos(s) there.
    // This cross-validates the tangent solve + Vieta step independently of
    // the closure tests.
    for (const s of [0.25, 0.5, 0.71, 0.866, 0.95]) {
      expect(Math.abs(rotationNumber(s, 5, a, b) - Math.acos(s) / Math.PI)).toBeLessThan(1e-9);
    }
  });

  it("rotation number at the solved scale is 1/n", () => {
    for (const n of [3, 4, 5, 7, 12, 20, 30]) {
      const s = solveInnerScale(n, a, b);
      expect(Math.abs(rotationNumber(s, n, a, b) - 1 / n)).toBeLessThan(1e-9);
    }
  });
});

// ---------------------------------------------------------------- §5.5 —

describe("§5.5: vertices on O, edges tangent to I_s", () => {
  const shapes: ReadonlyArray<readonly [number, number]> = [
    [1, 1], // Mode A: concentric circles
    [1.6, 1], // Mode B target aspect
    [2, 0.5], // more extreme aspect ratio
  ];
  const ns = [3, 4, 7, 12, 30];
  const starts = [0, 0.7, 2.3];

  for (const [a, b] of shapes) {
    for (const n of ns) {
      it(`a=${a}, b=${b}, n=${n}`, () => {
        const s = solveInnerScale(n, a, b);
        for (const t of starts) {
          const vs = vertices(n, a, b, s, t);
          expect(vs).toHaveLength(n);

          // Vertices lie on O.
          for (const v of vs) {
            const residual = Math.abs((v.x / a) ** 2 + (v.y / b) ** 2 - 1);
            expect(residual).toBeLessThan(1e-12);
          }

          // Edges are tangent to I_s: the distance from the center to each
          // edge line equals the support function of I_s in the line's
          // normal direction, h(n̂) = s·√((a·n̂x)² + (b·n̂y)²) — the s-scaled
          // apothem (for circles this is just s·R).
          for (let k = 0; k < n; k++) {
            const P = vs[k];
            const Q = vs[(k + 1) % n];
            let nx = -(Q.y - P.y);
            let ny = Q.x - P.x;
            const norm = Math.hypot(nx, ny);
            nx /= norm;
            ny /= norm;
            let d = nx * P.x + ny * P.y;
            if (d < 0) {
              nx = -nx;
              ny = -ny;
              d = -d;
            }
            const h = s * Math.hypot(a * nx, b * ny);
            expect(Math.abs(d - h)).toBeLessThan(1e-9);

            // Sanity: the tangency point lies strictly within the edge
            // segment. NB: for an ellipse the tangency point is NOT the
            // foot of the perpendicular from the center (that holds only
            // for circles — the radius to a tangency is generally not
            // perpendicular to the tangent line). For semi-axes α = s·a,
            // β = s·b and unit outward normal n̂, the tangency point is
            //     Q = (α²·n̂x, β²·n̂y) / h.
            const qx = ((s * a) ** 2 * nx) / h;
            const qy = ((s * b) ** 2 * ny) / h;
            const ex = Q.x - P.x;
            const ey = Q.y - P.y;
            const proj = (qx - P.x) * ex + (qy - P.y) * ey;
            const len2 = ex * ex + ey * ey;
            expect(proj).toBeGreaterThan(1e-9 * len2);
            expect(proj).toBeLessThan((1 - 1e-9) * len2);
          }
        }
      });
    }
  }
});
