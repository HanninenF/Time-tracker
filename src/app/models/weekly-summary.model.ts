export interface WeeklySummary {
  readonly id: string;
  readonly weekStartDate: string; // YYYY-MM-DD
  readonly weekEndDate: string; // YYYY-MM-DD
  readonly totalMinutes: number;
  readonly anchorSessionId: string;
  readonly anchorSessionDate: string; // YYYY-MM-DD
  readonly anchorSessionStartTime: string | null; // HH:MM:SS | null for manual entries
  readonly createdAt: string;
  readonly updatedAt: string;
}
