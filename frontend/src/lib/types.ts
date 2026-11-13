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
  genre?: string | null;
  owner_id: string;
  created_at: string;
  updated_at?: string;
  chapter_count?: number;
  word_count?: number;
  open_issue_count?: number;
  status?: "draft" | "processing" | "ready" | "failed";
  character_count?: number;
  location_count?: number;
  object_count?: number;
  event_count?: number;
  claim_count?: number;
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

export interface Character {
  id: string;
  name: string;
  aliases: string[];
  description: string | null;
  status: string;
  physical_traits: Record<string, any>;
  first_chapter: number | null;
  last_chapter: number | null;
}

export interface Relationship {
  id: string;
  character_a_id: string;
  character_b_id: string;
  type: string;
  sentiment: string;
  description: string | null;
  evidence_quote?: string | null;
  chapter: number | null;
  until_chapter?: number | null;
}

export interface GraphNode {
  id: string;
  label: string;
  kind: "character" | "location" | "object" | "event" | string;
  chapter?: number | null;
  metadata?: Record<string, any>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  sentiment: string;
  since_chapter?: number | null;
  until_chapter?: number | null;
  description?: string | null;
}

export interface StoryGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  neo4j_connected: boolean;
  max_chapter: number;
}

export interface Event {
  id: string;
  chapter_number: number;
  scene_order: number;
  story_time_order: number;
  temporal_anchor?: string | null;
  is_flashback: boolean;
  is_flashforward: boolean;
  summary: string;
  participants: string[];
  location: string | null;
}

export interface Timeline {
  order: string;
  events: Event[];
  characters: string[];
  flashback_count: number;
  flashforward_count: number;
  spatiotemporal_conflict_chapters: number[];
}

export interface Location {
  id: string;
  name: string;
  description: string | null;
  first_chapter: number | null;
}

export interface StoryObject {
  id: string;
  name: string;
  description: string | null;
  first_chapter: number | null;
  mention_chapters: number[];
  current_holder?: string | null;
}

export interface ObjectCustodyEvent {
  id: string;
  object_id: string;
  chapter: number;
  holder_type: string;
  holder_name: string;
  action: string;
  evidence_quote?: string | null;
}

export interface WorldData {
  locations: Location[];
  objects: StoryObject[];
}

export interface KnowledgeMatrixCell {
  character: string;
  fact: string;
  knows: boolean;
  since_chapter?: number | null;
  how_learned?: string | null;
  source_character?: string | null;
  propagated: boolean;
}

export interface KnowledgeMatrix {
  characters: string[];
  facts: string[];
  cells: KnowledgeMatrixCell[];
  max_chapter: number;
}

export interface Claim {
  id: string;
  subject: string;
  attribute: string;
  value: string;
  chapter: number;
  evidence_quote: string;
  confidence: number;
  validation_state: string;
  status: "active" | "overridden" | "retracted" | "superseded" | string;
}

export interface WorldRule {
  id: string;
  category: "magic" | "physics" | "society" | "timeline" | "setting" | "general" | string;
  rule_text: string;
  source_chapter?: number | null;
  is_author_defined: boolean;
  status: "active" | "archived" | string;
}

export interface Issue {
  id: string;
  type:
    | "contradiction"
    | "knowledge_violation"
    | "dangling_object"
    | "spatiotemporal_conflict"
    | "custody_paradox"
    | "world_rule_violation"
    | "continuity_note"
    | string;
  severity: "red" | "yellow" | "blue" | string;
  status: "open" | "resolved" | "ignored" | "accepted" | "rejected" | "intentional" | string;
  description: string;
  evidence: Array<{
    chapter: number;
    quote: string;
  }>;
  ai_reasoning?: string | null;
  intent_classification?: "intentional" | "error" | "ambiguous" | string | null;
  confidence?: number;
  related_entities?: string[];
  claim_a_id?: string | null;
  claim_b_id?: string | null;
  created_at?: string;
}

export interface PlotThread {
  id: string;
  project_id: string;
  title: string;
  description: string;
  setup_chapter: number;
  payoff_chapter?: number | null;
  status: "open" | "resolved" | "abandoned" | "red_herring" | string;
  related_entities: string[];
  evidence_quote?: string | null;
  updated_at?: string;
}

export interface Manuscript {
  id: string;
  title: string;
  status: "pending" | "processing" | "ready" | "failed" | string;
  chapters_done: number;
  chapters_total: number;
  created_at: string;
}

export interface ManuscriptStatus {
  manuscript_id: string;
  status: "pending" | "processing" | "ready" | "failed" | string;
  chapters_done: number;
  chapters_total: number;
  error_note: string | null;
}

export interface ChapterSummary {
  number: number;
  title: string;
  word_count: number;
  preview: string;
}

export interface ChapterDetail {
  number: number;
  title: string;
  content: string;
  word_count: number;
}

export interface BibleExport {
  project_title: string;
  markdown: string;
  generated_at: string;
}

export interface ProjectCustomization {
  project_id: string;
  custom_context?: string | null;
  custom_prompt?: string | null;
  custom_validation?: Record<string, any>;
  custom_graph_write?: Record<string, any>;
  custom_ui_config?: Record<string, any>;
  updated_at?: string | null;
}

export interface ValidationCandidate {
  id: string;
  project_id: string;
  manuscript_id?: string | null;
  chapter: number;
  candidate_type: string;
  payload: Record<string, any>;
  confidence: number;
  route: string;
  ambiguity_reason?: string | null;
  evidence_quote?: string | null;
  status: string;
  created_at: string;
}

export interface CorrectionRule {
  id: string;
  project_id: string;
  rule_type: string;
  target_entity: string;
  instruction_text: string;
  payload: Record<string, any>;
  active: boolean;
  created_at: string;
}

export interface ChatCitation {
  chapter: number;
  excerpt: string;
}

export interface ChatOut {
  answer: string;
  citations: ChatCitation[];
  intent: string;
  graph_entities: string[];
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
export interface PipelineProgress {
  status: "idle" | "running" | "completed" | "failed";
  current_chapter?: number;
  total_chapters?: number;
  step?: string;
  error?: string | null;
}
