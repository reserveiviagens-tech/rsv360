const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface LeadsItem {
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

export async function fetchLeadss(): Promise<LeadsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/leads`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<LeadsItem[]> = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[leadsAdapter] Error:', error);
    return []; // fallback: empty array
  }
}

export async function fetchLeadsById(id: string): Promise<LeadsItem | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/leads/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<LeadsItem> = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error('[leadsAdapter] Error:', error);
    return null; // fallback: null
  }
}