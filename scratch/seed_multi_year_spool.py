import sqlite3
import random
from datetime import datetime, timedelta

def seed_years():
    conn = sqlite3.connect('data/xerox_shop.db')
    cur = conn.cursor()

    cur.execute("SELECT MAX(id) FROM income_transactions")
    max_id = cur.fetchone()[0] or 100

    sample_items = [
        ("Xerox Services", "B&W Xerox A4 (50 copies)", 50, 150, 7500),
        ("Xerox Services", "Engineering Drawing Color Prints", 5, 2500, 12500),
        ("Xerox Services", "Spiral Binding with OHP Sheets (3 sets)", 3, 6000, 18000),
        ("Xerox Services", "Legal Document Duplex Copies (40 pages)", 40, 200, 8000),
        ("Xerox Services", "A4 High Speed Duplex Booklet Printing", 1, 35000, 35000),
        ("Product Sales", "A4 Thermal Lamination Pouches (Pack)", 2, 2500, 5000),
        ("Product Sales", "Executive Project File Folders", 4, 5000, 20000),
        ("Xerox Services", "Passport Size Photos (8 copies sheet)", 2, 8000, 16000),
        ("Xerox Services", "Project Thesis Binding & Golden Emboss", 2, 12000, 24000),
        ("Product Sales", "Stationery Kit (Stapler, Pins, Tape)", 1, 15000, 15000),
        ("Xerox Services", "Color Brochure Glossy Prints", 15, 1200, 18000),
        ("Xerox Services", "Syllabus Notes Spiral Binding", 4, 5500, 22000),
        ("Product Sales", "Glossy Photo Paper Ream (50 sheets)", 1, 45000, 45000),
        ("Xerox Services", "Identity Card Front & Back Lamination", 6, 2000, 12000),
        ("Xerox Services", "University Exam Question Paper Xerox (200)", 200, 150, 30000),
    ]

    customers = [
        "Suresh Kumar", "Kavita Reddy", "Deepa Verma", "Srikanth G",
        "Manoj Tiwari", "Pooja Hegde", "City College Dept", "Alok Gupta",
        "Divya M", "Global Enterprises", "Mahesh Iyer", "Harish K",
        "Ramesh Babu", "Praveen Kumar", "Nandhini Devi", "Vignesh Shivan"
    ]

    pay_methods = ["Cash", "UPI", "Card"]

    # Generate 28 entries for 2024 spread across Jan-Dec
    tx_counter = 2000
    rows_to_insert = []

    # 2024 entries
    for month in range(1, 13):
        days_in_month = [5, 12, 19, 26] if month % 2 == 0 else [8, 15, 22]
        for day in days_in_month:
            cat, desc, qty, rate, amt = random.choice(sample_items)
            cust = random.choice(customers)
            pay = random.choice(pay_methods)
            h = random.randint(9, 19)
            m = random.randint(10, 55)
            dt_str = f"2024-{month:02d}-{day:02d} {h:02d}:{m:02d}"
            tx_code = f"TX-{tx_counter}"
            tx_counter += 1
            rows_to_insert.append((tx_code, dt_str, cust, cat, desc, qty, rate, 0, amt, pay, 'Paid'))

    # 2025 entries (40 entries spread across Jan-Dec)
    for month in range(1, 13):
        days_in_month = [3, 10, 17, 24]
        for day in days_in_month:
            cat, desc, qty, rate, amt = random.choice(sample_items)
            cust = random.choice(customers)
            pay = random.choice(pay_methods)
            h = random.randint(9, 19)
            m = random.randint(10, 55)
            dt_str = f"2025-{month:02d}-{day:02d} {h:02d}:{m:02d}"
            tx_code = f"TX-{tx_counter}"
            tx_counter += 1
            rows_to_insert.append((tx_code, dt_str, cust, cat, desc, qty, rate, 0, amt, pay, 'Paid'))

    # Check if 2025 already has records
    cur.execute("SELECT COUNT(*) FROM income_transactions WHERE strftime('%Y', created_at) = '2025'")
    c2025 = cur.fetchone()[0]

    cur.execute("SELECT COUNT(*) FROM income_transactions WHERE strftime('%Y', created_at) = '2024'")
    c2024 = cur.fetchone()[0]

    inserted = 0
    for r in rows_to_insert:
        yr = r[1][:4]
        if (yr == '2024' and c2024 <= 1) or (yr == '2025' and c2025 == 0):
            cur.execute("""
                INSERT INTO income_transactions (
                    tx_number, created_at, customer_name, category, description,
                    quantity, unit_rate_paise, discount_paise, amount_paise, payment_method, payment_status
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, r)
            inserted += 1

    conn.commit()
    print(f"Successfully inserted {inserted} multi-year sample transactions.")

    cur.execute("SELECT strftime('%Y', created_at) as yr, COUNT(*) FROM income_transactions GROUP BY yr ORDER BY yr DESC")
    print("New counts by year:", cur.fetchall())

if __name__ == '__main__':
    seed_years()
