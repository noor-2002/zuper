
// const sqlite3 = require('sqlite3').verbose();
// const path = require('path');

import path from 'path';
import sqlite3 from 'sqlite3';

sqlite3.verbose();

import { dirname } from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create or connect to the database
const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error connecting to the database:', err);
        return;
    }
    console.log('Connected to the SQLite database.');
});

// Create tables

db.serialize(() => {
    db.run(`
    CREATE TABLE IF NOT EXISTS users (
      user_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      total_points INTEGER DEFAULT 0,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS activity (
      act_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      desc TEXT,
      points INTEGER NOT NULL
    )
  `);

    db.run(`
    CREATE TABLE IF NOT EXISTS completion_activity (
      ca_id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      act_id INTEGER NOT NULL,
      points_earned INTEGER NOT NULL,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (user_id),
      FOREIGN KEY (act_id) REFERENCES activity (act_id)
    )
  `);
});


// Close the database connection when the app terminates
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            console.error('Error closing the database:', err);
            return;
        }
        console.log('Database connection closed.');
        process.exit(0);
    });
});

// module.exports = db
export default db;

