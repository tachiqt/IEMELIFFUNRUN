# AGOS Family Run 2026

Registration website for AGOS Family Run 2026. Public form has no admin sign-in. Open `/admin` directly.

## Local setup

1. Copy `.env.example` to `.env.local` and fill in values.
2. In Cloudflare R2, create a bucket matching `R2_BUCKET` (default `agos-2026-proofs`). Add a CORS rule allowing `PUT`, `GET`, and `HEAD` from your Cloud Run origin.
3. Start Postgres and apply the schema:

```bash
docker compose up -d
npx prisma generate
npm run db:push
npm run db:seed
npm run dev
```

- Form: http://localhost:3000
- Admin: http://localhost:3000/admin

## Google Cloud deploy

Create Cloud SQL (Postgres 16), Secret Manager secrets for every env var, Artifact Registry, then Cloud Run with the Cloud SQL connection.

Cloud SQL URL shape:

```
postgresql://USER:PASSWORD@localhost/agos?host=/cloudsql/PROJECT:REGION:INSTANCE
```

Build and deploy with `cloudbuild.yaml`, or:

```bash
gcloud run deploy agos-family-run --source . --region asia-southeast1 --allow-unauthenticated --add-cloudsql-instances PROJECT:REGION:INSTANCE
```

Set the same env/secrets used in `.env.example`.
