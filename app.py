import os
from flask import Flask, render_template, request, jsonify, Response
from repositories.database import init_db, get_db
from services.income_service import list_income, create_income, update_income, get_income, delete_income, get_today_summary, paise_to_rupees, rupees_to_paise
from services.billing_service import create_bill, get_bill, generate_bill_number
from services.expense_service import list_expenses, create_expense, update_expense, get_expense, delete_expense, get_spending_summary
from services.analysis_service import get_analysis_data, get_spool_activity_data, export_fiscal_csv
from services.product_service import list_products, create_product, update_product, delete_product, get_product, get_product_by_code
from services.recycle_bin_service import (
    list_recycle_records,
    get_recycle_record,
    restore_recycle_record,
    delete_recycle_record_permanent,
    empty_recycle_bin,
    get_recycle_summary
)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'docuflow-precision-local-key'

# Initialize database schema and initial data
init_db()

@app.route('/')
def index():
    """Render the primary single-page application interface."""
    return render_template('index.html')

# =========================================================================
# INCOME & COUNTER APIS
# =========================================================================
@app.route('/api/summary/today')
def api_today_summary():
    """Return metrics for today's counter display."""
    summary = get_today_summary()
    return jsonify(summary)

@app.route('/api/income', methods=['GET'])
def api_list_income():
    """List income transactions with search, date range, amount range, and pagination."""
    search = request.args.get('search', '').strip()
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    min_amt = request.args.get('min_amt')
    max_amt = request.args.get('max_amt')
    categories_raw = request.args.get('categories')
    categories = [c.strip() for c in categories_raw.split(',') if c.strip()] if categories_raw else None
    pm_raw = request.args.get('payment_methods') or request.args.get('payment_method')
    payment_methods = [p.strip() for p in pm_raw.split(',') if p.strip()] if pm_raw else None
    payment_status = request.args.get('payment_status')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    sort_by = request.args.get('sort_by', 'time')
    sort_order = request.args.get('sort_order', 'desc')
    combined_sort = request.args.get('sort')
    if combined_sort:
        if combined_sort == 'time_asc':
            sort_by, sort_order = 'time', 'asc'
        elif combined_sort == 'time_desc':
            sort_by, sort_order = 'time', 'desc'
        elif combined_sort == 'amount_asc':
            sort_by, sort_order = 'amount', 'asc'
        elif combined_sort == 'amount_desc':
            sort_by, sort_order = 'amount', 'desc'

    result = list_income(
        search=search,
        start_date=start_date,
        end_date=end_date,
        min_amt=min_amt,
        max_amt=max_amt,
        categories=categories,
        payment_methods=payment_methods,
        payment_status=payment_status,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return jsonify(result)

@app.route('/api/income', methods=['POST'])
def api_create_income():
    """Create a new income transaction."""
    data = request.get_json() or {}
    res = create_income(data)
    return jsonify(res), 201

@app.route('/api/income/<int:income_id>', methods=['GET'])
def api_get_income(income_id):
    """Retrieve details for a single income transaction."""
    item = get_income(income_id)
    if not item:
        return jsonify({"error": "Transaction not found"}), 404
    return jsonify(item)

@app.route('/api/income/<int:income_id>', methods=['PUT'])
def api_update_income(income_id):
    """Update an existing income transaction."""
    data = request.get_json() or {}
    success, res = update_income(income_id, data)
    if not success:
        return jsonify({"error": res}), 400
    return jsonify(res)

@app.route('/api/income/<int:income_id>', methods=['DELETE'])
def api_delete_income(income_id):
    """Delete an income transaction."""
    success, msg = delete_income(income_id)
    if success:
        return jsonify({"message": msg})
    return jsonify({"error": msg}), 404

# =========================================================================
# BILLING APIS
# =========================================================================
@app.route('/api/bills/next-number')
def api_next_bill_number():
    """Return the next auto-generated bill number."""
    with get_db() as conn:
        num = generate_bill_number(conn)
    return jsonify({"bill_number": num})

@app.route('/api/bills', methods=['POST'])
def api_create_bill():
    """Create an invoice with line items and link it into income transactions."""
    data = request.get_json() or {}
    res = create_bill(data)
    return jsonify(res), 201

@app.route('/api/bills/<bill_id>', methods=['GET'])
def api_get_bill(bill_id):
    """Retrieve full bill details with shop details for printing."""
    bill = get_bill(bill_id)
    if not bill:
        return jsonify({"error": "Bill not found"}), 404
    return jsonify(bill)

# =========================================================================
# SPENDING APIS
# =========================================================================
@app.route('/api/summary/spending')
def api_spending_summary():
    """Return spending summary metrics."""
    summary = get_spending_summary()
    return jsonify(summary)

@app.route('/api/expenses', methods=['GET'])
def api_list_expenses():
    """List shop expenses with filters and pagination."""
    search = request.args.get('search', '').strip()
    categories_raw = request.args.get('categories')
    categories = [c.strip() for c in categories_raw.split(',') if c.strip()] if categories_raw else None
    min_amt = request.args.get('min_amt')
    max_amt = request.args.get('max_amt')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    pm_raw = request.args.get('payment_methods') or request.args.get('payment_method')
    payment_methods = [p.strip() for p in pm_raw.split(',') if p.strip()] if pm_raw else None
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    sort_by = request.args.get('sort_by', 'time')
    sort_order = request.args.get('sort_order', 'desc')
    combined_sort = request.args.get('sort')
    if combined_sort:
        if combined_sort == 'time_asc':
            sort_by, sort_order = 'time', 'asc'
        elif combined_sort == 'time_desc':
            sort_by, sort_order = 'time', 'desc'
        elif combined_sort == 'amount_asc':
            sort_by, sort_order = 'amount', 'asc'
        elif combined_sort == 'amount_desc':
            sort_by, sort_order = 'amount', 'desc'

    result = list_expenses(
        search=search,
        categories=categories,
        payment_methods=payment_methods,
        min_amt=min_amt,
        max_amt=max_amt,
        start_date=start_date,
        end_date=end_date,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order
    )
    return jsonify(result)

@app.route('/api/expenses', methods=['POST'])
def api_create_expense():
    """Record a new shop expense."""
    data = request.get_json() or {}
    res = create_expense(data)
    return jsonify(res), 201

@app.route('/api/expenses/<int:expense_id>', methods=['GET'])
def api_get_expense(expense_id):
    """Retrieve details for a single expense record."""
    exp = get_expense(expense_id)
    if not exp:
        return jsonify({"error": "Expense not found"}), 404
    return jsonify(exp)

@app.route('/api/expenses/<int:expense_id>', methods=['PUT'])
def api_update_expense(expense_id):
    """Update an existing expense record."""
    data = request.get_json() or {}
    success, res = update_expense(expense_id, data)
    if not success:
        return jsonify({"error": res}), 400
    return jsonify(res)

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
def api_delete_expense(expense_id):
    """Delete an expense record."""
    success, msg = delete_expense(expense_id)
    if success:
        return jsonify({"message": msg})
    return jsonify({"error": msg}), 404

# =========================================================================
# ANALYSIS & EXPORT APIS
# =========================================================================
@app.route('/api/analysis')
def api_analysis():
    """Return high-performance SQL aggregated analytics."""
    preset = request.args.get('preset', 'month')
    start_date = request.args.get('start_date')
    end_date = request.args.get('end_date')
    traj_mode = request.args.get('trajectory_mode', 'weekly')
    spool_year = request.args.get('spool_year') or request.args.get('year')
    streams_raw = request.args.get('streams')
    streams = [s.strip() for s in streams_raw.split(',') if s.strip()] if streams_raw else None

    data = get_analysis_data(
        start_date=start_date,
        end_date=end_date,
        preset=preset,
        stream_filters=streams,
        trajectory_mode=traj_mode,
        spool_year=spool_year
    )
    return jsonify(data)

@app.route('/api/spool/activity', methods=['GET'])
def api_spool_activity():
    """Return print spool activity telemetry, heatmap matrix, and activity log records for a chosen year."""
    year = request.args.get('year')
    data = get_spool_activity_data(year)
    return jsonify(data)

@app.route('/api/export/csv')
def api_export_csv():
    """Stream CSV telemetry of all shop transactions and expenses."""
    csv_content = export_fiscal_csv()
    return Response(
        csv_content,
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment;filename=docuflow_fiscal_telemetry.csv"}
    )

# =========================================================================
# SETTINGS APIS
# =========================================================================
@app.route('/api/settings', methods=['GET'])
def api_get_settings():
    """Get shop settings and default rates."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM settings WHERE id = 1;")
        s = cursor.fetchone()
        return jsonify({
            "shop_name": s['shop_name'],
            "tagline": s['tagline'],
            "address": s['address'],
            "phone": s['phone'],
            "bill_prefix": s['bill_prefix'],
            "tax_invoiced": bool(s['tax_invoiced']),
            "gst_number": s['gst_number'],
            "default_xerox_rate": paise_to_rupees(s['default_xerox_rate_paise']),
            "default_binding_rate": paise_to_rupees(s['default_binding_rate_paise'])
        })

@app.route('/api/settings', methods=['POST'])
def api_update_settings():
    """Update shop settings and default rates."""
    data = request.get_json() or {}
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT default_xerox_rate_paise, default_binding_rate_paise FROM settings WHERE id = 1;")
        curr_settings = cursor.fetchone()
        curr_xerox = curr_settings['default_xerox_rate_paise'] if curr_settings else 150
        curr_binding = curr_settings['default_binding_rate_paise'] if curr_settings else 6000

        xerox_paise = rupees_to_paise(data['default_xerox_rate']) if ('default_xerox_rate' in data and data['default_xerox_rate'] is not None) else curr_xerox
        binding_paise = rupees_to_paise(data['default_binding_rate']) if ('default_binding_rate' in data and data['default_binding_rate'] is not None) else curr_binding

        cursor.execute("""
            UPDATE settings SET
                shop_name = ?,
                tagline = ?,
                address = ?,
                phone = ?,
                bill_prefix = ?,
                gst_number = ?,
                default_xerox_rate_paise = ?,
                default_binding_rate_paise = ?
            WHERE id = 1;
        """, (
            data.get('shop_name', 'Sri Sakthi Xerox'),
            data.get('tagline', ''),
            data.get('address', ''),
            data.get('phone', ''),
            data.get('bill_prefix', 'BL'),
            data.get('gst_number', ''),
            xerox_paise,
            binding_paise
        ))
    return jsonify({"message": "Settings updated successfully"})

# =========================================================================
# PRODUCT & SERVICE CATALOG APIS
# =========================================================================
@app.route('/api/products', methods=['GET'])
def api_list_products():
    """Retrieve catalog of products and services."""
    products = list_products()
    return jsonify(products)

@app.route('/api/products', methods=['POST'])
def api_create_product():
    """Add a new product or service with manual Product ID, Name, and Price."""
    data = request.get_json() or {}
    success, res = create_product(data)
    if not success:
        return jsonify({"error": res}), 400
    return jsonify(res), 201

@app.route('/api/products/<int:prod_id>', methods=['GET'])
def api_get_product(prod_id):
    """Retrieve details for a single product."""
    prod = get_product(prod_id)
    if not prod:
        return jsonify({"error": "Product not found"}), 404
    return jsonify(prod)

@app.route('/api/products/<int:prod_id>', methods=['PUT'])
def api_update_product(prod_id):
    """Update an existing product or service."""
    data = request.get_json() or {}
    success, msg = update_product(prod_id, data)
    if not success:
        return jsonify({"error": msg}), 400
    return jsonify({"message": msg})

@app.route('/api/products/<int:prod_id>', methods=['DELETE'])
def api_delete_product(prod_id):
    """Delete a product or service from the catalog."""
    success, msg = delete_product(prod_id)
    if not success:
        return jsonify({"error": msg}), 404
    return jsonify({"message": msg})

@app.route('/api/products/lookup', methods=['GET'])
def api_lookup_product():
    """Lookup product by product_code (Product ID)."""
    code = request.args.get('code', '').strip()
    prod = get_product_by_code(code)
    if not prod:
        return jsonify({"error": "Product not found"}), 404
# =========================================================================
# RECYCLE BIN APIS
# =========================================================================
@app.route('/api/recycle-bin/summary', methods=['GET'])
def api_recycle_summary():
    """Return count summary for Recycle Bin categories."""
    summary = get_recycle_summary()
    return jsonify(summary)

@app.route('/api/recycle-bin', methods=['GET'])
def api_list_recycle_bin():
    """List deleted records separated by category with search and pagination."""
    rec_type = request.args.get('type', 'income').strip().lower()
    if rec_type not in ['income', 'expense']:
        rec_type = 'income'
    search = request.args.get('search', '').strip()
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    result = list_recycle_records(record_type=rec_type, search=search, page=page, per_page=per_page)
    return jsonify(result)

@app.route('/api/recycle-bin/<int:recycle_id>', methods=['GET'])
def api_get_recycle_record(recycle_id):
    """Get complete original data and deletion details for a deleted record."""
    item = get_recycle_record(recycle_id)
    if not item:
        return jsonify({"error": "Deleted record not found"}), 404
    return jsonify(item)

@app.route('/api/recycle-bin/<int:recycle_id>/restore', methods=['POST'])
def api_restore_recycle_record(recycle_id):
    """Restore a deleted record back to active Income or Expenses."""
    success, msg = restore_recycle_record(recycle_id)
    if not success:
        return jsonify({"error": msg}), 404
    return jsonify({"message": msg})

@app.route('/api/recycle-bin/<int:recycle_id>', methods=['DELETE'])
def api_permanent_delete_recycle_record(recycle_id):
    """Permanently delete a record from the Recycle Bin."""
    success, msg = delete_recycle_record_permanent(recycle_id)
    if not success:
        return jsonify({"error": msg}), 404
    return jsonify({"message": msg})

@app.route('/api/recycle-bin/empty', methods=['DELETE'])
def api_empty_recycle_bin():
    """Empty deleted records from the Recycle Bin for a specific category or all."""
    rec_type = request.args.get('type')
    success, msg = empty_recycle_bin(rec_type)
    return jsonify({"message": msg})

if __name__ == '__main__':
    host = os.environ.get('HOST', '0.0.0.0')
    port = int(os.environ.get('PORT', 5000))
    print(f"Sri Sakthi Xerox Management System running at http://127.0.0.1:{port}")
    app.run(host=host, port=port, debug=False)
