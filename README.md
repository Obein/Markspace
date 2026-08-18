<div align="center">

<img src="apps/ui/public/assets/obex_cat_eye_logo-256.webp" alt="Markspace Logo" width="96" height="96" style="border-radius: 20px; margin-bottom: 12px;" />

# Markspace

**A Zero-Trust, Privacy-First, Edge-Native Markdown Workspace**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_&_D1_&_R2-F38020.svg?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Web Crypto API](https://img.shields.io/badge/Cryptography-AES--256--GCM_|_OPRF-00C7B7.svg?style=flat-square)](https://www.w3.org/TR/WebCryptoAPI/)

---

English | [简体中文](README-zh-CN.md) | [正體中文](README-zh-TW.md)

</div>

---

## 📖 Overview

**Markspace** is a modern, privacy-centric Markdown workspace built on mathematical envelope encryption and global distributed edge infrastructure.

By decoupling plaintext processing entirely to client-side browser memory using non-extractable Web Crypto keys, Markspace ensures that servers, storage nodes, and intermediaries remain strictly zero-knowledge. Designed for scalability, extensibility, and seamless user interaction, Markspace integrates scientific document composition, interactive spreadsheet tables, Git-like version control, and multi-factor authentication into a unified, high-performance web experience.

---

## 📸 Quick Look

<!-- QuickLook Screenshots Showcase -->

<div align="center">

### Bento Authentication & Zero-Trust Security Portal
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                   [ PLACEHOLDER: Bento Auth & Security Portal ]                   |
|                                                                                   |
|           • 3D Bento Grid Showcase with dynamic focal dispersion                  |
|           • OPRF Blind Gate & MFA Authenticator integration                       |
|           • Rotating ambient afterglow with pure pitch-black OLED canvas          |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 1: Zero-knowledge lunchbox-style bento portal with interactive cryptographic details.*

<br/>

### Dual-Pane Workspace, KaTeX Typesetting & Mermaid AST Rendering
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|             [ PLACEHOLDER: Split-Pane Editor & Markdown Preview ]                 |
|                                                                                   |
|           • Real-time split-pane live preview with incremental synchronization    |
|           • Hardware-accelerated KaTeX mathematical formula rendering             |
|           • Interactive dynamic Mermaid flowchart and diagram generation          |
|           • Lezer AST multi-language syntax highlighting                          |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 2: Distraction-free Markdown editor paired with scientific typesetting and syntax highlighting.*

<br/>

### Interactive WYSIWYG Visual Table Editor
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                   [ PLACEHOLDER: Visual Table & Formula Editor ]                  |
|                                                                                   |
|           • Embedded spreadsheet grid inside Markdown notes                       |
|           • Real-time formula computation engine (SUM, AVG, COUNT, IF)            |
|           • Lossless bidirectional serialization to GitHub Flavored Markdown (GFM)|
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 3: Spreadsheet-like table manipulation with live arithmetic and formula evaluations.*

<br/>

### Merkle DAG Version History & Time-Travel Rollback
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                  [ PLACEHOLDER: Version History Timeline Rollback ]               |
|                                                                                   |
|           • SHA-256 content-addressable commit timeline                           |
|           • Granular point-in-time version inspection and instant revert          |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 4: Immutable cryptographic revision history and non-destructive timeline restoration.*

</div>

---

## ✨ Key Features

### 🛡️ Zero-Knowledge Envelope Encryption
- **Multi-Tier Envelope Encryption**: Every document node is encrypted with an isolated Data Encryption Key (DEK), wrapped by the Vault Master Key (VMK) derived via PBKDF2-HMAC-SHA256.
- **Client-Side Plaintext Boundary**: Documents are encrypted and decrypted exclusively in memory via native Web Crypto APIs (`AES-256-GCM`, 96-bit CSPRNG IV).
- **RAM Isolation & Scrubbing**: Keys are initialized with `extractable: false`. Buffers are zeroized upon vault lock or logout, preventing cold-boot and heap dump leakage.

### 🚪 OPRF Blind Credential Validation
- **Elliptic Curve Protection**: Evaluates authentication challenges on the `NIST P-256` (`secp256r1`) curve using Oblivious Pseudorandom Functions.
- **Zero-Plaintext Verification**: Client blinds PIN credentials before transmission; server evaluates the challenge oblivious to plaintext, mitigating dictionary and credential-stuffing attacks.

### ⚡ Global Edge Infrastructure
- **Ultra-Low Latency Fabric**: Powered by Cloudflare global edge network with 300+ Points of Presence worldwide.
- **Distributed SQL & Object Storage**: Metadata is queried via Cloudflare D1 distributed SQL, and encrypted blob streams are served via Cloudflare R2 object storage.

### 📊 Interactive Visual Table Editor
- **WYSIWYG Spreadsheet Grid**: Create, edit, resize, and align table structures directly within Markdown documents.
- **Live Formula Evaluation**: Integrated mathematical formula engine supporting `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`, `IF`, and basic arithmetic expressions.
- **Lossless GFM Serialization**: Seamlessly serializes to standard GitHub Flavored Markdown table syntax.

### 📐 Scientific & Technical Typesetting
- **KaTeX Formula Engine**: High-performance mathematical typesetting supporting inline (`$...$`) and display (`$$...$$`) TeX blocks.
- **Dynamic Mermaid AST**: Renders flowcharts, sequence diagrams, state machines, and Gantt charts directly from code blocks.
- **Lezer Incremental Parsing**: Incremental AST syntax highlighter for Markdown, JavaScript, Python, CSS, HTML, and JSON.

### ⏳ Content-Addressable Version Control
- **Merkle DAG Commit Chains**: Every document revision is hashed with SHA-256 and linked into an immutable DAG structure.
- **Point-in-Time Rollback**: Non-destructive revision history allowing one-click rollback to any historical commit state.

### 🔑 Multi-Factor Authentication & Anti-Replay Gate
- **RFC 6238 TOTP**: Native multi-factor authentication with 30-second rotating security tokens, compatible with Google Authenticator, 1Password, and Apple Keychain.
- **Anti-Replay Challenge Gate**: 6-byte cryptographic challenge nonces and RFC 9449 DPoP device token bindings with automatic circuit breakers.

### 🌐 Universal Internationalization (i18n)
- Comprehensive multi-language support across all UI dialogs, Bento cards, and editor prompts:
  - 🇨🇳 简体中文 (`zh-CN`)
  - 🇭🇰/🇹🇼 正體中文 (`zh-TW`)
  - 🇺🇸 English (`en-US`)
  - 🇯🇵 日本語 (`ja-JP`)
  - 🇰🇷 한국어 (`ko-KR`)
  - 🇩🇪 Deutsch (`de-DE`)
  - 🇪🇸 Español (`es-ES`)
  - 🇻🇳 Tiếng Việt (`vi-VN`)

### 🎨 OLED Obsidian Typography
- Tuned for high contrast and readability on pure black OLED backgrounds (`#050507`).
- Integrates **GitHub Monaspace Neon** variable code font and **Noto Multilingual** typography.

---

## 🏗️ Architecture & Extensibility

Markspace follows a modular workspace monorepo architecture, designed for easy adaptability across multiple deployment environments and storage backends:

```
markspace/
├── apps/
│   ├── api/                   # Cloudflare Workers Backend API
│   │   ├── src/
│   │   │   ├── db/            # D1 SQLite Schemas & Migrations
│   │   │   ├── services/      # Storage, OPRF, TOTP & Vault Services
│   │   │   └── index.ts       # Request Routing & Edge Handlers
│   │   ├── wrangler.jsonc     # Cloudflare Worker Configuration
│   │   └── package.json
│   └── ui/                    # React 18 + Vite + Tailwind Frontend
│       ├── src/
│       │   ├── components/    # Modular UI Components (AuthModal, Editor, etc.)
│       │   ├── context/       # App State & Cryptography Context
│       │   ├── hooks/         # Modular Vault & File Operation Hooks
│       │   ├── i18n/          # Locales & Translation Providers
│       │   ├── services/      # WebCrypto & API Client Implementation
│       │   └── utils/         # File, Formula, Table & Markdown Helpers
│       ├── index.html
│       └── package.json
├── docs/                      # Architectural & Engineering Documentation
└── package.json               # Root Workspace Manifest
```

### Extensibility Roadmap
- **Pluggable Storage Adapters**: Modular storage provider interface allowing adapters for AWS S3, Cloudflare R2, MinIO, or Local Filesystem.
- **Custom Render Pipeline**: Extensible AST visitor hooks to support custom Markdown directives, embeds, and chart extensions.
- **Sync Protocol Adapters**: Designed to accommodate future peer-to-peer (CRDT) synchronization channels and offline-first caching strategies.

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher) or [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (installed automatically via devDependencies)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/markspace.git
cd markspace
npm install
```

### 2. Local Database Setup (Cloudflare D1)
Initialize and apply local database migrations:
```bash
npm run d1:migrate:local
```

### 3. Start Development Servers
Run the frontend and backend simultaneously in separate terminals:

```bash
# Terminal 1: Start Edge Backend API
npm run dev:api

# Terminal 2: Start UI Dev Server
npm run dev:ui
```
Open `http://localhost:5173` in your browser to access the local development environment.

---

## 🚢 Deployment

### 1. Remote Database Migration
Provision and migrate the production Cloudflare D1 database:
```bash
# Create D1 database (if not created)
npm run d1:create

# Apply migrations to remote production database
npm run d1:migrate:prod
```

### 2. Build & Deploy
Compile the frontend assets and deploy the Cloudflare Worker:
```bash
npm run deploy
```

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend Framework** | React 18, TypeScript, Vite |
| **Styling & Design** | Tailwind CSS, Lucide React, Monaspace Neon |
| **Document Processing**| Marked, Lezer AST, KaTeX, Mermaid.js |
| **Cryptography** | Web Crypto API (SubtleCrypto), PBKDF2, AES-GCM, OPRF NIST P-256 |
| **Edge Compute & Backend** | Cloudflare Workers, Cloudflare D1 SQL, Cloudflare R2 Storage |
| **Monorepo Tooling** | npm workspaces, TypeScript Project References |

---

## 🤝 Contributing

Contributions are welcome! Please follow these guidelines:
1. Fork the repository and create a feature branch (`git checkout -b feature/awesome-feature`).
2. Adhere to TypeScript strict type definitions and linting rules (`npm run typecheck`).
3. Commit your changes with clear, structured commit messages (`git commit -m 'feat: add awesome feature'`).
4. Push to the branch (`git push origin feature/awesome-feature`) and open a Pull Request.

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.  
See the [LICENSE](LICENSE) file for details.

```
Markspace - A Zero-Trust, Privacy-First, Edge-Native Markdown Workspace
Copyright (C) 2026 Markspace Contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.
```
