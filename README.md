# Portfolio Hub (Vite + Express)

A small portfolio site that showcases my other websites.

## Structure
- `client/` - Vite + React frontend
- `server/` - Express API + serves the built frontend in production
- Root `package.json` runs both with hot reload in development

## Development
```bash
npm install
npm run dev
```

- Client: http://localhost:5173
- Server: http://localhost:5174

## Production (local)
```bash
npm run build
npm start
```
Then open http://localhost:5174

## Environment
Copy `.env.example` to `.env` (optional in dev):
```bash
cp server/.env.example server/.env
```

- `ADMIN_KEY` controls admin moderation endpoints.
- Notes submitted publicly are created as `pending` and only appear after approval.
- Set `POSTHOG_PROJECT_TOKEN` to enable analytics, session replay, feature flags, and other PostHog client features.
- `POSTHOG_REGION` defaults to `us`. Switch it to `eu` for the EU cloud, or use the optional host overrides in `server/.env.example` for a custom setup.
- Browser SDK traffic is proxied through the Express backend at `/_relay`, so the frontend does not call PostHog directly.

## Docker
Build and run:
```bash
docker build -t portfolio-website .
docker run -p 5174:5174 --env ADMIN_KEY=change-me portfolio-website
```
Open http://localhost:5174
