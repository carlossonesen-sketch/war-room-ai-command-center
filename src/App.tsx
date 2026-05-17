import { useEffect, useState } from "react";
import { AgentsDrawer } from "./components/AgentsDrawer";
import { BackupControls } from "./components/BackupControls";
import { ChatPanel } from "./components/ChatPanel";
import { CommandRunner } from "./components/CommandRunner";
import { CursorPromptModal } from "./components/CursorPromptModal";
import { MemoryInspector } from "./components/MemoryInspector";
import { OpenAISettingsPanel } from "./components/OpenAISettingsPanel";
import { ProjectNotesPanel } from "./components/ProjectNotesPanel";
import { ProjectSelector } from "./components/ProjectSelector";
import { ResizableWarRoomGrid } from "./components/ResizableWarRoomGrid";
import { WarRoomSummary } from "./components/WarRoomSummary";
import { useWarRoomState } from "./hooks/useWarRoomState";

type DrawerId = "project" | "notes" | "agents" | "memory" | "ai" | "runner" | "backups";

const DRAWER_STORAGE_KEY = "war-room:active-drawer";

const drawerButtons: Array<{ id: DrawerId; label: string }> = [
  { id: "project", label: "Project" },
  { id: "notes", label: "Notes" },
  { id: "agents", label: "Agents" },
  { id: "memory", label: "Memory Inspector" },
  { id: "ai", label: "AI Settings" },
  { id: "runner", label: "Command Runner" },
  { id: "backups", label: "Backups" }
];

function App() {
  const [activeDrawer, setActiveDrawer] = useState<DrawerId | null>(() => {
    const stored = window.localStorage.getItem(DRAWER_STORAGE_KEY);
    return drawerButtons.some((drawer) => drawer.id === stored) ? (stored as DrawerId) : null;
  });
  const [isPromptModalOpen, setIsPromptModalOpen] = useState(false);
  const {
    chats,
    project,
    projectNotes,
    openAISettings,
    openAILaneLoading,
    groupSynthesisLoading,
    autoCouncilLoading,
    autoCouncilEnabled,
    panelWidths,
    promptHistory,
    localWorkspaceRoot,
    activeProjectFocus,
    referenceProjectContext,
    projectAliases,
    memoryInspector,
    summary,
    fullState,
    individualChats,
    agentDefinitions,
    groupChat,
    sendMessage,
    sendToGroup,
    askAdvisorAboutGroup,
    askAllAdvisorsAboutGroup,
    updateProject,
    updateOpenAISettings,
    updatePanelWidths,
    cancelOpenAIRequest,
    synthesizeGroupPlan,
    cancelGroupSynthesis,
    updateAutoCouncilEnabled,
    updateLocalWorkspaceRoot,
    updateProjectAliases,
    clearReferenceProjectContext,
    refreshMemoryInspector,
    clearCachedMemory,
    toggleVerboseMemoryLogging,
    cancelAutoCouncil,
    updateProjectNotes,
    sendNotesToGroup,
    sendCommandOutputToGroup,
    sendCarlosScanResultToGroup,
    sendCarlosScanResultToChat,
    saveGeneratedPrompt,
    deleteGeneratedPrompt,
    sendGeneratedPromptToGroup,
    markGroupMessage,
    clearAllChats,
    resetCurrentProject,
    replaceWarRoomState
  } = useWarRoomState();

  useEffect(() => {
    if (activeDrawer) {
      window.localStorage.setItem(DRAWER_STORAGE_KEY, activeDrawer);
      return;
    }

    window.localStorage.removeItem(DRAWER_STORAGE_KEY);
  }, [activeDrawer]);

  const leftChats = individualChats.slice(0, 2);
  const rightChats = individualChats.slice(2);
  const centerPanel = (
    <div className="center-column">
      <ChatPanel
        chat={groupChat}
        messages={chats.group}
        isGroupPanel
        isLoading={groupSynthesisLoading || autoCouncilLoading}
        headerAction={
          <div className="chat-panel__header-actions">
            <span className="chat-panel__focus-badge">Focus: {activeProjectFocus}</span>
            {referenceProjectContext && (
              <>
                <span className="chat-panel__focus-badge chat-panel__focus-badge--reference">
                  Ref: {referenceProjectContext}
                </span>
                <button
                  className="chat-panel__header-button"
                  type="button"
                  onClick={clearReferenceProjectContext}
                >
                  Clear Reference
                </button>
              </>
            )}
            <button
              className={`chat-panel__header-button ${
                autoCouncilEnabled ? "chat-panel__header-button--active" : ""
              }`}
              type="button"
              onClick={() => updateAutoCouncilEnabled(!autoCouncilEnabled)}
            >
              Auto Council: {autoCouncilEnabled ? "On" : "Off"}
            </button>
            <button
              className="chat-panel__header-button"
              type="button"
              onClick={() => setIsPromptModalOpen(true)}
            >
              Generate Cursor Prompt
            </button>
            {groupSynthesisLoading ? (
              <button
                className="chat-panel__header-button chat-panel__header-button--danger"
                type="button"
                onClick={cancelGroupSynthesis}
              >
                Cancel
              </button>
            ) : (
              <button
                className="chat-panel__header-button"
                type="button"
                onClick={synthesizeGroupPlan}
              >
                Synthesize Plan
              </button>
            )}
            <button
              className="chat-panel__header-button"
              type="button"
              onClick={askAllAdvisorsAboutGroup}
            >
              Ask All Advisors
            </button>
            {autoCouncilLoading && (
              <button
                className="chat-panel__header-button chat-panel__header-button--danger"
                type="button"
                onClick={cancelAutoCouncil}
              >
                Cancel Auto Council
              </button>
            )}
          </div>
        }
        onSendMessage={sendMessage}
        onMarkGroupMessage={markGroupMessage}
      />
      <WarRoomSummary summary={summary} />
    </div>
  );

  return (
    <main className="app-shell">
      <header className="app-header">
        <div>
          <p className="app-header__eyebrow">Local-first AI command center</p>
          <h1>War Room</h1>
        </div>
        <button className="app-header__clear" type="button" onClick={clearAllChats}>
          Clear Chats
        </button>
      </header>

      <section className="toolbar-shell" aria-label="War Room tools">
        <nav className="top-toolbar" aria-label="War Room drawers">
          {drawerButtons.map((drawer) => (
            <button
              key={drawer.id}
              type="button"
              className={activeDrawer === drawer.id ? "is-active" : ""}
              onClick={() =>
                setActiveDrawer((currentDrawer) =>
                  currentDrawer === drawer.id ? null : drawer.id
                )
              }
            >
              {drawer.label}
            </button>
          ))}
        </nav>

        {activeDrawer && (
          <section className="workspace-drawer" aria-label={`${activeDrawer} drawer`}>
            {activeDrawer === "project" && (
              <ProjectSelector
                project={project}
                localWorkspaceRoot={localWorkspaceRoot}
                projectAliases={projectAliases}
                onUpdateProject={updateProject}
                onUpdateLocalWorkspaceRoot={updateLocalWorkspaceRoot}
                onUpdateProjectAliases={updateProjectAliases}
              />
            )}

            {activeDrawer === "notes" && (
              <ProjectNotesPanel
                notes={projectNotes}
                onUpdateNotes={updateProjectNotes}
                onSendNotesToGroup={sendNotesToGroup}
              />
            )}

            {activeDrawer === "ai" && (
              <OpenAISettingsPanel
                settings={openAISettings}
                onUpdateSettings={updateOpenAISettings}
              />
            )}

            {activeDrawer === "agents" && (
              <AgentsDrawer
                agents={agentDefinitions}
                projectPath={project.path}
                localWorkspaceRoot={localWorkspaceRoot}
                activeProjectFocus={activeProjectFocus}
                onSendScanResultToGroup={sendCarlosScanResultToGroup}
                onSendScanResultToCarlos={sendCarlosScanResultToChat}
              />
            )}

            {activeDrawer === "memory" && (
              <MemoryInspector
                activeProjectFocus={activeProjectFocus}
                referenceProjectContext={referenceProjectContext}
                inspector={memoryInspector}
                onRefreshMemory={refreshMemoryInspector}
                onClearCachedMemory={clearCachedMemory}
                onToggleVerboseLogging={toggleVerboseMemoryLogging}
              />
            )}

            {activeDrawer === "runner" && (
              <CommandRunner
                projectPath={project.path}
                onSendOutputToGroup={sendCommandOutputToGroup}
              />
            )}

            {activeDrawer === "backups" && (
              <BackupControls
                state={fullState}
                onImportState={replaceWarRoomState}
                onResetCurrentProject={resetCurrentProject}
              />
            )}
          </section>
        )}
      </section>

      <ResizableWarRoomGrid widths={panelWidths} onChangeWidths={updatePanelWidths}>
        <ChatPanel
          chat={leftChats[0]}
          messages={chats[leftChats[0].id]}
          isLoading={openAILaneLoading[leftChats[0].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
          laneAction={
            <button
              className="chat-panel__advisor-button"
              type="button"
              disabled={openAILaneLoading[leftChats[0].id]}
              onClick={() => void askAdvisorAboutGroup(leftChats[0].id)}
            >
              Ask This Advisor About Group
            </button>
          }
        />
        <ChatPanel
          chat={leftChats[1]}
          messages={chats[leftChats[1].id]}
          isLoading={openAILaneLoading[leftChats[1].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
          laneAction={
            <button
              className="chat-panel__advisor-button"
              type="button"
              disabled={openAILaneLoading[leftChats[1].id]}
              onClick={() => void askAdvisorAboutGroup(leftChats[1].id)}
            >
              Ask This Advisor About Group
            </button>
          }
        />
        {centerPanel}
        <ChatPanel
          chat={rightChats[0]}
          messages={chats[rightChats[0].id]}
          isLoading={openAILaneLoading[rightChats[0].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
          laneAction={
            <button
              className="chat-panel__advisor-button"
              type="button"
              disabled={openAILaneLoading[rightChats[0].id]}
              onClick={() => void askAdvisorAboutGroup(rightChats[0].id)}
            >
              Ask This Advisor About Group
            </button>
          }
        />
        <ChatPanel
          chat={rightChats[1]}
          messages={chats[rightChats[1].id]}
          isLoading={openAILaneLoading[rightChats[1].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
          laneAction={
            <button
              className="chat-panel__advisor-button"
              type="button"
              disabled={openAILaneLoading[rightChats[1].id]}
              onClick={() => void askAdvisorAboutGroup(rightChats[1].id)}
            >
              Ask This Advisor About Group
            </button>
          }
        />
      </ResizableWarRoomGrid>

      {isPromptModalOpen && (
        <CursorPromptModal
          project={project}
          notes={projectNotes}
          groupMessages={chats.group}
          summary={summary}
          promptHistory={promptHistory}
          onClose={() => setIsPromptModalOpen(false)}
          onSavePrompt={saveGeneratedPrompt}
          onDeletePrompt={deleteGeneratedPrompt}
          onSendPromptToGroup={sendGeneratedPromptToGroup}
        />
      )}
    </main>
  );
}

export default App;
