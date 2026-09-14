const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface TravelItem {
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

export async function fetchTravels(): Promise<TravelItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/travel`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<TravelItem[]> = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[travelAdapter] Error:', error);
    return []; // fallback: empty array
  }
}

export async function fetchTravelById(id: string): Promise<TravelItem | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/travel/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<TravelItem> = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error('[travelAdapter] Error:', error);
    return null; // fallback: null
  }
}