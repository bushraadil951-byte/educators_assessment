# Teacher Marks (IB) — simple version

**Public page (`/`)**: pick a teacher → graph of all their assessments (IB-LP, ISP-LP, IB Document as % of each maximum). Line/Bar switch.

**Admin page (`/admin.html`)**: enter Assessment ID, Date, maximum score for IB-LPs / ISP-LPs / IB Document, upload the CSV, Import.

CSV (header row optional; blank cell = not attempted):

    Teacher Name,IB LP Marks,ISP LP Marks,IB Document Marks
    Ayesha Khan,8,7,9
    Rahul Sharma,6,,7

- Re-importing an existing Assessment ID replaces it.
- A mark above its maximum is rejected with the row number.

## Setup
1. Run `schema.sql` in the Neon SQL Editor (creates `tests` and `test_marks`).
2. Deploy to Netlify; set `DATABASE_URL`, `ADMIN_PASSWORD`, `SESSION_SECRET` (32+ random characters); redeploy.
