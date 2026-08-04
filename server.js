const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const os = require("os");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json({ limit: "10mb" }));
// Serve static files from project root so index.html is reachable
app.use(express.static(path.join(__dirname)));

const MEMBER_STATUS = {
  ACTIVE: "Active",
  PENDING: "Pending for Approval",
  EXPIRE: "Expire",
  RENEWING: "Renewing",
};

const RENEWAL_STATUS = {
  RENEWING: "Renewing",
  APPROVED: "Approved",
};

const USERS = [
  {
    username: "branch1",
    password: "branch123",
    name: "Downtown Manager",
    role: "Branch Manager",
    branch: "Downtown",
  },
  {
    username: "branch2",
    password: "branch123",
    name: "Uptown Manager",
    role: "Branch Manager",
    branch: "Uptown",
  },
  {
    username: "headoffice",
    password: "head123",
    name: "Head Office",
    role: "Head Office",
    branch: "Head Office",
  },
  {
    username: "ceo",
    password: "ceo123",
    name: "CEO",
    role: "CEO",
    branch: "All Branches",
  },
];

function publicUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

function getRequestUser(req) {
  const username = req.get("X-User") || "";
  const user = USERS.find((item) => item.username === username);
  return user || null;
}

function canApprove(user) {
  return user && ["Head Office", "CEO"].includes(user.role);
}

function requireApprover(req, res) {
  const user = getRequestUser(req);
  if (!canApprove(user)) {
    res.status(403).json({ error: "Head Office approval is required" });
    return null;
  }
  return user;
}

function applyBranchScope(req, filters, params, column = "branch") {
  const user = getRequestUser(req);
  if (user && user.role === "Branch Manager") {
    filters.push(`${column} = ?`);
    params.push(user.branch);
  }
  return user;
}

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  const user = USERS.find(
    (item) => item.username === username && item.password === password,
  );

  if (!user) return res.status(401).json({ error: "Invalid login" });
  res.json(publicUser(user));
});

function getLanAddress() {
  const interfaces = os.networkInterfaces();
  for (const details of Object.values(interfaces)) {
    for (const item of details || []) {
      if (item.family === "IPv4" && !item.internal) {
        return item.address;
      }
    }
  }
  return "localhost";
}

app.get("/api/app-info", (req, res) => {
  const port = process.env.PORT || 3000;
  const host = req.get("host");
  const origin = `${req.protocol}://${host}`;
  const lanUrl = `http://${getLanAddress()}:${port}`;
  res.json({
    origin,
    lan_url: lanUrl,
    card_base_url: `${lanUrl}/card-view.html`,
  });
});

const tvClients = new Map();

function normalizeBranchName(branch) {
  return String(branch || "Front Desk").trim() || "Front Desk";
}

function tvBranchKey(branch) {
  return normalizeBranchName(branch).toLowerCase();
}

function writeTvEvent(res, event, payload) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function broadcastTvScan(branch, payload) {
  const clients = tvClients.get(tvBranchKey(branch));
  if (!clients || !clients.size) return;
  for (const res of clients) {
    writeTvEvent(res, "scan", payload);
  }
}

function makeTvPayload({
  checkinId,
  member,
  memberCode,
  scannedAt,
  branch,
  result,
  notes,
}) {
  const normalizedMember = member ? normalizeMemberLifecycle(member) : null;
  const safeBranch = normalizeBranchName(branch);
  const safeMemberCode =
    memberCode ||
    normalizedMember?.member_code ||
    (normalizedMember ? makeMemberCode(normalizedMember.id) : "");

  return {
    scan: {
      id: checkinId || null,
      member_id: normalizedMember?.id || null,
      member_code: safeMemberCode,
      scanned_at: scannedAt,
      branch: safeBranch,
      result,
      notes,
    },
    member: normalizedMember
      ? {
          ...normalizedMember,
          member_code: normalizedMember.member_code || safeMemberCode,
        }
      : null,
  };
}

function tvPayloadFromRow(row) {
  if (!row) return null;
  const member = row.member_row_id
    ? {
        id: row.member_row_id,
        member_code: row.member_member_code || row.scan_member_code,
        name: row.name,
        email: row.email,
        phone: row.phone,
        membership_type: row.membership_type,
        join_date: row.join_date,
        expiry_date: row.expiry_date,
        days_left: row.days_left,
        status: row.status,
        remarks: row.remarks,
        photo_url: row.photo_url,
        branch: row.member_branch,
      }
    : null;

  return makeTvPayload({
    checkinId: row.checkin_id,
    member,
    memberCode: row.scan_member_code,
    scannedAt: row.scanned_at,
    branch: row.scan_branch,
    result: row.result,
    notes: row.notes,
  });
}

function makeMemberCode(id) {
  return `PS-${String(id || 0).padStart(4, "0")}`;
}

function toDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function daysBetween(fromDate, toDate) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.ceil((toDate - fromDate) / dayMs);
}

function normalizeScanCode(raw) {
  let value = String(raw || "").trim();
  if (!value) return "";

  try {
    const parsed = JSON.parse(value);
    value =
      parsed.member_code ||
      parsed.card_number ||
      parsed.code ||
      parsed.id ||
      value;
  } catch (_err) {
    // The scanner may return plain text, a member code, or a URL.
  }

  try {
    const url = new URL(String(value), "http://localhost");
    value =
      url.searchParams.get("code") ||
      url.searchParams.get("member_code") ||
      url.searchParams.get("id") ||
      value;
  } catch (_err) {
    // Keep the original scanner payload.
  }

  const codeMatch = String(value).match(/PS-\d+/i);
  if (codeMatch) return codeMatch[0].toUpperCase();
  return String(value).trim();
}

function findMemberByScanCode(raw, callback) {
  const code = normalizeScanCode(raw);
  if (!code) return callback(null, null, "");

  const idFromCode = code.match(/^PS-0*(\d+)$/i);
  const numericId = /^\d+$/.test(code)
    ? Number(code)
    : idFromCode
      ? Number(idFromCode[1])
      : null;

  db.get(
    `SELECT * FROM members
     WHERE UPPER(member_code) = UPPER(?)
        OR (? IS NOT NULL AND id = ?)`,
    [code, numericId, numericId],
    (err, row) => callback(err, row, code),
  );
}

function memberScanStatus(member) {
  const today = new Date(toDateOnly(new Date()));
  const expiry = member.expiry_date ? new Date(member.expiry_date) : null;
  const isExpired = expiry && expiry < today;
  const status = String(member.status || "").toLowerCase();
  const isExpiringSoon = status.includes("expiring");
  const isActive =
    (status.includes("active") || isExpiringSoon) &&
    !status.includes("inactive");

  if (!isActive) {
    return {
      can_scan: false,
      result: "blocked",
      message: `Member status is ${member.status || "not active"}.`,
    };
  }

  if (isExpired) {
    return {
      can_scan: false,
      result: "expired",
      message: "Membership is expired.",
    };
  }

  return {
    can_scan: true,
    result: "allowed",
    message: "Active membership verified.",
  };
}

function normalizeMemberLifecycle(member) {
  if (!member) return member;

  const normalized = { ...member };
  const status = String(normalized.status || "").toLowerCase();
  const isPendingOrRenewing =
    status.includes("pending") || status.includes("renew");
  const rawDaysLeft = Number(normalized.days_left);
  if (Number.isFinite(rawDaysLeft) && rawDaysLeft < 0) {
    normalized.days_left = 0;
    if (!isPendingOrRenewing) {
      normalized.status = MEMBER_STATUS.EXPIRE;
    }
  }

  if (!normalized.expiry_date) return normalized;

  const today = new Date(toDateOnly(new Date()));
  const expiry = new Date(normalized.expiry_date);
  if (Number.isNaN(expiry.getTime())) return normalized;
  const isExpired = expiry < today;

  normalized.days_left = Math.max(0, daysBetween(today, expiry));

  if (isExpired && !isPendingOrRenewing) {
    normalized.status = MEMBER_STATUS.EXPIRE;
    normalized.days_left = 0;
  } else if (!isPendingOrRenewing) {
    if (normalized.days_left <= 7) {
      normalized.status = "Expiring Soon";
    } else if (status.includes("expire")) {
      // If expiry is in the future again, avoid showing stale expired status.
      normalized.status = MEMBER_STATUS.ACTIVE;
    }
  }

  return normalized;
}

function csvEscape(value) {
  const text = String(value ?? "");
  if (/[",\n\r]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function parseDateOnly(value) {
  if (!value) return null;
  const match = String(value).slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const date = new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDateOnly(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysInUtcMonth(year, monthIndex) {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
}

function addDuration(date, value, unit) {
  const amount = Number(value) || 0;
  const normalizedUnit = String(unit || "days").toLowerCase();
  const next = new Date(date.getTime());

  if (normalizedUnit.startsWith("month")) {
    const originalDay = next.getUTCDate();
    const targetMonth = next.getUTCMonth() + amount;
    next.setUTCDate(1);
    next.setUTCMonth(targetMonth);
    next.setUTCDate(
      Math.min(
        originalDay,
        daysInUtcMonth(next.getUTCFullYear(), next.getUTCMonth()),
      ),
    );
    return next;
  }

  if (normalizedUnit.startsWith("year")) {
    const originalDay = next.getUTCDate();
    next.setUTCDate(1);
    next.setUTCFullYear(next.getUTCFullYear() + amount);
    next.setUTCDate(
      Math.min(
        originalDay,
        daysInUtcMonth(next.getUTCFullYear(), next.getUTCMonth()),
      ),
    );
    return next;
  }

  next.setUTCDate(next.getUTCDate() + amount);
  return next;
}

function durationFromMembership(membershipType, durationDays) {
  const code = String(membershipType || "").trim().toUpperCase();
  const months = code.match(/^(\d+)M$/);
  const years = code.match(/^(\d+)Y$/);
  if (months) return { value: Number(months[1]), unit: "months" };
  if (years) return { value: Number(years[1]), unit: "years" };
  return { value: Number(durationDays) || 30, unit: "days" };
}

function promotionDisplayName(promo) {
  if (!promo) return "";
  const code = promo.promotion_code || `PROMO-${promo.id}`;
  const name = promo.promotion_name || promo.title || "Promotion";
  return `${code} - ${name}`;
}

function normalizePromotion(promo) {
  if (!promo) return promo;
  const normalized = { ...promo };
  normalized.promotion_code =
    normalized.promotion_code || (normalized.id ? `PROMO-${normalized.id}` : "");
  normalized.promotion_name = normalized.promotion_name || normalized.title || "";
  normalized.base_duration_unit =
    normalized.base_duration_unit || "months";
  normalized.extra_duration_unit =
    normalized.extra_duration_unit || "months";
  normalized.used_count =
    Number(normalized.used_count ?? normalized.usage_count) || 0;
  normalized.usage_limit = Number(normalized.usage_limit) || 0;
  const today = parseDateOnly(toDateOnly(new Date()));
  const end = parseDateOnly(normalized.end_date);
  if (
    String(normalized.status || "").toLowerCase() === "active" &&
    end &&
    today &&
    end < today
  ) {
    normalized.status = "Expired";
  }
  return normalized;
}

function membershipMatchesPromotion(promo, membershipType) {
  const applicable =
    promo.applicable_membership_type || promo.applicable || "";
  const normalizedApplicable = String(applicable).trim();
  const selectedPackage = String(membershipType || "").trim();
  if (!normalizedApplicable || /^(all|any|yes)$/i.test(normalizedApplicable)) {
    return true;
  }
  if (!selectedPackage) return true;
  const matchesExplicitPackage = normalizedApplicable
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .includes(selectedPackage.toLowerCase());
  if (matchesExplicitPackage) return true;

  const requiredDuration = durationFromMembership(selectedPackage, 0);
  return (
    Number(promo.base_duration_value) === Number(requiredDuration.value) &&
    String(promo.base_duration_unit || "months")
      .toLowerCase()
      .startsWith(String(requiredDuration.unit || "").slice(0, -1))
  );
}

function promotionIsSelectable(promo, membershipType, selectedDate) {
  const normalized = normalizePromotion(promo);
  if (String(normalized.status || "").toLowerCase() !== "active") return false;
  if (!membershipMatchesPromotion(normalized, membershipType)) return false;

  const asOf = parseDateOnly(selectedDate) || parseDateOnly(toDateOnly(new Date()));
  const start = parseDateOnly(normalized.start_date);
  const end = parseDateOnly(normalized.end_date);
  if (start && asOf && asOf < start) return false;
  if (end && asOf && asOf > end) return false;

  const limit = Number(normalized.usage_limit) || 0;
  const used = Number(normalized.used_count) || 0;
  if (limit > 0 && used >= limit) return false;
  return true;
}

async function loadValidPromotion(promotionId, membershipType, selectedDate) {
  if (!promotionId) return null;
  const promo = normalizePromotion(
    await getAsync("SELECT * FROM promotions WHERE id = ?", [promotionId]),
  );
  if (!promo) {
    const err = new Error("Promotion not found");
    err.status = 404;
    throw err;
  }
  if (!promotionIsSelectable(promo, membershipType, selectedDate)) {
    const err = new Error(
      "Promotion is not active, not in date range, usage-limited, or not applicable to this package",
    );
    err.status = 400;
    throw err;
  }
  return promo;
}

function calculateEndDate(startDateValue, packageDuration, promo) {
  const start = parseDateOnly(startDateValue) || parseDateOnly(toDateOnly(new Date()));
  let end = addDuration(start, packageDuration.value, packageDuration.unit);
  if (promo) {
    end = addDuration(
      end,
      promo.extra_duration_value || 0,
      promo.extra_duration_unit || "days",
    );
  }
  return formatDateOnly(end);
}

function currentDaysLeft(endDateValue) {
  const today = parseDateOnly(toDateOnly(new Date()));
  const expiry = parseDateOnly(endDateValue);
  if (!today || !expiry) return 0;
  return Math.max(0, daysBetween(today, expiry));
}

// Get all members
app.get("/api/members", (req, res) => {
  const filters = [];
  const params = [];
  const { branch, status, membership_type, search } = req.query;
  const user = getRequestUser(req);
  const today = toDateOnly(new Date());

  if (branch) {
    filters.push("branch = ?");
    params.push(branch);
  }
  if (status) {
    const normalizedStatus = String(status).toLowerCase();
    if (normalizedStatus.includes("expire")) {
      filters.push(
        "(LOWER(COALESCE(status, '')) LIKE '%expire%' OR (expiry_date IS NOT NULL AND date(expiry_date) < date(?)))",
      );
      params.push(today);
    } else if (normalizedStatus.includes("active")) {
      filters.push(
        "(LOWER(COALESCE(status, '')) LIKE '%active%' AND (expiry_date IS NULL OR date(expiry_date) >= date(?)))",
      );
      params.push(today);
    } else {
      filters.push("status = ?");
      params.push(status);
    }
  }
  if (membership_type) {
    filters.push("membership_type = ?");
    params.push(membership_type);
  }
  if (search) {
    filters.push(
      "(name LIKE ? OR email LIKE ? OR phone LIKE ? OR member_code LIKE ?)",
    );
    const like = `%${search}%`;
    params.push(like, like, like, like);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const sql = `SELECT * FROM members ${where} ORDER BY id DESC`;
  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows.map(normalizeMemberLifecycle));
  });
});

// Get member by QR/member code
app.get("/api/members/code/:code", (req, res) => {
  findMemberByScanCode(req.params.code, (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(normalizeMemberLifecycle(row));
  });
});

// Get single member
app.get("/api/members/:id", (req, res) => {
  const sql = "SELECT * FROM members WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) return res.status(404).json({ error: "Not found" });
    res.json(normalizeMemberLifecycle(row));
  });
});

// Get renewal history for a member
app.get("/api/members/:id/renewals", (req, res) => {
  const sql = "SELECT * FROM renewals WHERE member_id = ? ORDER BY id DESC";
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Get member promotions/promotion usage history
app.get("/api/members/:id/promotions", (req, res) => {
  const sql = `SELECT * FROM renewals WHERE member_id = ? AND promotion_applied IS NOT NULL AND promotion_applied != '' ORDER BY processed_date DESC`;
  db.all(sql, [req.params.id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows || []);
  });
});

// Create member
app.post("/api/members", async (req, res) => {
  try {
    const m = req.body;
    const user = getRequestUser(req);
    const isExistingEditRole = canApprove(user);
    const status =
      isExistingEditRole && m.allow_direct_approval
        ? m.status || MEMBER_STATUS.ACTIVE
        : MEMBER_STATUS.PENDING;
    const branch =
      user?.role === "Branch Manager" ? user.branch : m.branch || "Downtown";
    const joinDate = m.join_date || toDateOnly(new Date());
    const membership = await getAsync(
      "SELECT duration_days FROM membership_types WHERE name = ?",
      [m.membership_type],
    );
    const packageDuration = durationFromMembership(
      m.membership_type,
      membership?.duration_days,
    );
    const promotion = await loadValidPromotion(
      m.promotion_id,
      m.membership_type,
      joinDate,
    );
    const expiryDate = calculateEndDate(joinDate, packageDuration, promotion);
    const daysLeft = currentDaysLeft(expiryDate);
    const promotionApplied = promotion ? promotionDisplayName(promotion) : "";

    const result = await runAsync(
      `INSERT INTO members (
         member_code, name, email, phone, membership_type, join_date,
         expiry_date, days_left, status, remarks, photo_url, branch,
         promotion_id, promotion_applied
       )
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        m.member_code || "",
        m.name,
        m.email,
        m.phone,
        m.membership_type,
        joinDate,
        expiryDate,
        daysLeft,
        status,
        m.remarks || "",
        m.photo_url || "",
        branch,
        promotion?.id || null,
        promotionApplied,
      ],
    );

    const id = result.lastID;
    const memberCode = m.member_code || makeMemberCode(id);
    await runAsync(
      "UPDATE members SET member_code = ?, branch = COALESCE(NULLIF(branch, ''), ?) WHERE id = ?",
      [memberCode, branch, id],
    );

    if (promotion) {
      await runAsync(
        "UPDATE promotions SET used_count = COALESCE(used_count, 0) + 1, usage_count = COALESCE(usage_count, 0) + 1 WHERE id = ?",
        [promotion.id],
      );
    }

    if (String(status).toLowerCase().includes("pending")) {
      await runAsync(
        `INSERT INTO approvals (
           member_id, name, email, phone, request_type, membership_type, date,
           branch, status, photo_url, promotion_id, promotion_applied
         )
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          m.name,
          m.email || "",
          m.phone || "",
          "New Member",
          m.membership_type || "",
          joinDate,
          branch,
          MEMBER_STATUS.PENDING,
          m.photo_url || "",
          promotion?.id || null,
          promotionApplied,
        ],
      );
    }

    const row = await getAsync("SELECT * FROM members WHERE id = ?", [id]);
    res.status(201).json(row);
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Update member
app.put("/api/members/:id", (req, res) => {
  const m = req.body;
  const user = getRequestUser(req);
  const branch = user?.role === "Branch Manager" ? user.branch : m.branch || "";
  const status =
    user?.role === "Branch Manager"
      ? MEMBER_STATUS.PENDING
      : m.status || MEMBER_STATUS.ACTIVE;
  const sql = `UPDATE members SET member_code=?, name=?, email=?, phone=?, membership_type=?, join_date=?, expiry_date=?, days_left=?, status=?, remarks=?, photo_url=?, branch=?, promotion_id=?, promotion_applied=? WHERE id=?`;
  const params = [
    m.member_code || makeMemberCode(req.params.id),
    m.name,
    m.email,
    m.phone,
    m.membership_type,
    m.join_date,
    m.expiry_date,
    m.days_left || 0,
    status,
    m.remarks || "",
    m.photo_url || "",
    branch,
    m.promotion_id || null,
    m.promotion_applied || "",
    req.params.id,
  ];
  db.run(sql, params, function (err) {
    if (err) return res.status(500).json({ error: err.message });
    db.get("SELECT * FROM members WHERE id = ?", [req.params.id], (e, row) => {
      if (e) return res.status(500).json({ error: e.message });
      res.json(row);
    });
  });
});

// Delete member
app.delete("/api/members/:id", (req, res) => {
  db.run("DELETE FROM members WHERE id = ?", [req.params.id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ deleted: this.changes });
  });
});

// Generic helper to register simple CRUD for a table
function registerCrud(name, table, fields) {
  // list
  app.get(`/api/${name}`, (req, res) => {
    const filters = [];
    const params = [];
    if (["approvals", "renewals"].includes(name)) {
      applyBranchScope(req, filters, params);
    }
    if (name === "approvals" && req.query.all !== "1") {
      filters.push("LOWER(COALESCE(status, '')) LIKE '%pending%'");
    }
    if (name === "promotions" && req.query.eligible === "1") {
      filters.push("LOWER(COALESCE(status, '')) = 'active'");
    }
    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
    const sql = `SELECT * FROM ${table} ${where} ORDER BY id DESC`;
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      if (name === "promotions") {
        const promotions = (rows || []).map(normalizePromotion);
        const filtered =
          req.query.eligible === "1"
            ? promotions.filter((promo) =>
                promotionIsSelectable(
                  promo,
                  req.query.membership_type || "",
                  req.query.date || toDateOnly(new Date()),
                ),
              )
            : promotions;
        res.json(filtered);
        return;
      }
      res.json(rows);
    });
  });

  // get
  app.get(`/api/${name}/:id`, (req, res) => {
    db.get(
      `SELECT * FROM ${table} WHERE id = ?`,
      [req.params.id],
      (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!row) return res.status(404).json({ error: "Not found" });
        res.json(name === "promotions" ? normalizePromotion(row) : row);
      },
    );
  });

  // create
  app.post(`/api/${name}`, (req, res) => {
    const user = getRequestUser(req);
    const m = { ...req.body };
    if (user?.role === "Branch Manager" && fields.includes("branch")) {
      m.branch = user.branch;
    }
    if (name === "approvals") {
      m.status = MEMBER_STATUS.PENDING;
    }
    if (name === "renewals") {
      m.status = RENEWAL_STATUS.RENEWING;
      m.processed_date = "";
      m.approved_by = m.approved_by || "";
    }
    if (name === "promotions") {
      m.status = m.status || "Active";
      m.base_duration_unit = m.base_duration_unit || "months";
      m.extra_duration_unit = m.extra_duration_unit || "months";
      m.used_count = Number(m.used_count) || 0;
      m.usage_limit = Number(m.usage_limit) || 0;
    }
    const finishCreate = () => {
      const placeholders = fields.map(() => "?").join(", ");
      const sql = `INSERT INTO ${table} (${fields.join(",")}) VALUES (${placeholders})`;
      const params = fields.map((f) => m[f]);
      db.run(sql, params, function (err) {
        if (err) return res.status(500).json({ error: err.message });
        const insertedId = this.lastID;
        const loadInserted = () => {
          db.get(
            `SELECT * FROM ${table} WHERE id = ?`,
            [insertedId],
            (e, row) => {
              if (e) return res.status(500).json({ error: e.message });
              res.status(201).json(row);
            },
          );
        };

        if (name === "renewals" && m.member_id) {
          db.run(
            "UPDATE members SET status = ? WHERE id = ?",
            [MEMBER_STATUS.RENEWING, m.member_id],
            (memberErr) => {
              if (memberErr)
                return res.status(500).json({ error: memberErr.message });
              loadInserted();
            },
          );
          return;
        }

        db.get(
          `SELECT * FROM ${table} WHERE id = ?`,
          [insertedId],
          (e, row) => {
            if (e) return res.status(500).json({ error: e.message });
            res.status(201).json(
              name === "promotions" ? normalizePromotion(row) : row,
            );
          },
        );
      });
    };

    if (name === "renewals" && m.member_id) {
      db.get(
        "SELECT * FROM members WHERE id = ?",
        [m.member_id],
        (memberErr, member) => {
          if (memberErr)
            return res.status(500).json({ error: memberErr.message });
          if (!member)
            return res.status(404).json({ error: "Member not found" });
          m.member_code =
            m.member_code || member.member_code || makeMemberCode(member.id);
          m.photo_url = m.photo_url || member.photo_url || "";
          m.branch = m.branch || member.branch || "";
          finishCreate();
        },
      );
      return;
    }

    finishCreate();
  });

  // update
  app.put(`/api/${name}/:id`, (req, res) => {
    const m = req.body;
    const updateFields = fields.filter((f) =>
      Object.prototype.hasOwnProperty.call(m, f),
    );
    if (!updateFields.length) {
      return res.status(400).json({ error: "No fields to update" });
    }
    const set = updateFields.map((f) => `${f}=?`).join(",");
    const sql = `UPDATE ${table} SET ${set} WHERE id=?`;
    const params = updateFields.map((f) => m[f]);
    params.push(req.params.id);
    db.run(sql, params, function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.get(
        `SELECT * FROM ${table} WHERE id = ?`,
        [req.params.id],
        (e, row) => {
          if (e) return res.status(500).json({ error: e.message });
          res.json(name === "promotions" ? normalizePromotion(row) : row);
        },
      );
    });
  });

  // delete
  app.delete(`/api/${name}/:id`, (req, res) => {
    db.run(
      `DELETE FROM ${table} WHERE id = ?`,
      [req.params.id],
      function (err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ deleted: this.changes });
      },
    );
  });
}

// Register CRUD endpoints for additional resources
registerCrud("approvals", "approvals", [
  "name",
  "email",
  "phone",
  "request_type",
  "membership_type",
  "date",
  "branch",
  "status",
  "photo_url",
  "promotion_id",
  "promotion_applied",
]);
registerCrud("renewals", "renewals", [
  "member_id",
  "member_code",
  "photo_url",
  "request_date",
  "processed_date",
  "status",
  "bonus_days",
  "remarks",
  "previous_end_date",
  "new_end_date",
  "membership_type",
  "promotion_id",
  "promotion_applied",
  "approved_by",
  "branch",
]);
registerCrud("membership-types", "membership_types", [
  "name",
  "duration_days",
  "price",
  "description",
]);
registerCrud("branches", "branches", ["code", "name", "address", "phone"]);
registerCrud("promotions", "promotions", [
  "promotion_code",
  "promotion_name",
  "base_duration_value",
  "base_duration_unit",
  "extra_duration_value",
  "extra_duration_unit",
  "package_price",
  "start_date",
  "end_date",
  "applicable_membership_type",
  "usage_limit",
  "used_count",
  "status",
]);

app.get("/api/reports/summary", async (req, res) => {
  try {
    const today = toDateOnly(new Date());
    const monthStart = `${today.slice(0, 8)}01`;
    const user = getRequestUser(req);
    const branchScoped = user?.role === "Branch Manager";
    const memberBranchWhere = branchScoped ? " AND branch = ?" : "";
    const memberBranchParams = branchScoped ? [user.branch] : [];
    const scanBranchWhere = branchScoped ? " AND c.branch = ?" : "";
    const scanBranchParams = branchScoped ? [user.branch] : [];
    const [
      total,
      active,
      pending,
      renewing,
      expired,
      expiringSoon,
      scansToday,
      renewalsToday,
      renewalsMonth,
      byMembershipType,
      byBranch,
      recentCheckins,
    ] = await Promise.all([
      getAsync(
        `SELECT COUNT(*) AS count FROM members WHERE 1 = 1${memberBranchWhere}`,
        memberBranchParams,
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM members WHERE LOWER(status) LIKE '%active%' AND (expiry_date IS NULL OR date(expiry_date) >= date(?))${memberBranchWhere}`,
        [today, ...memberBranchParams],
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM members WHERE LOWER(status) LIKE '%pending%'${memberBranchWhere}`,
        memberBranchParams,
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM members WHERE LOWER(status) LIKE '%renewing%'${memberBranchWhere}`,
        memberBranchParams,
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM members WHERE (LOWER(status) LIKE '%expire%' OR (expiry_date IS NOT NULL AND date(expiry_date) < date(?)))${memberBranchWhere}`,
        [today, ...memberBranchParams],
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM members WHERE expiry_date IS NOT NULL AND date(expiry_date) BETWEEN date(?) AND date(?, '+7 days')${memberBranchWhere}`,
        [today, today, ...memberBranchParams],
      ),
      getAsync(
        `SELECT COUNT(*) AS count
         FROM checkins c
         LEFT JOIN members m ON m.id = c.member_id
         WHERE date(c.scanned_at) = date(?)${scanBranchWhere}`,
        [today, ...scanBranchParams],
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM renewals WHERE (date(request_date) = date(?) OR date(processed_date) = date(?))${memberBranchWhere}`,
        [today, today, ...memberBranchParams],
      ),
      getAsync(
        `SELECT COUNT(*) AS count FROM renewals WHERE (date(request_date) >= date(?) OR date(processed_date) >= date(?))${memberBranchWhere}`,
        [monthStart, monthStart, ...memberBranchParams],
      ),
      allAsync(
        `SELECT COALESCE(membership_type, 'Unassigned') AS label, COUNT(*) AS count FROM members WHERE 1 = 1${memberBranchWhere} GROUP BY COALESCE(membership_type, 'Unassigned') ORDER BY count DESC`,
        memberBranchParams,
      ),
      allAsync(
        `SELECT COALESCE(branch, 'Unassigned') AS label, COUNT(*) AS count FROM members WHERE 1 = 1${memberBranchWhere} GROUP BY COALESCE(branch, 'Unassigned') ORDER BY count DESC`,
        memberBranchParams,
      ),
      allAsync(
        `SELECT c.*, m.name, m.membership_type, m.status
         FROM checkins c
         LEFT JOIN members m ON m.id = c.member_id
         WHERE 1 = 1${scanBranchWhere}
         ORDER BY c.id DESC
         LIMIT 10`,
        scanBranchParams,
      ),
    ]);

    res.json({
      total_records: total.count || 0,
      active_members: active.count || 0,
      pending_approvals: pending.count || 0,
      renewing_members: renewing.count || 0,
      expired_members: expired.count || 0,
      expiring_soon: expiringSoon.count || 0,
      scans_today: scansToday.count || 0,
      renewals_today: renewalsToday.count || 0,
      renewals_this_month: renewalsMonth.count || 0,
      by_membership_type: byMembershipType,
      by_branch: byBranch,
      daily_report: {
        date: today,
        by_membership_type: byMembershipType,
        total_active: active.count || 0,
        total_renewal: renewalsToday.count || 0,
        total_expire: expired.count || 0,
      },
      recent_checkins: recentCheckins,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

registerCrud("reports", "reports", [
  "type",
  "period_start",
  "period_end",
  "generated_at",
  "data",
]);
registerCrud("walkins", "walkins", [
  "name",
  "phone",
  "time",
  "purpose",
  "status",
  "converted",
]);

app.get("/api/checkins", (req, res) => {
  const user = getRequestUser(req);
  const branchWhere =
    user?.role === "Branch Manager" ? "WHERE c.branch = ?" : "";
  const params = user?.role === "Branch Manager" ? [user.branch] : [];
  db.all(
    `SELECT c.*, m.name, m.membership_type, m.status, m.photo_url
     FROM checkins c
     LEFT JOIN members m ON m.id = c.member_id
     ${branchWhere}
     ORDER BY c.id DESC
     LIMIT 100`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    },
  );
});

app.get("/api/tv/:branch/latest", (req, res) => {
  const branch = normalizeBranchName(req.params.branch);
  db.get(
    `SELECT
       c.id AS checkin_id,
       c.member_id AS checkin_member_id,
       c.member_code AS scan_member_code,
       c.scanned_at,
       c.branch AS scan_branch,
       c.result,
       c.notes,
       m.id AS member_row_id,
       m.member_code AS member_member_code,
       m.name,
       m.email,
       m.phone,
       m.membership_type,
       m.join_date,
       m.expiry_date,
       m.days_left,
       m.status,
       m.remarks,
       m.photo_url,
       m.branch AS member_branch
     FROM checkins c
     LEFT JOIN members m ON m.id = c.member_id
     WHERE LOWER(COALESCE(c.branch, '')) = LOWER(?)
     ORDER BY c.id DESC
     LIMIT 1`,
    [branch],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(tvPayloadFromRow(row) || { scan: null, member: null });
    },
  );
});

app.get("/api/tv/:branch/stream", (req, res) => {
  const branch = normalizeBranchName(req.params.branch);
  const key = tvBranchKey(branch);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  if (!tvClients.has(key)) tvClients.set(key, new Set());
  tvClients.get(key).add(res);

  writeTvEvent(res, "hello", {
    branch,
    connected_at: new Date().toISOString(),
  });

  const keepAlive = setInterval(() => {
    writeTvEvent(res, "ping", { branch, at: new Date().toISOString() });
  }, 25000);

  req.on("close", () => {
    clearInterval(keepAlive);
    const clients = tvClients.get(key);
    if (!clients) return;
    clients.delete(res);
    if (!clients.size) tvClients.delete(key);
  });
});

app.post("/api/scan", (req, res) => {
  const rawCode = req.body.code;
  const user = getRequestUser(req);
  const branch = normalizeBranchName(
    user?.role === "Branch Manager" ? user.branch : req.body.branch,
  );
  const scannedAt = new Date().toISOString();

  findMemberByScanCode(rawCode, (err, member, normalizedCode) => {
    if (err) return res.status(500).json({ error: err.message });

    if (!member) {
      db.run(
        "INSERT INTO checkins (member_id, member_code, scanned_at, branch, result, notes) VALUES (?, ?, ?, ?, ?, ?)",
        [
          null,
          normalizedCode,
          scannedAt,
          branch,
          "not_found",
          "Member not found",
        ],
        function (insertErr) {
          if (insertErr)
            return res.status(500).json({ error: insertErr.message });
          const payload = makeTvPayload({
            checkinId: this.lastID,
            member: null,
            memberCode: normalizedCode,
            scannedAt,
            branch,
            result: "not_found",
            notes: "Member not found",
          });
          broadcastTvScan(branch, payload);
          res.status(404).json({
            can_scan: false,
            result: "not_found",
            message: "Member code was not found.",
            scanned_at: scannedAt,
            scan: payload.scan,
          });
        },
      );
      return;
    }

    const normalizedMember = normalizeMemberLifecycle(member);
    const scanStatus = memberScanStatus(normalizedMember);
    const memberCode = member.member_code || makeMemberCode(member.id);
    db.run(
      "INSERT INTO checkins (member_id, member_code, scanned_at, branch, result, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [
        member.id,
        memberCode,
        scannedAt,
        branch,
        scanStatus.result,
        scanStatus.message,
      ],
      function (insertErr) {
        if (insertErr)
          return res.status(500).json({ error: insertErr.message });
        const payload = makeTvPayload({
          checkinId: this.lastID,
          member: {
            ...normalizedMember,
            member_code: memberCode,
          },
          memberCode,
          scannedAt,
          branch,
          result: scanStatus.result,
          notes: scanStatus.message,
        });
        broadcastTvScan(branch, payload);
        res.json({
          ...scanStatus,
          scanned_at: scannedAt,
          scan: payload.scan,
          member: {
            ...normalizedMember,
            member_code: memberCode,
          },
        });
      },
    );
  });
});

app.get("/api/export/members.csv", (req, res) => {
  const fields = [
    "member_code",
    "name",
    "email",
    "phone",
    "membership_type",
    "join_date",
    "expiry_date",
    "days_left",
    "status",
    "branch",
    "remarks",
  ];

  const filters = [];
  const params = [];
  applyBranchScope(req, filters, params);
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

  db.all(
    `SELECT ${fields.join(", ")} FROM members ${where} ORDER BY id`,
    params,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      const header = fields.join(",");
      const body = rows
        .map((row) => fields.map((field) => csvEscape(row[field])).join(","))
        .join("\n");
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="gym-members-backup.csv"',
      );
      res.send(`${header}\n${body}`);
    },
  );
});

// Process a renewal and keep the renewal history fields complete.
app.post("/api/renewals/:id/process", async (req, res) => {
  const approver = requireApprover(req, res);
  if (!approver) return;
  try {
    const id = req.params.id;
    const renewal = await getAsync("SELECT * FROM renewals WHERE id = ?", [id]);
    if (!renewal) return res.status(404).json({ error: "Renewal not found" });
    if (!renewal.member_id)
      return res.status(400).json({ error: "Missing member_id" });

    const member = await getAsync("SELECT * FROM members WHERE id = ?", [
      renewal.member_id,
    ]);
    if (!member) return res.status(404).json({ error: "Member not found" });

    const membershipType =
      req.body.membership_type || renewal.membership_type || member.membership_type;
    const membership = await getAsync(
      "SELECT duration_days FROM membership_types WHERE name = ?",
      [membershipType],
    );
    const duration = Number(req.body.duration_days || renewal.bonus_days) ||
      Number(membership?.duration_days) ||
      30;
    const packageDuration = durationFromMembership(membershipType, duration);
    const todayValue = toDateOnly(new Date());
    const today = parseDateOnly(todayValue);
    const currentExpiry = parseDateOnly(member.expiry_date);
    const selectedStart =
      req.body.start_date || renewal.request_date || todayValue;
    const baseDate =
      currentExpiry && today && currentExpiry >= today
        ? formatDateOnly(currentExpiry)
        : selectedStart;
    const promotionId = req.body.promotion_id || renewal.promotion_id || "";
    const promotion = await loadValidPromotion(
      promotionId,
      membershipType,
      selectedStart,
    );
    const newExpiry = calculateEndDate(baseDate, packageDuration, promotion);
    const daysLeft = currentDaysLeft(newExpiry);
    const now = new Date().toISOString();
    const approvedBy = req.body.approved_by || renewal.approved_by || approver.name;
    const promotionApplied = promotion
      ? promotionDisplayName(promotion)
      : req.body.promotion_applied || renewal.promotion_applied || "";
    const branch = req.body.branch || renewal.branch || member.branch || "";

    await runAsync(
      "UPDATE members SET membership_type = ?, expiry_date = ?, days_left = ?, status = ?, promotion_id = ?, promotion_applied = ? WHERE id = ?",
      [
        membershipType,
        newExpiry,
        daysLeft,
        MEMBER_STATUS.ACTIVE,
        promotion?.id || null,
        promotionApplied,
        member.id,
      ],
    );

    await runAsync(
      `UPDATE renewals
       SET processed_date = ?, status = ?, previous_end_date = ?,
           new_end_date = ?, membership_type = ?, promotion_id = ?,
           promotion_applied = ?, approved_by = ?, branch = ?, bonus_days = ?
       WHERE id = ?`,
      [
        now,
        RENEWAL_STATUS.APPROVED,
        member.expiry_date || "",
        newExpiry,
        membershipType,
        promotion?.id || null,
        promotionApplied,
        approvedBy,
        branch,
        duration,
        id,
      ],
    );

    if (promotion) {
      await runAsync(
        "UPDATE promotions SET used_count = COALESCE(used_count, 0) + 1, usage_count = COALESCE(usage_count, 0) + 1 WHERE id = ?",
        [promotion.id],
      );
    }

    const updated = await getAsync("SELECT * FROM members WHERE id = ?", [
      member.id,
    ]);
    res.json({ renewal: id, member: updated });
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message });
  }
});

// Approve a pending approval request and optionally create a member
app.post("/api/approvals/:id/approve", (req, res) => {
  const approver = requireApprover(req, res);
  if (!approver) return;
  const id = req.params.id;
  db.get("SELECT * FROM approvals WHERE id = ?", [id], (err, appr) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!appr) {
      return res.json({
        stale: true,
        message: "Approval was not found. Please use the refreshed list.",
      });
    }

    if (appr.member_id) {
      db.run(
        `UPDATE members
         SET status = ?, remarks = CASE WHEN remarks IS NULL OR remarks = '' THEN ? ELSE remarks || '; ' || ? END
         WHERE id = ?`,
        [
          MEMBER_STATUS.ACTIVE,
          `Approved from request #${id}`,
          `Approved from request #${id}`,
          appr.member_id,
        ],
        function (memberErr) {
          if (memberErr)
            return res.status(500).json({ error: memberErr.message });
          db.run(
            "UPDATE approvals SET status = ? WHERE id = ?",
            ["Approved", id],
            function (approvalErr) {
              if (approvalErr)
                return res.status(500).json({ error: approvalErr.message });
              db.get(
                "SELECT * FROM members WHERE id = ?",
                [appr.member_id],
                (getErr, row) => {
                  if (getErr)
                    return res.status(500).json({ error: getErr.message });
                  res.json({ approval: id, member: row });
                },
              );
            },
          );
        },
      );
      return;
    }

    // create member from approval record
    const joinDate = new Date().toISOString().slice(0, 10);
    // Try to find membership duration
    db.get(
      "SELECT duration_days FROM membership_types WHERE name = ?",
      [appr.membership_type],
      (merr, mt) => {
        if (merr) return res.status(500).json({ error: merr.message });
        const duration = (mt && mt.duration_days) || 30;
        const expiryExpr = `date('${joinDate}', '+${duration} days')`;
        const insertSql = `INSERT INTO members (member_code, name, email, phone, membership_type, join_date, expiry_date, days_left, status, remarks, photo_url, branch) VALUES (?, ?, ?, ?, ?, ?, ${expiryExpr}, CAST(julianday(${expiryExpr}) - julianday('now') AS INTEGER), ?, ?, ?, ?)`;
        const params = [
          "",
          appr.name,
          appr.email || null,
          appr.phone || null,
          appr.membership_type,
          joinDate,
          "Active",
          `Created from approval #${id}`,
          appr.photo_url || "",
          appr.branch || "",
        ];
        db.run(insertSql, params, function (ierr) {
          if (ierr) return res.status(500).json({ error: ierr.message });
          const newMemberId = this.lastID;
          db.run(
            "UPDATE members SET member_code = ? WHERE id = ?",
            [makeMemberCode(newMemberId), newMemberId],
            function (codeErr) {
              if (codeErr)
                return res.status(500).json({ error: codeErr.message });
              db.run(
                "UPDATE approvals SET status = ? WHERE id = ?",
                ["Approved", id],
                function (uerr) {
                  if (uerr)
                    return res.status(500).json({ error: uerr.message });
                  db.get(
                    "SELECT * FROM members WHERE id = ?",
                    [newMemberId],
                    (gerr, row) => {
                      if (gerr)
                        return res.status(500).json({ error: gerr.message });
                      res.json({ approval: id, member: row });
                    },
                  );
                },
              );
            },
          );
        });
      },
    );
  });
});

app.post("/api/approvals/:id/reject", (req, res) => {
  const approver = requireApprover(req, res);
  if (!approver) return;
  db.get(
    "SELECT id FROM approvals WHERE id = ?",
    [req.params.id],
    (getErr, row) => {
      if (getErr) return res.status(500).json({ error: getErr.message });
      if (!row) {
        return res.json({
          stale: true,
          message: "Approval was not found. Please use the refreshed list.",
        });
      }

      db.run(
        "UPDATE approvals SET status = ? WHERE id = ?",
        ["Rejected", req.params.id],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });
          res.json({ approval: req.params.id, status: "Rejected" });
        },
      );
    },
  );
});

app.post("/api/approvals/bulk-approve", (req, res) => {
  const approver = requireApprover(req, res);
  if (!approver) return;
  const ids = Array.isArray(req.body.ids) ? req.body.ids : [];
  if (!ids.length) return res.status(400).json({ error: "ids required" });

  const approveOne = (approvalId) =>
    new Promise((resolve) => {
      db.get(
        "SELECT * FROM approvals WHERE id = ?",
        [approvalId],
        (err, appr) => {
          if (err || !appr) {
            resolve({
              id: approvalId,
              ok: false,
              error: err ? err.message : "Approval not found",
            });
            return;
          }

          if (appr.member_id) {
            db.run(
              `UPDATE members
             SET status = ?, remarks = CASE WHEN remarks IS NULL OR remarks = '' THEN ? ELSE remarks || '; ' || ? END
             WHERE id = ?`,
              [
                "Active",
                `Approved from request #${approvalId}`,
                `Approved from request #${approvalId}`,
                appr.member_id,
              ],
              (memberErr) => {
                if (memberErr) {
                  resolve({
                    id: approvalId,
                    ok: false,
                    error: memberErr.message,
                  });
                  return;
                }
                db.run(
                  "UPDATE approvals SET status = ? WHERE id = ?",
                  ["Approved", approvalId],
                  (approvalErr) => {
                    resolve({
                      id: approvalId,
                      ok: !approvalErr,
                      member_id: appr.member_id,
                      error: approvalErr && approvalErr.message,
                    });
                  },
                );
              },
            );
            return;
          }

          const joinDate = new Date().toISOString().slice(0, 10);
          db.get(
            "SELECT duration_days FROM membership_types WHERE name = ?",
            [appr.membership_type],
            (mtErr, mt) => {
              if (mtErr) {
                resolve({ id: approvalId, ok: false, error: mtErr.message });
                return;
              }

              const duration = (mt && mt.duration_days) || 30;
              const expiryExpr = `date('${joinDate}', '+${duration} days')`;
              const insertSql = `INSERT INTO members (member_code, name, email, phone, membership_type, join_date, expiry_date, days_left, status, remarks, photo_url, branch) VALUES (?, ?, ?, ?, ?, ?, ${expiryExpr}, CAST(julianday(${expiryExpr}) - julianday('now') AS INTEGER), ?, ?, ?, ?)`;
              const params = [
                "",
                appr.name,
                appr.email || null,
                appr.phone || null,
                appr.membership_type,
                joinDate,
                "Active",
                `Created from approval #${approvalId}`,
                appr.photo_url || "",
                appr.branch || "",
              ];

              db.run(insertSql, params, function (insertErr) {
                if (insertErr) {
                  resolve({
                    id: approvalId,
                    ok: false,
                    error: insertErr.message,
                  });
                  return;
                }

                const newMemberId = this.lastID;
                db.run(
                  "UPDATE members SET member_code = ? WHERE id = ?",
                  [makeMemberCode(newMemberId), newMemberId],
                  (codeErr) => {
                    if (codeErr) {
                      resolve({
                        id: approvalId,
                        ok: false,
                        error: codeErr.message,
                      });
                      return;
                    }

                    db.run(
                      "UPDATE approvals SET status = ? WHERE id = ?",
                      ["Approved", approvalId],
                      (updateErr) => {
                        resolve({
                          id: approvalId,
                          ok: !updateErr,
                          member_id: newMemberId,
                          error: updateErr && updateErr.message,
                        });
                      },
                    );
                  },
                );
              });
            },
          );
        },
      );
    });

  Promise.all(ids.map(approveOne))
    .then((approved) => res.json({ approved }))
    .catch((err) => res.status(500).json({ error: err.message }));
});

// Apply promotion to a member: increments usage and records application
app.post("/api/promotions/:id/apply", (req, res) => {
  const promoId = req.params.id;
  const memberId = req.body.member_id;
  if (!memberId) return res.status(400).json({ error: "member_id required" });
  db.get("SELECT * FROM promotions WHERE id = ?", [promoId], (err, promo) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!promo) return res.status(404).json({ error: "Promotion not found" });

    db.run(
      "UPDATE promotions SET used_count = COALESCE(used_count, 0) + 1, usage_count = COALESCE(usage_count, 0) + 1 WHERE id = ?",
      [promoId],
      function (uerr) {
        if (uerr) return res.status(500).json({ error: uerr.message });
        // Optionally append a remark to member
        db.get(
          "SELECT remarks FROM members WHERE id = ?",
          [memberId],
          (merr, mrow) => {
            if (merr) return res.status(500).json({ error: merr.message });
            const newRemarks =
              (mrow && mrow.remarks ? mrow.remarks + "; " : "") +
              `Applied promo: ${promotionDisplayName(normalizePromotion(promo))}`;
            db.run(
              "UPDATE members SET remarks = ? WHERE id = ?",
              [newRemarks, memberId],
              function (mupErr) {
                if (mupErr)
                  return res.status(500).json({ error: mupErr.message });
                res.json({
                  applied: true,
                  promotion: promoId,
                  member_id: memberId,
                });
              },
            );
          },
        );
      },
    );
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
  console.log(`Server started on http://localhost:${PORT}`),
);
