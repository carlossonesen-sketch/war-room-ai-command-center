import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  ChatDefinition,
  ChatId,
  ChatMessage,
  GeneratedPrompt,
  OpenAISettings,
  PanelWidths,
  PlanningCategory,
  ProjectContext,
  ProjectNotes,
  WarRoomChats,
  WarRoomState,
  WarRoomSummary
} from "../types";

const STORAGE_KEY = "war-room:state";
const LEGACY_CHATS_KEY = "war-room:chats";

export const individualChats: Array<ChatDefinition & { id: Exclude<ChatId, "group"> }> = [
  {
    id: "desktop",
    title: "Desktop Companion",
    tagline: "Context, reminders, and operating support"
  },
  {
    id: "cursor",
    title: "Cursor Builder",
    tagline: "Implementation partner for product work"
  },
  {
    id: "business",
    title: "Business Planner",
    tagline: "Strategy, sequencing, and growth bets"
  },
  {
    id: "reviewer",
    title: "Code Reviewer",
    tagline: "Risk checks and technical critique"
  }
];

export const groupChat: ChatDefinition = {
  id: "group",
  title: "Group War Room",
  tagline: "Shared decisions, escalations, and synthesis"
};

const emptyChats: WarRoomChats = {
  desktop: [],
  cursor: [],
  business: [],
  reviewer: [],
  group: []
};

const defaultProject: ProjectContext = {
  id: "default-project",
  name: "War Room MVP",
  path: "C:\\Projects\\war-room",
  status: "Idea"
};

const emptyProjectNotes: ProjectNotes = {
  currentGoal: "",
  whatWeChanged: "",
  nextSteps: "",
  blockers: "",
  importantLinks: ""
};

const defaultOpenAISettings: OpenAISettings = {
  apiKey: "",
  model: "gpt-4o-mini",
  useRealAi: false
};

const defaultPanelWidths: PanelWidths = [1, 1, 1.7, 1, 1];

const individualChatIds: Array<Exclude<ChatId, "group">> = [
  "desktop",
  "cursor",
  "business",
  "reviewer"
];

const idleOpenAILanes: Record<Exclude<ChatId, "group">, boolean> = {
  desktop: false,
  cursor: false,
  business: false,
  reviewer: false
};

const laneSystemPrompts: Record<Exclude<ChatId, "group">, string> = {
  desktop:
    "You are Desktop Companion, a project-aware assistant. Be concise, practical, and motivational. Help the user keep momentum and clarity.",
  cursor:
    "You are Cursor Builder, a code and build planner. Give practical, step-by-step implementation guidance with clear next actions.",
  business:
    "You are Business Planner, a product and business strategy assistant. Focus on positioning, customer value, risks, sequencing, and leverage.",
  reviewer:
    "You are Code Reviewer, a bug finder and quality checker. Look for correctness, edge cases, maintainability, and missing verification."
};

const synthesizerSystemPrompt =
  "You are the War Room Synthesizer. Combine the individual AI viewpoints into a clear project plan. Be concise, practical, and action-oriented. Return:\n1. Current Goal\n2. Decisions Made\n3. Next 3 Tasks\n4. Risks / Blockers\n5. Best Next Cursor Prompt";

function createMessage(role: ChatMessage["role"], text: string, source?: string): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    source,
    createdAt: new Date().toISOString()
  };
}

function getMockResponse(chatTitle: string, userText: string): string {
  const trimmed = userText.trim();

  if (!trimmed) {
    return `${chatTitle} is standing by.`;
  }

  return `${chatTitle}: noted. I will treat "${trimmed}" as the next working thread for this MVP.`;
}

function normalizeChats(chats: Partial<WarRoomChats> | undefined): WarRoomChats {
  return {
    desktop: chats?.desktop ?? [],
    cursor: chats?.cursor ?? [],
    business: chats?.business ?? [],
    reviewer: chats?.reviewer ?? [],
    group: chats?.group ?? []
  };
}

function normalizeChatsByProject(
  chatsByProject: Record<string, Partial<WarRoomChats>> | undefined,
  projectId: string,
  legacyChats?: Partial<WarRoomChats>
): Record<string, WarRoomChats> {
  return {
    [projectId]: normalizeChats(legacyChats),
    ...Object.fromEntries(
      Object.entries(chatsByProject ?? {}).map(([id, chats]) => [id, normalizeChats(chats)])
    )
  };
}

function normalizeProject(project: Partial<ProjectContext> | undefined): ProjectContext {
  return {
    ...defaultProject,
    ...project,
    id: project?.id ?? defaultProject.id
  };
}

function normalizeProjectNotes(notes: Partial<ProjectNotes> | undefined): ProjectNotes {
  return {
    ...emptyProjectNotes,
    ...notes
  };
}

function normalizeOpenAISettings(settings: Partial<OpenAISettings> | undefined): OpenAISettings {
  return {
    ...defaultOpenAISettings,
    ...settings
  };
}

function normalizePanelWidths(widths: unknown): PanelWidths {
  if (!Array.isArray(widths) || widths.length !== 5) {
    return defaultPanelWidths;
  }

  const parsed = widths.map((width) => Number(width));

  if (parsed.some((width) => !Number.isFinite(width) || width <= 0)) {
    return defaultPanelWidths;
  }

  return parsed as PanelWidths;
}

function normalizePromptHistory(history: unknown): GeneratedPrompt[] {
  if (!Array.isArray(history)) {
    return [];
  }

  return history
    .filter((prompt): prompt is Partial<GeneratedPrompt> => Boolean(prompt))
    .map((prompt) => ({
      id: typeof prompt.id === "string" ? prompt.id : crypto.randomUUID(),
      projectName: typeof prompt.projectName === "string" ? prompt.projectName : "Untitled Project",
      text: typeof prompt.text === "string" ? prompt.text : "",
      createdAt: typeof prompt.createdAt === "string" ? prompt.createdAt : new Date().toISOString()
    }))
    .filter((prompt) => prompt.text.trim());
}

function normalizeNotesByProject(
  notesByProject: Record<string, Partial<ProjectNotes>> | undefined,
  projectId: string
): Record<string, ProjectNotes> {
  return {
    [projectId]: emptyProjectNotes,
    ...Object.fromEntries(
      Object.entries(notesByProject ?? {}).map(([id, notes]) => [id, normalizeProjectNotes(notes)])
    )
  };
}

function normalizeState(candidate: unknown): WarRoomState | null {
  if (!candidate || typeof candidate !== "object") {
    return null;
  }

  const parsed = candidate as Partial<
    WarRoomState & {
      chats?: Partial<WarRoomChats>;
    }
  >;

  if (!parsed.project || typeof parsed.project !== "object") {
    return null;
  }

  const project = normalizeProject(parsed.project);
  const chatsByProject = normalizeChatsByProject(parsed.chatsByProject, project.id, parsed.chats);

  return {
    project,
    chatsByProject,
    notesByProject: normalizeNotesByProject(parsed.notesByProject, project.id),
    openAISettings: normalizeOpenAISettings(parsed.openAISettings),
    panelWidths: normalizePanelWidths(parsed.panelWidths),
    promptHistory: normalizePromptHistory(parsed.promptHistory)
  };
}

function buildProjectContext(project: ProjectContext, notes: ProjectNotes) {
  return [
    `Project: ${project.name}`,
    `Local path: ${project.path || "Not set"}`,
    `Status: ${project.status}`,
    `Current Goal: ${notes.currentGoal || "None"}`,
    `What We Changed: ${notes.whatWeChanged || "None"}`,
    `Next Steps: ${notes.nextSteps || "None"}`,
    `Blockers: ${notes.blockers || "None"}`,
    `Important Links: ${notes.importantLinks || "None"}`
  ].join("\n");
}

async function requestChatCompletion(args: {
  settings: OpenAISettings;
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>;
  signal: AbortSignal;
}) {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.settings.apiKey}`
    },
    body: JSON.stringify({
      model: args.settings.model.trim() || defaultOpenAISettings.model,
      messages: args.messages,
      temperature: 0.7
    }),
    signal: args.signal
  });

  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: Array<{ message?: { content?: string } }>;
  };

  if (!response.ok) {
    throw new Error(payload.error?.message ?? `OpenAI request failed with ${response.status}`);
  }

  const content = payload.choices?.[0]?.message?.content?.trim();

  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return content;
}

async function requestOpenAIResponse(args: {
  settings: OpenAISettings;
  chatId: Exclude<ChatId, "group">;
  project: ProjectContext;
  notes: ProjectNotes;
  messages: ChatMessage[];
  signal: AbortSignal;
}) {
  return requestChatCompletion({
    settings: args.settings,
    signal: args.signal,
    messages: [
      { role: "system", content: laneSystemPrompts[args.chatId] },
      {
        role: "system",
        content: `Use this local War Room project context when relevant:\n${buildProjectContext(
          args.project,
          args.notes
        )}`
      },
      ...args.messages.slice(-12).map((message) => ({
        role: (message.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: message.text
      }))
    ]
  });
}

function loadStoredState(): WarRoomState {
  if (typeof window === "undefined") {
    return {
      project: defaultProject,
      chatsByProject: { [defaultProject.id]: emptyChats },
      notesByProject: { [defaultProject.id]: emptyProjectNotes },
      openAISettings: defaultOpenAISettings,
      panelWidths: defaultPanelWidths,
      promptHistory: []
    };
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);

    if (stored) {
      const normalized = normalizeState(JSON.parse(stored));

      if (normalized) {
        return normalized;
      }
    }

    const legacyChats = window.localStorage.getItem(LEGACY_CHATS_KEY);

    if (legacyChats) {
      return {
        project: defaultProject,
        chatsByProject: { [defaultProject.id]: normalizeChats(JSON.parse(legacyChats)) },
        notesByProject: { [defaultProject.id]: emptyProjectNotes },
        openAISettings: defaultOpenAISettings,
        panelWidths: defaultPanelWidths,
        promptHistory: []
      };
    }
  } catch {
    return {
      project: defaultProject,
      chatsByProject: { [defaultProject.id]: emptyChats },
      notesByProject: { [defaultProject.id]: emptyProjectNotes },
      openAISettings: defaultOpenAISettings,
      panelWidths: defaultPanelWidths,
      promptHistory: []
    };
  }

  return {
    project: defaultProject,
    chatsByProject: { [defaultProject.id]: emptyChats },
    notesByProject: { [defaultProject.id]: emptyProjectNotes },
    openAISettings: defaultOpenAISettings,
    panelWidths: defaultPanelWidths,
    promptHistory: []
  };
}

export function useWarRoomState() {
  const [state, setState] = useState<WarRoomState>(() => loadStoredState());
  const [openAILaneLoading, setOpenAILaneLoading] =
    useState<Record<Exclude<ChatId, "group">, boolean>>(idleOpenAILanes);
  const [groupSynthesisLoading, setGroupSynthesisLoading] = useState(false);
  const abortControllersRef = useRef<Partial<Record<Exclude<ChatId, "group">, AbortController>>>(
    {}
  );
  const synthesisAbortControllerRef = useRef<AbortController | null>(null);
  const { project } = state;
  const chats = state.chatsByProject[project.id] ?? emptyChats;
  const projectNotes = state.notesByProject[project.id] ?? emptyProjectNotes;
  const { openAISettings } = state;
  const panelWidths = state.panelWidths;
  const promptHistory = state.promptHistory;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const chatLookup = useMemo(() => {
    return [...individualChats, groupChat].reduce<Record<ChatId, ChatDefinition>>(
      (lookup, chat) => {
        lookup[chat.id] = chat;
        return lookup;
      },
      {} as Record<ChatId, ChatDefinition>
    );
  }, []);

  const sendMessage = useCallback(
    async (chatId: ChatId, text: string) => {
      const trimmed = text.trim();

      if (!trimmed) {
        return;
      }

      const userMessage = createMessage("user", trimmed);
      const isIndividualChat = chatId !== "group";
      const shouldUseOpenAI =
        isIndividualChat && openAISettings.useRealAi && Boolean(openAISettings.apiKey.trim());
      const laneId = isIndividualChat ? (chatId as Exclude<ChatId, "group">) : null;
      const controller = shouldUseOpenAI && laneId ? new AbortController() : null;
      const openAIRequest =
        shouldUseOpenAI && laneId && controller
          ? {
              settings: openAISettings,
              chatId: laneId,
              project,
              notes: projectNotes,
              messages: [...chats[laneId], userMessage].slice(-12),
              signal: controller.signal
            }
          : null;

      if (laneId && controller) {
        abortControllersRef.current[laneId]?.abort();
        abortControllersRef.current[laneId] = controller;
      }

      setState((currentState) => {
        const currentProjectId = currentState.project.id;
        const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;
        const nextChats = {
          ...currentChats,
          [chatId]: [...currentChats[chatId], userMessage]
        };

        if (chatId === "group") {
          const groupResponse = createMessage(
            "assistant",
            "Group War Room: captured. I will keep this in the shared operating picture."
          );

          return {
            ...currentState,
            chatsByProject: {
              ...currentState.chatsByProject,
              [currentProjectId]: {
                ...nextChats,
                group: [...nextChats.group, groupResponse]
              }
            }
          };
        }

        const chatTitle = chatLookup[chatId].title;

        if (openAIRequest) {
          return {
            ...currentState,
            chatsByProject: {
              ...currentState.chatsByProject,
              [currentProjectId]: nextChats
            }
          };
        }

        const assistantMessage = createMessage("assistant", getMockResponse(chatTitle, trimmed));

        return {
          ...currentState,
          chatsByProject: {
            ...currentState.chatsByProject,
            [currentProjectId]: {
              ...nextChats,
              [chatId]: [...nextChats[chatId], assistantMessage]
            }
          }
        };
      });

      if (openAIRequest) {
        const activeLaneId = openAIRequest.chatId;
        setOpenAILaneLoading((current) => ({ ...current, [activeLaneId]: true }));

        try {
          const responseText = await requestOpenAIResponse(openAIRequest);

          setState((currentState) => {
            const currentProjectId = currentState.project.id;
            const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;
            const assistantMessage = createMessage("assistant", responseText);

            return {
              ...currentState,
              chatsByProject: {
                ...currentState.chatsByProject,
                [currentProjectId]: {
                  ...currentChats,
                  [chatId]: [...currentChats[chatId], assistantMessage]
                }
              }
            };
          });
        } catch (error) {
          const isAbortError = error instanceof DOMException && error.name === "AbortError";
          const message = isAbortError
            ? "OpenAI request canceled."
            : error instanceof Error
              ? error.message
              : "OpenAI request failed.";

          setState((currentState) => {
            const currentProjectId = currentState.project.id;
            const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;
            const errorMessage = createMessage("assistant", `OpenAI error: ${message}`);

            return {
              ...currentState,
              chatsByProject: {
                ...currentState.chatsByProject,
                [currentProjectId]: {
                  ...currentChats,
                  [chatId]: [...currentChats[chatId], errorMessage]
                }
              }
            };
          });
        } finally {
          abortControllersRef.current[activeLaneId] = undefined;
          setOpenAILaneLoading((current) => ({ ...current, [activeLaneId]: false }));
        }
      }
    },
    [chatLookup, chats, openAISettings, project, projectNotes]
  );

  const sendToGroup = useCallback(
    (sourceChatId: ChatId, message: ChatMessage) => {
      const sourceTitle = chatLookup[sourceChatId].title;
      const groupMessage = createMessage("group", message.text, sourceTitle);

      setState((currentState) => ({
        ...currentState,
        chatsByProject: {
          ...currentState.chatsByProject,
          [currentState.project.id]: {
            ...(currentState.chatsByProject[currentState.project.id] ?? emptyChats),
            group: [
              ...(currentState.chatsByProject[currentState.project.id] ?? emptyChats).group,
              groupMessage
            ]
          }
        }
      }));
    },
    [chatLookup]
  );

  const updateProject = useCallback((updates: Partial<ProjectContext>) => {
    setState((currentState) => ({
      ...currentState,
      project: {
        ...currentState.project,
        ...updates
      }
    }));
  }, []);

  const updateOpenAISettings = useCallback((updates: Partial<OpenAISettings>) => {
    setState((currentState) => ({
      ...currentState,
      openAISettings: {
        ...currentState.openAISettings,
        ...updates
      }
    }));
  }, []);

  const updatePanelWidths = useCallback((panelWidths: PanelWidths) => {
    setState((currentState) => ({
      ...currentState,
      panelWidths
    }));
  }, []);

  const cancelOpenAIRequest = useCallback((chatId: Exclude<ChatId, "group">) => {
    abortControllersRef.current[chatId]?.abort();
  }, []);

  const synthesizeGroupPlan = useCallback(async () => {
    if (!openAISettings.useRealAi || !openAISettings.apiKey.trim()) {
      const warning = createMessage(
        "assistant",
        "Turn on real AI responses and add an OpenAI API key before running Group War Room synthesis.",
        "War Room Synthesizer"
      );

      setState((currentState) => {
        const currentProjectId = currentState.project.id;
        const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;

        return {
          ...currentState,
          chatsByProject: {
            ...currentState.chatsByProject,
            [currentProjectId]: {
              ...currentChats,
              group: [...currentChats.group, warning]
            }
          }
        };
      });
      return;
    }

    synthesisAbortControllerRef.current?.abort();
    const controller = new AbortController();
    synthesisAbortControllerRef.current = controller;
    setGroupSynthesisLoading(true);

    try {
      const responseText = await requestChatCompletion({
        settings: openAISettings,
        signal: controller.signal,
        messages: [
          { role: "system", content: synthesizerSystemPrompt },
          {
            role: "system",
            content: `Selected project context:\n${buildProjectContext(project, projectNotes)}`
          },
          ...chats.group.map((message) => ({
            role: (message.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
            content: `${message.source ? `[${message.source}] ` : ""}${message.text}`
          }))
        ]
      });

      setState((currentState) => {
        const currentProjectId = currentState.project.id;
        const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;
        const synthesisMessage = createMessage(
          "assistant",
          responseText,
          "War Room Synthesizer"
        );

        return {
          ...currentState,
          chatsByProject: {
            ...currentState.chatsByProject,
            [currentProjectId]: {
              ...currentChats,
              group: [...currentChats.group, synthesisMessage]
            }
          }
        };
      });
    } catch (error) {
      const isAbortError = error instanceof DOMException && error.name === "AbortError";
      const message = isAbortError
        ? "Group synthesis canceled."
        : error instanceof Error
          ? error.message
          : "Group synthesis failed.";

      setState((currentState) => {
        const currentProjectId = currentState.project.id;
        const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;
        const errorMessage = createMessage(
          "assistant",
          `Synthesis error: ${message}`,
          "War Room Synthesizer"
        );

        return {
          ...currentState,
          chatsByProject: {
            ...currentState.chatsByProject,
            [currentProjectId]: {
              ...currentChats,
              group: [...currentChats.group, errorMessage]
            }
          }
        };
      });
    } finally {
      synthesisAbortControllerRef.current = null;
      setGroupSynthesisLoading(false);
    }
  }, [chats.group, openAISettings, project, projectNotes]);

  const cancelGroupSynthesis = useCallback(() => {
    synthesisAbortControllerRef.current?.abort();
  }, []);

  const updateProjectNotes = useCallback((updates: Partial<ProjectNotes>) => {
    setState((currentState) => {
      const currentNotes = currentState.notesByProject[currentState.project.id] ?? emptyProjectNotes;

      return {
        ...currentState,
        notesByProject: {
          ...currentState.notesByProject,
          [currentState.project.id]: {
            ...currentNotes,
            ...updates
          }
        }
      };
    });
  }, []);

  const sendNotesToGroup = useCallback(() => {
    setState((currentState) => {
      const notes = currentState.notesByProject[currentState.project.id] ?? emptyProjectNotes;
      const formatField = (label: string, value: string) => `${label}: ${value.trim() || "None"}`;
      const noteSummary = [
        `Project Notes for ${currentState.project.name}`,
        formatField("Current Goal", notes.currentGoal),
        formatField("What We Changed", notes.whatWeChanged),
        formatField("Next Steps", notes.nextSteps),
        formatField("Blockers", notes.blockers),
        formatField("Important Links", notes.importantLinks)
      ].join("\n");

      return {
        ...currentState,
        chatsByProject: {
          ...currentState.chatsByProject,
          [currentState.project.id]: {
            ...(currentState.chatsByProject[currentState.project.id] ?? emptyChats),
            group: [
              ...(currentState.chatsByProject[currentState.project.id] ?? emptyChats).group,
              createMessage("group", noteSummary, "Project Notes")
            ]
          }
        }
      };
    });
  }, []);

  const sendCommandOutputToGroup = useCallback((output: string) => {
    const trimmed = output.trim();

    if (!trimmed) {
      return;
    }

    setState((currentState) => {
      const currentProjectId = currentState.project.id;
      const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;

      return {
        ...currentState,
        chatsByProject: {
          ...currentState.chatsByProject,
          [currentProjectId]: {
            ...currentChats,
            group: [...currentChats.group, createMessage("group", trimmed, "PowerShell Runner")]
          }
        }
      };
    });
  }, []);

  const saveGeneratedPrompt = useCallback((promptText: string) => {
    const trimmed = promptText.trim();

    if (!trimmed) {
      return;
    }

    setState((currentState) => ({
      ...currentState,
      promptHistory: [
        {
          id: crypto.randomUUID(),
          projectName: currentState.project.name,
          text: trimmed,
          createdAt: new Date().toISOString()
        },
        ...currentState.promptHistory
      ].slice(0, 20)
    }));
  }, []);

  const deleteGeneratedPrompt = useCallback((promptId: string) => {
    setState((currentState) => ({
      ...currentState,
      promptHistory: currentState.promptHistory.filter((prompt) => prompt.id !== promptId)
    }));
  }, []);

  const sendGeneratedPromptToGroup = useCallback((promptText: string) => {
    const trimmed = promptText.trim();

    if (!trimmed) {
      return;
    }

    setState((currentState) => {
      const currentProjectId = currentState.project.id;
      const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;

      return {
        ...currentState,
        chatsByProject: {
          ...currentState.chatsByProject,
          [currentProjectId]: {
            ...currentChats,
            group: [...currentChats.group, createMessage("group", trimmed, "Cursor Prompt")]
          }
        }
      };
    });
  }, []);

  const markGroupMessage = useCallback((messageId: string, category: PlanningCategory) => {
    setState((currentState) => {
      const currentProjectId = currentState.project.id;
      const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;

      return {
        ...currentState,
        chatsByProject: {
          ...currentState.chatsByProject,
          [currentProjectId]: {
            ...currentChats,
            group: currentChats.group.map((message) =>
              message.id === messageId ? { ...message, category } : message
            )
          }
        }
      };
    });
  }, []);

  const clearAllChats = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      chatsByProject: {
        ...currentState.chatsByProject,
        [currentState.project.id]: emptyChats
      }
    }));
  }, []);

  const resetCurrentProject = useCallback(() => {
    setState((currentState) => ({
      ...currentState,
      chatsByProject: {
        ...currentState.chatsByProject,
        [currentState.project.id]: emptyChats
      },
      notesByProject: {
        ...currentState.notesByProject,
        [currentState.project.id]: emptyProjectNotes
      }
    }));
  }, []);

  const replaceWarRoomState = useCallback((candidate: unknown) => {
    const normalized = normalizeState(candidate);

    if (!normalized) {
      return false;
    }

    setState(normalized);
    return true;
  }, []);

  useEffect(() => {
    return () => {
      individualChatIds.forEach((chatId) => abortControllersRef.current[chatId]?.abort());
      synthesisAbortControllerRef.current?.abort();
    };
  }, []);

  const summary = useMemo<WarRoomSummary>(() => {
    return chats.group.reduce<WarRoomSummary>(
      (sections, message) => {
        if (message.category) {
          sections[message.category].push(message);
        }

        return sections;
      },
      {
        task: [],
        decision: [],
        bug: [],
        idea: []
      }
    );
  }, [chats.group]);

  return {
    chats,
    project,
    projectNotes,
    openAISettings,
    panelWidths,
    promptHistory,
    openAILaneLoading,
    groupSynthesisLoading,
    summary,
    fullState: state,
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
  };
}
