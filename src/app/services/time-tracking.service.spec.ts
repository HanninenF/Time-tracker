import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TimeTrackingService } from './time-tracking.service';

describe('TimeTrackingService archive methods', () => {
  let service: TimeTrackingService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [TimeTrackingService],
    });

    service = TestBed.inject(TimeTrackingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('loads archived months into the signal', () => {
    const onComplete = jasmine.createSpy('onComplete');

    service.loadArchivedMonths(onComplete);

    const request = httpMock.expectOne('/api/archived-months');
    expect(request.request.method).toBe('GET');
    request.flush([
      {
        id: 'month-1',
        monthKey: '2026-06',
        monthStartDate: '2026-06-01',
        monthEndDate: '2026-06-30',
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ]);

    expect(service.archivedMonths().map((month) => month.monthKey)).toEqual(['2026-06']);
    expect(onComplete).toHaveBeenCalledWith([
      {
        id: 'month-1',
        monthKey: '2026-06',
        monthStartDate: '2026-06-01',
        monthEndDate: '2026-06-30',
        createdAt: '2026-07-12T00:00:00.000Z',
        updatedAt: '2026-07-12T00:00:00.000Z',
      },
    ]);
  });

  it('adds and removes archived months through the API', () => {
    service.archiveMonth('2026-07', () => {});

    const postRequest = httpMock.expectOne('/api/archived-months');
    expect(postRequest.request.method).toBe('POST');
    expect(postRequest.request.body).toEqual({ monthKey: '2026-07' });
    postRequest.flush({
      id: 'month-2',
      monthKey: '2026-07',
      monthStartDate: '2026-07-01',
      monthEndDate: '2026-07-31',
      createdAt: '2026-07-12T00:00:00.000Z',
      updatedAt: '2026-07-12T00:00:00.000Z',
    });

    expect(service.archivedMonths().map((month) => month.monthKey)).toEqual(['2026-07']);

    service.unarchiveMonth('2026-07', () => {});

    const deleteRequest = httpMock.expectOne('/api/archived-months/2026-07');
    expect(deleteRequest.request.method).toBe('DELETE');
    deleteRequest.flush(null, { status: 204, statusText: 'No Content' });

    expect(service.archivedMonths()).toEqual([]);
  });
});
