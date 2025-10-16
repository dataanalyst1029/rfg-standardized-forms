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

const app = express();
app.use(cors());
app.use(express.json());

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

const getNextMaintenanceRepairCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `MRF-${year}-`;

  const { rows } = await pool.query(
    `SELECT form_code
       FROM maintenance_requests
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

const getNextOvertimeRequestCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `OAR-${year}-`;

  const { rows } = await pool.query(
    `SELECT form_code
       FROM overtime_requests
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

const getNextLeaveApplicationCode = async () => {
  const year = new Date().getFullYear();
  const prefix = `LAF-${year}-`;

  const { rows } = await pool.query(
    `SELECT form_code
       FROM leave_requests
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

const fetchMaintenanceRequestById = async (id) => {
  const { rows } = await pool.query(
    `SELECT *
       FROM maintenance_requests
      WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
};

const fetchOvertimeRequestById = async (id) => {
  const { rows } = await pool.query(
    `SELECT *
       FROM overtime_requests
      WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  const request = rows[0];
  const { rows: entryRows } = await pool.query(
    `SELECT *
       FROM overtime_entries
      WHERE request_id = $1
      ORDER BY ot_date ASC, time_from ASC`,
    [id],
  );

  return { ...request, entries: entryRows };
};

const fetchLeaveRequestById = async (id) => {
  const { rows } = await pool.query(
    `SELECT *
       FROM leave_requests
      WHERE id = $1`,
    [id],
  );

  if (rows.length === 0) {
    return null;
  }

  return rows[0];
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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

// app.put("/api/users/:id", async (req, res) => {
//   const { id } = req.params;
//   const { employee_id, name, email, role, password } = req.body;

//   try {
//     let query = `UPDATE users SET employee_id=$1, name=$2, email=$3, role=$4`;
//     const params = [employee_id, name, email, role];

//     if (password) {
//       const hashedPassword = await bcrypt.hash(password, 10);
//       query += `, password=$5 WHERE id=$6 RETURNING id, employee_id, name, email, role`;
//       params.push(hashedPassword, id);
//     } else {
//       query += ` WHERE id=$5 RETURNING id, employee_id, name, email, role`;
//       params.push(id);
//     }

//     const result = await pool.query(query, params);

//     if (result.rows.length === 0) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     res.json(result.rows[0]);
//   } catch (err) {
//     console.error("Error updating user:", err);
//     res.status(500).json({ message: "Server error updating user" });
//   }
// });


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
   UPDATE USER (with signature upload)
------------------------ */

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join("public", "signatures");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `signature-${Date.now()}${ext}`);
  },
});

const upload = multer({ storage });

app.put("/api/users/:id", upload.single("signature"), async (req, res) => {
  const { id } = req.params;
  const {
    employee_id,
    name,
    email,
    contact_no,
    role,
    password,
  } = req.body;

  try {
    // Prepare dynamic query
    const updates = [];
    const values = [];
    let index = 1;

    if (employee_id !== undefined) {
      updates.push(`employee_id = $${index++}`);
      values.push(employee_id);
    }

    if (name !== undefined) {
      updates.push(`name = $${index++}`);
      values.push(name);
    }

    if (email !== undefined) {
      updates.push(`email = $${index++}`);
      values.push(email);
    }

    if (contact_no !== undefined) {
      updates.push(`contact_no = $${index++}`);
      values.push(contact_no);
    }

    if (role !== undefined) {
      updates.push(`role = $${index++}`);
      values.push(role);
    }

    // Handle password hashing if provided
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updates.push(`password = $${index++}`);
      values.push(hashedPassword);
    }

    // Handle file upload (signature)
    if (req.file) {
      const signatureUrl = `/signatures/${req.file.filename}`;
      updates.push(`signature_url = $${index++}`);
      values.push(signatureUrl);
    }

    // If no fields provided
    if (updates.length === 0) {
      return res.status(400).json({ message: "No fields to update." });
    }

    // Build final query
    values.push(id);
    const query = `
      UPDATE users
      SET ${updates.join(", ")}
      WHERE id = $${index}
      RETURNING id, employee_id, name, email, contact_no, role, signature_url
    `;

    const result = await pool.query(query, values);

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      success: true,
      message: "User updated successfully",
      ...result.rows[0],
    });
  } catch (err) {
    console.error("❌ Error updating user:", err.message, err.stack);
    res.status(500).json({ message: "Server error updating user" });
  }
});

// serve static signature files
app.use("/signatures", express.static(path.join("public", "signatures")));

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

/* ------------------------
   PURCHASE REQUESTS
------------------------ */

// ✅ Generate next purchase request code
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
    contact_number,
    branch,
    department,
    address,
    purpose,
    user_id, // <-- add this
    items = [],
  } = req.body;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // Include user_id in INSERT
    const result = await client.query(
      `INSERT INTO purchase_request
       (purchase_request_code, request_date, request_by, contact_number, branch, department, address, purpose, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING id`,
      [
        purchase_request_code,
        date_applied || new Date(),
        request_by,
        contact_number,
        branch,
        department,
        address,
        purpose,
        user_id, // <-- include in values
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

// 🗂️ Create uploads directory if it doesn't exist
/* ------------------------
   PURCHASE REQUEST APPROVAL (with signature upload)
------------------------ */

// 🗂️ Create uploads directory for approved signatures
const approvalUploadDir = path.join("public", "approved_signatures");
if (!fs.existsSync(approvalUploadDir)) {
  fs.mkdirSync(approvalUploadDir, { recursive: true });
  console.log(`✅ Created directory: ${approvalUploadDir}`);
}

// ⚙️ Separate Multer storage for approved signatures
const approvalStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, approvalUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const code = req.body.purchase_request_code || "PR-unknown";
    cb(null, `${code}-approved-${Date.now()}${ext}`);
  },
});

const approvalUpload = multer({ storage: approvalStorage });

// 🖼️ Serve uploaded approved signatures publicly
app.use("/approved_signatures", express.static(path.join("public", "approved_signatures")));

// ✅ Update purchase request route
app.put("/api/update_purchase_request", approvalUpload.single("approved_signature"), async (req, res) => {
  const { purchase_request_code, date_ordered, approved_by, po_number, status } = req.body;

  try {
    if (status === "Approved" && (!date_ordered || !approved_by || !po_number)) {
      return res.status(400).json({ message: "Missing required fields for approval." });
    }

    const values = [];
    let query = `
      UPDATE purchase_request
      SET status = $1,
          updated_at = NOW()
    `;
    values.push(status);

    if (status === "Approved") {
      query += `,
        date_ordered = $2,
        approved_by = $3,
        po_number = $4
      `;
      values.push(date_ordered, approved_by, po_number);
    }

    if (req.file) {
      const filePath = `/approved_signatures/${req.file.filename}`;
      query += `, approved_signature = $${values.length + 1}`;
      values.push(filePath);
    }

    query += ` WHERE purchase_request_code = $${values.length + 1} RETURNING *`;
    values.push(purchase_request_code);

    const result = await pool.query(query, values);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Purchase request not found." });
    }

    res.json({ success: true, message: "Purchase request updated successfully." });
  } catch (err) {
    console.error("❌ Error updating purchase request:", err);
    res.status(500).json({ message: "Server error updating purchase request." });
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
   PAYMENT REQUEST API
------------------------ */
const parseAmount = (value) => {
  if (value === null || value === undefined || value === "") {
    return 0;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const parseTimeToMinutes = (value) => {
  if (!value) {
    return null;
  }
  const [hourStr = "", minuteStr = ""] = value.split(":");
  const hours = Number(hourStr);
  const minutes = Number(minuteStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return null;
  }
  return hours * 60 + minutes;
};

const calculateHoursBetween = (from, to) => {
  const fromMinutes = parseTimeToMinutes(from);
  const toMinutes = parseTimeToMinutes(to);
  if (fromMinutes === null || toMinutes === null) {
    return 0;
  }
  let diff = toMinutes - fromMinutes;
  if (diff < 0) {
    diff += 24 * 60;
  }
  return diff / 60;
};

app.get("/api/payment_request/next-code", async (req, res) => {
  try {
    const nextCode = await getNextPaymentRequestCode();
    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next payment request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

const buildPaymentRequestResponse = async (requests) => {
  if (!requests.length) {
    return [];
  }

  const ids = requests.map((req) => req.id);
  const { rows: items } = await pool.query(
    `SELECT *
       FROM payment_request_items
      WHERE request_id = ANY($1)
      ORDER BY created_at ASC`,
    [ids],
  );

  const itemsMap = items.reduce((acc, item) => {
    if (!acc[item.request_id]) {
      acc[item.request_id] = [];
    }
    acc[item.request_id].push(item);
    return acc;
  }, {});

  return requests.map((request) => ({
    ...request,
    items: itemsMap[request.id] || [],
  }));
};

app.get("/api/payment_request", async (req, res) => {
  const { role, userId, status } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (normalizedRole === "user") {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for user-level requests" });
      }
      params.push(Number(userId));
      clauses.push(`submitted_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *
         FROM payment_requests
        ${whereClause}
        ORDER BY created_at DESC`,
      params,
    );

    const response = await buildPaymentRequestResponse(rows);
    res.json(response);
  } catch (err) {
    console.error("Error fetching payment requests:", err);
    res.status(500).json({ message: "Server error fetching payment requests" });
  }
});

app.get("/api/payment_request/:id", async (req, res) => {
  const { id } = req.params;
  const { role, userId } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const request = await fetchPaymentRequestById(id);
    if (!request) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    if (normalizedRole === "user" && Number(request.submitted_by) !== Number(userId)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    res.json(request);
  } catch (err) {
    console.error("Error fetching payment request:", err);
    res.status(500).json({ message: "Server error fetching payment request" });
  }
});

app.post("/api/payment_request", async (req, res) => {
  const {
    requester_name,
    branch,
    department,
    employee_id,
    request_date,
    vendor_name,
    pr_number,
    date_needed,
    purpose,
    items = [],
    submitted_by,
  } = req.body;

  const status = "submitted";
  const requestDateValue = request_date ? new Date(request_date) : new Date();
  const dateNeededValue = date_needed ? new Date(date_needed) : null;
  const submittedAt = new Date();

  const computeItemAmount = (item) => {
    const quantity = parseAmount(item.quantity);
    const unitPrice = parseAmount(item.unit_price);
    const amount = parseAmount(item.amount);
    const derived = quantity * unitPrice;
    return derived > 0 ? derived : amount;
  };

  const totalAmount = items.reduce((acc, curr) => acc + computeItemAmount(curr), 0);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const formCode = await getNextPaymentRequestCode();
    const insertRequest = await client.query(
      `INSERT INTO payment_requests
        (form_code, status, requester_name, branch, department, employee_id, request_date,
         vendor_name, pr_number, date_needed, purpose, total_amount, submitted_by, submitted_at,
         created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
       RETURNING *`,
      [
        formCode,
        status,
        requester_name || null,
        branch || null,
        department || null,
        employee_id || null,
        requestDateValue,
        vendor_name || null,
        pr_number || null,
        dateNeededValue,
        purpose || null,
        totalAmount,
        submitted_by || null,
        submittedAt,
      ],
    );

    const requestId = insertRequest.rows[0].id;
    const savedItems = [];

    for (const item of items) {
      const quantity = parseAmount(item.quantity);
      const unitPrice = parseAmount(item.unit_price);
      const amountValue = computeItemAmount(item);
      const { rows: itemRows } = await client.query(
        `INSERT INTO payment_request_items
          (request_id, description, quantity, unit_price, amount, budget_code)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          requestId,
          item.description || null,
          quantity,
          unitPrice,
          amountValue,
          item.budget_code || null,
        ],
      );
      savedItems.push(itemRows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json({ ...insertRequest.rows[0], items: savedItems });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating payment request:", err);
    res.status(500).json({ message: err?.message || "Server error creating payment request" });
  } finally {
    client.release();
  }
});

app.patch("/api/payment_request/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  try {
    const request = await fetchPaymentRequestById(id);
    if (!request) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    if (request.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be approved" });
    }

    const { rows } = await pool.query(
      `UPDATE payment_requests
          SET status = 'approved',
              approved_by = $1,
              approved_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [approved_by || null, id],
    );

    const response = await fetchPaymentRequestById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error approving payment request:", err);
    res.status(500).json({ message: "Server error approving payment request" });
  }
});

app.patch("/api/payment_request/:id/release", async (req, res) => {
  const { id } = req.params;
  const {
    accounting_gl_code,
    accounting_amount,
    accounting_or_number,
    accounting_check_number,
    received_by,
    released_by,
  } = req.body;

  try {
    const request = await fetchPaymentRequestById(id);
    if (!request) {
      return res.status(404).json({ message: "Payment request not found" });
    }

    if (request.status !== "approved") {
      return res.status(409).json({ message: "Only approved requests can be released" });
    }

    const { rows } = await pool.query(
      `UPDATE payment_requests
          SET status = 'released',
              accounting_gl_code = $1,
              accounting_amount = $2,
              accounting_or_number = $3,
              accounting_check_number = $4,
              received_by = $5,
              received_at = NOW(),
              released_by = $6,
              released_at = NOW(),
              updated_at = NOW()
        WHERE id = $7
        RETURNING *`,
      [
        accounting_gl_code || null,
        accounting_amount !== undefined && accounting_amount !== null
          ? parseAmount(accounting_amount)
          : null,
        accounting_or_number || null,
        accounting_check_number || null,
        received_by || null,
        released_by || null,
        id,
      ],
    );

    const response = await fetchPaymentRequestById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error releasing payment request:", err);
    res.status(500).json({ message: "Server error releasing payment request" });
  }
});

/* ------------------------
   MAINTENANCE / REPAIR API
------------------------ */
app.get("/api/maintenance_repair/next-code", async (req, res) => {
  try {
    const nextCode = await getNextMaintenanceRepairCode();
    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next maintenance request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.get("/api/maintenance_repair", async (req, res) => {
  const { role, userId, status } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (normalizedRole === "user") {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for user-level requests" });
      }
      params.push(Number(userId));
      clauses.push(`submitted_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *
         FROM maintenance_requests
        ${whereClause}
        ORDER BY created_at DESC`,
      params,
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching maintenance requests:", err);
    res.status(500).json({ message: "Server error fetching maintenance requests" });
  }
});

app.get("/api/maintenance_repair/:id", async (req, res) => {
  const { id } = req.params;
  const { role, userId } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const request = await fetchMaintenanceRequestById(id);

    if (!request) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    if (normalizedRole === "user" && Number(request.submitted_by) !== Number(userId)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    res.json(request);
  } catch (err) {
    console.error("Error fetching maintenance request:", err);
    res.status(500).json({ message: "Server error fetching maintenance request" });
  }
});

app.post("/api/maintenance_repair", async (req, res) => {
  const {
    requester_name,
    branch,
    department,
    employee_id,
    request_date,
    signature,
    date_needed,
    work_description,
    asset_tag,
    performed_by,
    date_completed,
    completion_remarks,
    submitted_by,
  } = req.body;

  const status = "submitted";
  const requestDateValue = request_date ? new Date(request_date) : new Date();
  const dateNeededValue = date_needed ? new Date(date_needed) : null;
  const dateCompletedValue = date_completed ? new Date(date_completed) : null;
  const submittedAt = new Date();

  try {
    const formCode = await getNextMaintenanceRepairCode();
    const { rows } = await pool.query(
      `INSERT INTO maintenance_requests
        (form_code, status, requester_name, branch, department, employee_id, request_date,
         signature, date_needed, work_description, asset_tag, performed_by, date_completed,
         completion_remarks, submitted_by, submitted_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
       RETURNING *`,
      [
        formCode,
        status,
        requester_name || null,
        branch || null,
        department || null,
        employee_id || null,
        requestDateValue,
        signature || null,
        dateNeededValue,
        work_description || null,
        asset_tag || null,
        performed_by || null,
        dateCompletedValue,
        completion_remarks || null,
        submitted_by || null,
        submittedAt,
      ],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating maintenance request:", err);
    res.status(500).json({ message: err?.message || "Server error creating maintenance request" });
  }
});

app.patch("/api/maintenance_repair/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  try {
    const current = await fetchMaintenanceRequestById(id);
    if (!current) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    if (current.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be approved" });
    }

    const { rows } = await pool.query(
      `UPDATE maintenance_requests
          SET status = 'approved',
              approved_by = $1,
              approved_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [approved_by || null, id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error approving maintenance request:", err);
    res.status(500).json({ message: "Server error approving maintenance request" });
  }
});

app.patch("/api/maintenance_repair/:id/complete", async (req, res) => {
  const { id } = req.params;
  const { accomplished_by } = req.body;

  try {
    const current = await fetchMaintenanceRequestById(id);
    if (!current) {
      return res.status(404).json({ message: "Maintenance request not found" });
    }

    if (current.status !== "approved") {
      return res.status(409).json({ message: "Only approved requests can be marked completed" });
    }

    const { rows } = await pool.query(
      `UPDATE maintenance_requests
          SET status = 'completed',
              accomplished_by = $1,
              accomplished_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [accomplished_by || null, id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error completing maintenance request:", err);
    res.status(500).json({ message: "Server error completing maintenance request" });
  }
});

/* ------------------------
   OVERTIME REQUEST API
------------------------ */
app.get("/api/overtime_request/next-code", async (req, res) => {
  try {
    const nextCode = await getNextOvertimeRequestCode();
    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next overtime request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

const buildOvertimeResponse = async (rows) => {
  if (!rows.length) {
    return [];
  }

  const ids = rows.map((row) => row.id);
  const { rows: entryRows } = await pool.query(
    `SELECT *
       FROM overtime_entries
      WHERE request_id = ANY($1)
      ORDER BY ot_date ASC, time_from ASC`,
    [ids],
  );

  const entriesByRequest = entryRows.reduce((acc, entry) => {
    if (!acc[entry.request_id]) {
      acc[entry.request_id] = [];
    }
    acc[entry.request_id].push(entry);
    return acc;
  }, {});

  return rows.map((row) => ({
    ...row,
    entries: entriesByRequest[row.id] || [],
  }));
};

app.get("/api/overtime_request", async (req, res) => {
  const { role, userId, status } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (normalizedRole === "user") {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for user-level requests" });
      }
      params.push(Number(userId));
      clauses.push(`submitted_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *
         FROM overtime_requests
        ${whereClause}
        ORDER BY created_at DESC`,
      params,
    );

    const response = await buildOvertimeResponse(rows);
    res.json(response);
  } catch (err) {
    console.error("Error fetching overtime requests:", err);
    res.status(500).json({ message: "Server error fetching overtime requests" });
  }
});

app.get("/api/overtime_request/:id", async (req, res) => {
  const { id } = req.params;
  const { role, userId } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const request = await fetchOvertimeRequestById(id);
    if (!request) {
      return res.status(404).json({ message: "Overtime request not found" });
    }

    if (normalizedRole === "user" && Number(request.submitted_by) !== Number(userId)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    res.json(request);
  } catch (err) {
    console.error("Error fetching overtime request:", err);
    res.status(500).json({ message: "Server error fetching overtime request" });
  }
});

app.post("/api/overtime_request", async (req, res) => {
  const {
    requester_name,
    branch,
    department,
    employee_id,
    request_date,
    signature,
    cutoff_start,
    cutoff_end,
    entries = [],
    submitted_by,
  } = req.body;

  const status = "submitted";
  const requestDateValue = request_date ? new Date(request_date) : new Date();
  const cutoffStartValue = cutoff_start ? new Date(cutoff_start) : null;
  const cutoffEndValue = cutoff_end ? new Date(cutoff_end) : null;
  const submittedAt = new Date();

  const totalHours = entries.reduce(
    (acc, entry) => acc + calculateHoursBetween(entry.time_from, entry.time_to),
    0,
  );

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const formCode = await getNextOvertimeRequestCode();
    const insertRequest = await client.query(
      `INSERT INTO overtime_requests
        (form_code, status, requester_name, branch, department, employee_id, request_date,
         signature, cutoff_start, cutoff_end, total_hours, submitted_by, submitted_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())
       RETURNING *`,
      [
        formCode,
        status,
        requester_name || null,
        branch || null,
        department || null,
        employee_id || null,
        requestDateValue,
        signature || null,
        cutoffStartValue,
        cutoffEndValue,
        totalHours,
        submitted_by || null,
        submittedAt,
      ],
    );

    const requestId = insertRequest.rows[0].id;
    const savedEntries = [];

    for (const entry of entries) {
      const hours = calculateHoursBetween(entry.time_from, entry.time_to);
      const { rows: entryRows } = await client.query(
        `INSERT INTO overtime_entries
          (request_id, ot_date, time_from, time_to, purpose, hours)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          requestId,
          entry.ot_date ? new Date(entry.ot_date) : null,
          entry.time_from || null,
          entry.time_to || null,
          entry.purpose || null,
          hours,
        ],
      );
      savedEntries.push(entryRows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json({ ...insertRequest.rows[0], entries: savedEntries });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating overtime request:", err);
    res.status(500).json({ message: err?.message || "Server error creating overtime request" });
  } finally {
    client.release();
  }
});

app.patch("/api/overtime_request/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  try {
    const current = await fetchOvertimeRequestById(id);
    if (!current) {
      return res.status(404).json({ message: "Overtime request not found" });
    }

    if (current.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be approved" });
    }

    const { rows } = await pool.query(
      `UPDATE overtime_requests
          SET status = 'approved',
              approved_by = $1,
              approved_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [approved_by || null, id],
    );

    res.json(await fetchOvertimeRequestById(rows[0].id));
  } catch (err) {
    console.error("Error approving overtime request:", err);
    res.status(500).json({ message: "Server error approving overtime request" });
  }
});

app.patch("/api/overtime_request/:id/complete", async (req, res) => {
  const { id } = req.params;
  const { received_by } = req.body;

  try {
    const current = await fetchOvertimeRequestById(id);
    if (!current) {
      return res.status(404).json({ message: "Overtime request not found" });
    }

    if (current.status !== "approved") {
      return res.status(409).json({ message: "Only approved requests can be marked completed" });
    }

    const { rows } = await pool.query(
      `UPDATE overtime_requests
          SET status = 'completed',
              received_by = $1,
              received_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [received_by || null, id],
    );

    res.json(await fetchOvertimeRequestById(rows[0].id));
  } catch (err) {
    console.error("Error completing overtime request:", err);
    res.status(500).json({ message: "Server error completing overtime request" });
  }
});

/* ------------------------
   LEAVE APPLICATION API
------------------------ */
app.get("/api/leave_request/next-code", async (req, res) => {
  try {
    const nextCode = await getNextLeaveApplicationCode();
    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next leave application code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.get("/api/leave_request", async (req, res) => {
  const { role, userId, status, leave_type } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (leave_type) {
      params.push(leave_type);
      clauses.push(`leave_type = $${params.length}`);
    }

    if (normalizedRole === "user") {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for user-level requests" });
      }
      params.push(Number(userId));
      clauses.push(`submitted_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *
         FROM leave_requests
        ${whereClause}
        ORDER BY created_at DESC`,
      params,
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching leave requests:", err);
    res.status(500).json({ message: "Server error fetching leave requests" });
  }
});

app.get("/api/leave_request/:id", async (req, res) => {
  const { id } = req.params;
  const { role, userId } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const request = await fetchLeaveRequestById(id);
    if (!request) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (normalizedRole === "user" && Number(request.submitted_by) !== Number(userId)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    res.json(request);
  } catch (err) {
    console.error("Error fetching leave request:", err);
    res.status(500).json({ message: "Server error fetching leave request" });
  }
});

app.post("/api/leave_request", async (req, res) => {
  const {
    requester_name,
    employee_id,
    branch,
    department,
    position,
    request_date,
    signature,
    leave_type,
    leave_start,
    leave_end,
    leave_hours,
    purpose,
    submitted_by,
  } = req.body;

  const status = "submitted";
  const requestDateValue = request_date ? new Date(request_date) : new Date();
  const leaveStartValue = leave_start ? new Date(leave_start) : null;
  const leaveEndValue = leave_end ? new Date(leave_end) : null;
  const submittedAt = new Date();

  try {
    const formCode = await getNextLeaveApplicationCode();
    const { rows } = await pool.query(
      `INSERT INTO leave_requests
        (form_code, status, requester_name, branch, department, employee_id, position,
         request_date, signature, leave_type, leave_start, leave_end, leave_hours, purpose,
         submitted_by, submitted_at, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,NOW(),NOW())
       RETURNING *`,
      [
        formCode,
        status,
        requester_name || null,
        branch || null,
        department || null,
        employee_id || null,
        position || null,
        requestDateValue,
        signature || null,
        leave_type || null,
        leaveStartValue,
        leaveEndValue,
        Number(leave_hours) || 0,
        purpose || null,
        submitted_by || null,
        submittedAt,
      ],
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error("Error creating leave request:", err);
    res.status(500).json({ message: err?.message || "Server error creating leave request" });
  }
});

app.patch("/api/leave_request/:id/endorse", async (req, res) => {
  const { id } = req.params;
  const { endorsed_by } = req.body;

  try {
    const current = await fetchLeaveRequestById(id);
    if (!current) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (current.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be endorsed" });
    }

    const { rows } = await pool.query(
      `UPDATE leave_requests
          SET status = 'endorsed',
              endorsed_by = $1,
              endorsed_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [endorsed_by || null, id],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error endorsing leave request:", err);
    res.status(500).json({ message: "Server error endorsing leave request" });
  }
});

app.patch("/api/leave_request/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by, hr_notes, available_vacation, available_sick, available_emergency } = req.body;

  try {
    const current = await fetchLeaveRequestById(id);
    if (!current) {
      return res.status(404).json({ message: "Leave request not found" });
    }

    if (current.status !== "endorsed") {
      return res.status(409).json({ message: "Only endorsed requests can be approved" });
    }

    const { rows } = await pool.query(
      `UPDATE leave_requests
          SET status = 'approved',
              approved_by = $1,
              approved_at = NOW(),
              hr_notes = $2,
              available_vacation = $3,
              available_sick = $4,
              available_emergency = $5,
              updated_at = NOW()
        WHERE id = $6
        RETURNING *`,
      [
        approved_by || null,
        hr_notes || null,
        available_vacation !== undefined ? Number(available_vacation) : null,
        available_sick !== undefined ? Number(available_sick) : null,
        available_emergency !== undefined ? Number(available_emergency) : null,
        id,
      ],
    );

    res.json(rows[0]);
  } catch (err) {
    console.error("Error approving leave request:", err);
    res.status(500).json({ message: "Server error approving leave request" });
  }
});

/* ------------------------
   REVOLVING FUND API
------------------------ */
app.get("/api/revolving_fund/next-code", async (req, res) => {
  try {
    const nextCode = await getNextRevolvingFundCode();
    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next revolving fund code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.get("/api/cash_advance/next-code", async (req, res) => {
  try {
    const nextCode = await getNextCashAdvanceCode();
    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next cash advance code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

const normalizeRole = (role = "") => role.toString().trim().toLowerCase();

const isUserRole = (role) => normalizeRole(role) === "user";

const buildRevolvingFundResponse = async (requests) => {
  if (!requests.length) {
    return [];
  }

  const ids = requests.map((req) => req.id);
  const { rows: items } = await pool.query(
    `SELECT *
       FROM revolving_fund_items
      WHERE request_id = ANY($1)
      ORDER BY entry_date ASC, created_at ASC`,
    [ids],
  );

  const itemsByRequest = items.reduce((acc, item) => {
    if (!acc[item.request_id]) {
      acc[item.request_id] = [];
    }
    acc[item.request_id].push(item);
    return acc;
  }, {});

  return requests.map((request) => ({
    ...request,
    items: itemsByRequest[request.id] || [],
  }));
};

app.get("/api/revolving_fund", async (req, res) => {
  const { role, userId, status } = req.query;
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "staff") {
    return res.status(403).json({ message: "Staff accounts cannot access revolving fund requests" });
  }

  try {
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (isUserRole(role)) {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for staff-level users" });
      }
      params.push(Number(userId));
      clauses.push(`submitted_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *
         FROM revolving_fund_requests
        ${whereClause}
        ORDER BY created_at DESC`,
      params,
    );

    const response = await buildRevolvingFundResponse(rows);
    res.json(response);
  } catch (err) {
    console.error("Error fetching revolving fund requests:", err);
    res.status(500).json({ message: "Server error fetching revolving fund requests" });
  }
});

app.get("/api/revolving_fund/:id", async (req, res) => {
  const { id } = req.params;
  const { role, userId } = req.query;
  const normalizedRole = normalizeRole(role);

  if (normalizedRole === "staff") {
    return res.status(403).json({ message: "Staff accounts cannot access revolving fund requests" });
  }

  try {
    const request = await fetchRevolvingFundById(id);

    if (!request) {
      return res.status(404).json({ message: "Revolving fund request not found" });
    }

    if (isUserRole(role) && Number(request.submitted_by) !== Number(userId)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    res.json(request);
  } catch (err) {
    console.error("Error fetching revolving fund request:", err);
    res.status(500).json({ message: "Server error fetching revolving fund request" });
  }
});

app.post("/api/revolving_fund", async (req, res) => {
  const {
    custodian_name,
    branch,
    department,
    employee_id,
    petty_cash_amount,
    items = [],
    submitted_by,
    action = "draft",
    request_date,
  } = req.body;

  const status = action === "submit" ? "submitted" : "draft";
  const pettyCash = parseAmount(petty_cash_amount);
  const totalExpenses = items.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
  const cashOnHand = pettyCash - totalExpenses;
  const submittedAt = status === "submitted" ? new Date() : null;
  const requestDateValue = request_date ? new Date(request_date) : new Date();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const formCode = await getNextRevolvingFundCode();
    const insertRequest = await client.query(
      `INSERT INTO revolving_fund_requests
        (form_code, status, custodian_name, branch, department, employee_id, petty_cash_amount,
         total_expenses, cash_on_hand, submitted_by, submitted_at, request_date, created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,NOW(),NOW())
       RETURNING *`,
      [
        formCode,
        status,
        custodian_name || null,
        branch || null,
        department || null,
        employee_id || null,
        pettyCash,
        totalExpenses,
        cashOnHand,
        submitted_by || null,
        submittedAt,
        requestDateValue,
      ],
    );

    const requestId = insertRequest.rows[0].id;
    const savedItems = [];

    for (const item of items) {
      const { rows: itemInsertRows } = await client.query(
        `INSERT INTO revolving_fund_items
          (request_id, entry_date, voucher_no, or_ref_no, amount, expense_category, gl_account, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          requestId,
          item.entry_date || item.date || null,
          item.voucher_no || null,
          item.or_ref_no || null,
          parseAmount(item.amount),
          item.expense_category || null,
          item.gl_account || null,
          item.remarks || null,
        ],
      );
      savedItems.push(itemInsertRows[0]);
    }

    await client.query("COMMIT");

    res.status(201).json({ ...insertRequest.rows[0], items: savedItems });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating revolving fund request:", err);
    res.status(500).json({
      message: err?.message || "Server error creating revolving fund request",
    });
  } finally {
    client.release();
  }
});

app.put("/api/revolving_fund/:id", async (req, res) => {
  const { id } = req.params;
  const {
    custodian_name,
    branch,
    department,
    employee_id,
    petty_cash_amount,
    items = [],
  } = req.body;

  const pettyCash = parseAmount(petty_cash_amount);
  const totalExpenses = items.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
  const cashOnHand = pettyCash - totalExpenses;
  const requestDateValue = req.body.request_date ? new Date(req.body.request_date) : new Date();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT *
         FROM revolving_fund_requests
        WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Revolving fund request not found" });
    }

    const currentStatus = existing.rows[0].status;
    if (!["draft", "rejected"].includes(currentStatus)) {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Only draft or rejected requests can be edited" });
    }

    const updatedRequest = await client.query(
      `UPDATE revolving_fund_requests
          SET custodian_name = $1,
              branch = $2,
              department = $3,
              employee_id = $4,
              petty_cash_amount = $5,
              total_expenses = $6,
              cash_on_hand = $7,
              request_date = $8,
              updated_at = NOW()
        WHERE id = $9
        RETURNING *`,
      [
        custodian_name || null,
        branch || null,
        department || null,
        employee_id || null,
        pettyCash,
        totalExpenses,
        cashOnHand,
        requestDateValue,
        id,
      ],
    );

    await client.query("DELETE FROM revolving_fund_items WHERE request_id = $1", [id]);
    const savedItems = [];

    for (const item of items) {
      const { rows: itemInsertRows } = await client.query(
        `INSERT INTO revolving_fund_items
          (request_id, entry_date, voucher_no, or_ref_no, amount, expense_category, gl_account, remarks)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
         RETURNING *`,
        [
          id,
          item.entry_date || item.date || null,
          item.voucher_no || null,
          item.or_ref_no || null,
          parseAmount(item.amount),
          item.expense_category || null,
          item.gl_account || null,
          item.remarks || null,
        ],
      );
      savedItems.push(itemInsertRows[0]);
    }

    await client.query("COMMIT");
    res.json({ ...updatedRequest.rows[0], items: savedItems });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating revolving fund request:", err);
    res.status(500).json({ message: "Server error updating revolving fund request" });
  } finally {
    client.release();
  }
});

app.patch("/api/revolving_fund/:id/submit", async (req, res) => {
  const { id } = req.params;
  const { submitted_by } = req.body;

  try {
    const request = await fetchRevolvingFundById(id);
    if (!request) {
      return res.status(404).json({ message: "Revolving fund request not found" });
    }

    if (!["draft", "rejected"].includes(request.status)) {
      return res.status(409).json({ message: "Only draft or rejected requests can be submitted" });
    }

    const { rows } = await pool.query(
      `UPDATE revolving_fund_requests
          SET status = 'submitted',
              submitted_by = COALESCE($1, submitted_by),
              submitted_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [submitted_by || request.submitted_by || null, id],
    );

    const response = await fetchRevolvingFundById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error submitting revolving fund request:", err);
    res.status(500).json({ message: "Server error submitting revolving fund request" });
  }
});

app.patch("/api/revolving_fund/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  try {
    const request = await fetchRevolvingFundById(id);
    if (!request) {
      return res.status(404).json({ message: "Revolving fund request not found" });
    }

    if (request.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be approved" });
    }

    const { rows } = await pool.query(
      `UPDATE revolving_fund_requests
          SET status = 'approved',
              approved_by = $1,
              approved_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [approved_by || null, id],
    );

    const response = await fetchRevolvingFundById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error approving revolving fund request:", err);
    res.status(500).json({ message: "Server error approving revolving fund request" });
  }
});

app.patch("/api/revolving_fund/:id/reject", async (req, res) => {
  const { id } = req.params;
  const { rejected_by, reason = null } = req.body;

  try {
    const request = await fetchRevolvingFundById(id);
    if (!request) {
      return res.status(404).json({ message: "Revolving fund request not found" });
    }

    if (request.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be rejected" });
    }

    const { rows } = await pool.query(
      `UPDATE revolving_fund_requests
          SET status = 'rejected',
              rejected_by = $1,
              rejected_reason = $2,
              rejected_at = NOW(),
              updated_at = NOW()
        WHERE id = $3
        RETURNING *`,
      [rejected_by || null, reason || null, id],
    );

    const response = await fetchRevolvingFundById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error rejecting revolving fund request:", err);
    res.status(500).json({ message: "Server error rejecting revolving fund request" });
  }
});


/* ------------------------
   START SERVER
------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});





/* ------------------------
   CASH ADVANCE API
------------------------ */
app.get("/api/cash_advance", async (req, res) => {
  const { role, userId, status } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const clauses = [];
    const params = [];

    if (status) {
      params.push(status);
      clauses.push(`status = $${params.length}`);
    }

    if (normalizedRole === "user") {
      if (!userId) {
        return res.status(400).json({ message: "userId is required for user-level requests" });
      }
      params.push(Number(userId));
      clauses.push(`submitted_by = $${params.length}`);
    }

    const whereClause = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
    const { rows } = await pool.query(
      `SELECT *
         FROM cash_advance_requests
        ${whereClause}
        ORDER BY created_at DESC`,
      params,
    );

    const ids = rows.map((row) => row.id);
    let itemsByRequest = {};
    if (ids.length) {
      const { rows: itemRows } = await pool.query(
        `SELECT *
           FROM cash_advance_items
          WHERE request_id = ANY($1)
          ORDER BY created_at ASC`,
        [ids],
      );

      itemsByRequest = itemRows.reduce((acc, item) => {
        if (!acc[item.request_id]) {
          acc[item.request_id] = [];
        }
        acc[item.request_id].push(item);
        return acc;
      }, {});
    }

    const response = rows.map((row) => ({
      ...row,
      items: itemsByRequest[row.id] || [],
    }));

    res.json(response);
  } catch (err) {
    console.error("Error fetching cash advance requests:", err);
    res.status(500).json({ message: "Server error fetching cash advance requests" });
  }
});

app.get("/api/cash_advance/:id", async (req, res) => {
  const { id } = req.params;
  const { role, userId } = req.query;
  const normalizedRole = normalizeRole(role);

  try {
    const request = await fetchCashAdvanceById(id);

    if (!request) {
      return res.status(404).json({ message: "Cash advance request not found" });
    }

    if (normalizedRole === "user" && Number(request.submitted_by) !== Number(userId)) {
      return res.status(403).json({ message: "You do not have access to this record" });
    }

    res.json(request);
  } catch (err) {
    console.error("Error fetching cash advance request:", err);
    res.status(500).json({ message: "Server error fetching cash advance request" });
  }
});

app.post("/api/cash_advance", async (req, res) => {
  const {
    custodian_name,
    branch,
    department,
    employee_id,
    request_date,
    signature,
    nature_of_activity,
    inclusive_dates,
    purpose,
    items = [],
    submitted_by,
  } = req.body;

  const status = "submitted";
  const requestDateValue = request_date ? new Date(request_date) : new Date();
  const totalAmount = items.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);
  const submittedAt = new Date();

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const formCode = await getNextCashAdvanceCode();
    const insertRequest = await client.query(
      `INSERT INTO cash_advance_requests
        (form_code, status, custodian_name, branch, department, employee_id, request_date,
         signature, nature_of_activity, inclusive_dates, purpose, total_amount, submitted_by, submitted_at,
         created_at, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW(),NOW())
       RETURNING *`,
      [
        formCode,
        status,
        custodian_name || null,
        branch || null,
        department || null,
        employee_id || null,
        requestDateValue,
        signature || null,
        nature_of_activity || null,
        inclusive_dates || null,
        purpose || null,
        totalAmount,
        submitted_by || null,
        submittedAt,
      ],
    );

    const requestId = insertRequest.rows[0].id;
    const savedItems = [];

    for (const item of items) {
      const { rows: itemInsertRows } = await client.query(
        `INSERT INTO cash_advance_items
          (request_id, description, amount, expense_category, store_branch, remarks)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          requestId,
          item.description || null,
          parseAmount(item.amount),
          item.expense_category || null,
          item.store_branch || null,
          item.remarks || null,
        ],
      );
      savedItems.push(itemInsertRows[0]);
    }

    await client.query("COMMIT");
    res.status(201).json({ ...insertRequest.rows[0], items: savedItems });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error creating cash advance request:", err);
    res.status(500).json({ message: err?.message || "Server error creating cash advance request" });
  } finally {
    client.release();
  }
});

app.put("/api/cash_advance/:id", async (req, res) => {
  const { id } = req.params;
  const {
    custodian_name,
    branch,
    department,
    employee_id,
    request_date,
    signature,
    nature_of_activity,
    inclusive_dates,
    purpose,
    items = [],
  } = req.body;

  const requestDateValue = request_date ? new Date(request_date) : new Date();
  const totalAmount = items.reduce((acc, curr) => acc + parseAmount(curr.amount), 0);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const existing = await client.query(
      `SELECT *
         FROM cash_advance_requests
        WHERE id = $1`,
      [id],
    );

    if (existing.rows.length === 0) {
      await client.query("ROLLBACK");
      return res.status(404).json({ message: "Cash advance request not found" });
    }

    const currentStatus = existing.rows[0].status;
    if (currentStatus !== "submitted" && currentStatus !== "draft" && currentStatus !== "rejected") {
      await client.query("ROLLBACK");
      return res.status(409).json({ message: "Only draft, submitted, or rejected requests can be edited" });
    }

    const updatedRequest = await client.query(
      `UPDATE cash_advance_requests
          SET custodian_name = $1,
              branch = $2,
              department = $3,
              employee_id = $4,
              request_date = $5,
              signature = $6,
              nature_of_activity = $7,
              inclusive_dates = $8,
              purpose = $9,
              total_amount = $10,
              updated_at = NOW()
        WHERE id = $11
        RETURNING *`,
      [
        custodian_name || null,
        branch || null,
        department || null,
        employee_id || null,
        requestDateValue,
        signature || null,
        nature_of_activity || null,
        inclusive_dates || null,
        purpose || null,
        totalAmount,
        id,
      ],
    );

    await client.query("DELETE FROM cash_advance_items WHERE request_id = $1", [id]);
    const savedItems = [];

    for (const item of items) {
      const { rows: itemInsertRows } = await client.query(
        `INSERT INTO cash_advance_items
          (request_id, description, amount, expense_category, store_branch, remarks)
         VALUES ($1,$2,$3,$4,$5,$6)
         RETURNING *`,
        [
          id,
          item.description || null,
          parseAmount(item.amount),
          item.expense_category || null,
          item.store_branch || null,
          item.remarks || null,
        ],
      );
      savedItems.push(itemInsertRows[0]);
    }

    await client.query("COMMIT");
    res.json({ ...updatedRequest.rows[0], items: savedItems });
  } catch (err) {
    await client.query("ROLLBACK");
    console.error("Error updating cash advance request:", err);
    res.status(500).json({ message: "Server error updating cash advance request" });
  } finally {
    client.release();
  }
});

app.patch("/api/cash_advance/:id/approve", async (req, res) => {
  const { id } = req.params;
  const { approved_by } = req.body;

  try {
    const request = await fetchCashAdvanceById(id);
    if (!request) {
      return res.status(404).json({ message: "Cash advance request not found" });
    }

    if (request.status !== "submitted") {
      return res.status(409).json({ message: "Only submitted requests can be approved" });
    }

    const { rows } = await pool.query(
      `UPDATE cash_advance_requests
          SET status = 'approved',
              approved_by = $1,
              approved_at = NOW(),
              updated_at = NOW()
        WHERE id = $2
        RETURNING *`,
      [approved_by || null, id],
    );

    const response = await fetchCashAdvanceById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error approving cash advance request:", err);
    res.status(500).json({ message: "Server error approving cash advance request" });
  }
});

app.patch("/api/cash_advance/:id/release", async (req, res) => {
  const { id } = req.params;
  const { release_method, check_number, bank_gl_code, released_by } = req.body;

  try {
    const request = await fetchCashAdvanceById(id);
    if (!request) {
      return res.status(404).json({ message: "Cash advance request not found" });
    }

    if (request.status !== "approved") {
      return res.status(409).json({ message: "Only approved requests can be released" });
    }

    const { rows } = await pool.query(
      `UPDATE cash_advance_requests
          SET release_method = $1,
              check_number = $2,
              bank_gl_code = $3,
              released_by = $4,
              released_at = NOW(),
              updated_at = NOW()
        WHERE id = $5
        RETURNING *`,
      [
        release_method || null,
        check_number || null,
        bank_gl_code || null,
        released_by || null,
        id,
      ],
    );

    const response = await fetchCashAdvanceById(rows[0].id);
    res.json(response);
  } catch (err) {
    console.error("Error releasing cash advance request:", err);
    res.status(500).json({ message: "Server error releasing cash advance request" });
  }
});


/* ------------------------
   REVOLVING FUND API
------------------------ */

