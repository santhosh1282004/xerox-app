import json
import urllib.request
import urllib.parse
import sys

BASE_URL = "http://127.0.0.1:5000"

def request(path, method="GET", data=None):
    url = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body = json.dumps(data).encode('utf-8') if data else None
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode('utf-8')
            return response.status, json.loads(res_body) if res_body else {}
    except urllib.error.HTTPError as e:
        err_body = e.read().decode('utf-8')
        return e.code, json.loads(err_body) if err_body else {}

def main():
    print("=== Testing Recycle Bin API Endpoints & Data Preservation ===")

    # 1. Check summary initial
    status, summary = request("/api/recycle-bin/summary")
    print(f"Initial summary (status {status}): {summary}")
    assert status == 200

    # 2. Create a test income transaction
    test_income = {
        "customer_name": "Test Customer Alpha",
        "customer_phone": "9876543210",
        "category": "Xerox Services",
        "description": "50 Pages Color Xerox Test",
        "quantity": 50,
        "unit_rate": 2.0,
        "discount": 10.0,
        "amount": 90.0,
        "payment_method": "UPI",
        "notes": "Urgent color print order"
    }
    status, inc_res = request("/api/income", method="POST", data=test_income)
    print(f"Created income record (status {status}): {inc_res}")
    assert status == 201
    inc_id = inc_res["id"]
    tx_number = inc_res["tx_number"]

    # 3. Create a test expense record
    test_expense = {
        "category": "Paper & Consumables",
        "description": "JK Copier A4 Box (5 Reams)",
        "amount": 1250.0,
        "payment_method": "Cash",
        "payee": "Sri Murugan Stationers",
        "notes": "Paid by cash from counter drawer"
    }
    status, exp_res = request("/api/expenses", method="POST", data=test_expense)
    print(f"Created expense record (status {status}): {exp_res}")
    assert status == 201
    exp_id = exp_res["id"]
    exp_number = exp_res["exp_number"]

    # 4. Delete Income Record -> should move to Recycle Bin
    status, del_inc_res = request(f"/api/income/{inc_id}", method="DELETE")
    print(f"Delete income status {status}: {del_inc_res}")
    assert status == 200

    # Verify income is no longer in active income table
    status, get_inc = request(f"/api/income/{inc_id}")
    print(f"Fetch deleted income from active API (status {status}): {get_inc}")
    assert status == 404

    # 5. Delete Expense Record -> should move to Recycle Bin
    status, del_exp_res = request(f"/api/expenses/{exp_id}", method="DELETE")
    print(f"Delete expense status {status}: {del_exp_res}")
    assert status == 200

    # Verify expense is no longer in active expenses table
    status, get_exp = request(f"/api/expenses/{exp_id}")
    print(f"Fetch deleted expense from active API (status {status}): {get_exp}")
    assert status == 404

    # 6. Check Recycle Bin Summary
    status, summary = request("/api/recycle-bin/summary")
    print(f"Recycle bin summary after deletions (status {status}): {summary}")
    assert status == 200
    assert summary["income_count"] >= 1
    assert summary["spending_count"] >= 1

    # 7. List Income category in Recycle Bin
    status, inc_list = request("/api/recycle-bin?type=income")
    print(f"Recycle bin income category (status {status}): found {inc_list['total_records']} items")
    assert status == 200
    found_inc = None
    for item in inc_list["items"]:
        if item["record_identifier"] == tx_number:
            found_inc = item
            break
    assert found_inc is not None, f"Transaction {tx_number} not found in Recycle Bin"
    print(f"Found preserved income item: Deletion ID={found_inc['deletion_id']}, Deleted At={found_inc['deleted_at']}, Amount=₹{found_inc['amount']}")
    assert found_inc["deletion_id"].startswith("DEL-INC-")
    assert found_inc["deleted_at"] is not None
    assert found_inc["amount"] == 90.0
    assert found_inc["customer_or_payee"] == "Test Customer Alpha"

    # 8. List Spending category in Recycle Bin
    status, exp_list = request("/api/recycle-bin?type=expense")
    print(f"Recycle bin spending category (status {status}): found {exp_list['total_records']} items")
    assert status == 200
    found_exp = None
    for item in exp_list["items"]:
        if item["record_identifier"] == exp_number:
            found_exp = item
            break
    assert found_exp is not None, f"Expense {exp_number} not found in Recycle Bin"
    print(f"Found preserved expense item: Deletion ID={found_exp['deletion_id']}, Deleted At={found_exp['deleted_at']}, Amount=₹{found_exp['amount']}")
    assert found_exp["deletion_id"].startswith("DEL-EXP-")
    assert found_exp["deleted_at"] is not None
    assert found_exp["amount"] == 1250.0
    assert found_exp["customer_or_payee"] == "Sri Murugan Stationers"

    # 9. Fetch single deleted record snapshot and check preserved data
    status, inc_detail = request(f"/api/recycle-bin/{found_inc['id']}")
    print(f"Preserved income full snapshot (status {status}):")
    assert status == 200
    print(f"  Deletion ID: {inc_detail['deletion_id']}")
    print(f"  Deleted At: {inc_detail['deleted_at']}")
    print(f"  Preserved fields: customer_phone={inc_detail['record_data'].get('customer_phone')}, notes={inc_detail['record_data'].get('notes')}")
    assert inc_detail['record_data']['customer_phone'] == "9876543210"
    assert inc_detail['record_data']['notes'] == "Urgent color print order"
    assert inc_detail['record_data']['discount'] == 10.0

    # 10. Test Restore Income Record
    status, restore_res = request(f"/api/recycle-bin/{found_inc['id']}/restore", method="POST")
    print(f"Restore income record (status {status}): {restore_res}")
    assert status == 200

    # Verify restored income is back in active list
    status, active_inc_list = request(f"/api/income?search={tx_number}")
    print(f"Search for restored income in active API (status {status}): count={active_inc_list['total_records']}")
    assert status == 200
    assert active_inc_list["total_records"] >= 1
    restored_tx = active_inc_list["items"][0]
    assert restored_tx["tx_number"] == tx_number
    assert restored_tx["amount"] == 90.0
    assert restored_tx["customer_name"] == "Test Customer Alpha"

    # 11. Test Permanent Delete on the expense record
    status, perm_del_res = request(f"/api/recycle-bin/{found_exp['id']}", method="DELETE")
    print(f"Permanent delete expense from Recycle Bin (status {status}): {perm_del_res}")
    assert status == 200

    # Verify it is gone from Recycle Bin
    status, exp_after_del = request(f"/api/recycle-bin/{found_exp['id']}")
    print(f"Fetch permanently deleted expense from Recycle Bin (status {status}): {exp_after_del}")
    assert status == 404

    # Clean up restored test income
    request(f"/api/income/{restored_tx['id']}", method="DELETE")
    # Clean up from recycle bin
    status, inc_list_cleanup = request("/api/recycle-bin?type=income")
    for itm in inc_list_cleanup.get("items", []):
        if itm["record_identifier"] == tx_number:
            request(f"/api/recycle-bin/{itm['id']}", method="DELETE")

    print("\n>>> ALL RECYCLE BIN UNIT & INTEGRATION TESTS PASSED PERFECTLY! <<<")

if __name__ == '__main__':
    main()
