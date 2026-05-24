# 🚀 SmartSlot — Premium Flash Offer Booking System

> A production-ready, concurrency-secured, real-time slot booking platform. Built with **React + TypeScript + Vite** (frontend) and **ASP.NET Core 8 + PostgreSQL** (backend).

---

## ✨ Features

- **Real-time Slot Booking** — Distributed pessimistic locking prevents double bookings
- **Flash Offers** — Live countdown timers on time-limited deals
- **BookMyShow-Inspired UI** — Premium glassmorphism design with dark/light mode
- **Progressive Web App (PWA)** — Installable on mobile & desktop, works offline
- **Notification Simulation** — SMS & Email dispatch log panel
- **Role-Based Access** — Customer, Business, and Admin portal
- **Booking History** — View and manage all reservations
- **SignalR Integration** — Real-time dashboard updates

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, TailwindCSS |
| Backend | ASP.NET Core 8, Entity Framework Core |
| Database | PostgreSQL |
| Real-time | SignalR |
| Auth | JWT Bearer Tokens |
| PWA | Service Worker, Web App Manifest |

---

## 🚦 Getting Started

### Prerequisites
- Node.js 18+
- .NET 8 SDK
- PostgreSQL 15+

### 1. Clone the Repo
```bash
git clone <your-github-repo-url>
cd "smart offer booking slot"
```

### 2. Backend Setup
```bash
cd backend/SmartOfferBooking.API

# Copy and configure app settings
cp appsettings.json appsettings.Development.json
# Edit appsettings.Development.json with your DB connection string

dotnet restore
dotnet run
# Backend starts on http://localhost:5000
```

### 3. Frontend Setup
```bash
cd frontend

# Configure environment
cp .env.example .env
# Edit .env: set VITE_API_URL to your backend URL

npm install
npm run dev
# Frontend starts on http://localhost:5173
```

---

## 🔐 Security & GitHub

> [!IMPORTANT]
> The following sensitive files are **excluded from Git** via `.gitignore`:
> - `frontend/.env` — API URL config
> - `frontend/node_modules/` — dependencies
> - `backend/bin/`, `backend/obj/` — build artifacts
> - `appsettings.Development.json` — DB credentials
> - `.vs/`, `.idea/` — IDE files

**Always use `.env.example` as a template — never commit your actual `.env`.**

---

## 🏗️ Production Build

```bash
# Build frontend for deployment
cd frontend
npm run build
# Output: frontend/dist/

# Build backend for deployment
cd backend/SmartOfferBooking.API
dotnet publish -c Release -o ./publish
```

### Deploy Frontend
The `dist/` folder can be deployed to:
- **Vercel** / **Netlify** — Set `VITE_API_URL` in the dashboard environment variables
- **Nginx** — Serve the `dist/` folder, configure fallback to `index.html` for SPA routing

### Deploy Backend
The `publish/` folder can be deployed to:
- **Azure App Service** / **Railway** / **Render**
- **Docker** — Dockerfile can be added

---

## 📱 PWA / Mobile Install

The app is a full **Progressive Web App**:
1. Open the URL in Chrome/Safari on mobile
2. Tap "Add to Home Screen"
3. It installs like a native app with offline support

---

## 🧾 Default Seed Data

On first launch, the backend seeds **11+ premium offers** across categories:
- 🍱 Lunch Hour · 🍸 Happy Hour · 💆 Spa Session
- 💪 Gym Trial · 🔬 Clinic Session · 💻 Coaching Session

---

## 📄 License
MIT — Free to use and modify.
