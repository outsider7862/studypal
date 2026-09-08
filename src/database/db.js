import * as SQLite from 'expo-sqlite';

let db = null;

export async function getDB() {
  if (!db) {
    db = await SQLite.openDatabaseAsync('studypal.db');
    await initSchema();
  }
  return db;
}

async function initSchema() {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS courses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT,
      instructor TEXT,
      credits INTEGER DEFAULT 3,
      color TEXT NOT NULL,
      semester TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'quiz',
      date TEXT NOT NULL,
      time TEXT DEFAULT '09:00',
      venue TEXT,
      weightage REAL DEFAULT 0,
      notes TEXT,
      completed INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS topics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      event_id INTEGER NOT NULL,
      title TEXT NOT NULL,
      estimated_hours REAL DEFAULT 1,
      completed INTEGER DEFAULT 0,
      order_index INTEGER DEFAULT 0,
      FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    );

    -- Weekly recurring class times for a course (e.g. Mon 09:00–10:00, Room 3).
    -- weekday: 0 = Sunday … 6 = Saturday (JS Date.getDay convention).
    CREATE TABLE IF NOT EXISTS class_schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      course_id INTEGER NOT NULL,
      weekday INTEGER NOT NULL,
      start_time TEXT NOT NULL DEFAULT '09:00',
      end_time TEXT NOT NULL DEFAULT '10:00',
      room TEXT,
      reminder INTEGER DEFAULT 1,
      FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE
    );
  `);
}

// ── Courses ───────────────────────────────────────────────────────────────

export async function getCourses() {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT c.*,
      COUNT(DISTINCT e.id) as event_count,
      COUNT(DISTINCT CASE WHEN e.completed = 0 AND e.date >= date('now') THEN e.id END) as upcoming_count
    FROM courses c
    LEFT JOIN events e ON e.course_id = c.id
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
}

export async function getCourse(id) {
  const db = await getDB();
  return await db.getFirstAsync('SELECT * FROM courses WHERE id = ?', [id]);
}

export async function insertCourse({ name, code, instructor, credits, color, semester }) {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO courses (name, code, instructor, credits, color, semester) VALUES (?, ?, ?, ?, ?, ?)',
    [name, code || '', instructor || '', credits || 3, color, semester || '']
  );
  return result.lastInsertRowId;
}

export async function updateCourse(id, { name, code, instructor, credits, color, semester }) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE courses SET name=?, code=?, instructor=?, credits=?, color=?, semester=? WHERE id=?',
    [name, code || '', instructor || '', credits || 3, color, semester || '', id]
  );
}

export async function deleteCourse(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM courses WHERE id = ?', [id]);
}

// ── Events ─────────────────────────────────────────────────────────────────

export async function getEvents(courseId) {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT e.*,
      COUNT(t.id) as topic_count,
      SUM(t.completed) as topics_done,
      SUM(t.estimated_hours) as total_hours
    FROM events e
    LEFT JOIN topics t ON t.event_id = e.id
    WHERE e.course_id = ?
    GROUP BY e.id
    ORDER BY e.date ASC, e.time ASC
  `, [courseId]);
}

export async function getUpcomingEvents(daysAhead = 30) {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT e.*, c.name as course_name, c.color as course_color, c.code as course_code,
      COUNT(t.id) as topic_count,
      SUM(t.completed) as topics_done
    FROM events e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN topics t ON t.event_id = e.id
    WHERE e.date >= date('now') AND e.date <= date('now', '+${daysAhead} days') AND e.completed = 0
    GROUP BY e.id
    ORDER BY e.date ASC, e.time ASC
  `);
}

export async function getWeekendAlertEvents() {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT e.*, c.name as course_name, c.color as course_color, c.code as course_code
    FROM events e
    JOIN courses c ON c.id = e.course_id
    WHERE e.date >= date('now') AND e.date <= date('now', '+7 days') AND e.completed = 0
    ORDER BY e.date ASC
  `);
}

export async function insertEvent({ courseId, title, type, date, time, venue, weightage, notes }) {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO events (course_id, title, type, date, time, venue, weightage, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [courseId, title, type || 'quiz', date, time || '09:00', venue || '', weightage || 0, notes || '']
  );
  return result.lastInsertRowId;
}

export async function updateEvent(id, { title, type, date, time, venue, weightage, notes, completed }) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE events SET title=?, type=?, date=?, time=?, venue=?, weightage=?, notes=?, completed=? WHERE id=?',
    [title, type, date, time, venue || '', weightage || 0, notes || '', completed ? 1 : 0, id]
  );
}

export async function deleteEvent(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM events WHERE id = ?', [id]);
}

// ── Topics ─────────────────────────────────────────────────────────────────

export async function getTopics(eventId) {
  const db = await getDB();
  return await db.getAllAsync(
    'SELECT * FROM topics WHERE event_id = ? ORDER BY order_index ASC, id ASC',
    [eventId]
  );
}

export async function insertTopic({ eventId, title, estimatedHours, orderIndex }) {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO topics (event_id, title, estimated_hours, order_index) VALUES (?, ?, ?, ?)',
    [eventId, title, estimatedHours || 1, orderIndex || 0]
  );
  return result.lastInsertRowId;
}

export async function toggleTopic(id, completed) {
  const db = await getDB();
  await db.runAsync('UPDATE topics SET completed = ? WHERE id = ?', [completed ? 1 : 0, id]);
}

export async function deleteTopic(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM topics WHERE id = ?', [id]);
}

export async function getTopicsForAlerts() {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT t.*, e.title as event_title, e.date as event_date, e.type as event_type,
           c.name as course_name, c.color as course_color
    FROM topics t
    JOIN events e ON e.id = t.event_id
    JOIN courses c ON c.id = e.course_id
    WHERE e.date >= date('now') AND e.date <= date('now', '+7 days') AND e.completed = 0
    ORDER BY e.date ASC
  `);
}

// Get a single event with course info
export async function getEventWithCourse(eventId) {
  const db = await getDB();
  return await db.getFirstAsync(
    `SELECT e.*, c.name as course_name, c.color as course_color, c.id as course_id,
            c.code as course_code, c.instructor as course_instructor, c.credits as course_credits
     FROM events e JOIN courses c ON c.id = e.course_id WHERE e.id = ?`,
    [eventId]
  );
}

// Every event with course info — used by the calendar so past & completed
// events (and events any distance in the future) all show up on their day.
export async function getAllEventsWithCourse() {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT e.*, c.name as course_name, c.color as course_color, c.code as course_code,
      COUNT(t.id) as topic_count,
      SUM(t.completed) as topics_done
    FROM events e
    JOIN courses c ON c.id = e.course_id
    LEFT JOIN topics t ON t.event_id = e.id
    GROUP BY e.id
    ORDER BY e.date ASC, e.time ASC
  `);
}

// ── Class schedules ──────────────────────────────────────────────────────────

export async function getClassSchedules(courseId) {
  const db = await getDB();
  return await db.getAllAsync(
    'SELECT * FROM class_schedules WHERE course_id = ? ORDER BY weekday ASC, start_time ASC',
    [courseId]
  );
}

// All class slots joined with their course, for the weekly timetable grid.
export async function getAllClassSchedules() {
  const db = await getDB();
  return await db.getAllAsync(`
    SELECT s.*, c.name as course_name, c.code as course_code, c.color as course_color
    FROM class_schedules s
    JOIN courses c ON c.id = s.course_id
    ORDER BY s.weekday ASC, s.start_time ASC
  `);
}

export async function insertClassSchedule({ courseId, weekday, startTime, endTime, room, reminder }) {
  const db = await getDB();
  const result = await db.runAsync(
    'INSERT INTO class_schedules (course_id, weekday, start_time, end_time, room, reminder) VALUES (?, ?, ?, ?, ?, ?)',
    [courseId, weekday, startTime || '09:00', endTime || '10:00', room || '', reminder === 0 ? 0 : 1]
  );
  return result.lastInsertRowId;
}

export async function updateClassSchedule(id, { weekday, startTime, endTime, room, reminder }) {
  const db = await getDB();
  await db.runAsync(
    'UPDATE class_schedules SET weekday=?, start_time=?, end_time=?, room=?, reminder=? WHERE id=?',
    [weekday, startTime || '09:00', endTime || '10:00', room || '', reminder === 0 ? 0 : 1, id]
  );
}

export async function deleteClassSchedule(id) {
  const db = await getDB();
  await db.runAsync('DELETE FROM class_schedules WHERE id = ?', [id]);
}
