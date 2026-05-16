export type ChatId = "desktop" | "cursor" | "business" | "reviewer" | "group";

export type MessageRole = "user" | "assistant" | "group";

export type ProjectStatus = "Idea" | "Building" | "Testing" | "Launched";

export type PlanningCategory = "task" | "decision" | "bug" | "idea";

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
  createdAt: string;
  source?: string;
  category?: PlanningCategory;
}

export interface ChatDefinition {
  id: ChatId;
  title: string;
  tagline: string;
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

export type WarRoomChats = Record<ChatId, ChatMessage[]>;

export type WarRoomSummary = Record<PlanningCategory, ChatMessage[]>;

export interface WarRoomState {
  project: ProjectContext;
  chatsByProject: Record<string, WarRoomChats>;
  notesByProject: Record<string, ProjectNotes>;
  openAISettings: OpenAISettings;
  panelWidths: PanelWidths;
}
