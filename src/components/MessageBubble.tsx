import { useState } from "react";
import { MarkdownMessage } from "./MarkdownMessage";
import type { ChatId, ChatMessage, PlanningCategory } from "../types";

const planningActions: Array<{ category: PlanningCategory; label: string }> = [
  { category: "task", label: "Mark as Task" },
  { category: "decision", label: "Mark as Decision" },
  { category: "bug", label: "Mark as Bug" },
  { category: "idea", label: "Mark as Idea" }
];

const groupSourceClasses: Record<string, string> = {
  "Desktop Companion": "desktop",
  "Cursor Builder": "cursor",
  "Business Planner": "business",
  "Code Reviewer": "reviewer",
  "Project Notes": "notes",
  "War Room Synthesizer": "synthesizer",
  "PowerShell Runner": "runner",
  User: "user"
};

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
  const [copiedMessage, setCopiedMessage] = useState(false);
  const isUser = message.role === "user";
  const groupSource = message.source ?? (isUser ? "User" : "Group War Room");
  const groupSourceClass = groupSourceClasses[groupSource] ?? "neutral";
  const timestamp = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(message.createdAt));

  async function copyMessage() {
    await navigator.clipboard.writeText(message.text);
    setCopiedMessage(true);
    window.setTimeout(() => setCopiedMessage(false), 1400);
  }

  return (
    <article
      className={`message ${isUser ? "message--user" : "message--assistant"} ${
        isGroupPanel ? `message--group message--group-source-${groupSourceClass}` : ""
      }`}
    >
      {isGroupPanel ? (
        <span className={`message__source-badge message__source-badge--${groupSourceClass}`}>
          {groupSource}
        </span>
      ) : (
        message.source && <span className="message__source">{message.source}</span>
      )}
      {message.category && (
        <span className={`message__category message__category--${message.category}`}>
          {message.category}
        </span>
      )}
      <MarkdownMessage text={message.text} />
      <div className="message__meta">
        <span>{timestamp}</span>
        <button className="message__copy-button" type="button" onClick={copyMessage}>
          {copiedMessage ? "Copied" : "Copy Message"}
        </button>
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
