# Privacy Shield — Cross-Browser Privacy Extension

Privacy Shield is a production-quality, local-first browser extension designed for **Google Chrome** and **Mozilla Firefox**. It automatically detects and visually blurs sensitive information—such as passwords, credit card numbers, email addresses, phone numbers, API keys, JWT tokens, OTPs, bank accounts, and personal identifiers—across the web using an **Apple-inspired design language** with native **Geist and Manrope typography**.

---

## Key Highlights

- **Apple Human Interface Design**: macOS Sequoia & iOS 18 aesthetic with frosted glass vibrancy, clean borders, inset grouped cards, and smooth segmented controls.
- **Geist & Manrope Typography**: 100% locally bundled woff2 fonts (`Geist` and `Manrope`) for an authentic Apple desktop experience without external network requests.
- **Zero-Data Leakage Architecture**: 100% on-device detection. Zero analytics, zero telemetry, zero remote dependencies, zero external network traffic.
- **Strict Password Value Isolation**: Detects and visually protects password fields via DOM semantics without ever accessing, logging, or evaluating raw password string values.
- **Cross-Browser Manifest V3**: Unified codebase with dedicated, optimized builds for Chrome and Firefox.
- **Dynamic SPA & Shadow DOM Support**: Uses an incremental, debounced `MutationObserver` and recursive `ShadowRoot` traversal to handle React, Vue, infinite scroll, and modern web apps without layout shifts or CPU spikes.
- **Granular Reveal & Pin System**: Reveal on click or hover with configurable auto-reblur countdowns and an Apple-style pin button to keep elements unmasked when needed.

---

## Supported Detection Categories

| Category | Detection Strategy | Validation & False-Positive Minimization |
| :--- | :--- | :--- |
| **Passwords** | Input elements (`type="password"`, `autocomplete`, name/id) | **Never accesses `.value`**; blurs rendered element directly. |
| **Payment Cards** | Visa, Mastercard, Amex, Discover, JCB formats | **Mod 10 Luhn Checksum validation**; rejects all-zeroes and sequential runs. |
| **Email Addresses** | RFC 5322 compliant regex | Excludes code extensions (`.png`, `.js`, `.ts`, `.lock`) and npm versions. |
| **Phone Numbers** | International E.164 & national formats | Filtered against ISO dates (`2024-05-12`), IPs (`192.168.1.1`), versions (`1.2.3.4`), and 4-4-4 card chunks. |
| **API Keys & Secrets** | OpenAI (`sk-...`), AWS (`AKIA...`), GitHub (`ghp_...`), Stripe (`sk_live_...`), Google (`AIza...`), Slack | Format-specific prefix and high-entropy base64/hex token structures. |
| **Auth Tokens & JWTs** | JSON Web Tokens (`eyJ...`), Bearer headers | Three-segment base64url validation; authorization header context. |
| **OTPs & 2FA Codes** | 4-8 digit codes with semantic keywords | Proximity matching for `otp`, `verification code`, `passcode`, `2fa`, `one-time code`. |
| **Bank Accounts & IBAN** | International Bank Account Numbers | **ISO 7064 Mod 97-10 checksum validation** and routing context. |
| **Personal Info & SSN** | US Social Security Numbers (`XXX-XX-XXXX`) & street addresses | Area and group number validation rules; physical street suffix matching. |

---

## Project Structure

```
Privacy-Shield/
├── manifests/
│   ├── manifest.chrome.json       # Manifest V3 configuration for Google Chrome
│   └── manifest.firefox.json      # Manifest V3 configuration with Gecko settings for Firefox
├── src/
│   ├── assets/
│   │   ├── fonts/                 # Bundled offline woff2 font files
│   │   │   ├── geist/             # Geist Regular, Medium, SemiBold, Bold
│   │   │   └── manrope/           # Manrope Latin 400, 500, 600, 700
│   │   ├── fonts.css              # @font-face declarations for Geist & Manrope
│   │   └── icons/                 # Crisp SVG and generated 16, 32, 48, 128 PNG icons
│   ├── shared/
│   │   ├── config.js              # Default configurations, input selectors, domain exclusion logic
│   │   ├── patterns.js            # Pattern definitions, Luhn check, IBAN check, email & phone validators
│   │   ├── browser-api.js         # Unified cross-browser Chrome/Firefox API abstraction
│   │   └── storage.js             # Type-safe local storage manager
│   ├── background/
│   │   └── background.js          # Service worker / background script: badges, context menus, lifecycle
│   ├── content/
│   │   ├── content.js             # Content script coordinator
│   │   ├── page-guard.js          # Early DOM interception guard
│   │   ├── detector.js            # Text & input node sensitive pattern detector
│   │   ├── blur.js                # Zero-layout-shift DOM wrapping & CSS visual blur manager
│   │   ├── reveal.js              # Click/hover reveal, temporary pin, auto-reblur countdown
│   │   ├── scanner.js             # High-performance TreeWalker DOM scanner
│   │   ├── observer.js            # Debounced MutationObserver for dynamic websites
│   │   ├── shadow-dom.js          # Web component open ShadowRoot inspector
│   │   └── styles.css             # Apple-style blur filters, indicators, and animations
│   ├── popup/
│   │   ├── popup.html             # Apple macOS/iOS styled popup interface
│   │   ├── popup.css              # Glassmorphism, segmented controls, pill switches
│   │   └── popup.js               # Popup controller & active tab bridge
│   └── settings/
│       ├── settings.html          # macOS System Settings layout with sidebar & grouped card rows
│       ├── settings.css           # Inset grouped lists, Apple color palette
│       └── settings.js            # Settings manager, exclusion list, live test sandbox
├── build/
│   ├── build.js                   # Cross-browser esbuild compilation pipeline & release packager
│   └── generate-icons.js          # Built-in PNG icon generator using pure Node.js zlib
├── dist/
│   ├── chrome/                    # Production-ready extension for Google Chrome
│   └── firefox/                   # Production-ready extension for Mozilla Firefox
├── landing/                       # Apple-inspired product landing website
├── docs/                          # Static distribution ready for GitHub Pages hosting
├── tests/
│   ├── patterns.test.js           # Unit tests for patterns, Luhn, IBAN, email & phone validation
│   ├── detector.test.js           # Tests for category sensitivity toggles & input selectors
│   ├── exclusions.test.js         # Tests for wildcard, subdomain, and domain matching
│   └── security.test.js           # Security verification (zero password reading, zero network endpoints)
├── test-pages/
│   └── demo-sandbox.html          # Standalone verification page for login, checkout, API keys, SPA feeds
└── package.json
```

---

## Installation Guide

### Google Chrome & Chromium Browsers (Permanent Installation)

1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left toolbar.
4. Select the directory:
   ```
   dist/chrome
   ```
   *(Or download `privacy-shield-chrome.zip` from the release / landing page, extract to your permanent Documents folder, and select that extracted folder).*
5. The extension is permanently installed into your browser profile and persists across all system reboots.

### Mozilla Firefox (Permanent Installation)

1. In a new tab, navigate to `about:config` and click **Accept the Risk and Continue**.
2. Search for:
   ```
   xpinstall.signatures.required
   ```
3. Toggle its value to `false`.
4. Navigate to `about:addons`, click the gear icon and select **Install Add-on From File...** (or simply drag and drop `privacy-shield-firefox.xpi` into the tab).
5. Click **Add** to confirm. Privacy Shield is now permanently active across all Firefox restarts.

---

## Landing Website & GitHub Pages

To run the local preview server:
```bash
npm run landing
```
Or view the deployed website on GitHub Pages.

---

## Development & Build Pipeline

### Prerequisites
- Node.js v18+ (tested on Node v22.16.0)
- npm

### 1. Build Extension Distributions
To compile the bundles and output ready-to-load distributions for both Chrome and Firefox:
```bash
npm run build
```
This runs `build/build.js`, which:
- Bundles the content script as an IIFE (isolated from host page scripts)
- Bundles the background service worker/scripts for Chrome and Firefox
- Bundles popup and settings applications
- Copies local Geist and Manrope fonts and generates crisp multi-resolution PNG icons
- Produces output in `dist/chrome/` and `dist/firefox/`

### 2. Run Automated Test Suite
```bash
npm test
```
Runs 16 comprehensive unit and security tests verifying:
- Luhn Mod 10 checksum algorithm with valid and invalid credit cards
- ISO 7064 Mod 97-10 IBAN validation
- Email TLD false-positive rejection
- Phone number validation rejecting dates, versions, IP addresses, and card chunks
- OpenAI, AWS, GitHub, Stripe, and Google API key recognition
- JWT token and contextual OTP code identification
- **Security guarantee**: Verifies password input `.value` is never read or accessed
- **Privacy guarantee**: Verifies zero telemetry or external network endpoints
- Website exclusion wildcard and subdomain matching

---

## Security & Privacy Architecture

### Local-First Security Guarantees
- **No Remote JavaScript**: All scripts are bundled into the extension package. No CDN scripts or external evaluators are executed.
- **Zero Telemetry**: The extension does not include Google Analytics, Sentry, Mixpanel, or custom telemetry endpoints.
- **Password Value Protection**: Password fields are identified by inspecting DOM attributes (`type="password"`, `autocomplete`, `name`, `id`). Privacy Shield **never** reads, intercepts, or logs the element's `.value` string.
- **Minimal Permissions**: The extension requests only `storage` (to remember user preferences locally), `activeTab` (for live status counts), `contextMenus` (for right-click quick toggles), and host permissions to run content masking across web pages.

### Technical Limitations & Scope
Privacy Shield provides **visual screening protection**:
1. **Screen & Visual Privacy**: Prevents shoulder-surfing, unintentional screen-sharing leaks (e.g. over Zoom, Teams, Google Meet), and screen recordings.
2. **DOM-Level Distinction**: Visual blurring is applied via CSS styling (`filter: blur(...)`). It modifies visual rendering on screen. It does **not** protect against malicious JavaScript running on the host website, privileged browser extensions with DOM access, browser DevTools inspection, or OS-level memory analysis.

---

## Credits & Attribution

Designed with Apple Human Interface Guidelines and Geist/Manrope typography by [L’ÆVOR STUDIO](https://www.instagram.com/leavorstudio/). All rights reserved.
