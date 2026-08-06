/**
 * engine.ts — Poncelet porism geometry engine.
 *
 * Pure TypeScript, zero DOM. Implements the contract of
 * drafts/PONCELET_NOTES.md §4; the mathematics is §§1–3 there.
 *
 * Geometry: the outer ellipse O = { (a·cos θ, b·sin θ) } is fixed by the
 * layout; the inner ellipse I_s is the same ellipse scaled by s ∈ (0, 1)
 * about the common center. The Poncelet map T : O → O sends P to the second
 * intersection with O of the counterclockwise tangent from P to I_s.
 *
 * Closure: T has one n-periodic point iff every point is n-periodic
 * (Poncelet's porism), which for a circle homeomorphism is equivalent to
 * rotation number ρ = 1/n. For two circles the closure conditions are the
 * classical Euler (n = 3) / Fuss formulas; the general algebraic criterion
 * is Cayley's. We need neither in code: the bisection below is the
 * constructive numeric specialization for this nested-similar family.
 *
 * Two facts about this particular family (used in the tests, not assumed by
 * the solver):
 *
 *  1. The diagonal affine map (x, y) ↦ (x/a, y/b) sends (O, I_s) to two
 *     concentric circles of radii 1 and s. Tangency and incidence are
 *     affine-invariant, so it conjugates the Poncelet maps. In eccentric-
 *     anomaly coordinates the conjugacy is the *identity*, hence T in
 *     anomaly coordinates is exactly the rigid rotation θ ↦ θ + 2·acos(s)
 *     for every (a, b). Consequently the closing scale is s = cos(π/n) for
 *     any aspect ratio — the solver must (and does) rediscover this.
 *
 *  2. ρ(s) = acos(s)/π, which is strictly *decreasing* in s: a bigger inner
 *     conic makes each tangent chord shorter, so the map advances less per
 *     step (s → 1 ⇒ advance → 0; s → 0 ⇒ advance → π, i.e. ρ → 1/2).
 *     PONCELET_NOTES §3.2 says "increasing"; the correct direction is
 *     decreasing. Monotonicity itself — the property the bisection relies
 *     on — holds either way.
 */

export interface Vec2 {
  x: number;
  y: number;
}

const TWO_PI = 2 * Math.PI;

/** Bisection stops once the bracket on s is tighter than this (~20 ulps). */
const SCALE_TOLERANCE = 2e-15;
/** Hard cap on bisection iterations; the tolerance is reached in ~50. */
const MAX_BISECTION = 200;

function checkNEllipse(n: number, a: number, b: number): void {
  if (!Number.isInteger(n) || n < 3) {
    throw new RangeError(`poncelet: n must be an integer ≥ 3, got ${n}`);
  }
  if (!Number.isFinite(a) || !Number.isFinite(b) || !(a > 0) || !(b > 0) || b > a) {
    throw new RangeError(`poncelet: need semi-axes a ≥ b > 0, got a=${a}, b=${b}`);
  }
}

function checkScale(s: number): void {
  if (!Number.isFinite(s) || !(s > 0) || !(s < 1)) {
    throw new RangeError(`poncelet: need inner scale 0 < s < 1, got ${s}`);
  }
}

/** Eccentric anomaly of a point on O: θ with P = (a·cos θ, b·sin θ). */
function anomaly(P: Vec2, a: number, b: number): number {
  return Math.atan2(P.y / b, P.x / a);
}

/**
 * Unwrapped CCW angular advance from `from` to `to`, lifted into [0, 2π).
 * The Poncelet map for 0 < s < 1 is a fixed-point-free orientation-
 * preserving circle homeomorphism, so its true per-step advance lies in
 * (0, 2π) and this recovers it exactly across the atan2 branch cut.
 */
function advance(from: number, to: number): number {
  const d = to - from;
  return d - TWO_PI * Math.floor(d / TWO_PI);
}

/**
 * Core step, writing into `out` (may alias `P`). Kept allocation-free so the
 * bisection and rotation-number loops produce no garbage.
 */
function stepInto(out: Vec2, P: Vec2, a: number, b: number, s: number): void {
  // Tangent point Q = (s·a·cos t, s·b·sin t) on I_s satisfies the tangent
  // condition (PONCELET_NOTES §3.1)
  //     P.x·cos t / (s·a) + P.y·sin t / (s·b) = 1
  // i.e. A·cos t + B·sin t = 1 with A = P.x/(s·a), B = P.y/(s·b), whose
  // solutions are t = φ ± acos(1/M), φ = atan2(B, A), M = √(A² + B²).
  const A = P.x / (s * a);
  const B = P.y / (s * b);
  const M = Math.hypot(A, B);
  if (!(M > 1)) {
    // P on or inside I_s: no tangent. Cannot occur for P on O and s < 1
    // (then M = 1/s > 1); thrown only on contract-violating input.
    throw new RangeError("poncelet: P must lie strictly outside the inner ellipse");
  }
  const phi = Math.atan2(B, A);
  // Branch choice: cross(P, Q) = s²ab·M·sin(t − φ), so the "+" root puts Q
  // counterclockwise of the radius to P, which is exactly the CCW Poncelet
  // map (equivalently: the center stays on the left of every directed edge).
  const arg = 1 / M > 1 ? 1 : 1 / M < -1 ? -1 : 1 / M; // clamp vs. rounding
  const tq = phi + Math.acos(arg);
  const qx = s * a * Math.cos(tq);
  const qy = s * b * Math.sin(tq);

  // Second intersection of the chord P + λ·(Q − P) with O. The intersection
  // quadratic αλ² + βλ + γ = 0 has the known root λ ≈ 0 at P itself, so the
  // other root follows stably from Vieta (sum of roots): λ = −β/α − 0.
  const dx = qx - P.x;
  const dy = qy - P.y;
  const dxa = dx / a;
  const dyb = dy / b;
  const alpha = dxa * dxa + dyb * dyb;
  const beta = 2 * ((P.x * dx) / (a * a) + (P.y * dy) / (b * b));
  const lambda = -beta / alpha;

  out.x = P.x + lambda * dx;
  out.y = P.y + lambda * dy;
}

/**
 * Signed closure error at s: total unwrapped advance of T_s^n from the start
 * P₀ = (a, 0) minus one full turn. Zero ⟺ the n-gon closes from P₀ (and
 * then, by the porism, from every start). Strictly decreasing in s, so a
 * sign-change bracket plus bisection converges. Allocation-free.
 */
function closureGap(n: number, a: number, b: number, s: number): number {
  const P = { x: a, y: 0 };
  const Q = { x: 0, y: 0 };
  let theta = 0;
  let acc = 0;
  for (let k = 0; k < n; k++) {
    stepInto(Q, P, a, b, s);
    const next = anomaly(Q, a, b);
    acc += advance(theta, next);
    theta = next;
    P.x = Q.x;
    P.y = Q.y;
  }
  return acc - TWO_PI;
}

/**
 * solveInnerScale(n, a, b) — the scale s ∈ (0, 1) of the inner similar
 * ellipse for which the Poncelet map closes n-gons (rotation number 1/n).
 *
 * Bisection on the signed closure gap (PONCELET_NOTES §3.2), bracketed
 * outward from the circular guess s₀ = cos(π/n). For this similar-concentric
 * family s₀ is in fact the exact answer (see header), so the initial bracket
 * always straddles the root; the expansion loops are a totality guard only.
 */
export function solveInnerScale(n: number, a: number, b: number): number {
  checkNEllipse(n, a, b);

  const s0 = Math.cos(Math.PI / n);
  // g is decreasing in s: g(lo) > 0 on the low side, g(hi) < 0 on the high.
  let lo = s0 * 0.5;
  let hi = s0 + (1 - s0) * 0.5;

  let glo = closureGap(n, a, b, lo);
  for (let guard = 0; !(glo > 0) && guard < 100; guard++) {
    lo *= 0.5;
    glo = closureGap(n, a, b, lo);
  }
  let ghi = closureGap(n, a, b, hi);
  for (let guard = 0; !(ghi < 0) && guard < 100; guard++) {
    hi += (1 - hi) * 0.5;
    ghi = closureGap(n, a, b, hi);
  }
  if (!(glo > 0) || !(ghi < 0)) {
    throw new Error(`poncelet: could not bracket the closing scale for n=${n}`);
  }

  for (let i = 0; i < MAX_BISECTION; i++) {
    const mid = lo + (hi - lo) / 2;
    if (closureGap(n, a, b, mid) > 0) {
      lo = mid;
    } else {
      hi = mid;
    }
    if (hi - lo <= SCALE_TOLERANCE) break;
  }
  return lo + (hi - lo) / 2;
}

/**
 * ponceletStep(P, a, b, s) — one CCW Poncelet step: from P on O draw the
 * counterclockwise tangent to I_s and return its second intersection with O.
 */
export function ponceletStep(P: Vec2, a: number, b: number, s: number): Vec2 {
  checkNEllipse(3, a, b); // n irrelevant here; validates the ellipse only
  checkScale(s);
  if (!Number.isFinite(P.x) || !Number.isFinite(P.y)) {
    throw new RangeError(`poncelet: P must be finite, got (${P.x}, ${P.y})`);
  }
  const out = { x: 0, y: 0 };
  stepInto(out, P, a, b, s);
  return out;
}

/**
 * vertices(n, a, b, s, t) — the closed n-gon of the family: start at anomaly
 * t on O and iterate the Poncelet map. V₀ = (a·cos t, b·sin t); sweeping t
 * is the porism drift. Allocates only the returned array (plus one scratch
 * point); safe per frame.
 */
export function vertices(n: number, a: number, b: number, s: number, t: number): Vec2[] {
  checkNEllipse(n, a, b);
  checkScale(s);
  if (!Number.isFinite(t)) {
    throw new RangeError(`poncelet: family parameter t must be finite, got ${t}`);
  }
  const out: Vec2[] = new Array<Vec2>(n);
  const P = { x: a * Math.cos(t), y: b * Math.sin(t) };
  for (let k = 0; k < n; k++) {
    out[k] = { x: P.x, y: P.y };
    stepInto(P, P, a, b, s); // alias-safe: all reads precede the writes
  }
  return out;
}

/**
 * rotationNumber(s, n, a, b) — estimate of the Poncelet map's rotation
 * number (fraction of a full turn advanced per step, CCW-positive), computed
 * as the mean unwrapped anomaly advance over K steps. K scales with n so the
 * estimate spans ≈ 32 full windings at the closing scale ρ = 1/n.
 *
 * For this family the true value is acos(s)/π exactly (header, fact 2) and
 * the per-step advance is constant in anomaly coordinates, so the estimate
 * converges far faster than the generic O(1/K) bound.
 */
export function rotationNumber(s: number, n: number, a: number, b: number): number {
  checkNEllipse(n, a, b);
  checkScale(s);
  const K = Math.max(256, 32 * n);
  const P = { x: a, y: 0 };
  const Q = { x: 0, y: 0 };
  let theta = 0;
  let acc = 0;
  for (let k = 0; k < K; k++) {
    stepInto(Q, P, a, b, s);
    const next = anomaly(Q, a, b);
    acc += advance(theta, next);
    theta = next;
    P.x = Q.x;
    P.y = Q.y;
  }
  return acc / (TWO_PI * K);
}
