const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';

export interface PromotionsItem {
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

export async function fetchPromotions(): Promise<PromotionsItem[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/promotions`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<PromotionsItem[]> = await res.json();
    return json.data ?? [];
  } catch (error) {
    console.error('[promotionsAdapter] Error:', error);
    return []; // fallback: empty array
  }
}

export async function fetchPromotionById(id: string): Promise<PromotionsItem | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/promotions/${id}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const json: ApiResponse<PromotionsItem> = await res.json();
    return json.data ?? null;
  } catch (error) {
    console.error('[promotionsAdapter] Error:', error);
    return null; // fallback: null
  }
}