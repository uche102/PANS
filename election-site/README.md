# PANS UniZik Election Site

Vite React election portal with Vercel serverless API routes, Supabase database storage, and Nodemailer OTP email login.

## Features

- Voter login by registration number.
- OTP sent to the voter email stored in Supabase.
- One candidate per post, one completed ballot per voter.
- Hidden `/admin` dashboard protected by `ADMIN_PASSWORD`.
- Admin post/candidate management.
- Admin list of voters who have voted.
- Pie-chart results with SVG download.

## Setup

1. Create the Supabase tables:

   ```bash
   psql "host=db.<project-ref>.supabase.co port=5432 dbname=postgres user=postgres sslmode=require" -f supabase/schema.sql
   ```

2. Import voters:

   ```bash
   SUPABASE_URL="https://<project-ref>.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
   node scripts/import-voters.mjs /home/uche/Downloads/pans_voters_merged_with_emails.csv
   ```

3. Configure environment variables from `.env.example`.

4. Verify SMTP:

   ```bash
   SMTP_HOST="smtp.gmail.com" \
   SMTP_PORT="465" \
   SMTP_USER="your-email@gmail.com" \
   SMTP_PASS="your-16-character-app-password" \
   SMTP_FROM="PANS UniZik Election <your-email@gmail.com>" \
   npm run check:smtp -- your-test-recipient@example.com
   ```

5. Run locally:

   ```bash
   npm install
   npm run dev
   ```

6. Deploy to Vercel after adding the same environment variables to the Vercel project:

   ```bash
   vercel --prod
   ```

## Required Environment Variables

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `RESEND_API_KEY`
- `RESEND_FROM`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `VOTER_SESSION_SECRET`
- `OTP_PEPPER`
- `CORS_ORIGIN`
- `COOKIE_SAMESITE`
- `VITE_API_BASE_URL`

Do not expose the service-role key or email API keys in frontend code. They are used only inside `/api`.

## Render Backend

The Render backend uses `server.js` and the same `/api/*` routes as local/Vercel Functions.

- Build command: `npm install`
- Start command: `npm start`
- Required backend env vars: all Supabase, SMTP, admin/session, `CORS_ORIGIN`, and `COOKIE_SAMESITE=None`.
- Frontend env var on Vercel: `VITE_API_BASE_URL=<render-backend-url>`.
