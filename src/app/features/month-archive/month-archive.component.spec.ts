import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MonthArchiveComponent } from './month-archive.component';
import { TimeTrackingService } from '../../services/time-tracking.service';

describe('MonthArchiveComponent', () => {
  let fixture: ComponentFixture<MonthArchiveComponent>;
  let component: MonthArchiveComponent;

  const timeTrackingServiceMock = {
    archivedMonths: signal([
      {
        id: 'month-1',
        monthKey: '2026-06',
        monthStartDate: '2026-06-01',
        monthEndDate: '2026-06-30',
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ]),
    uiState: signal({
      dailySummaryExpanded: true,
      monthArchiveExpanded: true,
      collapsedWeekStartDates: [],
      showMoneySummary: true,
    }),
    loadArchivedMonths: jasmine.createSpy('loadArchivedMonths'),
    archiveMonth: jasmine.createSpy('archiveMonth'),
    unarchiveMonth: jasmine.createSpy('unarchiveMonth'),
    updateUiState: jasmine.createSpy('updateUiState'),
  };

  beforeEach(async () => {
    timeTrackingServiceMock.loadArchivedMonths.calls.reset();
    timeTrackingServiceMock.archiveMonth.calls.reset();
    timeTrackingServiceMock.unarchiveMonth.calls.reset();

    await TestBed.configureTestingModule({
      imports: [MonthArchiveComponent],
      providers: [{ provide: TimeTrackingService, useValue: timeTrackingServiceMock }],
    }).compileComponents();

    fixture = TestBed.createComponent(MonthArchiveComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('renders archived months and a month picker', () => {
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.month-archive-title')?.textContent).toContain('Archive month');
    expect(compiled.querySelector('input[type="month"]')).toBeTruthy();
    expect(compiled.querySelector('.month-archive-count')?.textContent).toContain('1 archived');
    expect(compiled.querySelector('.month-archive-item strong')?.textContent).toContain('June 2026');
  });

  it('sends archive and restore requests through the service', () => {
    (component as any).monthKey.set('2026-07');
    fixture.detectChanges();

    const archiveButton = fixture.nativeElement.querySelector(
      '.month-archive-controls button'
    ) as HTMLButtonElement;
    archiveButton.click();

    expect(timeTrackingServiceMock.archiveMonth).toHaveBeenCalledWith(
      '2026-07',
      jasmine.any(Function)
    );

    const restoreButton = fixture.nativeElement.querySelector(
      '.month-archive-item button'
    ) as HTMLButtonElement;
    restoreButton.click();

    expect(timeTrackingServiceMock.unarchiveMonth).toHaveBeenCalledWith(
      '2026-06',
      jasmine.any(Function)
    );
  });

  it('toggles collapsed state through ui state updates', () => {
    const toggleButton = fixture.nativeElement.querySelector(
      '.month-archive-section-toggle'
    ) as HTMLButtonElement;
    toggleButton.click();

    expect(timeTrackingServiceMock.updateUiState).toHaveBeenCalledWith({
      monthArchiveExpanded: false,
    });
  });
});
