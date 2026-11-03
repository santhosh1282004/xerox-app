#!/usr/bin/env python3
"""
Sri Sakthi Xerox - Database Management CLI Tool
=================================================
Use this script to create, verify, inspect, or reset the SQLite database.

Usage:
    python init_db.py           # Initializes DB, creates missing tables, seeds if empty
    python init_db.py --info    # Displays detailed schema, table counts, and indexes
    python init_db.py --reset   # Clears and recreates all tables with fresh seed data
"""

import sys
import os
import argparse
import sqlite3

# Ensure project root is in Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from repositories.database import DB_PATH, DB_DIR, init_db, get_db, seed_initial_data

def show_info():
    """Display full schema, table row counts, and indexes."""
    if not os.path.exists(DB_PATH):
        print(f"[!] Database file does not exist at: {DB_PATH}")
        print("Run 'python init_db.py' to create it.")
        return

    print("=" * 65)
    print(f"  Sri Sakthi Xerox Database Status: {DB_PATH}")
    print(f"  File Size: {os.path.getsize(DB_PATH):,} bytes")
    print("=" * 65)

    with get_db() as conn:
        cursor = conn.cursor()

        # Check PRAGMA settings
        cursor.execute("PRAGMA journal_mode;")
        journal = cursor.fetchone()[0]
        cursor.execute("PRAGMA foreign_keys;")
        fk = cursor.fetchone()[0]
        print(f"• PRAGMA journal_mode = {journal.upper()}")
        print(f"• PRAGMA foreign_keys = {'ON' if fk else 'OFF'}")
        print("-" * 65)

        # Tables and Counts
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;")
        tables = [r['name'] for r in cursor.fetchall()]

        print(f"Found {len(tables)} Application Tables:")
        for t in tables:
            cursor.execute(f"SELECT COUNT(*) as count FROM {t};")
            cnt = cursor.fetchone()['count']
            cursor.execute(f"PRAGMA table_info({t});")
            col_count = len(cursor.fetchall())
            print(f"  [+] {t:<22} | Columns: {col_count:<2} | Rows: {cnt}")

        print("-" * 65)
        # Indexes
        cursor.execute("SELECT name, tbl_name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' ORDER BY tbl_name;")
        indexes = cursor.fetchall()
        print(f"Found {len(indexes)} Query Performance Indexes:")
        for idx in indexes:
            print(f"  [*] {idx['name']:<28} on table '{idx['tbl_name']}'")
        print("=" * 65)

def reset_db():
    """Drop all tables and recreate with seed data."""
    print("[!] WARNING: This will delete all existing data and reset to default seed records.")
    confirm = input("Are you sure you want to proceed? (yes/no): ").strip().lower()
    if confirm not in ['y', 'yes']:
        print("[-] Database reset aborted.")
        return

    print("[*] Dropping existing tables...")
    with get_db() as conn:
        cursor = conn.cursor()
        cursor.execute("PRAGMA foreign_keys = OFF;")
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%';")
        tables = [r['name'] for r in cursor.fetchall()]
        for t in tables:
            cursor.execute(f"DROP TABLE IF EXISTS {t};")
        cursor.execute("PRAGMA foreign_keys = ON;")

    print("[*] Rebuilding schema and initial seed data...")
    init_db()
    print("[✓] Database successfully reset and re-seeded!")
    show_info()

def main():
    parser = argparse.ArgumentParser(description="Sri Sakthi Xerox Database Management")
    parser.add_argument('--info', action='store_true', help="Show table counts, columns, and index info")
    parser.add_argument('--reset', action='store_true', help="Drop all tables and re-initialize from scratch")
    args = parser.parse_args()

    if args.reset:
        reset_db()
    elif args.info:
        show_info()
    else:
        print("[*] Creating / initializing database if missing...")
        init_db()
        print(f"[✓] Database ready at: {DB_PATH}")
        show_info()

if __name__ == '__main__':
    main()
