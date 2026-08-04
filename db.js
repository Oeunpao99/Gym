const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const dbFile = process.env.DB_PATH || path.join(__dirname, "gym.db");
fs.mkdirSync(path.dirname(dbFile), { recursive: true });
const db = new sqlite3.Database(dbFile);

function ensureColumn(table, column, definition) {
  db.run(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`, (err) => {
    if (err && !/duplicate column name/i.test(err.message)) {
      console.error(`Failed to add ${table}.${column}:`, err.message);
    }
  });
}

function seedMembershipType(name, days, price, description) {
  db.run(
    `INSERT INTO membership_types (name, duration_days, price, description)
     SELECT ?, ?, ?, ?
     WHERE NOT EXISTS (SELECT 1 FROM membership_types WHERE name = ?)`,
    [name, days, price, description, name],
  );
}

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS members (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_code TEXT,
    name TEXT,
    email TEXT,
    phone TEXT,
    membership_type TEXT,
    join_date TEXT,
    expiry_date TEXT,
    days_left INTEGER,
    status TEXT,
    remarks TEXT,
    photo_url TEXT,
    branch TEXT,
    promotion_id INTEGER,
    promotion_applied TEXT
  )`);

  ensureColumn("members", "member_code", "TEXT");
  ensureColumn("members", "photo_url", "TEXT");
  ensureColumn("members", "branch", "TEXT");
  ensureColumn("members", "promotion_id", "INTEGER");
  ensureColumn("members", "promotion_applied", "TEXT");

  // Insert a sample member if table empty
  db.get("SELECT COUNT(*) as cnt FROM members", (err, row) => {
    if (!err && row && row.cnt === 0) {
      const stmt = db.prepare(
        "INSERT INTO members (member_code, name, email, phone, membership_type, join_date, expiry_date, days_left, status, remarks, photo_url, branch) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      );
      stmt.run(
        "PS-0001",
        "John Smith",
        "john@email.com",
        "(555) 111-2222",
        "1Y",
        "2026-01-15",
        "2027-01-14",
        307,
        "Active",
        "VIP Member",
        "",
        "Downtown",
      );
      stmt.run(
        "PS-0002",
        "Sarah Johnson",
        "sarah@email.com",
        "(555) 333-4444",
        "3M",
        "2026-03-01",
        "2026-05-30",
        78,
        "Active",
        "",
        "",
        "Uptown",
      );
      stmt.finalize();
    }
  });

  db.run(`CREATE TABLE IF NOT EXISTS approvals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    name TEXT,
    email TEXT,
    phone TEXT,
    request_type TEXT,
    membership_type TEXT,
    date TEXT,
    branch TEXT,
    status TEXT,
    photo_url TEXT,
    promotion_id INTEGER,
    promotion_applied TEXT
  )`);

  ensureColumn("approvals", "member_id", "INTEGER");
  ensureColumn("approvals", "email", "TEXT");
  ensureColumn("approvals", "phone", "TEXT");
  ensureColumn("approvals", "photo_url", "TEXT");
  ensureColumn("approvals", "promotion_id", "INTEGER");
  ensureColumn("approvals", "promotion_applied", "TEXT");

  db.run(`CREATE TABLE IF NOT EXISTS renewals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    member_code TEXT,
    photo_url TEXT,
    request_date TEXT,
    processed_date TEXT,
    status TEXT,
    bonus_days INTEGER,
    remarks TEXT,
    previous_end_date TEXT,
    new_end_date TEXT,
    promotion_applied TEXT,
    promotion_id INTEGER,
    membership_type TEXT,
    approved_by TEXT,
    branch TEXT
  )`);

  ensureColumn("renewals", "previous_end_date", "TEXT");
  ensureColumn("renewals", "new_end_date", "TEXT");
  ensureColumn("renewals", "promotion_applied", "TEXT");
  ensureColumn("renewals", "promotion_id", "INTEGER");
  ensureColumn("renewals", "membership_type", "TEXT");
  ensureColumn("renewals", "approved_by", "TEXT");
  ensureColumn("renewals", "branch", "TEXT");
  ensureColumn("renewals", "member_code", "TEXT");
  ensureColumn("renewals", "photo_url", "TEXT");

  db.run(`CREATE TABLE IF NOT EXISTS membership_types (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    duration_days INTEGER,
    price REAL,
    description TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS branches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT,
    name TEXT,
    address TEXT,
    phone TEXT
  )`);

  ensureColumn("branches", "code", "TEXT");

  db.run(`CREATE TABLE IF NOT EXISTS promotions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    promotion_code TEXT,
    promotion_name TEXT,
    base_duration_value INTEGER,
    base_duration_unit TEXT,
    extra_duration_value INTEGER,
    extra_duration_unit TEXT,
    package_price REAL,
    applicable_membership_type TEXT,
    usage_limit INTEGER,
    used_count INTEGER DEFAULT 0,
    status TEXT,
    title TEXT,
    discount TEXT,
    start_date TEXT,
    end_date TEXT,
    applicable TEXT,
    usage_count INTEGER DEFAULT 0
  )`);

  ensureColumn("promotions", "promotion_code", "TEXT");
  ensureColumn("promotions", "promotion_name", "TEXT");
  ensureColumn("promotions", "base_duration_value", "INTEGER");
  ensureColumn("promotions", "base_duration_unit", "TEXT");
  ensureColumn("promotions", "extra_duration_value", "INTEGER");
  ensureColumn("promotions", "extra_duration_unit", "TEXT");
  ensureColumn("promotions", "package_price", "REAL");
  ensureColumn("promotions", "applicable_membership_type", "TEXT");
  ensureColumn("promotions", "usage_limit", "INTEGER");
  ensureColumn("promotions", "used_count", "INTEGER DEFAULT 0");
  ensureColumn("promotions", "status", "TEXT");

  db.run(`CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT,
    period_start TEXT,
    period_end TEXT,
    generated_at TEXT,
    data TEXT
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS walkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    phone TEXT,
    time TEXT,
    purpose TEXT,
    status TEXT,
    converted INTEGER DEFAULT 0
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    member_id INTEGER,
    member_code TEXT,
    scanned_at TEXT,
    branch TEXT,
    result TEXT,
    notes TEXT
  )`);

  // Seed a few simple rows for other tables if empty
  db.get("SELECT COUNT(*) as cnt FROM branches", (err, row) => {
    if (!err && row && row.cnt === 0) {
      const s = db.prepare(
        "INSERT INTO branches (code, name, address, phone) VALUES (?, ?, ?, ?)",
      );
      s.run("BR-001", "Downtown", "123 Main St", "(555) 000-1111");
      s.run("BR-002", "Uptown", "456 High St", "(555) 222-3333");
      s.run("BR-003", "Westside", "789 West Ave", "(555) 444-5555");
      s.finalize();
    }
  });

  db.get("SELECT COUNT(*) as cnt FROM membership_types", (err, row) => {
    if (!err && row && row.cnt === 0) {
      const s = db.prepare(
        "INSERT INTO membership_types (name, duration_days, price, description) VALUES (?, ?, ?, ?)",
      );
      s.run("1M", 30, 29.99, "1 month membership");
      s.run("3M", 90, 79.99, "3 months membership");
      s.run("6M", 180, 149.99, "6 months membership");
      s.run("1Y", 365, 249.99, "12 months membership");
      s.run("Free", 30, 0, "Complimentary membership");
      s.finalize();
    } else {
      seedMembershipType("6M", 180, 149.99, "6 months membership");
      seedMembershipType("1Y", 365, 249.99, "12 months membership");
      seedMembershipType("Free", 30, 0, "Complimentary membership");
    }
  });

  db.run(
    "UPDATE members SET member_code = 'PS-' || printf('%04d', id) WHERE member_code IS NULL OR member_code = ''",
  );
  db.run(
    "UPDATE members SET branch = 'Downtown' WHERE branch IS NULL OR branch = ''",
  );
  db.run(
    "UPDATE members SET membership_type = '1Y' WHERE membership_type = 'Annual'",
  );
  // Normalize legacy membership labels to compact codes
  db.run(
    "UPDATE members SET membership_type = '1M' WHERE membership_type IN ('1 Month', '1 month', 'One Month', '1Mo', '1mo')",
  );
  db.run(
    "UPDATE members SET membership_type = '3M' WHERE membership_type IN ('3 Months', '3 months', '3Ms', '3Ms Premium', '3M Premium')",
  );
  db.run(
    "UPDATE members SET membership_type = '6M' WHERE membership_type IN ('6 Months', '6 months', '6Ms')",
  );
  db.run(
    "UPDATE members SET membership_type = '1Y' WHERE membership_type IN ('1 Year', '1 year', '12M', '12 Months', '12 months')",
  );
  db.run(
    "UPDATE members SET membership_type = 'Free' WHERE LOWER(COALESCE(membership_type, '')) IN ('free', 'complimentary')",
  );
  // Also normalize membership_type fields in approvals table
  db.run(
    "UPDATE approvals SET membership_type = '1M' WHERE membership_type IN ('1 Month', '1 month', 'One Month', '1Mo', '1mo')",
  );
  db.run(
    "UPDATE approvals SET membership_type = '3M' WHERE membership_type IN ('3 Months', '3 months', '3Ms', '3Ms Premium', '3M Premium')",
  );
  db.run(
    "UPDATE approvals SET membership_type = '6M' WHERE membership_type IN ('6 Months', '6 months', '6Ms')",
  );
  db.run(
    "UPDATE approvals SET membership_type = '1Y' WHERE membership_type IN ('1 Year', '1 year', '12M', '12 Months', '12 months', 'Annual')",
  );
  db.run("UPDATE members SET status = 'Expire' WHERE status = 'Expired'");
  db.run("UPDATE renewals SET status = 'Renewing' WHERE status = 'requested'");
  db.run("UPDATE renewals SET status = 'Approved' WHERE status = 'processed'");
  db.run(
    "UPDATE promotions SET promotion_code = 'PROMO-' || printf('%04d', id) WHERE promotion_code IS NULL OR promotion_code = ''",
  );
  db.run(
    "UPDATE promotions SET promotion_name = title WHERE (promotion_name IS NULL OR promotion_name = '') AND title IS NOT NULL AND title != ''",
  );
  db.run(
    "UPDATE promotions SET base_duration_unit = 'months' WHERE base_duration_unit IS NULL OR base_duration_unit = ''",
  );
  db.run(
    "UPDATE promotions SET extra_duration_unit = 'months' WHERE extra_duration_unit IS NULL OR extra_duration_unit = ''",
  );
  db.run(
    "UPDATE promotions SET used_count = COALESCE(used_count, usage_count, 0)",
  );
  db.run(
    "UPDATE promotions SET usage_limit = COALESCE(usage_limit, 0)",
  );
  db.run(
    "UPDATE promotions SET status = 'Inactive' WHERE status IS NULL OR status = ''",
  );
  db.run(
    `UPDATE renewals
     SET member_code = (
       SELECT member_code FROM members WHERE members.id = renewals.member_id
     )
     WHERE member_id IS NOT NULL
       AND (member_code IS NULL OR member_code = '')`,
  );
  db.run(
    `UPDATE renewals
     SET photo_url = (
       SELECT photo_url FROM members WHERE members.id = renewals.member_id
     )
     WHERE member_id IS NOT NULL
       AND (photo_url IS NULL OR photo_url = '')`,
  );
  db.run(
    `UPDATE renewals
     SET branch = (
       SELECT branch FROM members WHERE members.id = renewals.member_id
     )
     WHERE member_id IS NOT NULL
       AND (branch IS NULL OR branch = '')`,
  );
  db.run(
    `UPDATE members
     SET status = 'Renewing'
     WHERE id IN (
       SELECT member_id FROM renewals WHERE status = 'Renewing'
     )`,
  );
  db.run(
    "UPDATE branches SET code = 'BR-' || printf('%03d', id) WHERE code IS NULL OR code = ''",
  );
  db.run(
    `INSERT INTO approvals (
       member_id,
       name,
       email,
       phone,
       request_type,
       membership_type,
       date,
       branch,
       status,
       photo_url
     )
     SELECT
       m.id,
       m.name,
       m.email,
       m.phone,
       'New Member',
       m.membership_type,
       COALESCE(NULLIF(m.join_date, ''), date('now')),
       m.branch,
       'Pending for Approval',
       m.photo_url
     FROM members m
     WHERE LOWER(COALESCE(m.status, '')) LIKE '%pending%'
       AND NOT EXISTS (
         SELECT 1 FROM approvals a WHERE a.member_id = m.id
       )`,
  );
});

module.exports = db;
