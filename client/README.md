# Learners Institute – Client

React 19 + TypeScript single-page app for the public website and the `/admin` portal. See the [root README](../README.md) for architecture, setup and environment variables.

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # type-check and production build
npm run lint
node --experimental-strip-types --test tests/*.test.ts
```

| Variable | Purpose |
|---|---|
| `VITE_API_URL` | API base URL. Defaults to `http://localhost:4000` when the app runs on localhost, and to same-origin `/api` (Vercel rewrite) otherwise |
