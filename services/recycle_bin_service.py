import json
import datetime
from repositories.database import get_db

def paise_to_rupees(paise: int) -> float:
    """Convert integer paise to float rupees."""
    return round(paise / 100.0, 2)

def generate_deletion_id(conn, record_type: str) -> str:
    """
    Generate a fixed, unique deletion ID like DEL-INC-2026-0001 or DEL-EXP-2026-0001.
    This ID remains permanent and unchanged for the lifetime of the record in the Recycle Bin.
    """
    prefix = "DEL-INC" if record_type == "income" else "DEL-EXP"
    year = datetime.datetime.now().year
    cursor = conn.cursor()
    cursor.execute("""
        SELECT deletion_id FROM recycle_bin
        WHERE deletion_id LIKE ?
        ORDER BY id DESC LIMIT 1;
    """, (f"{prefix}-{year}-%",))
    row = cursor.fetchone()
    if row and row['deletion_id']:
        try:
            last_num = int(row['deletion_id'].split('-')[-1])
            next_num = last_num + 1
        except Exception:
            next_num = 1
    else:
        cursor.execute("SELECT COUNT(*) as count FROM recycle_bin WHERE record_type = ?;", (record_type,))
        next_num = cursor.fetchone()['count'] + 1
    return f"{prefix}-{year}-{next_num:04d}"

def move_income_to_recycle_bin(income_id: int):
    """
    Move an income transaction to the Recycle Bin.
    Preserves all original fields, amounts, customer details, and linked bill items.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT i.*, b.bill_number, b.subtotal_paise as bill_subtotal_paise,
                   b.discount_paise as bill_discount_paise, b.extra_charges_paise as bill_extra_paise,
                   b.total_paise as bill_total_paise, b.created_at as bill_created_at
            FROM income_transactions i
            LEFT JOIN bills b ON i.bill_id = b.id
            WHERE i.id = ?;
        """, (income_id,))
        row = cursor.fetchone()
        if not row:
            return False, "Transaction not found"

        # Preserve linked bill items if any
        bill_items = []
        if row['bill_id']:
            cursor.execute("""
                SELECT product_code, item_name, quantity, rate_paise, line_total_paise
                FROM bill_items
                WHERE bill_id = ?;
            """, (row['bill_id'],))
            for bit in cursor.fetchall():
                bill_items.append({
                    "product_code": bit['product_code'],
                    "item_name": bit['item_name'],
                    "quantity": bit['quantity'],
                    "rate_paise": bit['rate_paise'],
                    "rate": paise_to_rupees(bit['rate_paise']),
                    "line_total_paise": bit['line_total_paise'],
                    "line_total": paise_to_rupees(bit['line_total_paise'])
                })

        # Complete original data dictionary
        original_data = {
            "id": row['id'],
            "tx_number": row['tx_number'],
            "created_at": row['created_at'],
            "customer_id": row['customer_id'],
            "customer_name": row['customer_name'] or 'Walk-in Customer',
            "customer_phone": row['customer_phone'] or '',
            "category": row['category'],
            "description": row['description'],
            "quantity": row['quantity'],
            "unit_rate_paise": row['unit_rate_paise'],
            "unit_rate": paise_to_rupees(row['unit_rate_paise']),
            "discount_paise": row['discount_paise'],
            "discount": paise_to_rupees(row['discount_paise']),
            "amount_paise": row['amount_paise'],
            "amount": paise_to_rupees(row['amount_paise']),
            "payment_method": row['payment_method'],
            "payment_status": row['payment_status'] if 'payment_status' in row.keys() and row['payment_status'] else 'Paid',
            "bill_id": row['bill_id'],
            "bill_number": row['bill_number'] or '',
            "notes": row['notes'] or '',
            "bill_details": {
                "bill_number": row['bill_number'],
                "subtotal": paise_to_rupees(row['bill_subtotal_paise']) if row['bill_subtotal_paise'] is not None else None,
                "discount": paise_to_rupees(row['bill_discount_paise']) if row['bill_discount_paise'] is not None else None,
                "extra_charges": paise_to_rupees(row['bill_extra_paise']) if row['bill_extra_paise'] is not None else None,
                "total": paise_to_rupees(row['bill_total_paise']) if row['bill_total_paise'] is not None else None,
                "items": bill_items
            } if row['bill_id'] else None
        }

        del_id = generate_deletion_id(conn, "income")
        deleted_at = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute("""
            INSERT INTO recycle_bin (
                deletion_id, record_type, original_id, record_identifier,
                deleted_at, customer_or_payee, category, description,
                amount_paise, payment_method, original_date, record_data_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            del_id, "income", row['id'], row['tx_number'],
            deleted_at, original_data['customer_name'], row['category'], row['description'],
            row['amount_paise'], row['payment_method'], row['created_at'], json.dumps(original_data)
        ))

        # Remove from active income table
        cursor.execute("DELETE FROM income_transactions WHERE id = ?;", (income_id,))
        return True, del_id

def move_expense_to_recycle_bin(expense_id: int):
    """
    Move an expense record to the Recycle Bin.
    Preserves all original fields, payee, category, amount, and notes.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM expenses WHERE id = ?;
        """, (expense_id,))
        row = cursor.fetchone()
        if not row:
            return False, "Expense not found"

        original_data = {
            "id": row['id'],
            "exp_number": row['exp_number'],
            "expense_date": row['expense_date'],
            "category": row['category'],
            "description": row['description'],
            "amount_paise": row['amount_paise'],
            "amount": paise_to_rupees(row['amount_paise']),
            "payment_method": row['payment_method'],
            "payee": row['payee'] or '',
            "notes": row['notes'] or ''
        }

        del_id = generate_deletion_id(conn, "expense")
        deleted_at = datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')

        cursor.execute("""
            INSERT INTO recycle_bin (
                deletion_id, record_type, original_id, record_identifier,
                deleted_at, customer_or_payee, category, description,
                amount_paise, payment_method, original_date, record_data_json
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
        """, (
            del_id, "expense", row['id'], row['exp_number'],
            deleted_at, original_data['payee'] or 'Counter Payee', row['category'], row['description'],
            row['amount_paise'], row['payment_method'], row['expense_date'], json.dumps(original_data)
        ))

        # Remove from active expenses table
        cursor.execute("DELETE FROM expenses WHERE id = ?;", (expense_id,))
        return True, del_id

def list_recycle_records(record_type: str = 'income', search: str = '', page: int = 1, per_page: int = 10):
    """
    List records in the Recycle Bin for a given category with search, counts, and pagination.
    """
    with get_db() as conn:
        cursor = conn.cursor()

        # Count per category
        cursor.execute("SELECT COUNT(*) as count FROM recycle_bin WHERE record_type = 'income';")
        income_count = cursor.fetchone()['count']

        cursor.execute("SELECT COUNT(*) as count FROM recycle_bin WHERE record_type = 'expense';")
        spending_count = cursor.fetchone()['count']

        # Base query for requested tab
        conditions = ["record_type = ?"]
        params = [record_type]

        if search:
            s = f"%{search.strip()}%"
            conditions.append("""(
                deletion_id LIKE ? OR
                record_identifier LIKE ? OR
                customer_or_payee LIKE ? OR
                description LIKE ? OR
                category LIKE ?
            )""")
            params.extend([s, s, s, s, s])

        where_clause = " WHERE " + " AND ".join(conditions)

        # Count matching records
        cursor.execute(f"SELECT COUNT(*) as count FROM recycle_bin {where_clause};", params)
        total_records = cursor.fetchone()['count']

        # Fetch page items sorted by newest deletion first
        offset = (page - 1) * per_page
        query = f"""
            SELECT * FROM recycle_bin
            {where_clause}
            ORDER BY id DESC
            LIMIT ? OFFSET ?;
        """
        cursor.execute(query, params + [per_page, offset])
        rows = cursor.fetchall()

        items = []
        for r in rows:
            try:
                parsed_data = json.loads(r['record_data_json'])
            except Exception:
                parsed_data = {}

            items.append({
                "id": r['id'],
                "deletion_id": r['deletion_id'],
                "record_type": r['record_type'],
                "original_id": r['original_id'],
                "record_identifier": r['record_identifier'],
                "deleted_at": r['deleted_at'],
                "customer_or_payee": r['customer_or_payee'] or '',
                "category": r['category'],
                "description": r['description'],
                "amount": paise_to_rupees(r['amount_paise']),
                "payment_method": r['payment_method'],
                "original_date": r['original_date'],
                "data": parsed_data
            })

        total_pages = (total_records + per_page - 1) // per_page if total_records > 0 else 1

        return {
            "items": items,
            "total_records": total_records,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages,
            "counts": {
                "income": income_count,
                "spending": spending_count,
                "total": income_count + spending_count
            }
        }

def get_recycle_record(recycle_id: int):
    """Retrieve full data for a single deleted record."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recycle_bin WHERE id = ?;", (recycle_id,))
        r = cursor.fetchone()
        if not r:
            return None

        try:
            parsed_data = json.loads(r['record_data_json'])
        except Exception:
            parsed_data = {}

        return {
            "id": r['id'],
            "deletion_id": r['deletion_id'],
            "record_type": r['record_type'],
            "original_id": r['original_id'],
            "record_identifier": r['record_identifier'],
            "deleted_at": r['deleted_at'],
            "customer_or_payee": r['customer_or_payee'],
            "category": r['category'],
            "description": r['description'],
            "amount": paise_to_rupees(r['amount_paise']),
            "payment_method": r['payment_method'],
            "original_date": r['original_date'],
            "record_data": parsed_data
        }

def restore_recycle_record(recycle_id: int):
    """
    Restore a deleted record from the Recycle Bin back to its original active table.
    """
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM recycle_bin WHERE id = ?;", (recycle_id,))
        row = cursor.fetchone()
        if not row:
            return False, "Record not found in Recycle Bin"

        data = json.loads(row['record_data_json'])
        rec_type = row['record_type']

        if rec_type == 'income':
            # Re-insert into income_transactions
            cursor.execute("""
                INSERT INTO income_transactions (
                    tx_number, created_at, customer_id, customer_name, customer_phone,
                    category, description, quantity, unit_rate_paise, discount_paise,
                    amount_paise, payment_method, payment_status, bill_id, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                data.get('tx_number'), data.get('created_at'), data.get('customer_id'),
                data.get('customer_name'), data.get('customer_phone'), data.get('category'),
                data.get('description'), data.get('quantity', 1), data.get('unit_rate_paise', 0),
                data.get('discount_paise', 0), data.get('amount_paise'), data.get('payment_method'),
                data.get('payment_status', 'Paid'), data.get('bill_id'), data.get('notes')
            ))
        elif rec_type == 'expense':
            # Re-insert into expenses
            cursor.execute("""
                INSERT INTO expenses (
                    exp_number, expense_date, category, description,
                    amount_paise, payment_method, payee, notes
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
            """, (
                data.get('exp_number'), data.get('expense_date'), data.get('category'),
                data.get('description'), data.get('amount_paise'), data.get('payment_method'),
                data.get('payee'), data.get('notes')
            ))

        # Remove from Recycle Bin
        cursor.execute("DELETE FROM recycle_bin WHERE id = ?;", (recycle_id,))
        return True, f"Successfully restored {row['record_identifier']} ({row['deletion_id']}) to active records"

def delete_recycle_record_permanent(recycle_id: int):
    """Permanently delete a record from the Recycle Bin."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT deletion_id, record_identifier FROM recycle_bin WHERE id = ?;", (recycle_id,))
        row = cursor.fetchone()
        if not row:
            return False, "Record not found"
        cursor.execute("DELETE FROM recycle_bin WHERE id = ?;", (recycle_id,))
        return True, f"Permanently removed {row['record_identifier']} ({row['deletion_id']})"

def empty_recycle_bin(record_type: str = None):
    """Empty deleted records from the Recycle Bin (for a specific type or all)."""
    with get_db() as conn:
        cursor = conn.cursor()
        if record_type in ['income', 'expense']:
            cursor.execute("DELETE FROM recycle_bin WHERE record_type = ?;", (record_type,))
            label = "Income Billing" if record_type == "income" else "Spending Details"
            return True, f"Recycle Bin emptied for {label}"
        else:
            cursor.execute("DELETE FROM recycle_bin;")
            return True, "Recycle Bin completely emptied"

def get_recycle_summary():
    """Return count summary of records in the Recycle Bin."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) as count FROM recycle_bin WHERE record_type = 'income';")
        inc = cursor.fetchone()['count']
        cursor.execute("SELECT COUNT(*) as count FROM recycle_bin WHERE record_type = 'expense';")
        exp = cursor.fetchone()['count']
        return {
            "income_count": inc,
            "spending_count": exp,
            "total_count": inc + exp
        }
