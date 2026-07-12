export interface ArchivedMonth {
  readonly id: string;
  readonly monthKey: string; // YYYY-MM
  readonly monthStartDate: string; // YYYY-MM-DD
  readonly monthEndDate: string; // YYYY-MM-DD
  readonly createdAt: string;
  readonly updatedAt: string;
}
