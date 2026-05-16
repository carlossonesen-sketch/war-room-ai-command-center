import { FormEvent, useState } from "react";
import { MessageBubble } from "./MessageBubble";
import type { ChatDefinition, ChatId, ChatMessage, PlanningCategory } from "../types";

interface ChatPanelProps {
  chat: ChatDefinition;
  messages: ChatMessage[];
  isGroupPanel?: boolean;
  isLoading?: boolean;
  headerAction?: React.ReactNode;
  onSendMessage: (chatId: ChatId, text: string) => void | Promise<void>;
  onCancelRequest?: (chatId: Exclude<ChatId, "group">) => void;
  onSendToGroup?: (chatId: ChatId, message: ChatMessage) => void;
  onMarkGroupMessage?: (messageId: string, category: PlanningCategory) => void;
}

export function ChatPanel({
  chat,
  messages,
  isGroupPanel = false,
  isLoading = false,
  headerAction,
  onSendMessage,
  onCancelRequest,
  onSendToGroup,
  onMarkGroupMessage
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!draft.trim() || isLoading) {
      return;
    }

    void onSendMessage(chat.id, draft);
    setDraft("");
  }

  return (
    <section className={`chat-panel ${isGroupPanel ? "chat-panel--group" : ""}`}>
      <header className="chat-panel__header">
        <div>
          <h2>{chat.title}</h2>
          <p>{chat.tagline}</p>
        </div>
        <div className="chat-panel__status">
          {headerAction}
          {isLoading && <span className="chat-panel__loading">Thinking...</span>}
          <span className="chat-panel__count">{messages.length}</span>
        </div>
      </header>

      <div className="chat-panel__messages" aria-live="polite">
        {messages.length === 0 ? (
          <div className="chat-panel__empty">No messages yet.</div>
        ) : (
          messages.map((message) => (
            <MessageBubble
              key={message.id}
              message={message}
              chatId={chat.id}
              isGroupPanel={isGroupPanel}
              onSendToGroup={onSendToGroup}
              onMarkGroupMessage={onMarkGroupMessage}
            />
          ))
        )}
      </div>

      <form className="chat-panel__composer" onSubmit={handleSubmit}>
        <input
          type="text"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={`Message ${chat.title}`}
          aria-label={`Message ${chat.title}`}
          disabled={isLoading}
        />
        {isLoading && !isGroupPanel && onCancelRequest ? (
          <button
            type="button"
            className="chat-panel__cancel"
            onClick={() => onCancelRequest(chat.id as Exclude<ChatId, "group">)}
          >
            Cancel
          </button>
        ) : (
          <button type="submit" disabled={isLoading}>
            Send
          </button>
        )}
      </form>
    </section>
  );
}
