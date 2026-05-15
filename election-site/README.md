# PANS UniZik Election Site

Vite React election portal with Vercel serverless API routes, Supabase database storage, and Brevo/Nodemailer OTP email login.

## Features

- Voter login by registration number.
- OTP sent to the voter email stored in Supabase.
- One candidate per post, one completed ballot per voter.
- Hidden `/admin` dashboard protected by `ADMIN_PASSWORD`.
- Admin post/candidate management.
- Admin list of voters who have voted.
- Pie-chart results with SVG download.

## Setup

1. Create the Supabase tables through the session pooler:

   ```bash
   SUPABASE_PSQL_URL="postgresql://postgres:<database-password>@aws-0-<region>.pooler.supabase.com:6543/postgres?sslmode=require" \
   npm run db:schema
   ```

   The direct `db.<project-ref>.supabase.co` host can resolve over IPv6 only in some environments. The session pooler route is the IPv4-safe path for schema changes.

2. Import voters:

   ```bash
   SUPABASE_URL="https://<project-ref>.supabase.co" \
   SUPABASE_SERVICE_ROLE_KEY="<service-role-key>" \
   node scripts/import-voters.mjs /home/uche/Downloads/pans_voters_merged_with_emails.csv
   ```

3. Configure environment variables from `.env.example`.

4. Verify SMTP:

   ```bash
   SMTP_HOST="smtp-relay.brevo.com" \
   SMTP_PORT="587" \
   SMTP_USER="your-brevo-smtp-login" \
   SMTP_PASS="your-brevo-smtp-key" \
   SMTP_FROM="PANS UniZik Election <verified-sender@example.com>" \
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
- `SUPABASE_PSQL_URL`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- `ADMIN_PASSWORD`
- `ADMIN_SESSION_SECRET`
- `VOTER_SESSION_SECRET`
- `OTP_PEPPER`
- `CORS_ORIGIN`
- `COOKIE_SAMESITE`
- `VITE_API_BASE_URL`

Instead of `SMTP_*`, you may use `BREVO_API_KEY` plus `BREVO_FROM`, or Brevo SMTP aliases: `BREVO_SMTP_HOST`, `BREVO_SMTP_PORT`, `BREVO_SMTP_USER`, `BREVO_SMTP_PASS`, and `BREVO_FROM`.

Do not expose the service-role key or email API keys in frontend code. They are used only inside `/api`.

## Render Backend

The Render backend uses `server.js` and the same `/api/*` routes as local/Vercel Functions.

- Build command: `npm install`
- Start command: `npm start`
- Required backend env vars: all Supabase, SMTP, admin/session, `CORS_ORIGIN`, and `COOKIE_SAMESITE=None`.
- Frontend env var on Vercel: `VITE_API_BASE_URL=<render-backend-url>`.

## Admin CSV Import

The admin page can import a CSV with these columns:

- `post`
- `name`
- `tagline`
- `image_url`
- `eligible_level` (`200L`, `300L`, `400L`, `500L`, or blank for all voters)
- `display_order`
- `post_order` (optional; if blank, posts are ranked from House of Representatives first down to President last)

Use the `Download Template` button on the admin page to get a starter file.
