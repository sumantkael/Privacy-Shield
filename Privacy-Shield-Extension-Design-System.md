# Privacy Shield Extension — Design System

> **Scope:** Extension UI only — Popup (350px panel), Settings page (full-tab), and Content-layer blurring.  
> **Aesthetic:** Apple macOS / iOS Human Interface Design. Glassmorphism cards, SF-influenced typography, system-native interaction patterns.

---

## 1. Brand Identity

| Property | Value |
|---|---|
| **Extension Name** | Privacy Shield |
| **Creator** | L'ÆVOR STUDIO |
| **Tagline** | Local Engine · 100% On-Device · Zero Network Transmission |
| **Character** | Calm, precise, security-first. No decorative chrome — only purposeful UI. |

### Brand Icon
- **Shape:** 28×28px (popup) / 38×38px (settings) rounded square — `border-radius: 8px` / `10px`
- **Background:** `linear-gradient(135deg, #242428, #121214)` — near-black with subtle cool shift
- **Icon glyph:** Shield with checkmark SVG, stroked in `--apple-green` (`#34C759`)
- **Border:** `1px solid rgba(255,255,255,0.15)` — ghost-white edge on dark surface
- **Shadow:** `0 2px 6px rgba(0,0,0,0.15)` (popup) / `0 4px 10px rgba(0,0,0,0.2)` (settings)

---

## 2. Color System

### 2.1 Light Mode Palette

| Token | Hex / Value | Usage |
|---|---|---|
| `--bg-primary` | `#F2F2F7` | Popup body background |
| `--bg-window` | `#F5F5F7` | Settings page background |
| `--bg-card` | `rgba(255,255,255,0.82)` | Frosted glass card (popup) |
| `--bg-card` *(settings)* | `#FFFFFF` | Solid card background |
| `--bg-inset` | `#FFFFFF` | Inset group / row background |
| `--bg-sidebar` | `rgba(240,240,243,0.95)` | Settings sidebar |
| `--bg-hover` | `rgba(0,0,0,0.04)` | Hover state fill |
| `--text-primary` | `#1D1D1F` | Body text, labels |
| `--text-secondary` | `#86868B` | Subtitles, descriptions |
| `--text-tertiary` | `#A1A1A6` | Section labels, placeholders |
| `--border-subtle` | `rgba(0,0,0,0.08)` | Card & group borders |
| `--border-divider` | `rgba(0,0,0,0.05)` | Row separators inside groups |
| `--border-color` | `rgba(0,0,0,0.08)` | Settings borders (alias) |

### 2.2 Dark Mode Palette

| Token | Hex / Value |
|---|---|
| `--bg-primary` | `#000000` |
| `--bg-window` | `#000000` |
| `--bg-card` | `rgba(28,28,30,0.78)` |
| `--bg-card` *(settings)* | `#1C1C1E` |
| `--bg-inset` | `#1C1C1E` |
| `--bg-sidebar` | `rgba(28,28,30,0.92)` |
| `--bg-hover` | `rgba(255,255,255,0.06)` |
| `--text-primary` | `#F5F5F7` |
| `--text-secondary` | `#8E8E93` |
| `--text-tertiary` | `#636366` |
| `--border-subtle` | `rgba(255,255,255,0.12)` |
| `--border-divider` | `rgba(255,255,255,0.07)` |

> Dark mode is fully automatic via `@media (prefers-color-scheme: dark)`. No JS or class toggling needed.

### 2.3 Apple Accent Colors

| Token | Hex | Semantic Use |
|---|---|---|
| `--apple-green` | `#34C759` | Active state, toggles ON, shield active, pinned |
| `--apple-green-glow` | `rgba(52,199,89,0.25)` | Status dot glow when active |
| `--apple-blue` | `#007AFF` | Primary action, active nav item, links, focus ring |
| `--apple-orange` | `#FF9500` | Paused / warning state |
| `--apple-red` | `#FF3B30` | Destructive actions, delete buttons |
| `--apple-purple` | `#AF52DE` | API Key category dot |
| `--apple-teal` | `#30B0C7` | Phone number category dot |
| `--apple-gray` | `#8E8E93` | Inactive status dot |

### 2.4 Category Color Dots

Used in the Popup's category list and conceptually across the extension:

| Category | Color |
|---|---|
| Passwords | `#FF3B30` (apple-red) |
| Email Addresses | `#007AFF` (apple-blue) |
| Payment Cards | `#34C759` (apple-green) |
| API Keys & Secrets | `#AF52DE` (apple-purple) |
| Auth Tokens & JWT | `#FF9500` (apple-orange) |
| Phone Numbers | `#30B0C7` (apple-teal) |
| OTPs & 2FA Codes | `#E056FD` |
| Bank Accounts & IBAN | `#F0932B` |
| Addresses & SSN | `#686DE0` |

### 2.5 Content Layer Tokens (injected into page DOM)

| Token | Value | Usage |
|---|---|---|
| `--ps-blur-radius` | `6px` (default, user-configurable 3–12px) | Gaussian blur strength |
| `--ps-apple-green` | `#34C759` | Revealed state outline |
| `--ps-apple-blue` | `#007AFF` | Keyboard focus ring |
| `--ps-glass-bg` (light) | `rgba(240,240,245,0.7)` | Blur wrapper background |
| `--ps-glass-bg` (dark) | `rgba(30,30,32,0.75)` | Blur wrapper background |
| `--ps-glass-border` (light) | `rgba(0,0,0,0.08)` | Blur wrapper border |
| `--ps-glass-border` (dark) | `rgba(255,255,255,0.12)` | Blur wrapper border |

---

## 3. Typography

### 3.1 Font Stack

```
Primary: 'Geist', 'Manrope', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif
```

Both fonts are **self-hosted inside the extension bundle** — zero network requests.

| Family | Weights Available | Usage |
|---|---|---|
| **Geist** | 400, 500, 600, 700 | All primary UI text (preferred) |
| **Manrope** | 300, 400, 500, 600, 700 | Secondary / fallback |

### 3.2 Type Scale (Popup)

| Role | Size | Weight | Letter-Spacing | Color |
|---|---|---|---|---|
| Brand Name | 15px | 600 | -0.015em | `--text-primary` |
| Version Tag | 10px | 500 | +0.02em | `--text-secondary` |
| Status Text | 13.5px | 600 | -0.01em | `--text-primary` |
| Metric Number | 24px | 700 | -0.03em | `--text-primary` |
| Metric Label | 11px | 500 | — | `--text-secondary` |
| Section Label | 10.5px | 600 | +0.05em | `--text-tertiary` |
| Row Label | 12.5px | 500 | — | `--text-primary` |
| Row Sublabel | 11px | 400 | — | `--text-secondary` |
| Pill Button | 11.5px | 500 | — | `--text-primary` |
| Segmented Control | 12px | 500 / 600 | — | `--text-secondary` / `--text-primary` |
| Footer Text | 10px | 500 | — | `--text-tertiary` |

### 3.3 Type Scale (Settings Page)

| Role | Size | Weight | Letter-Spacing |
|---|---|---|---|
| Panel Heading (h1) | 24px | 700 | -0.025em |
| App Title in Sidebar (h2) | 16px | 600 | -0.015em |
| Panel Description | 13.5px | 400 | — |
| Section Title | 11.5px | 600 | +0.05em |
| Row Title | 14px | 500 | — |
| Row Description | 12px | 400 | — |
| Nav Item | 13.5px | 500 | — |
| Domain Name | 13.5px | 500 | — |
| Info Content h3 | 14.5px | 600 | — |
| Info Content p | 13px | 400 | — |
| Sidebar Studio Credit | 11px | 500 | — |
| Button Text | 13px | 500 | — |
| Value Badge | 12px | 600 | — |

---

## 4. Shadows

| Token | Value | Used On |
|---|---|---|
| `--card-shadow` (popup light) | `0 4px 16px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)` | `.apple-card` in popup |
| `--card-shadow` (popup dark) | `0 4px 20px rgba(0,0,0,0.4)` | `.apple-card` in popup |
| `--thumb-shadow` (light) | `0 2px 4px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.08)` | Toggle switch thumb |
| `--thumb-shadow` (dark) | `0 2px 5px rgba(0,0,0,0.4)` | Toggle switch thumb |
| `--shadow-card` (settings light) | `0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02)` | Settings inset groups |
| `--shadow-card` (settings dark) | `0 2px 8px rgba(0,0,0,0.4)` | Settings inset groups |
| Brand icon shadow | `0 2px 6px rgba(0,0,0,0.15)` | 28px brand icon |
| App icon shadow | `0 4px 10px rgba(0,0,0,0.2)` | 38px app icon in settings |
| Seg-item active | `0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08)` | Active segmented tab |
| Pin btn default | `0 2px 6px rgba(0,0,0,0.35)` | Content layer pin button |
| Pin btn active | `0 0 10px rgba(52,199,89,0.75), 0 2px 6px rgba(0,0,0,0.35)` | Pinned content pin button |

---

## 5. Border Radius

| Element | Radius |
|---|---|
| Main popup card (`.apple-card`) | `14px` |
| Inset groups (`.apple-inset-group`) | `12px` |
| Icon button (gear icon) | `50%` (circle) |
| Nav items (settings) | `8px` |
| Apple buttons | `8px` |
| Pill action buttons | `12px` |
| Toggle switch track | `34px` |
| Toggle switch thumb | `50%` |
| Segmented control container | `9px` |
| Segmented item (active pill) | `7px` |
| Brand icon | `8px` |
| App icon (settings) | `10px` |
| Input fields | `8px` |
| Delete button | `6px` |
| Info icon wrapper | `8px` |
| Blur wrapper (content layer) | `4px` |
| Inline shield wrap | `4px` |
| Status dot | `50%` |
| Category dot | `50%` (7×7px circle) |
| Mock avatar (sandbox) | `50%` |

---

## 6. Spacing System

The extension uses a **4px base grid** throughout.

| Usage | Value |
|---|---|
| Popup body padding | `12px` |
| Gap between popup sections | `12px` |
| Apple card padding | `14px` |
| Inset row padding (standard) | `10px 12px` |
| Inset row padding (compact) | `7.5px 12px` |
| Settings inset row padding | `14px 18px` |
| Settings content pane padding | `36px 48px` |
| Settings sidebar padding | `24px 14px` |
| Sidebar header padding-bottom | `24px` |
| Section title margin-top | `22px` |
| Panel header margin-bottom | `28px` |
| Brand gap (icon + text) | `8px` |
| Row left gap (icon + details) | `10px` |
| Category info gap | `8px` |
| Metric actions gap | `6px` |

---

## 7. Components

### 7.1 Apple Card (`.apple-card`)

The primary glassmorphism container used in the popup.

```css
background: rgba(255,255,255,0.82);        /* --bg-card */
backdrop-filter: blur(20px);               /* frosted glass */
-webkit-backdrop-filter: blur(20px);
border: 1px solid rgba(0,0,0,0.08);        /* --border-subtle */
border-radius: 14px;
padding: 14px;
box-shadow: var(--card-shadow);
```

- In dark mode: `rgba(28,28,30,0.78)` background with heavier shadow.
- Used for the **Master Protection Card** in the popup.

---

### 7.2 Apple Inset Group (`.apple-inset-group`)

List container styled like iOS settings groups. No blur — solid background.

```css
background: var(--bg-inset);              /* #FFFFFF light / #1C1C1E dark */
border: 1px solid var(--border-subtle);
border-radius: 12px;
overflow: hidden;                          /* clips children cleanly */
```

Settings variant adds `box-shadow: var(--shadow-card)`.

#### Inset Row (`.inset-row`)
```css
padding: 10px 12px;                        /* 7.5px 12px for compact */
border-bottom: 1px solid var(--border-divider);
display: flex;
align-items: center;
justify-content: space-between;
```
Last child: `border-bottom: none`.

---

### 7.3 Apple Switch Toggle

Two sizes — standard (44×26px) and small (36×22px).

**Track (`.switch-slider`)**
```css
background-color: rgba(120,120,128,0.22);  /* gray when OFF */
border-radius: 34px;
transition: background-color 0.25s cubic-bezier(0.16, 1, 0.3, 1);
```
When checked: `background-color: #34C759` (apple-green).

**Thumb (`.switch-slider::before`)**
```css
height: 22px; width: 22px;                /* 18×18 for small */
left: 2px; bottom: 2px;
background-color: #FFFFFF;
border-radius: 50%;
box-shadow: var(--thumb-shadow);
transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1);
```
When checked: `transform: translateX(18px)` (standard) / `14px` (small).

---

### 7.4 Segmented Control (`.apple-segmented-control`)

Apple-style pill tab switcher used for Reveal Interaction mode.

**Container:**
```css
background: rgba(120,120,128,0.12);
border-radius: 9px;
padding: 2.5px;
display: flex;
gap: 2px;
```

**Item (`.seg-item`):**
```css
flex: 1;
border: none;
background: transparent;
font-size: 12px;
font-weight: 500;
color: var(--text-secondary);
padding: 5px 0;
border-radius: 7px;
transition: all 0.18s cubic-bezier(0.16, 1, 0.3, 1);
```

**Active item (`.seg-item.active`):**
```css
background: var(--bg-inset);
color: var(--text-primary);
font-weight: 600;
box-shadow: 0 1px 4px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.08);
```

---

### 7.5 Buttons

#### Icon Button (`.icon-button`)
Transparent ghost button used for the settings gear icon in the popup header.
```css
background: transparent;
border: none;
color: var(--text-secondary);
padding: 6px;
border-radius: 50%;
transition: background-color 0.15s ease, color 0.15s ease;
```
Hover: `background-color: var(--border-subtle); color: var(--text-primary);`

#### Pill Action Button (`.pill-action-btn`)
Used for "Reveal" and "Re-blur" in the metrics row.
```css
background: var(--bg-inset);
border: 1px solid var(--border-subtle);
font-size: 11.5px;
font-weight: 500;
padding: 5px 10px;
border-radius: 12px;
transition: all 0.15s ease;
```
Hover: `background: var(--border-subtle); transform: translateY(-0.5px);`
Active: `transform: scale(0.96);`

#### Apple Button — Primary (`.apple-button.primary`)
```css
background-color: #007AFF;
color: #FFFFFF;
font-size: 13px;
font-weight: 500;
padding: 8px 14px;
border-radius: 8px;
border: none;
```
Hover: `background-color: #0066D6;`

#### Apple Button — Secondary (`.apple-button.secondary`)
```css
background-color: var(--bg-hover);
color: var(--text-primary);
border: 1px solid var(--border-color);
```
Hover: `background-color: var(--border-color);`

#### Small variant (`.apple-button.small`)
```css
padding: 6px 12px;
font-size: 12px;
width: 100%;
```

---

### 7.6 Apple Input (`.apple-input`)

Used in domain add field, search, and sandbox test inputs.
```css
font-size: 13px;
padding: 8px 12px;
border-radius: 8px;
border: 1px solid var(--border-color);
background-color: var(--bg-card);
color: var(--text-primary);
outline: none;
transition: border-color 0.15s ease, box-shadow 0.15s ease;
```
Focus:
```css
border-color: #007AFF;
box-shadow: 0 0 0 3px rgba(0,122,255,0.15);
```

---

### 7.7 Status Indicator

Displayed in the Master Card header to show shield state.

**Status Dot (`.status-dot`):** 9×9px circle.

| State Class | Color | Glow |
|---|---|---|
| `.active` | `#34C759` | `0 0 8px rgba(52,199,89,0.25)` |
| `.paused` | `#FF9500` | none |
| `.excluded` | `#007AFF` | none |
| *(default)* | `#8E8E93` | none |

**Status Text (`.status-text`):** 13.5px / 600 weight — e.g., "Shield Active", "Paused", "Site Excluded".

---

### 7.8 Section Labels

Used above inset groups as all-caps category headers.

**Popup (`.section-label`):**
```css
font-size: 10.5px;
font-weight: 600;
color: var(--text-tertiary);
letter-spacing: 0.05em;
padding: 0 4px;
text-transform: uppercase;   /* implied by the all-caps content */
```

**Settings (`.section-title`):**
```css
font-size: 11.5px;
font-weight: 600;
color: var(--text-tertiary);
letter-spacing: 0.05em;
margin: 22px 0 8px 12px;
```

---

### 7.9 Metrics Block

Displayed inside the Master Card, below the toggle row.

```css
.metrics-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid var(--border-divider);
}
```

- **`.metric-number`:** 24px / 700 / -0.03em — the big count number
- **`.metric-label`:** 11px / 500 / `--text-secondary`

---

### 7.10 Settings Sidebar Navigation (`.nav-item`)

```css
display: flex;
align-items: center;
gap: 10px;
font-size: 13.5px;
font-weight: 500;
padding: 9px 12px;
border-radius: 8px;
transition: all 0.15s ease;
```

| State | Background | Text | Icon |
|---|---|---|---|
| Default | transparent | `--text-primary` | `--text-secondary` |
| Hover | `var(--bg-hover)` | `--text-primary` | `--text-secondary` |
| Active | `#007AFF` | `#FFFFFF` | `#FFFFFF` |

Navigation tabs: General, Categories, Website Exclusions, Live Test Sandbox, Security & Privacy.

---

### 7.11 Info Items (`.info-item`)

Used in the Security & Privacy tab.

**Icon wrapper (`.info-icon`):** 32×32px, `border-radius: 8px`

| Type | Background | Color |
|---|---|---|
| `.check` | `rgba(52,199,89,0.12)` | `#34C759` |
| `.notice` | `rgba(255,149,0,0.12)` | `#FF9500` |

---

### 7.12 Content Layer — Blur Wrapper (`.ps-shield-blur`)

Injected into page DOM on detected sensitive text nodes.

```css
display: inline;
background-color: rgba(128,128,136,0.14);
border-radius: 4px;
padding: 0 2px;
cursor: pointer;
filter: blur(6px);                         /* --ps-blur-radius */
user-select: none;
transition: filter 0.22s cubic-bezier(0.16, 1, 0.3, 1),
            background-color 0.2s ease,
            box-shadow 0.2s ease;
```

**States:**

| State | Filter | Background | Border |
|---|---|---|---|
| Default (blurred) | `blur(6px)` | `rgba(128,128,136,0.14)` | none |
| Hover | `blur(6px)` | `rgba(128,128,136,0.24)` | none |
| Revealed (`.ps-revealed`) | `blur(0px)` | `rgba(52,199,89,0.12)` | `0 0 0 1px rgba(52,199,89,0.45)` |
| Pinned (`.ps-pinned`) | `blur(0px)` | `rgba(52,199,89,0.16)` | `0 0 0 1.5px #34C759, 0 2px 8px rgba(52,199,89,0.25)` |
| Focus (keyboard) | `blur(6px)` | unchanged | `2px solid #007AFF` outline |

---

### 7.13 Content Layer — Pin Button (`.ps-pin-btn`)

Circular 20×20px button, injected inline after a revealed element.

**Default:**
```css
background-color: #007AFF;
color: #FFFFFF;
border: 1.5px solid #0056B3;
box-shadow: 0 2px 6px rgba(0,0,0,0.35);
border-radius: 50%;
width: 20px; height: 20px;
```
Hover: `scale(1.18)`, blue glow `0 3px 10px rgba(0,122,255,0.55)`
Active press: `scale(0.95)`

**Pinned (`.ps-pin-btn.active`):**
```css
background-color: #34C759;
border-color: #248A3D;
box-shadow: 0 0 10px rgba(52,199,89,0.75), 0 2px 6px rgba(0,0,0,0.35);
```
Icon inside is always 12×12px white SVG, `fill: #FFFFFF`.

---

### 7.14 Slider Control (`.slider-control`)

```css
display: flex;
align-items: center;
gap: 12px;
```
- Range input: `width: 140px; accent-color: #007AFF;`
- Value badge (`.val-badge`): 12px / 600 / `--text-secondary` / tabular-nums / min-width 42px

---

### 7.15 Tab Panel Transitions (Settings)

```css
.tab-panel { display: none; animation: fadeIn 0.2s ease-out; }
.tab-panel.active { display: block; }

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
```

---

## 8. Layout Structure

### 8.1 Popup Layout (350px wide)

```
┌──────────────────────────────────────┐  ← body.apple-theme · width: 350px · padding: 12px
│  [Brand Icon]  Privacy Shield  v↗    │  ← app-header (flex row, space-between)
│                Local Engine  [gear]  │
├──────────────────────────────────────┤
│  ● Shield Active               [●●]  │  ← apple-card · master-card
│  ─────────────────────────────────   │
│  0                    [Reveal] [Re-blur] │  ← metrics-row
│  Items Blurred on Page               │
├──────────────────────────────────────┤
│  🌐  Protect Current Website    [●●] │  ← apple-inset-group (site toggle)
│        domain.com                    │
├──────────────────────────────────────┤
│  REVEAL INTERACTION                  │  ← section-label
│  [  Click to Reveal  |  Hover&Click ]│  ← apple-segmented-control
├──────────────────────────────────────┤
│  DETECTION CATEGORIES                │  ← section-label
│  ● Passwords              [●●]       │  ← apple-inset-group · category-list
│  ● Email Addresses        [●●]       │    (max-height: 180px, scrollable)
│  ● Payment Cards          [●●]       │
│  ● API Keys & Secrets     [●●]       │
│  ● Auth Tokens & JWT      [●●]       │
│  ● Phone Numbers          [●●]       │
│  ● OTPs & Codes           [●●]       │
│  ● Bank Accounts & IBAN   [●●]       │
│  ● Addresses & SSN        [●●]       │
├──────────────────────────────────────┤
│  🛡 100% On-Device · Zero Network   │  ← app-footer
│       by L'ÆVOR STUDIO               │
└──────────────────────────────────────┘
```

### 8.2 Settings Page Layout (full tab, max-width 1200px)

```
┌──────────────────┬──────────────────────────────────────────────┐
│  SIDEBAR 260px   │  CONTENT PANE (flex: 1, max-width: 820px)    │
│                  │  padding: 36px 48px                           │
│  [App Icon]      │                                               │
│  Privacy Shield  │  General Preferences                          │
│  Preferences     │  Manage global protection behavior and...     │
│  ──────────────  │                                               │
│  ⚙ General  ←   │  GLOBAL PROTECTION                            │
│  ⊞ Categories    │  ┌─────────────────────────────────────────┐ │
│  ⊘ Exclusions    │  │ Enable Privacy Shield           [●●]    │ │
│  </> Sandbox     │  └─────────────────────────────────────────┘ │
│  🛡 Security     │                                               │
│  ──────────────  │  REVEAL BEHAVIOR                              │
│  [Reset button]  │  ┌─────────────────────────────────────────┐ │
│  by L'ÆVOR       │  │ Reveal on Click                 [●●]    │ │
└──────────────────┴──│ Reveal on Hover                 [○○]    │─┘
                      │ Allow Temporary Pinning         [●●]    │
                      │ Automatic Re-blur Timeout    [──●──] 4s │
                      └─────────────────────────────────────────┘
```

**Settings Tabs:**
1. **General** — master toggle, reveal behavior toggles, blur strength slider
2. **Categories** — per-category switches with descriptions (credentials + financial)
3. **Website Exclusions** — add/search/delete domain list
4. **Live Test Sandbox** — mock profile with real sensitive data, scan/reveal test
5. **Security & Privacy** — architecture transparency items (checkmarks + notice)

---

## 9. Motion & Animation

All transitions use **Apple's spring easing**: `cubic-bezier(0.16, 1, 0.3, 1)` — snappy out, natural settle.

| Element | Property | Duration | Easing |
|---|---|---|---|
| Toggle switch track color | `background-color` | 250ms | spring |
| Toggle switch thumb translate | `transform` | 250ms | spring |
| Segmented item pill | all | 180ms | spring |
| Blur reveal / re-blur | `filter` | 220ms | spring |
| Pin button scale | `transform` | 150ms | spring |
| Tab panel entry | `opacity` + `translateY(4px→0)` | 200ms | ease-out |
| Icon button hover | `background-color`, `color` | 150ms | ease |
| Pill button lift | `transform: translateY(-0.5px)` | 150ms | ease |
| Nav item + button | all | 150ms | ease |
| Input focus ring | `border-color`, `box-shadow` | 150ms | ease |
| Delete button hover | `background-color` | 150ms | ease |
| Footer link | `color` | 150ms | ease |
| Status dot | `background-color`, `box-shadow` | 250ms | ease |

---

## 10. Accessibility

- **Font smoothing:** `-webkit-font-smoothing: antialiased` + `-moz-osx-font-smoothing: grayscale` on all text surfaces.
- **`user-select: none`** on popup body — extension UI is not selectable.
- **Keyboard focus:** Blurred elements support `:focus-visible` with `2px solid #007AFF` outline.
- **High Contrast Mode:** `@media (prefers-contrast: more)` — blurred elements become solid black fill, revealed elements gain black outline.
- **Screen reader:** All interactive elements have `aria-label` or `title` attributes. Hidden inputs for switches use `opacity: 0; width: 0; height: 0`.
- **`tabular-nums`:** Applied to metric numbers, value badges, and domain names for stable width.

---

## 11. Icon System

All icons are **inline SVG**, `stroke`-based (`fill="none"`), `stroke-width: 2`. No external icon library.

| Icon | Usage | Size |
|---|---|---|
| Shield + checkmark path | Brand logo, nav security tab | 18px (popup), 22px (settings) |
| Gear / settings cog | Popup header settings button, settings general nav | 16px |
| Globe with latitude lines | Current site row | 14px |
| Grid of 4 squares | Categories nav | 16px |
| Circle with slash | Exclusions nav | 16px |
| `</>` code brackets | Sandbox nav | 16px |
| Shield outline | Security nav | 16px |
| Checkmark polyline `20 6 9 17 4 12` | Security info check items | 18px |
| Info circle | Security notice item | 18px |
| Filled shield (half-tone) | Footer privacy badge | 12px (filled) |

---

## 12. Scrollable Lists

- **Category list in popup:** `max-height: 180px; overflow-y: auto; scrollbar-width: thin;`
- **Exclusion list in settings:** `max-height: 320px; overflow-y: auto;`
- **Settings content pane:** `overflow-y: auto;`

---

## 13. Declarative Pre-Paint CSS (Content Layer)

Applied before JS loads — blurs sensitive inputs at `document_start` with zero frame leak:

```css
input[type="password"],
input[autocomplete*="password" i],
input[name*="password" i],
input[name*="passwd" i],
input[name*="pwd" i],
input[id*="password" i],
input[autocomplete*="cc-number" i],
input[autocomplete*="cc-csc" i],
input[autocomplete*="one-time-code" i] {
  filter: blur(6px) !important;
}
```

---

## 14. Design Principles

1. **Zero-chrome density** — Every pixel earns its space. No decorative gradients, no hero art.
2. **Apple-native feel** — Uses the exact same semantic colors, rounding, motion curves, and typography hierarchy as macOS/iOS system UI.
3. **Dark mode first** — Both modes are designed equally; dark is not an afterthought.
4. **Local-first** — No remote assets (fonts bundled), no telemetry, no CDNs. Design reflects this: clean, no branding noise.
5. **Status is always visible** — Status dot + label in the master card and the active nav item always tell users the current protection state at a glance.
6. **Blur as interaction** — The blur effect on content is the primary brand expression; the reveal/pin micro-interaction is the only "delight" moment.
7. **Spring physics everywhere** — `cubic-bezier(0.16, 1, 0.3, 1)` on all state-change transitions gives the UI a premium tactile feel.

---

## 15. Quick Reference — CSS Variable Master List

```css
:root {
  /* Typography */
  --font-family: 'Geist', 'Manrope', -apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif;
  --font-family-geist: 'Geist', -apple-system, sans-serif;
  --font-family-manrope: 'Manrope', -apple-system, sans-serif;

  /* Backgrounds */
  --bg-primary: #F2F2F7;
  --bg-window: #F5F5F7;
  --bg-card: rgba(255,255,255,0.82);
  --bg-inset: #FFFFFF;
  --bg-sidebar: rgba(240,240,243,0.95);
  --bg-hover: rgba(0,0,0,0.04);

  /* Text */
  --text-primary: #1D1D1F;
  --text-secondary: #86868B;
  --text-tertiary: #A1A1A6;

  /* Borders */
  --border-subtle: rgba(0,0,0,0.08);
  --border-divider: rgba(0,0,0,0.05);
  --border-color: rgba(0,0,0,0.08);

  /* Accents */
  --apple-green: #34C759;
  --apple-green-glow: rgba(52,199,89,0.25);
  --apple-blue: #007AFF;
  --apple-orange: #FF9500;
  --apple-red: #FF3B30;
  --apple-purple: #AF52DE;
  --apple-teal: #30B0C7;
  --apple-gray: #8E8E93;

  /* Shadows */
  --card-shadow: 0 4px 16px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02);
  --thumb-shadow: 0 2px 4px rgba(0,0,0,0.18), 0 1px 1px rgba(0,0,0,0.08);
  --shadow-card: 0 1px 3px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.02);

  /* Content Layer */
  --ps-blur-radius: 6px;
  --ps-apple-green: #34C759;
  --ps-apple-blue: #007AFF;
  --ps-glass-bg: rgba(240,240,245,0.7);
  --ps-glass-border: rgba(0,0,0,0.08);
}
```
