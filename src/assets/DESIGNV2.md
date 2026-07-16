---
name: Prompt Workspace + Website AUDIT
version: 2.0.0

colors:
  primary:
    dark: "#201d1d"       # Backgrounds, button fills, main ink on light surfaces
    light: "#fdfcfc"      # Text on dark surfaces, button text, light surfaces
  secondary:
    midGray: "#9a9898"    # Secondary text, muted labels and links
    darkSurface: "#302c2c" # Elevated cards, panels, modals
    borderGray: "#646262" # Borders, dividers, outlines
  accent:
    orange: "#fab283"     # Primary actions, links, selection, focus
    purple: "#9d7cd8"     # Headings / keywords
  semantic:
    successGreen: "#7fd88f" # Success / strings
    warnYellow: "#e5c07b"   # Warnings
    dangerRed: "#ff3b30"    # Error states, destructive actions

typography:
  fontFamily:
    base: "JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, \"Liberation Mono\", \"Courier New\", monospace"
  styles:
    display:
      size: 56
      weight: 700
      lineHeight: 1.1
      letterSpacing: 0
    heading:
      size: 24
      weight: 700
      lineHeight: 1.2
      letterSpacing: 0
    subheading:
      size: 18
      weight: 500
      lineHeight: 1.3
      letterSpacing: 0
    body:
      size: 16
      weight: 400
      lineHeight: 1.5
      letterSpacing: 0
    small:
      size: 13
      weight: 400
      lineHeight: 1.4
      letterSpacing: 0.02

spacing:
  scale:
    xs: 4
    sm: 8
    md: 12
    lg: 16
    xl: 24
    "2xl": 32
    "3xl": 48
    "4xl": 64
  layout:
    pagePadding: 24
    sectionGap: 32
    cardGap: 16
    containerWidth: 1200   # inner content container

radius:
  sm: 4
  md: 6
  lg: 8
  pill: 999

elevation:
  card:
    background: "secondary.darkSurface"
    borderColor: "secondary.borderGray"
    borderWidth: 1
    shadow: "none"

components:
  page:
    background: "primary.dark"
    textColor: "primary.light"
    containerWidth: "spacing.layout.containerWidth"
    paddingX: "spacing.layout.pagePadding"
    paddingY: "spacing.layout.pagePadding"
  sidebar:
    background: "primary.dark"
    textColor: "secondary.midGray"
    activeBackground: "secondary.darkSurface"
    activeTextColor: "primary.light"
    borderColor: "secondary.borderGray"
    width: 260
  button:
    primary:
      background: "primary.light"
      textColor: "primary.dark"
      radius: "radius.md"
      paddingX: 16
      paddingY: 8
    secondary:
      background: "secondary.darkSurface"
      textColor: "secondary.midGray"
      borderColor: "secondary.borderGray"
      borderWidth: 1
      radius: "radius.md"
      paddingX: 16
      paddingY: 8
  input:
    background: "secondary.darkSurface"
    textColor: "primary.light"
    placeholderColor: "secondary.midGray"
    borderColor: "secondary.borderGray"
    borderWidth: 1
    radius: "radius.md"
    paddingX: 12
    paddingY: 8
    focusRingColor: "accent.blue"
  card:
    background: "secondary.darkSurface"
    textColor: "primary.light"
    borderColor: "secondary.borderGray"
    borderWidth: 1
    radius: "radius.md"
    padding: "spacing.lg"
  table:
    headerBackground: "primary.dark"
    headerTextColor: "secondary.midGray"
    rowBackground: "secondary.darkSurface"
    rowTextColor: "primary.light"
    borderColor: "secondary.borderGray"
    borderWidth: 1
    rowPaddingY: 8
    rowPaddingX: 12
  chip:
    background: "secondary.darkSurface"
    textColor: "secondary.midGray"
    borderColor: "secondary.borderGray"
    borderWidth: 1
    radius: "radius.pill"
    paddingX: 8
    paddingY: 4
  segmentedControl:
    background: "primary.dark"
    segmentBackground: "secondary.darkSurface"
    segmentSelectedBackground: "accent.blue"
    segmentTextColor: "secondary.midGray"
    segmentSelectedTextColor: "primary.light"
    borderColor: "secondary.borderGray"
    borderWidth: 1
    radius: "radius.md"

motion:
  duration:
    fast: 0.15
    normal: 0.2
    slow: 0.4
  easing:
    standard: "cubic-bezier(0.4, 0, 0.2, 1)"
  respectsReducedMotion: true

accessibility:
  minContrastRatio: 4.5
  prefersReducedMotion: true

brand:
  tone: "developer-first, calm, technical"
  personality: "serious tool, high craft, minimal flair"

---

# Prompt Workspace + Website AUDIT — DESIGN.md v2

## 1. Overview

This design system is for a developer-focused AI app that combines a **Prompt Workspace** with a **Website AUDIT** tool.  
The UI should feel like a serious, reliable developer console, not a marketing site. It is **monochrome-first** with subtle blue accents, built for clarity, keyboard control, and high attention to detail.

Agents MUST treat this app as a **tool interface**, not a landing page. Prioritize legibility, hierarchy, and responsiveness.

Key principles:

- Single monospace font everywhere (code-like feel).
- Dark base surfaces with lighter text and cards.
- Minimal shadows; hierarchy expressed via spacing, borders, and typography.
- Blue accent only for real interactivity (selected states, links, highlights).
- Red only for genuine error/destructive states.

## 2. Layout & Structure

### Global shell

- Use a fixed left **sidebar** and a main content area.
- Sidebar width: `components.sidebar.width` (around 260px).
- Main content should be centered in a container width of `spacing.layout.containerWidth` (~1200px) with `spacing.layout.pagePadding` padding.
- The app is primarily desktop-first, but layouts should degrade gracefully on smaller widths using the same tokens.

Page types:

1. **Chat Workspace** — default route, where users write prompts and work with sections.
2. **Website AUDIT** — audit inputs, progress, and reports.
3. **History** — list of saved chats and past audits.

Agents SHOULD reuse the same page shell (sidebar + header + content) across all pages.

### Sidebar

- Background: `components.sidebar.background`.
- Top section: small product label in `typography.styles.small` and `components.sidebar.textColor`.
- Navigation items:
  - “Chat Workspace”
  - “Website AUDIT”
  - “History”
- Active item:
  - Background: `components.sidebar.activeBackground`.
  - Text: `components.sidebar.activeTextColor`.
  - Optionally, a 2–4px Accent.Blue bar on the left edge.
- Inactive items:
  - Text: `components.sidebar.textColor` (muted).
  - No strong background; maybe a slight dark hover.

Do NOT use large icons or colorful badges in the sidebar. Keep it compact and text-first.

## 3. Typography & Spacing

All text uses the `typography.fontFamily.base` monospace stack.

Use these roles:

- **Display**: product-level headings (e.g., “Prompt Workspace + Website AUDIT for developers”).
- **Heading**: page titles (“Chat Workspace”, “Website AUDIT”, “History”).
- **Subheading**: section titles and short intros.
- **Body**: main explanatory copy, message content.
- **Small**: labels, metadata, table headers, chip text.

Spacing:

- Use the 4px `spacing.scale` for everything:
  - vertical gaps between sections: `spacing.layout.sectionGap`.
  - padding inside cards: `spacing.lg`.
  - gaps between buttons, inputs, and labels: `spacing.sm`–`spacing.md`.
- Agents MUST NOT invent arbitrary spacings. Always pick from the defined scale.

Baseline:

- Align headings, body text, and card content on a consistent vertical rhythm.
- Tables and lists should visually align to the same baseline grid.

## 4. Components & Patterns

### Buttons

- **Primary**:
  - For main actions: “Generate Prompt”, “Start Audit”, “Run First Audit”.
  - Use `components.button.primary` tokens.
  - Hover state: slightly brighter background, maintain contrast, no huge scale changes.

- **Secondary**:
  - For secondary actions: “View details”, “Copy”, “Cancel”.
  - Use `components.button.secondary` tokens.
  - Hover: subtle background and border color shift.

Agents MUST NOT use bright, multi-colored buttons. Keep them monochrome with Accent.Blue carefully used for outlines or focus.

### Inputs

- Use `components.input` tokens for:
  - chat composer,
  - URL / GitHub input fields,
  - search fields.
- Placeholder text in `components.input.placeholderColor`.
- Focus:
  - show a clear but subtle focus ring in Accent.Blue around the input.

Keep inputs flat. Do NOT add inner shadows or glassmorphism.

### Cards

Use `components.card` for:

- Feature cards on the landing/overview.
- Audit mode cards (Basic / Recommended / Full).
- Audit finding cards.
- Structured content blocks (e.g., “Fix roadmap”).

Selected card state:

- Maintain background, emphasize border:
  - strengthen borderColor (toward Accent.Blue or lighter BorderGray),
  - optionally add a thin inner glow.

### Tables

Use `components.table` for:

- Audit mode comparison tables.
- History lists (chats and audits).
- Technical overview tables.

Requirements:

- Headers in `typography.styles.small`.
- Row background: `components.table.rowBackground`.
- Row text: `components.table.rowTextColor`.
- Border grid using `components.table.borderColor` and `components.table.borderWidth`.

Do NOT paint rows in strong alternating colors. Keep them subtle.

### Chips

Use `components.chip` for:

- Severity labels (e.g., “critical”, “high”, “medium”, “low”).
- Mode tags (“Recommended”, “Full”).

Severity colors:

- Base chip style plus:
  - DangerRed text/border accent for “critical”/“error”.
  - Accent.Blue accent for important but non-error labels.

Chip text stays small and monospace.

### Segmented Control

Use `components.segmentedControl` for:

- Input type selector (URL / GitHub / Files).
- Possibly for small mode toggles.

Selected segment:

- Background: `components.segmentedControl.segmentSelectedBackground` (Accent.Blue).
- Text: `components.segmentedControl.segmentSelectedTextColor` (light).

Unselected segment:

- Background: `components.segmentedControl.segmentBackground`.
- Text: `components.segmentedControl.segmentTextColor`.

## 5. Page-Specific Guidance

### Chat Workspace

- Use the global shell.
- Content structure:
  - Header row with:
    - Heading “Chat Workspace”.
    - Right-aligned small metadata (current model, mode).
  - Message list using Card patterns:
    - User messages: slightly stronger ink (Primary.Light), more prominent.
    - Assistant messages: Secondary.MidGray, same card background.
  - Composer:
    - Large multiline input plus Primary button.

Section branching:

- Below the master prompt, show three tabs/cards for:
  - “Coding”
  - “UI/UX”
  - “Audit”
- Each section has its own mini-thread styled like the main chat.

Agents MUST keep Chat Workspace minimal and functional; avoid decorative shapes.

### Website AUDIT

- Header:
  - Title “Website AUDIT”.
  - Subheading describing what it does in one sentence.

Input area:

- One card containing:
  - Segmented control for input type.
  - Conditional inputs for URL, GitHub, or Files.
- Keep layout single-column to preserve clarity.

Mode selector:

- Three mode cards with simple text and minimal iconography.
- Highlight “Recommended” as default but not via neon or gradients.

Progress & report:

- Progress bar using Accent.Blue.
- Stage labels in Small typography and Secondary.MidGray.
- Report structured into sections (Code, Browser, Accessibility, Performance, Security).
- Each section uses Card + Table to show findings and evidence.

Comparison table:

- At the bottom; uses Table tokens.

### History

- Simple, table-first layout.
- Two sections:
  - Chats.
  - Audits.
- Each entry row shows:
  - title,
  - date/time,
  - type,
  - status.
- Use subtle hover states (background tint, Accent.Blue underline on title).

Empty states:

- Provide guidance text and a primary CTA.
- No illustrations; just text and simple layout.

## 6. Motion & Micro-interactions

Motion:

- Keep durations inside `motion.duration.fast`–`motion.duration.normal`.
- Use `motion.easing.standard`.
- Respect `motion.respectsReducedMotion`: when OS requests reduced motion, disable non-essential animations.

Micro-interactions:

- Hover:
  - Slight background and border changes.
  - DO NOT use large scale or rotation.
- Loading:
  - Use simple linear progress or small spinners in the dark surfaces.
- Feedback:
  - Inline messages for events like “Copied” or “Audit complete”.
  - Use Secondary.MidGray text; do not pop modal dialogs for minor events.

Agents SHOULD treat motion as a secondary layer. Core layout and hierarchy come first.

## 7. Accessibility & Performance

- Ensure text contrast meets `accessibility.minContrastRatio` (AA level).
- Maintain consistent font sizes and line heights so developers can scan quickly.
- Do NOT rely solely on color to indicate state:
  - use icons, labels, or text when necessary (especially for errors and selected states).
- Keep DOM and component structures simple to allow fast rendering even during heavy audits.

## 8. Do’s and Don’ts

### Do

- Keep the UI calm, serious, and technical.
- Use monospace for everything.
- Use Accent.Blue sparingly for interactive states.
- Use Small typography for metadata and labels.
- Use the spacing scale and radius tokens consistently.

### Don’t

- Don’t add gradients, glassmorphism, or neon glows.
- Don’t introduce new color families beyond this palette.
- Don’t mix multiple typefaces.
- Don’t animate large layout changes or break accessibility.

---

Agents implementing UI changes MUST:

- Read this file before editing UI.
- Use tokens from the frontmatter instead of inventing new values.
- Keep all new components compatible with the patterns described above.