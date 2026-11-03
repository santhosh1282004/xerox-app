import sqlite3
import os
from contextlib import contextmanager

DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'data')
DB_PATH = os.path.join(DB_DIR, 'xerox_shop.db')

def get_db_connection():
    """Create a new SQLite connection with foreign keys and WAL mode."""
    os.makedirs(DB_DIR, exist_ok=True)
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    conn.execute("PRAGMA journal_mode = WAL;")
    conn.execute("PRAGMA synchronous = NORMAL;")
    return conn

@contextmanager
def get_db():
    """Context manager for safe database transactions."""
    conn = get_db_connection()
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()

def init_db():
    """Initialize database tables, indexes, and initial settings."""
    os.makedirs(DB_DIR, exist_ok=True)
    with get_db() as conn:
        cursor = conn.cursor()

        # 1. Settings Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS settings (
                id INTEGER PRIMARY KEY CHECK (id = 1),
                shop_name TEXT NOT NULL DEFAULT 'Sri Sakthi Xerox',
                tagline TEXT DEFAULT 'Precision Xerox & Digital Printing Services',
                address TEXT DEFAULT 'Sri Mariamman Building, Thuraiyur Main Road, N.Kosavampatti, Bharathiar Nagar, Namakkal, Tamil Nadu 637002',
                phone TEXT DEFAULT '+91 7010146966',
                bill_prefix TEXT DEFAULT 'BL',
                tax_invoiced INTEGER DEFAULT 1,
                gst_number TEXT DEFAULT '29ABCDE1234F1Z5',
                default_xerox_rate_paise INTEGER DEFAULT 150,
                default_binding_rate_paise INTEGER DEFAULT 6000,
                printer_model TEXT DEFAULT 'PrimeLink C9070',
                terminal_id TEXT DEFAULT 'Admin Terminal #04'
            );
        """)

        # 2. Customers Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS customers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                phone TEXT,
                address TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # 3. Bills Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bill_number TEXT UNIQUE NOT NULL,
                customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
                customer_name TEXT NOT NULL,
                customer_phone TEXT,
                created_at TEXT NOT NULL,
                subtotal_paise INTEGER NOT NULL,
                discount_paise INTEGER NOT NULL DEFAULT 0,
                extra_charges_paise INTEGER NOT NULL DEFAULT 0,
                total_paise INTEGER NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'Cash',
                payment_status TEXT NOT NULL DEFAULT 'PAID',
                notes TEXT
            );
        """)

        # 4. Bill Items Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bill_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                bill_id INTEGER NOT NULL REFERENCES bills(id) ON DELETE CASCADE,
                item_name TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                rate_paise INTEGER NOT NULL,
                line_total_paise INTEGER NOT NULL
            );
        """)

        # 5. Income Transactions Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS income_transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                tx_number TEXT UNIQUE NOT NULL,
                created_at TEXT NOT NULL,
                customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
                customer_name TEXT,
                customer_phone TEXT,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                quantity INTEGER NOT NULL DEFAULT 1,
                unit_rate_paise INTEGER NOT NULL,
                discount_paise INTEGER NOT NULL DEFAULT 0,
                amount_paise INTEGER NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'Cash',
                payment_status TEXT NOT NULL DEFAULT 'Paid',
                bill_id INTEGER REFERENCES bills(id) ON DELETE SET NULL,
                notes TEXT
            );
        """)

        # 6. Expenses Table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS expenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                exp_number TEXT UNIQUE NOT NULL,
                expense_date TEXT NOT NULL,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                amount_paise INTEGER NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'Cash',
                payee TEXT,
                notes TEXT
            );
        """)

        # 7. Products Table (Product & Service Catalog)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                product_code TEXT UNIQUE NOT NULL,
                name TEXT NOT NULL,
                price_paise INTEGER NOT NULL,
                category TEXT DEFAULT 'Xerox Services',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        """)

        # Migration: Ensure product_code exists on bill_items
        cursor.execute("PRAGMA table_info(bill_items);")
        columns = [row['name'] for row in cursor.fetchall()]
        if 'product_code' not in columns:
            cursor.execute("ALTER TABLE bill_items ADD COLUMN product_code TEXT;")

        # Migration: Ensure payment_status exists on income_transactions
        cursor.execute("PRAGMA table_info(income_transactions);")
        inc_columns = [row['name'] for row in cursor.fetchall()]
        if 'payment_status' not in inc_columns:
            cursor.execute("ALTER TABLE income_transactions ADD COLUMN payment_status TEXT NOT NULL DEFAULT 'Paid';")

        # 8. Recycle Bin Table (Preserves full original data, deletion timestamp, and fixed deletion ID)
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS recycle_bin (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                deletion_id TEXT UNIQUE NOT NULL,
                record_type TEXT NOT NULL,
                original_id INTEGER NOT NULL,
                record_identifier TEXT NOT NULL,
                deleted_at TEXT NOT NULL,
                customer_or_payee TEXT,
                category TEXT NOT NULL,
                description TEXT NOT NULL,
                amount_paise INTEGER NOT NULL,
                payment_method TEXT NOT NULL DEFAULT 'Cash',
                original_date TEXT NOT NULL,
                record_data_json TEXT NOT NULL
            );
        """)

        cursor.execute("CREATE INDEX IF NOT EXISTS idx_income_created_at ON income_transactions(created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_income_category ON income_transactions(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_income_bill_id ON income_transactions(bill_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_number ON bills(bill_number);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_created_at ON bills(created_at);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bills_customer ON bills(customer_name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_bill_items_bill_id ON bill_items(bill_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_code ON products(product_code);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_products_name ON products(name);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recycle_type ON recycle_bin(record_type);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recycle_del_id ON recycle_bin(deletion_id);")
        cursor.execute("CREATE INDEX IF NOT EXISTS idx_recycle_deleted_at ON recycle_bin(deleted_at);")

        # Ensure default settings row exists
        cursor.execute("SELECT COUNT(*) as count FROM settings;")
        if cursor.fetchone()['count'] == 0:
            cursor.execute("""
                INSERT INTO settings (id, shop_name, tagline, address, phone, bill_prefix, tax_invoiced, gst_number)
                VALUES (1, 'Sri Sakthi Xerox', 'Precision Xerox & Digital Printing Services', 'Sri Mariamman Building, Thuraiyur Main Road, N.Kosavampatti, Bharathiar Nagar, Namakkal, Tamil Nadu 637002', '+91 7010146966', 'BL', 1, '');
            """)

        # Ensure seed products exist
        cursor.execute("SELECT COUNT(*) as count FROM products;")
        if cursor.fetchone()['count'] == 0:
            seed_products(conn)

        # Check if seed data is needed
        cursor.execute("SELECT COUNT(*) as count FROM income_transactions;")
        if cursor.fetchone()['count'] == 0:
            seed_initial_data(conn)

def seed_products(conn):
    """Seed initial Xerox and printing shop product/service catalog items."""
    products = [
        ("PRD-101", "B&W Xerox A4", 150, "Xerox Services"),
        ("PRD-102", "Color Print A4", 1000, "Xerox Services"),
        ("PRD-103", "Legal Size Xerox", 200, "Xerox Services"),
        ("PRD-104", "Spiral Binding", 6000, "Xerox Services"),
        ("PRD-105", "A4 Lamination Pouch", 2500, "Product Sales"),
        ("PRD-106", "Executive Project File Folder", 5000, "Product Sales"),
        ("PRD-107", "Glossy Photo Print (Passport 8x)", 8000, "Xerox Services"),
        ("PRD-108", "Soft Cover Book Binding", 12000, "Xerox Services"),
    ]
    cursor = conn.cursor()
    for code, name, price, cat in products:
        cursor.execute("""
            INSERT OR IGNORE INTO products (product_code, name, price_paise, category)
            VALUES (?, ?, ?, ?);
        """, (code, name, price, cat))

def seed_initial_data(conn):
    """Seed realistic initial data for immediate usability matching the prototype design."""
    import datetime
    now = datetime.datetime.now()
    today_str = now.strftime('%Y-%m-%d')
    today_time = now.strftime('%Y-%m-%d %H:%M')

    # Seed Bills & Linked Income Transactions
    seed_bills = [
        {
            "num": "BL-2024-1082",
            "date": f"{today_str} 10:14",
            "cust_name": "Ramesh Chandra",
            "cust_phone": "+91 98765 43210",
            "items": [
                {"name": "B&W Xerox A4", "qty": 160, "rate": 150, "total": 24000}
            ],
            "subtotal": 24000,
            "disc": 0,
            "extra": 0,
            "total": 24000,
            "pay": "UPI",
            "cat": "Xerox Services",
            "desc": "B&W Xerox A4 (160 pages)"
        },
        {
            "num": "BL-2024-1081",
            "date": f"{today_str} 09:45",
            "cust_name": "Priya Sharma",
            "cust_phone": "+91 98123 45678",
            "items": [
                {"name": "Color Print A4", "qty": 30, "rate": 1000, "total": 30000},
                {"name": "Spiral Binding", "qty": 2, "rate": 7500, "total": 15000}
            ],
            "subtotal": 45000,
            "disc": 0,
            "extra": 0,
            "total": 45000,
            "pay": "Cash",
            "cat": "Combo Services",
            "desc": "Color Print A4 & Spiral Binding combo"
        },
        {
            "num": "BL-2024-1080",
            "date": f"{today_str} 09:12",
            "cust_name": "Vikram Patel",
            "cust_phone": "+91 97234 56789",
            "items": [
                {"name": "Executive Project File Folder", "qty": 7, "rate": 5000, "total": 35000}
            ],
            "subtotal": 35000,
            "disc": 0,
            "extra": 0,
            "total": 35000,
            "pay": "UPI",
            "cat": "Product Sales",
            "desc": "Executive Project File Folders"
        },
        {
            "num": "BL-2024-1079",
            "date": f"{today_str} 08:50",
            "cust_name": "Ananya Sen",
            "cust_phone": "+91 98450 11223",
            "items": [
                {"name": "Legal Size Xerox", "qty": 90, "rate": 200, "total": 18000}
            ],
            "subtotal": 18000,
            "disc": 0,
            "extra": 0,
            "total": 18000,
            "pay": "Cash",
            "cat": "Xerox Services",
            "desc": "Legal Size Xerox Documentation"
        },
        {
            "num": "BL-2024-1078",
            "date": (now - datetime.timedelta(days=1)).strftime('%Y-%m-%d 19:40'),
            "cust_name": "Tech Corp Solutions",
            "cust_phone": "+91 99000 88877",
            "items": [
                {"name": "Manual Binding & Printing", "qty": 14, "rate": 8000, "total": 112000}
            ],
            "subtotal": 112000,
            "disc": 0,
            "extra": 0,
            "total": 112000,
            "pay": "Card",
            "cat": "Xerox Services",
            "desc": "Company Training Manuals"
        }
    ]

    cursor = conn.cursor()
    tx_idx = 1042
    for b in seed_bills:
        # Insert customer if not present
        cursor.execute("SELECT id FROM customers WHERE name = ? AND phone = ?;", (b["cust_name"], b["cust_phone"]))
        cust_row = cursor.fetchone()
        if cust_row:
            cust_id = cust_row[0]
        else:
            cursor.execute("INSERT INTO customers (name, phone) VALUES (?, ?);", (b["cust_name"], b["cust_phone"]))
            cust_id = cursor.lastrowid

        # Insert bill
        cursor.execute("""
            INSERT INTO bills (bill_number, customer_id, customer_name, customer_phone, created_at, subtotal_paise, discount_paise, extra_charges_paise, total_paise, payment_method, payment_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID');
        """, (b["num"], cust_id, b["cust_name"], b["cust_phone"], b["date"], b["subtotal"], b["disc"], b["extra"], b["total"], b["pay"]))
        bill_id = cursor.lastrowid

        # Insert bill items
        for it in b["items"]:
            cursor.execute("""
                INSERT INTO bill_items (bill_id, item_name, quantity, rate_paise, line_total_paise)
                VALUES (?, ?, ?, ?, ?);
            """, (bill_id, it["name"], it["qty"], it["rate"], it["total"]))

        # Insert income transaction linked to bill
        tx_code = f"TX-{tx_idx}"
        cursor.execute("""
            INSERT INTO income_transactions (tx_number, created_at, customer_id, customer_name, customer_phone, category, description, quantity, unit_rate_paise, discount_paise, amount_paise, payment_method, bill_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (tx_code, b["date"], cust_id, b["cust_name"], b["cust_phone"], b["cat"], b["desc"], 1, b["total"], 0, b["total"], b["pay"], bill_id))
        tx_idx -= 1

    # Add historical income transactions across recent days for realistic analytics
    historical_entries = [
        # (days_ago, hour, cust, cat, desc, amount_paise, pay)
        (2, "11:20", "Suresh Kumar", "Xerox Services", "A4 Duplex Copy (120)", 18000, "Cash"),
        (2, "14:15", "Kavita Reddy", "Product Sales", "Lamination Pouches & Pen Set", 25000, "UPI"),
        (3, "10:30", "Apex Academy", "Combo Services", "Student Exam Question Papers", 65000, "UPI"),
        (3, "16:45", "Naveen Raj", "Xerox Services", "Color Print Certificate", 15000, "Cash"),
        (4, "09:50", "Deepa Verma", "Product Sales", "Document Organizer Files", 22000, "UPI"),
        (5, "12:10", "Srikanth G", "Xerox Services", "Project Report Spiral Binding", 38000, "Card"),
        (6, "15:30", "Manoj Tiwari", "Combo Services", "Architectural Blueprints & Copier", 72000, "UPI"),
        (7, "11:00", "Pooja Hegde", "Xerox Services", "Bulk Question Bank Copies", 48000, "Cash"),
        (10, "10:20", "City College Dept", "Xerox Services", "Syllabus Copy Packets", 95000, "Card"),
        (14, "16:00", "Alok Gupta", "Combo Services", "ID Card Printing & Lamination", 32000, "UPI"),
        (18, "13:40", "Divya M", "Product Sales", "Spiral Wire Reams & Covers", 41000, "Cash"),
        (22, "11:15", "Global Enterprises", "Combo Services", "Conference Brochures & Badges", 125000, "UPI"),
        (25, "14:50", "Mahesh Iyer", "Xerox Services", "Thesis Duplex Printing (3 copies)", 84000, "UPI"),
        (28, "17:30", "Harish K", "Product Sales", "Stationery & File Folders", 19000, "Cash"),
    ]
    for days_ago, h_m, cust, cat, desc, amt, pay in historical_entries:
        date_str = (now - datetime.timedelta(days=days_ago)).strftime('%Y-%m-%d') + f" {h_m}"
        tx_code = f"TX-{tx_idx}"
        cursor.execute("""
            INSERT INTO income_transactions (tx_number, created_at, customer_name, category, description, quantity, unit_rate_paise, discount_paise, amount_paise, payment_method)
            VALUES (?, ?, ?, ?, ?, 1, ?, 0, ?, ?);
        """, (tx_code, date_str, cust, cat, desc, amt, amt, pay))
        tx_idx -= 1

    # Seed Expenses matching shop verticals
    seed_expenses = [
        {"exp": "EXP-088", "days_ago": 3, "time": "16:30", "cat": "Paper", "desc": "JK Copier A4 Paper (5 boxes)", "amt": 420000, "pay": "UPI", "payee": "Sri Balaji Paper Mart"},
        {"exp": "EXP-087", "days_ago": 7, "time": "14:15", "cat": "Toner / Ink", "desc": "Xerox High Yield Black Toner 006R01731", "amt": 380000, "pay": "Bank IMPS", "payee": "PrintTech Solutions"},
        {"exp": "EXP-086", "days_ago": 11, "time": "11:00", "cat": "EB Bill", "desc": "Shop Electricity Bill - Commercial Power", "amt": 215000, "pay": "NetBanking", "payee": "State Electricity Board"},
        {"exp": "EXP-085", "days_ago": 15, "time": "17:20", "cat": "Spirals", "desc": "Spiral Binding Coils & Covers", "amt": 85000, "pay": "Cash", "payee": "Metro Stationery Wholesale"},
        {"exp": "EXP-084", "days_ago": 20, "time": "13:10", "cat": "Service Charges", "desc": "Drum Unit Periodic Servicing & Roller Cleaning", "amt": 150000, "pay": "UPI", "payee": "Xerox Certified Technician"},
        {"exp": "EXP-083", "days_ago": 24, "time": "11:30", "cat": "Shop Rent", "desc": "Shop Monthly Rent", "amt": 1200000, "pay": "Bank IMPS", "payee": "Shop Owner"},
        {"exp": "EXP-082", "days_ago": 26, "time": "15:45", "cat": "Photo Sheets", "desc": "Glossy 4x6 & A4 Photo Paper Packs", "amt": 125000, "pay": "UPI", "payee": "Kodak Paper Mart"},
        {"exp": "EXP-081", "days_ago": 28, "time": "10:15", "cat": "Stationery Items", "desc": "Stapler Pins, Scissors, Tapes & Cutters", "amt": 65000, "pay": "Cash", "payee": "City Stationery"}
    ]
    for e in seed_expenses:
        exp_date = (now - datetime.timedelta(days=e["days_ago"])).strftime('%Y-%m-%d') + f" {e['time']}"
        cursor.execute("""
            INSERT INTO expenses (exp_number, expense_date, category, description, amount_paise, payment_method, payee)
            VALUES (?, ?, ?, ?, ?, ?, ?);
        """, (e["exp"], exp_date, e["cat"], e["desc"], e["amt"], e["pay"], e["payee"]))

if __name__ == '__main__':
    print("Initializing Sri Sakthi Xerox SQLite database...")
    init_db()
    print(f"Database ready at: {DB_PATH}")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r['name'] for r in cursor.fetchall()]
        print("Database Tables & Row Counts:")
        for t in tables:
            cursor.execute(f"SELECT COUNT(*) as cnt FROM {t};")
            count = cursor.fetchone()['cnt']
            print(f"  - {t:<20}: {count} records")

