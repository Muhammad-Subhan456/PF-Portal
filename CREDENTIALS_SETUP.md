# Credentials & Login Setup (From Scratch)

The old Supabase project (`agtzjfzxwyjwxpxkvwuc`) no longer resolves. Follow these steps with **your** accounts.

## Phase 1 — Create Supabase project

1. Open [https://supabase.com/dashboard](https://supabase.com/dashboard) and sign in (GitHub/Google).
2. Click **New project**.
3. Name: `dsa-portal` (any name). Set a database password (save it). Pick a nearby region.
4. Wait until the project is ready.
5. Go to **Project Settings** (gear) → **API**.
6. Copy:
  - **Project URL** → `VITE_SUPABASE_URL`
  - **anon** `public` key → `VITE_SUPABASE_ANON_KEY`
7. Paste both into the project `.env` file (and set your email):

```env
VITE_SUPABASE_URL=https://YOUR_REF.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
VITE_BOOTSTRAP_ADMIN_EMAILS=your-google-email@gmail.com
```

1. Restart the dev server (`Ctrl+C`, then `npm run dev`).

**Also copy your Project Ref** (subdomain before `.supabase.co`) — you need it for Google OAuth.

---



## Phase 2 — Database + storage



### 2a. Run SQL migrations

1. Supabase → **SQL Editor** → **New query**.
2. Open `[scripts/apply-all-migrations.sql](scripts/apply-all-migrations.sql)` in this repo, copy all, paste into the editor, click **Run**.
3. Confirm no errors (ignore “already exists” only if re-running).



### 2b. Create storage buckets

1. Supabase → **Storage** → **New bucket**.
2. Create three buckets (names exact): `labs`, `assignments`, `quizzes`.
3. For each, enable **Public bucket** (public read).



### 2c. Storage policies

1. **Project Settings → API** → copy **service_role** key (secret — do not commit).
2. In PowerShell from the project folder (URL must be the project root — **no** `/rest/v1/`):

```powershell
$env:SUPABASE_SERVICE_ROLE_KEY = "paste_service_role_key"
$env:VITE_SUPABASE_URL = "https://YOUR_REF.supabase.co"
node scripts/setup-storage-policies.js
```

3. The script creates/verifies buckets, then tells you to apply policies. In Supabase **SQL Editor**, paste and run [`scripts/setup-storage-policies.sql`](scripts/setup-storage-policies.sql).

---



## Phase 3 — Google Cloud OAuth

1. Open [Google Cloud Console](https://console.cloud.google.com/).
2. Create a project named `PF Portal` (or select one).
3. **APIs & Services → OAuth consent screen**:
   - User type: **External** → Create
   - App name: `Programming Fundamentals Portal`
   - User support email: your email
   - Developer contact: your email
   - Save. Scopes: add `email`, `profile`, `openid` if asked
   - **Test users**: add the Google account you will use to log in
4. **APIs & Services → Credentials → Create credentials → OAuth client ID**:
   - Application type: **Web application**
   - Name: `PF Portal Web`
  - **Authorized JavaScript origins:**
    - `http://localhost:8080`
    - `https://YOUR_REF.supabase.co`
  - **Authorized redirect URIs:**
    - `http://localhost:8080/auth/callback`
    - `https://YOUR_REF.supabase.co/auth/v1/callback`
5. Create → copy **Client ID** and **Client Secret**.

---



## Phase 4 — Enable Google in Supabase

1. Supabase → **Authentication → Providers → Google** → Enable.
2. Paste Client ID + Client Secret → **Save**.
3. **Authentication → URL Configuration**:
  - **Site URL:** `http://localhost:8080`
  - **Redirect URLs:** add `http://localhost:8080/auth/callback`

---



## Phase 5 — Make yourself admin + first login

1. Ensure `.env` has URL, anon key, and `VITE_BOOTSTRAP_ADMIN_EMAILS=your@email`.
2. **Before first login**, open Supabase **SQL Editor**, edit `[scripts/promote-admin.sql](scripts/promote-admin.sql)` with your Google email/name, run at least the `INSERT INTO public.admins` statement.
3. `npm run dev` → open [http://localhost:8080/login](http://localhost:8080/login)
4. Leave the email field **blank** (or type the same bootstrap email) → **Continue with Google**.
5. After login, run the `UPDATE public.users SET is_admin = TRUE ...` line from `promote-admin.sql` if needed, then refresh → you should reach `/admin`.

---



## Phase 6 — Deploy on Vercel

1. Create a GitHub repo and push this project (root = folder that contains `package.json`).
2. [vercel.com](https://vercel.com) → **Add New Project** → import the repo.
3. Framework: Vite. Set env vars:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_BOOTSTRAP_ADMIN_EMAILS`
4. Deploy. Copy the production URL (e.g. `https://dsa-portal.vercel.app`).
5. Add to **Google OAuth** origins/redirects:
  - Origin: `https://your-app.vercel.app`
  - Redirect: `https://your-app.vercel.app/auth/callback`
  - Keep Supabase callback: `https://YOUR_REF.supabase.co/auth/v1/callback`
6. Supabase **Auth → URL Configuration**:
  - Site URL → production URL (or keep localhost and add both in Redirect URLs)
  - Redirect URLs → add `https://your-app.vercel.app/auth/callback`

---



## Phase 7 — Google Sheets grades

1. Follow [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) (Sheets API + service account + secret + deploy).
2. Share each grade sheet with the service account email (**Viewer**).
3. Admin → **Grades Config** → save sheet URL per section → **Sync Now**.
4. Confirm student `/grades` shows data for matching roll numbers.

---

## Checklist

- [ ] Supabase project created; `.env` updated
- [ ] Migrations applied (`scripts/apply-all-migrations.sql`)
- [ ] Buckets `labs` / `assignments` / `quizzes` + storage policies
- [ ] Google OAuth client created; wired in Supabase
- [ ] Local Google login works
- [ ] `promote-admin.sql` run; `/admin` works
- [ ] Vercel deploy + production redirect URLs
- [ ] Google Sheets sync working for CS-F26-M / CS-F26-A
