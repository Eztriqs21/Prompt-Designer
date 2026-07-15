# Prompt Designer

A full-stack web application for generating structured prompts. Built with React 19, TypeScript, Vite, Tailwind CSS, and Express 5.

## Tech Stack

- **Frontend:** React 19, TypeScript 6, Vite 8, Tailwind CSS 4, Framer Motion
- **Backend:** Express 5, tsx (TypeScript runtime)
- **AI Provider:** OpenCode AI (OpenAI-compatible API)
- **Linting:** Oxlint

## Getting Started

### Prerequisites

- Node.js 20+
- npm

### Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Copy `.env.example` to `.env` and add your API key:
   ```bash
   cp .env.example .env
   ```

3. Start the development servers:
   ```bash
   # Frontend (Vite dev server on port 5173)
   npm run dev

   # Backend (Express on port 3001)
   npm run dev:server
   ```

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server (frontend) |
| `npm run dev:server` | Start Express server (backend) |
| `npm run build` | Type-check and build frontend |
| `npm run lint` | Run Oxlint |
| `npm run start` | Start production server |

## Deployment

### Frontend: GitHub Pages

The frontend is automatically deployed to GitHub Pages on every push to `main`.

**URL:** `https://eztriqs21.github.io/Prompt-Designer/`

**Setup steps:**
1. Go to your repository's **Settings > Pages**
2. Set **Source** to **GitHub Actions**
3. The workflow in `.github/workflows/deploy.yml` handles the rest

**Required secrets:**
| Secret | Description |
|--------|-------------|
| `BACKEND_URL` | Your deployed backend URL (e.g., `https://your-app.onrender.com/api`) |

### Backend: Render

The backend is deployed to Render (free tier, no spin-down).

**Setup steps:**
1. Go to [render.com](https://render.com) and sign in with GitHub
2. Click **New > Web Service**
3. Connect your GitHub repository
4. Render will auto-detect the Node.js app
5. Configure:
   - **Name:** `prompt-designer-api`
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm run start`
   - **Plan:** Free
6. Add environment variables:
   - `OPENCODE_API_KEY` (required)
   - `OPENCODE_BASE_URL` (optional, has default)
   - `CORS_ORIGINS` (set to your GitHub Pages URL)
7. Click **Create Web Service**

**Your backend URL will be:** `https://your-app-name.onrender.com`

### Connecting Frontend to Backend

1. Deploy the backend to Render and note the URL
2. Add the backend URL as a GitHub secret named `BACKEND_URL` (include `/api` at the end)
3. The frontend build will use this URL for API calls

## CI/CD (GitHub Actions)

This repository uses GitHub Actions for continuous integration and deployment.

### Workflows

| Workflow | Trigger | Purpose |
|----------|---------|---------|
| `ci.yml` | Push to `main`, PRs | Lint, typecheck, build, server health check |
| `deploy.yml` | Push to `main` | Build and deploy frontend to GitHub Pages |

### Required Secrets

| Secret | Required | Description |
|--------|----------|-------------|
| `OPENCODE_API_KEY` | Yes | API key for OpenCode AI (backend) |
| `BACKEND_URL` | Yes | Deployed backend URL with `/api` suffix (frontend) |
| `OPENCODE_BASE_URL` | No | Defaults to `https://opencode.ai/zen/v1/chat/completions` |

### How to Verify

1. Push a change or open a pull request targeting `main`
2. Go to the **Actions** tab in the GitHub repository
3. The **CI** workflow validates code quality
4. The **Deploy Frontend to GitHub Pages** workflow builds and deploys
5. Visit your GitHub Pages URL to see the live site

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `OPENCODE_API_KEY` | Yes | — | API key for OpenCode AI |
| `OPENCODE_BASE_URL` | No | `https://opencode.ai/zen/v1/chat/completions` | OpenCode AI endpoint |
| `PORT` | No | `3001` | Express server port |
| `CORS_ORIGINS` | No | `http://localhost:5173,http://localhost:3001` | Allowed CORS origins (comma-separated) |
| `VITE_API_BASE` | No | `/api` | Backend API URL for frontend (set in build) |

## Project Structure

```
├── src/                    # Frontend (React)
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   ├── lib/                # Utilities and API client
│   └── pages/              # Page components
├── server/                 # Backend (Express)
│   ├── db/                 # JSON file-based storage
│   ├── middleware/          # Express middleware
│   ├── prompts/            # Prompt templates and blueprints
│   └── routes/             # API route handlers
├── .github/workflows/      # GitHub Actions CI/CD
├── .env.example            # Environment variable documentation
├── render.yaml             # Render deployment config
└── package.json            # Dependencies and scripts
```
