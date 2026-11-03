import datetime
from repositories.database import get_db

def paise_to_rupees(paise):
    return (paise or 0) / 100.0

def rupees_to_paise(rupees):
    try:
        return int(round(float(rupees) * 100))
    except (ValueError, TypeError):
        return 0

def generate_tx_number(conn):
    """Generate next unique TX number by finding the max numeric suffix."""
    cursor = conn.cursor()
    cursor.execute("SELECT tx_number FROM income_transactions WHERE tx_number LIKE 'TX-%';")
    rows = cursor.fetchall()
    max_num = 1000
    for r in rows:
        val = r['tx_number']
        try:
            num = int(val.split('-')[1])
            if num > max_num:
                max_num = num
        except (IndexError, ValueError):
            pass
    return f"TX-{max_num + 1}"

def list_income(search='', start_date=None, end_date=None, min_amt=None, max_amt=None, categories=None, payment_methods=None, payment_status=None, page=1, per_page=20, sort_by='time', sort_order='desc'):
    """Paginated list of income transactions with SQL filtering and sorting."""
    with get_db() as conn:
        cursor = conn.cursor()
        conditions = []
        params = []

        if search:
            search_pattern = f"%{search.strip()}%"
            conditions.append("""(
                i.tx_number LIKE ? OR
                i.customer_name LIKE ? OR
                i.customer_phone LIKE ? OR
                i.description LIKE ? OR
                i.category LIKE ? OR
                i.bill_id IN (SELECT id FROM bills WHERE bill_number LIKE ?)
            )""")
            params.extend([search_pattern, search_pattern, search_pattern, search_pattern, search_pattern, search_pattern])

        if start_date:
            conditions.append("i.created_at >= ?")
            params.append(f"{start_date} 00:00:00")

        if end_date:
            conditions.append("i.created_at <= ?")
            params.append(f"{end_date} 23:59:59")

        if min_amt is not None and min_amt != '':
            conditions.append("i.amount_paise >= ?")
            params.append(rupees_to_paise(min_amt))

        if max_amt is not None and max_amt != '':
            conditions.append("i.amount_paise <= ?")
            params.append(rupees_to_paise(max_amt))

        if categories and len(categories) > 0:
            placeholders = ",".join(["?"] * len(categories))
            conditions.append(f"i.category IN ({placeholders})")
            params.extend(categories)

        if payment_methods and len(payment_methods) > 0:
            placeholders = ",".join(["?"] * len(payment_methods))
            conditions.append(f"i.payment_method IN ({placeholders})")
            params.extend(payment_methods)

        if payment_status:
            ps_clean = payment_status.strip().lower()
            if ps_clean in ('paid', 'not paid', 'unpaid'):
                if ps_clean in ('not paid', 'unpaid'):
                    conditions.append("(LOWER(i.payment_status) = 'not paid' OR LOWER(i.payment_status) = 'unpaid')")
                else:
                    conditions.append("LOWER(i.payment_status) = 'paid'")

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

        # Total count query
        count_query = f"SELECT COUNT(*) as total FROM income_transactions i{where_clause};"
        cursor.execute(count_query, params)
        total_records = cursor.fetchone()['total']

        # Determine sorting clause
        direction = 'ASC' if str(sort_order).lower() == 'asc' else 'DESC'
        if sort_by == 'amount':
            order_clause = f"ORDER BY i.amount_paise {direction}, i.id {direction}"
        else:
            order_clause = f"ORDER BY i.created_at {direction}, i.id {direction}"

        # Paginated items query
        offset = (max(1, page) - 1) * per_page
        query = f"""
            SELECT i.*, b.bill_number
            FROM income_transactions i
            LEFT JOIN bills b ON i.bill_id = b.id
            {where_clause}
            {order_clause}
            LIMIT ? OFFSET ?;
        """
        cursor.execute(query, params + [per_page, offset])
        rows = cursor.fetchall()

        items = []
        for r in rows:
            items.append({
                "id": r['id'],
                "tx_number": r['tx_number'],
                "created_at": r['created_at'],
                "customer_name": r['customer_name'] or 'Counter Walk-in',
                "customer_phone": r['customer_phone'] or '',
                "category": r['category'],
                "description": r['description'],
                "quantity": r['quantity'],
                "unit_rate": paise_to_rupees(r['unit_rate_paise']),
                "discount": paise_to_rupees(r['discount_paise']),
                "amount": paise_to_rupees(r['amount_paise']),
                "payment_method": r['payment_method'],
                "payment_status": r['payment_status'] if 'payment_status' in r.keys() and r['payment_status'] else 'Paid',
                "bill_id": r['bill_id'],
                "bill_number": r['bill_number'] or ''
            })

        total_pages = (total_records + per_page - 1) // per_page if total_records > 0 else 1

        # Calculate total unpaid bills amount and count across all active income records
        cursor.execute("""
            SELECT COALESCE(SUM(amount_paise), 0) as total, COUNT(*) as count
            FROM income_transactions
            WHERE LOWER(payment_status) = 'not paid' OR LOWER(payment_status) = 'unpaid';
        """)
        unpaid_row = cursor.fetchone()
        unpaid_total_paise = unpaid_row['total']
        unpaid_count = unpaid_row['count']

        return {
            "items": items,
            "total_records": total_records,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "unpaid_total": paise_to_rupees(unpaid_total_paise),
            "unpaid_count": unpaid_count
        }

def create_income(data):
    """Create a new income transaction and optional customer record."""
    with get_db() as conn:
        cursor = conn.cursor()
        tx_number = generate_tx_number(conn)
        created_at = data.get('created_at') or datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        # Normalize date
        if 'T' in created_at:
            created_at = created_at.replace('T', ' ')
        if len(created_at) == 16:
            # YYYY-MM-DD HH:MM
            pass

        cust_name = (data.get('customer_name') or '').strip()
        cust_phone = (data.get('customer_phone') or '').strip()
        cust_id = None

        if cust_name or cust_phone:
            cursor.execute("SELECT id FROM customers WHERE (phone = ? AND ? != '') OR (name = ? AND ? != '');",
                           (cust_phone, cust_phone, cust_name, cust_name))
            c_row = cursor.fetchone()
            if c_row:
                cust_id = c_row['id']
            else:
                cursor.execute("INSERT INTO customers (name, phone) VALUES (?, ?);", (cust_name or 'Walk-in Customer', cust_phone))
                cust_id = cursor.lastrowid

        category = data.get('category') or 'Xerox Services'
        description = (data.get('description') or category or 'Counter Xerox Print Service').strip()
        quantity = int(data.get('quantity') or 1)
        discount_paise = rupees_to_paise(data.get('discount', 0))
        if 'amount' in data and data.get('amount') is not None:
            amount_paise = rupees_to_paise(data.get('amount'))
            unit_rate_paise = rupees_to_paise(data.get('unit_rate')) if data.get('unit_rate') else (amount_paise + discount_paise) // max(1, quantity)
        else:
            unit_rate_paise = rupees_to_paise(data.get('unit_rate', 10))
            amount_paise = max(0, (quantity * unit_rate_paise) - discount_paise)
        payment_method = data.get('payment_method') or 'Cash'
        raw_status = (data.get('payment_status') or 'Paid').strip()
        payment_status = 'Not Paid' if raw_status.lower() in ['not paid', 'unpaid', 'pending'] else 'Paid'
        bill_id = data.get('bill_id')

        cursor.execute("""
            INSERT INTO income_transactions (
                tx_number, created_at, customer_id, customer_name, customer_phone,
                category, description, quantity, unit_rate_paise, discount_paise,
                amount_paise, payment_method, payment_status, bill_id, notes
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            tx_number, created_at, cust_id, cust_name or None, cust_phone or None,
            category, description, quantity, unit_rate_paise, discount_paise,
            amount_paise, payment_method, payment_status, bill_id, data.get('notes')
        ))

        new_id = cursor.lastrowid
        return {
            "id": new_id,
            "tx_number": tx_number,
            "amount": paise_to_rupees(amount_paise),
            "payment_status": payment_status
        }

def delete_income(income_id):
    """Move an income transaction to the Recycle Bin preserving complete original data."""
    from services.recycle_bin_service import move_income_to_recycle_bin
    success, res = move_income_to_recycle_bin(income_id)
    if success:
        return True, f"Transaction moved to Recycle Bin (Deletion ID: {res})"
    return False, res

def get_income(income_id):
    """Retrieve a single income transaction by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, b.bill_number
            FROM income_transactions i
            LEFT JOIN bills b ON i.bill_id = b.id
            WHERE i.id = ?;
        """, (income_id,))
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r['id'],
            "tx_number": r['tx_number'],
            "created_at": r['created_at'],
            "customer_name": r['customer_name'] or '',
            "customer_phone": r['customer_phone'] or '',
            "category": r['category'],
            "description": r['description'],
            "quantity": r['quantity'],
            "unit_rate": paise_to_rupees(r['unit_rate_paise']),
            "discount": paise_to_rupees(r['discount_paise']),
            "amount": paise_to_rupees(r['amount_paise']),
            "payment_method": r['payment_method'],
            "payment_status": r['payment_status'] if 'payment_status' in r.keys() and r['payment_status'] else 'Paid',
            "bill_id": r['bill_id'],
            "bill_number": r['bill_number'] or '',
            "notes": r['notes'] or ''
        }

def update_income(income_id, data):
    """Update an existing income transaction."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM income_transactions WHERE id = ?;", (income_id,))
        existing = cursor.fetchone()
        if not existing:
            return False, "Transaction not found."

        created_at = data.get('created_at') or existing['created_at']
        if 'T' in created_at:
            created_at = created_at.replace('T', ' ')

        category = data.get('category') or existing['category']
        description = (data.get('description') if data.get('description') is not None else existing['description']).strip()
        payment_method = data.get('payment_method') or existing['payment_method']
        
        if 'payment_status' in data and data.get('payment_status') is not None:
            raw_status = str(data.get('payment_status')).strip()
            payment_status = 'Not Paid' if raw_status.lower() in ['not paid', 'unpaid', 'pending'] else 'Paid'
        else:
            payment_status = existing['payment_status'] if 'payment_status' in existing.keys() and existing['payment_status'] else 'Paid'

        notes = data.get('notes') if data.get('notes') is not None else existing['notes']
        discount_paise = rupees_to_paise(data.get('discount', 0)) if ('discount' in data and data.get('discount') is not None) else existing['discount_paise']

        if 'amount' in data and data.get('amount') is not None:
            amount_paise = rupees_to_paise(data.get('amount'))
        else:
            amount_paise = existing['amount_paise']

        cursor.execute("""
            UPDATE income_transactions
            SET created_at = ?, category = ?, description = ?, discount_paise = ?,
                amount_paise = ?, payment_method = ?, payment_status = ?, notes = ?
            WHERE id = ?;
        """, (created_at, category, description, discount_paise, amount_paise, payment_method, payment_status, notes, income_id))

        if existing['bill_id']:
            cursor.execute("""
                UPDATE bills
                SET total_paise = ?, payment_method = ?, payment_status = ?
                WHERE id = ?;
            """, (amount_paise, payment_method, 'PAID' if payment_status == 'Paid' else 'NOT PAID', existing['bill_id']))

        return True, {
            "id": income_id,
            "tx_number": existing['tx_number'],
            "amount": paise_to_rupees(amount_paise),
            "payment_status": payment_status
        }

def get_today_summary():
    """Calculate real-time SQL metrics for today's counter display."""
    today = datetime.datetime.now().strftime('%Y-%m-%d')
    yesterday = (datetime.datetime.now() - datetime.timedelta(days=1)).strftime('%Y-%m-%d')

    with get_db() as conn:
        cursor = conn.cursor()

        # Today's total income
        cursor.execute("SELECT COALESCE(SUM(amount_paise), 0) as total, COUNT(*) as count FROM income_transactions WHERE created_at LIKE ?;", (f"{today}%",))
        today_row = cursor.fetchone()
        today_total_paise = today_row['total']
        today_count = today_row['count']

        # Yesterday's total income
        cursor.execute("SELECT COALESCE(SUM(amount_paise), 0) as total FROM income_transactions WHERE created_at LIKE ?;", (f"{yesterday}%",))
        yesterday_total_paise = cursor.fetchone()['total']

        # Percentage change
        pct_change = 0.0
        if yesterday_total_paise > 0:
            pct_change = round(((today_total_paise - yesterday_total_paise) / yesterday_total_paise) * 100, 1)
        elif today_total_paise > 0:
            pct_change = 100.0

        # Payment methods breakdown today
        cursor.execute("""
            SELECT payment_method, COUNT(*) as count
            FROM income_transactions
            WHERE created_at LIKE ?
            GROUP BY payment_method
            ORDER BY count DESC;
        """, (f"{today}%",))
        pm_rows = cursor.fetchall()
        pm_summary_list = [f"{r['count']} {r['payment_method']}" for r in pm_rows]
        pm_summary = " • ".join(pm_summary_list) if pm_summary_list else "0 Cash"

        # Bills generated today
        cursor.execute("SELECT COUNT(*) as count FROM bills WHERE created_at LIKE ?;", (f"{today}%",))
        today_bills_count = cursor.fetchone()['count']

        # Unpaid bills / income records (currently outstanding unpaid transactions)
        cursor.execute("""
            SELECT COALESCE(SUM(amount_paise), 0) as total, COUNT(*) as count
            FROM income_transactions
            WHERE LOWER(payment_status) = 'not paid' OR LOWER(payment_status) = 'unpaid';
        """)
        unpaid_row = cursor.fetchone()
        unpaid_total_paise = unpaid_row['total']
        unpaid_count = unpaid_row['count']

        return {
            "today_income": paise_to_rupees(today_total_paise),
            "pct_vs_yesterday": pct_change,
            "is_increase": pct_change >= 0,
            "transactions_count": today_count,
            "payment_methods_summary": pm_summary,
            "bills_count": today_bills_count,
            "unpaid_total": paise_to_rupees(unpaid_total_paise),
            "unpaid_count": unpaid_count
        }
