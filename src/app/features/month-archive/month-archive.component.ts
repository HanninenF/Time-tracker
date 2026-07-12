import { ChangeDetectionStrategy, Component, OnInit, computed, inject, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { TimeTrackingService } from '../../services/time-tracking.service';

@Component({
  selector: 'app-month-archive',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './month-archive.component.html',
  styleUrl: './month-archive.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MonthArchiveComponent implements OnInit {
  private readonly timeTrackingService = inject(TimeTrackingService);

  readonly archiveChanged = output<void>();

  protected readonly isSectionExpanded = computed(
    () => this.timeTrackingService.uiState().monthArchiveExpanded
  );
  protected readonly monthKey = signal(this.getCurrentMonthKey());
  protected readonly archivedMonths = this.timeTrackingService.archivedMonths;

  ngOnInit(): void {
    this.timeTrackingService.loadArchivedMonths(() => {});
  }

  protected toggleSectionExpanded(): void {
    this.timeTrackingService.updateUiState({
      monthArchiveExpanded: !this.isSectionExpanded(),
    });
  }

  protected onArchiveClicked(): void {
    const monthKey = this.monthKey();
    if (!monthKey) return;

    this.timeTrackingService.archiveMonth(monthKey, (archivedMonth) => {
      if (!archivedMonth) return;
      this.archiveChanged.emit();
    });
  }

  protected onUnarchiveClicked(monthKey: string): void {
    this.timeTrackingService.unarchiveMonth(monthKey, () => {
      this.archiveChanged.emit();
    });
  }

  protected formatMonthLabel(monthKey: string): string {
    const [year, month] = monthKey.split('-').map((part) => Number(part));
    const date = new Date(year, month - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  private getCurrentMonthKey(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return `${year}-${month}`;
  }
}
