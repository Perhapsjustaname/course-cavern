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
`.localdb/` and uploaded files in `storage/`, both ignored by git.

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

From the inception document: Apply to teach, Review an application, and Publish a course, apart
from the public catalogue a published course goes into.

**Instructors** sign up, then apply with a profile and up to five documents (PDF, JPG, PNG or
WebP, 8 MB each). While the application is in review they can already build courses.

**The course builder** has three tabs.

- **Curriculum.** Sections, each with an optional description, and lessons inside them. Both can
  be dragged into a new order or moved with the arrow buttons, which also work by keyboard and on
  phones. A lesson can be moved to another section.
- **Lessons** are a video, audio, PDF, reading or quiz. Files upload with a progress bar and a
  cancel button, up to 100 MB, and video and audio length is read from the file. Readings use a
  rich text editor. Quiz questions have 2 to 6 answers, one marked right, each with an optional
  explanation. Any lesson can be a free preview.
- **Details.** Title, summary, industry, level, a rich text description, and a thumbnail that is
  resized in the browser before it uploads.
- **Pricing.** The price in Canadian dollars, or 0 for free.

Once the instructor is approved, a checklist shows what is still missing, and the course goes to
review when everything is ticked. It is locked while in review and while live. Taking a live
course offline to edit it, and deleting a course, both ask for the password again.

**Admins** work through a queue of applications, open each document, and approve, turn down or
ask for more. Asking for more pauses the application and shows the instructor the note. Courses
get the same treatment: the reviewer can play every video and audio file, read every PDF and
reading, and see each quiz with the right answers marked, then publish or send it back with
changes. Every decision is kept, with who made it and when, and a decision can be reopened later
if it was wrong.

Not built yet: the public catalogue, buying and taking courses, payouts, email, and password
reset.

## How it fits together

```
src/proxy.ts            redirects signed-out visitors before protected pages render
src/lib/dal.ts          who is signed in and what they may do. Every check goes through here
src/lib/session.ts      signed session cookie, carrying the user id only
src/lib/db.ts           Postgres pool, query helpers, transactions
src/lib/storage.ts      private file storage: documents, lesson files, thumbnails
src/lib/media.ts        allowed file types, size limits and byte signatures, for browser and server
src/lib/rich-text.ts    cleans rich text against an allowlist, on save and again on display
src/lib/validation.ts   form validation, with the error messages users see
src/app/actions/        Server Actions: auth, applying, courses, admin decisions
src/app/api/            routes that stream uploads in and serve private files back out
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
- **Uploaded files are private.** They are stored outside `public/` and served only through the
  routes in `src/app/api/`. Documents go to their owner or an admin. Lesson files go to their
  owner, and to an admin once the course is sent for review. A thumbnail is public only once its
  course is published. Anyone else gets a 404. Every upload is checked by its actual bytes, not
  just the type the browser claims.
- **Lesson uploads stream straight to disk.** They go through a route handler rather than a
  Server Action, so a large video is never held in memory. Files are served with HTTP range
  support, so players can skip ahead without downloading the whole thing.
- **The 100 MB cap comes from the tunnel.** Cloudflare quick tunnels refuse request bodies over
  100 MB, so `npm run share` could not accept anything bigger. It is `LESSON_MAX_BYTES` in
  `src/lib/media.ts`. Once uploads go straight to object storage in production it can go up.
- **Rich text is cleaned twice.** Once when saved and again when shown, against the allowlist in
  `src/lib/rich-text.ts`. Scripts, event handlers and `javascript:` links are dropped.
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
  component's base classes. Add a variant to the component instead (see `Button`'s `inverse` and
  `danger`), and to hide something at a breakpoint, wrap it.
- The proxy silently cuts request bodies off at 10 MB. Server Actions skip it (its matcher ignores
  requests with a `next-action` header) and it never matches `/api`. Keep it that way, or large
  uploads arrive cut short and fail with "Unexpected end of form".
- `next/image` fetches images on the server without the visitor's cookies, so it cannot load a
  private one. Thumbnails use a plain `<img>`.
- React's `cache()` does nothing inside a Server Action. An action always reads fresh data.
- Tiptap 3 does not re-render on every keystroke by default. Toolbar state comes from
  `useEditorState`, and the editor keeps an empty paragraph at the end, which
  `lib/rich-text.ts` trims off on save.
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
