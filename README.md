# War Room

War Room is a local-first AI project planning command center built with Tauri, React, and TypeScript. It brings multiple AI assistants into one desktop workspace so a project can be discussed, planned, reviewed, summarized, and backed up without needing a backend or team sync layer yet.

## Screenshots

Screenshots coming soon.

- Main five-panel War Room layout
- Project notes and quick actions
- Group synthesis and planning summary

## Features

- Five-panel desktop layout with four individual AI lanes and one shared Group War Room
- Individual AI lanes:
  - Desktop Companion
  - Cursor Builder
  - Business Planner
  - Code Reviewer
- Shared Group War Room for cross-lane planning and synthesis
- Project selector with project name, local path, and status
- Project quick actions:
  - Open Folder
  - Open in Cursor
  - Open Terminal
  - Copy Path
- Project notes for:
  - Current Goal
  - What We Changed
  - Next Steps
  - Blockers
  - Important Links
- Send project notes into the Group War Room
- Mark group messages as:
  - Task
  - Decision
  - Bug
  - Idea
- War Room Summary section for project planning signals
- Import/export JSON backups of War Room state
- Reset the current project without deleting other project data
- Optional OpenAI-powered responses for the four individual lanes
- Optional Group War Room synthesis that returns a concise project plan
- LocalStorage persistence for chats, project settings, notes, backups, and AI settings
- Mock mode remains available when real AI is disabled

## Tech Stack

- Tauri 2
- React
- TypeScript
- Vite
- Rust for Tauri desktop commands
- LocalStorage for MVP persistence
- Optional OpenAI Chat Completions API integration

## Why I Built It

War Room is an experiment in making AI-assisted project work feel more like a focused operating room than a scattered set of chat tabs. I wanted one local desktop space where different assistant roles could contribute their own perspective, while the project owner could capture decisions, tasks, bugs, notes, and next steps in the same flow.

The goal is not just to chat with AI. The goal is to turn conversation into project memory and execution momentum.

## Current Status

This is an MVP desktop app. It is usable locally today for project planning, notes, lightweight task tracking, backups, quick project actions, and optional OpenAI-assisted responses.

There is no backend, login system, cloud sync, or team collaboration yet. All current persistence is local to the machine through browser localStorage inside the Tauri app.

## Roadmap

- Team collaboration and shared War Rooms
- Real-time sync across devices and collaborators
- Shared rooms for project stakeholders
- Deeper Cursor and project automation
- Desktop Companion integration
- Project file awareness and local codebase context
- Better project switching and multi-project management
- Durable local database storage beyond localStorage
- Secure secret storage for API keys
- More advanced task, decision, bug, and idea workflows

## Local Setup

PowerShell blocks the `npm.ps1` shim on this machine, so use `npm.cmd` for commands.

```powershell
cd "C:\Users\our entertainment\Documents\Codex\2026-05-16\create-a-new-tauri-react-typescript"
npm.cmd install
npm.cmd run build
npm.cmd run tauri dev
```

Useful development commands:

```powershell
npm.cmd run dev
npm.cmd run build
npm.cmd run tauri dev
```

Rust/Tauri check:

```powershell
cd src-tauri
cargo check
```

## Privacy and Security

War Room is local-first, and there is no backend in this MVP. Project data, notes, chats, and settings are stored locally.

OpenAI API keys are currently stored in localStorage for local development convenience only. This is not production-hardened secret storage. Before using War Room in a production or shared environment, API key handling should be moved to a secure storage layer such as the operating system keychain or Tauri-managed secure storage.

When real AI responses are enabled, the selected lane sends recent messages and selected project context to the OpenAI API. The Group War Room only calls OpenAI when the user explicitly runs synthesis.
