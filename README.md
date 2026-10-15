# Course Cavern

An online course marketplace where instructors are vetted before they can sell. An instructor
submits credentials and work history, an administrator reviews the evidence, and only an approved
account can publish. What was verified, and when, shows on the instructor's public profile.

## Run it locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

That one command starts a real Postgres 17 database, applies the schema, creates an admin
account and runs the app. Nothing else to install, on Mac or Windows. The database lives in
`.localdb/` and uploaded documents in `storage/`, both ignored by git.

The first run also writes `.env.local` with a session secret and the admin's sign-in details.
**To sign in as admin**, use `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` from that file. The
password is random and different on every machine.

| Script | What it does |
| --- | --- |
| `npm run dev` | Database, migrations, admin seed, then the dev server on port 3000 |
| `npm run share` | Production build on this machine, plus a temporary public link for testers |
| `npm run build` | Production build. Needs no database |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run db:migrate` | Apply any new migrations without starting the app |
| `npm run db:reset` | Wipe the local database and uploaded files, then rebuild. Stop `npm run dev` first |

## Let other people try it

```bash
npm run share
```

Builds a production version, runs it on your laptop, and prints a link like
`https://some-random-words.trycloudflare.com` that anyone can open. Nothing is deployed; the link
goes through a free Cloudflare quick tunnel straight to your machine.

- Needs `cloudflared` on your PATH, from Cloudflare's
  [official releases](https://github.com/cloudflare/cloudflared/releases). No account required.
- The link stops working when you press Ctrl+C, close the terminal, or the laptop sleeps or loses
  its connection. It keeps the Mac from idle-sleeping while it runs, but closing the lid still
  sleeps it. Every run gives a new link.
- The app only listens on `127.0.0.1`, so the tunnel is the only way in. Nobody on the same Wi-Fi
  can reach it directly.
- Testers' accounts, courses and uploads land in your local database and `storage/`. Ask them to
  upload made-up documents, not real licences or IDs.
- You approve their applications by signing in as admin through the same link. Use the link
  rather than `127.0.0.1`: the production session cookie is HTTPS only, and some browsers will
  not keep it over plain HTTP.

Runs on port 3100 so it can sit alongside `npm run dev`. Set `SHARE_PORT` to change it.

## What works

Use cases 1, 2 and 3 from the inception document: apply to teach, review an application,
publish a course.

**Instructors** sign up, then apply with a profile and up to five documents (PDF, JPG, PNG or
WebP, 8 MB each). While the application is in review they can already build courses: details,
then an outline of sections and lessons that can be added, edited, reordered and deleted. Once
approved, a course goes to review from a checklist that shows exactly what is still missing.

**Admins** work through a queue of applications, open each document, and approve, turn down or
ask for more. Asking for more pauses the application and shows the instructor the note. Courses
get the same treatment: publish, or send back with changes. Every decision is kept, with who
made it and when, and a decision can be reopened later if it was wrong.

Not built yet: the public catalogue, buying and taking courses, payouts, lesson media uploads,
email, and password reset.

## How it fits together

```
src/proxy.ts            redirects signed-out visitors before protected pages render
src/lib/dal.ts          who is signed in and what they may do. Every check goes through here
src/lib/session.ts      signed session cookie, carrying the user id only
src/lib/db.ts           Postgres pool, query helpers, transactions
src/lib/storage.ts      private file storage for uploaded documents
src/lib/validation.ts   form validation, with the error messages users see
src/app/actions/        Server Actions: auth, applying, courses, admin decisions
src/app/                pages
src/components/         UI, built on the design tokens in src/app/globals.css
scripts/                the local database and the dev command
db/migrations/          the schema, applied in filename order
```

A few decisions worth knowing before changing anything:

- **The proxy is not security.** It cannot see the database, so it only redirects people with no
  session cookie. Every page and every Server Action checks again through `lib/dal.ts`. Server
  Actions are public endpoints and anything bound to them, like a course id, comes back from the
  browser and can be changed, so each one re-checks ownership.
- **The session cookie holds only the user id.** Role and approval status are read fresh on each
  request, so approving an instructor takes effect on their next click.
- **Documents are never public.** They are stored outside `public/` and served only through
  `/api/credentials/[id]`, to their owner or an admin. Anyone else gets a 404. Uploads are
  checked by their actual bytes, not just the type the browser claims.
- **Decisions are append only.** `application_decision` and `course_decision` are never updated
  or deleted. Each decision and the status change it causes are written in one transaction.
- **Money is integer cents.** Never a float.

## Traps we already fell into

- `redirect()` and `notFound()` work by throwing. Inside a `try`, the `catch` swallows them and
  the request carries on as if nothing happened. Keep them outside.
- React 19 resets a form after its action runs. Echo submitted values back through action state
  into `defaultValue`, or for forms with file inputs, which cannot be refilled, dispatch from
  `onSubmit` inside `startTransition` instead. The application form does the latter.
- `z.coerce.number()` in Zod 4 turns a blank field into `0`. Optional numbers go through the
  `blankToUndefined` helper in `lib/validation.ts` first.
- A Tailwind class passed in through `className` does not reliably beat the same property in a
  component's base classes. Add a variant to the component instead (see `Button`'s `inverse`), and
  to hide something at a breakpoint, wrap it.
- The Postgres pool has a size limit and timeouts on purpose. Without them, one connection that
  is never released quietly hangs the whole site.

## Design system

Material Design 3, seeded from `#6750A4`. Every colour, radius, type step and easing curve is a
token declared once in `src/app/globals.css` under `@theme`. Nothing downstream hardcodes a hex
value.

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js Server Actions |
| Database | PostgreSQL 17, parameterised SQL via node-postgres, no ORM |
| Identity | Signed session cookie (jose), bcrypt password hashes |
| Payments | Stripe checkout, Stripe Connect for instructor payouts (not yet wired) |
| Email | SendGrid (not yet wired) |
| Storage | Local disk in development, S3 compatible in production |
| Infra | Docker Compose behind Caddy on a single cloud server |

## Team

HARM: Hamza Khawaja, Ashish, Rishabh, Mohamed
