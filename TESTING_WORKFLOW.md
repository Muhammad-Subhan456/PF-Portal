# Programming Fundamentals Portal — Testing Workflow

Manual QA checklist for local testing at the Vite URL (currently often `http://localhost:8081` if 8080 is busy).

## How it works

| Who | How they get in | Lands on |
|-----|-----------------|----------|
| Owner/admin | `VITE_BOOTSTRAP_ADMIN_EMAILS` + `admins` row | `/admin` |
| Student | PUCIT email + `enrolled_students` row | `/` |
| Random Google | Fails access check | `/login?error=...` |

Sections: **CS-F26-M**, **CS-F26-A**.

```
Google OAuth → access gate → Admin (content + grades) or Student (materials + grades)
```

---

## Prerequisites

- [ ] `.env`: `VITE_SUPABASE_URL` (no `/rest/v1/`), `VITE_SUPABASE_ANON_KEY`, `VITE_BOOTSTRAP_ADMIN_EMAILS`
- [ ] Migrations applied (F26 sections); storage buckets + policies
- [ ] Google OAuth enabled; Site URL + `http://localhost:PORT/auth/callback` in Supabase
- [ ] `npm run dev` running
- [ ] [`scripts/promote-admin.sql`](scripts/promote-admin.sql) run for your email
- [ ] Optional seed: [`scripts/seed-test-data.sql`](scripts/seed-test-data.sql)

Verify env quickly:

```powershell
node scripts/verify-test-prereqs.js
```

---

## Workflow A — Admin (do first)

1. Open `/login` → **Continue with Google** → expect `/admin`
2. **Students** (`/admin/students`): add roll, name, `CS-F26-M` or `CS-F26-A`, PUCIT email (or run seed SQL)
3. **Labs / Assignments / Quizzes**: create one of each; upload a small PDF/file; confirm no Storage errors
4. **Grades** (`/admin/grades`): skip until Google Sheets Phase 7
5. **Settings** (`/admin/settings`): shows Programming Fundamentals / Fall 2026 / CS-F26
6. Sign out

Checklist:

- [ ] Admin login → `/admin`
- [ ] Student enrolled (UI or seed)
- [ ] At least one lab/assignment/quiz created
- [ ] Branding correct on admin screens

---

## Workflow B — Student

Needs a **PUCIT** Google account that was enrolled in A.

1. Login → land on `/` (not `/admin`)
2. Dashboard loads (grades may be empty)
3. Materials: labs / assignments / quizzes visible; download works
4. `/grades` — empty until Sheets sync
5. `/profile` — roll, section CS-F26-*, Fall 2026
6. `/contact` loads
7. Sign out → `/` redirects to `/login`

Checklist:

- [ ] Student login → dashboard
- [ ] Materials visible + downloadable
- [ ] Profile shows CS-F26-* and Fall 2026

---

## Workflow C — Access control

| Action | Expected |
|--------|----------|
| Logged out visit `/` or `/admin` | → `/login` |
| Google not PUCIT and not bootstrap | Denied after OAuth |
| PUCIT not in `enrolled_students` | Denied (“not enrolled”) |
| Student opens `/admin` | → `/` |
| Admin opens `/` | → `/admin` |

Checklist:

- [ ] Logged-out redirect works
- [ ] Unauthorized Google denied
- [ ] Student cannot open admin

---

## Workflow D — Full loop (later)

1. Admin enrolls student in CS-F26-M  
2. Admin uploads Lab 1  
3. Admin syncs grades (Sheets Phase 7)  
4. Student sees Lab 1 + grade  
5. Re-sync after sheet edit → grade updates  

---

## Grades (deferred)

Google Sheets Edge Function sync is **Phase 7** — do not block A/B/C on grades.

See [GOOGLE_SHEETS_SETUP.md](GOOGLE_SHEETS_SETUP.md) when ready.
