export interface WorkSession {
  readonly id: string;
  readonly date: string; // YYYY-MM-DD
  readonly startTime: string | null; // HH:MM:SS — null for manual entries
  readonly stopTime: string | null; // HH:MM:SS — null for manual entries
  readonly totalMinutes: number | null; // null means session is still in progress
  readonly isManualEntry: boolean;
}
