const sqlite3 = require("sqlite3").verbose();
const path = require("path");

const dbPath = path.join(__dirname, "../data/app.db");
const db = new sqlite3.Database(dbPath);

// Initialize tables
db.serialize(() => {
  // Table for uploaded files
  db.run(`
    CREATE TABLE IF NOT EXISTS uploads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      voucher_id TEXT,
      request_number TEXT,
      customerledger_id TEXT,
      net_pay TEXT,
      payee_address TEXT,
      bank_name TEXT,
      account_number TEXT,
      file_name TEXT
    )
  `);

  // Table for admin users
  db.run(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE,
      password TEXT,
      access_level INTEGER
    )
  `);

  // Table for Tokens
  db.run(`
    CREATE TABLE IF NOT EXISTS tokens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      token TEXT UNIQUE NOT NULL,
      admin_id INTEGER NOT NULL,
      usage_count INTEGER DEFAULT 0,
      max_usage INTEGER NOT NULL,
      FOREIGN KEY (admin_id) REFERENCES admins(id)
    )
  `);

  // Insert default admin
  db.run(
    `INSERT OR IGNORE INTO admins (username, password, access_level) VALUES ('admin', 'admin123', 5)`
  );
});

module.exports = db;
