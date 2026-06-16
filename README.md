# EF Client Portal — Windbrook Solutions

A lightweight quarterly report prep tool for financial advisors. Enter client balances, get pixel-stable SACS and TCC PDFs in minutes.

## Local Development

No build step. Open directly in a browser:

```bash
# Option 1: Just open index.html in Chrome/Safari
open index.html

# Option 2: Serve locally (recommended for PDF download)
npx serve .
# → http://localhost:3000
```

## Deploy to Vercel

```bash
# Install Vercel CLI if needed
npm i -g vercel

# From the project folder:
vercel

# Follow prompts:
# - Project name: ef-portal (or anything)
# - Framework: Other
# - Root directory: ./
# Done — you'll get a live URL instantly
```

## Structure

```
ef-portal/
├── index.html          # All three screens (client list, data entry, report)
├── css/
│   └── styles.css      # Full design system
├── js/
│   └── app.js          # All logic: state, calculations, rendering, PDF
├── data/
│   └── clients.js      # Sample client data (3 pre-seeded clients)
├── vercel.json         # Static deployment config
└── README.md
```

## How It Works

1. **Client List** — See all clients with last report date. Click "Prepare Q2 Report →" to start.
2. **Data Entry** — Split pane: form on left organized by data source (Pinnacle Bank, Schwab, Zillow, Liabilities). Click "Use last: $X" pills to carry forward unchanged values. SACS preview updates live on the right. All math is automatic.
3. **Report Preview** — View SACS (cash flow diagram) and TCC (net worth chart) tabs. Download either as PDF or both at once.

## Key Business Rules (from PRD)

- Liabilities are **never subtracted** from net worth — shown separately
- Trust/real estate is **not included** in non-retirement total
- Private Reserve Target = (6 × monthly expenses) + all insurance deductibles
- All static data (salary, budget, client info) is pre-filled — only quarterly balances need entry

## Adding a Real Client

Edit `data/clients.js` and add a new object to the `CLIENTS` array following the existing schema.
