const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "..", "gym.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open DB:", err.message);
    process.exit(1);
  }
});

function query(sql) {
  return new Promise((resolve, reject) => {
    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

(async () => {
  try {
    const members = await query(
      "SELECT COALESCE(membership_type, 'NULL') AS membership_type, COUNT(*) AS cnt FROM members GROUP BY membership_type ORDER BY cnt DESC",
    );
    console.log("Members:");
    console.table(members);

    const approvals = await query(
      "SELECT COALESCE(membership_type, 'NULL') AS membership_type, COUNT(*) AS cnt FROM approvals GROUP BY membership_type ORDER BY cnt DESC",
    );
    console.log("Approvals:");
    console.table(approvals);
  } catch (err) {
    console.error("Query error:", err.message);
  } finally {
    db.close();
  }
})();
