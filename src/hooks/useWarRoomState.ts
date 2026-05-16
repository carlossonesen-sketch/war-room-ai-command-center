import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AgentDefinition,
  ChatDefinition,
  ChatId,
  ChatMessage,
  GeneratedPrompt,
  MessageMode,
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
    title: "Hien",
    tagline: "Desktop Companion / project memory / computer indexing / personal assistant"
  },
  {
    id: "cursor",
    title: "Carlos",
    tagline: "Cursor-like builder / code runner / project file inspector"
  },
  {
    id: "business",
    title: "Besi",
    tagline: "Budgeting, marketing, business planning, monetization"
  },
  {
    id: "reviewer",
    title: "Fido",
    tagline: "Code reviewer, bug checker, risk watchdog"
  }
];

export const agentDefinitions: AgentDefinition[] = [
  {
    id: "hien",
    chatId: "desktop",
    codeName: "Hien",
    role: "Desktop Companion / project memory / computer indexing / personal assistant",
    connectionStatus: "local_mock",
    capabilities: ["chat", "index_computer"],
    endpoint: "",
    localPath: ""
  },
  {
    id: "carlos",
    chatId: "cursor",
    codeName: "Carlos",
    role: "Cursor-like builder / code runner / project file inspector",
    connectionStatus: "local_mock",
    capabilities: ["chat", "inspect_project_files", "run_project_command", "generate_cursor_prompt"],
    endpoint: "",
    localPath: ""
  },
  {
    id: "besi",
    chatId: "business",
    codeName: "Besi",
    role: "Budgeting, marketing, business planning, monetization",
    connectionStatus: "local_mock",
    capabilities: ["chat", "budget_plan", "marketing_plan"],
    endpoint: "",
    localPath: ""
  },
  {
    id: "fido",
    chatId: "reviewer",
    codeName: "Fido",
    role: "Code reviewer, bug checker, risk watchdog",
    connectionStatus: "local_mock",
    capabilities: ["chat", "review_code", "inspect_project_files"],
    endpoint: "",
    localPath: ""
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
    "You are Hien, the Desktop Companion. In direct chat, act as a personal project companion for momentum, project memory, computer indexing strategy, and calm personal-assistant guidance.",
  cursor:
    "You are Carlos, the Cursor-like builder. In direct chat, focus on implementation planning, commands, code workflow, project file inspection strategy, build steps, and practical execution.",
  business:
    "You are Besi, the business planning advisor. In direct chat, focus on budgeting, marketing, business planning, monetization, product direction, portfolio value, and hiring angle.",
  reviewer:
    "You are Fido, the code reviewer and risk watchdog. In direct chat, focus on bugs, architecture, security, testing, regressions, and quality risks."
};

const warRoomAdvisorPrompts: Record<Exclude<ChatId, "group">, string> = {
  desktop:
    "You are Hien responding as a War Room advisor. Use the group context to identify priorities, motivation, project memory, and big-picture direction. Be concise and action-oriented.",
  cursor:
    "You are Carlos responding as a War Room advisor. Use the group context to identify files to edit, build steps, verification, project inspection needs, and strong Cursor/Codex prompts.",
  business:
    "You are Besi responding as a War Room advisor. Use the group context to assess budgeting, marketing, monetization, market value, user value, roadmap, portfolio/hiring angle, and business risk.",
  reviewer:
    "You are Fido responding as a War Room advisor. Use the group context to identify edge cases, regressions, failure points, security concerns, architecture risk, and test plan."
};

const synthesizerSystemPrompt =
  "You are the War Room Synthesizer. Combine the individual AI viewpoints into a clear project plan. Be concise, practical, and action-oriented. Return:\n1. Current Goal\n2. Decisions Made\n3. Next 3 Tasks\n4. Risks / Blockers\n5. Best Next Cursor Prompt";

function createMessage(
  role: ChatMessage["role"],
  text: string,
  source?: string,
  mode?: MessageMode
): ChatMessage {
  return {
    id: crypto.randomUUID(),
    role,
    text,
    source,
    mode,
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

function getWarRoomMockResponse(chatId: Exclude<ChatId, "group">, latestGroupMessage: string) {
  const context = latestGroupMessage.trim() || "the current War Room context";
  const responses: Record<Exclude<ChatId, "group">, string> = {
    desktop: `Hien War Room Response: keep momentum around "${context}". Capture the memory, choose the next visible win, reduce noise, and keep the project moving.`,
    cursor: `Carlos War Room Response: based on "${context}", identify the smallest file changes, run the build check, and produce a focused Cursor prompt for the next implementation pass.`,
    business: `Besi War Room Response: "${context}" should be framed around budget, market value, portfolio signal, monetization, and launch risk before expanding scope.`,
    reviewer: `Fido War Room Response: "${context}" needs regression checks, edge-case review, risk review, and a verification plan before it is treated as done.`
  };

  return responses[chatId];
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

function formatSummaryContext(summary: WarRoomSummary) {
  const formatSection = (title: string, messages: ChatMessage[]) => {
    const lines = messages.map(
      (message) => `- ${message.source ? `[${message.source}] ` : ""}${message.text}`
    );
    return `${title}:\n${lines.length ? lines.join("\n") : "- None marked"}`;
  };

  return [
    formatSection("Tasks", summary.task),
    formatSection("Decisions", summary.decision),
    formatSection("Bugs", summary.bug),
    formatSection("Ideas", summary.idea)
  ].join("\n\n");
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

async function requestWarRoomAdvisorResponse(args: {
  settings: OpenAISettings;
  chatId: Exclude<ChatId, "group">;
  project: ProjectContext;
  notes: ProjectNotes;
  groupMessages: ChatMessage[];
  summary: WarRoomSummary;
  signal: AbortSignal;
}) {
  return requestChatCompletion({
    settings: args.settings,
    signal: args.signal,
    messages: [
      { role: "system", content: warRoomAdvisorPrompts[args.chatId] },
      {
        role: "system",
        content: `Selected project context:\n${buildProjectContext(args.project, args.notes)}`
      },
      {
        role: "system",
        content: `War Room Summary:\n${formatSummaryContext(args.summary)}`
      },
      ...args.groupMessages.slice(-16).map((message) => ({
        role: (message.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
        content: `${message.source ? `[${message.source}] ` : ""}${message.text}`
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

      const userMessage = createMessage("user", trimmed, undefined, "direct");
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
            "Group War Room: captured. I will keep this in the shared operating picture.",
            undefined,
            "direct"
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

        const assistantMessage = createMessage(
          "assistant",
          getMockResponse(chatTitle, trimmed),
          undefined,
          "direct"
        );

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
            const assistantMessage = createMessage("assistant", responseText, undefined, "direct");

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
            const errorMessage = createMessage(
              "assistant",
              `OpenAI error: ${message}`,
              undefined,
              "direct"
            );

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

  const askAdvisorAboutGroup = useCallback(
    async (chatId: Exclude<ChatId, "group">) => {
      const currentGroupMessages = chats.group;
      const latestGroupMessage = currentGroupMessages[currentGroupMessages.length - 1]?.text ?? "";
      const contextMessage = createMessage(
        "user",
        "Review the current Group War Room context and respond as this lane's War Room advisor.",
        "Group War Room",
        "war-room"
      );
      const shouldUseOpenAI = openAISettings.useRealAi && Boolean(openAISettings.apiKey.trim());
      const controller = shouldUseOpenAI ? new AbortController() : null;

      if (controller) {
        abortControllersRef.current[chatId]?.abort();
        abortControllersRef.current[chatId] = controller;
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
              [chatId]: [...currentChats[chatId], contextMessage]
            }
          }
        };
      });

      if (!shouldUseOpenAI || !controller) {
        const mockResponse = createMessage(
          "assistant",
          getWarRoomMockResponse(chatId, latestGroupMessage),
          undefined,
          "war-room"
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
                [chatId]: [...currentChats[chatId], mockResponse]
              }
            }
          };
        });
        return;
      }

      setOpenAILaneLoading((current) => ({ ...current, [chatId]: true }));

      try {
        const responseText = await requestWarRoomAdvisorResponse({
          settings: openAISettings,
          chatId,
          project,
          notes: projectNotes,
          groupMessages: currentGroupMessages,
          summary,
          signal: controller.signal
        });
        const responseMessage = createMessage("assistant", responseText, undefined, "war-room");

        setState((currentState) => {
          const currentProjectId = currentState.project.id;
          const currentChats = currentState.chatsByProject[currentProjectId] ?? emptyChats;

          return {
            ...currentState,
            chatsByProject: {
              ...currentState.chatsByProject,
              [currentProjectId]: {
                ...currentChats,
                [chatId]: [...currentChats[chatId], responseMessage]
              }
            }
          };
        });
      } catch (error) {
        const isAbortError = error instanceof DOMException && error.name === "AbortError";
        const message = isAbortError
          ? "War Room advisor request canceled."
          : error instanceof Error
            ? error.message
            : "War Room advisor request failed.";
        const errorMessage = createMessage(
          "assistant",
          `OpenAI error: ${message}`,
          undefined,
          "war-room"
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
                [chatId]: [...currentChats[chatId], errorMessage]
              }
            }
          };
        });
      } finally {
        abortControllersRef.current[chatId] = undefined;
        setOpenAILaneLoading((current) => ({ ...current, [chatId]: false }));
      }
    },
    [chats.group, openAISettings, project, projectNotes, summary]
  );

  const askAllAdvisorsAboutGroup = useCallback(() => {
    individualChatIds.forEach((chatId) => {
      void askAdvisorAboutGroup(chatId);
    });
  }, [askAdvisorAboutGroup]);

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
