import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { WorkSession } from './models/work-session.model'; // needed for onEditSaved and onManualSessionSaved
import {
  SessionFilter,
  SessionQueryParams,
  SortChangeEvent,
  SortDirection,
  SortField,
} from './models/session-query.model';
import { TimeTrackingService } from './services/time-tracking.service';
import { StopwatchComponent } from './features/stopwatch/stopwatch.component';
import { ManualEntryComponent } from './features/sessions/manual-entry/manual-entry.component';
import { SessionFilterComponent } from './features/sessions/session-filter/session-filter.component';
import { SessionsListComponent } from './features/sessions/sessions-list/sessions-list.component';
import { DailySummaryComponent } from './features/daily-summary/daily-summary.component';
import { MonthArchiveComponent } from './features/month-archive/month-archive.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    StopwatchComponent,
    ManualEntryComponent,
    DailySummaryComponent,
    MonthArchiveComponent,
    SessionFilterComponent,
    SessionsListComponent,
  ],
  templateUrl: './app.html',
  styleUrl: './app.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App implements OnInit {
  private readonly timeTrackingService = inject(TimeTrackingService);

  protected readonly workSessions = this.timeTrackingService.workSessions;
  protected readonly weeklySummaries = this.timeTrackingService.weeklySummaries;
  protected readonly isLoadingSessions = this.timeTrackingService.isLoadingSessions;
  protected readonly hasLoadError = this.timeTrackingService.hasLoadError;

  protected readonly activeSortField = signal<SortField>(SortField.Date);
  protected readonly activeSortDirection = signal<SortDirection>(SortDirection.Descending);
  protected readonly workSessionsChangeVersion = signal(0);

  private readonly currentDateFrom = signal('');
  private readonly currentDateTo = signal('');

  ngOnInit(): void {
    this.timeTrackingService.loadUiState();
    this.reloadSessions();
  }

  protected onSessionUpdated(): void {
    this.reloadSessionsAndNotifyWorkSessionChange();
  }

  protected onManualSessionSaved(session: Omit<WorkSession, 'id'>): void {
    this.timeTrackingService.addWorkSession(session, () => this.reloadSessionsAndNotifyWorkSessionChange());
  }

  protected onSortChanged(sortChangeEvent: SortChangeEvent): void {
    this.activeSortField.set(sortChangeEvent.sortField);
    this.activeSortDirection.set(sortChangeEvent.direction);
    this.reloadSessions();
  }

  protected onFilterApplied(sessionFilter: SessionFilter): void {
    this.currentDateFrom.set(sessionFilter.dateFrom);
    this.currentDateTo.set(sessionFilter.dateTo);
    this.reloadSessions();
  }

  protected onFilterCleared(): void {
    this.currentDateFrom.set('');
    this.currentDateTo.set('');
    this.reloadSessions();
  }

  protected onEditSaved(updatedSession: WorkSession): void {
    this.timeTrackingService.updateWorkSession(updatedSession.id, updatedSession, () =>
      this.reloadSessionsAndNotifyWorkSessionChange()
    );
  }

  protected onDeleteRequested(sessionId: string): void {
    this.timeTrackingService.deleteWorkSession(sessionId, () => this.reloadSessionsAndNotifyWorkSessionChange());
  }

  protected onArchiveChanged(): void {
    this.reloadSessionsAndNotifyWorkSessionChange();
  }

  private reloadSessions(): void {
    const queryParams: SessionQueryParams = {
      sortBy: this.activeSortField(),
      order: this.activeSortDirection(),
      dateFrom: this.currentDateFrom() || undefined,
      dateTo: this.currentDateTo() || undefined,
    };
    this.timeTrackingService.loadSessions(queryParams);
  }

  private reloadSessionsAndNotifyWorkSessionChange(): void {
    this.reloadSessions();
    this.workSessionsChangeVersion.update((version) => version + 1);
  }
}
