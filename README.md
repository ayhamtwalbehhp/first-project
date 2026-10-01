# Expense Tracker

A small full-stack app for tracking personal expenses: add, edit, delete,
and filter them by category, with live totals. The frontend (HTML/CSS/JS +
Bootstrap) talks to an Express + PostgreSQL API over fetch.

## How to run

**Backend**

1. Open a terminal in `backend/`.
2. Create an empty PostgreSQL database named `expense_tracker` (e.g. from pgAdmin).
3. Run `schema.sql` against that database (in pgAdmin: right-click the database
   → Query Tool → open `schema.sql` → run it). This creates the `expenses`
   table and adds sample rows.
4. Copy `.env.example` to a new file named `.env` and fill in your PostgreSQL
   password (and username/port if they differ from the defaults).
5. Install dependencies: `npm install`
6. Start the server: `node server.js`
   You should see: `Expense Tracker API running on http://localhost:3000`
   Leave this running - the frontend needs it.

**Frontend**

1. Open `frontend/index.html` with the VS Code "Live Server" extension
   (right-click the file → "Open with Live Server").
2. The page loads its data from `http://localhost:3000/api/expenses`, so the
   backend must already be running (see above).


https://1drv.ms/v/c/d8c94f481828fabb/IQB_sqSBWllvSqubVC38gf3dASWuUkOMX9oFP4LWkG0h7_w?e=TuBfCQ
