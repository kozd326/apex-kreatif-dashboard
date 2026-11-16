export function calendarEventId(key: string, generation?: number): string;
export function calendarEntries(data: {
  tasks?: any[];
  projects?: any[];
  deliverables?: any[];
  events?: any[];
}): Array<{ key: string; body: any }>;
