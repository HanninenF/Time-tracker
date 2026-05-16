import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { WorkSession } from '../../../models/work-session.model';
import { SortChangeEvent, SortDirection, SortField } from '../../../models/session-query.model';
import { WeeklySummary } from '../../../models/weekly-summary.model';
import { TimeTrackingService } from '../../../services/time-tracking.service';

interface WeekGroup {
  readonly weekStartDate: string;
  readonly weekEndDate: string;
  readonly weeklySummary: WeeklySummary | null;
  readonly sessions: WorkSession[];
}

@Component({
  selector: 'app-sessions-list',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './sessions-list.component.html',
  styleUrl: './sessions-list.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionsListComponent {
  private readonly timeTrackingService = inject(TimeTrackingService);
  private readonly hourlyRateBeforeTax = 190;
  private readonly taxRate = 0.33;

  readonly workSessions = input<WorkSession[]>([]);
  readonly weeklySummaries = input<WeeklySummary[]>([]);
  readonly isLoading = input(false);
  readonly hasError = input(false);
  readonly activeSortField = input.required<SortField>();
  readonly activeSortDirection = input.required<SortDirection>();

  readonly sortChanged = output<SortChangeEvent>();
  readonly editSaved = output<WorkSession>();
  readonly deleteRequested = output<string>();

  protected readonly SortField = SortField;

  protected readonly editingSessionId = signal<string | null>(null);
  protected readonly editDate = signal('');
  protected readonly editHours = signal(0);
  protected readonly editMinutes = signal(0);
  protected readonly selectedWeeklySummaryIds = signal<Set<string>>(new Set());
  protected readonly collapsedWeekStartDates = computed(
    () => new Set(this.timeTrackingService.uiState().collapsedWeekStartDates)
  );
  protected readonly showMoneySummary = computed(() => this.timeTrackingService.uiState().showMoneySummary);
  protected readonly weeklySummaryByWeekStartDate = computed(() => {
    const summariesByWeekStartDate = new Map<string, WeeklySummary>();

    for (const weeklySummary of this.weeklySummaries()) {
      summariesByWeekStartDate.set(weeklySummary.weekStartDate, weeklySummary);
    }

    return summariesByWeekStartDate;
  });
  protected readonly weekGroups = computed<WeekGroup[]>(() => {
    const groupsByWeekStartDate = new Map<string, WeekGroup>();

    for (const workSession of this.workSessions()) {
      const weekStartDate = this.getWeekStartDate(workSession.date);
      const existingGroup = groupsByWeekStartDate.get(weekStartDate);

      if (existingGroup) {
        existingGroup.sessions.push(workSession);
        continue;
      }

      const weeklySummary = this.weeklySummaryByWeekStartDate().get(weekStartDate) ?? null;
      groupsByWeekStartDate.set(weekStartDate, {
        weekStartDate,
        weekEndDate: weeklySummary?.weekEndDate ?? this.getWeekEndDate(weekStartDate),
        weeklySummary,
        sessions: [workSession],
      });
    }

    return Array.from(groupsByWeekStartDate.values());
  });
  protected readonly selectedWeeklyTotalMinutes = computed(() => {
    const selectedIds = this.selectedWeeklySummaryIds();
    if (selectedIds.size === 0) {
      return this.weeklySummaries().reduce((minutesSum, weeklySummary) => minutesSum + weeklySummary.totalMinutes, 0);
    }

    return this.weeklySummaries()
      .filter((weeklySummary) => selectedIds.has(weeklySummary.id))
      .reduce((minutesSum, weeklySummary) => minutesSum + weeklySummary.totalMinutes, 0);
  });
  protected readonly selectedWeeklySummaryCount = computed(() => this.selectedWeeklySummaryIds().size);
  protected readonly selectedWeeklyGrossAmount = computed(() =>
    Math.round((this.selectedWeeklyTotalMinutes() / 60) * this.hourlyRateBeforeTax)
  );
  protected readonly selectedWeeklyNetAmount = computed(() =>
    Math.round(this.selectedWeeklyGrossAmount() * (1 - this.taxRate))
  );

  protected readonly isEmpty = computed(
    () => !this.isLoading() && !this.hasError() && this.workSessions().length === 0
  );

  protected onSortColumnClicked(sortField: SortField): void {
    const currentField = this.activeSortField();
    const currentDirection = this.activeSortDirection();

    const newDirection =
      currentField === sortField && currentDirection === SortDirection.Ascending
        ? SortDirection.Descending
        : currentField === sortField
          ? SortDirection.Ascending
          : SortDirection.Descending;

    this.sortChanged.emit({ sortField, direction: newDirection });
  }

  protected onEditClicked(workSession: WorkSession): void {
    this.editingSessionId.set(workSession.id);
    this.editDate.set(workSession.date);
    this.editHours.set(workSession.totalMinutes !== null ? Math.floor(workSession.totalMinutes / 60) : 0);
    this.editMinutes.set(workSession.totalMinutes !== null ? workSession.totalMinutes % 60 : 0);
  }

  protected onEditSaveClicked(existingSession: WorkSession): void {
    const updatedSession: WorkSession = {
      ...existingSession,
      date: this.editDate(),
      totalMinutes: this.editHours() * 60 + this.editMinutes(),
    };
    this.editSaved.emit(updatedSession);
    this.editingSessionId.set(null);
  }

  protected onEditCancelClicked(): void {
    this.editingSessionId.set(null);
  }

  protected onDeleteClicked(sessionId: string): void {
    this.deleteRequested.emit(sessionId);
  }

  protected toggleWeekCollapsed(weekStartDate: string): void {
    const nextDates = new Set(this.timeTrackingService.uiState().collapsedWeekStartDates);
    if (nextDates.has(weekStartDate)) {
      nextDates.delete(weekStartDate);
    } else {
      nextDates.add(weekStartDate);
    }

    this.timeTrackingService.updateUiState({
      collapsedWeekStartDates: Array.from(nextDates).sort((firstDate, secondDate) =>
        firstDate.localeCompare(secondDate)
      ),
    });
  }

  protected isWeekCollapsed(weekStartDate: string): boolean {
    return this.collapsedWeekStartDates().has(weekStartDate);
  }

  protected toggleMoneySummaryVisible(): void {
    this.timeTrackingService.updateUiState({
      showMoneySummary: !this.showMoneySummary(),
    });
  }

  protected getSortIndicator(sortField: SortField): string {
    if (this.activeSortField() !== sortField) return '';
    return this.activeSortDirection() === SortDirection.Ascending ? ' ↑' : ' ↓';
  }

  protected formatTotalMinutes(totalMinutes: number | null): string {
    if (totalMinutes === null) return 'In progress';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }

  protected formatCurrency(amount: number): string {
    return `${new Intl.NumberFormat('sv-SE', { maximumFractionDigits: 0 }).format(amount)} kr`;
  }

  protected toggleWeeklySummary(weeklySummaryId: string): void {
    this.selectedWeeklySummaryIds.update((currentIds) => {
      const nextIds = new Set(currentIds);
      if (nextIds.has(weeklySummaryId)) {
        nextIds.delete(weeklySummaryId);
      } else {
        nextIds.add(weeklySummaryId);
      }
      return nextIds;
    });
  }

  protected isWeeklySummarySelected(weeklySummaryId: string): boolean {
    return this.selectedWeeklySummaryIds().has(weeklySummaryId);
  }

  protected getWeeklySummaryForSession(sessionId: string): WeeklySummary | null {
    const workSession = this.workSessions().find((session) => session.id === sessionId);
    if (!workSession) {
      return null;
    }

    return this.weeklySummaryByWeekStartDate().get(this.getWeekStartDate(workSession.date)) ?? null;
  }

  private getWeekStartDate(dateString: string): string {
    const date = new Date(`${dateString}T12:00:00`);
    const dayOfWeek = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - dayOfWeek);
    return date.toISOString().split('T')[0];
  }

  private getWeekEndDate(weekStartDate: string): string {
    const date = new Date(`${weekStartDate}T12:00:00`);
    date.setDate(date.getDate() + 6);
    return date.toISOString().split('T')[0];
  }
}
