import axios from 'axios';
import type {
  AnalyzeRequest,
  AnalyzeResponse,
  AnalysisHistoryItem,
  HealthResponse,
} from '../types/analysis';

const API_BASE_URL = '/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 45000,
});

export const api = {
  async getHealth(): Promise<HealthResponse> {
    const response = await apiClient.get<HealthResponse>('/health');
    return response.data;
  },

  async analyzeCode(data: AnalyzeRequest): Promise<AnalyzeResponse> {
    const customKey = localStorage.getItem('codelens_gemini_api_key') || '';
    const headers: Record<string, string> = {};
    if (customKey.trim()) {
      headers['x-ai-api-key'] = customKey.trim();
    }
    const response = await apiClient.post<AnalyzeResponse>(
      '/analyze',
      {
        ...data,
        api_key: data.api_key || (customKey ? customKey.trim() : undefined),
      },
      { headers }
    );
    return response.data;
  },

  async getAnalyses(limit: number = 30): Promise<AnalysisHistoryItem[]> {
    const response = await apiClient.get<AnalysisHistoryItem[]>('/analyses', {
      params: { limit },
    });
    return response.data;
  },

  async getAnalysisById(id: string): Promise<AnalyzeResponse> {
    const response = await apiClient.get<AnalyzeResponse>(`/analyses/${id}`);
    return response.data;
  },

  async deleteAnalysis(id: string): Promise<{ status: string; id: string }> {
    const response = await apiClient.delete<{ status: string; id: string }>(`/analyses/${id}`);
    return response.data;
  },

  async clearAnalyses(): Promise<{ status: string }> {
    const response = await apiClient.delete<{ status: string }>('/analyses');
    return response.data;
  },
};
