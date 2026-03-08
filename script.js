/* ===================================================
   GitHub Issues Tracker – script.js
   =================================================== */

"use strict";

/* ── Constants ──────────────────────────────────── */
const CREDENTIALS = { username: "admin", password: "admin123" };
const API_BASE = "https://phi-lab-server.vercel.app/api/v1/lab";

/* ── State ──────────────────────────────────────── */
let allIssues = [];       // raw data from API
let activeTab = "all";    // "all" | "open" | "closed"
let searchDebounce = null;

/* ── DOM References ─────────────────────────────── */
const loginPage      = document.getElementById("login-page");
const mainPage       = document.getElementById("main-page");
const loginForm      = document.getElementById("login-form");
const loginError     = document.getElementById("login-error");
const spinner        = document.getElementById("spinner");
const issuesGrid     = document.getElementById("issues-grid");
const issuesCountTxt = document.getElementById("issues-count-text");
const openCountEl    = document.getElementById("open-count");
const closedCountEl  = document.getElementById("closed-count");
const tabBtns        = document.querySelectorAll(".tab-btn");
const searchInput    = document.getElementById("search-input");
const modalOverlay   = document.getElementById("modal-overlay");
const modalContent   = document.getElementById("modal-content");
const modalCloseX    = document.getElementById("modal-close-x");
const btnModalClose  = document.getElementById("btn-modal-close");

/* ── Utility Helpers ────────────────────────────── */
const showSpinner = () => {
  spinner.classList.remove("hidden");
  spinner.classList.add("flex");
};
const hideSpinner = () => {
  spinner.classList.remove("flex");
  spinner.classList.add("hidden");
};

function formatDate(iso) {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
}

function getLabelClass(label) {
  const map = {
    "bug":             "bg-[#fff0f0] text-[#cf222e] border-[#ffb8b8]",
    "enhancement":     "bg-[#ddf4ff] text-[#0969da] border-[#b6e3ff]",
    "documentation":   "bg-[#dafbe1] text-[#1a7f37] border-[#aceebb]",
    "help wanted":     "bg-[#ffd8b2] text-[#953800] border-[#ffc68a]",
    "good first issue":"bg-[#e6f4d7] text-[#2d6a0a] border-[#b4e28a]",
  };
  return map[label.toLowerCase()] || "bg-[#f6f8fa] text-[#57606a] border-[#d0d7de]";
}

function buildLabelsHTML(labels = []) {
  return labels
    .map(
      (l) =>
        `<span class="text-[11px] font-medium px-2 py-0.5 rounded-full border ${getLabelClass(l)}">${l}</span>`
    )
    .join("");
}

/* Open / Closed image icons */
const openIcon   = `<img src="assets/Open-Status.png"   alt="Open"   width="16" height="16" style="display:inline-block;vertical-align:middle;object-fit:contain;" />`;
const closedIcon = `<img src="assets/Closed- Status .png" alt="Closed" width="16" height="16" style="display:inline-block;vertical-align:middle;object-fit:contain;" />`;

/* ── Login ──────────────────────────────────────── */
loginForm.addEventListener("submit", function (e) {
  e.preventDefault();
  const user = document.getElementById("username").value.trim();
  const pass = document.getElementById("password").value.trim();

  if (user === CREDENTIALS.username && pass === CREDENTIALS.password) {
    loginError.classList.add("hidden");
    loginPage.classList.add("hidden");
    mainPage.classList.remove("hidden");
    mainPage.style.display = "flex";
    loadIssues();
  } else {
    loginError.classList.remove("hidden");
  }
});

/* ── Fetch Issues ───────────────────────────────── */
async function loadIssues() {
  showSpinner();
  try {
    const res = await fetch(`${API_BASE}/issues`);
    if (!res.ok) throw new Error("Network response was not ok");
    const json = await res.json();
    allIssues = json.data || [];
    updateCounts();
    renderIssues();
  } catch (err) {
    issuesGrid.innerHTML = `<div class="col-span-full text-center py-14 text-[#57606a] text-[15px]">
      <svg class="w-10 h-10 mx-auto mb-3 text-[#d0d7de]" xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>
        <line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      <p>Failed to load issues. Please try again later.</p>
    </div>`;
    console.error(err);
  } finally {
    hideSpinner();
  }
}

async function searchIssues(query) {
  showSpinner();
  try {
    const res = await fetch(
      `${API_BASE}/issues/search?q=${encodeURIComponent(query)}`
    );
    if (!res.ok) throw new Error("Network response was not ok");
    const json = await res.json();
    const results = json.data || [];
    renderIssueCards(filterByTab(results));
    updateCountsFor(results);
  } catch (err) {
    issuesGrid.innerHTML = `<div class="col-span-full text-center py-14 text-[#57606a]"><p>Search failed. Please try again.</p></div>`;
    console.error(err);
  } finally {
    hideSpinner();
  }
}

/* ── Count helpers ──────────────────────────────── */
function updateCounts() {
  updateCountsFor(allIssues);
}

function updateCountsFor(issues) {
  const openCount   = issues.filter((i) => i.status === "open").length;
  const closedCount = issues.filter((i) => i.status === "closed").length;
  openCountEl.textContent   = openCount;
  closedCountEl.textContent = closedCount;
}

/* ── Filter & Render ────────────────────────────── */
function filterByTab(issues) {
  if (activeTab === "open")   return issues.filter((i) => i.status === "open");
  if (activeTab === "closed") return issues.filter((i) => i.status === "closed");
  return issues; // "all"
}

function renderIssues() {
  const filtered = filterByTab(allIssues);
  renderIssueCards(filtered);
  issuesCountTxt.textContent = `${filtered.length} Issue${filtered.length !== 1 ? "s" : ""}`;
}

function renderIssueCards(issues) {
  issuesCountTxt.textContent = `${issues.length} Issue${issues.length !== 1 ? "s" : ""}`;

  if (issues.length === 0) {
    issuesGrid.innerHTML = `<div class="col-span-full text-center py-14 text-[#57606a] text-[15px]">
      <svg class="w-10 h-10 mx-auto mb-3 text-[#d0d7de]" xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round">
        <circle cx="11" cy="11" r="8"/>
        <line x1="21" y1="21" x2="16.65" y2="16.65"/>
      </svg>
      <p>No issues found.</p>
    </div>`;
    return;
  }

  issuesGrid.innerHTML = issues.map(buildCardHTML).join("");

  // Attach click listeners
  issuesGrid.querySelectorAll(".issue-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = parseInt(card.dataset.id, 10);
      openModal(id);
    });
  });
}

function buildCardHTML(issue) {
  const isOpen   = issue.status === "open";
  const topBorder = isOpen ? "border-t-[#1a7f37]" : "border-t-[#8250df]";
  const iconHTML  = isOpen ? openIcon : closedIcon;
  const priority  = (issue.priority || "low").toLowerCase();

  const priorityClass = {
    high:   "bg-[#fff0f0] text-[#cf222e] border border-[#ffb8b8]",
    medium: "bg-[#fff8e6] text-[#9a6700] border border-[#ffc533]",
    low:    "bg-[#f0f0f0] text-[#57606a] border border-[#d0d7de]",
  }[priority] || "bg-[#f0f0f0] text-[#57606a] border border-[#d0d7de]";

  return `
  <div class="issue-card flex flex-col gap-2 bg-white border border-[#d0d7de] border-t-[3px]
              ${topBorder} rounded-lg p-3.5 cursor-pointer
              hover:shadow-[0_4px_16px_rgba(0,0,0,0.1)] hover:-translate-y-0.5 transition"
       data-id="${issue.id}">
    <div class="flex items-center justify-between">
      <span class="w-5 h-5 shrink-0">${iconHTML}</span>
      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${priorityClass}">
        ${issue.priority || "low"}
      </span>
    </div>
    <p class="text-[14px] font-semibold text-[#24292f] leading-snug line-clamp-2">
      ${escapeHTML(issue.title)}
    </p>
    <p class="text-[12px] text-[#57606a] leading-relaxed line-clamp-2">
      ${escapeHTML(issue.description)}
    </p>
    <div class="flex flex-wrap gap-1">${buildLabelsHTML(issue.labels)}</div>
    <div class="flex items-center justify-between mt-auto pt-1 border-t border-[#f0f0f0]">
      <span class="text-[11px] text-[#8c959f]">#${issue.id} by <strong class="text-[#57606a]">${escapeHTML(issue.author)}</strong></span>
      <span class="text-[11px] text-[#8c959f]">${formatDate(issue.createdAt)}</span>
    </div>
  </div>`;
}

function escapeHTML(str = "") {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/* ── Tabs ───────────────────────────────────────── */
const TAB_ACTIVE   = ["bg-indigo-600","border-indigo-600","text-white","font-semibold"];
const TAB_INACTIVE = ["bg-transparent","border-[#d0d7de]","text-[#57606a]","font-medium"];

tabBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    // Reset all tabs to inactive
    tabBtns.forEach((b) => {
      b.classList.remove(...TAB_ACTIVE);
      b.classList.add(...TAB_INACTIVE);
    });
    // Set clicked tab to active
    btn.classList.remove(...TAB_INACTIVE);
    btn.classList.add(...TAB_ACTIVE);

    activeTab = btn.dataset.tab;

    const query = searchInput.value.trim();
    if (query.length > 0) {
      searchIssues(query);
    } else {
      renderIssues();
    }
  });
});

/* ── Search ─────────────────────────────────────── */
searchInput.addEventListener("input", () => {
  clearTimeout(searchDebounce);
  const query = searchInput.value.trim();

  if (query === "") {
    renderIssues();
    updateCounts();
    return;
  }

  searchDebounce = setTimeout(() => {
    searchIssues(query);
  }, 400);
});

/* ── Modal ──────────────────────────────────────── */
async function openModal(id) {
  showSpinner();
  try {
    const res = await fetch(`${API_BASE}/issue/${id}`);
    if (!res.ok) throw new Error("Failed to fetch issue");
    const json = await res.json();
    const issue = json.data;

    const isOpen   = issue.status === "open";
    const priority = (issue.priority || "low").toLowerCase();

    const statusClass = isOpen
      ? "bg-[#dafbe1] text-[#1a7f37] border border-[#aceebb]"
      : "bg-[#f0e8ff] text-[#8250df] border border-[#d8b4fe]";

    const priorityClass = {
      high:   "bg-[#fff0f0] text-[#cf222e] border border-[#ffb8b8]",
      medium: "bg-[#fff8e6] text-[#9a6700] border border-[#ffc533]",
      low:    "bg-[#f0f0f0] text-[#57606a] border border-[#d0d7de]",
    }[priority] || "bg-[#f0f0f0] text-[#57606a] border border-[#d0d7de]";

    modalContent.innerHTML = `
      <h2 class="text-[18px] font-bold text-[#1b1f24] pr-6 leading-snug">
        ${escapeHTML(issue.title)}
      </h2>
      <div class="flex items-center gap-2 mt-2 flex-wrap">
        <span class="inline-flex items-center gap-1.5 text-[12px] font-semibold
                     px-2.5 py-0.5 rounded-full ${statusClass}">
          ${isOpen ? openIcon : closedIcon}
          ${issue.status.charAt(0).toUpperCase() + issue.status.slice(1)}
        </span>
        <span class="text-[12px] text-[#57606a]">
          Opened by <strong>${escapeHTML(issue.author)}</strong> &bull; ${formatDate(issue.createdAt)}
        </span>
      </div>
      <hr class="my-4 border-[#d0d7de]" />
      <p class="text-[14px] text-[#24292f] leading-relaxed">${escapeHTML(issue.description)}</p>
      <div class="flex flex-wrap gap-1.5 mt-3">${buildLabelsHTML(issue.labels)}</div>
      <div class="grid grid-cols-2 gap-4 mt-4">
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-[#57606a] mb-1">Assignee</p>
          <p class="text-[13px] font-medium text-[#24292f]">
            ${issue.assignee ? escapeHTML(issue.assignee) : "Unassigned"}
          </p>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-[#57606a] mb-1">Priority</p>
          <span class="inline-block text-[12px] font-semibold px-2.5 py-0.5 rounded-full uppercase ${priorityClass}">
            ${issue.priority || "low"}
          </span>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-[#57606a] mb-1">Created At</p>
          <p class="text-[13px] font-medium text-[#24292f]">${formatDate(issue.createdAt)}</p>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-[#57606a] mb-1">Updated At</p>
          <p class="text-[13px] font-medium text-[#24292f]">${formatDate(issue.updatedAt)}</p>
        </div>
        <div>
          <p class="text-[11px] font-semibold uppercase tracking-wide text-[#57606a] mb-1">Issue ID</p>
          <p class="text-[13px] font-medium text-[#24292f]">#${issue.id}</p>
        </div>
      </div>
    `;

    modalOverlay.classList.remove("hidden");
    modalOverlay.classList.add("flex");
  } catch (err) {
    console.error(err);
  } finally {
    hideSpinner();
  }
}

function closeModal() {
  modalOverlay.classList.add("hidden");
  modalOverlay.classList.remove("flex");
  modalContent.innerHTML = "";
}

modalCloseX.addEventListener("click", closeModal);
btnModalClose.addEventListener("click", closeModal);
modalOverlay.addEventListener("click", (e) => {
  if (e.target === modalOverlay) closeModal();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

/* ── New Issue button (placeholder) ─────────────── */
document.getElementById("btn-new-issue").addEventListener("click", () => {
  alert("New Issue creation is not available in this demo.");
});
