# PONCELET_NOTES.md — Mathematical specification of the diagram engine

> Hand this file (with `SPEC.md` §5) to the AI at build stages 2–3.
> Everything here is standard projective geometry; the implementation notes
> make it mechanical. The engine is **pure TypeScript**: no DOM, no rendering.

## 1. The theorem we rely on

**Poncelet's closure theorem (porism).** Let $O$ and $I$ be two nested smooth
conics. Define the **Poncelet map** $T: O \to O$: from $P \in O$ draw a tangent
line to $I$ (consistent orientation, e.g. counterclockwise), and let $T(P)$ be
its second intersection with $O$. If $T$ has one periodic point of period $n$
(a closed $n$-gon), then **every** point of $O$ is periodic of period $n$.

Consequences we exploit:

- **Existence ⇒ family.** One closed polygon gives a 1-parameter family — the
  visitor can "turn" the polygon and it never breaks. That is the animation.
- **One-point verification.** To verify closure numerically it suffices to
  check $|T^n(P_0) - P_0| < \varepsilon$ for a single $P_0$; then sanity-check a
  few more starts as a guard against implementation error.

## 2. Mode A — concentric circles (exact baseline)

Outer circle radius $R$, inner radius $r$. A regular $n$-gon inscribed in the
outer circle has apothem $R\cos(\pi/n)$, so:

$$r = R\cos\frac{\pi}{n}$$

- $n = 3 \Rightarrow r = R/2$ (matches Euler's $d^2 = R(R-2r)$ at $d=0$). Test this.
- Vertices: $V_k(t) = R\,(\cos(\theta_0(t) + \tfrac{2\pi k}{n}),\
  \sin(\theta_0(t) + \tfrac{2\pi k}{n}))$; edges are tangent to the inner
  circle at their midpoints. Animation = drift of $\theta_0$.
- Note for design: as $n$ grows, $r/R \to 1$, the polygon ring becomes a thin
  band at the rim and the inner circle stays roomy — ideal, since the bio
  lives inside.

## 3. Mode B — true ellipses (target)

Outer ellipse $O$: $(x/a)^2 + (y/b)^2 = 1$, fixed by layout.
Inner ellipse $I_s$: same center and axes, scaled by $s \in (0,1)$.
**Unknown:** $s$ such that the Poncelet map between $O$ and $I_s$ has
rotation number exactly $1/n$.

### 3.1 Tangent from an external point (analytic)

For $P = (x_p, y_p)$ outside $I_s$, tangent points $Q = (sa\cos t,\ sb\sin t)$
on $I_s$ satisfy the tangent-line condition

$$\frac{x_p \cos t}{sa} + \frac{y_p \sin t}{sb} = 1
\quad\Longleftrightarrow\quad A\cos t + B\sin t = 1,$$

with $A = x_p/(sa)$, $B = y_p/(sb)$. Solve
$t = \varphi \pm \arccos\!\big(1/\sqrt{A^2+B^2}\big)$, $\varphi = \operatorname{atan2}(B, A)$.
Pick the root giving counterclockwise travel; then $T(P)$ = second
intersection of line $PQ$ with $O$ (line–ellipse intersection is a quadratic
with one known root, $P$ itself — use Vieta for the other: numerically stable).

### 3.2 Solving for $s$

The rotation number $\rho(s)$ is continuous and **strictly increasing** in $s$
(bigger inner conic ⇒ faster winding). Closure for an $n$-gon $\iff
\rho(s) = 1/n$.

- **Bisection** on $s \in (0, 1)$: evaluate the closure error
  $e(s) = |T_s^n(P_0) - P_0|$ measured as signed angular gap on $O$;
  ~50 iterations give machine precision. Anchor the search near the circular
  guess $s_0 = \cos(\pi/n)$ to bracket quickly.
- Sanity: when $a = b$ (circles), the solver must return
  $s = \cos(\pi/n)$. Unit test this against Mode A.

### 3.3 The family parameter

With $s$ solved, the family is parametrized by the starting point $P(t)$ on
$O$: vertices are $V_k = T^k(P(t))$, $k = 0..n-1$. Sweeping $t$ along $O$
gives the honest porism motion — vertices slide non-uniformly, edges roll
along the inner ellipse. **Do not** approximate this by rigid rotation in
ellipse coordinates, and **do not** affine-stretch a rotating circle picture
(rotation ∦ affine maps: vertices would drift off the ellipse).

### 3.4 Changing n

Adding an achievement ⇒ $n{+}1$ ⇒ re-solve $s$ (milliseconds), crossfade the
polygon. Because data drives geometry, the CMS round-trip needs no manual work.

## 4. Engine API contract

```ts
// lib/poncelet/engine.ts — pure functions, no DOM
solveInnerScale(n: number, a: number, b: number): number
ponceletStep(P: Vec2, a: number, b: number, s: number): Vec2
vertices(n: number, a: number, b: number, s: number, t: number): Vec2[]
rotationNumber(s: number, n: number, a: number, b: number): number
```

Deterministic, total on valid inputs ($n \ge 3$, $0 < b \le a$, $0 < s < 1$),
no allocations in the per-frame path beyond the returned array.

## 5. Test suite (vitest) — stage-2 acceptance

1. `n = 3`, circles ⇒ `s = 0.5` to 1e-12.
2. For each $n = 3..30$: after solving, $|T^n(P) - P| < 10^{-9}$ for
   100 pseudo-random starts $P$ (seeded RNG, reproducible).
3. Circles: solver agrees with $\cos(\pi/n)$ for all tested $n$.
4. Ellipse $a/b = 1.6$: same closure guarantee; rotation number strictly
   increasing in $s$ on sampled grid.
5. Vertices lie on $O$ (residual $< 10^{-12}$); polygon edges are tangent to
   $I_s$ (distance center-to-line $= s$-scaled apothem within tolerance).

## 6. Rendering & motion notes (stage 3)

- SVG; per frame only `t` changes → recompute `vertices` and update `points`
  attributes. Budget: n ≤ 40 ⇒ ≤ 40 tangent solves ≪ 1 ms.
- Drift speed: one revolution of the family parameter in ~90 s;
  `requestAnimationFrame`, paused off-screen and on hover/focus/reduced-motion.
- Drag = map pointer angle to `t` (family scrub); on release resume drift.
- Static fallback: render one frame server-side (Astro) so no-JS/print shows
  the closed polygon.

## 7. Reference

Cayley's criterion gives the general algebraic closure condition for two
conics; the bisection above is its constructive, numeric specialization for
our nested-similar-ellipses family. Fuss's formulas cover the circular
two-circle cases ($n = 3$: Euler; $n = 4$: Fuss). We need neither in code —
Mode A closed form + Mode B root-find suffice — but the names belong in code
comments for the mathematically inclined reader.
