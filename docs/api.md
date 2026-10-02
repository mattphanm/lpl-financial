# API Reference

Base URL: `http://localhost:3001`

## GET /api/health
Health check.

**200**
```json
{ "status": "ok", "service": "transfer-ready", "time": "2026-10-02T17:00:00.000Z" }
```

## GET /api/transfers
List all transfers.

**200**
```json
[
  {
    "id": "xfer-5001",
    "accountId": "acct-1001",
    "deliveringFirm": "Fidelity",
    "receivingFirm": "LPL Financial",
    "assetValue": 125000.5,
    "status": "in_review",
    "createdAt": "2026-09-28T14:03:00.000Z",
    "updatedAt": "2026-09-29T09:12:00.000Z"
  }
]
```

## GET /api/transfers/:id
Fetch a single transfer by id.

**200** — transfer object (see above)
**404**
```json
{ "error": "Transfer not found" }
```
