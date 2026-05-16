import type { AgentCapability, AgentDefinition } from "../types";

interface AgentsDrawerProps {
  agents: AgentDefinition[];
}

const capabilityLabels: Record<AgentCapability, string> = {
  chat: "Chat",
  index_computer: "Index Computer",
  inspect_project_files: "Inspect Project Files",
  run_project_command: "Run Project Command",
  generate_cursor_prompt: "Generate Cursor Prompt",
  review_code: "Review Code",
  budget_plan: "Budget Plan",
  marketing_plan: "Marketing Plan"
};

const actionLabels: Record<AgentDefinition["id"], string[]> = {
  hien: ["Index Computer"],
  carlos: ["Inspect Project Files", "Run Build Check"],
  besi: ["Create Budget Plan", "Create Marketing Plan"],
  fido: ["Review Project Risks"]
};

export function AgentsDrawer({ agents }: AgentsDrawerProps) {
  return (
    <section className="agents-drawer" aria-label="Agent Connector Layer">
      <header>
        <div>
          <h2>Agent Connector Layer</h2>
          <p>Prepared for future local agents and tools. Actions are mock-only or disabled for now.</p>
        </div>
      </header>

      <div className="agents-grid">
        {agents.map((agent) => (
          <article key={agent.id} className="agent-card">
            <div className="agent-card__header">
              <div>
                <h3>{agent.codeName}</h3>
                <p>{agent.role}</p>
              </div>
              <span className={`agent-card__status agent-card__status--${agent.connectionStatus}`}>
                {agent.connectionStatus.replace("_", " ")}
              </span>
            </div>

            <div className="agent-card__capabilities">
              {agent.capabilities.map((capability) => (
                <span key={capability}>{capabilityLabels[capability]}</span>
              ))}
            </div>

            <div className="agent-card__fields">
              <label>
                <span>Future local endpoint</span>
                <input type="text" value={agent.endpoint} placeholder="http://localhost:..." readOnly />
              </label>
              <label>
                <span>Future local path</span>
                <input type="text" value={agent.localPath} placeholder="C:\\local-agent\\..." readOnly />
              </label>
            </div>

            <div className="agent-card__actions">
              <button type="button" disabled>
                Test Connection
              </button>
              {actionLabels[agent.id].map((label) => (
                <button key={label} type="button" disabled>
                  {label}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="agents-drawer__safety">
        Safety: no computer indexing, file inspection, or background command execution is active yet.
        Future command and file access must require explicit user confirmation. The PowerShell runner
        remains manual-confirm only.
      </p>
    </section>
  );
}
