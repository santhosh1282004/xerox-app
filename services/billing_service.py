import datetime
from repositories.database import get_db
from services.income_service import paise_to_rupees, rupees_to_paise, generate_tx_number

def generate_bill_number(conn):
    """Generate next bill number like BL-YYYY-1083."""
    year = datetime.datetime.now().strftime('%Y')
    cursor = conn.cursor()
    cursor.execute("SELECT bill_prefix FROM settings WHERE id = 1;")
    s_row = cursor.fetchone()
    prefix = s_row['bill_prefix'] if s_row and s_row['bill_prefix'] else 'BL'

    cursor.execute("SELECT bill_number FROM bills WHERE bill_number LIKE ?;", (f"{prefix}-{year}-%",))
    rows = cursor.fetchall()
    max_seq = 1082
    for r in rows:
        val = r['bill_number']
        try:
            parts = val.split('-')
            seq = int(parts[-1])
            if seq > max_seq:
                max_seq = seq
        except (ValueError, IndexError):
            pass
    return f"{prefix}-{year}-{max_seq + 1}"

def create_bill(data):
    """
    Create a bill with its line items and automatically record the corresponding
    income transaction linked to the bill in an atomic transaction.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        bill_number = generate_bill_number(conn)
        created_at = data.get('created_at') or datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        if 'T' in created_at:
            created_at = created_at.replace('T', ' ')

        cust_name = (data.get('customer_name') or 'Walk-in Customer').strip()
        cust_phone = (data.get('customer_phone') or '').strip()

        # Find or create customer
        cust_id = None
        if cust_name or cust_phone:
            cursor.execute("SELECT id FROM customers WHERE (phone = ? AND ? != '') OR (name = ? AND ? != '');",
                           (cust_phone, cust_phone, cust_name, cust_name))
            c_row = cursor.fetchone()
            if c_row:
                cust_id = c_row['id']
            else:
                cursor.execute("INSERT INTO customers (name, phone) VALUES (?, ?);", (cust_name, cust_phone))
                cust_id = cursor.lastrowid

        items = data.get('items') or []
        subtotal_paise = 0
        has_xerox = False
        has_product = False

        for it in items:
            qty = int(it.get('qty', 1))
            rate_paise = rupees_to_paise(it.get('rate', 0))
            line_tot_paise = qty * rate_paise
            subtotal_paise += line_tot_paise

            name_lower = (it.get('name') or '').lower()
            if any(k in name_lower for k in ['xerox', 'copy', 'print', 'binding', 'scan', 'lamination']):
                has_xerox = True
            else:
                has_product = True

        disc_paise = rupees_to_paise(data.get('discount', 0))
        extra_paise = rupees_to_paise(data.get('extra_charges', 0))
        total_paise = max(0, subtotal_paise - disc_paise + extra_paise)
        payment_method = data.get('payment_method') or 'Cash'

        # Insert Bill
        cursor.execute("""
            INSERT INTO bills (
                bill_number, customer_id, customer_name, customer_phone,
                created_at, subtotal_paise, discount_paise, extra_charges_paise,
                total_paise, payment_method, payment_status, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'PAID', ?);
        """, (
            bill_number, cust_id, cust_name, cust_phone,
            created_at, subtotal_paise, disc_paise, extra_paise,
            total_paise, payment_method, data.get('notes')
        ))
        bill_id = cursor.lastrowid

        # Insert Line Items
        for it in items:
            qty = int(it.get('qty', 1))
            rate_paise = rupees_to_paise(it.get('rate', 0))
            line_tot_paise = qty * rate_paise
            raw_code = it.get('product_id') or it.get('product_code') or ''
            prod_code = str(raw_code).strip() if raw_code else None
            cursor.execute("""
                INSERT INTO bill_items (bill_id, product_code, item_name, quantity, rate_paise, line_total_paise)
                VALUES (?, ?, ?, ?, ?, ?);
            """, (bill_id, prod_code, it.get('name') or 'Service Item', qty, rate_paise, line_tot_paise))

        # Determine Category
        if has_xerox and has_product:
            cat = 'Combo Services'
        elif has_product:
            cat = 'Product Sales'
        else:
            cat = 'Xerox Services'

        # Generate TX Number
        next_tx = generate_tx_number(conn)

        # Build combined description
        item_names = [f"{it.get('qty', 1)}x {it.get('name')}" for it in items[:2]]
        desc_summary = ", ".join(item_names) if item_names else "Counter Service"
        if len(items) > 2:
            desc_summary += f" (+{len(items) - 2} more)"

        total_qty = sum(int(it.get('qty', 1)) for it in items)
        unit_rate_paise = (subtotal_paise // max(1, total_qty)) if total_qty > 0 else 0

        # Insert linked income transaction
        cursor.execute("""
            INSERT INTO income_transactions (
                tx_number, created_at, customer_id, customer_name, customer_phone,
                category, description, quantity, unit_rate_paise, discount_paise,
                amount_paise, payment_method, payment_status, bill_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            next_tx, created_at, cust_id, cust_name, cust_phone,
            cat, desc_summary, total_qty, unit_rate_paise, disc_paise,
            total_paise, payment_method, 'Paid', bill_id
        ))

        return {
            "bill_id": bill_id,
            "bill_number": bill_number,
            "total": paise_to_rupees(total_paise),
            "customer_name": cust_name,
            "created_at": created_at
        }

def get_bill(bill_id):
    """Retrieve full bill details with items and shop settings for printing."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM bills WHERE id = ? OR bill_number = ?;", (bill_id, bill_id))
        bill = cursor.fetchone()
        if not bill:
            return None

        cursor.execute("SELECT * FROM bill_items WHERE bill_id = ? ORDER BY id ASC;", (bill['id'],))
        items_rows = cursor.fetchall()

        cursor.execute("SELECT * FROM settings WHERE id = 1;")
        settings = cursor.fetchone()

        items = []
        for it in items_rows:
            items.append({
                "id": it['id'],
                "product_code": it['product_code'] or '',
                "item_name": it['item_name'],
                "quantity": it['quantity'],
                "rate": paise_to_rupees(it['rate_paise']),
                "line_total": paise_to_rupees(it['line_total_paise'])
            })

        return {
            "id": bill['id'],
            "bill_number": bill['bill_number'],
            "customer_name": bill['customer_name'],
            "customer_phone": bill['customer_phone'] or '',
            "created_at": bill['created_at'],
            "subtotal": paise_to_rupees(bill['subtotal_paise']),
            "discount": paise_to_rupees(bill['discount_paise']),
            "extra_charges": paise_to_rupees(bill['extra_charges_paise']),
            "total": paise_to_rupees(bill['total_paise']),
            "payment_method": bill['payment_method'],
            "payment_status": bill['payment_status'],
            "items": items,
            "shop": {
                "name": settings['shop_name'] if settings else 'Sri Sakthi Xerox',
                "tagline": settings['tagline'] if settings else 'Precision Xerox & Digital Printing Services',
                "address": settings['address'] if settings else 'Sri Mariamman Building, Thuraiyur Main Road, Namakkal',
                "phone": settings['phone'] if settings else '+91 7010146966',
                "gst_number": settings['gst_number'] if settings else ''
            }
        }
