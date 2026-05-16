import { useEffect, useState } from "react";
import { BackupControls } from "./components/BackupControls";
import { ChatPanel } from "./components/ChatPanel";
import { CommandRunner } from "./components/CommandRunner";
import { CursorPromptModal } from "./components/CursorPromptModal";
import { OpenAISettingsPanel } from "./components/OpenAISettingsPanel";
import { ProjectNotesPanel } from "./components/ProjectNotesPanel";
import { ProjectSelector } from "./components/ProjectSelector";
import { ResizableWarRoomGrid } from "./components/ResizableWarRoomGrid";
import { WarRoomSummary } from "./components/WarRoomSummary";
import { useWarRoomState } from "./hooks/useWarRoomState";

type DrawerId = "project" | "notes" | "ai" | "runner" | "backups";

const DRAWER_STORAGE_KEY = "war-room:active-drawer";

const drawerButtons: Array<{ id: DrawerId; label: string }> = [
  { id: "project", label: "Project" },
  { id: "notes", label: "Notes" },
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
    panelWidths,
    promptHistory,
    summary,
    fullState,
    individualChats,
    groupChat,
    sendMessage,
    sendToGroup,
    updateProject,
    updateOpenAISettings,
    updatePanelWidths,
    cancelOpenAIRequest,
    synthesizeGroupPlan,
    cancelGroupSynthesis,
    updateProjectNotes,
    sendNotesToGroup,
    sendCommandOutputToGroup,
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
        isLoading={groupSynthesisLoading}
        headerAction={
          <div className="chat-panel__header-actions">
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
              <ProjectSelector project={project} onUpdateProject={updateProject} />
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
        />
        <ChatPanel
          chat={leftChats[1]}
          messages={chats[leftChats[1].id]}
          isLoading={openAILaneLoading[leftChats[1].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
        />
        {centerPanel}
        <ChatPanel
          chat={rightChats[0]}
          messages={chats[rightChats[0].id]}
          isLoading={openAILaneLoading[rightChats[0].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
        />
        <ChatPanel
          chat={rightChats[1]}
          messages={chats[rightChats[1].id]}
          isLoading={openAILaneLoading[rightChats[1].id]}
          onSendMessage={sendMessage}
          onCancelRequest={cancelOpenAIRequest}
          onSendToGroup={sendToGroup}
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
