# Backend deployment checklist
GitHub Pages cannot run Python, FastAPI or PostGIS. Deploy the Docker backend on a VPS/container host with persistent Postgres storage. Confirm persistent volumes and disk/memory limits before choosing a platform.

1. Provision Linux/container host and persistent disk.
2. Set strong `POSTGRES_PASSWORD`, `CORS_ORIGINS=https://vikasdocker.github.io`, and database URL.
3. Deploy PostGIS + API; keep database port 5432 private.
4. Add HTTPS for the API domain.
5. Run the Rahuri OSM download/import scripts against the database.
6. Verify health, features, search and route endpoints.
7. Add GitHub repository Actions variable `MAP_API_URL` with the public HTTPS API base URL. The Pages workflow injects it as `VITE_MAP_API_URL` at build time.
8. Redeploy Pages after setting the variable.

Never put database credentials in `VITE_*` variables. Vite exposes these values in browser code; only the public API URL belongs there.
