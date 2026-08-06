---
title: "The Theorem Behind This Site"
date: 2026-08-05
tags: ["mathematics", "notes"]
summary: "Poncelet's porism — two conics, one miraculous closure — and why the diagram on the home page can never break."
draft: false
---

The diagram on the home page is not an illustration. It is a theorem, running
live. Here is the theorem.

## Statement

Let $O$ and $I$ be two nested conics. Start from any point $P_0$ on $O$, draw
a tangent line from $P_0$ to $I$, and let $P_1$ be its second intersection
with $O$. Repeat: $P_2, P_3, \dots$

**Poncelet's closure theorem (1822).** *If the polygonal chain
$P_0 P_1 P_2 \dots$ closes after $n$ steps for **one** starting point $P_0$,
then it closes after $n$ steps for **every** starting point on $O$.*

Closure is therefore not a property of the starting point — it is a property
of the *pair of conics*. When it holds, there is not one inscribed-circumscribed
$n$-gon but a continuous one-parameter family of them: the polygon "slides",
each vertex sweeping the outer conic, each edge rolling along the inner one,
and it never fails to close.

## An example you can compute

Take two concentric circles of radii $R$ and $r$. A regular $n$-gon inscribed
in the outer circle has apothem $R\cos\frac{\pi}{n}$, so the chain closes if
and only if

$$r = R\cos\frac{\pi}{n}.$$

For $n = 3$ this says $r = \tfrac{R}{2}$ — the concentric case of Euler's
classical triangle relation $d^2 = R(R - 2r)$ at $d = 0$.

## Why this site runs on it

The outer ellipse carries my competition record — one vertex per achievement,
$n$ vertices today. The inner ellipse guards this page's biography: every edge
of the polygon is tangent to it, so the story of *what happened* orbits the
story of *who it happened to*.

And the porism is what makes the design honest as a living object. When a new
achievement arrives, $n$ becomes $n+1$, the inner conic is re-solved so that
closure holds, and the theorem guarantees the new polygon closes from every
starting point — the diagram can't break, because $200$ years ago Poncelet
proved it can't.

For the algebraically inclined: the general closure condition for two conics
is **Cayley's criterion**, a determinant identity in the coefficients of the
two quadratic forms. The engine behind the diagram constructs it numerically
— a story for a future post.
