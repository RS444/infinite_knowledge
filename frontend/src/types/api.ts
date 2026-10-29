/**
 * API Type Definitions for Infinite Knowledge
 * Strictly aligns with FastAPI backend responses.
 */

export interface SourceReference {
  document_id: number;
  chunk_index: number;
  start_char: number;
  end_char: number;
}

export interface Concept {
  id: number;
  name: string;
  summary: string;
  keywords: string[];
  learning_objective: string;
  source_refs: SourceReference[];
  topic_id?: number;
}

export interface Topic {
  id: number;
  name: string;
  description: string | null;
  concepts: Concept[];
}

export interface Subject {
  id: number;
  name: string;
  document_id: number;
  created_at: string;
  topic_count?: number;
  concept_count?: number;
}

export interface SubjectsResponse {
  count: number;
  subjects: Subject[];
}

export interface KnowledgeTreeSubjectInfo {
  id: number;
  name: string;
  document_id: number;
}

export interface KnowledgeTreeResponse {
  subject: KnowledgeTreeSubjectInfo;
  topic_count: number;
  concept_count: number;
  topics: Topic[];
}

export interface DocumentUploadResponse {
  message: string;
  document_id: number;
  filename: string;
  file_type: string;
  status: string;
  extracted_characters: number;
  custom_subject_name?: string | null;
}

export interface ProcessDocumentResponse {
  status: 'success' | 'already_processed';
  is_duplicate?: boolean;
  document_id: number;
  subject_id: number;
  subject_name?: string;
  topic_count: number;
  concept_count: number;
  source_references_saved?: number;
  message: string;
}

export interface ApiError {
  detail: string;
  status?: number;
}

export interface HealthResponse {
  status: string;
  database?: string;
}

export interface TutorMessage {
  id?: number;
  role: 'student' | 'assistant' | 'system';
  content: string;
  created_at?: string;
}

export interface ConceptSourceExcerpt {
  document_id: number;
  chunk_index: number;
  start_char: number;
  end_char: number;
  text: string;
}

export interface ConceptProgressResponse {
  concept_id: number;
  completed: boolean;
  completed_at: string | null;
}

export interface TopicProgress {
  topic_id: number;
  topic_name: string;
  total_concepts: number;
  completed_concepts: number;
  completion_percentage: number;
}

export interface SubjectProgressResponse {
  subject_id: number;
  total_concepts: number;
  completed_concepts: number;
  completion_percentage: number;
  completed_concept_ids: number[];
  topic_progress: Record<string, TopicProgress>;
}

export interface ConceptTutorContext {
  concept: {
    id: number;
    name: string;
    summary: string;
    keywords: string[];
    learning_objective: string;
    topic_id?: number;
  };
  topic: {
    id: number | null;
    name: string;
    description: string | null;
  };
  subject: {
    id: number | null;
    name: string;
  };
  source_excerpts: ConceptSourceExcerpt[];
  messages: TutorMessage[];
  progress: ConceptProgressResponse;
}

export interface TutorChatResponse {
  role: 'assistant';
  content: string;
  grounded: boolean;
  concept_id: number;
  message_id?: number;
  created_at?: string;
}
