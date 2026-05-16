import { ChangeDetectionStrategy, Component, inject, NgZone, OnDestroy, output, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { WorkSession } from '../../models/work-session.model';
import { TimeTrackingService } from '../../services/time-tracking.service';

@Component({
  selector: 'app-stopwatch',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  templateUrl: './stopwatch.component.html',
  styleUrl: './stopwatch.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StopwatchComponent implements OnDestroy {
  private readonly timeTrackingService = inject(TimeTrackingService);
  private readonly ngZone = inject(NgZone);

  readonly sessionUpdated = output<void>();

  protected readonly isRunning = signal(false);
  protected readonly elapsedDisplayTime = signal('00:00:00');

  private readonly startTimestamp = signal<number | null>(null);
  private activeSession = signal<WorkSession | null>(null);
  private timerIntervalId: ReturnType<typeof setInterval> | null = null;

  ngOnDestroy(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
    }
  }

  protected onStopwatchButtonClicked(): void {
    if (this.isRunning()) {
      this.stopTimer();
    } else {
      this.startTimer();
    }
  }

  private startTimer(): void {
    const now = Date.now();
    const startDate = new Date(now);

    this.startTimestamp.set(now);
    this.isRunning.set(true);

    this.timeTrackingService.addWorkSession(
      {
        date: this.toIsoDateString(startDate),
        startTime: this.toTimeString(startDate),
        stopTime: null,
        totalMinutes: null,
        isManualEntry: false,
      },
      (createdSession) => {
        this.activeSession.set(createdSession);
        this.sessionUpdated.emit();
      }
    );

    this.ngZone.runOutsideAngular(() => {
      this.timerIntervalId = setInterval(() => {
        const start = this.startTimestamp();
        if (start === null) return;

        const elapsedSeconds = Math.floor((Date.now() - start) / 1000);

        this.ngZone.run(() => {
          this.elapsedDisplayTime.set(this.formatSeconds(elapsedSeconds));
        });
      }, 1000);
    });
  }

  private stopTimer(): void {
    if (this.timerIntervalId !== null) {
      clearInterval(this.timerIntervalId);
      this.timerIntervalId = null;
    }

    const start = this.startTimestamp();
    const session = this.activeSession();

    this.isRunning.set(false);
    this.startTimestamp.set(null);
    this.elapsedDisplayTime.set('00:00:00');

    if (start === null || session === null) return;

    const stopDate = new Date();
    const totalMinutes = Math.floor((Date.now() - start) / 60000);

    const completedSession: WorkSession = {
      ...session,
      stopTime: this.toTimeString(stopDate),
      totalMinutes,
    };

    this.timeTrackingService.updateWorkSession(session.id, completedSession, () => {
      this.activeSession.set(null);
      this.sessionUpdated.emit();
    });
  }

  private formatSeconds(totalSeconds: number): string {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${this.pad(hours)}:${this.pad(minutes)}:${this.pad(seconds)}`;
  }

  private toIsoDateString(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private toTimeString(date: Date): string {
    return `${this.pad(date.getHours())}:${this.pad(date.getMinutes())}:${this.pad(date.getSeconds())}`;
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
