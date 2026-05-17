import { useState } from "react";
import type { MemoryInspectorState } from "../types";

interface MemoryInspectorProps {
  activeProjectFocus: string;
  referenceProjectContext: string;
  inspector: MemoryInspectorState;
  onRefreshMemory: () => void | Promise<void>;
  onClearCachedMemory: () => void;
  onToggleVerboseLogging: () => void;
}

function formatBytes(size: number) {
  if (size < 1024) {
    return `${size} B`;
  }

  return `${(size / 1024).toFixed(1)} KB`;
}

export function MemoryInspector({
  activeProjectFocus,
  referenceProjectContext,
  inspector,
  onRefreshMemory,
  onClearCachedMemory,
  onToggleVerboseLogging
}: MemoryInspectorProps) {
  const [copyLabel, setCopyLabel] = useState("Copy Context");
  const files = inspector.lastMemory?.files ?? [];
  const loadedAt = inspector.lastLoadedAt
    ? new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit"
      }).format(new Date(inspector.lastLoadedAt))
    : "Not loaded yet";

  async function copyContext() {
    const context = inspector.lastMemory?.memoryContext || inspector.contextPreview;

    if (!context.trim()) {
      return;
    }

    await navigator.clipboard.writeText(context);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy Context"), 1400);
  }

  return (
    <section className="memory-inspector" aria-label="Memory Inspector">
      <header>
        <div>
          <h2>Memory Inspector</h2>
          <p>
            Read-only view of markdown summaries from D:\dev\war-room\memory. Full code copies live
            separately in D:\dev\war-room\projects.
          </p>
        </div>
        <div className="memory-inspector__actions">
          <button type="button" onClick={() => void onRefreshMemory()}>
            Refresh Memory
          </button>
          <button type="button" onClick={() => void copyContext()}>
            {copyLabel}
          </button>
          <button type="button" onClick={onClearCachedMemory}>
            Clear Cached Memory
          </button>
          <button
            type="button"
            className={inspector.verboseLogging ? "is-active" : ""}
            onClick={onToggleVerboseLogging}
          >
            Verbose: {inspector.verboseLogging ? "On" : "Off"}
          </button>
        </div>
      </header>

      <div className="memory-inspector__grid">
        <article>
          <span>Active Project Focus</span>
          <strong>{activeProjectFocus}</strong>
        </article>
        <article>
          <span>Reference Context</span>
          <strong>{referenceProjectContext || "None"}</strong>
        </article>
        <article>
          <span>Last Load</span>
          <strong>{loadedAt}</strong>
        </article>
        <article>
          <span>AI Skipped</span>
          <strong>{inspector.skippedAi ? "Yes" : "No"}</strong>
        </article>
      </div>

      <div className="memory-inspector__columns">
        <section>
          <h3>Loaded Files</h3>
          {files.length ? (
            <ul className="memory-inspector__files">
              {files.map((file) => (
                <li key={file.path}>
                  <span>{file.path}</span>
                  <strong>{formatBytes(file.sizeBytes)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p>No memory files loaded yet.</p>
          )}
        </section>

        <section>
          <h3>Routing</h3>
          <p>
            Agents receiving memory:{" "}
            {inspector.receivedAgents.length ? inspector.receivedAgents.join(", ") : "None"}
          </p>
          <p>
            Focus aliases:{" "}
            {inspector.focusAliasTriggers.length
              ? inspector.focusAliasTriggers.join(", ")
              : "None"}
          </p>
          <p>
            Reference aliases:{" "}
            {inspector.referenceAliasTriggers.length
              ? inspector.referenceAliasTriggers.join(", ")
              : "None"}
          </p>
        </section>
      </div>

      <section className="memory-inspector__preview">
        <h3>Recent Context Preview</h3>
        <pre>{inspector.contextPreview || "No context loaded yet."}</pre>
      </section>

      <section className="memory-inspector__log">
        <h3>Event Log</h3>
        {inspector.eventLog.length ? (
          <ul>
            {inspector.eventLog.map((event, index) => (
              <li key={`${event}-${index}`}>{event}</li>
            ))}
          </ul>
        ) : (
          <p>No memory events yet.</p>
        )}
      </section>
    </section>
  );
}
