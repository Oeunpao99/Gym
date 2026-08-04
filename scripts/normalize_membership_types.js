const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const dbPath = path.join(__dirname, "..", "gym.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Failed to open DB:", err.message);
    process.exit(1);
  }
});

const updates = [
  "UPDATE members SET membership_type = '1M' WHERE membership_type IN ('1 Month', '1 month', 'One Month', '1Mo', '1mo')",
  "UPDATE members SET membership_type = '3M' WHERE membership_type IN ('3 Months', '3 months', '3Ms', '3Ms Premium', '3M Premium')",
  "UPDATE members SET membership_type = '6M' WHERE membership_type IN ('6 Months', '6 months', '6Ms')",
  "UPDATE members SET membership_type = '1Y' WHERE membership_type IN ('1 Year', '1 year', '12M', '12 Months', '12 months')",
  "UPDATE members SET membership_type = 'Free' WHERE LOWER(COALESCE(membership_type, '')) IN ('free', 'complimentary')",
  "UPDATE approvals SET membership_type = '1M' WHERE membership_type IN ('1 Month', '1 month', 'One Month', '1Mo', '1mo')",
  "UPDATE approvals SET membership_type = '3M' WHERE membership_type IN ('3 Months', '3 months', '3Ms', '3Ms Premium', '3M Premium')",
  "UPDATE approvals SET membership_type = '6M' WHERE membership_type IN ('6 Months', '6 months', '6Ms')",
  "UPDATE approvals SET membership_type = '1Y' WHERE membership_type IN ('1 Year', '1 year', '12M', '12 Months', '12 months', 'Annual')",
];

function runSql(sql) {
  return new Promise((resolve, reject) => {
    db.run(sql, function (err) {
      if (err) reject(err);
      else resolve(this.changes);
    });
  });
}

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
    console.log("Running normalization updates...");
    for (const s of updates) {
      const changes = await runSql(s).catch((e) => {
        console.error("Update error:", e.message);
        return 0;
      });
      console.log(`Applied: ${s} -> ${changes} rows changed`);
    }

    const m = await query(
      "SELECT COALESCE(membership_type, 'NULL') AS membership_type, COUNT(*) AS cnt FROM members GROUP BY membership_type ORDER BY cnt DESC",
    );
    console.log("\nMembers after normalization:");
    console.table(m);

    const a = await query(
      "SELECT COALESCE(membership_type, 'NULL') AS membership_type, COUNT(*) AS cnt FROM approvals GROUP BY membership_type ORDER BY cnt DESC",
    );
    console.log("\nApprovals after normalization:");
    console.table(a);
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    db.close();
  }
})();
