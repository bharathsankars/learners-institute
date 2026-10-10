Website enquiries
=================

The public form posts name, phone, course and optional message to POST /api/enquiries. Success is shown only after the database write is confirmed. Failed submissions keep entered fields for retry. A submission UUID prevents unchanged retries from creating duplicate records.

GET /api/enquiries and PATCH /api/enquiries/:id require an active signed-in session. Enquiries are visible under /admin/enquiries and in the dashboard. Staff can search, filter and update statuses (New, Contacted, Closed). Lists refresh every 30 seconds and on window focus; the enquiries page also offers Refresh.

The separate WhatsApp link is https://wa.me/919446125964. It works without filling or submitting the form and opens a chat with the institute. It does not write an enquiry to the database or send a message automatically.

Setup: start Docker Desktop, run `docker compose up -d postgres` from the repository root, then run `npm run prisma:deploy` in server. Start the API and client and sign in. Applying the migrations is required before using the form and admin enquiries page.

Verification: run `npm test` in server and `npm run build` / `npm run lint` in client. Enquiry tests cover validation, database writes, retry deduplication, error responses, admin listing/status updates and session access using mocked database methods. For live verification, submit the public form, confirm the record appears in Enquiries, update its status, and refresh to check persistence.
