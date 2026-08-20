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

## 3. Confirm the two cross-references

The frontend and backend each need to know the other's public URL, and they are
set as plain values because Render has no variable that yields a full `https://`
URL. After the first deploy, check both in the dashboard:

| Service | Variable | Must equal |
|---|---|---|
| `harticfr-api` | `Cors__AllowedOrigins` | the static site's URL, e.g. `https://harticfr.onrender.com` |
| `harticfr` | `VITE_API_URL` | the API's URL, e.g. `https://harticfr-api.onrender.com` |

Getting these wrong is the most likely failure: the browser will report a CORS
error and login will not persist. `VITE_API_URL` is baked into the JavaScript
bundle at build time, so changing it requires a redeploy of the static site,
not just a restart.

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
