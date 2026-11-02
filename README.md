# Privacy Shield

Privacy Shield is a local-first browser extension for Google Chrome and Mozilla Firefox. It automatically detects and visually blurs sensitive information locally in real time, with zero latency and zero data transmission.

Website: [https://shieldprivacy.vercel.app/](https://shieldprivacy.vercel.app/)

---

## Overview

Privacy Shield runs entirely on your device. It scans web pages for passwords, payment cards, emails, phone numbers, API keys, tokens, and personal identifiers, applying a non-destructive visual blur before content is displayed on your screen.

### Core Principles
- **100% On-Device**: All detection runs locally in your browser. Zero analytics, zero telemetry, and zero external network calls.
- **Password Value Isolation**: Detects password inputs through DOM semantics without ever accessing, logging, or evaluating raw password strings.
- **Zero Layout Shifts**: Applies CSS blur masks without altering page layout, fonts, or element dimensions.
- **Interactive Controls**: Hover or click to reveal masked values temporarily, or pin them visible when needed.

---

## Supported Detection Categories

| Category | Detection Method | Validation |
| :--- | :--- | :--- |
| **Passwords** | Input elements (`type="password"`, `autocomplete`, name/id) | Never reads `.value`; blurs rendered element directly. |
| **Payment Cards** | Visa, Mastercard, Amex, Discover, JCB | Mod 10 Luhn checksum algorithm validation. |
| **Email Addresses** | RFC 5322 compliant pattern | Filters out code files, package names, and version strings. |
| **Phone Numbers** | International E.164 and national formats | Filtered against dates, IP addresses, and version numbers. |
| **API Keys & Secrets** | OpenAI, AWS, GitHub, Stripe, Google, Slack | Prefix recognition and high-entropy token checks. |
| **Auth Tokens & JWTs** | JSON Web Tokens (`eyJ...`) and Bearer headers | Base64url three-segment structure verification. |
| **OTPs & 2FA Codes** | 4-8 digit codes with context keywords | Proximity matching for verification keywords. |
| **Bank Accounts & IBAN** | International Bank Account Numbers | ISO 7064 Mod 97-10 checksum validation. |
| **Personal Info & SSN** | US Social Security Numbers and street addresses | Area and group validation; street suffix matching. |

---

## Installation

### Google Chrome & Chromium Browsers

1. Open your browser and go to `chrome://extensions/`.
2. Enable **Developer mode** in the top right.
3. Click **Load unpacked** in the top left.
4. Select the `dist/chrome` directory (or extract `privacy-shield-chrome.zip` and select that folder).
5. The extension is installed permanently and persists across browser restarts.

### Mozilla Firefox

1. In a new tab, go to `about:config` and click **Accept the Risk and Continue**.
2. Search for `xpinstall.signatures.required` and toggle it to `false`.
3. Go to `about:addons`, click the gear icon, and select **Install Add-on From File...** (or drag and drop `privacy-shield-firefox.xpi` into the tab).
4. Click **Add** to confirm. Privacy Shield is installed permanently and persists across browser restarts.

---

## Project Structure

```
Privacy-Shield/
├── manifests/
│   ├── manifest.chrome.json       # Manifest V3 for Google Chrome
│   └── manifest.firefox.json      # Manifest V3 for Mozilla Firefox
├── src/
│   ├── assets/                    # Offline woff2 fonts and icons
│   ├── shared/                    # Patterns, storage, and cross-browser APIs
│   ├── background/                # Service worker and lifecycle management
│   ├── content/                   # DOM scanner, detector, blur, and reveal engine
│   ├── popup/                     # Browser toolbar popup interface
│   └── settings/                  # Extension preferences and website exclusion list
├── build/
│   ├── build.js                   # Cross-browser build and package pipeline
│   └── generate-icons.js          # Built-in PNG icon generator
├── dist/
│   ├── chrome/                    # Production build for Chrome
│   └── firefox/                   # Production build for Firefox
├── landing/                       # Product website source
├── public/                        # Static distribution for Vercel deployment
├── tests/                         # Automated unit and security test suite
├── vercel.json                    # Vercel deployment configuration
└── package.json
```

---

## Development

### Prerequisites
- Node.js 18+ (tested on Node 22)
- npm

### Build
Compile distributions for Chrome and Firefox, package release assets, and sync `public/`:
```bash
npm run build
```

### Test
Run the automated test suite:
```bash
npm test
```

### Local Preview
Run the local website server:
```bash
npm run landing
```

---

## Security Model

- **No Remote Code**: All scripts and assets are bundled into the extension. No external scripts are fetched or executed.
- **Zero Telemetry**: No analytics, trackers, logging endpoints, or external pings.
- **Password Safety**: Password elements are visually screened without accessing their internal input value.
- **Minimal Permissions**: Requests only `storage` for user preferences, `activeTab` for status updates, `contextMenus` for quick toggles, and host permissions for page screening.

---

## Attribution

Privacy Shield by [L’ÆVOR STUDIO](https://www.instagram.com/leavorstudio/).
