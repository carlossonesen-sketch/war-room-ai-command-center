export type ChatId = "desktop" | "cursor" | "business" | "reviewer" | "group";

export type AgentId = "hien" | "carlos" | "besi" | "fido";

export type AgentConnectionStatus = "disconnected" | "local_mock" | "connected" | "error";

export type AgentCapability =
  | "chat"
  | "index_computer"
  | "inspect_project_files"
  | "run_project_command"
  | "generate_cursor_prompt"
  | "review_code"
  | "budget_plan"
  | "marketing_plan";

export type MessageRole = "user" | "assistant" | "group";

export type MessageMode = "direct" | "war-room";

export type ProjectStatus = "Idea" | "Building" | "Testing" | "Launched";

export type PlanningCategory = "task" | "decision" | "bug" | "idea";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  source?: string;
  category?: PlanningCategory;
  mode?: MessageMode;
}

export interface ChatDefinition {
  id: ChatId;
  title: string;
  tagline: string;
}

export interface AgentDefinition {
  id: AgentId;
  chatId: Exclude<ChatId, "group">;
  codeName: string;
  role: string;
  connectionStatus: AgentConnectionStatus;
  capabilities: AgentCapability[];
  endpoint: string;
  localPath: string;
}

export interface ProjectContext {
  id: string;
  name: string;
  path: string;
  status: ProjectStatus;
}

export interface ProjectNotes {
  currentGoal: string;
  whatWeChanged: string;
  nextSteps: string;
  blockers: string;
  importantLinks: string;
}

export interface OpenAISettings {
  apiKey: string;
  model: string;
  useRealAi: boolean;
}

export type PanelWidths = [number, number, number, number, number];

export interface GeneratedPrompt {
  id: string;
  projectName: string;
  text: string;
  createdAt: string;
}

export type WarRoomChats = Record<ChatId, ChatMessage[]>;

export type WarRoomSummary = Record<PlanningCategory, ChatMessage[]>;

export interface WarRoomState {
  project: ProjectContext;
  chatsByProject: Record<string, WarRoomChats>;
  notesByProject: Record<string, ProjectNotes>;
  openAISettings: OpenAISettings;
  panelWidths: PanelWidths;
  promptHistory: GeneratedPrompt[];
}
