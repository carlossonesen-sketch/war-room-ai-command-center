import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface ProjectActionsProps {
  projectPath: string;
}

type FeedbackType = "warning" | "error" | "success";

interface Feedback {
  type: FeedbackType;
  message: string;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export function ProjectActions({ projectPath }: ProjectActionsProps) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const trimmedPath = projectPath.trim();

  function requirePath() {
    if (!trimmedPath) {
      setFeedback({ type: "warning", message: "Add a local project path first." });
      return false;
    }

    return true;
  }

  async function runProjectCommand(command: "open_folder" | "open_in_cursor" | "open_terminal") {
    if (!requirePath()) {
      return;
    }

    try {
      await invoke(command, { projectPath: trimmedPath });
      setFeedback({ type: "success", message: "Project action started." });
    } catch (error) {
      setFeedback({ type: "error", message: getErrorMessage(error) });
    }
  }

  async function copyPath() {
    if (!requirePath()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(trimmedPath);
      setFeedback({ type: "success", message: "Project path copied." });
    } catch (error) {
      setFeedback({ type: "error", message: `Could not copy path: ${getErrorMessage(error)}` });
    }
  }

  return (
    <div className="project-actions">
      <div className="project-actions__buttons">
        <button type="button" onClick={() => runProjectCommand("open_folder")}>
          Open Folder
        </button>
        <button type="button" onClick={() => runProjectCommand("open_in_cursor")}>
          Open in Cursor
        </button>
        <button type="button" onClick={() => runProjectCommand("open_terminal")}>
          Open Terminal
        </button>
        <button type="button" onClick={copyPath}>
          Copy Path
        </button>
      </div>

      {feedback && (
        <p className={`project-actions__feedback project-actions__feedback--${feedback.type}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}
