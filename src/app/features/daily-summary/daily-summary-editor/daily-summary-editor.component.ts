import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-daily-summary-editor',
  standalone: true,
  imports: [FormsModule, MatButtonModule, MatFormFieldModule, MatIconModule, MatInputModule],
  templateUrl: './daily-summary-editor.component.html',
  styleUrl: './daily-summary-editor.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DailySummaryEditorComponent {
  readonly isEditorVisible = input(false);
  readonly capturedSummaryDate = input<string | null>(null);
  readonly descriptionMarkdown = input('');

  readonly createSummaryClicked = output<void>();
  readonly descriptionMarkdownChanged = output<string>();
  readonly summarySaveRequested = output<string | null>();
  readonly summaryEditCanceled = output<void>();

  protected onCreateSummaryClicked(): void {
    this.createSummaryClicked.emit();
  }

  protected onDescriptionMarkdownChanged(descriptionMarkdown: string): void {
    this.descriptionMarkdownChanged.emit(descriptionMarkdown);
  }

  protected onSaveClicked(): void {
    const trimmedDescriptionMarkdown = this.descriptionMarkdown().trim();
    this.summarySaveRequested.emit(trimmedDescriptionMarkdown || null);
  }

  protected onCancelClicked(): void {
    this.summaryEditCanceled.emit();
  }
}
