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

app.get("/api/user_access", async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM user_access ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching user access data:", err);
    res.status(500).json({ message: "Server error fetching user access data" });
  }
});

app.post("/api/user_access", async (req, res) => {
  const { user_id, employee_id, name, email, access_forms, role } = req.body;

  if (!employee_id || !name || !email) {
    return res.status(400).json({ message: "Employee ID, name, and email are required" });
  }

  try {
    const result = await pool.query(
      `INSERT INTO user_access (user_id, employee_id, name, email, access_forms, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [user_id, employee_id, name, email, access_forms, role]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding user access record:", err);
    res.status(500).json({ message: "Server error adding user access record" });
  }
});

app.put("/api/user_access/:id", async (req, res) => {
  const { id } = req.params;
  const { access_forms, role } = req.body;

  try {
    const result = await pool.query(
      `UPDATE user_access 
       SET access_forms = $1, role = $2
       WHERE id = $3
       RETURNING *`,
      [access_forms, role, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "User access record not found" });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating user access record:", err);
    res.status(500).json({ message: "Server error updating user access record" });
  }
});

app.delete("/api/user_access/:id", async (req, res) => {
  const { id } = req.params;

  try {
    await pool.query("DELETE FROM user_access WHERE id = $1", [id]);
    res.json({ message: "User access record deleted successfully" });
  } catch (err) {
    console.error("Error deleting user access record:", err);
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
    items,
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

    for (const item of items) {
      await pool.query(
        `INSERT INTO purchase_item (purchase_request_id, quantity, purchase_item)
         VALUES ($1, $2, $3)`,
        [purchase_request_id, purchase_item.quantity, purchase_item.purchase_item]
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
   START SERVER
------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
