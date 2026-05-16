import { ChangeEvent, useRef, useState } from "react";
import type { WarRoomState } from "../types";

interface BackupControlsProps {
  state: WarRoomState;
  onImportState: (candidate: unknown) => boolean;
  onResetCurrentProject: () => void;
}

type BackupFeedbackType = "success" | "error";

interface BackupFeedback {
  type: BackupFeedbackType;
  message: string;
}

function formatBackupTimestamp() {
  const now = new Date();
  const date = now.toISOString().slice(0, 10);
  const time = `${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(
    2,
    "0"
  )}`;

  return `${date}-${time}`;
}

function hasRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasExpectedWarRoomShape(candidate: unknown) {
  if (!hasRecord(candidate)) {
    return false;
  }

  return (
    hasRecord(candidate.project) &&
    typeof candidate.project.id === "string" &&
    typeof candidate.project.name === "string" &&
    hasRecord(candidate.chatsByProject) &&
    hasRecord(candidate.notesByProject)
  );
}

export function BackupControls({
  state,
  onImportState,
  onResetCurrentProject
}: BackupControlsProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [feedback, setFeedback] = useState<BackupFeedback | null>(null);

  function exportWarRoom() {
    const file = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(file);
    const anchor = document.createElement("a");

    anchor.href = url;
    anchor.download = `war-room-backup-${formatBackupTimestamp()}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    setFeedback({ type: "success", message: "War Room backup exported." });
  }

  async function importWarRoom(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    try {
      const candidate = JSON.parse(await file.text()) as unknown;

      if (!hasExpectedWarRoomShape(candidate)) {
        setFeedback({ type: "error", message: "That file is not a valid War Room backup." });
        return;
      }

      const shouldImport = window.confirm(
        "Import this War Room backup? This will replace your current local War Room state."
      );

      if (!shouldImport) {
        return;
      }

      if (!onImportState(candidate)) {
        setFeedback({ type: "error", message: "Backup validation failed during import." });
        return;
      }

      setFeedback({ type: "success", message: "War Room backup imported." });
    } catch (error) {
      setFeedback({
        type: "error",
        message: error instanceof Error ? error.message : "Could not import backup."
      });
    }
  }

  function resetCurrentProject() {
    const shouldReset = window.confirm(
      "Reset the current project? This clears its chats, summary tags, and notes only."
    );

    if (!shouldReset) {
      return;
    }

    onResetCurrentProject();
    setFeedback({ type: "success", message: "Current project reset." });
  }

  return (
    <section className="backup-controls" aria-label="War Room backup controls">
      <div className="backup-controls__buttons">
        <button type="button" onClick={exportWarRoom}>
          Export War Room
        </button>
        <button type="button" onClick={() => fileInputRef.current?.click()}>
          Import War Room
        </button>
        <button type="button" className="backup-controls__danger" onClick={resetCurrentProject}>
          Reset Current Project
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json,.json"
        onChange={importWarRoom}
        hidden
      />

      {feedback && (
        <p className={`backup-controls__feedback backup-controls__feedback--${feedback.type}`}>
          {feedback.message}
        </p>
      )}
    </section>
  );
}
