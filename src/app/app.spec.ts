import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { TimeTrackingService } from './services/time-tracking.service';

describe('App', () => {
  const timeTrackingServiceMock = {
    workSessions: signal([]),
    weeklySummaries: signal([]),
    isLoadingSessions: signal(false),
    hasLoadError: signal(false),
    loadUiState: jasmine.createSpy('loadUiState'),
    loadSessions: jasmine.createSpy('loadSessions'),
    addWorkSession: jasmine.createSpy('addWorkSession'),
    updateWorkSession: jasmine.createSpy('updateWorkSession'),
    deleteWorkSession: jasmine.createSpy('deleteWorkSession'),
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [{ provide: TimeTrackingService, useValue: timeTrackingServiceMock }],
    });
    timeTrackingServiceMock.loadUiState.calls.reset();
    timeTrackingServiceMock.loadSessions.calls.reset();
  });

  it('loads UI state and sessions on init', () => {
    const app = TestBed.runInInjectionContext(() => new App());

    app.ngOnInit();

    expect(timeTrackingServiceMock.loadUiState).toHaveBeenCalledTimes(1);
    expect(timeTrackingServiceMock.loadSessions).toHaveBeenCalledTimes(1);
  });

  it('reloads sessions when archive state changes', () => {
    const app = TestBed.runInInjectionContext(() => new App());

    app.ngOnInit();
    (app as any).onArchiveChanged();

    expect(timeTrackingServiceMock.loadSessions).toHaveBeenCalledTimes(2);
  });
});
