export const SortField = {
  Date: 'date',
  WorkedTime: 'workedTime',
} as const;
export type SortField = (typeof SortField)[keyof typeof SortField];

export const SortDirection = {
  Ascending: 'asc',
  Descending: 'desc',
} as const;
export type SortDirection = (typeof SortDirection)[keyof typeof SortDirection];

export interface SessionQueryParams {
  sortBy: SortField;
  order: SortDirection;
  dateFrom?: string;
  dateTo?: string;
}

export interface SessionFilter {
  dateFrom: string;
  dateTo: string;
}

export interface SortChangeEvent {
  sortField: SortField;
  direction: SortDirection;
}
