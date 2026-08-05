# SOAPAP Design System

> **Sistema Operador de los Servicios de Agua Potable y Alcantarillado del Municipio de Puebla**
> Gobierno del Estado de Puebla · Administración 2024–2030

## Sources

| Recurso | URL / Ruta |
|---|---|
| GitHub repo | https://github.com/fsjorg3/SOAPAPV2 — no conectado aún; conectar para extraer pantallas reales |
| Tema MUI fuente | `reference/institutional-flat-system.theme.txt` |
| Logos | `assets/logos/` |

---

## Context

SOAPAP is the public water utility for the Municipality of Puebla, Mexico — a government institution managing drinking water supply and sewage. The digital platform serves four surfaces:

- **Portal Ciudadano** — self-service for citizens: pay bills, report leaks, download receipts, update data
- **Panel Administrativo** — internal staff dashboard: user accounts, billing, incident management, metrics
- **Sitio Web Institucional** — public marketing/info site: services overview, news, transparency, contact
- **App Móvil** — citizen-facing iOS/Android app for all self-service tasks on the go

The institutional identity aligns with the Puebla state government campaign **"Por Amor a Puebla"** (2024–2030).

---

## CONTENT FUNDAMENTALS

**Language:** Spanish (es-MX). All copy is in Spanish; no bilingual UI.

**Tone:** Institutional, professional, and approachable. The voice is trustworthy and civic — the government speaking to its citizens. Never casual or playful. No slang, no emoji.

**Casing:** Sentence case everywhere. Button labels are sentence-case (not ALL CAPS or Title Case), except for overline labels which are uppercase with wide tracking. E.g. "Pagar recibo" not "PAGAR RECIBO" in body copy.

**POV:** Second-person formal (usted implied, but typically omitted). Address the user by their given name when known ("Hola, María"). Avoid vosotros forms.

**Copy principles:**
- Clear and direct. No bureaucratic filler. "Pagar recibo" not "Proceder con el pago del recibo de agua".
- Action labels start with a verb: "Reportar fuga", "Descargar PDF", "Ver historial".
- Error messages are empathetic and actionable: "No se pudo procesar el pago. Verifica tus datos bancarios."
- Success messages confirm what happened: "Tu pago de $325.00 fue aplicado correctamente."
- Status labels use single words: "Pagado", "Pendiente", "Vencido", "En revisión", "Resuelto".

**Emoji:** Never used in UI — zero emoji policy. Icons come from Material Symbols Rounded only.

**Numbers:** Mexican peso format: `$1,234.00` (comma thousands, period decimal). Dates: `30 jun 2026` (abbreviated month, lowercase). Months lowercase: enero, febrero… No "enero de 2026" — use "enero 2026".

---

## VISUAL FOUNDATIONS

### Colors

**Primary — Vino (maroon):** `#3D0017`. Deep institutional maroon, directly tied to the Puebla government identity visible in the "Por Amor a Puebla" wordmark and the Gobierno del Estado 2024–2030 badge. Used for: navigation bars, primary buttons, active states, card accent bars, selection highlights.

**Secondary — Oro (gold):** `#B8822A`. Used as the accent for tab indicators, outstanding card bars, secondary buttons, and calls-to-action that need warmth. The pairing of deep maroon + gold is the core brand expression.

**Surfaces:** Near-white `#F8F9FB` app background; pure white `#FFFFFF` for cards, inputs, modals. Zero shadows — depth comes from `1px solid #E9ECEF` hairline borders only.

**Semantic colors:** Standard success/warning/error/info tinted variants (see `tokens/colors.css`).

### Typography

Single family: **Montserrat** throughout (loaded from Google Fonts CDN). No mixing of type families. Weights used: 400 (body), 500 (medium labels), 600 (semibold UI), 700 (headings, buttons). Headings are tight (`-0.02em` letter-spacing on H1). Body text uses `1.6` line-height for reading comfort.

### Spacing & Layout

**Base unit: 8px.** All spacing is multiples of 4px (half-unit allowed for compact UI elements). Standard content max-width: `1200px`. Sidebar width: `264px`. App bar height: `64px`.

### Backgrounds & Surfaces

No background imagery, no textures, no patterns, no gradients (exception: the AppBar). Pure flat white/near-white surfaces divided by hairline borders. The maroon AppBar uses **glassmorphism** (backdrop-filter: blur(10px), 95% opacity vino) styled as a "floating island" with 12px radius and a 20px top margin — the only visual flourish in the system.

### Elevation & Shadows

**Fully flat: zero shadows on all components.** The MUI theme explicitly sets all 25 shadow levels to `"none"`. Depth is communicated through background color differences and 1px borders only.

### Cards

Three variants — all with `border-radius: 8px`, `border: 1px solid #E9ECEF`, `padding: 8px`, no shadow:
- **plain** — just the hairline border
- **standard** — 10px left border in `--vino-700`; hover shifts to oro-dark + grey-050 wash
- **outstanding** — 10px left border in `--oro-500`; hover shifts to oro-700 + grey-100 wash

### Corner Radii

| Context | Radius |
|---|---|
| Buttons, inputs, tooltips | 4px |
| Cards, tables, alerts, modals | 8px |
| Floating AppBar | 12px |
| Chips, badges | 9999px (pill) |

### Borders

All borders are `1px solid #E9ECEF` (hairline). Input focus and card accent bars use `--vino-700`. The 10px card left-accent bar is the bolder institutional statement.

### Hover & Press States

- **Contained buttons:** background darkens (vino-800 → vino-700 on hover → vino-900 on press). 180ms ease-out.
- **Outlined/text buttons:** light vino wash (`#F8F1F3`) background on hover.
- **NavItems:** grey-100 wash on hover; vino-050 + 3px left border when active.
- **Table rows:** grey-100 on hover; zebra striping on even rows (grey-050).
- **Cards with accent:** accent bar shifts to oro-700 on hover.
- **No scale transforms, no shrink on press** — purely color-driven.

### Transitions

Single value: `180ms ease-out` for buttons; `150ms ease-out` for inputs and nav items; `120ms` for checkboxes, radios, chips. Never longer than 300ms for UI elements.

### Focus States

`box-shadow: 0 0 0 3px rgba(91, 19, 43, 0.18)` — a soft vino ring. Applied via keyboard-only `:focus-visible`.

### Iconography → see ICONOGRAPHY section.

### Images & Media

No decorative imagery is defined in this system. Government institution — UI is content-first, data-dense. Where imagery is needed (news articles, profile photos), it should be natural-light photography of Puebla infrastructure and citizens.

---

## ICONOGRAPHY

**Icon system: [Material Symbols Rounded](https://fonts.google.com/icons)**
Load via CDN:
```html
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@24,400,0,0&display=swap" />
```
Usage: `<span style="font-family:'Material Symbols Rounded'">water_drop</span>`

- **Style:** Rounded variant, optical size 24, weight 400, fill 0, grad 0.
- **Sizing:** 16px captions, 20px body/buttons, 22–24px action icons, 28px feature icons.
- **Color:** Inherits from parent color or explicitly set to `--vino-700` for primary, `--oro-700` for secondary, `--text-disabled` for inactive.
- **No emoji, no Unicode dingbats, no custom SVG icons** are part of the system.
- Emoji are never used, even informally.

Key icons used across the product:
| Context | Icon name |
|---|---|
| Water / main service | `water_drop` |
| Leak report | `water_damage` |
| Bill/receipt | `receipt_long` |
| Payment | `payment`, `payments` |
| Download | `download`, `file_download` |
| User account | `account_circle`, `person` |
| Settings | `settings` |
| Location | `location_on` |
| Map/zone | `map` |
| Search | `search` |
| Notifications | `notifications` |
| Success | `check_circle`, `task_alt` |
| Warning | `warning` |
| Error | `error` |
| Info | `info` |
| Close | `close` |
| Navigation chevrons | `chevron_right`, `expand_more` |

---

## FILE INDEX

```
SOAPAP Design System
├── styles.css                   ← Global CSS entry; @import all tokens
├── tokens/
│   ├── fonts.css                ← Montserrat from Google Fonts
│   ├── colors.css               ← All color tokens + semantic aliases
│   ├── typography.css           ← Type scale, weights, families
│   ├── spacing.css              ← Space scale, radii, motion, layout
│   └── base.css                 ← Reset, element styles, utility classes
├── assets/
│   └── logos/
│       ├── soapap.webp          ← SOAPAP wordmark (transparent, use on light or invert for dark)
│       ├── amor-puebla.webp     ← "Por Amor a Puebla" campaign mark
│       └── gobierno-estado.webp ← Gobierno del Estado 2024–2030 seal
├── components/
│   ├── core/
│   │   ├── Button.jsx/d.ts      ← Contained, outlined, text; primary/secondary
│   │   ├── IconButton.jsx/d.ts  ← Icon-only; ghost/contained/outlined
│   │   ├── Card.jsx/d.ts        ← plain / standard (vino) / outstanding (oro)
│   │   ├── Badge.jsx/d.ts       ← Pill status label; soft/solid
│   │   ├── Chip.jsx/d.ts        ← Filter/selection chip; deletable
│   │   └── Avatar.jsx/d.ts      ← Initials or image, circle/square
│   ├── forms/
│   │   ├── Input.jsx/d.ts       ← Outlined text field; label/helper/error/icons
│   │   ├── Textarea.jsx/d.ts    ← Multiline field
│   │   ├── Select.jsx/d.ts      ← Outlined native select
│   │   ├── Checkbox.jsx/d.ts    ← Square; vino fill
│   │   ├── Radio.jsx/d.ts       ← Vino dot
│   │   └── Switch.jsx/d.ts      ← Toggle; vino track
│   ├── feedback/
│   │   ├── Alert.jsx/d.ts       ← Tinted severity banner; 4 severities
│   │   ├── Spinner.jsx/d.ts     ← Circular loader
│   │   └── Dialog.jsx/d.ts      ← Modal; flat panel, dim backdrop
│   ├── navigation/
│   │   ├── Tabs.jsx/d.ts        ← Gold indicator underline tabs
│   │   ├── Breadcrumb.jsx/d.ts  ← Chevron path trail
│   │   ├── NavItem.jsx/d.ts     ← Sidebar nav row; active = vino bar
│   │   └── Pagination.jsx/d.ts  ← Page number row
│   └── data/
│       └── Table.jsx/d.ts       ← Striped flat table; hover row
├── guidelines/
│   ├── colors-vino.card.html
│   ├── colors-oro.card.html
│   ├── colors-neutrals.card.html
│   ├── colors-semantic.card.html
│   ├── type-headings.card.html
│   ├── type-body.card.html
│   ├── spacing-scale.card.html
│   ├── spacing-radii.card.html
│   ├── brand-logos.card.html
│   ├── brand-cards.card.html
│   └── brand-appbar.card.html
├── ui_kits/
│   ├── citizen_portal/index.html   ← Login + cuenta + recibos + trámites
│   ├── admin_dashboard/index.html  ← Sidebar + stats + tabla + gráficas
│   ├── website/index.html          ← Sitio público: hero + trámites + noticias
│   └── mobile_app/index.html       ← 3 pantallas móviles: Login, Inicio, Reporte
└── reference/
    └── institutional-flat-system.theme.txt  ← Tema MUI original (fuente de verdad)
```

---

## COMPONENTS

| Component | Group | Description |
|---|---|---|
| Button | Core | Contained, outlined, text; primary/secondary; sm/md/lg |
| IconButton | Core | Icon-only; ghost/contained/outlined; round/square |
| Card | Core | plain / standard (vino bar) / outstanding (oro bar) |
| Badge | Core | Pill status; 7 semantic colors; soft/solid |
| Chip | Core | Filter/tag; selectable; deletable |
| Avatar | Core | Initials or image; circle/square; 3 colors |
| Input | Forms | Outlined text field; label/helper/error/icons |
| Textarea | Forms | Multiline; same styling as Input |
| Select | Forms | Native select, outlined |
| Checkbox | Forms | Square; vino fill + Material check glyph |
| Radio | Forms | Vino dot; scale-in animation |
| Switch | Forms | Vino track; thumb slides right |
| Alert | Feedback | Tinted banner; 4 severities; closeable |
| Spinner | Feedback | SVG circular loader; 3 colors |
| Dialog | Feedback | Modal panel; flat; dim backdrop |
| Tabs | Navigation | Gold indicator; underline style |
| Breadcrumb | Navigation | Chevron separator |
| NavItem | Navigation | Sidebar row; 3px vino left border when active |
| Pagination | Navigation | Page numbers + prev/next |
| Table | Data | Striped; hover row; custom cell render |
