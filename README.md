# LifeDesk

> **Your Life, Organized.**

LifeDesk is a personal **Student Command Center** designed to bring college work, deadlines, hackathons, calendar events, and personal money tracking into one focused workspace.

It is built as a responsive web app with cloud-backed authentication and data synchronization, with a Progressive Web App (PWA) setup for an app-like experience.

## ✨ Features

### 📊 Dashboard
- Today's tasks
- Upcoming deadlines
- Overdue items
- Upcoming hackathons
- Available money
- UPI balance
- Cash balance
- Monthly expenses
- Card spending
- Recent transactions

### ✅ Task Management
- Create, edit, delete and complete tasks
- Task descriptions, notes and tags
- Categories:
  - College
  - Practical
  - Assignment
  - Project
  - Exam
  - Hackathon
  - Presentation
  - Personal
  - Other
- Priorities: Low, Medium, High, Urgent
- Status: Not Started, In Progress, Completed
- Today, Upcoming, Completed and Overdue views
- Search, filtering and sorting

### ⏰ Deadline Management
Track:
- Assignments
- Practicals
- PPTs
- Projects
- Hackathons
- Quizzes
- Exams
- Events

Deadlines support status tracking, countdown/relative dates and completion state.

### 📅 Calendar
- Month, Week and Day views
- Tasks
- Deadlines
- Events
- Hackathon milestones

### 🏆 Hackathon Tracker
Track an entire hackathon journey from registration to final pitch.

Supported milestones include:
- Registration
- Idea Submission
- PPT Submission
- Screening Quiz
- Prototype
- Final Submission
- Final Pitch

Each milestone can include its own date/time, status, notes and linked task.

### 💰 Money Manager
LifeDesk separates available money from card spending:

- **Available Money = UPI + Cash**
- Payment sources: Cash, UPI, Card
- Income can be added to UPI or Cash
- UPI ↔ Cash transfers do not count as expenses
- Card transactions do not reduce UPI/Cash
- Card spending is still included in expense analytics
- Expense categories include Food, Travel, College, Study Material, Software, Hackathon, Shopping, Entertainment, Recharge, Hostel/Room and Other
- Transactions can be edited or deleted

### 📈 Analytics
View spending and money trends including:
- Monthly expenses
- Weekly spending
- Category breakdown
- Payment-source breakdown
- Cash spending
- UPI spending
- Card spending
- Income
- Transfers

### 👤 Profile & Account
- Full name
- Email
- Phone
- College / institution
- Course
- Year / semester
- Bio
- Avatar
- Password management
- Sign out
- Account deletion flow

LifeDesk is designed **not to store sensitive banking credentials**, including UPI PINs, card CVVs, banking passwords or OTPs.

### ☁️ Cloud Sync
LifeDesk uses Supabase for:
- Authentication
- PostgreSQL data
- User profiles
- Cloud synchronization
- Realtime-ready architecture
- Storage

The same account can be used across supported devices.

### 🌓 Theme & Responsive UI
- Light mode
- Dark mode
- System mode
- Persistent theme preference
- Responsive desktop, tablet and mobile layouts
- PWA support

---

## 🛠️ Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Icons | Lucide React |
| Animation | Motion |
| Backend / Database | Supabase |
| Authentication | Supabase Auth |
| Database | PostgreSQL |
| Storage | Supabase Storage |
| PWA | vite-plugin-pwa + Web App Manifest |
| Hosting | GitHub Pages |
| Package Manager | Bun |
| Source Control | Git + GitHub |

---

## 🏗️ Project Structure

```text
LifeDesk/
├── .github/
│   └── workflows/
│       └── deploy.yml
├── public/
│   ├── manifest.webmanifest
│   ├── lifedesk-pwa-192.png
│   ├── lifedesk-pwa-512.png
│   └── ...
├── src/
│   ├── components/
│   ├── context/
│   ├── services/
│   ├── types/
│   ├── views/
│   ├── App.tsx
│   ├── index.css
│   └── main.tsx
├── supabase/
│   └── functions/
│       └── delete-account/
├── .env.example
├── index.html
├── package.json
├── supabase_schema.sql
├── tsconfig.json
└── vite.config.ts
```

---

## 🚀 Getting Started

### Prerequisites

Make sure you have:

- Node.js 20+ or Bun
- A Supabase project
- Git

### 1. Clone the repository

```bash
git clone https://github.com/awakenedarpit/LifeDesk.git
cd LifeDesk
```

### 2. Install dependencies

Using Bun:

```bash
bun install
```

Or using npm:

```bash
npm install
```

### 3. Configure environment variables

Create a local `.env` file from `.env.example`.

Required Supabase variables:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-or-publishable-key
```

Use only the **public/anon/publishable key** in the frontend. Never expose a Supabase service-role key or database password in client-side code.

### 4. Set up Supabase

1. Create a Supabase project.
2. Open the Supabase SQL Editor.
3. Run `supabase_schema.sql`.
4. Configure Supabase Auth for email/password authentication.
5. Add the project URL and public API key to your environment variables.

### 5. Start the development server

```bash
bun run dev
```

The Vite development server will be available locally on the configured port.

### 6. Build for production

```bash
bun run build
```

To preview the production build locally:

```bash
bun run preview
```

TypeScript checking:

```bash
bun run lint
```

---

## 🌐 Deployment

LifeDesk is configured for **GitHub Pages**.

Production path:

```text
https://awakenedarpit.github.io/LifeDesk/
```

The Vite base path is configured for the repository:

```text
/LifeDesk/
```

The GitHub Actions workflow builds and deploys the application when changes are pushed to `main`.

For the deployment to connect to Supabase, configure these GitHub repository secrets:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Do not add service-role keys, database passwords or other privileged secrets to GitHub Pages environment variables.

---

## 📱 PWA

LifeDesk includes a Progressive Web App configuration.

The PWA includes:
- Web App Manifest
- 192×192 app icon
- 512×512 app icon
- Standalone display mode
- App scope under `/LifeDesk/`
- Service-worker support through `vite-plugin-pwa`

If installation is not immediately offered after a deployment, reload the latest deployed version and clear stale site/PWA data from the browser before checking again.

---

## 🔐 Security Notes

LifeDesk uses Supabase Auth and row-level user data architecture.

### Never store:
- UPI PINs
- Card CVVs
- Banking passwords
- OTPs
- Supabase service-role keys
- Database passwords

Frontend environment variables must contain only values that are safe for browser-side use, such as the Supabase project URL and public/anon/publishable key.

The repository includes the source for a Supabase Edge Function used by the account-deletion flow. The Edge Function must be deployed/configured in Supabase before relying on server-side account deletion in a production environment.

---

## 🎨 Design Direction

LifeDesk follows a premium, minimal AI-native SaaS design language:

- **Font:** Inter
- Clean information hierarchy
- Soft surfaces and restrained gradients
- Subtle glass effects
- Accessible contrast
- Responsive layouts
- Light and dark themes
- Reusable UI components
- Minimal visual clutter
- App-like interactions and micro-animations

The official LifeDesk logo is used as the product identity and PWA icon source.

---

## 🧭 Product Philosophy

LifeDesk is designed around one idea:

> **Your college life should not be scattered across notes, calendars, spreadsheets and random apps.**

Instead, LifeDesk brings the most important student workflows into one place:

**Plan → Track → Execute → Review**

---

## 📌 Current Status

LifeDesk is an actively developed personal student productivity application.

Core areas currently covered by the codebase include:

- Authentication
- Dashboard
- Tasks
- Deadlines
- Calendar
- Hackathon tracking
- Money management
- Analytics
- Profile settings
- Supabase cloud data
- Theme switching
- Responsive UI
- PWA configuration
- GitHub Pages deployment

Some infrastructure capabilities, such as production deployment of the account-deletion Edge Function, require separate Supabase configuration.

---

## 📄 License

This project is currently maintained as a personal project by **AwakenedArpit**.

No separate open-source license has been declared yet.
