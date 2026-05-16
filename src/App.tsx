import { BackupControls } from "./components/BackupControls";
import { ChatPanel } from "./components/ChatPanel";
import { CommandRunner } from "./components/CommandRunner";
import { OpenAISettingsPanel } from "./components/OpenAISettingsPanel";
import { ProjectNotesPanel } from "./components/ProjectNotesPanel";
import { ProjectSelector } from "./components/ProjectSelector";
import { ResizableWarRoomGrid } from "./components/ResizableWarRoomGrid";
import { WarRoomSummary } from "./components/WarRoomSummary";
import { useWarRoomState } from "./hooks/useWarRoomState";

function App() {
  const {
    chats,
    project,
    projectNotes,
    openAISettings,
    openAILaneLoading,
    groupSynthesisLoading,
    panelWidths,
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
    markGroupMessage,
    clearAllChats,
    resetCurrentProject,
    replaceWarRoomState
  } = useWarRoomState();

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
          groupSynthesisLoading ? (
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
          )
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

      <ProjectSelector project={project} onUpdateProject={updateProject} />
      <BackupControls
        state={fullState}
        onImportState={replaceWarRoomState}
        onResetCurrentProject={resetCurrentProject}
      />
      <OpenAISettingsPanel settings={openAISettings} onUpdateSettings={updateOpenAISettings} />
      <ProjectNotesPanel
        notes={projectNotes}
        onUpdateNotes={updateProjectNotes}
        onSendNotesToGroup={sendNotesToGroup}
      />
      <CommandRunner projectPath={project.path} onSendOutputToGroup={sendCommandOutputToGroup} />

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
    </main>
  );
}

export default App;
