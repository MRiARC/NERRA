/**
 * Core NERRA TypeScript Data Models (matching FastAPI backend schemas)
 */

export interface User {
  id: string;
  email: string;
  display_name: string;
}

export interface UserSession {
  id: string;
  created_at: string;
  last_active_at: string;
  user_agent: string | null;
  ip_address: string | null;
  is_current: boolean;
}

export interface TokenOut {
  access_token: string;
  token_type: string;
  refresh_token: string | null;
  session_id: string | null;
  expires_in: number;
}

export interface Project {
  id: string;
  title: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
  chapter_count?: number;
  word_count?: number;
  open_issue_count?: number;
  status?: "draft" | "processing" | "ready" | "failed";
}

export interface Chapter {
  id: string;
  project_id: string;
  chapter_number: number;
  title: string | null;
  content: string;
  word_count: number;
  created_at: string;
}

export interface Claim {
  id: string;
  project_id: string;
  chapter: number;
  subject: string;
  attribute: string;
  value: string;
  evidence_quote: string;
  confidence: number;
  status: "active" | "overridden" | "retracted";
  created_at: string;
}

export interface StoryObject {
  id: string;
  project_id: string;
  name: string;
  first_chapter: number;
  mention_chapters: number[];
  current_holder?: string | null;
}

export interface StoryEvent {
  id: string;
  project_id: string;
  chapter_number: number;
  scene_order: number;
  story_time_order: number;
  summary: string;
  location: string | null;
  is_flashback: boolean;
}

export interface WorldRule {
  id: string;
  project_id: string;
  category: "magic" | "physics" | "society" | "timeline" | "general";
  rule_text: string;
  is_author_defined: boolean;
  status: "active" | "archived";
}

export interface Issue {
  id: string;
  project_id: string;
  type:
    | "contradiction"
    | "knowledge_violation"
    | "dangling_object"
    | "spatiotemporal_conflict"
    | "custody_paradox"
    | "world_rule_violation"
    | "continuity_note";
  severity: "red" | "yellow" | "blue";
  status: "open" | "resolved" | "ignored";
  description: string;
  evidence: Array<{
    chapter: number;
    quote: string;
  }>;
  ai_reasoning?: string | null;
  intent_classification?: "intentional" | "error" | "ambiguous" | null;
  claim_a_id?: string | null;
  claim_b_id?: string | null;
  created_at: string;
}

export interface PlotThread {
  id: string;
  project_id: string;
  title: string;
  category: "mystery" | "subplot" | "character_arc" | "conflict";
  status: "introduced" | "developing" | "climactic" | "resolved" | "abandoned";
  chapters_mentioned: number[];
}

export interface PipelineProgress {
  status: "idle" | "running" | "completed" | "failed";
  current_chapter?: number;
  total_chapters?: number;
  step?: string;
  error?: string | null;
}
