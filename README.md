# GitForge – Developer Collaboration Simulator

GitForge is a premium, interactive full-stack learning platform designed to teach Git version control and GitHub collaboration workflows. It features a custom visual Git simulation engine, an interactive command terminal, an animated branch graph, and AI bot developers that simulate real-world team interactions.

---

## 🎨 Core Design Features

- **Premium SaaS UI**: Built with a sleek dark theme, customized gradients, and modern typography (Plus Jakarta Sans & JetBrains Mono).
- **Glassmorphism Panels**: Frosted layouts featuring responsive grid structures and interactive card elements.
- **Micro-Interactions**: Hover animations, smooth transitions, and visual cues powered by Tailwind CSS and Framer Motion.
- **Animated SVG Branch Graph**: Visually represents commit nodes and parent connections as vertical tracks.
- **Interactive terminal Console**: Parse standard commands (`git status`, `git branch`, `git checkout`, `git commit`, `git merge`, `git log`, `git push`) and updates visual states in real-time.
- **Merge Conflict Visualizer**: An inline screen allowing users to choose lines of text ("Accept Current" vs "Accept Incoming") when conflicts occur.

---

## 🛠️ Technology Stack

- **Frontend**: React (Vite) + TypeScript + Tailwind CSS + Framer Motion + Recharts + Lucide Icons.
- **Backend**: Node.js + Express.
- **Database**: Simulated file-based JSON store for zero-setup execution, with optional MongoDB Atlas connection hooks.

---

## 📂 Project Structure

```
GitForge/
├── backend/
│   ├── data/             # Local database storage JSON files
│   ├── src/
│   │   ├── models/        # TypeScript interfaces for simulator entities
│   │   ├── services/      # GitEngine, BotService, TerminalParser, Store
│   │   └── server.ts      # Express App and API endpoints
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/    # Reusable UI (BranchGraph, Terminal, Merge Conflict overlay)
│   │   ├── pages/         # Dashboard, PRs, Issues, Kanban, Insights, Releases
│   │   ├── types.ts       # Shared TypeScript definitions
│   │   ├── index.css      # Custom design tokens, scrollbars, and fonts
│   │   ├── App.tsx        # Dashboard shell, state, and router
│   │   └── main.tsx       # Entry mount point
│   ├── package.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── tsconfig.json
└── package.json           # Root concurrent script runner
```

---

## 🚀 Installation & Local Execution

### Prerequisites
- Node.js (v18 or higher recommended)
- npm (v9 or higher)

### Setup Steps
1. Navigate to the root directory `GitForge/`.
2. Install all dependencies across the monorepo:
   ```bash
   npm run install:all
   ```
3. Run the development backend and frontend concurrently:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to the local client:
   ```
   http://localhost:5173/
   ```

---

## 🤖 Using the Simulation Controls

The platform includes a **Simulation Control Room** widget on the main dashboard to trigger collaborative interactions:
1. **Trigger Bot Commit**: Simulates one of the bot collaborators (`alice-coder`, `bob-reviewer`, etc.) making changes to code and pushing to the current active branch.
2. **Trigger Bot Issue**: A bot logs a new issue in the tracker complete with priorities, descriptions, labels, and assignees.
3. **Trigger Conflict Scenario**: A bot creates a branch clashing with the `main` branch, opens a conflicting Pull Request, and prompts you to resolve it. Go to the **Pull Requests** tab and click **Merge** to launch the **Merge Conflict Visualizer**.
