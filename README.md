# Course Cavern

An online course marketplace where instructors are vetted before they can sell. An instructor
submits credentials and work history, an administrator reviews the evidence, and only an approved
account can publish. What was verified, and when, shows on the instructor's public profile.

**Status:** Inception complete. Nothing built yet.

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

## Getting started

Not scaffolded yet. The first iteration sets up the app skeleton, the database schema and
the local Docker environment.

## Use cases

1. Apply to teach
2. Review an application
3. Publish a course
4. Find a course
5. Buy and take a course
6. Get paid
7. Track course performance

## Team

HARM: Hamza Khawaja, Ashish, Rishabh, Mohamed
