import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SessionFilter } from '../../../models/session-query.model';

@Component({
  selector: 'app-session-filter',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './session-filter.component.html',
  styleUrl: './session-filter.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SessionFilterComponent {
  readonly filterApplied = output<SessionFilter>();
  readonly filterCleared = output<void>();

  protected readonly dateFrom = signal('');
  protected readonly dateTo = signal('');

  protected readonly hasActiveFilter = () => !!this.dateFrom() || !!this.dateTo();

  protected onApplyClicked(): void {
    this.filterApplied.emit({
      dateFrom: this.dateFrom(),
      dateTo: this.dateTo(),
    });
  }

  protected onClearClicked(): void {
    this.dateFrom.set('');
    this.dateTo.set('');
    this.filterCleared.emit();
  }
}
