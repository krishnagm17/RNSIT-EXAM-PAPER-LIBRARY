# RNSIT Exam Library

Fully React-based frontend paired with a Node + Express backend that stores data in MongoDB and uses Google's Gemini (via your personal API key) for document analysis.

## Tech Stack
- **Frontend:** React 18 + Vite + TypeScript
- **Backend:** Node.js, Express, MongoDB, Multer
- **AI:** Google Gemini API (server-side only)

## Prerequisites
- Node.js 18+
- npm
- MongoDB instance (local or Atlas)
- Gemini API key

## Setup
1. **Install frontend dependencies (run from repo root)**
   ```bash
   npm install
   ```
2. **Install backend dependencies**
   ```bash
   cd backend
   npm install
   ```
3. **Environment variables**
   - Copy `backend/env.example` to `backend/.env`.
   - Copy the same file to `frontend/.env.local` if you want to override `VITE_API_BASE_URL`.
   - Fill in:
     - `VITE_API_BASE_URL` – defaults to `http://localhost:5000/api`
     - `MONGODB_URI`
     - `GEMINI_API_KEY` (your personal Gemini key)
     - `ADMIN_EMAIL` / `ADMIN_PASSWORD` if you want to change admin credentials

## Running Locally
In separate terminals:
```bash
# Backend
cd backend
npm run dev

# Frontend (from repo root)
npm run dev
```

Visit the Vite dev server URL (default `http://localhost:5173`). The frontend talks to the backend exclusively through React fetch calls; no other frontend frameworks are used.
