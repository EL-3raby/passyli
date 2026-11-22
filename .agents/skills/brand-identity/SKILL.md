---
name: brand-identity
description: >-
  Enterprise Brand Identity, Vector Logo & Visual Design System.
  Use when designing or refining production logos, app icons, typography tokens,
  color systems, and real-world mockups without any AI aesthetic clichés.
---

# Brand Identity & Vector Architecture Skill (Enterprise Standard)

This skill enforces strict, agency-level brand identity principles to ensure logos, icons, and visual assets match the caliber of tier-1 tech products (Linear, Stripe, Airbnb, Strava, Playtomic) and completely avoid AI-generated aesthetic clichés.

---

## 1. The Anti-AI Aesthetic Rules for Logos

To ensure the identity looks crafted by a senior human designer, strictly enforce:
1. **Zero Organic Blob Shapes:** No amorphous liquid gradients or random AI blobs. Everything must align to a geometric grid (Circles, 45°/90° vectors, precise Bézier curves).
2. **Zero Complex Micro-details:** A logo mark must remain 100% legible at **16px × 16px** (Favicon size). If it fails at 16px, simplify the geometry.
3. **Monochrome First (The Silhouette Test):** The mark must look striking and recognizable in pure black on white, and pure white on black, before any color is applied.
4. **Functional Monogram / Geometry:** Combine at most 2 core concepts into one harmonious form (e.g., Forward Pass trajectory + Letter 'P' / 'ب').

---

## 2. Responsive Logo System Requirements (Official Approved Brand: Speed P & Alexandria 900)

For the **Passyli** platform, the officially approved brand architecture is the **Kinetic Speed P & Dual Harmonic Wordmark**:
* **The Primary Lockup (Web Header):** The athletic **Speed P** vector symbol (12-degree sprint angle with central pitch ball) + **Passy<span style="color:#10b981">li</span>** (`Inter 900`) + **باصـ<span style="color:#10b981">يلي</span>** (`Alexandria 900`) with precise visual and color rhythm.
* **The Monogram / App Icon:** The bespoke **Speed P** with negative space pitch ball centered inside the dark obsidian squircle badge (`#09090b`) with a glowing emerald stroke (`#10b981`).
* **The Micro-Mark (Favicon):** High-contrast standalone **Speed P** vector optimized for 16px/32px browser tabs.

---

## 3. Production Asset Generation Process

1. **Vector First (SVG Clean Code):**
   * Output raw, mathematically pure SVG with zero extraneous transforms.
   * Use clean `<path>`, `<rect>`, `<circle>` with explicit `viewBox` coordinates.
2. **Design Tokens Integration:**
   * Export logo colors as semantic CSS/Tailwind variables (`--color-primary`, `--color-surface`, etc.).
3. **Interactive Visual Proofing (Mockups):**
   * Build an interactive, live HTML/CSS preview demonstrating the mark across:
     - Dark Mode & Light Mode web headers.
     - iOS Home Screen App Icon grid.
     - Sports field signage and printed badge contexts.
