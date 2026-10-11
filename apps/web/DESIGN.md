---
name: Recap
description: A personal work overview. Calm, dense, neutral UI in the Linear and Raycast class.
colors:
  primary: "oklch(0.52 0.19 277)"
  primary-foreground: "oklch(0.99 0.003 277)"
  background: "oklch(0.992 0.001 286)"
  foreground: "oklch(0.21 0.006 286)"
  card: "oklch(1 0 0)"
  muted: "oklch(0.965 0.002 286)"
  muted-foreground: "oklch(0.5 0.014 286)"
  accent: "oklch(0.955 0.003 286)"
  border: "oklch(0.915 0.004 286)"
  input: "oklch(0.89 0.005 286)"
  sidebar: "oklch(0.975 0.002 286)"
  sidebar-foreground: "oklch(0.37 0.012 286)"
  sidebar-accent: "oklch(0.935 0.004 286)"
  success: "oklch(0.6 0.15 155)"
  destructive: "oklch(0.56 0.2 25)"
typography:
  display:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem / 3rem (sm) / 3.75rem (lg)"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  section:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem / 1.875rem (sm)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  page:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem / 1.5rem (sm)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  title:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.375
    letterSpacing: "-0.025em"
  card:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.375
  body:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "-0.006em"
    fontFeature: "\"cv01\", \"ss03\""
  label:
    fontFamily: "Inter Variable, Inter, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
rounded:
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
spacing:
  "1": "4px"
  "1.5": "6px"
  "2": "8px"
  "3": "12px"
  "4": "16px"
  "6": "24px"
  "8": "32px"
  "10": "40px"
  "12": "48px"
  "16": "64px"
  "20": "80px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
    padding: "0 10px"
  button-primary-large:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.primary-foreground}"
    rounded: "{rounded.lg}"
    height: "40px"
    padding: "0 16px"
  button-outline:
    backgroundColor: "{colors.background}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
  button-ghost:
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
  input:
    backgroundColor: "transparent"
    textColor: "{colors.foreground}"
    rounded: "{rounded.lg}"
    height: "32px"
  card:
    backgroundColor: "{colors.card}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
    padding: "16px"
  sidebar:
    backgroundColor: "{colors.sidebar}"
    textColor: "{colors.sidebar-foreground}"
    width: "256px"
  sidebar-item-active:
    backgroundColor: "{colors.sidebar-accent}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.md}"
  badge-outline:
    textColor: "{colors.foreground}"
    rounded: "9999px"
---

# Design System: Recap

This file is the visual source of truth for `apps/web`. Product truth is in `PRODUCT.md`. Code rules (folders, lint plugins, naming) are in the root `AGENTS.md`. When this file and the code disagree, the tokens in `src/index.css` win. Update this file in the same change.

## Overview

**Creative North Star: "The Clear Desk"**

Recap is a tool that people open in the morning to see what they did. The screen must look like a clean desk: everything in its place, nothing loud, the work in front. The style is the category standard, played straight. Recap must sit next to Linear and Raycast and look like it belongs there. The user chose this direction on 2026-10-11 over more expressive options. Do not add personality through decoration. Add it through precision: alignment, spacing, type weight and good copy.

The UI is light, cool and neutral. One indigo accent marks the primary action, focus, progress and "today". Green and red show state only. Density is medium: 14 px body text, 32 px controls, 24 px between panels. The design uses 1 px borders to separate surfaces, not shadows.

The previous theme (cream paper, a serif display face, a terracotta dot) is rejected. It looked like generic AI output. Do not bring back any part of it.

**Key Characteristics:**

- Cool zinc neutrals with a slight blue-violet tint (hue 286).
- One accent: indigo (hue 277).
- Inter for all text. No serif, no display face, no mono costume.
- Flat surfaces with 1 px borders. Shadows only on floating layers.
- shadcn/ui components, used as they are.

## Colors

The palette is restrained: tinted neutrals and one accent. State colours appear only where they carry meaning.

### Primary

- **Signal Indigo** (`primary`): the primary button, links, the focus ring, progress bars, the logo mark and the digest bullets. A done step is ink on Mist, not indigo. Use at most one primary button for each view region.

### Neutral

- **Cool Paper** (`background`): the page ground. A near-white with a trace of blue-violet.
- **Plain White** (`card`, `popover`): panels, cards, dialogs, menus. It sits one step lighter than the page, so a white panel with a border reads as a raised surface.
- **Ink** (`foreground`): body text and headings.
- **Slate Text** (`muted-foreground`): secondary text, descriptions, table meta, timestamps. Contrast on white is above 4.5:1. Do not go lighter for text.
- **Mist** (`muted`, `secondary`): quiet fills such as the icon tile in an empty state, a secondary button, a done step marker.
- **Hover Mist** (`accent`): hover fill for ghost buttons and menu items.
- **Hairline** (`border`): every divider and panel edge. **Field Line** (`input`) is one step darker for form fields.
- **Rail Grey** (`sidebar`): the app sidebar ground, one step darker than the page. **Rail Select** (`sidebar-accent`) marks the active nav item.

### State

- **Healthy Green** (`success`): a connected tool, a successful result. Use as a 6 to 8 px dot or an icon colour, not as a fill for large areas.
- **Alert Red** (`destructive`): errors, a connection that needs a reconnect, destructive actions.
- `chart-1` to `chart-5` exist for future data charts (indigo, green, amber, blue, magenta). Do not use them as decoration.

### Named Rules

**The One Accent Rule.** Indigo is the only hue that is not a state. If a second accent seems necessary, the hierarchy is wrong. Fix it with weight or position.

**The State Means State Rule.** Green and red appear only when they report a real state. Status badges use the secondary or outline variant, not indigo.

**The Token Only Rule.** Use the Tailwind theme classes (`bg-primary`, `text-muted-foreground`, `border-border`). No palette colours (`bg-zinc-100`), no hex, no arbitrary values. The `no-palette-color` plugin fails the build on them.

## Typography

**Body Font:** Inter Variable, self-hosted through `@fontsource-variable/inter/opsz.css` (with `ui-sans-serif, system-ui` fallback). The optical size axis gives large text the tighter display cut automatically.
**Mono Font:** the system mono stack. Use it only for real code, keys or IDs.

**Character:** one neutral grotesque at every size. Rank comes from size and weight, not from a second family. Body text uses Inter features `cv01` and `ss03` and a tracking of -0.006em.

### Hierarchy

All headings go through the `Heading` component (`@/features/app-shell/components/Heading`) with an `EHeadingVariant`. Do not set heading sizes with `className`.

- **DISPLAY** (600, 36 / 48 / 60 px, line-height 1, tracking tight): the landing page h1 only.
- **SECTION** (600, 24 / 30 px): landing page section titles.
- **PAGE** (600, 20 / 24 px): the h1 of every signed-in page, through `AppPage`.
- **TITLE** (600, 20 px): auth and standalone result pages.
- **CARD** (600, 14 px): card and panel titles, inside `CardTitle`.
- **ITEM** (600, 14 px): list item titles, group labels inside a panel.
- **LABEL** (500, 14 px): small labels.
- **Body** (400, 14 px, line-height 1.5): all running UI text. The landing page uses 16 to 18 px for its lead paragraph. Keep a line at 65 to 75 characters (`max-w-prose` or `max-w-xl`).
- **Meta** (400, 12 px): timestamps, email under a name, hints.

### Named Rules

**The Weight Not Size Rule.** In the app, a heading is at most 24 px. Rank inside a panel comes from `font-semibold` against `font-normal`, and from `text-foreground` against `text-muted-foreground`. Big type belongs to the landing page only.

**The Tabular Numbers Rule.** Counts, dates, times and step numbers use `tabular-nums`.

**The No Eyebrow Rule.** No small caps label or kicker above a heading. No uppercase tracking labels. The heading carries its own weight.

## Layout

**App shell.** The shadcn `Sidebar` (`collapsible="icon"`, 256 px wide, 48 px icon rail) holds the logo, the nav and the user menu. The main area is `SidebarInset` with a 48 px sticky top bar (sidebar trigger; logo on mobile only). Pages render inside `AppPage`, which gives the page header and a fluid `Container` (`max-w-screen-2xl`, 16 / 24 / 40 px side gutters, 24 / 32 / 40 px top padding).

**Page grid.** A signed-in page uses a 12-column feel through simple grids: main content in `lg:col-span-2` of a 3-column grid, a side panel in the third column. Everything stacks to one column below `lg` (1024 px). Panels are 24 px apart (`gap-6`). Inside a panel, groups are 16 to 24 px apart and items 8 to 12 px apart.

**Landing and public pages.** `Section` and `Container` (`max-w-6xl`) with 64 / 80 / 96 px vertical padding. The landing hero is left-aligned text (`max-w-3xl`) and a full-width framed example below it. Two-column sections use `lg:grid-cols-12` with a 5 / 7 split.

**Auth and result pages.** One centred column, `max-w-sm` for forms and `max-w-md` for a result card.

**Spacing scale.** Only these steps: 0, 0.5, 1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 14, 16, 20, 24, 28, 32 (multiples of 4 px). The `no-off-scale-spacing` plugin enforces it. Use `gap-*`, not `space-*`.

**Responsive.** Design for 320 px first, then add `sm` (640), `md` (768), `lg` (1024). Rows that can get too wide stack first (`flex-col sm:flex-row`). Give `min-w-0` to any flex or grid child that holds long text, and `truncate` emails and names. Before you finish UI work, check 320, 768, 1024 and 1440 px, and check that `document.documentElement.scrollWidth` is not more than the window width.

### Named Rules

**The More Space Above Rule.** A heading has more space above it than below it. A page title sits 24 to 32 px above its first panel and 4 px above its description.

## Elevation & Depth

The system is flat. Depth comes from tonal steps (Rail Grey sidebar, Cool Paper page, White panel) and 1 px borders. Cards use a 1 px ring (`ring-1 ring-foreground/10`) and no shadow.

### Shadow Vocabulary

- **Lift** (`shadow-md`: `0 4px 8px -2px` at 8% ink): dropdown menus, popovers, toasts.
- **Float** (`shadow-lg`: `0 8px 16px -4px` at 10% ink): dialogs and sheets.
- `shadow-xs` and `shadow-sm` are almost invisible (4 to 5% ink, 1 to 2 px). Use them only on a control that must separate from a white ground.

### Named Rules

**The One Elevation Rule.** A surface has a border or a shadow, not both at full strength. A bordered card with a wide soft shadow is a ghost card. Do not make one.

**The Floating Only Rule.** Only layers that float above the page (menus, dialogs, toasts) get a real shadow.

## Shapes

Gently rounded, never pill-shaped except for small badges.

- Controls (buttons, inputs, nav items): 8 px (`rounded-lg`), menu items 6 px.
- Cards and panels: 12 px (`rounded-xl`).
- Badges: full pill.
- Avatars: a circle for the signed-in user. A work account uses an 8 px rounded square tile, so it lines up with the tool logo tiles.
- The logo mark: a 20 px indigo square with 5 px corners and three white bars of falling length (a digest). It lives in `Wordmark/components/LogoMark`. Do not redraw it elsewhere. Use `Wordmark`.
- Borders are always 1 px. No side borders thicker than 1 px, no dashed borders except a stand-alone `Empty` frame.

## Components

Use the shadcn components in `src/components/ui` as they are. Do not edit them by hand and do not copy them. If a component is missing, add it with the shadcn CLI.

### Buttons

Restrained and precise.

- **Shape:** 8 px corners. Default height 32 px. `size="lg"` is 36 px. Landing and auth CTAs use `size="lg"` with `h-10 px-4` (40 px).
- **Primary (`default`):** indigo fill, white text. One per region.
- **Outline:** white fill, hairline border. Card actions such as "Manage" and setup step actions.
- **Ghost:** no fill, Hover Mist on hover. Secondary nav actions ("Sign in", "How it works").
- **Link:** indigo text, underline on hover. Inline text actions ("Create one").
- **Destructive:** only for an action that deletes or revokes.
- **Focus:** a 3 px ring in indigo at 50%. **Disabled:** 50% opacity and a `not-allowed` cursor (set globally in `index.css`).
- Wrap a router `<Link>` in `<Button asChild>` when a link must look like a button. Put an arrow icon (`ArrowRightIcon`, `data-icon="inline-end"`) only on a CTA that leads to sign-up.

### Badges

- **Outline:** neutral status such as "Example", "Coming soon", "Later".
- **Secondary:** a positive status such as "Available" or a healthy connection.
- **Default (indigo):** do not use for status. Indigo is for action, focus and progress.
- **Destructive:** a connection that needs action.

### Cards / Containers

- **Corner Style:** 12 px.
- **Background:** White on the Cool Paper page.
- **Shadow Strategy:** none. A 1 px ring.
- **Internal Padding:** 16 px (`size="sm"`: 12 px).
- **Title:** `<CardTitle><Heading as={EHeadingTag.H2} variant={EHeadingVariant.CARD}>`. A one-line `CardDescription` under it. One action at most in `CardAction`, usually an outline `sm` button.
- Do not nest cards. Inside a card, group with spacing, `Separator` or a list.

### Inputs / Fields

- **Style:** 32 px high, 8 px corners, Field Line border, transparent fill. Use `Field`, `FieldLabel`, `FieldDescription` and `FieldError` from `field.tsx`.
- **Focus:** indigo border and ring. **Error:** red border and `FieldError` text under the field.
- Auth forms use full-width 40 px buttons under the fields.

### Navigation

- **Sidebar:** Rail Grey ground, 14 px items with a 16 px lucide icon. The active item gets Rail Select and Ink text. Add a page as an `AppSidebarNavItem`. The user menu sits in the sidebar footer (avatar, name, email, chevrons) and opens to the right.
- **Top bar:** 48 px, sticky, hairline bottom border. It holds only the sidebar trigger. On mobile it also shows the logo.
- **Landing header:** 56 px, sticky, hairline bottom border, logo left, "Sign in" (ghost, sm) and "Get started" (primary, sm) right.

### States

Every data region has all four states, with the same components on every page:

- **Loading:** `Skeleton` blocks in the shape of the content.
- **Error:** `Alert variant="destructive"` with a title that names the problem and a retry `Button` in `AlertAction`.
- **Empty:** `Empty` with a lucide icon in a Mist tile, a title, one sentence and at most one action. Inside a card it has no frame. A dashed frame is only for an `Empty` that stands alone on a page (Settings).
- **Done or success:** a `toast` from sonner at the bottom centre, or a success icon in `success` green on a result page.

### Work account card (Settings)

One card for each work account. The header has a 36 px square initial tile (8 px corners, Mist fill, ink letter) or the Google photo, the name in CARD weight, and the email under it only when a name exists. Do not show the same email twice. A ghost `…` icon button opens a menu with "Remove work account" (destructive item, menu at least 192 px wide).

Below the header, a hairline-divided list shows every supported tool, connected or not, in a fixed order (Google Calendar, Jira, Linear). Each row (`ConnectorRow`) has:

- A 36 px logo tile (bordered, 8 px corners) with the brand mark. Brand marks are authored SVG in `ConnectorRow/components/ProviderLogo` and keep their brand colours.
- The tool name and one status line with a 6 px dot: green and the account email when connected, red "Access expired" when it needs a reconnect, grey "Not connected" otherwise.
- Actions on the right: "Connect" (outline) when not connected, "Disconnect" (ghost, muted) when connected, "Disconnect" and "Reconnect" when access expired. Below about 360 px the actions wrap under the text.

Add a new tool by adding it to `IDENTITY_CONNECTORS`, `TConnectorProvider` and `PROVIDER_MARKS`. Do not add per-card "Connect X" button rows or a separate connections list.

### Signature: the digest preview

The landing example (`home/components/LandingHero/components/MechanismDiagram`) shows the product model: a Rail Grey column of work accounts (company, email, tools, a green dot) beside a white panel with "This week" and one group per account with indigo bullets. It is one bordered 12 px panel with no outer frame. It carries an "Example" badge, because the data is not real. When the real digest UI exists, build it in this shape: grouped by work account, short lines, indigo 4 px bullets, meta in Slate Text.

### Icons

lucide-react only, 16 px in controls and nav, 14 px in small buttons. No emoji and no Unicode symbols as icons. Provider logos (such as `GoogleMark`) are authored SVG components.

### Motion

Motion is small and functional. Use the shadcn defaults for menus, dialogs and the sidebar. The only custom animation is `animate-draw` (900 ms, ease-out, scale-x from 0) for connector lines on the dashboard, under `motion-safe:`. Do not add entrance animations to sections or cards.

## Do's and Don'ts

### Do:

- **Do** start every signed-in page with `AppPage` (title, one-line description, actions on the right).
- **Do** use `Heading` variants for every heading, and pick the variant by role.
- **Do** keep one primary button for each region, and make other actions outline, ghost or link.
- **Do** separate surfaces with a 1 px hairline or a tonal step.
- **Do** show state with a small green or red dot, an icon, or a badge, next to a text label.
- **Do** label example or sample data with an "Example" badge.
- **Do** write UI copy in plain, short sentences. Name the action on a button ("Add work account", not "Continue"). An error says what went wrong and what to do.
- **Do** use "work account" in the UI for a Work Identity, and the provider name for a Connection ("Google Calendar", "Jira").
- **Do** run the impeccable detector (`impeccable detect --json <files>`) on changed UI files before you finish.

### Don't:

- **Don't** use a serif face, a second display face, cream or beige grounds, or a terracotta or orange accent. The user rejected this look.
- **Don't** use gradients, gradient text, glass, `backdrop-blur`, glows or hard offset shadows.
- **Don't** put a kicker, eyebrow or uppercase label above a heading.
- **Don't** build a page from a grid of same-size icon cards, or a hero metric block (big number, small label).
- **Don't** nest cards, or put a border and a wide shadow on the same card.
- **Don't** use a colour for decoration. Indigo is for action and focus. Green and red are for state.
- **Don't** set text larger than 24 px in the signed-in app.
- **Don't** use monospace for anything that is not code, a key or an ID.
- **Don't** use arbitrary Tailwind values (`w-[13px]`), palette colours or `!important`.
- **Don't** show internal terms ("Work Identity", "Connection", "Connector") in the UI.
