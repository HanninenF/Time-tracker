import { ChangeDetectionStrategy, Component, computed, input, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownComponent } from 'ngx-markdown';
import { WorkSession } from '../../../models/work-session.model';
import { WorkDaySummary } from '../../../models/work-day-summary.model';

@Component({
  selector: 'app-saved-daily-summary',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MarkdownComponent],
  templateUrl: './saved-daily-summary.component.html',
  styleUrl: './saved-daily-summary.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SavedDailySummaryComponent {
  readonly workDaySummary = input.required<WorkDaySummary>();
  readonly capturedDateWorkSessions = input.required<WorkSession[]>();
  readonly editRequested = output<WorkDaySummary>();
  readonly deleteRequested = output<string>();

  protected readonly isDailySummaryExpanded = signal(false);
  protected readonly isMarkdownSummaryExpanded = signal(false);
  protected readonly totalWorkedTimeDisplay = computed(() => {
    const totalMinutes = this.capturedDateWorkSessions().reduce(
      (minutesSum, workSession) => minutesSum + (workSession.totalMinutes ?? 0),
      0,
    );

    return this.formatTotalMinutes(totalMinutes);
  });

  protected toggleDailySummary(): void {
    this.isDailySummaryExpanded.update((isExpanded) => !isExpanded);
  }

  protected toggleMarkdownSummary(): void {
    this.isMarkdownSummaryExpanded.update((isExpanded) => !isExpanded);
  }

  protected onDeleteClicked(): void {
    this.deleteRequested.emit(this.workDaySummary().date);
  }

  protected onEditClicked(): void {
    this.editRequested.emit(this.workDaySummary());
  }

  protected formatTotalMinutes(totalMinutes: number | null): string {
    if (totalMinutes === null) return 'In progress';
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours}h ${minutes}m`;
  }
}
