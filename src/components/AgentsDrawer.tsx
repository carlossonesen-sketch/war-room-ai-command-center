import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { AgentCapability, AgentDefinition, ProjectInspectionResult } from "../types";

interface AgentsDrawerProps {
  agents: AgentDefinition[];
  projectPath: string;
  localWorkspaceRoot: string;
  activeProjectFocus: string;
  onSendScanResultToGroup: (scanResult: string) => void;
  onSendScanResultToCarlos: (scanResult: string) => void;
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

function formatList(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None found";
}

function formatPackageScripts(scripts: Record<string, string>) {
  const entries = Object.entries(scripts);
  return entries.length
    ? entries.map(([name, command]) => `- ${name}: ${command}`).join("\n")
    : "- None found";
}

type InspectionTarget = "auto" | "copy" | "live";

function sanitizeCopyFolderName(projectName: string) {
  return projectName.trim().replace(/[<>:"/\\|?*]+/g, "-") || "project";
}

function buildCopyProjectPath(localWorkspaceRoot: string, activeProjectFocus: string) {
  const root = localWorkspaceRoot.trim() || "D:\\dev\\war-room";
  return `${root.replace(/[\\/]$/, "")}\\projects\\${sanitizeCopyFolderName(activeProjectFocus)}`;
}

function formatScanResult(
  result: ProjectInspectionResult,
  projectPath: string,
  sourceLabel: string
) {
  return [
    "# Carlos Project Inspection",
    "",
    `Inspection source: ${sourceLabel}`,
    `Project path: ${projectPath}`,
    `Detected project type: ${result.projectType}`,
    `Scanned entries: ${result.scannedFileCount}`,
    `Max depth: ${result.maxDepth}`,
    "",
    "## Top-Level Entries",
    formatList(result.topLevelEntries),
    "",
    "## Important Files",
    formatList(result.importantFiles),
    "",
    "## Package Scripts",
    formatPackageScripts(result.packageScripts),
    "",
    "## Git Summary",
    result.gitSummary,
    "",
    "## Suggested Verification Commands",
    formatList(result.suggestedVerificationCommands)
  ].join("\n");
}

export function AgentsDrawer({
  agents,
  projectPath,
  localWorkspaceRoot,
  activeProjectFocus,
  onSendScanResultToGroup,
  onSendScanResultToCarlos
}: AgentsDrawerProps) {
  const [scanResult, setScanResult] = useState<ProjectInspectionResult | null>(null);
  const [scanError, setScanError] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const [copyLabel, setCopyLabel] = useState("Copy Scan Result");
  const [inspectionTarget, setInspectionTarget] = useState<InspectionTarget>("auto");
  const [lastInspectedPath, setLastInspectedPath] = useState("");
  const [lastInspectionSource, setLastInspectionSource] = useState("");
  const copyProjectPath = buildCopyProjectPath(localWorkspaceRoot, activeProjectFocus);
  const formattedScanResult =
    scanResult && lastInspectedPath
      ? formatScanResult(scanResult, lastInspectedPath, lastInspectionSource)
      : "";

  async function inspectProjectFiles() {
    const livePath = projectPath.trim();
    const copyPath = copyProjectPath.trim();

    if (!livePath && inspectionTarget !== "copy") {
      setScanError("Select a live project path or use a War Room read-only project copy.");
      return;
    }

    const confirmed = window.confirm(
      "Carlos will run a read-only inspection. War Room project copies under D:\\dev\\war-room\\projects are never written by this action. Continue?"
    );

    if (!confirmed) {
      return;
    }

    setIsScanning(true);
    setScanError("");

    try {
      let inspectedPath = inspectionTarget === "live" ? livePath : copyPath;
      let sourceLabel =
        inspectionTarget === "live" ? "Selected live project path" : "War Room read-only copy";
      let result: ProjectInspectionResult;

      try {
        result = await invoke<ProjectInspectionResult>("inspect_project_files", {
          projectPath: inspectedPath
        });
      } catch (error) {
        if (inspectionTarget !== "auto" || !livePath) {
          throw error;
        }

        inspectedPath = livePath;
        sourceLabel = "Selected live project path (copy unavailable)";
        result = await invoke<ProjectInspectionResult>("inspect_project_files", {
          projectPath: inspectedPath
        });
      }

      setScanResult(result);
      setLastInspectedPath(inspectedPath);
      setLastInspectionSource(sourceLabel);
    } catch (error) {
      setScanError(error instanceof Error ? error.message : String(error));
    } finally {
      setIsScanning(false);
    }
  }

  async function copyScanResult() {
    if (!formattedScanResult) {
      return;
    }

    await navigator.clipboard.writeText(formattedScanResult);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy Scan Result"), 1400);
  }

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
              {actionLabels[agent.id].map((label) => {
                const isCarlosInspection = agent.id === "carlos" && label === "Inspect Project Files";

                return (
                  <button
                    key={label}
                    type="button"
                    disabled={!isCarlosInspection || isScanning}
                    onClick={isCarlosInspection ? inspectProjectFiles : undefined}
                  >
                    {isCarlosInspection && isScanning ? "Scanning..." : label}
                  </button>
                );
              })}
            </div>

            {agent.id === "carlos" && (
              <div className="agent-scan" aria-live="polite">
                <div className="agent-scan__header">
                  <h4>Project Inspection</h4>
                  <span>read-only</span>
                </div>
                <p>
                  Defaults to the War Room read-only copy when available. Live project inspection is
                  also read-only and never runs scripts.
                </p>

                <label className="agent-scan__target">
                  <span>Inspection source</span>
                  <select
                    value={inspectionTarget}
                    onChange={(event) => setInspectionTarget(event.target.value as InspectionTarget)}
                  >
                    <option value="auto">Auto: copy first, then live path</option>
                    <option value="copy">War Room read-only copy</option>
                    <option value="live">Selected live project path</option>
                  </select>
                </label>

                <div className="agent-scan__paths">
                  <span>Copy: {copyProjectPath}</span>
                  <span>Live: {projectPath || "Not set"}</span>
                </div>

                {scanError && <p className="agent-scan__error">{scanError}</p>}

                {scanResult ? (
                  <>
                    <div className="agent-scan__summary">
                      <span>Type: {scanResult.projectType}</span>
                      <span>Entries: {scanResult.scannedFileCount}</span>
                      <span>Depth: {scanResult.maxDepth}</span>
                      <span>{lastInspectionSource}</span>
                    </div>
                    <pre>{formattedScanResult}</pre>
                    <div className="agent-scan__actions">
                      <button type="button" onClick={() => void copyScanResult()}>
                        {copyLabel}
                      </button>
                      <button
                        type="button"
                        onClick={() => onSendScanResultToGroup(formattedScanResult)}
                      >
                        Send Scan Result to Group
                      </button>
                      <button
                        type="button"
                        onClick={() => onSendScanResultToCarlos(formattedScanResult)}
                      >
                        Send Scan Result to Carlos Chat
                      </button>
                    </div>
                  </>
                ) : (
                  <p>
                    Carlos can inspect folder shape, config files, package scripts, git branch,
                    and suggested verification commands after confirmation.
                  </p>
                )}
              </div>
            )}
          </article>
        ))}
      </div>

      <p className="agents-drawer__safety">
        Safety: Carlos project inspection is read-only, shallow, and manual-confirm only. No
        computer indexing, arbitrary scripts, background scanning, or agent-run commands are active.
        War Room project copies live under D:\dev\war-room\projects and are treated as read-only.
      </p>
    </section>
  );
}
