import { ChangeDetectionStrategy, Component, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { WorkSession } from '../../../models/work-session.model';

@Component({
  selector: 'app-manual-entry',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './manual-entry.component.html',
  styleUrl: './manual-entry.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ManualEntryComponent {
  readonly sessionSaved = output<Omit<WorkSession, 'id'>>();

  protected readonly isFormVisible = signal(false);
  protected readonly entryDate = signal(this.todayDateString());
  protected readonly entryHours = signal(0);
  protected readonly entryMinutes = signal(0);

  protected onToggleFormClicked(): void {
    this.isFormVisible.update((isVisible) => !isVisible);
  }

  protected onSaveClicked(): void {
    this.sessionSaved.emit({
      date: this.entryDate(),
      startTime: null,
      stopTime: null,
      totalMinutes: this.entryHours() * 60 + this.entryMinutes(),
      isManualEntry: true,
    });

    this.entryDate.set(this.todayDateString());
    this.entryHours.set(0);
    this.entryMinutes.set(0);
    this.isFormVisible.set(false);
  }

  protected onDiscardClicked(): void {
    this.entryDate.set(this.todayDateString());
    this.entryHours.set(0);
    this.entryMinutes.set(0);
    this.isFormVisible.set(false);
  }

  private todayDateString(): string {
    return new Date().toISOString().split('T')[0];
  }
}
