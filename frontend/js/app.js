// Expense Tracker - frontend logic
//
// PHASE 2
// The backend from Phase 1 is already running, with real expenses in the
// database (see schema.sql). Every action below talks to it with fetch -
// there is no in-memory or localStorage copy: refresh() always re-asks the
// server for the current list after add / edit / delete.
//
// The API sends amount as a number and date as text in DD-MM-YYYY format
// (see backend/server.js, EXPENSE_COLUMNS). An <input type="date"> needs
// YYYY-MM-DD, so toInputDate() below converts back the other way when we
// fill in the edit form.

const API_URL = "http://localhost:3000/api/expenses";

const CATEGORY_BADGE = {
  Food: "success",
  Transport: "info",
  Bills: "warning",
  Entertainment: "primary",
  Other: "secondary",
};

// in-memory copy of the last list the server sent us, so filtering and the
// summary cards don't need a new request every time
let allExpenses = [];

// ---- DOM references ----------------------------------------------------

const spinner = document.getElementById("spinner");
const alertPlaceholder = document.getElementById("alertPlaceholder");
const tableBody = document.getElementById("expensesTableBody");
const emptyMessage = document.getElementById("emptyMessage");
const categoryFilter = document.getElementById("categoryFilter");

const expenseForm = document.getElementById("expenseForm");
const titleInput = document.getElementById("title");
const amountInput = document.getElementById("amount");
const categoryInput = document.getElementById("category");
const dateInput = document.getElementById("date");

const editModalEl = document.getElementById("editModal");
const editModal = new bootstrap.Modal(editModalEl);
const editForm = document.getElementById("editForm");
const editIdInput = document.getElementById("editId");
const editTitleInput = document.getElementById("editTitle");
const editAmountInput = document.getElementById("editAmount");
const editCategoryInput = document.getElementById("editCategory");
const editDateInput = document.getElementById("editDate");

// ---- small helpers ------------------------------------------------------

function showSpinner() {
  spinner.classList.remove("d-none");
}
function hideSpinner() {
  spinner.classList.add("d-none");
}

function showAlert(message, type = "danger") {
  alertPlaceholder.innerHTML = `
    <div class="alert alert-${type} alert-dismissible fade show" role="alert">
      ${message}
      <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    </div>`;
}

function formatMoney(amount) {
  return `$${Number(amount).toFixed(2)}`;
}

// "15-01-2026" -> "2026-01-15" (what <input type="date"> expects)
function toInputDate(ddmmyyyy) {
  const [day, month, year] = ddmmyyyy.split("-");
  return `${year}-${month}-${day}`;
}

// ---- API calls ----------------------------------------------------------

async function getExpenses() {
  const response = await fetch(API_URL);
  if (!response.ok) throw new Error("Could not load expenses.");
  return response.json();
}

async function addExpense(data) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Could not add expense.");
  return body;
}

async function updateExpense(id, data) {
  const response = await fetch(`${API_URL}/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Could not update expense.");
  return body;
}

async function deleteExpense(id) {
  const response = await fetch(`${API_URL}/${id}`, { method: "DELETE" });
  const body = await response.json();
  if (!response.ok) throw new Error(body.message || "Could not delete expense.");
  return body;
}

// ---- rendering ------------------------------------------------------------

// Summary always looks at every expense, never the filtered list.
function renderSummary(list) {
  const total = list.reduce((sum, e) => sum + Number(e.amount), 0);
  const highest = list.length ? Math.max(...list.map((e) => Number(e.amount))) : 0;

  document.getElementById("summaryTotal").textContent = formatMoney(total);
  document.getElementById("summaryCount").textContent = list.length;
  document.getElementById("summaryHighest").textContent = formatMoney(highest);
}

function renderTable(list) {
  tableBody.innerHTML = "";
  emptyMessage.classList.toggle("d-none", list.length > 0);

  for (const expense of list) {
    const tr = document.createElement("tr");

    const badgeColor = CATEGORY_BADGE[expense.category] || "secondary";

    tr.innerHTML = `
      <td>${expense.title}</td>
      <td>${formatMoney(expense.amount)}</td>
      <td><span class="badge text-bg-${badgeColor}">${expense.category}</span></td>
      <td>${expense.date}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary me-1 edit-btn">Edit</button>
        <button class="btn btn-sm btn-outline-danger delete-btn">Delete</button>
      </td>`;

    tr.querySelector(".edit-btn").addEventListener("click", () => openEditModal(expense));
    tr.querySelector(".delete-btn").addEventListener("click", () => handleDelete(expense.id));

    tableBody.appendChild(tr);
  }
}

function applyFilter() {
  const selected = categoryFilter.value;
  const filtered =
    selected === "All" ? allExpenses : allExpenses.filter((e) => e.category === selected);
  renderTable(filtered);
}

// ---- load / refresh ---------------------------------------------------

async function refresh() {
  showSpinner();
  try {
    allExpenses = await getExpenses();
    renderSummary(allExpenses);
    applyFilter();
  } catch (err) {
    showAlert(
      "Could not reach the server. Make sure the backend (node server.js) is running, then reload the page."
    );
  } finally {
    hideSpinner();
  }
}

// ---- add expense form ---------------------------------------------------

expenseForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!expenseForm.checkValidity()) {
    event.stopPropagation();
    expenseForm.classList.add("was-validated");
    return;
  }

  const data = {
    title: titleInput.value.trim(),
    amount: Number(amountInput.value),
    category: categoryInput.value,
    date: dateInput.value,
  };

  try {
    await addExpense(data);
    expenseForm.reset();
    expenseForm.classList.remove("was-validated");
    await refresh();
  } catch (err) {
    showAlert(err.message);
  }
});

// ---- filter -------------------------------------------------------------

categoryFilter.addEventListener("change", applyFilter);

// ---- edit modal ---------------------------------------------------------

function openEditModal(expense) {
  editIdInput.value = expense.id;
  editTitleInput.value = expense.title;
  editAmountInput.value = expense.amount;
  editCategoryInput.value = expense.category;
  editDateInput.value = toInputDate(expense.date);
  editForm.classList.remove("was-validated");
  editModal.show();
}

editForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!editForm.checkValidity()) {
    event.stopPropagation();
    editForm.classList.add("was-validated");
    return;
  }

  const id = editIdInput.value;
  const data = {
    title: editTitleInput.value.trim(),
    amount: Number(editAmountInput.value),
    category: editCategoryInput.value,
    date: editDateInput.value,
  };

  try {
    await updateExpense(id, data);
    editModal.hide();
    await refresh();
  } catch (err) {
    showAlert(err.message);
  }
});

// ---- delete ---------------------------------------------------------------

async function handleDelete(id) {
  if (!confirm("Delete this expense?")) return;
  try {
    await deleteExpense(id);
    await refresh();
  } catch (err) {
    showAlert(err.message);
  }
}

// ---- initial load ---------------------------------------------------------

refresh();
