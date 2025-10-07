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

// PostgreSQL connection setup
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Verify connection
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

    res.json({ success: true, message: "Login successful!", role: user.role });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

/* ------------------------
   USERS CRUD API
------------------------ */

// ✅ Get all users
app.get("/api/users", async (req, res) => {
  try {
    const result = await pool.query("SELECT id, employee_id, name, email, role FROM users ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching users:", err);
    res.status(500).json({ message: "Server error fetching users" });
  }
});

// ✅ Add new user (with employee_id)
app.post("/api/users", async (req, res) => {
  const { employee_id, name, email, role, password } = req.body;

  if (!name || !email || !employee_id) {
    return res.status(400).json({ message: "Employee ID, name, and email are required" });
  }

  try {
    // 🔍 Check for duplicate email
    const existingEmail = await pool.query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingEmail.rows.length > 0) {
      return res.status(400).json({ message: "Email already exists" });
    }

    // 🔍 Check for duplicate employee_id
    const existingEmp = await pool.query("SELECT * FROM users WHERE employee_id = $1", [employee_id]);
    if (existingEmp.rows.length > 0) {
      return res.status(400).json({ message: "Employee ID already exists" });
    }

    // 🔐 Hash password (default if blank)
    const hashedPassword = await bcrypt.hash(password || "123456", 10);

    // 💾 Insert new user
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

// ✅ Update user
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

// ✅ Delete user
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
    console.error("Error fetching user access data:", err);
    res.status(500).json({ message: "Server error fetching user access data" });
  }
});

// ✅ Add a new user access record
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

// ✅ Update a user access record
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

// ✅ Delete a user access record
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
   START SERVER
------------------------ */
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
