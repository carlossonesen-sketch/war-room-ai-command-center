import { useState } from "react";
import type { ProjectNotes } from "../types";

interface ProjectNotesPanelProps {
  notes: ProjectNotes;
  onUpdateNotes: (updates: Partial<ProjectNotes>) => void;
  onSendNotesToGroup: () => void;
}

const noteFields: Array<{ key: keyof ProjectNotes; label: string; placeholder: string }> = [
  {
    key: "currentGoal",
    label: "Current Goal",
    placeholder: "The outcome this project is driving toward..."
  },
  {
    key: "whatWeChanged",
    label: "What We Changed",
    placeholder: "Recent edits, decisions, implementation notes..."
  },
  {
    key: "nextSteps",
    label: "Next Steps",
    placeholder: "The next concrete moves..."
  },
  {
    key: "blockers",
    label: "Blockers",
    placeholder: "Risks, missing access, open questions..."
  },
  {
    key: "importantLinks",
    label: "Important Links",
    placeholder: "Docs, repos, references, tickets..."
  }
];

export function ProjectNotesPanel({
  notes,
  onUpdateNotes,
  onSendNotesToGroup
}: ProjectNotesPanelProps) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <section className="project-notes">
      <header className="project-notes__header">
        <div>
          <h2>Project Notes</h2>
          <p>Session memory for the selected project</p>
        </div>
        <div className="project-notes__actions">
          <button type="button" onClick={onSendNotesToGroup}>
            Send Notes to Group
          </button>
          <button type="button" onClick={() => setIsOpen((current) => !current)}>
            {isOpen ? "Collapse" : "Expand"}
          </button>
        </div>
      </header>

      {isOpen && (
        <div className="project-notes__grid">
          {noteFields.map((field) => (
            <label key={field.key}>
              <span>{field.label}</span>
              <textarea
                value={notes[field.key]}
                placeholder={field.placeholder}
                onChange={(event) => onUpdateNotes({ [field.key]: event.target.value })}
              />
            </label>
          ))}
        </div>
      )}
    </section>
  );
}
