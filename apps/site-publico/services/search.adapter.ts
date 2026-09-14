const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface SearchItem {
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

export async function fetchSearchs(): Promise<SearchItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/search`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<SearchItem[]> = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[searchAdapter] Error:', error);
    return []; // fallback: empty array
  }
}

export async function fetchSearchById(id: string): Promise<SearchItem | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/search/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<SearchItem> = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error('[searchAdapter] Error:', error);
    return null; // fallback: null
  }
}