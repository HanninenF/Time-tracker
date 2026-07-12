'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { before, after, beforeEach, test } = require('node:test');

const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'time-tracker-server-'));
const tempDbPath = path.join(tempDir, 'time-tracker.db');
const tempStaticPath = path.join(tempDir, 'static');
fs.mkdirSync(tempStaticPath, { recursive: true });

process.env.TIME_TRACKER_DB_PATH = tempDbPath;
process.env.TIME_TRACKER_STATIC_PATH = tempStaticPath;

const server = require('../server');

const { database } = server;

function insertSession({ id, date, totalMinutes, isManualEntry = 0, startTime = null, stopTime = null }) {
  database
    .prepare(
      `INSERT INTO work_sessions (id, date, start_time, stop_time, total_minutes, is_manual_entry)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, date, startTime, stopTime, totalMinutes, isManualEntry);
}

function insertWorkDaySummary({ id, date, workSessionIds, descriptionMarkdown = null }) {
  const now = new Date('2026-07-12T00:00:00.000Z').toISOString();
  database
    .prepare(
      `INSERT INTO work_day_summaries
       (id, date, work_session_ids, description_markdown, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?)`
    )
    .run(id, date, JSON.stringify(workSessionIds), descriptionMarkdown, now, now);
}

function resetDatabase() {
  database.exec(`
    DELETE FROM weekly_summaries;
    DELETE FROM work_day_summaries;
    DELETE FROM work_sessions;
    DELETE FROM archived_months;
    DELETE FROM app_settings;
  `);
}

before(() => {
  resetDatabase();
});

beforeEach(() => {
  resetDatabase();
});

after(() => {
  database.close();
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('archives a full month and filters it out of sessions, summaries, and weekly totals', () => {
  insertSession({
    id: 'session-june-1',
    date: '2026-06-10',
    startTime: '08:00:00',
    stopTime: '10:00:00',
    totalMinutes: 120,
  });
  insertSession({
    id: 'session-june-2',
    date: '2026-06-18',
    startTime: '11:00:00',
    stopTime: '12:30:00',
    totalMinutes: 90,
  });
  insertSession({
    id: 'session-july-1',
    date: '2026-07-03',
    startTime: '09:00:00',
    stopTime: '10:00:00',
    totalMinutes: 60,
  });

  insertWorkDaySummary({
    id: 'summary-june',
    date: '2026-06-10',
    workSessionIds: ['session-june-1'],
    descriptionMarkdown: 'June summary',
  });
  insertWorkDaySummary({
    id: 'summary-july',
    date: '2026-07-03',
    workSessionIds: ['session-july-1'],
    descriptionMarkdown: 'July summary',
  });

  server.rebuildWeeklySummaries();
  server.archiveMonth('2026-06');

  assert.equal(server.isDateArchived('2026-06-15'), true);
  assert.equal(server.isDateArchived('2026-07-15'), false);
  assert.equal(server.getMonthStartDate('2026-06'), '2026-06-01');
  assert.equal(server.getMonthEndDate('2026-06'), '2026-06-30');

  assert.deepEqual(
    server.selectVisibleSessions({ sortBy: 'date', order: 'desc' }).map((session) => session.id),
    ['session-july-1']
  );

  assert.deepEqual(
    server.selectVisibleWorkDaySummaries().map((summary) => summary.id),
    ['summary-july']
  );

  const weeklySummaries = database
    .prepare('SELECT week_start_date, total_minutes FROM weekly_summaries ORDER BY week_start_date')
    .all();

  assert.deepEqual(weeklySummaries, [
    {
      week_start_date: '2026-06-29',
      total_minutes: 60,
    },
  ]);
});

test('unarchives a month and makes its sessions visible again', () => {
  insertSession({
    id: 'session-june-1',
    date: '2026-06-10',
    startTime: '08:00:00',
    stopTime: '10:00:00',
    totalMinutes: 120,
  });
  server.archiveMonth('2026-06');

  assert.equal(server.unarchiveMonth('2026-06'), true);
  assert.deepEqual(
    server.selectVisibleSessions({ sortBy: 'date', order: 'desc' }).map((session) => session.id),
    ['session-june-1']
  );
});
