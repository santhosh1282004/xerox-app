import datetime
from repositories.database import get_db
from services.income_service import paise_to_rupees, rupees_to_paise

def generate_exp_number(conn):
    """Generate next expense number like EXP-089."""
    cursor = conn.cursor()
    cursor.execute("SELECT exp_number FROM expenses WHERE exp_number LIKE 'EXP-%';")
    rows = cursor.fetchall()
    max_num = 88
    for r in rows:
        val = r['exp_number']
        try:
            num = int(val.split('-')[1])
            if num > max_num:
                max_num = num
        except (ValueError, IndexError):
            pass
    return f"EXP-{max_num + 1:03d}"

def list_expenses(search='', categories=None, payment_methods=None, min_amt=None, max_amt=None, start_date=None, end_date=None, page=1, per_page=20, sort_by='time', sort_order='desc'):
    """Paginated list of expenses with SQL filters and sorting."""
    with get_db() as conn:
        cursor = conn.cursor()
        conditions = []
        params = []

        if search:
            search_pat = f"%{search.strip()}%"
            conditions.append("(exp_number LIKE ? OR description LIKE ? OR payee LIKE ? OR category LIKE ?)")
            params.extend([search_pat, search_pat, search_pat, search_pat])

        if categories and len(categories) > 0:
            placeholders = ",".join(["?"] * len(categories))
            conditions.append(f"category IN ({placeholders})")
            params.extend(categories)

        if payment_methods and len(payment_methods) > 0:
            placeholders = ",".join(["?"] * len(payment_methods))
            conditions.append(f"payment_method IN ({placeholders})")
            params.extend(payment_methods)

        if start_date:
            conditions.append("expense_date >= ?")
            params.append(f"{start_date} 00:00:00")

        if end_date:
            conditions.append("expense_date <= ?")
            params.append(f"{end_date} 23:59:59")

        if min_amt is not None and min_amt != '':
            conditions.append("amount_paise >= ?")
            params.append(rupees_to_paise(min_amt))

        if max_amt is not None and max_amt != '':
            conditions.append("amount_paise <= ?")
            params.append(rupees_to_paise(max_amt))

        where_clause = " WHERE " + " AND ".join(conditions) if conditions else ""

        # Count total
        count_query = f"SELECT COUNT(*) as total FROM expenses{where_clause};"
        cursor.execute(count_query, params)
        total_records = cursor.fetchone()['total']

        # Determine sorting clause
        direction = 'ASC' if str(sort_order).lower() == 'asc' else 'DESC'
        if sort_by == 'amount':
            order_clause = f"ORDER BY amount_paise {direction}, id {direction}"
        else:
            order_clause = f"ORDER BY expense_date {direction}, id {direction}"

        # Get items
        offset = (max(1, page) - 1) * per_page
        query = f"""
            SELECT * FROM expenses
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
                "exp_number": r['exp_number'],
                "expense_date": r['expense_date'],
                "category": r['category'],
                "description": r['description'],
                "amount": paise_to_rupees(r['amount_paise']),
                "payment_method": r['payment_method'],
                "payee": r['payee'] or '',
                "notes": r['notes'] or ''
            })

        total_pages = (total_records + per_page - 1) // per_page if total_records > 0 else 1

        return {
            "items": items,
            "total_records": total_records,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }

def create_expense(data):
    """Record a new shop expense."""
    with get_db() as conn:
        cursor = conn.cursor()
        exp_number = generate_exp_number(conn)
        exp_date = data.get('expense_date') or datetime.datetime.now().strftime('%Y-%m-%d %H:%M')
        if 'T' in exp_date:
            exp_date = exp_date.replace('T', ' ')

        category = data.get('category') or 'Paper'
        description = (data.get('description') or '').strip()
        amount_paise = rupees_to_paise(data.get('amount', 0))
        payment_method = data.get('payment_method') or 'Cash'
        payee = (data.get('payee') or '').strip()

        cursor.execute("""
            INSERT INTO expenses (exp_number, expense_date, category, description, amount_paise, payment_method, payee, notes)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?);
        """, (exp_number, exp_date, category, description, amount_paise, payment_method, payee, data.get('notes')))

        return {
            "id": cursor.lastrowid,
            "exp_number": exp_number,
            "amount": paise_to_rupees(amount_paise)
        }

def delete_expense(expense_id):
    """Move an expense record to the Recycle Bin preserving complete original data."""
    from services.recycle_bin_service import move_expense_to_recycle_bin
    success, res = move_expense_to_recycle_bin(expense_id)
    if success:
        return True, f"Expense moved to Recycle Bin (Deletion ID: {res})"
    return False, res

def get_expense(expense_id):
    """Retrieve a single expense by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expenses WHERE id = ?;", (expense_id,))
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r['id'],
            "exp_number": r['exp_number'],
            "expense_date": r['expense_date'],
            "category": r['category'],
            "description": r['description'],
            "amount": paise_to_rupees(r['amount_paise']),
            "payment_method": r['payment_method'],
            "payee": r['payee'] or '',
            "notes": r['notes'] or ''
        }

def update_expense(expense_id, data):
    """Update an existing expense record."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM expenses WHERE id = ?;", (expense_id,))
        existing = cursor.fetchone()
        if not existing:
            return False, "Expense not found."

        expense_date = data.get('expense_date') or existing['expense_date']
        if 'T' in expense_date:
            expense_date = expense_date.replace('T', ' ')

        category = data.get('category') or existing['category']
        description = (data.get('description') if data.get('description') is not None else existing['description']).strip()
        payee = (data.get('payee') if data.get('payee') is not None else existing['payee'] or '').strip()
        payment_method = data.get('payment_method') or existing['payment_method']
        notes = data.get('notes') if data.get('notes') is not None else existing['notes']

        if 'amount' in data and data.get('amount') is not None:
            amount_paise = rupees_to_paise(data.get('amount'))
        else:
            amount_paise = existing['amount_paise']

        cursor.execute("""
            UPDATE expenses
            SET expense_date = ?, category = ?, description = ?,
                amount_paise = ?, payment_method = ?, payee = ?, notes = ?
            WHERE id = ?;
        """, (expense_date, category, description, amount_paise, payment_method, payee, notes, expense_id))

        return True, {
            "id": expense_id,
            "exp_number": existing['exp_number'],
            "amount": paise_to_rupees(amount_paise)
        }

def get_spending_summary():
    """SQL aggregation for spending summary metrics."""
    now = datetime.datetime.now()
    today_str = now.strftime('%Y-%m-%d')
    this_month = now.strftime('%Y-%m')
    
    # Calculate last month string
    first_of_this_month = now.replace(day=1)
    last_month_date = first_of_this_month - datetime.timedelta(days=1)
    last_month = last_month_date.strftime('%Y-%m')

    with get_db() as conn:
        cursor = conn.cursor()

        # Today's total spending
        cursor.execute("SELECT COALESCE(SUM(amount_paise), 0) as total, description FROM expenses WHERE expense_date LIKE ? GROUP BY id ORDER BY id DESC LIMIT 1;", (f"{today_str}%",))
        row = cursor.fetchone()
        today_desc = row['description'] if row else "No expenses today"
        
        cursor.execute("SELECT COALESCE(SUM(amount_paise), 0) as total FROM expenses WHERE expense_date LIKE ?;", (f"{today_str}%",))
        today_spend = cursor.fetchone()['total']

        # This month's total spending
        cursor.execute("SELECT COALESCE(SUM(amount_paise), 0) as total, COUNT(*) as count FROM expenses WHERE expense_date LIKE ?;", (f"{this_month}%",))
        this_month_row = cursor.fetchone()
        this_month_spend = this_month_row['total']
        month_count = this_month_row['count']

        # Last month's total spending
        cursor.execute("SELECT COALESCE(SUM(amount_paise), 0) as total FROM expenses WHERE expense_date LIKE ?;", (f"{last_month}%",))
        last_month_spend = cursor.fetchone()['total']

        # % change vs last month
        pct_change = 0.0
        if last_month_spend > 0:
            pct_change = round(((this_month_spend - last_month_spend) / last_month_spend) * 100, 1)

        return {
            "today_spend": paise_to_rupees(today_spend),
            "today_desc": today_desc,
            "this_month_spend": paise_to_rupees(this_month_spend),
            "pct_vs_last_month": pct_change,
            "is_spend_reduction": pct_change <= 0,
            "month_transactions_count": month_count
        }
