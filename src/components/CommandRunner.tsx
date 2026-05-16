import { useState } from "react";
import { invoke } from "@tauri-apps/api/core";

interface CommandRunnerProps {
  projectPath: string;
  onSendOutputToGroup: (output: string) => void;
}

interface PowerShellResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  durationMs: number;
  timedOut: boolean;
}

function formatDuration(durationMs: number) {
  return `${(durationMs / 1000).toFixed(2)}s`;
}

function formatOutput(command: string, result: PowerShellResult) {
  return [
    "PowerShell Runner Output",
    `Command:\n\`\`\`powershell\n${command}\n\`\`\``,
    `Exit code: ${result.exitCode ?? "none"}`,
    `Duration: ${formatDuration(result.durationMs)}`,
    `Timed out: ${result.timedOut ? "yes" : "no"}`,
    `stdout:\n\`\`\`text\n${result.stdout || "(empty)"}\n\`\`\``,
    `stderr:\n\`\`\`text\n${result.stderr || "(empty)"}\n\`\`\``
  ].join("\n\n");
}

export function CommandRunner({ projectPath, onSendOutputToGroup }: CommandRunnerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [result, setResult] = useState<PowerShellResult | null>(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const trimmedPath = projectPath.trim();

  async function runCommand() {
    setError("");

    if (!trimmedPath) {
      setError("Select a project path before running PowerShell.");
      return;
    }

    if (!command.trim()) {
      setError("Enter a PowerShell command first.");
      return;
    }

    const shouldRun = window.confirm(
      "Run this PowerShell command? Commands can modify files in the selected project folder."
    );

    if (!shouldRun) {
      return;
    }

    setIsRunning(true);

    try {
      const output = await invoke<PowerShellResult>("run_powershell_command", {
        projectPath: trimmedPath,
        commandText: command
      });
      setResult(output);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : String(caughtError));
    } finally {
      setIsRunning(false);
    }
  }

  function clearRunner() {
    setCommand("");
    setResult(null);
    setError("");
  }

  async function copyOutput() {
    if (!result) {
      return;
    }

    await navigator.clipboard.writeText(formatOutput(command, result));
  }

  function sendOutputToGroup() {
    if (!result) {
      return;
    }

    onSendOutputToGroup(formatOutput(command, result));
  }

  return (
    <section className="command-runner">
      <header className="command-runner__header">
        <div>
          <h2>Command Runner</h2>
          <p>PowerShell commands run only after confirmation and can modify project files.</p>
        </div>
        <button type="button" onClick={() => setIsOpen((current) => !current)}>
          {isOpen ? "Collapse" : "Expand"}
        </button>
      </header>

      {isOpen && (
        <div className="command-runner__body">
          <label>
            <span>Working directory</span>
            <input type="text" value={trimmedPath || "No project path selected"} readOnly />
          </label>

          <label>
            <span>Command</span>
            <textarea
              value={command}
              placeholder="Paste or type a PowerShell command..."
              spellCheck={false}
              onChange={(event) => setCommand(event.target.value)}
            />
          </label>

          {error && <p className="command-runner__error">{error}</p>}

          <div className="command-runner__actions">
            <button type="button" onClick={runCommand} disabled={isRunning}>
              {isRunning ? "Running..." : "Run PowerShell"}
            </button>
            <button type="button" onClick={clearRunner} disabled={isRunning}>
              Clear
            </button>
          </div>

          {result && (
            <section className="command-runner__output" aria-label="PowerShell output">
              <div className="command-runner__metrics">
                <span>Exit code: {result.exitCode ?? "none"}</span>
                <span>Duration: {formatDuration(result.durationMs)}</span>
                <span>{result.timedOut ? "Timed out" : "Completed"}</span>
              </div>

              <div className="command-runner__output-actions">
                <button type="button" onClick={copyOutput}>
                  Copy Output
                </button>
                <button type="button" onClick={sendOutputToGroup}>
                  Send Output to Group
                </button>
              </div>

              <div className="command-runner__streams">
                <article>
                  <h3>stdout</h3>
                  <pre>{result.stdout || "(empty)"}</pre>
                </article>
                <article>
                  <h3>stderr</h3>
                  <pre>{result.stderr || "(empty)"}</pre>
                </article>
              </div>
            </section>
          )}
        </div>
      )}
    </section>
  );
}
