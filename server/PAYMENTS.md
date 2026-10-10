Payment setup
=============

Start Docker Desktop and run `docker compose up -d postgres` from the repository root. With DATABASE_URL configured in server/.env, run `npm run prisma:deploy` in server, then start the server and client. This migration adds payments and server sessions; apply it before using login or financial APIs.

Sign in as an active SUPER_ADMIN. Create a student, course, and fee plan if needed, then open Payments. Record a partial payment, view its receipt, and use Print / Save PDF. Fees and Dashboard reflect collections and remaining active balances. An amount above the remaining balance must be rejected. Staff accounts cannot access the financial API.

Payments are append-only. Corrections, voids, refunds, and online payment gateway integration are outside this implementation. Receipt numbers are sequential and may have gaps. Duplicate retries of an unchanged submission return its existing receipt. Transactions lock fee plans while checking balances, so simultaneous collections cannot exceed the fee. Fee edits cannot reduce the effective fee below collections.

Run `npm test` in server for payment rules and financial access tests. These tests use a mocked database transaction; live migration, concurrency, and browser verification require a running PostgreSQL instance.
