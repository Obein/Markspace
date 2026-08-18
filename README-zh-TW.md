<div align="center">

<img src="apps/ui/public/assets/obex_cat_eye_logo-256.webp" alt="Markspace Logo" width="96" height="96" style="border-radius: 20px; margin-bottom: 12px;" />

# Markspace

**零信任 · 隱私優先 · 全球邊緣原生 Markdown 工作空間**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_&_D1_&_R2-F38020.svg?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Web Crypto API](https://img.shields.io/badge/Cryptography-AES--256--GCM_|_OPRF-00C7B7.svg?style=flat-square)](https://www.w3.org/TR/WebCryptoAPI/)

---

[English](README.md) | [简体中文](README-zh-CN.md) | 正體中文

</div>

---

## 📖 專案概覽

**Markspace** 是一款基於數學信封加密與全球分散式邊緣計算架構打造的現代隱私原生 Markdown 空間。

透過利用瀏覽器原生 Web Crypto API 的不可匯出金鑰（Non-extractable Keys），Markspace 將所有的明文加解密運算嚴格隔離在客戶端記憶體中，確保伺服器、儲存節點與網路中繼始終處於完全零知識（Zero-Knowledge）狀態。系統兼具高擴充性、模組化架構與流暢的互動體驗，將科學排版、視覺化試算表、類 Git 提交歷史以及多因素身分驗證深度融為一體。

---

## 📸 介面預覽 (Quick Look)

<!-- QuickLook 截圖預留區域 -->

<div align="center">

### Bento 零信任安全展台與登入門禁
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                   [ 預留圖：Bento 零信任展台與安全認證面板 ]                       |
|                                                                                   |
|           • 3D 景深 Bento 展台，聚焦時 360° 放射狀平移展開                        |
|           • OPRF 橢圓曲線盲化安全門禁與 MFA 動態驗證器整合                        |
|           • 120s 硬體加速極暗主題殘影流動與純黑 OLED 畫布                         |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *圖 1：零知識 Lunchbox 風格 Bento 展台與互動式密碼學技術規格詳情。*

<br/>

### 雙欄工作區、KaTeX 數學排版與 Mermaid 動態圖表
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                 [ 預留圖：分列 Markdown 編輯器與即時預覽 ]                         |
|                                                                                   |
|           • 即時雙欄對照與增量同步渲染                                            |
|           • 硬體加速 KaTeX 複雜數學公式排版                                       |
|           • Mermaid 動態流程圖、時序圖與狀態機視覺化                              |
|           • Lezer AST 語法解析器與多語言高精度程式碼醒目提示                      |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *圖 2：沉浸式 Markdown 編輯器配合科學級學術排版與語法醒目提示。*

<br/>

### 視覺化試算表編輯器 (Visual Table Editor)
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                 [ 預留圖：視覺化表格編輯與即時公式計算引擎 ]                      |
|                                                                                   |
|           • Markdown 筆記內嵌入式試算表互動編輯                                   |
|           • 內建即時函數公式計算引擎（SUM, AVG, COUNT, IF 等）                    |
|           • 無損雙向序列化為 GitHub Flavored Markdown (GFM) 標準表格              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *圖 3：類 Excel 的所見即所得表格操作與動態算術/函數計算。*

<br/>

### Merkle DAG 版本時光機與歷史回滾
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                 [ 預留圖：Merkle DAG 版本歷史時間線與回滾 ]                       |
|                                                                                   |
|           • SHA-256 內容定址不可篡改提交鏈                                        |
|           • 任意歷史時間點快照檢查與一鍵無損回溯                                  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *圖 4：基於加密雜湊的不可篡改歷史記錄與無損回溯。*

</div>

---

## ✨ 核心特性

### 🛡️ 零知識多層信封加密 (Zero-Knowledge Envelope Encryption)
- **多層信封金鑰體系**：每個文檔節點由專屬資料加密金鑰 (DEK) 進行保護，並由主密碼透過 PBKDF2-HMAC-SHA256 衍生出的主金鑰 (VMK) 進行包裹封裝。
- **客戶端記憶體邊界**：加解密全程在瀏覽器記憶體中執行（`AES-256-GCM`，96 位元 CSPRNG IV），明文與私鑰永不落盤。
- **RAM 隔離與抹除**：金鑰均配置為 `extractable: false`。在鎖定或登出時，記憶體緩衝區立即強制清零，杜絕冷啟動與記憶體傾印洩漏。

### 🚪 OPRF 橢圓曲線盲化驗證 (OPRF Blind Gate)
- **橢圓曲線防護**：基於 `NIST P-256` (`secp256r1`) 曲線的無知偽隨機函數（Oblivious Pseudorandom Function）機制。
- **零明文驗證**：客戶端在發起請求前對憑證進行盲化處理，伺服器在完全不知曉明文的情況下完成校驗，徹底防禦字典攻擊與撞庫。

### ⚡ 全球邊緣基礎設施 (Global Edge Architecture)
- **毫秒級邊緣觸達**：依託 Cloudflare 全球 300+ 邊緣 PoP 節點網絡。
- **分散式 SQL 與物件儲存**：檔案樹元資料由 Cloudflare D1 分散式 SQL 引擎毫秒級查詢，加密檔案由 R2 物件儲存即時串流傳輸。

### 📊 互動式視覺化表格編輯器 (Visual Table Editor)
- **所見即所得網格**：在 Markdown 筆記中直接增刪行列、調整對齊與儲存格內容。
- **即時公式引擎**：內建數學計算引擎，支援 `SUM`、`AVG`、`COUNT`、`MIN`、`MAX`、`IF` 及基礎算術運算式。
- **GFM 無損轉換**：與標準 GitHub Flavored Markdown 表格語法無縫互轉。

### 📐 科學與工程排版套件
- **KaTeX 數學公式引擎**：支援行內公式（`$...$`）與區塊公式（`$$...$$`）的高效能渲染。
- **Mermaid 動態圖表 AST**：直接根據程式碼區塊生成流程圖、時序圖、類別圖與甘特圖。
- **Lezer 增量語法解析**：支援 Markdown、JavaScript、Python、CSS、HTML、JSON 等語言的高速語法醒目提示。

### ⏳ 內容定址版本控制 (Merkle DAG Time-Travel)
- **不可篡改提交鏈**：每次文檔修改均透過 SHA-256 計算唯一雜湊指紋，並組裝為 Merkle DAG 樹。
- **精確時間點回滾**：支援任意歷史版本檢視與一鍵無損回溯。

### 🔑 多因素驗證與防重放門禁 (MFA & Anti-Replay)
- **RFC 6238 TOTP**：原生支援 30 秒動態權杖驗證，相容 Google Authenticator、1Password 與 Apple 鑰匙圈。
- **防重放挑戰門禁**：基於 6 位元組挑戰 Nonce 與 RFC 9449 DPoP 裝置繫結，具備自動熔斷機制。

### 🌐 全要素國際化多語言 (i18n)
- 原生支援 8 種主流語言無縫切換：
  - 🇨🇳 簡體中文 (`zh-CN`)
  - 🇭🇰/🇹🇼 正體中文 (`zh-TW`)
  - 🇺🇸 English (`en-US`)
  - 🇯🇵 日本語 (`ja-JP`)
  - 🇰🇷 한국어 (`ko-KR`)
  - 🇩🇪 Deutsch (`de-DE`)
  - 🇪🇸 Español (`es-ES`)
  - 🇻🇳 Tiếng Việt (`vi-VN`)

### 🎨 OLED 純黑美學與排版
- 針對純黑 OLED 背景（`#050507`）校準的高對比視覺體驗。
- 深度整合 **GitHub Monaspace Neon** 程式碼等寬字型與 **Noto 全語言多文種字族**。

---

## 🏗️ 系統架構與擴充性

Markspace 採用 Monorepo 多工作區模組化架構，具備良好的可擴充性與多環境適應能力：

```
markspace/
├── apps/
│   ├── api/                   # Cloudflare Workers 後端 API
│   │   ├── src/
│   │   │   ├── db/            # D1 SQLite 資料模型與遷移指令碼
│   │   │   ├── services/      # 儲存、OPRF、TOTP 及保險庫服務
│   │   │   └── index.ts       # 路由閘道與邊緣處理邏輯
│   │   ├── wrangler.jsonc     # Cloudflare Worker 配置
│   │   └── package.json
│   └── ui/                    # React 18 + Vite + Tailwind 前端
│       ├── src/
│       │   ├── components/    # 模組化 UI 元件 (AuthModal, Editor 等)
│       │   ├── context/       # 全域應用與密碼學狀態 Context
│       │   ├── hooks/         # 模組化保險庫與檔案操作 Hook
│       │   ├── i18n/          # 多語言本地化字典與 Provider
│       │   ├── services/      # WebCrypto 與 API 通訊客戶端
│       │   └── utils/         # 檔案、公式、表格與 Markdown 工具庫
│       ├── index.html
│       └── package.json
├── docs/                      # 架構設計與工程規範文件
└── package.json               # 根專案 Workspace 相依性宣告
```

### 未來擴充方向
- **可插拔儲存適配器**：支援擴充對接 AWS S3、MinIO、自建私有儲存或本機檔案系統。
- **自訂渲染管線**：支援擴充自訂 Markdown 語法指令、內嵌元件與擴充圖表。
- **離線與同步協議**：預留 P2P / CRDT 分散式協同協議與離線優先快取支援。

---

## 🚀 快速上手

### 環境要求
- [Node.js](https://nodejs.org/) (v18.0.0 或更高版本)
- [npm](https://www.npmjs.com/) (v9.0.0 或更高版本) 或 [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (已整合在開發相依性中)

### 1. 複製專案並安裝相依性
```bash
git clone https://github.com/your-username/markspace.git
cd markspace
npm install
```

### 2. 本機資料庫初始化 (Cloudflare D1)
初始化並套用本機資料庫遷移：
```bash
npm run d1:migrate:local
```

### 3. 啟動本機開發服務
在兩個獨立的終端機視窗中分別啟動後端與前端：

```bash
# 終端機 1：啟動邊緣後端 API
npm run dev:api

# 終端機 2：啟動前端 UI 開發服務
npm run dev:ui
```
啟動後在瀏覽器中開啟 `http://localhost:5173` 即可體驗。

---

## 🚢 部署發佈

### 1. 遠端資料庫遷移
初始化並同步生產環境 Cloudflare D1 資料庫：
```bash
# 建立 D1 資料庫（若尚未建立）
npm run d1:create

# 對遠端生產資料庫套用遷移
npm run d1:migrate:prod
```

### 2. 建置並部署
打包前端資源並一鍵發佈至 Cloudflare Workers：
```bash
npm run deploy
```

---

## 🛠️ 技術棧總覽

| 模組分層 | 核心技術 |
| :--- | :--- |
| **前端框架** | React 18, TypeScript, Vite |
| **樣式與設計** | Tailwind CSS, Lucide React, Monaspace Neon |
| **文件與解析** | Marked, Lezer AST, KaTeX, Mermaid.js |
| **密碼學機制** | Web Crypto API (SubtleCrypto), PBKDF2, AES-GCM, OPRF NIST P-256 |
| **邊緣與後端** | Cloudflare Workers, Cloudflare D1 SQL, Cloudflare R2 Storage |
| **工程化管理** | npm workspaces, TypeScript Project References |

---

## 🤝 參與貢獻

歡迎提交 Issue 與 Pull Request！請遵循以下規範：
1. Fork 本專案並建立功能分支 (`git checkout -b feature/awesome-feature`)；
2. 遵循嚴格的 TypeScript 型別安全與程式碼風格校驗 (`npm run typecheck`)；
3. 提交清晰規範的 Commit 記錄 (`git commit -m 'feat: add awesome feature'`)；
4. 推送分支並提交 PR (`git push origin feature/awesome-feature`)。

---

## 📄 開源許可證

本專案基於 **GNU Affero General Public License v3.0 (AGPLv3)** 開源。  
詳情請參閱 [LICENSE](LICENSE) 檔案。
