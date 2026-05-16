import { useMemo, useState } from "react";
import type {
  ChatMessage,
  GeneratedPrompt,
  ProjectContext,
  ProjectNotes,
  WarRoomSummary
} from "../types";

interface CursorPromptModalProps {
  project: ProjectContext;
  notes: ProjectNotes;
  groupMessages: ChatMessage[];
  summary: WarRoomSummary;
  promptHistory: GeneratedPrompt[];
  onClose: () => void;
  onSavePrompt: (promptText: string) => void;
  onDeletePrompt: (promptId: string) => void;
  onSendPromptToGroup: (promptText: string) => void;
}

function listOrFallback(items: string[], fallback = "Not specified yet.") {
  return items.length > 0 ? items.map((item) => `- ${item}`).join("\n") : `- ${fallback}`;
}

function formatSummaryItems(messages: ChatMessage[]) {
  return messages.map((message) => `${message.source ? `[${message.source}] ` : ""}${message.text}`);
}

function buildCursorPrompt(
  project: ProjectContext,
  notes: ProjectNotes,
  groupMessages: ChatMessage[],
  summary: WarRoomSummary
) {
  const recentMessages = groupMessages.slice(-16).map((message) => {
    const source = message.source ?? (message.role === "user" ? "User" : "Group War Room");
    return `- [${source}] ${message.text}`;
  });

  return `# Cursor/Codex Build Prompt

## Project Context
- Project name: ${project.name || "Untitled Project"}
- Project path: ${project.path || "Not selected"}
- Status: ${project.status}

## Current Goal
${notes.currentGoal || "Use the War Room discussion to identify the next concrete build step."}

## Project Notes
- What We Changed: ${notes.whatWeChanged || "Not specified yet."}
- Next Steps: ${notes.nextSteps || "Not specified yet."}
- Blockers: ${notes.blockers || "None listed."}
- Important Links: ${notes.importantLinks || "None listed."}

## Recent Group War Room Context
${listOrFallback(recentMessages, "No group discussion yet.")}

## Tasks
${listOrFallback(formatSummaryItems(summary.task))}

## Decisions
${listOrFallback(formatSummaryItems(summary.decision))}

## Bugs
${listOrFallback(formatSummaryItems(summary.bug), "No known bugs marked yet.")}

## Ideas
${listOrFallback(formatSummaryItems(summary.idea), "No ideas marked yet.")}

## Existing Constraints
- Keep the app local-first.
- Do not add backend services unless explicitly requested.
- Do not add team sync yet.
- Preserve existing Tauri + React + TypeScript structure.
- Keep UI compact, dark, and usable in the current 5-panel War Room layout.

## Files / Features Likely Affected
- src/App.tsx
- src/hooks/useWarRoomState.ts
- src/components/*
- src/styles.css
- src/types.ts
- src-tauri/src/lib.rs, only if desktop commands are needed

## Requirements
- Implement the requested change cleanly.
- Keep code simple, readable, and consistent with the current component structure.
- Preserve localStorage persistence behavior.
- Make sure chat panels keep independent scrolling.
- Keep resizable panel behavior intact.

## Safety Rules
- Do not remove existing features.
- Do not auto-run commands from AI messages.
- Do not expose API keys or move secrets into source files.
- Do not break project quick actions, backups, OpenAI lanes, group synthesis, command runner, notes, markdown rendering, or prompt history.

## Verification Steps
- Run: npm.cmd run build
- Run: cargo check
- Manually verify the affected UI workflow still works.

## Do Not Break Existing Features
Before finishing, confirm that existing War Room chat lanes, Group War Room, notes, backups, command runner, OpenAI settings, synthesis, markdown/code copy, and resizable panels still behave as expected.`;
}

export function CursorPromptModal({
  project,
  notes,
  groupMessages,
  summary,
  promptHistory,
  onClose,
  onSavePrompt,
  onDeletePrompt,
  onSendPromptToGroup
}: CursorPromptModalProps) {
  const initialPrompt = useMemo(
    () => buildCursorPrompt(project, notes, groupMessages, summary),
    [groupMessages, notes, project, summary]
  );
  const [promptText, setPromptText] = useState(initialPrompt);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function copyPrompt(text: string, id = "current") {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    window.setTimeout(() => setCopiedId(null), 1400);
  }

  function saveCurrentPrompt() {
    onSavePrompt(promptText);
  }

  function sendCurrentPromptToGroup() {
    onSavePrompt(promptText);
    onSendPromptToGroup(promptText);
  }

  return (
    <div className="prompt-modal-backdrop" role="presentation">
      <section className="prompt-modal" role="dialog" aria-modal="true" aria-label="Cursor Prompt">
        <header className="prompt-modal__header">
          <div>
            <h2>Cursor Prompt</h2>
            <p>Generated locally from project context, notes, summary tags, and group discussion.</p>
          </div>
          <button type="button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="prompt-modal__body">
          <label className="prompt-modal__editor">
            <span>Editable prompt</span>
            <textarea value={promptText} onChange={(event) => setPromptText(event.target.value)} />
          </label>

          <aside className="prompt-history" aria-label="Prompt History">
            <h3>Prompt History</h3>
            {promptHistory.length === 0 ? (
              <p>No prompts saved yet.</p>
            ) : (
              <ul>
                {promptHistory.map((prompt) => (
                  <li key={prompt.id}>
                    <time>{new Date(prompt.createdAt).toLocaleString()}</time>
                    <strong>{prompt.projectName}</strong>
                    <p>{prompt.text.slice(0, 120)}</p>
                    <div>
                      <button type="button" onClick={() => copyPrompt(prompt.text, prompt.id)}>
                        {copiedId === prompt.id ? "Copied" : "Copy"}
                      </button>
                      <button type="button" onClick={() => onDeletePrompt(prompt.id)}>
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </aside>
        </div>

        <footer className="prompt-modal__footer">
          <button type="button" onClick={() => copyPrompt(promptText)}>
            {copiedId === "current" ? "Copied" : "Copy Prompt"}
          </button>
          <button type="button" onClick={saveCurrentPrompt}>
            Save to History
          </button>
          <button type="button" onClick={sendCurrentPromptToGroup}>
            Send Prompt to Group
          </button>
        </footer>
      </section>
    </div>
  );
}
