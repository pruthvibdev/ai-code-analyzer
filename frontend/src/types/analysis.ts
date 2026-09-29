export type Language = 'python' | 'javascript' | 'java' | 'cpp';

export interface CodeIssue {
  severity: 'critical' | 'warning' | 'suggestion';
  title: string;
  description: string;
  line?: number;
  column?: number;
  rule_id?: string;
}

export interface CodeSuggestion {
  title: string;
  description: string;
}

export interface AnalysisMetrics {
  lines_of_code: number;
  blank_lines: number;
  comment_lines: number;
  cyclomatic_complexity: number;
  max_nesting_depth: number;
  loop_count: number;
  function_count: number;
  class_count: number;
  recursion_detected: boolean;
}

export interface AnalyzeRequest {
  code: string;
  language: Language;
  api_key?: string;
}

export interface AnalyzeResponse {
  id?: string;
  language: string;
  code?: string;
  time_complexity: string;
  space_complexity: string;
  time_complexity_optimized?: string;
  space_complexity_optimized?: string;
  quality_score: number;
  summary: string;
  issues: CodeIssue[];
  suggestions: CodeSuggestion[];
  metrics: AnalysisMetrics;
  optimized_code?: string;
  optimization_explanation?: string;
  confidence: number;
  is_ai_assisted: boolean;
  static_analysis_notice?: string;
  created_at?: string;
}

export interface AnalysisHistoryItem {
  id: string;
  language: string;
  title: string;
  quality_score: number;
  time_complexity: string;
  space_complexity: string;
  created_at: string;
  preview_code: string;
  lines_of_code?: number;
}

export interface HealthResponse {
  status: string;
  app: string;
  version: string;
  ai_configured: boolean;
  database_status: string;
  history_count?: number;
}
