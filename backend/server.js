// Expense Tracker - backend (Express API + PostgreSQL)
//
// PHASE 1
// Setup:
//   1. Create a database named expense_tracker and run schema.sql on it.
//   2. Copy .env.example to a new file named .env and write your PostgreSQL password.
//   3. npm install express cors pg dotenv
// Run:    node server.js   (restart it every time you change this file)

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = 3000;

// Every incoming request with a JSON body gets parsed into req.body
app.use(express.json());

// Lets the frontend (a different origin: file:// or a Live Server port)
// call this API from the browser.
app.use(cors());

// One shared connection pool, built from the values in .env.
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

const ALLOWED_CATEGORIES = ["Food", "Transport", "Bills", "Entertainment", "Other"];

// Reused in every SELECT / RETURNING so the API always sends the same shape:
//   - amount as a real number (pg sends NUMERIC back as a string otherwise)
//   - date as DD-MM-YYYY text (pg sends DATE back as a JS Date otherwise)
const EXPENSE_COLUMNS = `
  id,
  title,
  amount::float8 AS amount,
  category,
  to_char(date, 'DD-MM-YYYY') AS date
`;

// ---- validation -----------------------------------------------------

// Checks one expense payload (from POST or PUT) and returns either
// { valid: true } or { valid: false, message: "..." }.
// The date is expected as YYYY-MM-DD, which is what an
// <input type="date"> sends and what PostgreSQL's DATE column parses.
function validateExpense(body) {
  const { title, amount, category, date } = body;

  if (typeof title !== "string" || title.trim() === "") {
    return { valid: false, message: "title is required." };
  }
  if (title.trim().length > 100) {
    return { valid: false, message: "title must be 100 characters or fewer." };
  }

  const amountNumber = Number(amount);
  if (typeof amount === "boolean" || amount === null || amount === "" || Number.isNaN(amountNumber)) {
    return { valid: false, message: "amount must be a number." };
  }
  if (amountNumber <= 0) {
    return { valid: false, message: "amount must be greater than 0." };
  }

  if (!ALLOWED_CATEGORIES.includes(category)) {
    return {
      valid: false,
      message: `category must be one of: ${ALLOWED_CATEGORIES.join(", ")}.`,
    };
  }

  if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date))) {
    return { valid: false, message: "date must be a valid date in YYYY-MM-DD format." };
  }

  return { valid: true };
}

// A route param like ":id" always arrives as a string ("abc" included).
// This turns it into a positive integer, or null if it isn't one.
function parseId(rawId) {
  if (!/^\d+$/.test(rawId)) return null;
  return Number(rawId);
}

// ---- routes -----------------------------------------------------------

// GET /api/expenses - return every expense
app.get("/api/expenses", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT ${EXPENSE_COLUMNS} FROM expenses ORDER BY date DESC, id DESC`
    );
    res.status(200).json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong reading expenses." });
  }
});

// GET /api/expenses/:id - return one expense, 404 if it doesn't exist
app.get("/api/expenses/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(404).json({ message: "Expense not found." });
  }

  try {
    const result = await pool.query(
      `SELECT ${EXPENSE_COLUMNS} FROM expenses WHERE id = $1`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong reading the expense." });
  }
});

// POST /api/expenses - add a new expense
app.post("/api/expenses", async (req, res) => {
  const check = validateExpense(req.body);
  if (!check.valid) {
    return res.status(400).json({ message: check.message });
  }

  const { title, amount, category, date } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO expenses (title, amount, category, date)
       VALUES ($1, $2, $3, $4)
       RETURNING ${EXPENSE_COLUMNS}`,
      [title.trim(), amount, category, date]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong adding the expense." });
  }
});

// PUT /api/expenses/:id - update an existing expense
app.put("/api/expenses/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(404).json({ message: "Expense not found." });
  }

  const check = validateExpense(req.body);
  if (!check.valid) {
    return res.status(400).json({ message: check.message });
  }

  const { title, amount, category, date } = req.body;

  try {
    const result = await pool.query(
      `UPDATE expenses
       SET title = $1, amount = $2, category = $3, date = $4
       WHERE id = $5
       RETURNING ${EXPENSE_COLUMNS}`,
      [title.trim(), amount, category, date, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong updating the expense." });
  }
});

// DELETE /api/expenses/:id - delete an expense
app.delete("/api/expenses/:id", async (req, res) => {
  const id = parseId(req.params.id);
  if (id === null) {
    return res.status(404).json({ message: "Expense not found." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM expenses WHERE id = $1 RETURNING id",
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Expense not found." });
    }
    res.status(200).json({ message: "Expense deleted.", id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Something went wrong deleting the expense." });
  }
});

app.listen(PORT, () => {
  console.log(`Expense Tracker API running on http://localhost:${PORT}`);
});
