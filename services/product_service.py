import sqlite3
from repositories.database import get_db
from services.income_service import paise_to_rupees, rupees_to_paise

def list_products():
    """Retrieve all products and services ordered by name."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, product_code, name, price_paise, category, created_at
            FROM products
            ORDER BY product_code ASC, name ASC;
        """)
        rows = cursor.fetchall()
        products = []
        for r in rows:
            products.append({
                "id": r['id'],
                "product_code": r['product_code'],
                "name": r['name'],
                "price": paise_to_rupees(r['price_paise']),
                "category": r['category'] or 'Xerox Services',
                "created_at": r['created_at']
            })
        return products

def get_product_by_code(product_code):
    """Find a product by its product_code (case-insensitive)."""
    if not product_code:
        return None
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, product_code, name, price_paise, category
            FROM products
            WHERE UPPER(TRIM(product_code)) = UPPER(TRIM(?));
        """, (product_code,))
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r['id'],
            "product_code": r['product_code'],
            "name": r['name'],
            "price": paise_to_rupees(r['price_paise']),
            "category": r['category'] or 'Xerox Services'
        }

def create_product(data):
    """Create a new product with unique product_code, name, and price."""
    product_code = (data.get('product_code') or '').strip()
    name = (data.get('name') or '').strip()
    price = data.get('price', 0)
    category = (data.get('category') or 'Xerox Services').strip()

    if not product_code:
        return False, "Product ID is required."
    if not name:
        return False, "Product Name is required."

    price_paise = rupees_to_paise(price)
    if price_paise < 0:
        return False, "Price cannot be negative."

    with get_db() as conn:
        cursor = conn.cursor()
        # Check uniqueness of product_code
        cursor.execute("SELECT id FROM products WHERE UPPER(TRIM(product_code)) = UPPER(TRIM(?));", (product_code,))
        if cursor.fetchone():
            return False, f"Product ID '{product_code}' already exists. Please choose a unique ID."

        cursor.execute("""
            INSERT INTO products (product_code, name, price_paise, category)
            VALUES (?, ?, ?, ?);
        """, (product_code, name, price_paise, category))
        new_id = cursor.lastrowid

    return True, {
        "id": new_id,
        "product_code": product_code,
        "name": name,
        "price": paise_to_rupees(price_paise),
        "category": category
    }

def update_product(product_id, data):
    """Update an existing product."""
    product_code = (data.get('product_code') or '').strip()
    name = (data.get('name') or '').strip()
    price = data.get('price', 0)
    category = (data.get('category') or 'Xerox Services').strip()

    if not product_code:
        return False, "Product ID is required."
    if not name:
        return False, "Product Name is required."

    price_paise = rupees_to_paise(price)

    with get_db() as conn:
        cursor = conn.cursor()
        # Check if another product has this product_code
        cursor.execute("""
            SELECT id FROM products
            WHERE UPPER(TRIM(product_code)) = UPPER(TRIM(?)) AND id != ?;
        """, (product_code, product_id))
        if cursor.fetchone():
            return False, f"Product ID '{product_code}' is already used by another item."

        cursor.execute("""
            UPDATE products
            SET product_code = ?, name = ?, price_paise = ?, category = ?
            WHERE id = ?;
        """, (product_code, name, price_paise, category, product_id))
        if cursor.rowcount == 0:
            return False, "Product not found."

    return True, "Product updated successfully."

def delete_product(product_id):
    """Delete a product by id."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM products WHERE id = ?;", (product_id,))
        if cursor.rowcount == 0:
            return False, "Product not found."
    return True, "Product deleted successfully."

def get_product(product_id):
    """Retrieve a single product by ID."""
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, product_code, name, price_paise, category, created_at
            FROM products
            WHERE id = ?;
        """, (product_id,))
        r = cursor.fetchone()
        if not r:
            return None
        return {
            "id": r['id'],
            "product_code": r['product_code'],
            "name": r['name'],
            "price": paise_to_rupees(r['price_paise']),
            "category": r['category'] or 'Xerox Services',
            "created_at": r['created_at']
        }
