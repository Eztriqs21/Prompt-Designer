# Prompt Designer

Prompt Designer is a developer-first web app that pairs a **Prompt Workspace** for building structured AI prompts with a **Website AUDIT** tool that inspects a site and returns actionable, fixable findings. The interface is a calm, monochrome developer console: a single monospace typeface, token-driven styling, and a deliberately no-blue palette.

Built with React 19, TypeScript, Vite, Tailwind CSS v4, and Express 5.

## Features

- **Prompt Workspace** — A chat-driven workspace that turns a short brief into a structured master prompt. Branch the prompt into Coding, UI/UX, and Audit sub-threads; insert starter templates; copy or pin generated versions.
- **Website AUDIT** — Run an automated audit (URL, GitHub, or file upload) in Basic, Recommended, or Full mode. Get a scored report across Code, Browser, Accessibility, Performance, and Security, with captured evidence you can inspect in a viewer.
- **History** — Review saved chats, generated prompt versions, and past audits in clear, table-first lists with empty states and a single call-to-action.
- **Fix-prompt handoff** — Every audit finding ships a ready-to-use fix prompt with a "Copy fix prompt" action, so issues flow straight back into the Prompt Workspace or your own agent.

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

The frontend is automatically deployed to GitHub Pages on every push to `main` or `master`.

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
| `ci.yml` | Push to `main` or `master`, PRs | Lint, typecheck, build, server health check |
| `deploy.yml` | Push to `main` or `master` | Build and deploy frontend to GitHub Pages |

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

## Design System

The visual language is defined in [`src/assets/DESIGNV2.md`](src/assets/DESIGNV2.md), which is the **canonical** design spec for this project. `DESIGN.md` at the repo root is a legacy copy being superseded by `DESIGNV2.md`.

Agents and contributors MUST:

- **Drive the UI with tokens.** Use the token names from `DESIGNV2.md` (e.g. `primary.dark`, `secondary.darkSurface`, `accent.orange`, `semantic.dangerRed`) rather than hard-coded colors. Under Tailwind CSS v4 these map to utility classes such as `bg-primary-dark`, `text-secondary-midGray`, `border-accent-orange`, `text-semantic-dangerRed`.
- **Keep the monochrome / no-blue palette.** Surfaces are dark neutrals and text is light. `accent.orange` is the only interactive accent (selected states, links, focus, progress); `accent.purple` is reserved for keyword/heading emphasis; `semantic.dangerRed` marks error and destructive states. There is no blue token — do not reintroduce one.
- **Write technical, calm copy.** Short sentences, developer-console tone, monospace labels for metadata, status, and chips. Avoid marketing language and decorative illustration.
- **Reuse existing components.** Build on `Button`, `Chip`, `Card`, `Table`/`SimpleTable`, `SegmentedControl`, `TextInput`, `CustomSelect`, and the shared page shell (sidebar + header + content) instead of inventing new primitives. Match the spacing scale, radius tokens, and the 120–280ms opacity/transform motion rules.

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
