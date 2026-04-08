---
title: Add CSV download for client predicted revenue (grouped by client)
status: in_progress
priority: high
type: feature
tags:
  - csv
  - staff
  - export
created_by: agent
created_at: 2026-04-08
position: 1
---

## Notes
Add a CSV download that exports predicted revenue aggregated by client (one row per client). The export should reflect the same predicted revenue logic used in the UI (no mismatches). Prefer server-side CSV generation via Next.js API route so large datasets don’t freeze the browser.

## Checklist
- [ ] Find where “predicted revenue” per client is computed/stored (UI + service + DB tables)
- [ ] Implement an API route that returns `text/csv` with `Content-Disposition: attachment`
- [ ] Add a button/link in the relevant client list/dashboard page to download the CSV
- [ ] Validate export matches on-screen values for at least a few clients
- [ ] Run check_for_errors and mark task done