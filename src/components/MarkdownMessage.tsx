import { useState } from "react";

interface MarkdownMessageProps {
  text: string;
}

type Segment =
  | { type: "text"; value: string }
  | { type: "code"; value: string; language: string };

function parseMarkdownSegments(text: string): Segment[] {
  const segments: Segment[] = [];
  const fencePattern = /```([^\n`]*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = fencePattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      segments.push({ type: "text", value: text.slice(lastIndex, match.index) });
    }

    segments.push({
      type: "code",
      language: match[1].trim(),
      value: match[2].replace(/\n$/, "")
    });
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    segments.push({ type: "text", value: text.slice(lastIndex) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: text }];
}

function InlineMarkdown({ text }: { text: string }) {
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <>
      {parts.map((part, index) => {
        if (part.startsWith("`") && part.endsWith("`")) {
          return <code key={`${part}-${index}`}>{part.slice(1, -1)}</code>;
        }

        return <span key={`${part}-${index}`}>{part}</span>;
      })}
    </>
  );
}

function TextSegment({ value }: { value: string }) {
  const lines = value.split(/\r?\n/);
  const blocks: Array<{ type: "list" | "paragraph"; lines: string[] }> = [];

  lines.forEach((line) => {
    const trimmed = line.trim();

    if (!trimmed) {
      return;
    }

    const isListLine = /^(-|\*|\d+\.)\s+/.test(trimmed);
    const lastBlock = blocks[blocks.length - 1];

    if (isListLine) {
      const content = trimmed.replace(/^(-|\*|\d+\.)\s+/, "");

      if (lastBlock?.type === "list") {
        lastBlock.lines.push(content);
      } else {
        blocks.push({ type: "list", lines: [content] });
      }
      return;
    }

    blocks.push({ type: "paragraph", lines: [trimmed] });
  });

  return (
    <>
      {blocks.map((block, index) => {
        if (block.type === "list") {
          return (
            <ul key={`list-${index}`}>
              {block.lines.map((line, lineIndex) => (
                <li key={`${line}-${lineIndex}`}>
                  <InlineMarkdown text={line} />
                </li>
              ))}
            </ul>
          );
        }

        return (
          <p key={`paragraph-${index}`}>
            <InlineMarkdown text={block.lines.join(" ")} />
          </p>
        );
      })}
    </>
  );
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  }

  return (
    <figure className="message-code">
      <figcaption>
        <span>{language || "code"}</span>
        <button type="button" onClick={copyCode}>
          {copied ? "Copied" : "Copy"}
        </button>
      </figcaption>
      <pre>
        <code>{value}</code>
      </pre>
    </figure>
  );
}

export function MarkdownMessage({ text }: MarkdownMessageProps) {
  const segments = parseMarkdownSegments(text);

  return (
    <div className="message-markdown">
      {segments.map((segment, index) =>
        segment.type === "code" ? (
          <CodeBlock key={`code-${index}`} language={segment.language} value={segment.value} />
        ) : (
          <TextSegment key={`text-${index}`} value={segment.value} />
        )
      )}
    </div>
  );
}
