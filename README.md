# Course Cavern

An online course marketplace where instructors are vetted before they can sell. An instructor
submits credentials and work history, an administrator reviews the evidence, and only an approved
account can publish. What was verified, and when, shows on the instructor's public profile.

**Status:** scaffolded. Two pages, no database connection yet.

## Run it locally

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

That is the whole setup. There is no database, no Docker and no environment file to fill in yet,
because nothing reads from one. `.env.example` lists the variables that will be needed once the
data layer is wired up.

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 3000 |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |

## Pages

| Route | What it is |
| --- | --- |
| `/` | Public landing page |
| `/development` | Internal reference: the database structure and the reasoning behind it. Temporary, comes down before launch. |

## Stack

| Layer | Choice |
| --- | --- |
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4 |
| Backend | Next.js server actions |
| Database | PostgreSQL 17, parameterised SQL via node-postgres, no ORM |
| Identity | JWT sessions, bcrypt hashing, one time code for email |
| Payments | Stripe checkout, Stripe Connect for instructor payouts |
| Email | SendGrid |
| Storage | S3 compatible object storage |
| Infra | Docker Compose behind Caddy on a single cloud server |

## Layout

```
src/app/              routes, layout and the global stylesheet
src/components/       shared UI primitives (button, card, chrome)
src/lib/schema.ts     database structure as data, drives /development
db/migrations/        the executable schema
```

## Design system

Material Design 3, seeded from `#6750A4`. Every colour, radius, type step and easing curve is a
token declared once in `src/app/globals.css` under `@theme`. Nothing downstream hardcodes a hex
value, so re-seeding the palette is a change in one file.

Two things to know before adding UI:

- Use the `Button` variants rather than overriding colour with `className`. A utility passed in
  from outside competes with the component's own base class and Tailwind's output order decides
  the winner, not yours. That is how an invisible button happens. If you need a new treatment,
  add a variant.
- The same applies to `display`. To hide a button at a breakpoint, wrap it in a `div` and put
  `hidden sm:block` on the wrapper.

## Database

Thirteen tables in four groups: identity and vetting, catalogue, learning, money. `/development`
renders the full structure with every column, and `db/migrations/001_init.sql` is the executable
version. They are kept in step by hand, so changing one means changing the other.

## Team

HARM: Hamza Khawaja, Ashish, Rishabh, Mohamed
