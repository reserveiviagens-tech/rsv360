const STORAGE_KEY = 'rsv360_crm_lease_calendar';

export type LeaseCalendarPersisted = {
  signedIds: string[];
  calendarIds: string[];
};

export function loadLeaseCalendarState(): LeaseCalendarPersisted {
  if (typeof window === 'undefined') {
    return { signedIds: [], calendarIds: [] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { signedIds: [], calendarIds: [] };
    const parsed = JSON.parse(raw) as Partial<LeaseCalendarPersisted>;
    return {
      signedIds: Array.isArray(parsed.signedIds) ? parsed.signedIds.filter((id) => typeof id === 'string') : [],
      calendarIds: Array.isArray(parsed.calendarIds)
        ? parsed.calendarIds.filter((id) => typeof id === 'string')
        : [],
    };
  } catch {
    return { signedIds: [], calendarIds: [] };
  }
}

export function saveLeaseCalendarState(state: LeaseCalendarPersisted): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota / private mode */
  }
}
