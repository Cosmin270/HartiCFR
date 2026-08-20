# Deploying HartiCFR to Render

Three pieces go live: a Postgres database, the .NET API as a Docker web
service, and the React SPA as a static site. `render.yaml` at the repo root
describes all three, so Render can create them in one step.

## 1. Push the repo

Render builds from GitHub, so anything not pushed will not be deployed:

```bash
git push origin main
```

## 2. Create the services

1. Go to <https://dashboard.render.com> → **New** → **Blueprint**.
2. Pick the `Cosmin270/HartiCFR` repository. Render reads `render.yaml` and
   proposes `harticfr-db`, `harticfr-api`, and `harticfr` (the SPA).
3. Apply. The database and API come up first; the static site follows.

If any of those service names are already taken, Render appends a suffix — see
step 3, because two URLs are hard-coded and must then be corrected.

## 3. How the frontend reaches the API

The browser never calls the API's own hostname. The static site rewrites
`/api/*` to `https://harticfr-api.onrender.com/api/*`, so from the browser's
point of view the API lives at the site's own origin.

This is not a nicety. `onrender.com` is on the Public Suffix List, which makes
`harticfr.onrender.com` and `harticfr-api.onrender.com` two different *sites*.
An auth cookie set by the API subdomain is therefore a third-party cookie, and
Safari blocks those outright — login appears to succeed and the user stays on
the login page, with no cookie stored at all. Proxying keeps the cookie
first-party.

Two consequences to remember:

- **If the API service is ever renamed, update the rewrite destination in
  `render.yaml`.** Nothing else refers to the API's URL.
- The frontend sends requests to relative `/api/...` paths whenever
  `VITE_API_URL` is unset in a production build. Setting that variable points
  it back at an absolute URL and reintroduces the Safari problem, so leave it
  unset on Render.

`Cors__AllowedOrigins` on `harticfr-api` is now only a fallback for direct
cross-origin access; same-origin requests through the proxy need no CORS at all.

## 4. Load the data

EF Core migrations run automatically when the API starts, so the schema is
created on first boot — but the database is empty. To copy the stations and
level-crossing logs from your local development database:

```bash
scripts/copy-data-to-render.sh 'postgresql://...'   # External Database URL from Render
```

User accounts are not copied; register again on the deployment.

## 5. Verify

```bash
curl https://harticfr-api.onrender.com/health          # {"status":"ok"}
curl -i https://harticfr-api.onrender.com/api/Station/stations   # 401 until logged in
```

Then open the site, register, and confirm the map loads.

## Notes on the free plan

- Free web services sleep after ~15 minutes of inactivity; the next request
  takes roughly a minute while the container wakes up.
- Free Postgres instances expire after 30 days and must be recreated. Re-run
  the data copy script afterwards.
- Both services sit behind Render's TLS proxy. The API trusts
  `X-Forwarded-Proto` rather than issuing its own HTTPS redirect.

## Local development is unchanged

`appsettings.Development.json` still points at the local Docker Postgres on
port 5433, and the frontend falls back to `http://localhost:5016` when
`VITE_API_URL` is unset.

```bash
docker start harticfr-db
cd HartiCFR_BE && dotnet run --launch-profile http
cd HartiCFR_FE && pnpm dev
```
