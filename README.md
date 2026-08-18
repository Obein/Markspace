<div align="center">

<img src="apps/ui/public/assets/obex_cat_eye_logo-256.webp" alt="Markspace Logo" width="96" height="96" style="border-radius: 20px; margin-bottom: 12px;" />

# Markspace

**A Zero-Trust, Privacy-First, FastCDC & Merkle DAG Edge-Native Markdown Workspace**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_&_D1_&_R2-F38020.svg?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Web Crypto API](https://img.shields.io/badge/Cryptography-AES--256--GCM_|_FastCDC_|_Merkle_DAG_|_OPRF-00C7B7.svg?style=flat-square)](https://www.w3.org/TR/WebCryptoAPI/)

---

English | [简体中文](README-zh-CN.md) | [正體中文](README-zh-TW.md)

</div>

---

## 📖 Overview

**Markspace** is a modern, privacy-first Markdown workspace engineered with mathematical envelope encryption, **FastCDC content-defined dynamic chunking**, and a **cryptographic Merkle DAG block-level incremental sync** engine running atop global distributed edge infrastructure.

By decoupling plaintext processing entirely to client-side browser memory using hardware-isolated, non-extractable Web Crypto keys, Markspace ensures that servers, storage nodes, and network relays remain strictly zero-knowledge. Markspace deprecates legacy monolithic full-file overwrites and Git mirror syncs in favor of an industry-standard CAS (Content-Addressed Storage) architecture: documents are chunked dynamically into 512B–4KB blocks, blind-encrypted with deterministic AES-256-GCM, and synchronized incrementally by transferring only modified blocks alongside lightweight encrypted Merkle manifests.

---

## 📸 Quick Look

<div align="center">

### Bento Authentication & Zero-Trust Security Portal
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                   [ Bento Auth & Zero-Trust Security Portal ]                     |
|                                                                                   |
|           • 3D Bento Grid Showcase with dynamic focal dispersion                  |
|           • OPRF Blind Gate (NIST P-256) & RFC 6238 TOTP Authenticator           |
|           • FastCDC & Merkle DAG live architecture visualization                  |
|           • Rotating ambient afterglow on pitch-black OLED canvas                 |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 1: Zero-knowledge lunchbox-style bento portal with interactive cryptographic details.*

<br/>

### Dual-Pane Workspace, KaTeX Typesetting & Mermaid AST Rendering
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|             [ Split-Pane Editor & Real-Time Live Preview ]                        |
|                                                                                   |
|           • Real-time split-pane live preview with incremental synchronization    |
|           • Hardware-accelerated KaTeX mathematical formula rendering             |
|           • Interactive dynamic Mermaid flowchart, sequence & AST diagrams        |
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
|                   [ Visual Table & Live Formula Editor ]                          |
|                                                                                   |
|           • Embedded spreadsheet grid inside Markdown notes                       |
|           • Real-time formula computation engine (SUM, AVG, COUNT, IF, arithmetic)|
|           • Lossless bidirectional serialization to GitHub Flavored Markdown (GFM)|
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 3: Spreadsheet-like table manipulation with live arithmetic and formula evaluations.*

<br/>

### Merkle DAG Version History & Instant Rollback
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                  [ Merkle DAG Version Tree & Delta Rollback ]                     |
|                                                                                   |
|           • FastCDC content-defined differential block synchronization            |
|           • Merkle DAG immutable revision timeline with SHA-256 root hashes       |
|           • Local IndexedDB block caching for zero-network instant reconstruction |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *Figure 4: Immutable cryptographic revision history and non-destructive timeline restoration.*

</div>

---

## ✨ Key Features

### 🧩 FastCDC Dynamic Chunking & Differential Sync
- **Fine-Grained Content-Defined Chunking**: Employs a 64-bit Gear-hash rolling algorithm to detect natural content boundaries (`Min: 512B`, `Avg: 1KB`, `Max: 4KB`), completely eliminating the boundary-shift avalanche effect of fixed-size chunking.
- **Delta Block Synchronization**: Automatically identifies modified blocks on save. Uploads only the newly modified 512B–1KB chunks and an encrypted manifest, reducing network upload bandwidth by over 90%.
- **Local IndexedDB Block Cache**: Decrypted blocks and manifests are cached locally in the browser's IndexedDB, enabling zero-network, sub-millisecond document reconstruction and instant version history diffs.

### 🛡️ Deterministic Zero-Knowledge Block Encryption & CAS
- **Non-Extractable Key Operations**: Operates directly on non-extractable Web Crypto AES-256-GCM keys (`extractable: false`), preventing key export, heap scraping, or cold-boot memory dumps.
- **Deterministic Blind Deduplication**: Generates deterministic Chunk IDs using VMK-keyed cryptographic tokens ($H = \text{SHA-256}(Chunk)$ encrypted via VMK). Chunks with identical content in the same vault share identical IDs for blind deduplication.
- **Cross-User Cryptographic Isolation**: Because chunk derivation is salted with each user's private VMK, different users with identical text produce completely unrelated Chunk IDs and ciphertexts, fully immunizing against server-side frequency and dictionary attacks.
- **Raw Binary (0% Overhead) Storage**: Eliminates Base64 encoding overhead (which inflates data by 33%), storing encrypted chunks and blobs directly as raw binary streams (`application/octet-stream`).

### 🌲 Merkle DAG Version Tree & Immutable History
- **Immutable Revision Manifests**: Every save event constructs a lightweight, encrypted `FileManifest` referencing ordered Chunk IDs and parent manifest IDs, computing a cryptographic Merkle Root Hash.
- **Point-in-Time Non-Destructive Rollback**: Supports instant visual inspection and one-click rollback to any historical commit in the Merkle tree with zero server-side computation.

### 🚪 OPRF Blind Credential Gate & Multi-Factor Security
- **NIST P-256 Elliptic Curve OPRF**: Client blinds PIN credentials before transmission; the server evaluates the challenge oblivious to plaintext, completely mitigating offline dictionary and credential-stuffing attacks.
- **BIP-39 Mnemonic Recovery Key**: Generates an 8-word BIP-39 recovery mnemonic card for each vault, allowing secure PIN resets without server involvement.
- **RFC 6238 TOTP Multi-Factor Authentication**: Integrated 30-second rotating security tokens compatible with Google Authenticator, 1Password, and Apple Keychain.
- **RFC 9449 DPoP & Nonce Anti-Replay**: Cryptographic challenge nonces and DPoP device token bindings with automatic circuit breakers.

### 👤 User Policy, Storage Quotas & Lifecycle Sweeper
- **Unix-Compliant Credentials**: Usernames follow Unix conventions (`5–32` characters, `/^[a-z_][a-z0-9_-]{4,31}$/`, lowercase letters, digits, `_`, `-`, starting with a letter or `_`) and are globally unique; Passwords adhere to Unix formats (`12–128` characters) with zero arbitrary complexity rules.
- **Universal User UUID**: Every account is bound to an immutable User UUID with one-click clipboard copying.
- **Configurable Storage Quotas (1MB – 1TB)**: Standard users default to `10MB` storage capacity, configurable globally or per-user by administrators from `1MB` to `1TB`. Uploads exceeding quotas are rejected at the edge.
- **100-Entry Audit Log Cap**: Activity and zero-trust audit logs automatically retain the latest 100 entries per user with explicit UI declaration.
- **Automated Idle Account Destruction**: Inactive non-admin accounts exceeding the threshold (default `1 month`, configurable `1 month` to `1 year`, or disableable) are automatically swept and cascade-destroyed by Worker Cron jobs.
- **System Administration Console**: Dedicated administrator console for inspecting user UUIDs, registration and activity timestamps, storage usage, adjusting roles and quotas, and triggering lifecycle sweeps.

### 📊 Interactive Visual Table Editor
- **WYSIWYG Spreadsheet Grid**: Insert, delete, reorder rows/columns, and adjust alignments directly inside Markdown notes.
- **Live Formula Engine**: Built-in calculation engine supporting `SUM`, `AVG`, `COUNT`, `MIN`, `MAX`, `IF`, and mathematical expressions.
- **Lossless GFM Serialization**: Bidirectional serialization to standard GitHub Flavored Markdown table syntax.

### 📐 Scientific & Technical Typesetting
- **KaTeX Formula Engine**: High-performance mathematical typesetting supporting inline (`$...$`) and display (`$$...$$`) TeX blocks.
- **Dynamic Mermaid AST**: Renders flowcharts, sequence diagrams, state machines, and Gantt charts directly from fenced code blocks.
- **Lezer Incremental Parsing**: Incremental AST syntax highlighter for Markdown, JavaScript, Python, CSS, HTML, and JSON.

### 🌐 Universal Internationalization (i18n)
- Comprehensive multi-language localization across all UI dialogs, Bento cards, and editor tools:
  - 🇨🇳 简体中文 (`zh-CN`) | 🇭🇰/🇹🇼 正體中文 (`zh-TW`) | 🇺🇸 English (`en-US`) | 🇯🇵 日本語 (`ja-JP`)
  - 🇰🇷 한국어 (`ko-KR`) | 🇩🇪 Deutsch (`de-DE`) | 🇪🇸 Español (`es-ES`) | 🇻🇳 Tiếng Việt (`vi-VN`)

### 🎨 OLED Obsidian Typography
- Calibrated for infinite contrast on pitch-black OLED canvases (`#050507`).
- Integrates **GitHub Monaspace Neon** code typography with **Noto Multilingual** font families.

---

## 🏗️ Architecture & Storage Topology

```mermaid
flowchart TB
    subgraph Client ["Client Browser (Web Crypto & IndexedDB)"]
        PlainDoc["Plaintext Markdown Document"] --> FastCDC["FastCDC Dynamic Chunking (512B - 4KB)"]
        FastCDC --> ProcessChunks["Processed Chunks [A, B', C]"]
        
        subgraph Crypto ["Deterministic Zero-Knowledge Engine"]
            ProcessChunks --> DetID["Deterministic Chunk ID: Hex(SHA256(AES_VMK(H)))"]
            DetID --> SynthIV["Synthetic IV: SHA256('chunk-iv:' + ChunkID)[0..12]"]
            SynthIV --> AESEnc["AES-256-GCM Raw Binary Encryption"]
        end
        
        AESEnc --> CheckMissing["1. POST /vault/chunks/check-missing"]
        AESEnc --> UploadDelta["2. PUT /vault/chunks/:id (Only Delta Chunks)"]
        
        Manifest["Build Merkle Manifest & Root Hash"] --> EncManifest["VMK Encrypted Manifest"]
        EncManifest --> CommitManifest["3. POST /vault/manifests/commit"]
        
        LocalCache[("IndexedDB Chunk & Manifest Cache")] <--> FastCDC
    end

    subgraph Edge ["Cloudflare Global Edge Fabric"]
        CheckMissing --> D1Chunks["D1 SQL (vault_chunks Index)"]
        UploadDelta --> R2Chunks["R2 CAS Storage (vaults/{userId}/chunks/{chunkId})"]
        CommitManifest --> R2Manifests["R2 Manifests (vaults/{userId}/manifests/{manifestId})"]
        CommitManifest --> D1Nodes["D1 SQL (active_manifest_id Pointer)"]
    end
```

---

## 🚀 Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) (v18.0.0 or higher)
- [npm](https://www.npmjs.com/) (v9.0.0 or higher) or [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/markspace.git
cd markspace
npm install
```

### 2. Local Database Migrations (Cloudflare D1)
```bash
npm run d1:migrate:local
```

### 3. Start Development Servers
```bash
# Terminal 1: Edge Backend API
npm run dev:api

# Terminal 2: UI Dev Server
npm run dev:ui
```
Open `http://localhost:5173` to access the workspace.

---

## 🚢 Deployment

### 1. Remote Database Migrations
```bash
# Provision D1 database (if first time)
npm run d1:create

# Apply migrations to production database
npm run d1:migrate:prod
```

### 2. Build & Deploy Worker
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
| **Chunking & Versioning**| FastCDC (Gear-Hash), Merkle DAG, IndexedDB Local Cache |
| **Cryptography** | Web Crypto API (SubtleCrypto, Non-Extractable), AES-256-GCM, OPRF NIST P-256, DPoP RFC 9449 |
| **Edge Compute & Backend** | Cloudflare Workers, Cloudflare D1 SQL, Cloudflare R2 CAS Storage |
| **Monorepo Tooling** | npm workspaces, TypeScript Project References |

---

## 📄 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.  
See the [LICENSE](LICENSE) file for details.
