export interface WorkDaySummary {
  readonly id: string;
  readonly date: string; // YYYY-MM-DD
  readonly workSessionIds: readonly string[];
  readonly descriptionMarkdown: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export interface SaveWorkDaySummaryRequest {
  readonly date: string;
  readonly descriptionMarkdown: string | null;
}
