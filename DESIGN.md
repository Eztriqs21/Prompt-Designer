# Design System — Prompt Designer

Canonical design spec for all UI work. Every component, page, and interaction follows these tokens and guidelines.

---

## Overview

Monochrome, developer-first design system inspired by OpenCode.

- **Light surfaces** with near-black ink text
- **Single monospace font** (JetBrains Mono) across the entire app
- **Minimal color** — mostly monochrome with rare, restrained accents
- **Calm motion** — 150–200ms transitions, no flashy effects
- **Technical voice** — headings and copy read like a README

---

## Colors

### Base Palette

| Token | Value | Usage |
|-------|-------|-------|
| `ink.primary` | `#201d1d` | Primary text, headings, labels |
| `ink.muted` | `#9a9898` | Secondary text, inactive nav, captions |
| `surface.base` | `#fdfcfc` | Page background, main surfaces |
| `surface.alt` | `#f8f7f7` | Cards, elevated surfaces, active states |
| `border.soft` | `rgba(100, 98, 98, 0.2)` | Borders, dividers, separators |

### Accent Colors (desaturated, subtle)

| Token | Value | Usage |
|-------|-------|-------|
| `accent.info` | `#6b8a9e` | Informational badges, links |
| `accent.success` | `#6b9e7a` | Success states, positive indicators |
| `accent.warning` | `#9e8a6b` | Warnings, caution states |
| `accent.error` | `#9e6b6b` | Errors, destructive actions, critical findings |

### Usage Rules

- UI is **mostly monochrome** — surfaces, borders, and text use the base palette
- Accents appear only for **semantic meaning** (error, success, warning, info)
- Never use accents for decorative purposes
- Severity chips (audit findings) use the full accent range

---

## Typography

### Font Family

**JetBrains Mono** — single monospace family across the entire app.

- All headings, labels, body text, inputs, and code use JetBrains Mono
- No mixing with serif, sans-serif, or other font families
- Loaded via Google Fonts: weights 400, 500, 600, 700

### Type Scale

| Token | Size | Weight | Line Height | Usage |
|-------|------|--------|-------------|-------|
| `type.display` | 56px | 700 | 1.1 | Hero headings, landing page titles |
| `type.heading` | 24px | 700 | 1.2 | Page headings, section titles |
| `type.body` | 16px | 400 | 1.5 | Body text, messages, descriptions |
| `type.small` | 13px | 400 | 1.4 | Labels, captions, secondary text |

### Text Colors

| Usage | Color | Token |
|-------|-------|-------|
| Primary text | `#201d1d` | `ink.primary` |
| Secondary text | `#9a9898` | `ink.muted` |
| Placeholder text | `#b8b5b5` | `ink.muted` at 70% |
| Disabled text | `#c8c5c5` | `ink.muted` at 50% |

---

## Layout & Spacing

### Spacing Scale (4px base)

| Token | Value |
|-------|-------|
| `space.xs` | 4px |
| `space.sm` | 8px |
| `space.md` | 12px |
| `space.lg` | 16px |
| `space.xl` | 24px |
| `space.2xl` | 32px |
| `space.3xl` | 64px |

### Layout Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `layout.pagePadding` | 24px | Horizontal padding on page containers |
| `layout.sectionGap` | 32px | Vertical gap between major sections |
| `layout.cardGap` | 16px | Gap between adjacent cards |
| `layout.containerWidth` | 1280px | Max width of main content area |
| `layout.sidebarWidth` | 260px | Fixed width of global sidebar |

### Responsive Breakpoints

| Breakpoint | Width | Behavior |
|------------|-------|----------|
| `sm` | 640px | Stack layout, hide sidebar |
| `md` | 768px | Show sidebar, single column content |
| `lg` | 1024px | Two-column layouts where applicable |
| `xl` | 1280px | Full container width |

---

## Elevation & Depth

### Shadows

| Token | Value | Usage |
|-------|-------|-------|
| `shadow.sm` | `0 1px 2px rgba(0,0,0,0.04)` | Subtle lift on cards |
| `shadow.md` | `0 2px 4px rgba(0,0,0,0.06)` | Elevated elements (modals, dropdowns) |
| `shadow.lg` | `0 4px 8px rgba(0,0,0,0.08)` | Prominent overlays |

### No Glassmorphism

- Do **not** use `backdrop-filter: blur()` for main surfaces
- Do **not** use gradient borders or translucent backgrounds
- Use solid `surface.base` or `surface.alt` with subtle shadows instead

---

## Shapes

### Border Radius

| Token | Value | Usage |
|-------|-------|-------|
| `radius.sm` | 4px | Inputs, buttons, small elements |
| `radius.md` | 6px | Cards, containers, modals |
| `radius.lg` | 8px | Larger containers, feature cards |
| `radius.pill` | 999px | Badges, chips, status indicators |

### Border Width

| Token | Value | Usage |
|-------|-------|-------|
| `border.thin` | 1px | Standard borders, dividers |
| `border.medium` | 2px | Focus rings, active states |

---

## Components

### Page

Full-page container wrapping all route content.

- Background: `surface.base`
- Text: `ink.primary`
- Content centered in `layout.containerWidth`
- Padding: `layout.pagePadding` horizontal, `space.3xl` vertical

### Sidebar

Fixed left navigation panel.

- Background: `surface.base`
- Border right: `border.thin` `border.soft`
- Width: `layout.sidebarWidth`
- Nav items: `ink.muted` inactive, `ink.primary` + `surface.alt` active
- Product name at top in monospace, `type.heading` size
- Thin `border.soft` separators between nav groups

### Card

Generic container for content blocks.

- Background: `surface.alt`
- Border: `border.thin` `border.soft`
- Border radius: `radius.md`
- Padding: `space.lg`
- Hover: subtle background shift (optional)

### Button (Primary)

Main action button.

- Background: `ink.primary`
- Text: `surface.base`
- Border radius: `radius.sm`
- Padding: `space.sm` vertical, `space.lg` horizontal
- Hover: darken background slightly

### Button (Secondary)

Ghost/outline action button.

- Background: transparent
- Border: `border.thin` `border.soft`
- Text: `ink.primary`
- Border radius: `radius.sm`
- Padding: `space.sm` vertical, `space.lg` horizontal
- Hover: `surface.alt` background

### TextInput

Text and textarea inputs.

- Background: `surface.base`
- Border: `border.thin` `border.soft`
- Border radius: `radius.sm`
- Padding: `space.sm` vertical, `space.md` horizontal
- Font: JetBrains Mono, `type.body` size
- Focus: `border.medium` `ink.primary` border, subtle ring

### SimpleTable

Data table with monospace text.

- Headers: `ink.primary`, `font-weight: 600`, `type.small`
- Cells: `ink.primary`, `type.body`
- Grid lines: `border.thin` `border.soft`
- Cell padding: `space.md` vertical, `space.lg` horizontal
- Alternating row: subtle `surface.alt` background

### Chip

Small badge or status indicator.

- Background: `surface.alt`
- Border: `border.thin` `border.soft`
- Border radius: `radius.pill`
- Padding: `space.xs` vertical, `space.sm` horizontal
- Font: JetBrains Mono, `type.small`
- Variant: accent color background for semantic states (error, success, etc.)

### SegmentedControl

Input type selector (tabs).

- Container: `surface.alt` background, `radius.sm`
- Items: `ink.muted` inactive, `ink.primary` active
- Active indicator: `surface.base` background with `shadow.sm`
- Border radius: `radius.sm`

---

## Do's and Don'ts

### Do

- Keep the interface calm, monochrome, and technical
- Use consistent spacing from the 4px scale
- Use JetBrains Mono for all text
- Use `surface.base` for pages, `surface.alt` for elevated cards
- Use `ink.primary` for text, `ink.muted` for secondary
- Use accents only for semantic meaning (error, success, warning, info)
- Keep transitions at 150–200ms with simple easing
- Write copy in a technical README voice

### Don't

- Use strong gradients, heavy shadows, or bright neon colors
- Mix fonts or use serif/sans-serif alongside monospace
- Use `backdrop-filter: blur()` for main surfaces
- Apply glassmorphism effects (translucent backgrounds, gradient borders)
- Use large scale or shadow jumps on hover
- Write marketing buzzwords or exclamation-heavy copy
- Use arbitrary font sizes — stick to the type scale

---

## Component Inventory

| Component | File | Status |
|-----------|------|--------|
| Page | `src/components/layout/PageShell.tsx` | Update |
| Sidebar | `src/components/layout/Sidebar.tsx` | Rewrite |
| Card | `src/components/ui/Card.tsx` | New |
| Button | `src/components/ui/Button.tsx` | New |
| TextInput | `src/components/ui/TextInput.tsx` | New |
| SimpleTable | `src/components/ui/SimpleTable.tsx` | New |
| Chip | `src/components/ui/Chip.tsx` | New |
| SegmentedControl | `src/components/ui/SegmentedControl.tsx` | New |
| ConfirmModal | `src/components/layout/ConfirmModal.tsx` | Update |
| CustomSelect | `src/components/ui/CustomSelect.tsx` | Update |

---

## File Structure

```
src/
├── index.css                    # Global styles, font imports, Tailwind config
├── App.tsx                      # Root layout: Sidebar + content
├── components/
│   ├── layout/
│   │   ├── PageShell.tsx        # Centered content container
│   │   ├── Sidebar.tsx          # Global navigation
│   │   └── ConfirmModal.tsx     # Reusable confirmation dialog
│   ├── ui/
│   │   ├── Button.tsx           # Primary & secondary buttons
│   │   ├── TextInput.tsx        # Text/textarea inputs
│   │   ├── Card.tsx             # Generic content card
│   │   ├── SimpleTable.tsx      # Monospace data table
│   │   ├── Chip.tsx             # Badge/status indicator
│   │   ├── SegmentedControl.tsx # Tab-like input selector
│   │   └── CustomSelect.tsx     # Custom dropdown select
│   ├── audit/                   # Audit-specific components
│   └── masterPrompt/            # Chat workspace components
├── motion/
│   └── presets.ts               # Simplified animation presets
├── pages/
│   ├── HomePage.tsx             # Landing/overview page
│   ├── ChatWorkspace.tsx        # Chat workspace (from old HomePage)
│   ├── AuditPage.tsx            # Website AUDIT page
│   └── HistoryPage.tsx          # History/saved prompts page
└── ...
```
