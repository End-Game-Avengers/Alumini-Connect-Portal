# Alumni Connect

A simple, responsive college community portal built with React, Express, MongoDB, and JWT. Students, alumni, faculty, HODs, and administrators share one site, with access controlled by server-side roles.

## Architecture

The project has two independent applications:

- `frontend/` is a React single-page app built with Vite. React Router handles pages, Axios calls the API, and normal CSS files provide the responsive design.
- `backend/` is an Express REST API. Mongoose stores users and portal data in MongoDB Atlas. JWT protects private routes and role middleware limits actions.
- The root Vercel project builds `frontend/` as a static site and routes `/api/*` to the Express function in `api/`.
- Public registration can create only student and alumni accounts. Students are enabled immediately; alumni accounts wait for department or administrator approval. Only an existing administrator can create faculty, HOD, or administrator accounts.

The browser stores the signed-in JWT in local storage and sends it as a bearer token. Passwords are hashed with bcrypt. Password-reset emails are optional and require SMTP settings.

## Project structure

```text
backend/
  config/          MongoDB connection
  controllers/     Public landing-page data handlers
  middleware/      JWT, role, and error handling
  models/          Mongoose schemas
  routes/          Authentication, public, and portal API routes
  scripts/         Administrator setup
  utils/           Shared notification helper
  server.js
frontend/
  src/
    components/    Navigation and protected routes
    context/       Signed-in user state
    pages/         Landing, auth, and role-aware dashboard
    services/      Axios API client
    styles/        Global, page, and component CSS
    assets/
```

## Requirements

- Node.js 20.19 or newer and npm
- A MongoDB Atlas cluster (or local MongoDB for development)
- Optional SMTP credentials for password-reset email

## Run locally

Open two terminals from the project root.

### 1. Configure and run the API

```powershell
Copy-Item backend\.env.example backend\.env
npm run install:all
npm run dev:api
```

Edit `backend/.env` and set `MONGODB_URI` and a long random `JWT_SECRET`. In MongoDB Atlas, create a database user and allow the development machine's IP in Network Access. The API listens on `http://localhost:5000`.

### 2. Run the website

```powershell
Copy-Item frontend\.env.example frontend\.env
npm run dev:web
```

Open `http://localhost:5173`. `VITE_API_URL` defaults to `http://localhost:5000/api`. On API startup, the database adds the standard B.Tech departments (CSE, IT, ECE, EEE, Mechanical, Civil, and AI & Data Science) if they do not already exist. An administrator can add, rename, or remove departments to match the college.

### 3. Create the first administrator

Set `ADMIN_NAME`, `ADMIN_EMAIL`, and a unique `ADMIN_PASSWORD` of at least 12 characters in `backend/.env`, then run:

```powershell
npm run create-admin
```

The setup command refuses to overwrite an existing account. Sign in with that administrator, adjust departments as needed, then create faculty and HOD accounts from **Dashboard → Management**. Users can register as students or alumni from the landing page.

## Roles and main features

- **Student:** alumni directory with name, department, year, and company filters; connection and mentorship requests; jobs and internships; event registration; announcements; learning resources; profile and application status.
- **Alumni:** professional profile, skills and achievements, mentor availability, connection and mentorship request handling, and job/internship publishing.
- **Faculty:** department people directory, learning resources, announcements, event creation, opportunity publishing, and applications for their opportunities.
- **HOD:** department-scoped people and mentorship views, alumni approvals, department statistics, and downloadable CSV report.
- **Admin:** platform statistics, user and department management, staff-account creation, alumni approvals, content management, recent activity, and downloadable reports.
- **Visitors:** a contact form that routes messages to administrator notifications, protected by request limits.

Dashboard views load live API data. Public landing-page totals, profiles, and upcoming events are also read from MongoDB; the site does not depend on bundled sample records.

## API reference

All private routes use `Authorization: Bearer <JWT>`. JSON request and response bodies are used unless noted.

| Method | Path | Access | Purpose |
|---|---|---|---|
| GET | `/api/health` | Public | Deployment health check |
| GET | `/api/public/overview` | Public | Live platform totals, alumni highlights, and upcoming events |
| GET | `/api/public/departments` | Public | Department choices for registration |
| POST | `/api/public/contact` | Public, rate-limited | Send a message to the college administrator |
| POST | `/api/auth/register` | Public | Register as student or alumni |
| POST | `/api/auth/login` | Public | Sign in and receive JWT |
| POST | `/api/auth/logout` | Signed in | Client-side session sign-out acknowledgement |
| GET | `/api/auth/me` | Signed in | Current user and profile |
| POST | `/api/auth/forgot-password` | Public | Email a one-hour password-reset link (SMTP required) |
| POST | `/api/auth/reset-password` | Public | Set a password with a reset token |
| GET | `/api/departments` | Signed in | List departments |
| GET | `/api/users` | Admin, HOD, faculty | Search/list scoped users |
| GET | `/api/users/:id` | Signed in | View a user and profile |
| PATCH | `/api/users/me` | Signed in | Update own account and profile fields |
| DELETE | `/api/users/:id` | Admin, HOD | Remove a non-admin user |
| GET | `/api/alumni` | Signed in | Search approved alumni by `search`, `department`, `year`, or `company` |
| POST, GET | `/api/connections` | Signed in (POST student/alumni) | Send and list connection requests |
| PATCH | `/api/connections/:id` | Request recipient | Accept/reject a connection |
| GET | `/api/mentors` | Signed in | List alumni available to mentor |
| POST, GET | `/api/mentorship` | Student (POST); signed in (GET) | Request and view mentorship |
| PATCH | `/api/mentorship/:id` | Alumni owner | Accept/reject a request |
| GET, POST | `/api/jobs` | Signed in (GET); alumni/staff (POST) | List and publish opportunities |
| PATCH, DELETE | `/api/jobs/:id` | Owner, HOD, or admin | Update/remove an opportunity |
| POST | `/api/jobs/:id/apply` | Student | Apply internally |
| GET | `/api/applications` | Signed in | View own or managed applications |
| PATCH | `/api/applications/:id` | Opportunity owner, HOD, admin | Update application status |
| GET, POST | `/api/events` | Signed in (GET); staff (POST) | Browse and create events |
| POST | `/api/events/:id/register` | Signed in | Register for an event |
| GET | `/api/events/:id/participants` | Faculty, HOD, admin | List participants |
| DELETE | `/api/events/:id` | Creator, HOD, admin | Remove an event |
| GET, POST | `/api/announcements` | Signed in (GET); staff (POST) | Browse and publish announcements |
| DELETE | `/api/announcements/:id` | Author, HOD, admin | Remove an announcement |
| GET, POST | `/api/resources` | Signed in (GET); staff (POST) | Browse and share learning resources |
| DELETE | `/api/resources/:id` | Author, HOD, admin | Remove a resource |
| GET, PATCH | `/api/notifications` | Signed in | List notifications; `PATCH /api/notifications/read-all` marks them read |
| GET | `/api/admin/stats` | Admin, HOD | Platform/department dashboard totals |
| GET | `/api/admin/pending` | Admin, HOD | Pending alumni registrations |
| PATCH | `/api/admin/users/:id/approval` | Admin, HOD (own department) | Approve/reject an alumni account |
| POST | `/api/admin/accounts` | Admin | Create faculty, HOD, or administrator account |
| POST, PATCH, DELETE | `/api/admin/departments` and `/api/admin/departments/:id` | Admin | Manage departments |
| GET | `/api/admin/activity` | Admin | Recent platform activity |
| GET | `/api/admin/reports` | Admin, HOD | Department report data |

## Deploy

### MongoDB Atlas

Create a free Atlas cluster and database user. Vercel Functions can use varying outbound IP addresses; if Atlas requires it, you may need to allow connections from any IP (`0.0.0.0/0`). If you do, use a unique, strong database password and restrict the database user's permissions. Keep the connection string in Vercel environment variables, never in source control.

### Full-stack deployment on Vercel

The root `vercel.json` builds the Vite frontend from `frontend/`, keeps React Router routes working on refresh, and sends `/api/*` requests to the Express function in `api/`.

1. Import the GitHub repository into [Vercel](https://vercel.com/new).
2. Set **Root Directory** to the repository root (`.`), not `frontend` or `backend`.
3. Use the repository's root `package.json` build script. The output directory is `frontend/dist`.
4. Add these environment variables to the Vercel project:
   - `MONGODB_URI`: your Atlas connection string
   - `JWT_SECRET`: a random secret of at least 32 characters
   - `JWT_EXPIRES_IN`: `7d`
   - `NODE_ENV`: `production`
   - `CLIENT_URL`: the exact Vercel site origin, such as `https://your-site.vercel.app`
   - `VITE_API_URL`: `/api`
5. Deploy and check `https://your-site.vercel.app/api/health`; it should return `{"status":"ok"}`.

Create the first administrator from your computer: set the Atlas `MONGODB_URI`, `ADMIN_NAME`, `ADMIN_EMAIL`, and a strong `ADMIN_PASSWORD` in `backend/.env`, then run `npm run create-admin` from the repository root. Allow your computer's IP in Atlas Network Access while running the command. The script refuses to overwrite an existing account.

Vercel's [Hobby plan](https://vercel.com/docs/plans/hobby) is free for personal projects. Password-reset email is optional; configure SMTP only if your provider and the Vercel runtime support it.

## Security and operations notes

- Never put production credentials in `.env.example` or commit `.env` files.
- Use a unique random JWT secret and strong administrator passwords.
- The API validates role transitions server-side; hiding a button in React is not an authorization check.
- Password reset is intentionally unavailable until SMTP is configured; the API does not expose reset tokens in responses.
- Use HTTPS for deployed frontend, API, and external application links.
- This is a college mini-project foundation. Before handling sensitive production data, add formal privacy/retention policies, monitoring, automated integration tests, and an institutional email verification process.
