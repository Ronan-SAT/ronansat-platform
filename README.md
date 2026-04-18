# Bluebook Main

SAT/Bluebook practice platform built with `Next.js 16`, `React 19`, `MongoDB`, `NextAuth`, `Gemini`, and supporting services such as Gmail SMTP and Google OAuth.

This README is intended to help a new contributor:

- install dependencies correctly
- configure the local environment
- run the app with the minimum required services
- enable optional integrations when needed
- seed sample data for quick testing

## 1. What is in this project

Main features currently present in the repo:

- email/password registration and login
- Google login
- forgot-password flow via email
- `STUDENT`, `PARENT`, and `ADMIN` roles
- SAT test taking, results, and dashboard flows
- AI chat for question explanations through Gemini
- parent verification via email
- leaderboard / hall of fame

Default entry flow:

- if the user is not logged in, the app redirects to `/auth`
- after login, the app continues through `/auth/redirect`

## 2. Tech stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `MongoDB + Mongoose`
- `NextAuth`
- `Google Gemini API`
- `Nodemailer (Gmail SMTP)`
- `Ant Design`

## 3. Prerequisites

Recommended local environment:

- `Node.js 20 LTS` or newer
- `bun`
- a local MongoDB Community Server instance

macOS prerequisites:

```bash
brew install bun
brew tap mongodb/brew
brew install mongodb/brew/mongodb-community
```

Windows prerequisites:

1. Install `bun` from `https://bun.sh/docs/installation`.
2. Install MongoDB Community Server from `https://www.mongodb.com/try/download/community` and keep the Windows Service option enabled during setup.
3. Install MongoDB Community Server from `https://www.mongodb.com/try/download/community` and keep the Windows Service option enabled during setup.

Optional services for full functionality:

- a Gmail account with an App Password for email sending
- a Google OAuth app
- a Gemini API key

This repo is now set up around `bun`:

- `bun.lock` is committed
- `package.json` declares `packageManager: bun@1.3.11`
- scripts are intended to be run with `bun run ...`

## 4. Install dependencies

```bash
git clone <repo-url>
cd ronansat-edtech
bun install
```

## 5. Get started

Fastest path to a working local setup:

Get `.env.keys` from a trusted teammate, then run:

```bash
bun install
bun run db
bun run dev
```

The committed `.env.development` file is encrypted. `bun run dev` now expects the matching local `.env.keys` file, plus an optional `.env.local` for personal overrides.

By default, `bun run dev` points the app at a local MongoDB database at `mongodb://127.0.0.1:27017/ronansat-local`.

On first run, if that local database is reachable but empty, `bun run db` automatically copies the latest remote MongoDB data into it.

If you want to refresh that local database from the shared remote MongoDB before startup, run:

```bash
bun run db -- --fetch
bun run dev
```

## 6. Fastest local setup

If you only want to boot the app and start developing, get the team `.env.keys` file first. Then create a `.env.local` only if you need personal MongoDB overrides.

Typical `.env.local` override example:

```env
LOCAL_MONGODB_URI=mongodb://127.0.0.1:27017/ronansat-local
REMOTE_MONGODB_URI=<mongodb connection string>
NEXTAUTH_SECRET=<long random secret>
```

Then run:

```bash
bun run db
bun run db -- --stop
bun run dev
```

Open:

```txt
http://localhost:3000
```

Important notes:

- `bun run db` starts the local MongoDB service for the `LOCAL_MONGODB_URI` target when the service is installed but not already running
- `bun run db -- --stop` stops the local MongoDB service for the `LOCAL_MONGODB_URI` target
- if the local database is empty on first run, `bun run db` automatically copies the current remote MongoDB data into it
- `bun run db -- --fetch` forces a fresh copy into the local database before you run the app
- MongoDB is required; `bun run dev` rewrites `MONGODB_URI` to `LOCAL_MONGODB_URI` before startup so the app uses a local database by default
- `NEXTAUTH_SECRET` is required for auth to work reliably

## 7. Environment variables

The repo now includes a committed `.env.example` for reference and a committed encrypted `.env.development` for shared development values.

This repo uses an encrypted shared development env with `dotenvx`:

- commit `.env.development` as the team-shared encrypted file
- commit `.env.production` when you want a separately encrypted production file
- keep `.env.keys` local and never commit it
- keep `.env.local` for personal overrides on top of the shared development values
- prefer `LOCAL_MONGODB_URI` for local dev and `REMOTE_MONGODB_URI` only for explicit syncs

Run the app in development with the encrypted shared env loaded through `dotenvx`:

```bash
bun run db
bun run db -- --stop
bun run dev
```

Refresh the local MongoDB from the remote source before booting:

```bash
bun run db -- --fetch
bun run dev
```

Production build and start use `.env.production`:

```bash
bun run build
bun run start
```

To update the shared encrypted development env:

```bash
./node_modules/.bin/dotenvx decrypt -f .env.development
# edit .env.development
./node_modules/.bin/dotenvx encrypt -f .env.development
```

You can distribute the encrypted `.env.development` through git, and distribute the matching `.env.keys` to trusted developers through a separate secure channel.

`bun run db`, `bun run dev`, `bun run build`, `bun run start`, and `bun run seed` all load env through `dotenvx`. Development commands use `.env.development` plus optional `.env.local` overrides, while production build and start use `.env.production`. The deployed production server runtime decrypts `.env.production` on startup with `DOTENV_PRIVATE_KEY_PRODUCTION`. `bun run db` uses `REMOTE_MONGODB_URI` or the shared `MONGODB_URI` as the fetch source when a first-run bootstrap or `--fetch` is needed, and `bun run dev` points the app itself at `LOCAL_MONGODB_URI`.

Environment variables used by the codebase:

| Variable | Required | Purpose |
| --- | --- | --- |
| `MONGODB_URI` | Yes | MongoDB connection |
| `LOCAL_MONGODB_URI` | For local dev | Local MongoDB target used by `bun run dev` |
| `REMOTE_MONGODB_URI` | Optional | Explicit remote MongoDB source for `bun run db -- --fetch` |
| `NEXTAUTH_SECRET` | Yes | NextAuth session/token secret |
| `GEMINI_API_KEY` | For AI chat | `/api/chat` |
| `EMAIL_USER` | For email features | Forgot password, parent verification |
| `EMAIL_PASS` | For email features | Gmail App Password for SMTP |
| `EMAIL_FROM_NAME` | Optional | Sender name for emails |
| `GOOGLE_CLIENT_ID` | For Google login | NextAuth Google provider |
| `GOOGLE_CLIENT_SECRET` | For Google login | NextAuth Google provider |
| `NEXT_PUBLIC_DESMOS_URL` | For Desmos-related UI | Public frontend URL |

Example `.env.local`:

```env
LOCAL_MONGODB_URI=mongodb://127.0.0.1:27017/ronansat-local
REMOTE_MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
NEXTAUTH_SECRET=replace-with-a-long-random-secret
GEMINI_API_KEY=

EMAIL_USER=
EMAIL_PASS=
EMAIL_FROM_NAME=Bluebook Support

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

NEXT_PUBLIC_DESMOS_URL=
```

## 8. Service setup

### 7.1 MongoDB

You can use either:

- local MongoDB
- MongoDB Atlas

Local example:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/bluebook-main
```

Atlas example:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>/<db-name>?retryWrites=true&w=majority
```

### 7.2 NEXTAUTH_SECRET

Use a long random string.

Example:

```env
NEXTAUTH_SECRET=this-should-be-a-long-random-secret-value
```

### 7.4 Gmail SMTP

Used for:

- forgot-password emails
- parent verification emails

Setup steps:

1. Sign in to Gmail.
2. Enable 2-Step Verification.
3. Create an App Password.
4. Put that App Password into `EMAIL_PASS`.

Example:

```env
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-16-char-app-password
EMAIL_FROM_NAME=Bluebook Support
```

If you see an error like `WebLoginRequired`, open Gmail in a browser, complete any pending security verification, and create a new App Password.

### 7.5 Google OAuth

Used by the Google login button on `/auth`.

Create OAuth credentials in Google Cloud Console and add:

```env
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
```

Typical local callback URL for NextAuth:

```txt
http://localhost:3000/api/auth/callback/google
```

### 7.6 Gemini API

Used for the question explanation chat feature.

```env
GEMINI_API_KEY=
```

If this variable is empty, the chat route will return `Gemini API key not configured`.

## 9. Running the project

### Development

```bash
bun run dev
```

### Production build

```bash
bun run build
bun run start
```

Before deploying with encrypted env files, set `DOTENV_PRIVATE_KEY_PRODUCTION` in Vercel so the build and the deployed server runtime can decrypt the committed `.env.production` file.

For local development with encrypted files, keep `DOTENV_PRIVATE_KEY_DEVELOPMENT` in your local `.env.keys` file.

If you are not using the encrypted-file workflow, make sure the Vercel project environment has the same required secrets as your app build, especially:

- `MONGODB_URI`
- `NEXTAUTH_SECRET`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `EMAIL_USER`
- `EMAIL_PASS`
- `GEMINI_API_KEY`


### Lint

```bash
bun run lint
```

## 10. Seeding sample data

The repo includes a seed script:

```bash
bun run seed
```

This script:

- reads `MONGODB_URI`
- creates a sample test
- inserts sample questions into MongoDB

The repo also contains:

- `parse_and_seed.ts`
- `reading_sample.txt`
- `math_sample.txt`

That script is meant for importing a larger sample set, but it does not have its own `package.json` script. Run it manually if needed:

```bash
bunx tsx parse_and_seed.ts
```

Warning:

- `parse_and_seed.ts` deletes old data in the `Test` and `Question` collections
- only run it if you are okay resetting test/question data

## 11. Suggested verification after setup

After configuring the environment and running `bun run dev`, verify in this order:

1. Open `http://localhost:3000`.
2. Confirm the app redirects to `/auth` when logged out.
3. Create a new account with email/password.
4. Log back in with that account.
5. If you seeded data, verify test/question flows.
6. If email is configured, test forgot password.
7. If Gemini is configured, test the AI chat in review flow.
8. If Google OAuth is configured, test Google login.

## 12. Available scripts

| Command | Meaning |
| --- | --- |
| `bun run dev` | Start the local dev server |
| `bun run build` | Build for production |
| `bun run start` | Start the production build |
| `bun run lint` | Run ESLint |
| `bun run seed` | Seed sample MongoDB data |
| `bun run changelog` | Generate/update changelog |

## 13. Notable project structure

| Path | Role |
| --- | --- |
| `app/` | App Router pages and API routes |
| `app/api/` | Route handlers |
| `components/` | UI components |
| `hooks/` | React hooks |
| `lib/` | Shared logic and infrastructure |
| `lib/models/` | Mongoose models |
| `lib/services/` | Business logic |
| `lib/controllers/` | Controller layer |
| `lib/authOptions.ts` | NextAuth configuration |
| `lib/mongodb.ts` | MongoDB connection |
| `lib/email.ts` | Gmail SMTP email sending |
| `next.config.ts` | Next.js config with image settings |
| `seed.ts` | Basic sample data seed |
| `parse_and_seed.ts` | Larger sample import script |
| `question_bank/` | Question content/source data |

## 14. Common issues

### `Please define the MONGODB_URI environment variable inside .env.local`

Cause:

- `.env.local` is missing
- `.env.keys` is missing, so `.env.development` could not be decrypted
- `MONGODB_URI` is missing or invalid

Fix:

- make sure `.env.keys` is present
- create `.env.local`
- check the MongoDB connection string

### Google login does not work

Check:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- the redirect URI in Google Cloud Console

### Email sending fails

Check:

- `EMAIL_USER`
- `EMAIL_PASS`
- Gmail App Password setup
- whether the Gmail account has passed Google security verification

### AI chat reports configuration errors

Check:

- `GEMINI_API_KEY`

## 15. Recommended onboarding order

If you want the fastest path to a working local environment:

1. Run `bun install`.
2. Get `.env.keys` from a trusted teammate.
3. Create `.env.local` only if you need local overrides.
4. Run `bun run dev`.
5. Run `bun run seed`.
6. Confirm sign-up and login work.
7. Enable email, Google login, and Gemini only when needed.

## 16. Additional notes

- The local workspace may already contain `node_modules/`, but after a fresh clone you should still run `bun install`.
- `/api/export-pdf` currently returns `410` and points users toward a client-side print flow instead of server-side PDF export.
- The current application roles are `STUDENT`, `PARENT`, and `ADMIN`.
