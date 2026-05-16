'use strict';

const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const { randomUUID } = require('crypto');

const PORT = 58291;
const DATABASE_FILE_PATH = path.join(__dirname, 'time-tracker.db');
const STATIC_FILES_PATH = path.join(__dirname, 'dist', 'time-tracker', 'browser');

const app = express();
const database = new Database(DATABASE_FILE_PATH);

database.exec(`
  CREATE TABLE IF NOT EXISTS work_sessions (
    id          TEXT    PRIMARY KEY,
    date        TEXT    NOT NULL,
    start_time  TEXT,
    stop_time   TEXT,
    total_minutes INTEGER NOT NULL DEFAULT 0,
    is_manual_entry INTEGER NOT NULL DEFAULT 0
  )
`);

database.exec(`
  CREATE TABLE IF NOT EXISTS work_day_summaries (
    id                   TEXT PRIMARY KEY,
    date                 TEXT NOT NULL UNIQUE,
    work_session_ids     TEXT NOT NULL,
    description_markdown TEXT,
    created_at           TEXT NOT NULL,
    updated_at           TEXT NOT NULL
  )
`);

database.exec(`
  CREATE TABLE IF NOT EXISTS weekly_summaries (
    id                        TEXT PRIMARY KEY,
    week_start_date           TEXT NOT NULL UNIQUE,
    week_end_date             TEXT NOT NULL,
    total_minutes             INTEGER NOT NULL,
    anchor_session_id         TEXT NOT NULL,
    anchor_session_date       TEXT NOT NULL,
    anchor_session_start_time  TEXT,
    created_at                TEXT NOT NULL,
    updated_at                TEXT NOT NULL
  )
`);

database.exec(`
  CREATE TABLE IF NOT EXISTS app_settings (
    setting_key TEXT PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`);

app.use(express.json());
app.use(express.static(STATIC_FILES_PATH));

const ALLOWED_SORT_COLUMNS = {
  date: 'date',
  workedTime: 'total_minutes',
};

const DEFAULT_UI_STATE = {
  dailySummaryExpanded: true,
  collapsedWeekStartDates: [],
  showMoneySummary: true,
};

function formatIsoDate(date) {
  return date.toISOString().split('T')[0];
}

function getWeekStartDate(dateString) {
  const date = new Date(`${dateString}T12:00:00`);
  const dayOfWeek = (date.getDay() + 6) % 7;
  date.setDate(date.getDate() - dayOfWeek);
  return formatIsoDate(date);
}

function getWeekEndDate(weekStartDate) {
  const date = new Date(`${weekStartDate}T12:00:00`);
  date.setDate(date.getDate() + 6);
  return formatIsoDate(date);
}

function compareWeeklyAnchorCandidates(candidateRow, currentRow) {
  if (candidateRow.date !== currentRow.date) {
    return candidateRow.date.localeCompare(currentRow.date);
  }

  return candidateRow.rowid - currentRow.rowid;
}

function mapRowToWorkSession(row) {
  return {
    id: row.id,
    date: row.date,
    startTime: row.start_time ?? null,
    stopTime: row.stop_time ?? null,
    totalMinutes: (row.stop_time !== null || row.is_manual_entry === 1) ? row.total_minutes : null,
    isManualEntry: row.is_manual_entry === 1,
  };
}

function mapRowToWorkDaySummary(row) {
  return {
    id: row.id,
    date: row.date,
    workSessionIds: JSON.parse(row.work_session_ids),
    descriptionMarkdown: row.description_markdown ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapRowToWeeklySummary(row) {
  return {
    id: row.id,
    weekStartDate: row.week_start_date,
    weekEndDate: row.week_end_date,
    totalMinutes: row.total_minutes,
    anchorSessionId: row.anchor_session_id,
    anchorSessionDate: row.anchor_session_date,
    anchorSessionStartTime: row.anchor_session_start_time ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function readUiState() {
  const row = database.prepare('SELECT setting_value FROM app_settings WHERE setting_key = ?').get('ui-state');
  if (!row) {
    return DEFAULT_UI_STATE;
  }

  try {
    const parsedState = JSON.parse(row.setting_value);
    return {
      dailySummaryExpanded:
        typeof parsedState.dailySummaryExpanded === 'boolean'
          ? parsedState.dailySummaryExpanded
          : DEFAULT_UI_STATE.dailySummaryExpanded,
      collapsedWeekStartDates: Array.isArray(parsedState.collapsedWeekStartDates)
        ? parsedState.collapsedWeekStartDates.filter((value) => typeof value === 'string')
        : DEFAULT_UI_STATE.collapsedWeekStartDates,
      showMoneySummary:
        typeof parsedState.showMoneySummary === 'boolean'
          ? parsedState.showMoneySummary
          : DEFAULT_UI_STATE.showMoneySummary,
    };
  } catch {
    return DEFAULT_UI_STATE;
  }
}

function saveUiState(nextState) {
  const now = new Date().toISOString();
  database
    .prepare(`
      INSERT INTO app_settings (setting_key, setting_value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(setting_key) DO UPDATE SET
        setting_value = excluded.setting_value,
        updated_at = excluded.updated_at
    `)
    .run('ui-state', JSON.stringify(nextState), now);
}

function rebuildWeeklySummaries() {
  const sessionRows = database
    .prepare('SELECT rowid, id, date, start_time, total_minutes FROM work_sessions')
    .all();

  const summariesByWeekStart = new Map();

  for (const row of sessionRows) {
    const weekStartDate = getWeekStartDate(row.date);
    const currentSummary = summariesByWeekStart.get(weekStartDate) ?? {
      totalMinutes: 0,
      anchorSessionRow: row,
    };

    currentSummary.totalMinutes += row.total_minutes ?? 0;

    if (compareWeeklyAnchorCandidates(row, currentSummary.anchorSessionRow) > 0) {
      currentSummary.anchorSessionRow = row;
    }

    summariesByWeekStart.set(weekStartDate, currentSummary);
  }

  const now = new Date().toISOString();
  const insertWeeklySummary = database.prepare(`
    INSERT INTO weekly_summaries (
      id,
      week_start_date,
      week_end_date,
      total_minutes,
      anchor_session_id,
      anchor_session_date,
      anchor_session_start_time,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const rebuildTransaction = database.transaction(() => {
    database.prepare('DELETE FROM weekly_summaries').run();

    for (const [weekStartDate, summary] of summariesByWeekStart.entries()) {
      insertWeeklySummary.run(
        randomUUID(),
        weekStartDate,
        getWeekEndDate(weekStartDate),
        summary.totalMinutes,
        summary.anchorSessionRow.id,
        summary.anchorSessionRow.date,
        summary.anchorSessionRow.start_time ?? null,
        now,
        now
      );
    }
  });

  rebuildTransaction();
}

app.get('/api/sessions', (req, res) => {
  const { sortBy = 'date', order = 'desc', dateFrom, dateTo } = req.query;

  const sortColumn = ALLOWED_SORT_COLUMNS[sortBy] ?? 'date';
  const sortOrder = order === 'asc' ? 'ASC' : 'DESC';

  const conditions = [];
  const queryParams = [];

  if (dateFrom) {
    conditions.push('date >= ?');
    queryParams.push(dateFrom);
  }
  if (dateTo) {
    conditions.push('date <= ?');
    queryParams.push(dateTo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const orderClause =
    sortColumn === 'date'
      ? `${sortColumn} ${sortOrder}, rowid ${sortOrder}`
      : `${sortColumn} ${sortOrder}, date DESC, rowid DESC`;
  const sql = `SELECT * FROM work_sessions ${whereClause} ORDER BY ${orderClause}`;

  const rows = database.prepare(sql).all(...queryParams);
  res.json(rows.map(mapRowToWorkSession));
});

app.post('/api/sessions', (req, res) => {
  const { date, startTime, stopTime, totalMinutes, isManualEntry } = req.body;
  const newSessionId = randomUUID();

  database.prepare(`
    INSERT INTO work_sessions (id, date, start_time, stop_time, total_minutes, is_manual_entry)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(newSessionId, date, startTime ?? null, stopTime ?? null, totalMinutes ?? 0, isManualEntry ? 1 : 0);

  rebuildWeeklySummaries();
  const createdRow = database.prepare('SELECT * FROM work_sessions WHERE id = ?').get(newSessionId);
  res.status(201).json(mapRowToWorkSession(createdRow));
});

app.put('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;
  const { date, startTime, stopTime, totalMinutes, isManualEntry } = req.body;

  const existingRow = database.prepare('SELECT id FROM work_sessions WHERE id = ?').get(sessionId);
  if (!existingRow) {
    return res.status(404).json({ error: 'Session not found' });
  }

  database.prepare(`
    UPDATE work_sessions
    SET date = ?, start_time = ?, stop_time = ?, total_minutes = ?, is_manual_entry = ?
    WHERE id = ?
  `).run(date, startTime ?? null, stopTime ?? null, totalMinutes, isManualEntry ? 1 : 0, sessionId);

  rebuildWeeklySummaries();
  const updatedRow = database.prepare('SELECT * FROM work_sessions WHERE id = ?').get(sessionId);
  res.json(mapRowToWorkSession(updatedRow));
});

app.delete('/api/sessions/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const existingRow = database.prepare('SELECT id FROM work_sessions WHERE id = ?').get(sessionId);
  if (!existingRow) {
    return res.status(404).json({ error: 'Session not found' });
  }

  database.prepare('DELETE FROM work_sessions WHERE id = ?').run(sessionId);
  rebuildWeeklySummaries();
  res.status(204).send();
});

app.get('/api/work-day-summaries', (_req, res) => {
  const rows = database.prepare('SELECT * FROM work_day_summaries ORDER BY date DESC').all();
  res.json(rows.map(mapRowToWorkDaySummary));
});

app.get('/api/work-day-summaries/:date', (req, res) => {
  const { date } = req.params;
  const row = database.prepare('SELECT * FROM work_day_summaries WHERE date = ?').get(date);

  if (!row) {
    return res.status(404).json({ error: 'Work day summary not found' });
  }

  res.json(mapRowToWorkDaySummary(row));
});

app.put('/api/work-day-summaries/:date', (req, res) => {
  const { date } = req.params;
  const { descriptionMarkdown } = req.body;

  const matchingSessionRows = database
    .prepare('SELECT id FROM work_sessions WHERE date = ? ORDER BY start_time ASC NULLS LAST')
    .all(date);
  const workSessionIds = matchingSessionRows.map((row) => row.id);
  const now = new Date().toISOString();
  const existingRow = database.prepare('SELECT id, created_at FROM work_day_summaries WHERE date = ?').get(date);

  if (existingRow) {
    database.prepare(`
      UPDATE work_day_summaries
      SET work_session_ids = ?, description_markdown = ?, updated_at = ?
      WHERE date = ?
    `).run(JSON.stringify(workSessionIds), descriptionMarkdown ?? null, now, date);
  } else {
    database.prepare(`
      INSERT INTO work_day_summaries
        (id, date, work_session_ids, description_markdown, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(randomUUID(), date, JSON.stringify(workSessionIds), descriptionMarkdown ?? null, now, now);
  }

  const savedRow = database.prepare('SELECT * FROM work_day_summaries WHERE date = ?').get(date);
  res.json(mapRowToWorkDaySummary(savedRow));
});

app.delete('/api/work-day-summaries/:date', (req, res) => {
  const { date } = req.params;

  const existingRow = database.prepare('SELECT id FROM work_day_summaries WHERE date = ?').get(date);
  if (!existingRow) {
    return res.status(404).json({ error: 'Work day summary not found' });
  }

  database.prepare('DELETE FROM work_day_summaries WHERE date = ?').run(date);
  res.status(204).send();
});

app.get('/api/weekly-summaries', (_req, res) => {
  const rows = database.prepare('SELECT * FROM weekly_summaries ORDER BY week_start_date DESC').all();
  res.json(rows.map(mapRowToWeeklySummary));
});

app.get('/api/ui-state', (_req, res) => {
  res.json(readUiState());
});

app.put('/api/ui-state', (req, res) => {
  const currentState = readUiState();
  const { dailySummaryExpanded, collapsedWeekStartDates, showMoneySummary } = req.body ?? {};

  const nextState = {
    dailySummaryExpanded:
      typeof dailySummaryExpanded === 'boolean'
        ? dailySummaryExpanded
        : currentState.dailySummaryExpanded,
    collapsedWeekStartDates: Array.isArray(collapsedWeekStartDates)
      ? collapsedWeekStartDates.filter((value) => typeof value === 'string')
      : currentState.collapsedWeekStartDates,
    showMoneySummary:
      typeof showMoneySummary === 'boolean'
        ? showMoneySummary
        : currentState.showMoneySummary,
  };

  saveUiState(nextState);
  res.json(nextState);
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(STATIC_FILES_PATH, 'index.html'));
});

rebuildWeeklySummaries();

app.listen(PORT, () => {
  console.log(`Time Tracker running at http://localhost:${PORT}`);
  console.log(`Database: ${DATABASE_FILE_PATH}`);
});
