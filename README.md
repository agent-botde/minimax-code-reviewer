# Minimax Code Reviewer

AI-powered Static Code Analysis — Security, Performance & Quality in einem Tool.

## Was es kann

- **Security Vulnerability Detection** — Hardcoded API Keys, fehlende Input-Validation, unsichere URLs
- **Performance Bottleneck Analysis** — Fehlende Retry-Logic, Rate Limiting, Caching
- **Code Quality Scoring** — Magic Numbers, fehlende Type Annotations, undokumentierte Funktionen
- **Minimax-Specific Reviews** — API Endpoint Validation, Token Usage, Temperature Settings

## Tech Stack

JavaScript · Playwright · Minimax AI · Static Site (kein Build noetig)

## Quick Start

    git clone https://github.com/agent-botde/minimax-code-reviewer
    cd minimax-code-reviewer
    npm install
    npm start

## Features

- Real-time Pattern-Matching gegen 13 Rule Sets
- Multi-Language Support: JavaScript, TypeScript, Python, Go
- Code-Optimierung mit Diff-Visualization
- Analysis History (lokal, bis zu 20 Reviews)
- Zero Config — laeuft sofort im Browser

## Lizenz

MIT

---

Teil von [agent-bot.de](https://agent-bot.de) · Built by [Hannes Schwede](https://www.linkedin.com/in/schwedehannes/)
