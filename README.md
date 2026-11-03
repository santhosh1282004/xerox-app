# Sri Sakthi Xerox — Shop Billing & Income-Analysis Software

A lightweight, high-performance local web application built specifically for single-PC Xerox & Print Shop operations. Engineered to run smoothly on legacy hardware (Intel 3rd Gen CPU, 8 GB RAM, HDD, and very limited disk space <1 GB).

---

## 🚀 Key Architectural Advantages

- **Zero Heavy Frameworks:** Built with pure Vanilla JavaScript, clean semantic HTML5, and modular CSS. No Node.js runtime, no Electron bloat, no React build step.
- **Micro Storage Footprint:** Entire application files occupy **less than 2 MB** on disk.
- **Ultra-Low Memory Footprint:** Python Flask + SQLite consumes only **~30–50 MB of RAM** at runtime.
- **100% Offline Operation:** All assets (Tailwind JS engine, Material Symbols font, Inter/System typography) are bundled locally in `static/`. Operates completely without an internet connection.
- **Safe Monetary Math:** All financial transactions (Income, Bills, Expenses) are calculated in integer paise in SQLite (`₹240.50` = `24050`) to eliminate floating-point rounding errors.
- **Embedded SQLite Database:** Single-file database located at `data/xerox_shop.db`. Configured with Write-Ahead Logging (`PRAGMA journal_mode = WAL`), foreign keys (`PRAGMA foreign_keys = ON`), and indexed queries for instant lookups on slow HDDs.

---

## 📂 Project Directory Structure

```text
xerox-shop/
├── app.py                      # Flask application entry point & REST APIs
├── requirements.txt            # Python dependencies (Flask only)
├── start_app.bat               # Windows 1-click startup script (launches browser)
├── start_app.sh                # Linux/Mac startup script
├── data/
│   └── xerox_shop.db           # SQLite database file
├── repositories/
│   ├── __init__.py
│   └── database.py             # SQLite connection pool, schema, pragmas & seed data
├── services/
│   ├── __init__.py
│   ├── billing_service.py      # Bill number generator, atomic invoices & line items
│   ├── income_service.py       # Income entries, counter metrics & SQL search/filter
│   ├── expense_service.py      # Shop expenses, spending summaries & categories
│   └── analysis_service.py     # Pure SQL analytics, KPIs, trajectory & CSV export
├── static/
│   ├── css/
│   │   ├── app.css             # Main styling, toasts, thermal/laser print CSS
│   │   └── material-symbols.css# Local Material Symbols font-face
│   ├── fonts/
│   │   └── material-symbols-outlined.ttf # Offline icon font
│   └── js/
│       ├── app.js              # Vanilla JS frontend client (state, modals, tables, SVG charts)
│       └── tailwind.js         # Offline Tailwind CSS runtime engine
└── templates/
    └── index.html              # 3-Page responsive management UI
```

---

## ⚡ How to Run the Application

### On Windows
1. Double-click `start_app.bat`.
2. It will automatically start the lightweight server and open your browser to `http://127.0.0.1:5000`.

*Alternatively via Command Prompt / PowerShell:*
```cmd
python app.py
```

### On Linux
```bash
./start_app.sh
```

---

## 📋 Features & Workflows

### 1. Income & Billing (`Page 1`)
- **Metric Cards:** Real-time Today's Income (with % change vs yesterday), Transaction count by payment method (Cash / UPI / Card), and Bills generated count.
- **Filter Toolbar:** Live instant search across customer names, phone numbers, bill numbers, and descriptions. Time period popovers, amount brackets, and classification filters.
- **Add Income Entry:** Form with date/time, customer details, job description, quantity, rate, discount, and payment method.
- **Create Customer Invoice:** Multi-item invoice generator with live line items, discounts, GST/extra charges, auto-generated bill numbers (`BL-YYYY-XXXX`), and live receipt preview.
- **Print & Finalize Bill:** Saves bill to SQLite and automatically creates a linked income entry so revenue is never double-counted. Opens the dedicated thermal/laser print dialog.

### 2. Spending Details (`Page 2`)
- **Metric Cards:** Today's spending with description, This Month's spending (with % comparison vs last month), and audited receipt counts.
- **Filter Toolbar:** Search by payee, item, invoice number, and filter by spending verticals (*Stationery Items, Paper, Photo Sheets, Spirals, Service Charges, Toner / Ink, EB Bill, Shop Rent*).
- **Add Spending Modal:** Quick modal to record shop operational expenses with payee, amount, payment method, and category.

### 3. Income Analysis (`Page 3`)
- **Top 4 KPI Cards:** Total Profit, Total Spend, Total Revenue, and Unique Retail Customers with growth indicators.
- **Preset Filters:** Quick toggles for *Today*, *This Week*, *This Month*, and *This Year*, plus custom date pickers.
- **Chart A (Comparative Trajectory):** Pure SVG multi-line visualization of Revenue, Spending, and Profit trends (switchable between Daily, Weekly, and Monthly views). Zero canvas memory overhead!
- **Chart B (Stream Yield Donut):** Pure SVG donut visualization showing breakdown across *Xerox Services*, *Product Sales*, and *Combo Services*.
- **Operational Velocity:** 5 auto-calibrated throughput metrics (*Avg Customers/day, Avg Revenue/day, Avg Spending/day, Avg Profit/day, Avg Spend/Customer*).
- **Spool Activity & Print Ledger:** 52-week GitHub-style activity heatmap powered by actual SQLite print job telemetry.
- **CSV Telemetry Export:** 1-click download of the complete fiscal ledger (`docuflow_fiscal_telemetry.csv`).

### 4. Settings & Rates Modal
- Configure shop name, tagline, address, phone number, GST number, bill prefix (`BL`), and default rates (e.g. A4 Xerox rate, Spiral binding rate).

---

## 💾 Database Backup & Maintenance

Because SQLite stores all data in a single file, backup is as simple as copying one file:
- Database path: `data/xerox_shop.db`
- Recommended practice for low disk space: Periodically copy `data/xerox_shop.db` to a secondary USB drive or external folder.
