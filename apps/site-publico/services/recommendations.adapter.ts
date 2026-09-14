const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface RecommendationsItem {
  id: string | number;
  name: string;
  [key: string]: unknown; // domain-specific fields
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  total?: number;
  error?: string;
}

export async function fetchRecommendations(): Promise<RecommendationsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/recommendations`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<RecommendationsItem[]> = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[recommendationsAdapter] Error:', error);
    return []; // fallback: empty array
  }
}

export async function fetchRecommendationById(id: string): Promise<RecommendationsItem | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/recommendations/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<RecommendationsItem> = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error('[recommendationsAdapter] Error:', error);
    return null; // fallback: null
  }
}