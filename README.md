# 🏫 CampusFix

> A multi-college campus maintenance reporting platform — students report, admins triage, and super-admins manage.

[![Live Demo](https://img.shields.io/badge/Live-Demo-blue?style=flat-square)](https://campus-fix-liart.vercel.app)
[![Next.js](https://img.shields.io/badge/Next.js-15-000000?style=flat-square&logo=nextdotjs)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com)
[![Vercel](https://img.shields.io/badge/Deployed-Vercel-black?style=flat-square&logo=vercel)](https://vercel.com)

CampusFix is a multi-college campus maintenance reporting platform. Students report infrastructure issues, administrators triage and resolve them, and super-admins manage colleges and platform-wide operations.

**🔗 Live Demo:** [campus-fix-liart.vercel.app](https://campus-fix-liart.vercel.app)

---

## 📸 App Preview

<p align="center">
  <img src="screenshots/admin-dashboard.png" alt="CampusFix Admin Dashboard" width="400">
</p>

---

## ✨ Features

### For Students
- 🎓 **College-specific accounts** (multi-college support)
- 📝 **Issue reporting** with location, category, description, and photos
- 🔍 **Public tracking** with unique IDs and status timelines
- 🔄 **Duplicate detection** with upvote/merge workflow

### For Administrators
- 🛠️ **Triage dashboard** with filters, building management, and report updates
- 📊 **Live metrics** (Total Reports, Needs Review, In Progress, Resolution Rate)
- 💬 **Campus Chat** for internal communication
- 👥 **College-level operations** and management

### For Super-Admins
- 👑 **College management** (add, edit, switch)
- 🌐 **Platform-wide operations** and oversight

### Under the Hood
- 🔐 **Supabase Auth** (with email verification via SMTP)
- 🗄️ **PostgreSQL database** with Row-Level Security (RLS)
- 📦 **Supabase Storage** for issue photos
- 🛡️ **Cloudflare Turnstile** bot protection on forms
- ⚡ **Redis-based** rate limiting
- 🔌 **REST-style API** via Next.js Route Handlers

---

## 🛠️ Tech Stack

| Layer | Technology |
|---|---|
| **Framework** | Next.js (App Router) |
| **Language** | TypeScript (.tsx) |
| **UI** | React · Tailwind CSS |
| **Database** | Supabase (PostgreSQL) |
| **Auth** | Supabase Auth |
| **Storage** | Supabase Storage |
| **Cache / Rate Limit** | Redis |
| **Bot Protection** | Cloudflare Turnstile |
| **Email** | SMTP |
| **Deployment** | Vercel |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18 or higher
- npm or yarn
- A free [Supabase](https://supabase.com) project
- Redis (e.g., [Upstash](https://upstash.com))
- Cloudflare Turnstile Keys

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/shaharyar78/Campus-Fix.git
cd Campus-Fix

# 2. Install dependencies
npm install
```

### Environment Variables

Create a `.env.local` file in the root directory and add the following:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Redis (Upstash or similar)
REDIS_URL=your_redis_url
REDIS_TOKEN=your_redis_token

# Cloudflare Turnstile
NEXT_PUBLIC_TURNSTILE_SITE_KEY=your_site_key
TURNSTILE_SECRET_KEY=your_secret_key

# SMTP (for email verification)
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
```

### Run Locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📜 Available Scripts

```bash
npm run dev      # Start development server (localhost:3000)
npm run build    # Create production build
npm run start    # Start production server
npm run lint     # Run ESLint
```

---

## 🔒 Security Guidelines

### Authentication
Supabase Auth authenticates users. Server components and Route Handlers must use server-side session validation. Expired or missing sessions must not reach protected operations.

### Authorization
Every protected operation checks:
- Authenticated identity
- Role
- College scope
- Resource ownership where applicable

Do not authorize based only on request parameters or a client-provided role.

### Row Level Security (RLS)
Supabase RLS is mandatory for college isolation. Policies must cover direct table access and storage access. Test RLS by acting as student, admin, and super-admin identities.

### Environment Secrets
Keep these values only in server or environment configuration:
- Supabase service-role key
- Database credentials
- Third-party API secrets

Never put them in `NEXT_PUBLIC_*` variables or commit them.

### Input Validation & File Uploads
- Validate and normalize all API input. Reject oversized text, invalid IDs, unsupported categories, and malformed file types.
- Limit report photos by size and type. Store uploads outside public paths unless intentionally configured.
- Generate safe object names and verify ownership before returning or deleting files.

### Duplicate Merging
An upvote must be unique per report and user. Duplicate report creation should use a database-safe mechanism or conflict result rather than a check-only implementation that races.

### Logging
Log operation metadata and request IDs, but never passwords, session tokens, service keys, or full sensitive records.

---

## 🤝 Contributing

Thank you for contributing to CampusFix. Keep changes focused, accessible, and consistent with the existing architecture.

### Development Workflow
1. Create a descriptive branch for your change.
2. Install dependencies and copy `.env.example` to `.env.local`.
3. Apply Supabase migrations and seed data in a development project.
4. Implement the smallest complete change.
5. Run relevant tests (when implemented).
6. Open a pull request using the repository template.

### Code Guidelines
- Use **TypeScript** and keep public types explicit.
- Prefer **Server Components** unless browser state or interaction is required.
- Keep API authorization and college isolation on the **server**.
- Reuse components and hooks instead of duplicating UI or data-fetching logic.
- Handle loading, empty, error, forbidden, and not-found states.
- **Never log secrets** or expose service-role credentials.
- Use clear names and avoid unnecessary comments.

### File and Naming Conventions
- React components use **PascalCase** and `.tsx` files.
- Hooks use `use<Name>.ts`.
- Route Handlers live under `src/app/api/**/route.ts`.
- Shared utilities live under `src/lib`.
- Data contracts live under `src/types`.
- SQL migrations use ISO-style numeric prefixes.

### Pull Requests
PR descriptions should explain:
- The problem
- Implementation details
- Test coverage
- Database changes
- Security impact
- Screenshots for visible UI changes

---

## 👤 Author

**Kabeer Shaharyar Husain**  
1st year B.Tech CSE · KCC Institute (2025–2029)  
📫 kabeerhusain765@gmail.com  
🔗 [GitHub](https://github.com/shaharyar78) · [LinkedIn](https://www.linkedin.com/in/kabeer-shaharyar-husain-22aa66415)

---

## 📄 License

MIT License

Copyright (c) 2026 Kabeer Shaharyar Husain

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
