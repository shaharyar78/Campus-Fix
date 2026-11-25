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

