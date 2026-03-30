/**
 * Agent Bot Code Reviewer — AI-powered Code Analysis
 * Powered by Gemini Flash via /api/review (agent-bot.de)
 */

// ===============================================
// State
// ===============================================
const state = {
  code: "",
  language: "javascript",
  results: null,
  optimizedCode: "",
  history: [],
};

// ===============================================
// Sample Code
// ===============================================
const sampleCodes = {
  javascript: `// Intentionally flawed code for demo
const API_KEY = "sk-1234567890abcdefghijklmnop"; // hardcoded secret

const callAPI = async (messages) => {
  const response = await fetch('https://api.example.com/v1/chat', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ model: 'gpt-4', messages: messages })
  });
  return response.json(); // no error handling
}

// no rate limiting
for (let i = 0; i < 100; i++) {
  callAPI([{ role: 'user', content: 'Hello ' + i }]);
}`,
  typescript: `// Fehlende Typisierung und Error Handling
interface Message {
  role: string;
  content: string;
}

const callAPI = async (messages: any[]) => {
  const response = await fetch('https://api.example.com/v1/chat', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer hardcoded-key-123' },
    body: JSON.stringify({ messages })
  });
  const data: any = await response.json();
  return data.result.choices[0].message; // unsafe chaining
}`,
  python: `import requests

API_KEY = "sk-hardcoded-secret-key"  # security issue

def call_api(messages):
    # no error handling, no retry
    response = requests.post(
        "https://api.example.com/v1/chat",
        headers={"Authorization": f"Bearer {API_KEY}"},
        json={"messages": messages}
    )
    return response.json()

def process_all(items):
    results = []
    for item in items:  # no rate limiting
        results.append(call_api(item))
    return results`,
  go: `package main

import (
    "fmt"
    "net/http"
    "strings"
)

const API_KEY = "hardcoded-secret-key" // never do this

func callAPI(body string) {
    resp, _ := http.Post( // error ignored
        "https://api.example.com/v1/chat",
        "application/json",
        strings.NewReader(body))
    defer resp.Body.Close()
    fmt.Println(resp.Status)
}`,
};

// ===============================================
// DOM Elements
// ===============================================
const elements = {
  codeEditor: document.getElementById("codeEditor"),
  languageSelect: document.getElementById("languageSelect"),
  analyzeBtn: document.getElementById("analyzeBtn"),
  clearBtn: document.getElementById("clearBtn"),
  loadSampleBtn: document.getElementById("loadSampleBtn"),
  lineCount: document.getElementById("lineCount"),
  charCount: document.getElementById("charCount"),
  resultsContainer: document.getElementById("resultsContainer"),
  optimizationPanel: document.getElementById("optimizationPanel"),
  diffBody: document.getElementById("diffBody"),
  apiStatus: document.getElementById("apiStatus"),
  historyModal: document.getElementById("historyModal"),
  historyList: document.getElementById("historyList"),
  toastContainer: document.getElementById("toastContainer"),
};

// ===============================================
// Utilities
// ===============================================
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span class="toast-message">${message}</span>`;
  elements.toastContainer.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s ease reverse";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function updateStatus(status) {
  const dot = elements.apiStatus.querySelector(".status-dot");
  const text = elements.apiStatus.querySelector(".status-text");
  dot.className = "status-dot";
  switch (status) {
    case "loading":
      dot.classList.add("loading");
      text.textContent = "Analysiere...";
      break;
    case "connected":
      text.textContent = "Bereit";
      break;
    case "error":
      dot.classList.add("disconnected");
      text.textContent = "Fehler";
      break;
  }
}

function updateStats() {
  const code = elements.codeEditor.value;
  elements.lineCount.textContent = `${code.split("\n").length} Zeilen`;
  elements.charCount.textContent = `${code.length.toLocaleString()} Zeichen`;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function getSeverityIcon(severity) {
  const icons = {
    critical: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>`,
    high: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z"/></svg>`,
    medium: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/></svg>`,
    low: `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`,
  };
  return icons[severity] || icons.low;
}

// ===============================================
// Render Functions
// ===============================================
function renderResults(data) {
  const { score, summary, issues } = data;

  if (!issues || issues.length === 0) {
    elements.resultsContainer.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
        </svg>
        <h3>Keine Probleme gefunden</h3>
        <p>${escapeHtml(summary || "Der Code sieht gut aus!")}</p>
      </div>`;
    return;
  }

  const stats = {
    critical: issues.filter((i) => i.severity === "critical").length,
    high: issues.filter((i) => i.severity === "high").length,
    medium: issues.filter((i) => i.severity === "medium").length,
  };

  const scoreColor =
    score >= 80 ? "passed" : score >= 50 ? "medium" : "critical";

  elements.resultsContainer.innerHTML = `
    <div class="summary-stats">
      <div class="stat-card">
        <div class="stat-value ${scoreColor}">${score}</div>
        <div class="stat-label">Score</div>
      </div>
      <div class="stat-card">
        <div class="stat-value critical">${stats.critical}</div>
        <div class="stat-label">Kritisch</div>
      </div>
      <div class="stat-card">
        <div class="stat-value high">${stats.high}</div>
        <div class="stat-label">Hoch</div>
      </div>
      <div class="stat-card">
        <div class="stat-value medium">${stats.medium}</div>
        <div class="stat-label">Mittel</div>
      </div>
    </div>
    ${summary ? `<p class="review-summary">${escapeHtml(summary)}</p>` : ""}
    ${issues.map(renderIssueCard).join("")}
  `;

  // Expand/collapse
  document.querySelectorAll(".issue-header").forEach((header) => {
    header.addEventListener("click", () => {
      const card = header.parentElement;
      const body = card.querySelector(".issue-body");
      card.classList.toggle("expanded");
      body.style.display = card.classList.contains("expanded") ? "block" : "none";
    });
  });

  // Filter tabs
  document.querySelectorAll(".filter-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const filter = tab.dataset.filter;
      document.querySelectorAll(".issue-card").forEach((card) => {
        card.classList.toggle(
          "hidden",
          filter !== "all" && card.dataset.severity !== filter
        );
      });
    });
  });
}

function renderIssueCard(issue) {
  const categoryLabels = {
    security: "Security",
    performance: "Performance",
    codeQuality: "Code Quality",
    bestPractices: "Best Practices",
  };
  return `
    <div class="issue-card" data-severity="${issue.severity}" data-id="${issue.id}">
      <div class="issue-header">
        <div class="issue-severity ${issue.severity}">${getSeverityIcon(issue.severity)}</div>
        <div class="issue-content">
          <div class="issue-title">${escapeHtml(issue.title)}</div>
          <div class="issue-description">${escapeHtml(issue.description)}</div>
          ${
            issue.lineHint
              ? `<div class="issue-location"><code>${escapeHtml(issue.lineHint.substring(0, 60))}${issue.lineHint.length > 60 ? "..." : ""}</code></div>`
              : ""
          }
        </div>
        <div class="issue-category-badge">${categoryLabels[issue.category] || issue.category}</div>
      </div>
      <div class="issue-body" style="display:none;">
        ${issue.lineHint ? `<div class="issue-code"><pre>${escapeHtml(issue.lineHint)}</pre></div>` : ""}
        <div class="issue-suggestion">
          <h4>Empfehlung</h4>
          <p>${escapeHtml(issue.suggestion)}</p>
        </div>
      </div>
    </div>`;
}

function renderDiff(original, optimized) {
  if (!optimized) {
    elements.optimizationPanel.classList.remove("open");
    return;
  }

  const origLines = original.split("\n");
  const optLines = optimized.split("\n");
  const maxLines = Math.max(origLines.length, optLines.length);
  let html = "";

  for (let i = 0; i < maxLines; i++) {
    const orig = origLines[i] ?? "";
    const opt = optLines[i] ?? "";
    if (orig !== opt) {
      if (orig)
        html += `<div class="diff-line"><div class="diff-line-number">${i + 1}</div><div class="diff-line-code removed">${escapeHtml(orig)}</div><div class="diff-line-number"></div><div class="diff-line-code"></div></div>`;
      if (opt)
        html += `<div class="diff-line"><div class="diff-line-number"></div><div class="diff-line-code"></div><div class="diff-line-number">${i + 1}</div><div class="diff-line-code added">${escapeHtml(opt)}</div></div>`;
    } else {
      html += `<div class="diff-line"><div class="diff-line-number">${i + 1}</div><div class="diff-line-code">${escapeHtml(orig)}</div><div class="diff-line-number">${i + 1}</div><div class="diff-line-code">${escapeHtml(opt)}</div></div>`;
    }
  }

  elements.diffBody.innerHTML = html;
}

// ===============================================
// History
// ===============================================
function renderHistory() {
  if (state.history.length === 0) {
    elements.historyList.innerHTML = `<div class="empty-history"><p>Keine bisherigen Analysen vorhanden.</p></div>`;
    return;
  }
  elements.historyList.innerHTML = state.history
    .map(
      (item, index) => `
    <div class="history-item" data-index="${index}">
      <div class="history-time">${new Date(item.timestamp).toLocaleString("de-DE")}</div>
      <div class="history-summary">${escapeHtml(item.summary)}</div>
      <div class="history-stats">
        ${item.stats.critical > 0 ? `<span class="history-stat critical">${item.stats.critical}</span>` : ""}
        ${item.stats.high > 0 ? `<span class="history-stat high">${item.stats.high}</span>` : ""}
        <span class="history-stat score">Score: ${item.score}</span>
      </div>
    </div>`
    )
    .join("");

  document.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () => {
      const h = state.history[parseInt(item.dataset.index)];
      elements.codeEditor.value = h.code;
      state.language = h.language;
      elements.languageSelect.value = h.language;
      updateStats();
      performAnalysis();
      closeModal("historyModal");
    });
  });
}

// ===============================================
// Modal
// ===============================================
function openModal(id) {
  document.getElementById(id).classList.add("open");
}
function closeModal(id) {
  document.getElementById(id).classList.remove("open");
}

// ===============================================
// Core: performAnalysis — real AI call
// ===============================================
async function performAnalysis() {
  const code = elements.codeEditor.value.trim();
  if (!code) {
    showToast("Bitte Code eingeben.", "error");
    return;
  }
  if (code.length > 8000) {
    showToast("Code zu lang. Bitte max. 8.000 Zeichen.", "error");
    return;
  }

  updateStatus("loading");
  elements.analyzeBtn.disabled = true;
  elements.analyzeBtn.innerHTML = `<span class="loading-spinner"></span> Analysiere...`;

  try {
    const response = await fetch("/api/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, language: state.language }),
    });

    if (response.status === 429) {
      showToast("Rate Limit erreicht — bitte in einer Stunde erneut versuchen.", "error");
      updateStatus("error");
      return;
    }

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || "Unbekannter Fehler");
    }

    const data = await response.json();
    state.results = data;
    state.optimizedCode = data.optimizedCode || "";

    renderResults(data);

    if (state.optimizedCode) {
      renderDiff(code, state.optimizedCode);
      elements.optimizationPanel.classList.add("open");
    }

    // Save history
    const historyItem = {
      timestamp: new Date().toISOString(),
      code,
      language: state.language,
      summary: code.substring(0, 60) + "...",
      score: data.score ?? 0,
      stats: {
        critical: (data.issues || []).filter((i) => i.severity === "critical").length,
        high: (data.issues || []).filter((i) => i.severity === "high").length,
        medium: (data.issues || []).filter((i) => i.severity === "medium").length,
      },
    };
    state.history.unshift(historyItem);
    if (state.history.length > 20) state.history.pop();
    localStorage.setItem("mcra_history", JSON.stringify(state.history));

    const issueCount = (data.issues || []).length;
    showToast(
      `Analyse abgeschlossen — ${issueCount} Issue${issueCount !== 1 ? "s" : ""} gefunden.`,
      issueCount > 0 ? "error" : "success"
    );
    updateStatus("connected");
  } catch (err) {
    console.error(err);
    showToast(`Fehler: ${err.message}`, "error");
    updateStatus("error");
  } finally {
    elements.analyzeBtn.disabled = false;
    elements.analyzeBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
      </svg>
      Code analysieren`;
  }
}

// ===============================================
// Event Listeners
// ===============================================
function setupEventListeners() {
  elements.codeEditor.addEventListener("input", updateStats);

  elements.languageSelect.addEventListener("change", (e) => {
    state.language = e.target.value;
  });

  elements.analyzeBtn.addEventListener("click", performAnalysis);

  elements.clearBtn.addEventListener("click", () => {
    elements.codeEditor.value = "";
    elements.resultsContainer.innerHTML = `
      <div class="empty-state">
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 12h6m-3-3v6m9 2V7a2 2 0 00-2-2h-4.586a1 1 0 01-.707-.293l-4.586-4.586a1 1 0 00-1.414 0L6.586 5A2 2 0 005 7v10a2 2 0 002 2h12a2 2 0 002-2z"/>
        </svg>
        <h3>Keine Analyse vorhanden</h3>
        <p>Fügen Sie Code ein und klicken Sie auf "Analysieren", um das Review zu starten.</p>
      </div>`;
    elements.optimizationPanel.classList.remove("open");
    updateStats();
  });

  elements.loadSampleBtn.addEventListener("click", () => {
    elements.codeEditor.value = sampleCodes[state.language] || sampleCodes.javascript;
    updateStats();
    showToast("Beispiel-Code geladen.", "info");
  });

  // History
  document.getElementById("historyBtn")?.addEventListener("click", () => {
    renderHistory();
    openModal("historyModal");
  });
  document.getElementById("closeHistoryBtn")?.addEventListener("click", () => closeModal("historyModal"));
  document.getElementById("closeHistoryModalBtn")?.addEventListener("click", () => closeModal("historyModal"));
  document.getElementById("clearHistoryBtn")?.addEventListener("click", () => {
    state.history = [];
    localStorage.removeItem("mcra_history");
    renderHistory();
    showToast("Verlauf gelöscht.", "info");
  });

  // Optimization panel
  document.getElementById("closeOptimizationBtn")?.addEventListener("click", () => {
    elements.optimizationPanel.classList.remove("open");
  });

  document.getElementById("copyOptimizedBtn")?.addEventListener("click", () => {
    if (state.optimizedCode) {
      navigator.clipboard.writeText(state.optimizedCode).then(() =>
        showToast("Optimierter Code kopiert.", "success")
      );
    }
  });

  document.getElementById("applyFixesBtn")?.addEventListener("click", () => {
    if (state.optimizedCode) {
      elements.codeEditor.value = state.optimizedCode;
      state.optimizedCode = "";
      updateStats();
      elements.optimizationPanel.classList.remove("open");
      showToast("Fixes angewendet. Jetzt erneut analysieren.", "info");
    }
  });

  // Close modals on overlay click
  document.querySelectorAll(".modal-overlay").forEach((overlay) => {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.classList.remove("open");
    });
  });

  // Keyboard shortcut
  document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") performAnalysis();
  });
}

// ===============================================
// Init
// ===============================================
function init() {
  const savedHistory = localStorage.getItem("mcra_history");
  if (savedHistory) {
    try {
      state.history = JSON.parse(savedHistory);
    } catch {}
  }

  // Remove old settings (API key no longer needed)
  localStorage.removeItem("mcra_settings");

  setupEventListeners();
  updateStats();
  console.log("🤖 Agent Bot Code Reviewer — powered by Gemini Flash");
}

document.addEventListener("DOMContentLoaded", init);
