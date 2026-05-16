import { BackupControls } from "./components/BackupControls";
import { ChatPanel } from "./components/ChatPanel";
import { OpenAISettingsPanel } from "./components/OpenAISettingsPanel";
import { ProjectNotesPanel } from "./components/ProjectNotesPanel";
import { ProjectSelector } from "./components/ProjectSelector";
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
    summary,
    fullState,
    individualChats,
    groupChat,
    sendMessage,
    sendToGroup,
    updateProject,
    updateOpenAISettings,
    cancelOpenAIRequest,
    synthesizeGroupPlan,
    cancelGroupSynthesis,
    updateProjectNotes,
    sendNotesToGroup,
    markGroupMessage,
    clearAllChats,
    resetCurrentProject,
    replaceWarRoomState
  } = useWarRoomState();

  const leftChats = individualChats.slice(0, 2);
  const rightChats = individualChats.slice(2);

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

      <section className="war-room-grid" aria-label="War Room chat panels">
        {leftChats.map((chat) => (
          <ChatPanel
            key={chat.id}
            chat={chat}
            messages={chats[chat.id]}
            isLoading={openAILaneLoading[chat.id]}
            onSendMessage={sendMessage}
            onCancelRequest={cancelOpenAIRequest}
            onSendToGroup={sendToGroup}
          />
        ))}

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

        {rightChats.map((chat) => (
          <ChatPanel
            key={chat.id}
            chat={chat}
            messages={chats[chat.id]}
            isLoading={openAILaneLoading[chat.id]}
            onSendMessage={sendMessage}
            onCancelRequest={cancelOpenAIRequest}
            onSendToGroup={sendToGroup}
          />
        ))}
      </section>
    </main>
  );
}

export default App;
