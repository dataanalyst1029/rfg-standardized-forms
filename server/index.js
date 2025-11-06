/* eslint-env node */
import process from "node:process";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";
import multer from "multer";
import fs from "fs";
import path from "path";

dotenv.config();
const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const app = express();
app.use(cors());
app.use(express.json());
/* ------------------------
   FILE UPLOAD SETUP
------------------------ */

app.use("/uploads/signatures", express.static(path.join(process.cwd(), "uploads/signatures")));
app.use("/uploads/profile", express.static(path.join(process.cwd(), "uploads/profile")));

const signatureDir = path.join(process.cwd(), "uploads/signatures");
if (!fs.existsSync(signatureDir)) fs.mkdirSync(signatureDir, { recursive: true });

const profileDir = path.join(process.cwd(), "uploads/profile");
if (!fs.existsSync(profileDir)) fs.mkdirSync(profileDir, { recursive: true });

const signatureStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, signatureDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const profileStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}${path.extname(file.originalname)}`),
});

const uploadFiles = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      if (file.fieldname === "signature") cb(null, signatureDir);
      else if (file.fieldname === "profile_img") cb(null, profileDir);
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}${path.extname(file.originalname)}`);
    },
  }),
}).fields([
  { name: "signature", maxCount: 1 },
  { name: "profile_img", maxCount: 1 },
]);

const getNextRevolvingFundCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `RFF-${year}-`;

  const { rows } = await pool.query(
    `SELECT form_code
       FROM revolving_fund_requests
      WHERE form_code LIKE $1
      ORDER BY form_code DESC
      LIMIT 1`,
    [`${prefix}%`],
  );

  if (rows.length === 0) {
    return `${prefix}001`;
  }

  const lastCode = rows[0].form_code;
  const parts = lastCode.split("-");
  const lastNumber = parseInt(parts[2], 10);
  const nextNumber = String((Number.isNaN(lastNumber) ? 0 : lastNumber) + 1).padStart(3, "0");
  return `${prefix}${nextNumber}`;
};

const getNextCashAdvanceCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `CAR-${year}-`;

  const { rows } = await pool.query(
    `SELECT form_code
       FROM cash_advance_requests
      WHERE form_code LIKE $1
      ORDER BY form_code DESC
      LIMIT 1`,
    [`${prefix}%`],
  );

  if (rows.length === 0) {
    return `${prefix}001`;
  }

  const lastCode = rows[0].form_code;
  const parts = lastCode.split("-");
  const lastNumber = parseInt(parts[2], 10);
  const nextNumber = String((Number.isNaN(lastNumber) ? 0 : lastNumber) + 1).padStart(3, "0");
  return `${prefix}${nextNumber}`;
};

const getNextPaymentRequestCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `PRF-${year}-`;

  const { rows } = await pool.query(
    `SELECT form_code
       FROM payment_requests
      WHERE form_code LIKE $1
      ORDER BY form_code DESC
      LIMIT 1`,
    [`${prefix}%`],
  );

  if (rows.length === 0) {
    return `${prefix}001`;
  }

  const lastCode = rows[0].form_code;
  const parts = lastCode.split("-");
  const lastNumber = parseInt(parts[2], 10);
  const nextNumber = String((Number.isNaN(lastNumber) ? 0 : lastNumber) + 1).padStart(3, "0");
  return `${prefix}${nextNumber}`;
};

const fetchRevolvingFundById = async (id) => {
  const { rows } = await pool.query(
    `SELECT *
       FROM revolving_fund_requests
      WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  const request = rows[0];
  const { rows: itemRows } = await pool.query(
    `SELECT *
       FROM revolving_fund_items
      WHERE request_id = $1
      ORDER BY entry_date ASC, created_at ASC`,
    [id],
  );

  return { ...request, items: itemRows };
};

const fetchCashAdvanceById = async (id) => {
  const { rows } = await pool.query(
    `SELECT *
       FROM cash_advance_requests
      WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  const request = rows[0];
  const { rows: itemRows } = await pool.query(
    `SELECT *
       FROM cash_advance_items
      WHERE request_id = $1
      ORDER BY created_at ASC`,
    [id],
  );

  return { ...request, items: itemRows };
};

const fetchPaymentRequestById = async (id) => {
  const { rows } = await pool.query(
    `SELECT *
       FROM payment_requests
      WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  const request = rows[0];
  const { rows: itemRows } = await pool.query(
    `SELECT *
       FROM payment_request_items
      WHERE request_id = $1
      ORDER BY created_at ASC`,
    [id],
  );

  return { ...request, items: itemRows };
};


pool.connect()
  .then(() => console.log("✅ Connected to PostgreSQL: request_system"))
  .catch(err => console.error("❌ Database connection error:", err));

/* ------------------------
   TEST ROUTE
------------------------ */
app.get("/", (req, res) => {
  res.send("Server is running and connected to PostgreSQL!");
});

/* ------------------------
   LOGIN ENDPOINT
------------------------ */
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const result = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    res.json({
        success: true,
        message: "Login successful!",
        id: user.id,
        role: user.role,
        name: user.name,
        email: user.email,
        employee_id: user.employee_id,
        branch: user.branch || null,
        department: user.department || null,
      });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ------------------------
   USERS CRUD API
------------------------ */

app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, employee_id, name, email, role FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

app.get("/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});


app.post("/api/users", async (req, res) => {
  const { employee_id, name, email, role, password } = req.body;

  if (!name || !email || !employee_id) {
    return res.status(400).json({ message: "Employee ID, name, and email are required" });
  }

  try {
    const existingEmail = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    const existingEmp = await pool.query("SELECT * FROM users WHERE employee_id = $1", [employee_id]);
    if (existingEmp.rows.length > 0) {
      return res.status(400).json({ message: "Employee ID already exists" });
    }

    const hashedPassword = await bcrypt.hash(password || "123456", 10);

    const result = await pool.query(
      `INSERT INTO users (employee_id, name, email, role, password)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, employee_id, name, email, role`,
      [employee_id, name, email, role, hashedPassword]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding user:", err);
    res.status(500).json({ message: "Server error adding user" });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { employee_id, name, email, role, password } = req.body;

  try {
    let query = `UPDATE users SET employee_id=$1, name=$2, email=$3, role=$4`;
    const params = [employee_id, name, email, role];

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `, password=$5 WHERE id=$6 RETURNING id, employee_id, name, email, role`;
      params.push(hashedPassword, id);
    } else {
      query += ` WHERE id=$5 RETURNING id, employee_id, name, email, role`;
      params.push(id);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user:", err);
    res.status(500).json({ message: "Server error updating user" });
  }
});


app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ message: "User deleted successfully" });
  } catch (err) {
    console.error("Error deleting user:", err);
    res.status(500).json({ message: "Server error deleting user" });
  }
});

/* ------------------------
   UPDATE USER (with signature & profile_img)
------------------------ */

app.put("/users/update/:id", uploadFiles, async (req, res) => {
  const { id } = req.params;
  const { employee_id, name, email, contact_no, role, password } = req.body;

  const signature = req.files?.signature ? req.files.signature[0] : null;
  const profileImg = req.files?.profile_img ? req.files.profile_img[0] : null;

  try {
    const hashedPassword =
      password && password.trim() !== "" ? await bcrypt.hash(password, 10) : null;

    const fields = [];
    const values = [];
    let index = 1;

    if (employee_id && employee_id.trim() !== "") {
      fields.push(`employee_id = $${index++}`);
      values.push(employee_id);
    }
    if (name && name.trim() !== "") {
      fields.push(`name = $${index++}`);
      values.push(name);
    }
    if (email && email.trim() !== "") {
      fields.push(`email = $${index++}`);
      values.push(email);
    }
    if (contact_no && contact_no.trim() !== "") {
      fields.push(`contact_no = $${index++}`);
      values.push(contact_no);
    }
    if (role && role.trim() !== "") {
      fields.push(`role = $${index++}`);
      values.push(role);
    }
    if (hashedPassword) {
      fields.push(`password = $${index++}`);
      values.push(hashedPassword);
    }
    if (signature) {
      fields.push(`signature = $${index++}`);
      values.push(signature.filename);
    }
    if (profileImg) {
      fields.push(`profile_img = $${index++}`);
      values.push(profileImg.filename);
    }

    if (fields.length === 0) return res.json({ message: "No changes made." });

    fields.push(`updated_at = NOW()`);

    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE id = $${index}
      RETURNING id, employee_id, name, email, contact_no, role, signature, profile_img, created_at, updated_at;
    `;
    values.push(id);

    const result = await pool.query(query, values);

    if (result.rows.length === 0) return res.status(404).json({ message: "User not found" });

    res.json({
      success: true,
      message: "User updated successfully!",
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ success: false, message: "Error updating user" });
  }
});


/* ------------------------
   USER ACCESS ROUTES
------------------------ */

app.get("/api/user_access", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM user_access ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching user access data:", err);
    res.status(500).json({ message: "Server error fetching user access data" });
  }
});

app.post("/api/user_access", async (req, res) => {
  const { user_id, access_forms, role } = req.body;
  console.log("📥 Incoming POST /api/user_access:", req.body);

  if (!user_id) {
    return res.status(400).json({ message: "user_id is required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_access (user_id, access_forms, role)
       VALUES ($1::int, $2::text, $3::text)
       RETURNING *`,
      [user_id, access_forms, role]
    );

    console.log("✅ User access record added:", result.rows[0]);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error adding user access record:", err.message);
    res.status(500).json({ message: "Server error adding user access record" });
  }
});

app.put("/api/user_access/:id", async (req, res) => {
  const { id } = req.params;
  const { user_id, access_forms, role } = req.body;

  console.log("✏️ Incoming PUT /api/user_access:", { id, ...req.body });

  try {
    const result = await pool.query(
      `UPDATE user_access
       SET user_id = $1::int,
           access_forms = $2::text,
           role = $3::text
       WHERE id = $4
       RETURNING *`,
      [user_id, access_forms, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User access record not found" });
    }

    console.log("✅ User access record updated:", result.rows[0]);
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Error updating user access record:", err.message);
    res.status(500).json({ message: "Server error updating user access record" });
  }
});


app.delete("/api/user_access/:id", async (req, res) => {
  const { id } = req.params;

  console.log("🗑️ Incoming DELETE /api/user_access:", id);

  try {
    const result = await pool.query(
      "DELETE FROM user_access WHERE id = $1 RETURNING *",
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "User access record not found" });
    }

    console.log("✅ User access record deleted:", id);
    res.json({ message: "User access record deleted successfully" });
  } catch (err) {
    console.error("❌ Error deleting user access record:", err.message);
    res.status(500).json({ message: "Server error deleting user access record" });
  }
});

app.get("/user-access/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      "SELECT access_forms, role FROM user_access WHERE user_id = $1",
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "No access record found" });
    }

    const accessForms = result.rows.map((row) => row.access_forms);

    const role = result.rows[0].role;

    res.json({
      access_forms: accessForms,
      role,
    });
  } catch (err) {
    console.error("Error fetching user access:", err);
    res.status(500).json({ error: "Server error" });
  }
});



/* ------------------------
   PURCHASE REQUESTS
------------------------ */

app.get("/api/purchase_request/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT purchase_request_code 
       FROM purchase_request 
       WHERE purchase_request_code LIKE $1 
       ORDER BY purchase_request_code DESC 
       LIMIT 1`,
      [`PR-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].purchase_request_code;
      const lastNum = parseInt(lastCode.split("-")[2]);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `PR-${year}-${nextNum}`;
    } else {
      nextCode = `PR-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next purchase request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.post("/api/purchase_request", async (req, res) => {
  const {
    purchase_request_code,
    date_applied,      
    request_by,
    contact_no,
    branch,
    department,
    address,
    purpose,
    user_id,
    items = [],
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO purchase_request
       (purchase_request_code, request_date, request_by, contact_no, branch, department, address, purpose, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        purchase_request_code,
        date_applied || new Date(),
        request_by,
        contact_no,
        branch,
        department,
        address,
        purpose,
        user_id, 
      ]
    );

    const requestId = result.rows[0]?.id;
    if (!requestId) throw new Error("Failed to get purchase_request ID");

    for (const item of items) {
      if (!item.purchase_item || !item.quantity) continue;
      await client.query(
        `INSERT INTO purchase_request_items (request_id, quantity, purchase_item)
         VALUES ($1, $2, $3)`,
        [requestId, item.quantity, item.purchase_item.trim()]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Purchase Request ${purchase_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving purchase request:", err);
    res.status(500).json({ message: "Server error saving purchase request" });
  } finally {
    client.release();
  }
});


app.get("/api/purchase_request", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*, json_agg(json_build_object('id', pri.id, 'quantity', pri.quantity, 'purchase_item', pri.purchase_item)) AS items
      FROM purchase_request pr
      LEFT JOIN purchase_request_items pri ON pr.id = pri.request_id
      GROUP BY pr.id
      ORDER BY pr.created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching purchase requests:", err);
    res.status(500).json({ message: "Server error fetching purchase requests" });
  }
});

app.get("/api/purchase_request_items", async (req, res) => {
  const { request_id } = req.query;

  try {
    let query = `
      SELECT id, request_id, purchase_item, quantity
      FROM purchase_request_items
    `;
    const params = [];

    if (request_id) {
      query += " WHERE request_id = $1";
      params.push(request_id);
    }

    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching purchase request items:", err);
    res.status(500).json({ message: "Server error fetching purchase request items" });
  }
});

/* ------------------------
   UPDATE PURCHASE REQUEST
------------------------ */
const uploadForm = multer();

app.put("/api/update_purchase_request", uploadForm.none(), async (req, res) => {
  try {
    const {
      purchase_request_code,
      approved_by,
      approved_signature,
      status,
      declined_reason,
    } = req.body;

    if (!purchase_request_code) {
      return res.status(400).json({ message: "purchase_request_code is required." });
    }

    let query = `
      UPDATE purchase_request
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];
    let paramIndex = 2;

    if (status === "Approved") {
      query += `,
        approved_by = $${paramIndex++},
        approved_signature = $${paramIndex++}
      `;
      values.push(approved_by, approved_signature);
    }

    if (status === "Declined") {
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE purchase_request_code = $${paramIndex} RETURNING *`;
    values.push(purchase_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Purchase request not found." });
    }

    res.json({
      success: true,
      message: "Purchase request updated successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating purchase request:", err);
    res.status(500).json({ message: "Server error updating purchase request." });
  }
});

/* ------------------------
   REVOLVING FUND API
------------------------ */

app.get("/api/revolving_fund_request/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT revolving_request_code 
       FROM revolving_fund_request 
       WHERE revolving_request_code LIKE $1 
       ORDER BY revolving_request_code DESC 
       LIMIT 1`,
      [`RFRF-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].revolving_request_code;
      const lastNum = parseInt(lastCode.split("-")[2]);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `RFRF-${year}-${nextNum}`;
    } else {
      nextCode = `RFRF-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next revolving fund request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.post("/api/revolving_fund_request", async (req, res) => {
  const {
    revolving_request_code,
    date_request,
    employee_id,
    custodian,
    branch,
    department,
    replenish_amount,
    total,
    revolving_amount,
    total_exp,
    cash_onhand,
    submitted_by,
    submitter_signature,
    user_id,
    items = [],
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const result = await client.query(
      `INSERT INTO revolving_fund_request
      (revolving_request_code, date_request, employee_id, custodian, branch, department, replenish_amount, total, revolving_amount, total_exp, cash_onhand, submitted_by, submitter_signature, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id`,
      [
        revolving_request_code,
        date_request || new Date(),
        employee_id,
        custodian,
        branch,
        department,
        replenish_amount,
        total,
        revolving_amount,
        total_exp,
        cash_onhand,
        submitted_by,
        submitter_signature,
        user_id,
      ]
    );

    const requestId = result.rows[0]?.id;
    if (!requestId) throw new Error("Failed to get revolving request ID");

    if (items.length > 0) {
      const values = [];
      const placeholders = [];

      items.forEach((item, i) => {
        const base = i * 8;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7}, $${base + 8})`
        );
        values.push(
          requestId,
          item.replenish_date || null,
          item.voucher_no || null,
          item.or_ref_no || null,
          item.amount || null,
          item.exp_cat || null,
          item.gl_account || null,
          item.remarks?.trim() || null
        );
      });

      await client.query(
        `INSERT INTO revolving_fund_request_items
        (request_id, replenish_date, voucher_no, or_ref_no, amount, exp_cat, gl_account, remarks)
        VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Revolving Fund Request ${revolving_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving revolving fund request:", err);
    res.status(500).json({ message: "Server error saving revolving fund request" });
  } finally {
    client.release();
  }
});



app.get("/api/revolving_fund_request", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT rfr.*, 
        json_agg(
          json_build_object(
            'id', rfri.id, 
            'replenish_date', rfri.replenish_date, 
            'voucher_no', rfri.voucher_no, 
            'or_ref_no', rfri.or_ref_no, 
            'amount', rfri.amount, 
            'exp_cat', rfri.exp_cat, 
            'gl_account', rfri.gl_account, 
            'remarks', rfri.remarks
          )
        ) AS items
      FROM revolving_fund_request rfr
      LEFT JOIN revolving_fund_request_items rfri ON rfr.id = rfri.request_id
      GROUP BY rfr.id
      ORDER BY rfr.created_at DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching revolving fund requests:", err);
    res.status(500).json({ message: "Server error fetching revolving fund requests" });
  }
});

app.get("/api/revolving_fund_request_items", async (req, res) => {
  const { request_id } = req.query;

  try {
    let query = `
      SELECT id, request_id, replenish_date, voucher_no, or_ref_no, amount, exp_cat, gl_account, remarks
      FROM revolving_fund_request_items
    `;
    const params = [];

    if (request_id) {
      query += " WHERE request_id = $1";
      params.push(request_id);
    }

    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching revolving fund request items:", err);
    res.status(500).json({ message: "Server error fetching revolving fund request items" });
  }
});

/* ------------------------
   UPDATE REVOLVING FUND REQUEST
------------------------ */
app.put("/api/update_revolving_fund_request", uploadForm.none(), async (req, res) => {
  try {
    const {
      revolving_request_code,
      approved_by,
      approver_signature,
      status,
      declined_reason,
    } = req.body;

    if (!revolving_request_code) {
      return res.status(400).json({ message: "revolving_request_code is required." });
    }

    let query = `
      UPDATE revolving_fund_request
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];
    let paramIndex = 2;

    if (status === "Approved") {
      query += `,
        approved_by = $${paramIndex++},
        approver_signature = $${paramIndex++}
      `;
      values.push(approved_by, approver_signature);
    }

    if (status === "Declined") {
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE revolving_request_code = $${paramIndex} RETURNING *`;
    values.push(revolving_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Revolving fund request not found." });
    }

    res.json({
      success: true,
      message: "Revolving fund request updated successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating revolving fund request:", err);
    res.status(500).json({ message: "Server error updating revolving fund request." });
  }
});

/* ------------------------
   CASH ADVANCE API
------------------------ */

app.get("/api/cash_advance_request/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT ca_request_code 
       FROM cash_advance_request 
       WHERE ca_request_code LIKE $1 
       ORDER BY ca_request_code DESC 
       LIMIT 1`,
      [`CABR-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].ca_request_code;
      const lastNum = parseInt(lastCode.split("-")[2]);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `CABR-${year}-${nextNum}`;
    } else {
      nextCode = `CABR-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next cash advance budget request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.post("/api/cash_advance_request", async (req, res) => {
  const {
    ca_request_code,
    request_date,
    employee_id,
    name,
    branch,
    department,
    cutoff_date,
    nature_activity,
    inclusive_date_from,
    inclusive_date_to,
    total_amount,
    purpose,
    requested_by,
    request_signature,
    user_id,
    items = [],
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const safeTotalAmount =
      total_amount === "" || total_amount === undefined || total_amount === null
        ? null
        : Number(total_amount);

    const result = await client.query(
      `INSERT INTO cash_advance_request
      (ca_request_code, request_date, employee_id, name, branch, department, cutoff_date, nature_activity, inclusive_date_from, inclusive_date_to, total_amount, purpose, requested_by, request_signature, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      RETURNING id`,
      [
        ca_request_code,
        request_date || new Date(),
        employee_id,
        name,
        branch,
        department,
        cutoff_date,
        nature_activity,
        inclusive_date_from === "" ? null : inclusive_date_from,
        inclusive_date_to === "" ? null : inclusive_date_to,
        safeTotalAmount,
        purpose,
        requested_by,
        request_signature,
        user_id,
      ]
    );


    const requestId = result.rows[0]?.id;
    if (!requestId) throw new Error("Failed to get cash advance budget request ID");

    if (items.length > 0) {
      const values = [];
      const placeholders = [];

      items.forEach((item, i) => {
        const base = i * 6;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6})`
        );
        values.push(
          requestId,
          item.description || null,
          item.amount || null,
          item.exp_cat || null,
          item.store_branch || null,
          item.remarks?.trim() || null
        );
      });

      await client.query(
        `INSERT INTO cash_advance_request_item
        (request_id, description, amount, exp_cat, store_branch, remarks)
        VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Cash Advance Budget Request ${ca_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving cash advance budget request:", err);
    res.status(500).json({ message: "Server error saving cash advance budget request" });
  } finally {
    client.release();
  }
});



app.get("/api/cash_advance_request", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cabr.*,
        json_agg(
          json_build_object(
            'id', cabri.id, 
            'description', cabri.description, 
            'amount', cabri.amount, 
            'exp_cat', cabri.exp_cat,
            'store_branch', cabri.store_branch, 
            'remarks', cabri.remarks
          )
        ) AS items
      FROM cash_advance_request cabr
      LEFT JOIN cash_advance_request_item cabri ON cabr.id = cabri.request_id
      GROUP BY cabr.id
      ORDER BY cabr.created_at DESC;

    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching cash advance budget requests:", err);
    res.status(500).json({ message: "Server error fetching cash advance budget requests" });
  }
});

app.get("/api/cash_advance_request_item", async (req, res) => {
  const { request_id } = req.query;

  try {
    let query = `
      SELECT id, request_id, description, amount, exp_cat, store_branch, remarks
      FROM cash_advance_request_item
    `;
    const params = [];

    if (request_id) {
      query += " WHERE request_id = $1";
      params.push(request_id);
    }

    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching revolving fund request items:", err);
    res.status(500).json({ message: "Server error fetching revolving fund request items" });
  }
});

/* ------------------------
   UPDATE CASH ADVANCE BUDGET REQUEST
------------------------ */
app.put("/api/update_cash_advance_request", uploadForm.none(), async (req, res) => {
  try {
    const {
      ca_request_code,
      approved_by,
      approve_signature,
      status,
      declined_reason,
    } = req.body;

    if (!ca_request_code) {
      return res.status(400).json({ message: "ca_request_code is required." });
    }

    let query = `
      UPDATE cash_advance_request
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];
    let paramIndex = 2;

    if (status === "Approved") {
      query += `,
        approved_by = $${paramIndex++},
        approve_signature = $${paramIndex++}
      `;
      values.push(approved_by, approve_signature);
    }

    if (status === "Declined") {
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE ca_request_code = $${paramIndex} RETURNING *`;
    values.push(ca_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cash advance budget request not found." });
    }

    res.json({
      success: true,
      message: "Cash advance budget request updated successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating cash advance budget request:", err);
    res.status(500).json({ message: "Server error updating cash advance budget request." });
  }
});


/* ------------------------
   CASH ADVANCE LIQUIDATION API
------------------------ */

app.get("/api/cash_advance_request/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT *
       FROM cash_advance_request 
       WHERE ca_request_code = $1 
       LIMIT 1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cash advance not found" });
    }

    const data = result.rows[0];

    // ✅ Convert date fields to plain YYYY-MM-DD (no timezone)
    const formatDate = (d) => {
      if (!d) return null;
      const dateObj = new Date(d);
      // Offset fix: add 1 day if UTC offset pushes it backward
      return new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    };

    res.json({
      cash_advance_no: data.ca_request_code,
      employee_id: data.employee_id,
      name: data.name,
      branch: data.branch,
      department: data.department,
      nature_activity: data.nature_activity,
      check_pcv_no: data.voucher_petty_cash,
      cutoff_date: formatDate(data.cutoff_date),
      inclusive_date_from: formatDate(data.inclusive_date_from),
      inclusive_date_to: formatDate(data.inclusive_date_to),
      total_amount: data.total_amount,
      received_by: data.received_by,
    });
  } catch (err) {
    console.error("Error fetching cash advance details:", err);
    res.status(500).json({ error: "Server error fetching cash advance details" });
  }
});


app.get("/api/cash_advance_liquidation/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT cal_request_code 
       FROM cash_advance_liquidation 
       WHERE cal_request_code LIKE $1 
       ORDER BY cal_request_code DESC 
       LIMIT 1`,
      [`CAL-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].cal_request_code;
      const lastNum = parseInt(lastCode.split("-")[2]);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `CAL-${year}-${nextNum}`;
    } else {
      nextCode = `CAL-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next revolving fund request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.post("/api/cash_advance_liquidation", async (req, res) => {
  const {
    cal_request_code,
    request_date,
    employee_id,
    name,
    branch,
    department,
    cash_advance_no,
    check_pcv_no,
    cutoff_date,
    nature_activity,
    inclusive_date_from,
    inclusive_date_to,
    total_expense,
    budgeted,
    actual,
    difference,
    excess_deposit,
    date_excess,
    ack_rcpt_no,
    exceed_amount,
    rb_amount,
    prepared_by,
    prepared_signature,
    user_id,
    items = [],
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const safeNum = (val) =>
      val === "" || val === null || val === undefined ? null : Number(val);


    const result = await client.query(
      `INSERT INTO cash_advance_liquidation
      (cal_request_code, request_date, employee_id, name, branch, department, cash_advance_no, check_pcv_no, cutoff_date, nature_activity, inclusive_date_from, inclusive_date_to, total_expense, budgeted, actual, difference, excess_deposit, date_excess, ack_rcpt_no, exceed_amount, rb_amount, prepared_by, prepared_signature, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
      RETURNING id`,
      [
        cal_request_code,
        request_date || new Date(),
        employee_id,
        name,
        branch,
        department,
        cash_advance_no,
        check_pcv_no,
        cutoff_date,
        nature_activity,
        inclusive_date_from,
        inclusive_date_to,
        safeNum(total_expense),
        safeNum(budgeted),
        safeNum(actual),
        safeNum(difference),
        excess_deposit,
        date_excess,
        ack_rcpt_no,
        safeNum(exceed_amount),
        safeNum(rb_amount),
        prepared_by,
        prepared_signature,
        user_id,
      ]
    );

    const requestId = result.rows[0]?.id;
    if (!requestId) throw new Error("Failed to get cash advance liquidation ID");

    if (items.length > 0) {
      const placeholders = items
        .map(
          (_, i) =>
            `($${i * 8 + 1}, $${i * 8 + 2}, $${i * 8 + 3}, $${i * 8 + 4}, $${i * 8 + 5}, $${i * 8 + 6}, $${i * 8 + 7}, $${i * 8 + 8})`
        )
        .join(", ");

      const values = items.flatMap((item) => [
        requestId,
        item.transaction_date || null,
        item.description || null,
        item.or_no || null,
        item.amount === "" ? null : Number(item.amount),
        item.exp_charges || null,
        item.store_branch || null,
        item.remarks?.trim() || null,
      ]);

      await client.query(
        `INSERT INTO cash_advance_liquidation_items
        (request_id, transaction_date, description, or_no, amount, exp_charges, store_branch, remarks)
        VALUES ${placeholders}`,
        values
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Cash Advance Liquidation ${cal_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving cash advance liquidation:", err);
    res.status(500).json({ message: "Server error saving cash advance liquidation" });
  } finally {
    client.release();
  }
});

app.get("/api/cash_advance_liquidation", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT cal.*, 
        json_agg(
          json_build_object(
            'id', cali.id, 
            'transaction_date', cali.transaction_date, 
            'description', cali.description, 
            'or_no', cali.or_no, 
            'amount', cali.amount, 
            'exp_charges', cali.exp_charges, 
            'store_branch', cali.store_branch, 
            'remarks', cali.remarks
          )
        ) AS items
      FROM cash_advance_liquidation cal
      LEFT JOIN cash_advance_liquidation_items cali ON cal.id = cali.request_id
      GROUP BY cal.id
      ORDER BY cal.created_at DESC;
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching revolving fund requests:", err);
    res.status(500).json({ message: "Server error fetching revolving fund requests" });
  }
});

app.get("/api/cash_advance_liquidation_items", async (req, res) => {
  const { request_id } = req.query;

  try {
    let query = `
      SELECT id, request_id, transaction_date, description, or_no, amount, exp_charges, store_branch, remarks
      FROM cash_advance_liquidation_items
    `;
    const params = [];

    if (request_id) {
      query += " WHERE request_id = $1";
      params.push(request_id);
    }

    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching cash advance liquidation items:", err);
    res.status(500).json({ message: "Server error fetching cash advance liquidation items" });
  }
});

/* ------------------------
   UPDATE CASH ADVANCE LIQUIDATION
------------------------ */
app.put("/api/update_cash_advance_liquidation", uploadForm.none(), async (req, res) => {
  try {
    const {
      cal_request_code,
      approved_by,
      approve_signature,
      status,
      declined_reason,
    } = req.body;

    if (!cal_request_code) {
      return res.status(400).json({ message: "cal_request_code is required." });
    }

    let query = `
      UPDATE cash_advance_liquidation
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];
    let paramIndex = 2;

    if (status === "Approved") {
      query += `,
        approved_by = $${paramIndex++},
        approve_signature = $${paramIndex++}
      `;
      values.push(approved_by, approve_signature);
    }

    if (status === "Declined") {
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE cal_request_code = $${paramIndex} RETURNING *`;
    values.push(cal_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Cash advance liquidation not found." });
    }

    res.json({
      success: true,
      message: "Cash advance liquidation updated successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating cash advance liquidation:", err);
    res.status(500).json({ message: "Server error updating cash advance liquidation." });
  }
});

/* ------------------------
   CASH ADVANCE RECEIPT API
------------------------ */

app.get("/api/ca_receipt/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT car_request_code
       FROM ca_receipt
       WHERE car_request_code LIKE $1
       ORDER BY car_request_code DESC
       LIMIT 1`,
      [`CAR-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].car_request_code;
      const lastNum = parseInt(lastCode.split("-")[2], 10);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `CAR-${year}-${nextNum}`;
    } else {
      nextCode = `CAR-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next CA receipt code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});


app.post("/api/ca_receipt", async (req, res) => {
  const {
    car_request_code,
    request_date,
    employee_id,
    name,
    cash_advance_no,
    received_from,
    php_amount,
    php_word,
    received_by,
    received_signature,
    user_id,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM ca_receipt WHERE car_request_code = $1",
      [car_request_code]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: `CA Receipt ${car_request_code} already exists.` });
    }

    await client.query(
      `INSERT INTO ca_receipt (
        car_request_code, 
        request_date, 
        employee_id, 
        name, 
        cash_advance_no, 
        received_from, 
        php_amount, 
        php_word, 
        received_by, 
        received_signature, 
        user_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
      [
        car_request_code,
        request_date || new Date(),
        employee_id,
        name,
        cash_advance_no,
        received_from,
        php_amount,
        php_word,
        received_by,
        received_signature,
        user_id,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `✅ CA Receipt ${car_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving CA receipt:", err);
    res.status(500).json({ message: "Server error saving CA receipt" });
  } finally {
    client.release();
  }
});

app.get("/api/ca_receipt", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT 
        id,
        car_request_code,
        request_date,
        employee_id,
        name,
        cash_advance_no,
        received_from,
        php_amount,
        php_word,
        received_by,
        received_signature,
        user_id
      FROM ca_receipt
      ORDER BY request_date DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching CA receipts:", err);
    res.status(500).json({ message: "Server error fetching CA receipts" });
  }
});


/* ------------------------
   REIMBURSEMENT API
------------------------ */

app.get("/api/cash_advance_liquidation/:code", async (req, res) => {
  try {
    const { code } = req.params;
    const result = await pool.query(
      `SELECT *
       FROM cash_advance_liquidation 
       WHERE cal_request_code = $1 
       LIMIT 1`,
      [code]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Cash advance liquidation not found" });
    }

    const data = result.rows[0];

    const formatDate = (d) => {
      if (!d) return null;
      const dateObj = new Date(d);
      return new Date(dateObj.getTime() - dateObj.getTimezoneOffset() * 60000)
        .toISOString()
        .split("T")[0];
    };

    res.json({
      cal_request_code: data.cal_request_code,
      cash_advance_no: data.cash_advance_no,
      employee_id: data.employee_id,
      name: data.name,
      branch: data.branch,
      department: data.department,
      rb_amount: data.rb_amount,
      received_by: data.received_by,
    });
  } catch (err) {
    console.error("Error fetching cash advance details:", err);
    res.status(500).json({ error: "Server error fetching cash advance details" });
  }
});

app.get("/api/reimbursement/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT rb_request_code
       FROM reimbursement
       WHERE rb_request_code LIKE $1
       ORDER BY rb_request_code DESC
       LIMIT 1`,
      [`RB-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].rb_request_code;
      const lastNum = parseInt(lastCode.split("-")[2], 10);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `RB-${year}-${nextNum}`;
    } else {
      nextCode = `RB-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next CA receipt code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});


app.post("/api/reimbursement", async (req, res) => {
  const {
    rb_request_code,
    request_date,
    cal_no,
    ca_no,
    employee_id,
    name,
    branch,
    department,
    bpi_acc_no,
    total_rb_amount,
    requested_by,
    request_signature,
    user_id,
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const existing = await client.query(
      "SELECT id FROM reimbursement WHERE rb_request_code = $1",
      [rb_request_code]
    );
    if (existing.rows.length > 0) {
      await client.query("ROLLBACK");
      return res
        .status(400)
        .json({ message: `CA Receipt ${rb_request_code} already exists.` });
    }

    await client.query(
      `INSERT INTO reimbursement (
        rb_request_code, 
        request_date, 
        cal_no, 
        ca_no, 
        employee_id, 
        name, 
        branch, 
        department, 
        bpi_acc_no,
        total_rb_amount,
        requested_by, 
        request_signature, 
        user_id
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,
      [
        rb_request_code,
        request_date || new Date(),
        cal_no,
        ca_no,
        employee_id,
        name,
        branch,
        department,
        bpi_acc_no,
        total_rb_amount,
        requested_by,
        request_signature,
        user_id,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `✅ Reimbursement ${rb_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving reimbursement:", err);
    res.status(500).json({ message: "Server error saving reimbursement" });
  } finally {
    client.release();
  }
});


/* ------------------------
   UPDATE REIMBURSEMENT
------------------------ */
app.put("/api/update_reimbursement", uploadForm.none(), async (req, res) => {
  try {
    const {
      rb_request_code,
      approved_by,
      approve_signature,
      status,
      declined_reason,
    } = req.body;

    if (!rb_request_code) {
      return res.status(400).json({ message: "rb_request_code is required." });
    }

    let query = `
      UPDATE reimbursement
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];
    let paramIndex = 2;

    if (status === "Approved") {
      query += `,
        approved_by = $${paramIndex++},
        approve_signature = $${paramIndex++}
      `;
      values.push(approved_by, approve_signature);
    }

    if (status === "Declined") {
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE rb_request_code = $${paramIndex} RETURNING *`;
    values.push(rb_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Reimbursement not found." });
    }

    res.json({
      success: true,
      message: "Reimbursement updated successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating reimbursement:", err);
    res.status(500).json({ message: "Server error updating reimbursement." });
  }
});

app.get("/api/reimbursement", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * 
       FROM reimbursement 
       ORDER BY request_date DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching reimbursements:", err);
    res.status(500).json({ message: "Server error fetching reimbursements" });
  }
});



/* ------------------------
   PAYMENT REQUEST API
------------------------ */

app.get("/api/payment_request/next-code", async (req, res) => {
  try {
    const year = new Date().getFullYear();

    const result = await pool.query(
      `SELECT prf_request_code 
       FROM payment_request 
       WHERE prf_request_code LIKE $1 
       ORDER BY prf_request_code DESC 
       LIMIT 1`,
      [`PRF-${year}-%`]
    );

    let nextCode;
    if (result.rows.length > 0) {
      const lastCode = result.rows[0].prf_request_code;
      const lastNum = parseInt(lastCode.split("-")[2]);
      const nextNum = String(lastNum + 1).padStart(6, "0");
      nextCode = `PRF-${year}-${nextNum}`;
    } else {
      nextCode = `PRF-${year}-000001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("❌ Error generating next payment request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.post("/api/payment_request", async (req, res) => {
  const {
    prf_request_code,
    request_date,
    employee_id,
    name,
    branch,
    department,
    vendor_supplier,
    pr_number,
    date_needed,
    purpose,
    total_amount,
    requested_by,
    requested_signature,
    user_id,
    items = [],
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const safeTotalAmount =
      total_amount === "" || total_amount === undefined || total_amount === null
        ? null
        : Number(total_amount);

    const result = await client.query(
      `INSERT INTO payment_request
      (prf_request_code, request_date, employee_id, name, branch, department, vendor_supplier, pr_number, date_needed, purpose, total_amount, requested_by, requested_signature, user_id)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
      RETURNING id`,
      [
        prf_request_code,
        request_date || new Date(),
        employee_id,
        name,
        branch,
        department,
        vendor_supplier,
        pr_number,
        date_needed === "" ? null : date_needed,
        purpose,
        safeTotalAmount,
        requested_by,
        requested_signature,
        user_id,
      ]
    );

    const requestId = parseInt(result.rows[0]?.id || req.body.request_id, 10);
    if (!requestId) throw new Error("Failed to get payment request ID");


    if (items.length > 0) {
      const values = [];
      const placeholders = [];

      items.forEach((item, i) => {
        const base = i * 7;
        placeholders.push(
          `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`
        );
        values.push(
          requestId,
          item.item || null,
          item.quantity || null,
          item.unit_price || null,
          item.amount || null,
          item.expense_charges || null,
          item.location || null,
          // item.remarks?.trim() || null
        );
      });

      await client.query(
        `INSERT INTO payment_request_item
        (request_id, item, quantity, unit_price, amount, expense_charges, location)
        VALUES ${placeholders.join(", ")}`,
        values
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      success: true,
      message: `Payment Request ${prf_request_code} saved successfully!`,
    });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("❌ Error saving payment request:", err);
    res.status(500).json({ message: "Server error saving payment request" });
  } finally {
    client.release();
  }
});



app.get("/api/payment_request", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT pr.*,
        json_agg(
          json_build_object(
            'id', pri.id, 
            'item', pri.item, 
            'quantity', pri.quantity, 
            'unit_price', pri.unit_price,
            'amount', pri.amount, 
            'expense_charges', pri.expense_charges, 
            'location', pri.location
          )
        ) AS items
      FROM payment_request pr
      LEFT JOIN payment_request_item pri ON pr.id = pri.request_id
      GROUP BY pr.id
      ORDER BY pr.created_at DESC;

    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching payment requests:", err);
    res.status(500).json({ message: "Server error fetching payment requests" });
  }
});

app.get("/api/payment_request_item", async (req, res) => {
  const { request_id } = req.query;

  try {
    let query = `
      SELECT id, request_id, item, quantity, unit_price, amount, expense_charges, location
      FROM payment_request_item
    `;
    const params = [];

    if (request_id) {
      query += " WHERE request_id = $1";
      params.push(request_id);
    }

    query += " ORDER BY id ASC";

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching payment request items:", err);
    res.status(500).json({ message: "Server error fetching payment request items" });
  }
});


/* ------------------------
   UPDATE PAYMENT REQUEST
------------------------ */
app.put("/api/update_payment_request", uploadForm.none(), async (req, res) => {
  try {
    const {
      prf_request_code,
      approved_by,
      approved_signature,
      status,
      declined_reason,
    } = req.body;

    if (!prf_request_code) {
      return res.status(400).json({ message: "prf_request_code is required." });
    }

    let query = `
      UPDATE payment_request
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];
    let paramIndex = 2;

    if (status === "Approved") {
      query += `,
        approved_by = $${paramIndex++},
        approved_signature = $${paramIndex++}
      `;
      values.push(approved_by, approved_signature);
    }

    if (status === "Declined") {
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE prf_request_code = $${paramIndex} RETURNING *`;
    values.push(prf_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Payment request not found." });
    }

    res.json({
      success: true,
      message: "Payment request updated successfully.",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating payment request:", err);
    res.status(500).json({ message: "Server error updating payment request." });
  }
});

app.use(express.json());

app.put("/api/payment_request/:id", async (req, res) => {
  const { id } = req.params;
  const { status, received_by, received_signature } = req.body;

  console.log("Received PUT /api/payment_request/:id", { id, status, received_by, received_signature });

  if (!id) {
    return res.status(400).json({ error: "Missing request ID" });
  }

  try {
    const updateResult = await pool.query(
      `UPDATE payment_request
       SET status = $1,
           received_by = $2,
           received_signature = $3
       WHERE id = $4
       RETURNING *;`,
      [status, received_by, received_signature, id]
    );

    if (updateResult.rowCount === 0) {
      return res.status(404).json({ error: "Payment request not found" });
    }

    console.log("Payment request updated successfully:", updateResult.rows[0]);
    res.json({
      message: "Payment request updated successfully",
      updated: updateResult.rows[0],
    });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: err.message || "Database error" });
  }
});

// ✅ Fetch single user by ID
app.get("/api/users/:id", async (req, res) => {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `SELECT id, name, signature FROM users WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Database error fetching user" });
  }
});


/* ------------------------
   BRANCHES CRUD API
------------------------ */
app.get("/api/branches", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM branches ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching branches:", err);
    res.status(500).json({ message: "Server error fetching branches" });
  }
});

app.post("/api/branches", async (req, res) => {
  const { branch_name, branch_code, location } = req.body;

  if (!branch_name || !branch_code) {
    return res.status(400).json({ message: "Branch name and code are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO branches (branch_name, branch_code, location)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [branch_name, branch_code, location || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding branch:", err);
    res.status(500).json({ message: "Server error adding branch" });
  }
});

app.put("/api/branches/:id", async (req, res) => {
  const { id } = req.params;
  const { branch_name, branch_code, location } = req.body;

  try {
    const result = await pool.query(
      `UPDATE branches 
       SET branch_name = $1, branch_code = $2, location = $3, updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [branch_name, branch_code, location || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Branch not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating branch:", err);
    res.status(500).json({ message: "Server error updating branch" });
  }
});

app.delete("/api/branches/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM branches WHERE id = $1", [id]);
    res.json({ message: "Branch deleted successfully" });
  } catch (err) {
    console.error("Error deleting branch:", err);
    res.status(500).json({ message: "Server error deleting branch" });
  }
});

/* ------------------------
   DEPARTMENTS CRUD API
------------------------ */

app.get("/api/departments", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT d.id, d.department_name, d.branch_id, b.branch_name
      FROM departments d
      LEFT JOIN branches b ON d.branch_id = b.id
      ORDER BY d.department_name ASC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching departments:", err);
    res.status(500).json({ message: "Server error fetching departments" });
  }
});

app.post("/api/departments", async (req, res) => {
  const { department_name, branch_id } = req.body;

  if (!department_name || !branch_id) {
    return res.status(400).json({ message: "Department name and branch ID are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO departments (department_name, branch_id)
       VALUES ($1, $2)
       RETURNING *`,
      [department_name, branch_id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding department:", err);
    res.status(500).json({ message: "Server error adding department" });
  }
});

app.put("/api/departments/:id", async (req, res) => {
  const { id } = req.params;
  const { department_name, branch_id } = req.body;

  try {
    const result = await pool.query(
      `UPDATE departments
       SET department_name = $1, branch_id = $2, updated_at = NOW()
       WHERE id = $3
       RETURNING *`,
      [department_name, branch_id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Department not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating department:", err);
    res.status(500).json({ message: "Server error updating department" });
  }
});

app.delete("/api/departments/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM departments WHERE id = $1", [id]);
    res.json({ message: "Department deleted successfully" });
  } catch (err) {
    console.error("Error deleting department:", err);
    res.status(500).json({ message: "Server error deleting department" });
  }
});

/* ------------------------
   INTERBRANCH TRANSFER SLIP API
------------------------ */

app.get("/api/interbranch_transfer_slip/next-code", async (req, res) => {  // Generate next available payment request code
  try {
    const year = new Date().getFullYear();  // Get current year for code prefix

    const result = await pool.query(  // Query latest code that matches current year
      `SELECT form_code 
       FROM interbranch_transfer_slip 
       WHERE form_code LIKE $1 
       ORDER BY form_code DESC 
       LIMIT 1`,
      [`ITS-${year}-%`]  // Pattern for current year’s codes
    );

    let nextCode;  // Variable to store generated code
    if (result.rows.length > 0) {  // If a record exists for this year
      const lastCode = result.rows[0].form_code;  // Get latest code
      const lastNum = parseInt(lastCode.split("-")[2]);  // Extract numeric part
      const nextNum = String(lastNum + 1).padStart(6, "0");  // Increment and pad to 6 digits
      nextCode = `ITS-${year}-${nextNum}`;  // Construct next code
    } else {
      nextCode = `ITS-${year}-000001`;  // If none found, start from 000001
    }

    res.json({ nextCode });  // Return next code to client
  } catch (err) {
    console.error("❌ Error generating next interbranch transfer slip code:", err);  // Log error
    res.status(500).json({ message: "Server error generating next code" });  // Send error response
  }
});

app.post("/api/interbranch_transfer_slip", async (req, res) => {  // Create new interbranch transfer slip
  const {
    form_code,
    date_transferred,
    from_branch,
    from_address,
    from_area_ops_controller,
    date_received,
    to_branch,
    to_address,
    to_area_ops_controller,
    dispatch_method,
    vehicle_no,
    driver_name,
    driver_contact,
    expected_date,
    prepared_by,
    approved_by,
    received_by,
    prepared_date,
    approved_date,
    dispatched_date,
    received_date,
    prepared_signature,
    approved_signature,
    dispatched_signature,
    received_signature,
    is_shortage,
    is_overage,
    short_reason,
    over_reason,

    items = [],  // Default to empty array if no items
  } = req.body;

  const client = await pool.connect();  // Get DB client for transaction
  try {
    await client.query("BEGIN");  // Start transaction

    const result = await client.query(  // Insert main request record
      `INSERT INTO interbranch_transfer_slip
      (form_code, date_transferred, from_branch, from_address, from_area_ops_controller, date_received, to_branch, to_address, to_area_ops_controller, dispatch_method, vehicle_no, driver_name, driver_contact, expected_date, prepared_by, approved_by, received_by, prepared_date, approved_date, dispatched_date, received_date, prepared_signature, approved_signature, dispatched_signature, received_signature, is_shortage, is_overage, short_reason, over_reason)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28, $29)
      RETURNING id`,
      [
        form_code,
        date_transferred || new Date(),
        from_branch,
        from_address,
        from_area_ops_controller,
        date_received || new Date(),
        to_branch,
        to_address,
        to_area_ops_controller,
        dispatch_method,
        vehicle_no,
        driver_name,
        driver_contact,
        expected_date,
        prepared_by || null,
        approved_by || null,
        received_by || null,
        prepared_date || null,
        approved_date || null,
        dispatched_date || null,
        received_date || null,
        prepared_signature || null,
        approved_signature || null,
        dispatched_signature || null,
        received_signature || null,
        is_shortage || null,
        is_overage || null,
        short_reason || null,
        over_reason || null,
      ]
    );

    const requestId = parseInt(result.rows[0]?.id || req.body.request_id, 10);  // Get inserted request ID
    if (!requestId) throw new Error("Failed to get interbranch transfer slip ID");  // Validate presence of ID

    await client.query("COMMIT");  // Commit transaction

    res.status(201).json({
      success: true,
      message: `Interbranch Transfer Slip ${form_code} saved successfully!`,  // Success message
    });
  } catch (err) {
    await client.query("ROLLBACK");  // Rollback on failure
    console.error("❌ Error saving interbranch transfer slip:", err);
    res.status(500).json({ message: "Server error saving interbranch transfer slip" });  // Send error response
  } finally {
    client.release();  // Release DB client
  }
});

/*
app.get("/api/payment_request", async (req, res) => {  // Fetch all payment requests with items
  try {
    const result = await pool.query(`
      SELECT pr.*,
        json_agg(
          json_build_object(
            'id', pri.id, 
            'item', pri.item, 
            'quantity', pri.quantity, 
            'unit_price', pri.unit_price,
            'amount', pri.amount, 
            'expense_charges', pri.expense_charges, 
            'location', pri.location
          )
        ) AS items
      FROM payment_request pr
      LEFT JOIN payment_request_item pri ON pr.id = pri.request_id
      GROUP BY pr.id
      ORDER BY pr.created_at DESC;  -- Sort by newest first
    `);
    res.json(result.rows);  // Return array of requests with nested items
  } catch (err) {
    console.error("❌ Error fetching payment requests:", err);
    res.status(500).json({ message: "Server error fetching payment requests" });
  }
});

app.get("/api/payment_request_item", async (req, res) => {  // Fetch items for a specific payment request
  const { request_id } = req.query;

  try {
    let query = `
      SELECT id, request_id, item, quantity, unit_price, amount, expense_charges, location
      FROM payment_request_item
    `;
    const params = [];

    if (request_id) {  // If specific request_id is provided
      query += " WHERE request_id = $1";
      params.push(request_id);
    }

    query += " ORDER BY id ASC";  // Sort items in ascending order

    const result = await pool.query(query, params);
    res.json(result.rows);  // Return list of items
  } catch (err) {
    console.error("❌ Error fetching payment request items:", err);
    res.status(500).json({ message: "Server error fetching payment request items" });
  }
});


   //UPDATE PAYMENT REQUEST

app.put("/api/update_payment_request", uploadForm.none(), async (req, res) => {  // Update existing payment request
  try {
    const {
      prf_request_code,
      approved_by,
      approved_signature,
      status,
      declined_reason,
    } = req.body;

    if (!prf_request_code) {  // Validate input
      return res.status(400).json({ message: "prf_request_code is required." });
    }

    let query = `
      UPDATE payment_request
      SET status = $1,
          updated_at = NOW()
    `;

    const values = [status];  // Initial parameter values
    let paramIndex = 2;  // Index counter for dynamic params

    if (status === "Approved") {  // If request approved
      query += `,
        approved_by = $${paramIndex++},
        approved_signature = $${paramIndex++}
      `;
      values.push(approved_by, approved_signature);
    }

    if (status === "Declined") {  // If request declined
      query += `,
        declined_reason = $${paramIndex++}
      `;
      values.push(declined_reason || "");
    }

    query += ` WHERE prf_request_code = $${paramIndex} RETURNING *`;  // Return updated record
    values.push(prf_request_code);

    const result = await pool.query(query, values);

    if (result.rowCount === 0) {  // If no record updated
      return res.status(404).json({ message: "Payment request not found." });
    }

    res.json({
      success: true,
      message: "Payment request updated successfully.",  // Success response
      data: result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating payment request:", err);
    res.status(500).json({ message: "Server error updating payment request." });
  }
});
/*

/* ------------------------
   START SERVER
------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

//ENDPOINT FOR AUDIT REPORTS
app.get("/api/reports_audit", async (req, res) => {
  try {
    const tablesResult = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_type = 'BASE TABLE'
        AND (table_name LIKE '%request' OR table_name LIKE '%requests');
    `);

    const allData = {};
    const errors = [];

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;
      try {
        const result = await pool.query(`SELECT * FROM "${tableName}" LIMIT 50`);
        allData[tableName] = result.rows;
      } catch (err) {
        console.warn(`⚠️ Skipping table ${tableName}: ${err.message}`);
        errors.push({ table: tableName, error: err.message });
        allData[tableName] = [];
      }
    }

    res.status(200).json({
      success: true,
      message: "Database tables fetched successfully",
      tables: allData,
      skippedTables: errors,
    });
  } catch (error) {
    console.error("❌ Error fetching all database data:", error);
    res.status(200).json({
      success: false,
      message: "Error retrieving data",
      error: error.message,
    });
  }
});
