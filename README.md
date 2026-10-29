# Learners Commercial Institute

A responsive institute website and administration application built with React, TypeScript, Node.js, Express, Prisma, and PostgreSQL.

> **Status:** Under active development. Some administration features are planned or partially implemented.

## Overview

The project contains two applications:

- **Client (`client/`)** — Public website and authenticated administration interface.
- **Server (`server/`)** — Backend API and persistence layer.

The public website helps prospective learners explore courses, view institute information, and submit enquiries. The administration interface supports operational workflows for authorized staff.

## Features

### Public website

- Responsive pages for desktop, tablet, and mobile.
- Course catalogue loaded from the backend, with descriptions and category filtering.
- Course details and multi-course enquiry selection.
- Validated enquiry form and submission feedback.
- Institute information, FAQs, testimonials, and contact actions.

### Administration

- Authenticated administration interface.
- Dashboard, student management, course management, and enquiry management.
- Staff account settings for authorized users.
- Additional administrative modules under development.

Feature availability may change as development continues. See the application routes and source code for implementation details.

## Technology stack

| Area | Technologies |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, React Router |
| State and data fetching | TanStack Query |
| Forms and validation | React Hook Form, Zod |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL, Prisma ORM |
| Development environment | npm, Docker Compose |
| Testing | Node.js test runner, Vitest |

## Repository structure

```text
learners-institute/
├── client/
│   ├── public/                Static assets
│   ├── src/
│   │   ├── admin/             Administration UI
│   │   ├── api/               Client API utilities
│   │   ├── components/        Shared components
│   │   ├── hooks/             React hooks
│   │   ├── pages/             Pages and styles
│   │   └── sections/          Public page sections
│   ├── tests/                 Frontend tests
│   └── package.json
├── server/
│   ├── src/                   Backend application
│   ├── prisma/                Schema and migrations
│   ├── tests/                 Backend tests
│   └── package.json
├── docker-compose.yml         Local development services
└── README.md
```

## Prerequisites

- A supported Node.js version and npm. Node.js 24 has been used for local frontend development; check dependency requirements for your environment.
- Docker Desktop or Docker Engine with Compose, if using the local database container.
- A local or otherwise authorized PostgreSQL database.

## Local development

### 1. Install dependencies

From the project root:

```bash
cd client
npm ci
cd ../server
npm ci
cd ..
```

### 2. Start a local database

The repository includes Docker Compose services for local development:

```bash
docker compose up -d postgres
```

The local container's database settings are defined in `docker-compose.yml`. **Use only development credentials in local environments.** Do not copy development passwords or database connection strings to production. Avoid `docker compose down -v` unless you intentionally want to delete local database data.

### 3. Configure backend environment

Create a file named `server/.env` on your machine (do not commit it):

```dotenv
NODE_ENV=development
PORT=4000
DATABASE_URL=<your-local-postgresql-connection-string>
CLIENT_ORIGIN=http://localhost:5173
```

Replace the `DATABASE_URL` placeholder with a connection string for your own development database. Do not use a production database for local experiments.

Prisma's migration configuration also supports `DIRECT_URL` for deployments that require a separate direct connection. Do not commit connection strings or credentials.

### 4. Prepare and start the backend

```bash
cd server
npm run prisma:generate
npm run prisma:deploy
npm run dev
```

The development API normally listens on `http://localhost:4000`. Apply migrations only to the intended environment. Never use destructive migration commands on production data.

### 5. Start the frontend

In a separate terminal, from the project root:

```bash
cd client
npm run dev
```

The local frontend normally starts at `http://localhost:5173`. To explicitly select a local API URL, add an untracked `client/.env.local` file:

```dotenv
VITE_API_URL=http://localhost:4000
```

Only use local development accounts and approved account-provisioning procedures. **No usernames, passwords, tokens, or recovery information are provided in this README.**

## Environment variables

| Name | Description |
| --- | --- |
| `DATABASE_URL` | Backend PostgreSQL connection string; required |
| `DIRECT_URL` | Optional direct database connection for Prisma migrations |
| `NODE_ENV` | Server runtime environment |
| `PORT` | Local API port |
| `CLIENT_ORIGIN` | Browser origin allowed to contact the API |
| `VITE_API_URL` | Client-side API base URL, when explicitly configured |

**Security:** Keep all real credentials and production URLs containing sensitive parameters out of Git, screenshots, bug reports, CI logs, and published documentation. Use your deployment platform's protected environment-variable settings. `VITE_` variables are bundled into browser code; never place secrets in them.

## Development commands

### Client

```bash
cd client
npm run dev
npm run lint
npm run build
npm run test:dashboard
npm run test:enquiries
npm run test:students
npm run test:courses
npx vitest run tests/auth.test.ts tests/session-expiry.test.ts
```

### Server

```bash
cd server
npm run dev
npm run typecheck
npm test
npm run prisma:generate
npm run prisma:deploy
```

Some integration tests require running services or a configured test database. Inspect any live test before executing it, and do not point live tests at production.

## Deployment guidance

The frontend and backend can be deployed separately to a compatible hosting platform. Configure database connections, allowed origins, and other environment-specific settings using protected deployment configuration, not committed files.

Before releasing a change:

1. Run relevant lint, build, and automated tests.
2. Review migrations and confirm the target database.
3. Confirm public-facing workflows and authorized administration workflows function correctly.
4. Check that no secrets, private records, or internal operational details were included in the commit.
5. Deploy through the project's approved release process.

This README deliberately omits production infrastructure identifiers, administrative and recovery endpoint inventories, session internals, private student data, operational metrics, and internal business procedures. Refer to private engineering documentation for restricted operational details.

## Troubleshooting

- **Backend fails to start:** Check the local environment file, database availability, and migrations.
- **Frontend cannot load data:** Confirm the development backend is running and the configured API URL is correct.
- **Database changes are missing:** Check the migration status in the correct development database.
- **Tests fail:** Check the current Node.js version and install dependencies from the corresponding lockfile.

Avoid sharing `.env` contents, user records, session cookies, or full production logs when seeking help.

## Contributions and maintenance

- Keep changes focused and review existing code before modifying it.
- Avoid committing generated outputs, credentials, personal data, or local environment files.
- Run the appropriate checks before opening a pull request.
- Treat incomplete features as work in progress rather than production-ready.

## License

No project-level open-source license has been confirmed. Do not assume permission for external reuse or redistribution.
