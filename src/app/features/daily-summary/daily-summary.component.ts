import { ChangeDetectionStrategy, Component, computed, effect, inject, input, OnInit, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WorkSession } from '../../models/work-session.model';
import { WorkDaySummary } from '../../models/work-day-summary.model';
import { TimeTrackingService } from '../../services/time-tracking.service';
import { DailySummaryEditorComponent } from './daily-summary-editor/daily-summary-editor.component';
import { SavedDailySummaryComponent } from './saved-daily-summary/saved-daily-summary.component';

@Component({
  selector: 'app-daily-summary',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, DailySummaryEditorComponent, SavedDailySummaryComponent],
  templateUrl: './daily-summary.component.html',
  styleUrl: './daily-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailySummaryComponent implements OnInit {
  private readonly timeTrackingService = inject(TimeTrackingService);

  readonly workSessionsChangeVersion = input(0);

  protected readonly isSectionExpanded = computed(() => this.timeTrackingService.uiState().dailySummaryExpanded);
  protected readonly isEditorVisible = signal(false);
  protected readonly capturedSummaryDate = signal<string | null>(null);
  protected readonly savedWorkDaySummaries = signal<WorkDaySummary[]>([]);
  protected readonly workSessionsByDate = signal<Record<string, WorkSession[]>>({});
  protected readonly draftDescriptionMarkdown = signal('');

  constructor() {
    effect(() => {
      this.workSessionsChangeVersion();
      const capturedDate = this.capturedSummaryDate();

      this.loadSavedWorkDaySummaries();
      if (capturedDate !== null) {
        this.loadWorkSessionsForDate(capturedDate);
      }
    });
  }

  ngOnInit(): void {
    const capturedDate = this.toLocalIsoDateString(new Date());

    this.capturedSummaryDate.set(capturedDate);
    this.loadSavedWorkDaySummaries();
  }

  protected onCreateSummaryClicked(): void {
    const capturedDate = this.toLocalIsoDateString(new Date());

    this.capturedSummaryDate.set(capturedDate);
    this.draftDescriptionMarkdown.set('');
    this.timeTrackingService.updateUiState({ dailySummaryExpanded: true });
    this.isEditorVisible.set(true);
    this.loadWorkSessionsForDate(capturedDate);
    this.timeTrackingService.loadWorkDaySummary(capturedDate, (summary) => {
      this.draftDescriptionMarkdown.set(summary?.descriptionMarkdown ?? '');
    });
  }

  protected onDescriptionMarkdownChanged(descriptionMarkdown: string): void {
    this.draftDescriptionMarkdown.set(descriptionMarkdown);
  }

  protected onSummarySaveRequested(): void {
    const capturedDate = this.capturedSummaryDate();
    if (capturedDate === null) return;

    const trimmedDescriptionMarkdown = this.draftDescriptionMarkdown().trim();
    const descriptionMarkdown = trimmedDescriptionMarkdown || null;

    this.timeTrackingService.saveWorkDaySummary(capturedDate, descriptionMarkdown, (summary) => {
      this.upsertSavedWorkDaySummary(summary);
      this.isEditorVisible.set(false);
      this.loadWorkSessionsForDate(capturedDate);
    });
  }

  protected onSummaryEditCanceled(): void {
    this.isEditorVisible.set(false);
  }

  protected onSummaryEditRequested(summary: WorkDaySummary): void {
    this.capturedSummaryDate.set(summary.date);
    this.draftDescriptionMarkdown.set(summary.descriptionMarkdown ?? '');
    this.timeTrackingService.updateUiState({ dailySummaryExpanded: true });
    this.isEditorVisible.set(true);
    this.loadWorkSessionsForDate(summary.date);
  }

  protected onSummaryDeleteRequested(date: string): void {
    this.timeTrackingService.deleteWorkDaySummary(date, () => {
      this.savedWorkDaySummaries.update((summaries) =>
        summaries.filter((summary) => summary.date !== date)
      );
      this.workSessionsByDate.update((sessionsByDate) => {
        const updatedSessionsByDate = { ...sessionsByDate };
        delete updatedSessionsByDate[date];
        return updatedSessionsByDate;
      });
      this.draftDescriptionMarkdown.set('');
    });
  }

  protected getWorkSessionsForDate(date: string): WorkSession[] {
    return this.workSessionsByDate()[date] ?? [];
  }

  protected toggleSectionExpanded(): void {
    this.timeTrackingService.updateUiState({
      dailySummaryExpanded: !this.isSectionExpanded(),
    });
  }

  private loadSavedWorkDaySummaries(): void {
    this.timeTrackingService.loadWorkDaySummaries((summaries) => {
      this.savedWorkDaySummaries.set(summaries);
      this.workSessionsByDate.update((sessionsByDate) => {
        const allowedDates = new Set(summaries.map((summary) => summary.date));
        const nextSessionsByDate: Record<string, WorkSession[]> = {};

        for (const [date, sessions] of Object.entries(sessionsByDate)) {
          if (allowedDates.has(date) || date === this.capturedSummaryDate()) {
            nextSessionsByDate[date] = sessions;
          }
        }

        return nextSessionsByDate;
      });
      summaries.forEach((summary) => this.loadWorkSessionsForDate(summary.date));
    });
  }

  private loadWorkSessionsForDate(date: string): void {
    this.timeTrackingService.loadWorkSessionsForDate(date, (sessions) => {
      this.workSessionsByDate.update((sessionsByDate) => ({
        ...sessionsByDate,
        [date]: sessions.filter((session) => session.date === date),
      }));
    });
  }

  private upsertSavedWorkDaySummary(savedSummary: WorkDaySummary): void {
    this.savedWorkDaySummaries.update((summaries) => {
      const existingSummaryIndex = summaries.findIndex((summary) => summary.date === savedSummary.date);

      if (existingSummaryIndex === -1) {
        return [...summaries, savedSummary].sort((firstSummary, secondSummary) =>
          secondSummary.date.localeCompare(firstSummary.date)
        );
      }

      return summaries.map((summary) => (summary.date === savedSummary.date ? savedSummary : summary));
    });
  }

  private toLocalIsoDateString(date: Date): string {
    const year = date.getFullYear();
    const month = this.padDatePart(date.getMonth() + 1);
    const day = this.padDatePart(date.getDate());
    return `${year}-${month}-${day}`;
  }

  private padDatePart(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
