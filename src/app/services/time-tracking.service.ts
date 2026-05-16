import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { AppUiState } from '../models/app-ui-state.model';
import { WorkSession } from '../models/work-session.model';
import { SessionQueryParams } from '../models/session-query.model';
import { SaveWorkDaySummaryRequest, WorkDaySummary } from '../models/work-day-summary.model';
import { WeeklySummary } from '../models/weekly-summary.model';

@Injectable({ providedIn: 'root' })
export class TimeTrackingService {
  private readonly httpClient = inject(HttpClient);

  readonly workSessions = signal<WorkSession[]>([]);
  readonly weeklySummaries = signal<WeeklySummary[]>([]);
  readonly uiState = signal<AppUiState>({
    dailySummaryExpanded: true,
    collapsedWeekStartDates: [],
    showMoneySummary: true,
  });
  readonly isLoadingSessions = signal(false);
  readonly hasLoadError = signal(false);

  loadUiState(onComplete?: () => void): void {
    this.httpClient.get<AppUiState>('/api/ui-state').subscribe({
      next: (uiState) => {
        this.uiState.set(uiState);
        onComplete?.();
      },
      error: () => onComplete?.(),
    });
  }

  updateUiState(
    partialUiState: Partial<AppUiState>,
    onComplete?: (uiState: AppUiState) => void
  ): void {
    const mergedUiState: AppUiState = {
      ...this.uiState(),
      ...partialUiState,
    };

    this.httpClient.put<AppUiState>('/api/ui-state', mergedUiState).subscribe({
      next: (uiState) => {
        this.uiState.set(uiState);
        onComplete?.(uiState);
      },
      error: () => onComplete?.(this.uiState()),
    });
  }

  loadSessions(queryParams: SessionQueryParams): void {
    this.isLoadingSessions.set(true);
    this.hasLoadError.set(false);

    let httpParams = new HttpParams()
      .set('sortBy', queryParams.sortBy)
      .set('order', queryParams.order);

    if (queryParams.dateFrom) {
      httpParams = httpParams.set('dateFrom', queryParams.dateFrom);
    }
    if (queryParams.dateTo) {
      httpParams = httpParams.set('dateTo', queryParams.dateTo);
    }

    forkJoin({
      sessions: this.httpClient.get<WorkSession[]>('/api/sessions', { params: httpParams }),
      weeklySummaries: this.httpClient
        .get<WeeklySummary[]>('/api/weekly-summaries')
        .pipe(catchError(() => of([]))),
    }).subscribe({
      next: ({ sessions, weeklySummaries }) => {
        this.workSessions.set(sessions);
        this.weeklySummaries.set(weeklySummaries);
        this.isLoadingSessions.set(false);
      },
      error: () => {
        this.isLoadingSessions.set(false);
        this.hasLoadError.set(true);
      },
    });
  }

  addWorkSession(workSession: Omit<WorkSession, 'id'>, onComplete: (createdSession: WorkSession) => void): void {
    this.httpClient.post<WorkSession>('/api/sessions', workSession).subscribe({
      next: (createdSession) => onComplete(createdSession),
      error: () => {},
    });
  }

  updateWorkSession(sessionId: string, updatedFields: Partial<WorkSession>, onComplete: () => void): void {
    this.httpClient.put<WorkSession>(`/api/sessions/${sessionId}`, updatedFields).subscribe({
      next: () => onComplete(),
      error: () => onComplete(),
    });
  }

  deleteWorkSession(sessionId: string, onComplete: () => void): void {
    this.httpClient.delete(`/api/sessions/${sessionId}`).subscribe({
      next: () => onComplete(),
      error: () => onComplete(),
    });
  }

  loadWorkSessionsForDate(date: string, onComplete: (sessions: WorkSession[]) => void): void {
    const httpParams = new HttpParams()
      .set('sortBy', 'date')
      .set('order', 'desc')
      .set('dateFrom', date)
      .set('dateTo', date);

    this.httpClient.get<WorkSession[]>('/api/sessions', { params: httpParams }).subscribe({
      next: (sessions) => onComplete(sessions),
      error: () => onComplete([]),
    });
  }

  loadWorkDaySummary(date: string, onComplete: (summary: WorkDaySummary | null) => void): void {
    this.httpClient.get<WorkDaySummary>(`/api/work-day-summaries/${date}`).subscribe({
      next: (summary) => onComplete(summary),
      error: () => onComplete(null),
    });
  }

  loadWorkDaySummaries(onComplete: (summaries: WorkDaySummary[]) => void): void {
    this.httpClient.get<WorkDaySummary[]>('/api/work-day-summaries').subscribe({
      next: (summaries) => onComplete(summaries),
      error: () => onComplete([]),
    });
  }

  saveWorkDaySummary(
    date: string,
    descriptionMarkdown: string | null,
    onComplete: (summary: WorkDaySummary) => void
  ): void {
    const saveRequest: SaveWorkDaySummaryRequest = {
      date,
      descriptionMarkdown,
    };

    this.httpClient.put<WorkDaySummary>(`/api/work-day-summaries/${date}`, saveRequest).subscribe({
      next: (summary) => onComplete(summary),
      error: () => {},
    });
  }

  deleteWorkDaySummary(date: string, onComplete: () => void): void {
    this.httpClient.delete(`/api/work-day-summaries/${date}`).subscribe({
      next: () => onComplete(),
      error: () => onComplete(),
    });
  }
}
