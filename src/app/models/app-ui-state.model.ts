export interface AppUiState {
  readonly dailySummaryExpanded: boolean;
  readonly monthArchiveExpanded: boolean;
  readonly collapsedWeekStartDates: readonly string[];
  readonly showMoneySummary: boolean;
}
