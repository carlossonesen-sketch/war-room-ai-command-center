import type { ChatId, ChatMessage, PlanningCategory } from "../types";

const planningActions: Array<{ category: PlanningCategory; label: string }> = [
  { category: "task", label: "Mark as Task" },
  { category: "decision", label: "Mark as Decision" },
  { category: "bug", label: "Mark as Bug" },
  { category: "idea", label: "Mark as Idea" }
];

interface MessageBubbleProps {
  message: ChatMessage;
  chatId: ChatId;
  isGroupPanel?: boolean;
  onSendToGroup?: (chatId: ChatId, message: ChatMessage) => void;
  onMarkGroupMessage?: (messageId: string, category: PlanningCategory) => void;
}

export function MessageBubble({
  message,
  chatId,
  isGroupPanel = false,
  onSendToGroup,
  onMarkGroupMessage
}: MessageBubbleProps) {
  const isUser = message.role === "user";
  const timestamp = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(message.createdAt));

  return (
    <article className={`message ${isUser ? "message--user" : "message--assistant"}`}>
      {message.source && <span className="message__source">{message.source}</span>}
      {message.category && <span className={`message__category message__category--${message.category}`}>{message.category}</span>}
      <p>{message.text}</p>
      <div className="message__meta">
        <span>{timestamp}</span>
        {!isGroupPanel && onSendToGroup && (
          <button
            className="message__group-button"
            type="button"
            onClick={() => onSendToGroup(chatId, message)}
          >
            {message.role === "assistant" ? "Send AI Reply to Group" : "Send to Group"}
          </button>
        )}
      </div>
      {isGroupPanel && onMarkGroupMessage && (
        <div className="message__planning-actions" aria-label="Planning actions">
          {planningActions.map((action) => (
            <button
              key={action.category}
              type="button"
              className={message.category === action.category ? "is-active" : ""}
              onClick={() => onMarkGroupMessage(message.id, action.category)}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
