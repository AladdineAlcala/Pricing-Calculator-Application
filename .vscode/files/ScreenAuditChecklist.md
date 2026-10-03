# BakeIQ Design System — Audit Checkpoints

> **Purpose:** A pass/fail checklist to audit every screen in the BakeIQ application against the official design system.
> **Usage:** Run per screen. Any unchecked item = a fix ticket.
> **Output Format:** See "Audit Output Format" at the bottom.

---

## Table of Contents

1. [Color Compliance](#1-color-compliance)
2. [Typography Compliance](#2-typography-compliance)
3. [Spacing & Grid (8px System)](#3-spacing--grid-8px-system)
4. [Component Compliance](#4-component-compliance)
5. [Layout & Dashboard Structure](#5-layout--dashboard-structure)
6. [Desktop / Tauri Context](#6-desktop--tauri-context)
7. [Accessibility & Consistency](#7-accessibility--consistency)
8. [Audit Output Format](#audit-output-format)

---

## 1. Color Compliance

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| C-01 | Primary dark color | Uses `#0F0F0F` for dark text, headers, dark cards | Pure `#000000` or Tailwind `black`/`gray-900` used |
| C-02 | Background canvas | Uses `#F9F8F6` for main backgrounds | Pure `#FFFFFF` or `#F5F5F5` used as page background |
| C-03 | Accent / CTA color | Uses `#D97A34` for primary buttons & active states | Blue, purple, or default Tailwind colors used for CTAs |
| C-04 | Success / Secondary | Uses `#4A7C59` for success states, positive trends | Bright green (`#00FF00`), Tailwind `green-500`, or red/green defaults |
| C-05 | Border / Divider color | Uses `#E5E3DF` for all 1px borders | `#CCCCCC`, `#DDDDDD`, or Tailwind `gray-200` |
| C-06 | Secondary text | Uses `#6B6B6B` for descriptions, helper text, metadata | `#999999`, `#888888`, or default gray |
| C-07 | No rogue colors | Zero colors outside the defined palette | Any hex not in the token list appearing in the UI |

---

## 2. Typography Compliance

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| T-01 | Heading font | Geometric sans-serif (Inter, Plus Jakarta Sans) | Serif, Comic Sans, or unlicensed fonts |
| T-02 | Body font | Same family as headings, readable weight | Mixed font families or inconsistent weights |
| T-03 | Numeric / Data font | Monospace (JetBrains Mono, Roboto Mono) for **all numbers** | Numbers using the body sans-serif font |
| T-04 | H1 hierarchy | Hero headings between 48–64px, bold, tight line-height | Headings too small (<40px) or loose line-height |
| T-05 | H2 hierarchy | Section headings 32–40px, semi-bold | Sections same size as body text |
| T-06 | H3 / Card title | 20–24px, medium weight | Card titles too small or too large |
| T-07 | Body size | 14–16px, regular weight | Body under 14px or over 16px |
| T-08 | Data labels | 12px, uppercase, letter-spacing applied | Data labels lowercase, no tracking, or wrong size |

---

## 3. Spacing & Grid (8px System)

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| S-01 | Base 8px grid | All padding/margin/gap values are multiples of 8 (or 4 for micro) | Arbitrary values like 13px, 27px, 35px |
| S-02 | Outer padding | Desktop pages use 24px or 32px outer padding | Mobile-style 16px padding on desktop |
| S-03 | Section spacing | Sections separated by 32–48px | Sections crushed together or 80px+ apart |
| S-04 | Title → body gap | 8px between title and its subtitle | Title and body touching or far apart |
| S-05 | Card internal padding | Cards use 16px or 24px internal padding | Cards with 10px or 30px padding |
| S-06 | Between form fields | 16–24px vertical gap | Fields cramped or overly spaced |
| S-07 | Input → helper text | 4–8px gap | Helper text floating far from input |
| S-08 | No arbitrary values | No CSS values outside the token scale | Hardcoded non-grid values |

---

## 4. Component Compliance

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| CO-01 | Card border radius | 16px radius on all cards & containers | 0px, 4px, 8px, or 24px radius on cards |
| CO-02 | Button / Input radius | 8px radius | Pill-shaped buttons (999px) or sharp corners |
| CO-03 | Badge / Pill radius | Fully rounded (999px) | Square or slightly-rounded badges |
| CO-04 | Card borders | 1px solid `#E5E3DF` | No border, thick borders, or wrong color |
| CO-05 | Shadow style | Soft: `0 4px 20px rgba(0,0,0,0.05)` | Heavy drop shadows or no shadow where expected |
| CO-06 | Primary Button | `#D97A34` bg, white text, 8px radius, padding 12px 24px | Wrong color, wrong padding, wrong radius |
| CO-07 | Secondary Button | Transparent bg, 1px `#0F0F0F` border, dark text | Filled, or wrong border color |
| CO-08 | Input default state | White bg, 1px `#E5E3DF` border, 8px radius | Gray bg, no border, or wrong radius |
| CO-09 | Input focus state | Border becomes `#D97A34` | No visible focus, or blue/default focus ring |
| CO-10 | Semantic badges | "Artisan" = green, "Quantitative" = orange, white text | Wrong badge colors or inconsistent usage |

---

## 5. Layout & Dashboard Structure

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| L-01 | Sidebar width | 240px on desktop | Sidebar 200px, 300px, or fluid width |
| L-02 | Sidebar style | Dark bg (`#0F0F0F`) with light text | Light sidebar or mixed styling |
| L-03 | Main content bg | `#F9F8F6` (warm off-white) | White, gray, or dark background |
| L-04 | Main content padding | 32px on desktop | 16px, 24px, or arbitrary padding |
| L-05 | Multi-column layout | Desktop uses grid/multi-column, not stacked | Single-column mobile-style layout on desktop |
| L-06 | Metrics cards layout | "Bento box" style grid of cards | List view or non-grid arrangement |
| L-07 | Metrics card structure | Title (top) → Big number (mid) → Trend (bottom) | Missing trend indicator or wrong order |
| L-08 | Table zebra striping | Alternating `#F9F8F6` and `#FFFFFF` rows | No striping, or wrong colors |
| L-09 | Table row height | Minimum 48px per row | Rows under 48px (cramped) |

---

## 6. Desktop / Tauri Context

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| D-01 | Click targets | Min 24–32px for mouse (44px only if touch-enabled) | Mobile-style 44px+ everywhere |
| D-02 | Icon buttons | 32x32 hit area minimum | Icons under 24px hit area |
| D-03 | Window chrome | Respects native Tauri title bar | Duplicates native chrome with in-app header |
| D-04 | DPI scaling | Looks correct at 100%, 125%, 150% | Layout breaks at non-100% scaling |
| D-05 | Responsiveness | Works from 800px to 2560px width | Fixed-width layouts or broken at extremes |

---

## 7. Accessibility & Consistency

| ID | Checkpoint | Pass Criteria | Fail Signal |
|---|---|---|---|
| A-01 | Contrast ratios | Text meets WCAG AA (4.5:1 body, 3:1 large) | Low contrast text on any surface |
| A-02 | Focus states | All interactive elements have visible focus | Invisible or default browser focus |
| A-03 | Keyboard nav | Full tab order works logically | Trapped focus, skipped elements |
| A-04 | Consistent iconography | Same icon library used everywhere | Mixed icon styles/sizes |
| A-05 | Copy consistency | Same terms used for same concepts | "Login" vs "Sign in" inconsistency |

---

## Audit Output Format

When auditing a screen, output this exact structure:

```markdown
### Screen: [Screen Name / Route]
**Audit Date:** [YYYY-MM-DD]
**Compliance Score:** [X/Y passed = Z%]

| ID | Checkpoint | Status | Evidence | Fix |
|----|-----------|--------|----------|-----|
| C-01 | Primary dark color | ✅ Pass | Uses #0F0F0F in header | — |
| C-03 | Accent CTA color | ❌ Fail | Button uses #3B82F6 (blue) | Change to #D97A34 |
| T-03 | Numeric font | ❌ Fail | Metric "1,284" uses Inter | Wrap in monospace class |
| S-05 | Card padding | ⚠️ Partial | Uses 20px, should be 16 or 24 | Change to 24px |
| CO-01 | Card radius | ✅ Pass | 16px verified | — |

**Priority Fixes (High Impact):**
1. …
2. …

**Low Priority / Polish:**
1. …