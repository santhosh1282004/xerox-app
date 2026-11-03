import json
import urllib.request

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
    print("=== Testing Bill Creation & Preserved Line Items in Recycle Bin ===")

    bill_payload = {
        "customer_name": "Priya Sharma",
        "customer_phone": "9123456789",
        "payment_method": "UPI",
        "category": "Combo Services",
        "discount": 15.0,
        "items": [
            {"product_code": "DOC-XRX-01", "name": "B&W Xerox Single", "qty": 100, "rate": 1.5, "total": 150.0},
            {"product_code": "DOC-BND-01", "name": "Spiral Binding (Standard)", "qty": 2, "rate": 45.0, "total": 90.0}
        ]
    }
    status, bill_res = request("/api/bills", method="POST", data=bill_payload)
    print(f"Created bill status {status}: {bill_res}")
    assert status == 201
    bill_number = bill_res["bill_number"]
    # Find income transaction linked to this bill
    status, inc_list = request(f"/api/income?search={bill_number}")
    assert status == 200
    assert inc_list["total_records"] >= 1
    income_tx = inc_list["items"][0]
    income_id = income_tx["id"]
    tx_number = income_tx["tx_number"]
    # Delete income record
    status, del_res = request(f"/api/income/{income_id}", method="DELETE")
    print(f"Deleted bill transaction: {del_res}")
    assert status == 200

    # Retrieve from Recycle Bin
    status, inc_list = request("/api/recycle-bin?type=income")
    target_recycle_id = None
    for itm in inc_list["items"]:
        if itm["record_identifier"] == tx_number:
            target_recycle_id = itm["id"]
            break

    assert target_recycle_id is not None
    status, detail = request(f"/api/recycle-bin/{target_recycle_id}")
    print(f"Preserved bill details in Recycle Bin: {detail['record_data'].get('bill_details')}")
    bill_data = detail['record_data']['bill_details']
    assert bill_data is not None
    assert len(bill_data['items']) == 2
    assert bill_data['items'][0]['item_name'] == "B&W Xerox Single"
    assert bill_data['items'][0]['quantity'] == 100
    assert bill_data['items'][1]['item_name'] == "Spiral Binding (Standard)"
    assert bill_data['items'][1]['quantity'] == 2

    # Clean up
    request(f"/api/recycle-bin/{target_recycle_id}", method="DELETE")
    print("=== Verified: Bill line items preserved with 100% fidelity in Recycle Bin ===")

if __name__ == '__main__':
    main()
