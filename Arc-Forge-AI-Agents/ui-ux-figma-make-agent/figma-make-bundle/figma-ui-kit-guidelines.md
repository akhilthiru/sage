# AutoChain Design System — Figma Make Guidelines

**Product**: Automotive Supply Chain Management SaaS  
**Users**: Planners, Analysts, Operations teams  
**Nature**: Data-heavy, workflow-driven, multi-role  

---

## HOW TO USE THESE GUIDELINES

Before writing any code, follow these steps in order:

1. Read the **Global UX Principles** section
2. Read the **App Layout** section
3. Read the **Design Tokens** section (colors, typography, spacing)
4. Identify all components needed, then read each component's section
5. Choose the correct **Page Template** for the screen type

---

## GLOBAL UX PRINCIPLES (NON-NEGOTIABLE)

- **Clarity over decoration** — No visual chrome that doesn't communicate data
- **Tables are the primary interaction surface** — Most screens centre on a data table
- **Status is always visible** — Every order, shipment, and part has a visible status badge
- **Drill-down is mandatory** — Clicking a table row always navigates to a detail view
- **Filters always support Plant / Supplier / Date Range** — No exceptions
- **Alerts surface proactively** — Warnings appear before problems escalate
- **Horizontal scroll is allowed on wide tables** — Never hide or truncate data columns
- **Light and Dark themes must both work** — Use only CSS variables, never hardcoded hex values
- **Only ONE primary button per section** — Always
- **Status uses colour + text together** — Never colour alone

---

## APP LAYOUT (STRICT — DO NOT DEVIATE)

Every screen uses this exact three-zone shell:

```
┌──────────────────────────────────────────────────────────┐
│                   TOP HEADER (56px fixed)                │
├──────────────┬───────────────────────────────────────────┤
│              │                                           │
│  LEFT        │   MAIN CONTENT AREA                       │
│  SIDEBAR     │   padding: 24px, scrollable vertically    │
│  240px /     │                                           │
│  56px        │                                           │
│  (fixed)     │                                           │
└──────────────┴───────────────────────────────────────────┘
```

**Sidebar**: 240px expanded / 56px collapsed, full viewport height, fixed  
**Header**: 56px fixed, full width  
**Content**: remaining viewport, 24px padding all sides  
**Min supported width**: 1280px (desktop-first)

---

## DESIGN TOKENS — COLORS

All colors are CSS custom properties. Never use hardcoded hex values. The `[data-theme="dark"]` attribute on a wrapper element activates dark mode.

### Light Theme (`:root`)

```css
:root, [data-theme="light"] {
  /* Page */
  --color-page-bg:           #F4F6F9;
  --color-surface:           #FFFFFF;
  --color-surface-raised:    #FFFFFF;

  /* Sidebar */
  --color-sidebar-bg:             #1F2A44;
  --color-sidebar-item-default:   rgba(255,255,255,0.55);
  --color-sidebar-item-hover:     rgba(255,255,255,0.08);
  --color-sidebar-item-active-bg: rgba(51,102,204,0.18);
  --color-sidebar-item-active:    #FFFFFF;
  --color-sidebar-border:         rgba(255,255,255,0.08);
  --color-sidebar-logo:           #FFFFFF;

  /* Header */
  --color-header-bg:     #FFFFFF;
  --color-header-border: #E2E8F0;

  /* Text */
  --color-text-primary:    #0F172A;
  --color-text-secondary:  #475569;
  --color-text-tertiary:   #94A3B8;
  --color-text-disabled:   #CBD5E1;
  --color-text-inverse:    #FFFFFF;
  --color-text-link:       #3366CC;

  /* Icons */
  --color-icon-default:    #475569;
  --color-icon-secondary:  #94A3B8;
  --color-icon-hover:      #0F172A;
  --color-icon-disabled:   #CBD5E1;

  /* Borders */
  --color-border:          #E2E8F0;
  --color-border-strong:   #CBD5E1;
  --color-border-focus:    #3366CC;

  /* Primary / Brand */
  --color-primary:         #3366CC;
  --color-primary-hover:   #2952A3;
  --color-primary-pressed: #1E3D7A;
  --color-primary-subtle:  #EEF3FC;
  --color-primary-text:    #FFFFFF;

  /* Success */
  --color-success:         #149E65;
  --color-success-subtle:  #ECFDF5;
  --color-success-label:   #0D6E46;
  --color-success-text:    #FFFFFF;

  /* Warning */
  --color-warning:         #F4A100;
  --color-warning-subtle:  #FFFBEB;
  --color-warning-label:   #92400E;
  --color-warning-text:    #FFFFFF;

  /* Error */
  --color-error:           #E94F37;
  --color-error-hover:     #C43B25;
  --color-error-subtle:    #FEF2F0;
  --color-error-label:     #991B0C;
  --color-error-text:      #FFFFFF;

  /* Info */
  --color-info:            #0284C7;
  --color-info-subtle:     #F0F9FF;
  --color-info-label:      #075985;
  --color-info-text:       #FFFFFF;

  /* Neutral */
  --color-neutral:         #64748B;
  --color-neutral-subtle:  #F1F5F9;
  --color-neutral-label:   #334155;

  /* Inputs */
  --color-input-bg:            #FFFFFF;
  --color-input-border:        #CBD5E1;
  --color-input-border-hover:  #94A3B8;
  --color-input-border-focus:  #3366CC;
  --color-input-placeholder:   #94A3B8;

  /* Table */
  --color-table-header-bg:    #F8FAFC;
  --color-table-row-bg:       #FFFFFF;
  --color-table-row-hover:    #F1F5F9;
  --color-table-row-selected: #EEF3FC;
  --color-table-border:       #E2E8F0;

  /* Tooltip */
  --color-tooltip-bg:   #1E293B;
  --color-tooltip-text: #F8FAFC;

  /* Charts */
  --chart-color-1: #3366CC;
  --chart-color-2: #149E65;
  --chart-color-3: #F4A100;
  --chart-color-4: #E94F37;
  --chart-color-5: #7B61FF;
  --chart-color-6: #00B4D8;
  --chart-color-muted: #CBD5E1;

  /* KPI trends */
  --color-kpi-positive: #149E65;
  --color-kpi-negative: #E94F37;
  --color-kpi-neutral:  #64748B;

  /* Shadows */
  --shadow-card: 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04);
  --shadow-sm:   0 2px 6px rgba(15,23,42,0.07);
  --shadow-md:   0 4px 12px rgba(15,23,42,0.10);
  --shadow-lg:   0 8px 24px rgba(15,23,42,0.14);
  --shadow-xl:   0 12px 32px rgba(15,23,42,0.18);
}
```

### Dark Theme (`[data-theme="dark"]`)

```css
[data-theme="dark"] {
  --color-page-bg:           #0B0F1A;
  --color-surface:           #111827;
  --color-surface-raised:    #1C2536;

  --color-sidebar-bg:             #0D1321;
  --color-sidebar-item-default:   rgba(255,255,255,0.45);
  --color-sidebar-item-hover:     rgba(255,255,255,0.07);
  --color-sidebar-item-active-bg: rgba(51,102,204,0.22);
  --color-sidebar-item-active:    #FFFFFF;
  --color-sidebar-border:         rgba(255,255,255,0.06);
  --color-sidebar-logo:           #FFFFFF;

  --color-header-bg:     #111827;
  --color-header-border: #1E293B;

  --color-text-primary:   #F1F5F9;
  --color-text-secondary: #94A3B8;
  --color-text-tertiary:  #475569;
  --color-text-disabled:  #334155;
  --color-text-inverse:   #0F172A;
  --color-text-link:      #6699FF;

  --color-icon-default:   #94A3B8;
  --color-icon-secondary: #475569;
  --color-icon-hover:     #F1F5F9;
  --color-icon-disabled:  #334155;

  --color-border:        #1E293B;
  --color-border-strong: #334155;
  --color-border-focus:  #6699FF;

  --color-primary:         #4D7FE8;
  --color-primary-hover:   #6699FF;
  --color-primary-pressed: #99BBFF;
  --color-primary-subtle:  #1E2D4A;
  --color-primary-text:    #FFFFFF;

  --color-success:        #22C882;
  --color-success-subtle: #0D2B1F;
  --color-success-label:  #4ADE80;
  --color-success-text:   #FFFFFF;

  --color-warning:        #FFC233;
  --color-warning-subtle: #2A1F00;
  --color-warning-label:  #FCD34D;
  --color-warning-text:   #0F172A;

  --color-error:          #F87171;
  --color-error-hover:    #EF4444;
  --color-error-subtle:   #2D1010;
  --color-error-label:    #FCA5A5;
  --color-error-text:     #FFFFFF;

  --color-info:           #38BDF8;
  --color-info-subtle:    #0C2337;
  --color-info-label:     #7DD3FC;
  --color-info-text:      #0F172A;

  --color-neutral:        #94A3B8;
  --color-neutral-subtle: #1E293B;
  --color-neutral-label:  #CBD5E1;

  --color-input-bg:           #1C2536;
  --color-input-border:       #334155;
  --color-input-border-hover: #475569;
  --color-input-border-focus: #6699FF;
  --color-input-placeholder:  #475569;

  --color-table-header-bg:    #161F2E;
  --color-table-row-bg:       #111827;
  --color-table-row-hover:    #1C2536;
  --color-table-row-selected: #1E2D4A;
  --color-table-border:       #1E293B;

  --color-tooltip-bg:   #0D1321;
  --color-tooltip-text: #F1F5F9;

  --chart-color-1: #4D7FE8;
  --chart-color-2: #22C882;
  --chart-color-3: #FFC233;
  --chart-color-4: #F87171;
  --chart-color-5: #A78BFA;
  --chart-color-6: #22D3EE;
  --chart-color-muted: #334155;

  --color-kpi-positive: #22C882;
  --color-kpi-negative: #F87171;
  --color-kpi-neutral:  #94A3B8;

  --shadow-card: 0 1px 3px rgba(0,0,0,0.28);
  --shadow-sm:   0 2px 6px rgba(0,0,0,0.30);
  --shadow-md:   0 4px 12px rgba(0,0,0,0.40);
  --shadow-lg:   0 8px 24px rgba(0,0,0,0.50);
  --shadow-xl:   0 12px 32px rgba(0,0,0,0.60);
}
```

### Color Decision Tree

- **Page/section background** → `--color-page-bg`, cards → `--color-surface`
- **Body text** → `--color-text-primary`, labels/metadata → `--color-text-secondary`
- **Status: on-time, confirmed** → `success` tokens
- **Status: at-risk, pending, delayed** → `warning` tokens
- **Status: overdue, critical, error** → `error` tokens
- **Status: in transit, informational** → `info` tokens
- **Status: draft, unknown, neutral** → `neutral` tokens
- **Subtle badge background** → use `-subtle` variant (e.g. `--color-error-subtle`)
- **Badge text on subtle background** → use `-label` variant (e.g. `--color-error-label`)
- **Button text on solid coloured background** → use `-text` variant

---

## DESIGN TOKENS — TYPOGRAPHY

Font: **Inter** only. Import: `https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap`

```css
:root {
  --text-heading-xl-size:    24px; --text-heading-xl-weight:    700; --text-heading-xl-ls:    -0.3px;
  --text-heading-large-size: 20px; --text-heading-large-weight: 700; --text-heading-large-ls: -0.2px;
  --text-heading-medium-size:16px; --text-heading-medium-weight:600; --text-heading-medium-ls:-0.1px;
  --text-heading-small-size: 14px; --text-heading-small-weight: 600;

  --text-body-large-size:    16px; --text-body-large-weight:  400; --text-body-large-lh:   1.6;
  --text-body-medium-size:   14px; --text-body-medium-weight: 400; --text-body-medium-lh:  1.55;
  --text-body-small-size:    12px; --text-body-small-weight:  400; --text-body-small-lh:   1.5;

  --text-label-size:   11px; --text-label-weight: 600; --text-label-ls: 0.6px;
}
```

**Usage rules:**
- Page title → 20px / 700
- Section heading → 16px / 600
- Table column header → 11px / 600 / uppercase / 0.6px letter-spacing / `--color-text-secondary`
- Table cell content → 14px / 400 / `--color-text-primary`
- KPI value → 28px / 700 / letter-spacing -0.5px
- KPI label → 12px / 500 / uppercase / `--color-text-secondary`
- Form label → 12px / 500 / `--color-text-primary`
- Helper / validation text → 12px / 400 / `--color-text-tertiary` (or `--color-error-label`)
- Chart axis ticks → 12px / 400 / `fill: var(--color-text-secondary)`
- Allowed weights: **400, 500, 600, 700 only**
- All numeric columns use `font-variant-numeric: tabular-nums`

---

## DESIGN TOKENS — SPACING, RADIUS & DIMENSIONS

```css
:root {
  --space-1:4px; --space-2:8px; --space-3:12px; --space-4:16px;
  --space-5:20px; --space-6:24px; --space-8:32px; --space-10:40px;
  --space-12:48px; --space-16:64px;

  --radius-sm:4px; --radius-md:6px; --radius-lg:8px; --radius-xl:12px; --radius-full:9999px;

  --sidebar-width-expanded:240px; --sidebar-width-collapsed:56px; --header-height:56px;
  --table-row-height:44px; --table-header-height:40px;
  --input-height-md:36px; --input-height-sm:28px;
  --button-height-md:36px; --button-height-sm:28px; --button-height-lg:44px;
  --chart-panel-min-height:260px;
  --modal-width-sm:400px; --modal-width-md:560px; --modal-width-lg:720px;
  --drawer-width:480px;

  --z-dropdown:100; --z-sticky:200; --z-overlay:290; --z-modal:300; --z-toast:400; --z-tooltip:500;

  --transition-fast:100ms ease; --transition-base:150ms ease;
  --transition-slow:250ms ease-in-out; --transition-layout:200ms ease-in-out;
}
```

**Spacing rules:**
- Content area padding: `--space-6` (24px) all sides
- Between KPI cards: `--space-4` (16px)
- Between chart panels: `--space-4` (16px)
- Between form fields: `--space-4` (16px)
- Between form sections: `--space-8` (32px)
- Table cell padding: `0 --space-4` (0 16px)
- Card internal padding: `--space-4` to `--space-6`

**Radius rules:**
- Buttons, inputs: `--radius-md` (6px)
- Status badges, filter pills, avatars: `--radius-full`
- KPI cards: `--radius-xl` (12px)
- Chart panels, modals, table containers: `--radius-lg` (8px)

---

## ICONS

Use **Lucide React** (`import { ... } from 'lucide-react'`). Default `strokeWidth={1.5}`. Never modify strokeWidth.

| Concept | Icon |
|---------|------|
| Dashboard | `LayoutDashboard` |
| Demand/Forecast | `TrendingUp` |
| Inventory | `Package` |
| Purchase Order | `FileText` |
| Shipment/ASN | `Truck` |
| Supplier | `Building2` |
| BOM/Parts | `Layers` |
| Analytics | `BarChart3` |
| Alert | `AlertTriangle` |
| Critical Alert | `AlertOctagon` |
| Plant/Factory | `Factory` |
| Notifications | `Bell` |
| Filter | `Filter` |
| Search | `Search` |
| Export | `Download` |
| Upload/Import | `Upload` |
| Edit | `Pencil` |
| Delete | `Trash2` |
| View | `Eye` |
| Add/New | `Plus` |
| More actions | `MoreHorizontal` |
| Success | `CheckCircle2` |
| Warning | `AlertTriangle` |
| Error | `XCircle` |
| Loading | `Loader2` (with `animate-spin`) |
| Sidebar collapse | `PanelLeftClose` |
| Theme: Light | `Sun` |
| Theme: Dark | `Moon` |

**Icon sizes:** Sidebar nav: 20px · Buttons: 16px · Table row actions: 16px · KPI cards: 20px · Empty states: 32–40px  
**Icon colours:** Default → `--color-icon-default` · Secondary → `--color-icon-secondary` · Status → match status colour  
**Rule:** Icon-only buttons MUST have `aria-label`. Always pair icons with visible text in navigation.

---

## COMPONENT: SIDEBAR NAV

```css
.sidebar {
  width: var(--sidebar-width-expanded);
  height: 100vh;
  position: fixed; left: 0; top: 0;
  background: var(--color-sidebar-bg);
  border-right: 1px solid var(--color-sidebar-border);
  display: flex; flex-direction: column;
  transition: width var(--transition-layout);
  overflow: hidden;
  z-index: 10;
}
.sidebar.collapsed { width: var(--sidebar-width-collapsed); }

/* Logo area */
.sidebar-logo-area {
  height: var(--header-height);
  padding: 0 var(--space-4);
  display: flex; align-items: center; gap: var(--space-3);
  border-bottom: 1px solid var(--color-sidebar-border);
  flex-shrink: 0;
}
.sidebar-logo-mark {
  width: 28px; height: 28px;
  background: var(--color-primary);
  border-radius: var(--radius-md);
  display: flex; align-items: center; justify-content: center;
  flex-shrink: 0;
}
.sidebar-logo-text {
  font-size: 15px; font-weight: 700;
  color: var(--color-sidebar-logo);
  white-space: nowrap;
}

/* Nav items */
.sidebar-nav { flex: 1; padding: var(--space-3) var(--space-2); display: flex; flex-direction: column; gap: 2px; overflow-y: auto; }

.sidebar-item {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-2) var(--space-3); height: 40px;
  border-radius: var(--radius-md);
  color: var(--color-sidebar-item-default);
  cursor: pointer; white-space: nowrap;
  text-decoration: none; position: relative;
  transition: background var(--transition-fast), color var(--transition-fast);
}
.sidebar-item:hover { background: var(--color-sidebar-item-hover); color: var(--color-sidebar-logo); }
.sidebar-item.active {
  background: var(--color-sidebar-item-active-bg);
  color: var(--color-sidebar-item-active);
}
.sidebar-item.active::before {
  content: ''; position: absolute; left: 0; top: 6px; bottom: 6px;
  width: 3px; background: var(--color-primary); border-radius: 0 2px 2px 0;
}
.sidebar-item-label { font-size: 14px; font-weight: 500; flex: 1; transition: opacity var(--transition-base); }
.sidebar.collapsed .sidebar-item-label { opacity: 0; pointer-events: none; width: 0; overflow: hidden; }
.sidebar.collapsed .sidebar-item { justify-content: center; padding: var(--space-2); }
.sidebar.collapsed .sidebar-logo-text { opacity: 0; width: 0; overflow: hidden; }
.sidebar.collapsed .sidebar-logo-area { justify-content: center; padding: 0; }

/* Alert count badge */
.sidebar-badge {
  background: var(--color-error); color: white;
  font-size: 11px; font-weight: 600; min-width: 18px; height: 18px;
  border-radius: var(--radius-full);
  display: flex; align-items: center; justify-content: center; padding: 0 5px;
}

/* Divider */
.sidebar-divider { height: 1px; background: var(--color-sidebar-border); margin: var(--space-2); flex-shrink: 0; }

/* Bottom: theme toggle + collapse */
.sidebar-bottom { padding: var(--space-2); display: flex; flex-direction: column; gap: 2px; flex-shrink: 0; }

/* Tooltip (collapsed mode only) */
.sidebar-tooltip {
  position: absolute; left: calc(var(--sidebar-width-collapsed) + var(--space-2));
  background: var(--color-tooltip-bg); color: var(--color-tooltip-text);
  font-size: 12px; font-weight: 500; padding: 4px 8px;
  border-radius: var(--radius-sm); white-space: nowrap;
  opacity: 0; pointer-events: none; z-index: var(--z-tooltip);
  transition: opacity var(--transition-base);
}
.sidebar.collapsed .sidebar-item:hover .sidebar-tooltip { opacity: 1; }
```

**Navigation modules (in order):** Dashboard · Demand Planning · Inventory · Purchase Orders · Shipments & ASN · Suppliers · BOM / Parts · Analytics · Alerts *(badge)* · — divider — · Settings · Help · — theme toggle · collapse button

**Content area offset:**
```css
.app-content { margin-left: var(--sidebar-width-expanded); transition: margin-left var(--transition-layout); }
.app-content.collapsed { margin-left: var(--sidebar-width-collapsed); }
.app-header { position: fixed; left: var(--sidebar-width-expanded); right: 0; top: 0; transition: left var(--transition-layout); }
.app-header.collapsed { left: var(--sidebar-width-collapsed); }
```

---

## COMPONENT: TOP HEADER

```css
.app-header {
  height: var(--header-height);
  background: var(--color-header-bg);
  border-bottom: 1px solid var(--color-header-border);
  display: flex; align-items: center;
  padding: 0 var(--space-6);
  gap: var(--space-4);
  box-shadow: var(--shadow-sm);
  z-index: var(--z-sticky);
}
.header-title { font-size: 16px; font-weight: 600; color: var(--color-text-primary); }
.header-spacer { flex: 1; }
/* Right side: context filters (Plant, Date), notification bell, user avatar */
```

---

## COMPONENT: BUTTON

**Variants:** `primary` · `secondary` · `ghost` · `danger` · `ghost-danger`

```css
.btn {
  display: inline-flex; align-items: center; gap: var(--space-2);
  height: var(--button-height-md); padding: 0 var(--space-4);
  border-radius: var(--radius-md);
  font-size: 14px; font-weight: 500; font-family: 'Inter', sans-serif;
  border: 1px solid transparent; cursor: pointer; white-space: nowrap;
  transition: background var(--transition-fast), box-shadow var(--transition-fast);
}
.btn-sm { height: var(--button-height-sm); padding: 0 10px; font-size: 12px; }
.btn-lg { height: var(--button-height-lg); padding: 0 var(--space-5); font-size: 15px; }

.btn-primary  { background: var(--color-primary); color: var(--color-primary-text); border-color: var(--color-primary); }
.btn-primary:hover { background: var(--color-primary-hover); }

.btn-secondary { background: var(--color-surface); color: var(--color-text-primary); border-color: var(--color-border-strong); }
.btn-secondary:hover { background: var(--color-neutral-subtle); }

.btn-ghost { background: transparent; color: var(--color-text-primary); border-color: transparent; }
.btn-ghost:hover { background: var(--color-neutral-subtle); }

.btn-danger { background: var(--color-error); color: var(--color-error-text); border-color: var(--color-error); }
.btn-danger:hover { background: var(--color-error-hover); }

.btn:disabled { background: var(--color-neutral-subtle); color: var(--color-text-disabled); border-color: var(--color-border); cursor: not-allowed; }
```

**Decision tree:**
- Main action on page/section → `primary` (only ONE per section)
- Destructive (delete/reject) → `danger` (always confirm with modal)
- Supporting/secondary → `secondary` (has border)
- Cancel/back/low emphasis → `ghost`

**Rules:** Use action verbs ("Create PO", "Export CSV"). Icons left of label at 16px. Loading state: replace label with `<Loader2 size={16} className="animate-spin" />`. Destructive actions always show confirmation modal before executing.

---

## COMPONENT: STATUS BADGE

```css
.status-badge {
  display: inline-flex; align-items: center; gap: 6px;
  height: 20px; padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: 12px; font-weight: 500; white-space: nowrap;
}
.status-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }

/* Critical statuses: dot pulses */
@keyframes status-pulse {
  0%,100% { opacity:1; transform:scale(1); }
  50% { opacity:0.5; transform:scale(1.4); }
}
.status-dot.pulse { animation: status-pulse 1.8s ease-in-out infinite; }
```

**Apply colour using `-subtle` background + `-label` text + raw colour for dot:**

### Purchase Order Statuses
| Status | Label | Semantic |
|--------|-------|---------|
| `draft` | Draft | neutral |
| `pending_approval` | Pending Approval | info |
| `approved` | Approved | primary |
| `in_progress` | In Progress | info |
| `shipped` | Shipped | primary |
| `delivered` | Delivered | success |
| `overdue` | Overdue *(pulse dot)* | error |
| `on_hold` | On Hold | warning |
| `cancelled` | Cancelled | neutral |

### Shipment / ASN Statuses
| Status | Label | Semantic |
|--------|-------|---------|
| `in_transit` | In Transit | info |
| `at_customs` | At Customs | warning |
| `out_for_delivery` | Out for Delivery | primary |
| `delivered` | Delivered | success |
| `delayed` | Delayed *(pulse dot)* | warning |
| `exception` | Exception *(pulse dot)* | error |

### Inventory Statuses
`healthy` → success · `low_stock` → warning · `critical` → error *(pulse)* · `out_of_stock` → error *(pulse)* · `excess` → info · `on_order` → info

### Supplier Statuses
`active` → success · `probation` → warning · `suspended` → error · `inactive` → neutral · `onboarding` → info

**Rules:** Never use colour alone — always show text label. Never truncate a badge. One badge per table cell — show the most critical one.

---

## COMPONENT: KPI CARD

```css
.kpi-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xl);
  padding: var(--space-6);
  box-shadow: var(--shadow-sm);
  display: flex; flex-direction: column; gap: var(--space-2);
  flex: 1; min-width: 0;
}
.kpi-label {
  display: flex; align-items: center; gap: var(--space-2);
  font-size: 12px; font-weight: 500;
  color: var(--color-text-secondary);
  text-transform: uppercase; letter-spacing: 0.4px;
}
.kpi-value {
  font-size: 28px; font-weight: 700; letter-spacing: -0.5px;
  color: var(--color-text-primary);
  font-variant-numeric: tabular-nums; line-height: 1.1;
}
.kpi-trend { display: flex; align-items: center; gap: var(--space-1); font-size: 12px; font-weight: 500; }
.kpi-trend.positive { color: var(--color-kpi-positive); }
.kpi-trend.negative { color: var(--color-kpi-negative); }
.kpi-trend-context { color: var(--color-text-tertiary); font-weight: 400; }

/* Status accent variants */
.kpi-card.warning { border-left: 3px solid var(--color-warning); }
.kpi-card.error   { border-left: 3px solid var(--color-error); }
.kpi-card.success { border-left: 3px solid var(--color-success); }

/* Row layout */
.kpi-row { display: flex; gap: var(--space-4); margin-bottom: var(--space-4); }
```

**Rules:** Max 5 KPI cards per page. Always show unit suffix (%, days, $). Trend direction ≠ sentiment — "8 Overdue ↑ +3" is still `negative` colour.

---

## COMPONENT: FILTER BAR

```css
.filter-bar {
  display: flex; align-items: center; gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  margin-bottom: var(--space-4);
  flex-wrap: wrap;
}
.filter-bar.sticky {
  position: sticky; top: var(--header-height);
  z-index: var(--z-sticky); box-shadow: var(--shadow-sm);
}

/* Search input */
.filter-search {
  display: flex; align-items: center; gap: var(--space-2);
  padding: 0 var(--space-3); height: var(--input-height-md);
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border);
  border-radius: var(--radius-md); min-width: 220px;
  transition: border-color var(--transition-fast);
}
.filter-search:focus-within {
  border-color: var(--color-input-border-focus);
  box-shadow: 0 0 0 3px var(--color-primary-subtle);
}

/* Filter dropdown trigger */
.filter-select {
  height: var(--input-height-md); padding: 0 var(--space-3);
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border);
  border-radius: var(--radius-md);
  font-size: 14px; color: var(--color-text-primary);
  display: flex; align-items: center; gap: var(--space-2);
  cursor: pointer; white-space: nowrap;
}
.filter-select.active {
  border-color: var(--color-primary);
  background: var(--color-primary-subtle);
  color: var(--color-primary);
}

/* Active filter pill */
.filter-pill {
  display: inline-flex; align-items: center; gap: var(--space-1);
  height: 24px; padding: 0 var(--space-2) 0 var(--space-3);
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-primary);
  border-radius: var(--radius-full);
  font-size: 12px; font-weight: 500; color: var(--color-primary);
}
```

**Always visible** — never hidden behind a toggle. Always includes: Search input · Plant (multi-select) · Supplier (multi-select with search) · Status (multi-select) · Date Range. "Clear All" ghost button appears only when ≥1 filter is active.

---

## COMPONENT: TABLE

Tables are the primary interaction surface. Always include sorting, filters, search, pagination, status badges, and row actions.

```css
.table-container {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  overflow-x: auto;           /* horizontal scroll for wide tables — always enabled */
  -webkit-overflow-scrolling: touch;
}

.table { width: 100%; border-collapse: collapse; min-width: 800px; }

/* Column header */
.table th {
  height: var(--table-header-height);
  background: var(--color-table-header-bg);
  border-bottom: 1px solid var(--color-table-border);
  padding: 0 var(--space-4);
  font-size: 11px; font-weight: 600;
  letter-spacing: 0.6px; text-transform: uppercase;
  color: var(--color-text-secondary);
  white-space: nowrap; text-align: left;
}

/* Row */
.table tr { height: var(--table-row-height); cursor: pointer; transition: background var(--transition-fast); }
.table td { padding: 0 var(--space-4); font-size: 14px; color: var(--color-text-primary); border-bottom: 1px solid var(--color-table-border); }
.table tr:hover td { background: var(--color-table-row-hover); }
.table tr.selected td { background: var(--color-table-row-selected); }

/* Numeric cells */
.table td.numeric { text-align: right; font-variant-numeric: tabular-nums; }

/* Truncated text */
.table td.truncate { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* Row actions (last column, visible on hover) */
.table td.row-actions { width: 80px; text-align: right; }
.table tr td.row-actions .actions-wrap { opacity: 0; transition: opacity var(--transition-fast); display: flex; align-items: center; justify-content: flex-end; gap: 4px; }
.table tr:hover td.row-actions .actions-wrap { opacity: 1; }

/* Pagination */
.table-pagination {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-3) var(--space-4);
  border-top: 1px solid var(--color-table-border);
  font-size: 13px; color: var(--color-text-secondary);
}

/* Bulk action bar (shown when rows selected) */
.bulk-action-bar {
  display: flex; align-items: center; gap: var(--space-3);
  height: 44px; padding: 0 var(--space-4);
  background: var(--color-primary-subtle);
  border: 1px solid var(--color-border-focus);
  border-radius: var(--radius-md);
  margin-bottom: var(--space-2);
  font-size: 14px; font-weight: 500; color: var(--color-primary);
}
```

**Clicking a row always navigates to the detail view — non-negotiable.**  
**If the table has >6 columns, enable horizontal scroll — never hide columns.**  
Row actions: View (Eye) + More (MoreHorizontal dropdown). Destructive actions inside More dropdown only.  
Pagination default: 25 per page. Options: 10, 25, 50, 100.

### Standard Column Sets

**Purchase Orders:** ☐ · PO Number (link) · Supplier · Plant · Order Date · Expected Date · Total Value (right) · Line Items (right) · Status badge · Actions  
**Shipments/ASN:** ☐ · ASN ID (link) · PO Ref · Carrier · Origin · Destination Plant · Ship Date · ETA · Status badge · Actions  
**Inventory:** ☐ · SKU (monospace) · Part Description (truncate) · Plant · On Hand (right) · Safety Stock (right) · Days of Cover · Last Updated · Status badge · Actions  
**Suppliers:** ☐ · Supplier Name · Tier · Country · Category · OTIF % (right) · Active POs (right) · Last Delivery · Status badge · Actions

---

## COMPONENT: CHART PANEL

All charts use **Recharts**. Always wrap in a `ChartPanel` container. Never render bare charts.

```css
.chart-panel {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-card);
  padding: var(--space-6);
  display: flex; flex-direction: column; gap: var(--space-4);
}
.chart-panel-header {
  display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-4);
}
.chart-panel-title { font-size: 15px; font-weight: 600; color: var(--color-text-primary); }
.chart-panel-subtitle { font-size: 12px; color: var(--color-text-secondary); margin-top: 2px; }

/* Period selector (7D / 30D / 3M / 12M) */
.chart-period-selector {
  display: flex; background: var(--color-neutral-subtle);
  border-radius: var(--radius-md); padding: 2px; gap: 2px;
}
.chart-period-option { padding: 3px 10px; border-radius: var(--radius-sm); font-size: 12px; font-weight: 500; color: var(--color-text-secondary); cursor: pointer; }
.chart-period-option.active { background: var(--color-surface); color: var(--color-text-primary); box-shadow: var(--shadow-sm); }
```

**Chart heights:** Line/Bar/Area → 260px · Horizontal bar → 300px · Donut → 220px · Wide full-row → 300px · Dashboard mini → 180px  
Always use `<ResponsiveContainer width="100%" height={260}>` with a fixed pixel height.

```tsx
// Always use this Recharts base pattern
import { LineChart, Line, BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
         XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts'

// CartesianGrid — always include
<CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />

// Axis ticks — always style
<XAxis dataKey="week" tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />
<YAxis tick={{ fill: 'var(--color-text-secondary)', fontSize: 12 }} axisLine={false} tickLine={false} />

// Legend — always bottom
<Legend iconType="circle" wrapperStyle={{ paddingTop: 16, fontSize: 13 }} />

// Tooltip — always use this custom style
const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:'var(--radius-md)', padding:'10px 14px', boxShadow:'var(--shadow-md)', fontSize:13 }}>
      <p style={{ color:'var(--color-text-secondary)', fontWeight:500, marginBottom:6 }}>{label}</p>
      {payload.map((e,i) => (
        <div key={i} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:2 }}>
          <span style={{ width:8,height:8,borderRadius:'50%',background:e.color }} />
          <span style={{ color:'var(--color-text-primary)', fontWeight:500 }}>{e.name}: {e.value}</span>
        </div>
      ))}
    </div>
  );
};

// Line chart — forecasts vs actuals
<Line type="monotone" dataKey="actual"   stroke="var(--chart-color-2)" strokeWidth={2} dot={false} />
<Line type="monotone" dataKey="forecast" stroke="var(--chart-color-3)" strokeWidth={2} strokeDasharray="5 5" dot={false} />
<ReferenceLine y={target} stroke="var(--chart-color-4)" strokeDasharray="4 4" />

// Area chart — inventory levels (use gradient fill)
<defs>
  <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
    <stop offset="5%"  stopColor="var(--chart-color-1)" stopOpacity={0.2} />
    <stop offset="95%" stopColor="var(--chart-color-1)" stopOpacity={0} />
  </linearGradient>
</defs>
<Area type="monotone" dataKey="stock" stroke="var(--chart-color-1)" fill="url(#areaFill)" strokeWidth={2} />

// Bar chart — bar radius always [4,4,0,0]
<Bar dataKey="otif" fill="var(--chart-color-1)" radius={[4,4,0,0]} />

// Horizontal bar — supplier rankings
<BarChart layout="vertical" data={data}>
  <XAxis type="number" tick={{ fill:'var(--color-text-secondary)', fontSize:12 }} />
  <YAxis type="category" dataKey="supplier" width={140} tick={{ fontSize:12 }} />
  <Bar dataKey="otd" fill="var(--chart-color-1)" radius={[0,4,4,0]} />
</BarChart>

// Donut chart — always use donut (innerRadius), max 5 slices
<PieChart>
  <Pie data={data} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3}>
    {data.map((_, i) => <Cell key={i} fill={[`var(--chart-color-1)`,`var(--chart-color-2)`,`var(--chart-color-3)`,`var(--chart-color-4)`,`var(--chart-color-5)`][i]} />)}
  </Pie>
</PieChart>
```

**Chart colour order (use in sequence):** chart-color-1 (blue) → chart-color-2 (green) → chart-color-3 (amber) → chart-color-4 (red) → chart-color-5 (purple) → chart-color-6 (cyan)

**Chart layout patterns:**
- Two charts side by side: `display:grid; grid-template-columns:1fr 1fr; gap:16px`
- One wide chart: `grid-template-columns:1fr`
- Three equal charts: `grid-template-columns:1fr 1fr 1fr; gap:16px`

**Common AutoChain charts:**

| Title | Type | X | Y | Series |
|-------|------|---|---|--------|
| OTD Trend | Line | Week | % | Actual, Target (ref line) |
| Demand Forecast vs Actual | Line | Month | Units | Forecast (dashed), Actual |
| Inventory by Plant | Bar | Plant | Days of Stock | Safety Stock, Current |
| Supplier OTIF Ranking | Horiz Bar | OTIF % | Supplier Name | OTIF |
| PO Status Distribution | Donut | — | — | Open, In Transit, Delivered, Overdue |
| Lead Time Trend | Area | Month | Days | Avg Lead Time |
| Exceptions by Category | Bar | Category | Count | Critical, Warning |

---

## COMPONENT: FORM & INPUTS

```css
/* Text Input */
.input {
  height: var(--input-height-md); padding: 0 var(--space-3);
  background: var(--color-input-bg);
  border: 1px solid var(--color-input-border);
  border-radius: var(--radius-md);
  font-size: 14px; color: var(--color-text-primary);
  width: 100%; font-family: 'Inter', sans-serif;
  transition: border-color var(--transition-fast), box-shadow var(--transition-fast);
}
.input::placeholder { color: var(--color-input-placeholder); }
.input:hover  { border-color: var(--color-input-border-hover); }
.input:focus  { outline:none; border-color: var(--color-input-border-focus); box-shadow: 0 0 0 3px var(--color-primary-subtle); }
.input.error  { border-color: var(--color-error); box-shadow: 0 0 0 3px var(--color-error-subtle); }
.input:disabled { background: var(--color-neutral-subtle); color: var(--color-text-disabled); cursor: not-allowed; }

/* Form field wrapper */
.form-field { display: flex; flex-direction: column; gap: var(--space-1); }
.form-label  { font-size: 12px; font-weight: 500; color: var(--color-text-primary); }
.form-label .required { color: var(--color-error); margin-left: 2px; }
.helper-text { font-size: 12px; color: var(--color-text-tertiary); }
.error-text  { font-size: 12px; color: var(--color-error-label); display: flex; align-items: center; gap: 4px; }

/* Form section */
.form-section { display: flex; flex-direction: column; gap: var(--space-4); margin-bottom: var(--space-8); }
.form-section-title {
  font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
  color: var(--color-text-secondary);
  padding-bottom: var(--space-3); border-bottom: 1px solid var(--color-border);
}

/* Two-column grid */
.form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4); }
.form-grid-2 .full-width { grid-column: 1 / -1; }

/* Textarea */
.textarea { height: auto; min-height: 80px; padding: var(--space-2) var(--space-3); resize: vertical; }

/* Inline table input (for line items form) */
.table-input {
  height: 32px; width: 100%; border: 1px solid transparent;
  background: transparent; font-size: 14px; color: var(--color-text-primary);
  padding: 0 var(--space-2); border-radius: var(--radius-sm);
}
.table-input:focus { border-color: var(--color-primary); background: var(--color-input-bg); outline: none; }
```

**Form layout decision:**
- ≤5 fields, simple → single column
- Multi-section, complex → two-column grid (`form-grid-2`)
- Multi-step process → Stepper layout
- Repetitive rows (line items) → editable table form

**Stepper component (multi-step forms):**

```tsx
// Step indicator: complete (success bg), active (primary bg), pending (neutral bg + border)
// Connector line: complete → --color-success, pending → --color-border
// Use for: New PO wizard, Supplier onboarding, Bulk import
```

---

## COMPONENT: MODAL & DRAWER

```css
/* Overlay */
.modal-overlay {
  position: fixed; inset: 0; z-index: var(--z-overlay);
  background: rgba(15,23,42,0.5); backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
}
[data-theme="dark"] .modal-overlay { background: rgba(0,0,0,0.65); }

/* Modal */
.modal {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  width: var(--modal-width-md); max-height: 90vh;
  display: flex; flex-direction: column;
  animation: modal-in 0.2s ease-out;
}
@keyframes modal-in { from { opacity:0; transform:scale(0.97) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }

.modal-header {
  display: flex; align-items: center; justify-content: space-between;
  padding: var(--space-6); border-bottom: 1px solid var(--color-border);
  font-size: 16px; font-weight: 600; color: var(--color-text-primary); flex-shrink: 0;
}
.modal-body { padding: var(--space-6); overflow-y: auto; flex: 1; }
.modal-footer {
  display: flex; align-items: center; justify-content: flex-end; gap: var(--space-3);
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-border);
  background: var(--color-neutral-subtle);
  border-radius: 0 0 var(--radius-lg) var(--radius-lg); flex-shrink: 0;
}

/* Drawer */
.drawer {
  position: fixed; top: 0; right: 0; height: 100vh;
  width: var(--drawer-width);
  background: var(--color-surface);
  border-left: 1px solid var(--color-border);
  box-shadow: var(--shadow-lg); z-index: var(--z-drawer);
  display: flex; flex-direction: column;
  animation: drawer-in 0.25s ease-out;
}
@keyframes drawer-in { from { transform:translateX(100%); } to { transform:translateX(0); } }
.drawer-header { display:flex; align-items:center; justify-content:space-between; padding: var(--space-4) var(--space-6); border-bottom: 1px solid var(--color-border); flex-shrink:0; }
.drawer-body   { flex:1; overflow-y:auto; padding: var(--space-6); }
.drawer-footer { border-top:1px solid var(--color-border); padding: var(--space-4) var(--space-6); display:flex; justify-content:flex-end; gap: var(--space-3); flex-shrink:0; }
```

**Use Modal for:** Confirmations · Short forms (3–6 fields) · Upload flow steps  
**Use Drawer for:** Full record detail/editing · Complex side panels  
**Destructive confirmation pattern:** Show an error Alert inside modal body + "Cancel" (ghost) and "Delete X" (danger) in footer. Never execute destructive actions without this modal.

---

## COMPONENT: ALERT & TOAST

```css
/* Inline Alert */
.alert {
  display: flex; gap: var(--space-3); padding: var(--space-4);
  border-radius: var(--radius-md); border: 1px solid; font-size: 14px;
}
.alert.error   { background: var(--color-error-subtle);   border-color: var(--color-error);   color: var(--color-error-label); }
.alert.warning { background: var(--color-warning-subtle); border-color: var(--color-warning); color: var(--color-warning-label); }
.alert.info    { background: var(--color-info-subtle);    border-color: var(--color-info);    color: var(--color-info-label); }
.alert.success { background: var(--color-success-subtle); border-color: var(--color-success); color: var(--color-success-label); }
.alert-title   { font-weight: 600; margin-bottom: 2px; }

/* Toast (bottom-right, auto-dismiss 4s) */
.toast-container { position:fixed; bottom:var(--space-6); right:var(--space-6); z-index:var(--z-toast); display:flex; flex-direction:column; gap:var(--space-2); max-width:360px; }
.toast {
  display:flex; align-items:flex-start; gap:var(--space-3);
  padding:var(--space-4);
  background:var(--color-surface); border:1px solid var(--color-border);
  border-radius:var(--radius-md); box-shadow:var(--shadow-xl);
  animation: toast-in 0.25s ease-out;
}
@keyframes toast-in { from{opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);} }
.toast.success { border-left: 3px solid var(--color-success); }
.toast.warning { border-left: 3px solid var(--color-warning); }
.toast.error   { border-left: 3px solid var(--color-error); }
.toast.info    { border-left: 3px solid var(--color-info); }
```

**Alert icons:** error → `AlertOctagon` · warning → `AlertTriangle` · info → `Info` · success → `CheckCircle2`

**Alert Panel** (Alerts module / Dashboard): Card with list of exception rows. Each row: severity dot + message text + ChevronRight (links to affected record). Row hover shows `--color-table-row-hover`.

---

## COMPONENT: UPLOAD FLOW

4-step process — always implement all steps:

**Step 1 — Upload Zone:**
```css
.upload-zone {
  border: 2px dashed var(--color-border-strong);
  border-radius: var(--radius-lg); padding: var(--space-12);
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: var(--space-3); cursor: pointer; text-align: center;
  background: var(--color-neutral-subtle); min-height: 220px;
  transition: border-color var(--transition-fast), background var(--transition-fast);
}
.upload-zone:hover, .upload-zone.drag-over {
  border-color: var(--color-primary); background: var(--color-primary-subtle);
}
```

**Step 2 — Validating:** Show file name + animated progress bar (`--color-primary` fill on `--color-neutral-subtle` track, height 6px, `border-radius: --radius-full`).

**Step 3 — Validation Results:** If errors found, show an error/warning Alert + an errors table (Row · Column · Error Message). Show count of valid vs invalid records. Actions: "Cancel" (ghost) + "Import Valid Records (N)" (primary).

**Step 4 — Confirm:** Success Alert + import summary (N imported, N skipped). Actions: "View Import Log" (ghost) + "Go to [Module] →" (primary).

Always provide a "Download CSV Template" ghost button above the upload zone.

---

## COMPONENT: EMPTY & LOADING STATES

Every data surface must handle all four states.

```css
/* Skeleton */
@keyframes skeleton-pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
.skeleton { background: var(--color-neutral-subtle); border-radius: var(--radius-sm); animation: skeleton-pulse 1.5s ease-in-out infinite; }

/* Empty / Error state container */
.empty-state {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding: var(--space-16) var(--space-8); gap: var(--space-3); text-align:center;
}
.empty-state-icon {
  width:56px; height:56px; border-radius:var(--radius-xl);
  background:var(--color-neutral-subtle);
  display:flex; align-items:center; justify-content:center;
  color:var(--color-icon-secondary);
}
.empty-state-title   { font-weight:600; font-size:15px; color:var(--color-text-primary); margin-bottom:4px; }
.empty-state-message { font-size:14px; color:var(--color-text-secondary); max-width:320px; }
```

**Loading states:**
- Table loading → show 6 skeleton rows at correct row height (44px), with skeleton cells at realistic widths
- KPI card loading → skeleton for label (12px h, 80px w), value (32px h, 100px w), trend (12px h, 60px w)
- Chart loading → full-area skeleton div at chart height
- Page-level → centred `<Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />` + "Loading {module}..."

**Empty state copy per module:**

| Module | Title | Subtitle |
|--------|-------|---------|
| Purchase Orders | "No purchase orders yet" | "Create your first PO to track supplier orders" |
| Shipments | "No shipments found" | "Shipments appear once ASNs are created" |
| Inventory | "No inventory records" | "Import your data to start tracking stock levels" |
| Suppliers | "No suppliers added" | "Add suppliers to begin managing your supply base" |
| Analytics | "Not enough data" | "Analytics appear after 30 days of order history" |
| Alerts | "All clear" | "No active alerts — your supply chain is running smoothly" |

For Alerts "All clear": use `CheckCircle2` icon in `--color-success` (positive empty state).  
For filters with no results: use `Filter` icon + "No results for your current filters" + "Clear All Filters" (secondary button).  
For fetch errors: use `AlertOctagon` in `--color-error` + "Try Again" (primary) + "Contact Support" (ghost).

---

## PAGE TEMPLATES

### Template A — Data List Page
*Used for: Purchase Orders, Shipments, Inventory, Suppliers*
```
Page Header (title left, primary action right)
KPI Cards Row (3–5 cards)
Filter Bar (sticky)
Table (horizontal scroll if needed)
Pagination
```

### Template B — Analytics Page
*Used for: Demand Planning, Analytics module*
```
Page Header
KPI Cards Row (4–5 cards)
Chart Row: [Line/Area chart 50%] [Bar chart 50%]
Chart Row: [Wide chart 100%]
Supporting data Table
```

### Template C — Record Detail Page
*Used for: PO Detail, Shipment Detail, Supplier Profile*
```
Back navigation + breadcrumb
Page Header: record ID + StatusBadge + key actions
Summary Cards (key field/value pairs, horizontal row)
Tabs: Overview / Line Items / History / Documents
Tab content: Table or field grid
```

### Template D — Dashboard
*Used for: Main Dashboard*
```
Page Header
KPI Cards Row (5 cards)
Chart Row: [OTD Trend line chart 60%] [PO Status donut 40%]
Chart Row: [Inventory Coverage area chart 100%]
Alert Panel [40%] + Recent Activity table [60%] (side by side)
```

---

## AUTOMOTIVE DOMAIN VOCABULARY

Use correct terms in all labels, headings, and placeholder text:

- **SKU** — Stock Keeping Unit (part number)
- **BOM** — Bill of Materials
- **PO** — Purchase Order
- **ASN** — Advance Shipment Notice
- **OTD** — On-Time Delivery (%)
- **OTIF** — On-Time In-Full (%)
- **Lead Time** — Days from PO issue to delivery
- **Tier 1 / Tier 2** — Supplier hierarchy levels
- **Plant** — Manufacturing facility
- **Dock** — Receiving or shipping bay
- **JIT** — Just-In-Time inventory
- **Safety Stock** — Minimum inventory buffer level
- **Days of Cover** — How many days current stock will last
- **Buyer** — Internal PO owner/purchaser
- **Carrier** — Logistics/freight company

---

## THINGS TO NEVER DO

- Hardcode any hex colour — always use `var(--token-name)`
- Use colour alone for status — always pair with text label
- Place two `primary` buttons in the same section
- Hide or truncate table columns — use horizontal scroll
- Skip the validation or confirmation step in upload or destructive actions
- Use decorative gradients, heavy drop shadows, or non-data visuals
- Show a skeleton or spinner without a context label on initial page load
- Render a chart without wrapping it in `ChartPanel`
- Use raw `<table>` HTML without the styling conventions above
- Navigate away from a record without allowing drill-down from a row click