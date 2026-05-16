import type { PlanningCategory, WarRoomSummary as WarRoomSummaryData } from "../types";

const sections: Array<{ id: PlanningCategory; title: string }> = [
  { id: "task", title: "Tasks" },
  { id: "decision", title: "Decisions" },
  { id: "bug", title: "Bugs" },
  { id: "idea", title: "Ideas" }
];

interface WarRoomSummaryProps {
  summary: WarRoomSummaryData;
}

export function WarRoomSummary({ summary }: WarRoomSummaryProps) {
  return (
    <section className="war-room-summary" aria-label="War Room Summary">
      <header>
        <h2>War Room Summary</h2>
      </header>

      <div className="war-room-summary__grid">
        {sections.map((section) => (
          <article key={section.id} className="summary-section">
            <div className="summary-section__header">
              <h3>{section.title}</h3>
              <span>{summary[section.id].length}</span>
            </div>

            {summary[section.id].length === 0 ? (
              <p className="summary-section__empty">Nothing marked yet.</p>
            ) : (
              <ul>
                {summary[section.id].map((message) => (
                  <li key={`${section.id}-${message.id}`}>
                    {message.source && <strong>{message.source}: </strong>}
                    {message.text}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
