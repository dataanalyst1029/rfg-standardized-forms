/* eslint-env node */
import process from "node:process";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pkg from "pg";
import bcrypt from "bcryptjs";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

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
  role: user.role,
  name: user.name, 
  email: user.email,
  employee_id: user.employee_id
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

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { employee_id, name, email, role } = req.body;

  try {
    const result = await pool.query(
      `UPDATE users 
       SET employee_id = $1, name = $2, email = $3, role = $4 
       WHERE id = $5 
       RETURNING id, employee_id, name, email, role`,
      [employee_id, name, email, role, id]
    );

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
   USER ACCESS ROUTES
------------------------ */

// ✅ Get all user access records
app.get("/api/user_access", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM user_access ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Error fetching user access data:", err);
    res.status(500).json({ message: "Server error fetching user access data" });
  }
});

// ✅ Add a new user access record
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

// ✅ Update an existing user access record
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


// ✅ Delete a user access record
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
      const nextNum = String(lastNum + 1).padStart(3, "0");
      nextCode = `PR-${year}-${nextNum}`;
    } else {
      nextCode = `PR-${year}-001`;
    }

    res.json({ nextCode });
  } catch (err) {
    console.error("Error generating next purchase request code:", err);
    res.status(500).json({ message: "Server error generating next code" });
  }
});

app.post("/api/purchase_request", async (req, res) => {
  const {
    purchase_request_code,
    request_date,
    requested_by,
    contact_number,
    branch,
    department,
    address,
    purpose,
    items = [],
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO purchase_request 
       (purchase_request_code, request_date, requested_by, contact_number, branch, department, address, purpose)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [
        purchase_request_code,
        request_date,
        requested_by,
        contact_number,
        branch,
        department,
        address,
        purpose,
      ]
    );

    const requestId = result.rows[0]?.id;

    if (!requestId) {
      throw new Error("Failed to retrieve purchase request id");
    }

    const sanitizedItems = Array.isArray(items)
      ? items
          .map((item) => ({
            quantity: item.quantity,
            purchase_item: item.purchase_item?.trim(),
          }))
          .filter(
            (item) =>
              item.purchase_item &&
              item.quantity !== undefined &&
              item.quantity !== null &&
              String(item.quantity).trim() !== "",
          )
      : [];

    for (const item of sanitizedItems) {
      await pool.query(
        `INSERT INTO purchase_item (purchase_request_id, quantity, purchase_item)
         VALUES ($1, $2, $3)`,
        [requestId, item.quantity, item.purchase_item]
      );
    }

    res.status(201).json({
      success: true,
      message: "Purchase Request saved successfully!",
      data: result.rows[0],
    });
  } catch (err) {
    console.error("Error saving purchase request:", err);
    res.status(500).json({ message: "Server error saving purchase request" });
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

// ✅ GET all departments with branch name
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

// ✅ CREATE a new department
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

// ✅ UPDATE an existing department
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

// ✅ DELETE a department
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
   START SERVER
------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
