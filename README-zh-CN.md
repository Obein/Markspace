<div align="center">

<img src="apps/ui/public/assets/obex_cat_eye_logo-256.webp" alt="Markspace Logo" width="96" height="96" style="border-radius: 20px; margin-bottom: 12px;" />

# Markspace

**零信任 · 隐私优先 · 全球边缘原生 Markdown 工作空间**

[![License: AGPL-3.0](https://img.shields.io/badge/License-AGPL_v3-blue.svg?style=flat-square)](https://www.gnu.org/licenses/agpl-3.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6+-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61DAFB.svg?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-8.2-646CFF.svg?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare-Workers_&_D1_&_R2-F38020.svg?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com/)
[![Web Crypto API](https://img.shields.io/badge/Cryptography-AES--256--GCM_|_OPRF-00C7B7.svg?style=flat-square)](https://www.w3.org/TR/WebCryptoAPI/)

---

[English](README.md) | 简体中文 | [正體中文](README-zh-TW.md)

</div>

---

## 📖 项目概览

**Markspace** 是一款基于数学信封加密与全球分布式边缘计算架构打造的现代隐私原生 Markdown 空间。

通过利用浏览器原生 Web Crypto API 的不可导出密钥（Non-extractable Keys），Markspace 将所有的明文加解密运算严格隔离在客户端内存中，确保服务端、存储节点和网络中继始终处于完全零知识（Zero-Knowledge）状态。系统兼具高拓展性、模块化架构与流畅的交互体验，将科学排版、可视化电子表格、类 Git 提交历史以及多因素身份认证深度融为一体。

---

## 📸 界面预览 (Quick Look)

<!-- QuickLook 截图占位区域 -->

<div align="center">

### Bento 零信任安全展台与登录门禁
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                   [ 占位图：Bento 零信任展台与安全认证面板 ]                       |
|                                                                                   |
|           • 3D 景深 Bento 展台，聚焦时 360° 放射状平移散开                        |
|           • OPRF 椭圆曲线盲化安全门禁与 MFA 动态验证器集成                        |
|           • 120s 硬件加速极暗主题残影流动与纯黑 OLED 画布                         |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *图 1：零知识 Lunchbox 风格 Bento 展台与交互式密码学技术规格详情。*

<br/>

### 双栏工作区、KaTeX 数学排版与 Mermaid 动态图表
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                 [ 占位图：分列 Markdown 编辑器与实时预览 ]                         |
|                                                                                   |
|           • 实时双栏对照与增量同步渲染                                            |
|           • 硬件加速 KaTeX 复杂数学公式排版                                       |
|           • Mermaid 动态流程图、时序图与状态机可视化                              |
|           • Lezer AST 语法解析器与多语言高精度代码高亮                            |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *图 2：沉浸式 Markdown 编辑器配合科学级学术排版与语法高亮。*

<br/>

### 可视化电子表格编辑器 (Visual Table Editor)
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                 [ 占位图：可视化表格编辑与实时公式计算引擎 ]                      |
|                                                                                   |
|           • Markdown 笔记内嵌入式电子表格交互编辑                                 |
|           • 内置实时函数公式计算引擎（SUM, AVG, COUNT, IF 等）                    |
|           • 无损双向序列化为 GitHub Flavored Markdown (GFM) 标准表格              |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *图 3：类 Excel 的所见即所得表格操作与动态算术/函数评估。*

<br/>

### Merkle DAG 版本时光机与历史回滚
```
+-----------------------------------------------------------------------------------+
|                                                                                   |
|                 [ 占位图：Merkle DAG 版本历史时间线与回滚 ]                       |
|                                                                                   |
|           • SHA-256 内容寻址不可篡改提交链                                        |
|           • 任意历史时间点快照检查与一键无损回退                                  |
|                                                                                   |
+-----------------------------------------------------------------------------------+
```
> *图 4：基于加密哈希的不可篡改历史记录与无损回溯。*

</div>

---

## ✨ 核心特性

### 🛡️ 零知识多层信封加密 (Zero-Knowledge Envelope Encryption)
- **多层信封密钥体系**：每个文档节点由专属数据加密密钥 (DEK) 进行保护，并由主密码通过 PBKDF2-HMAC-SHA256 派生出的主密钥 (VMK) 进行包裹封装。
- **客户端内存边界**：加解密全程在浏览器内存中运行（`AES-256-GCM`，96 位 CSPRNG IV），明文与私钥永不落盘。
- **RAM 隔离与擦除**：密钥均配置为 `extractable: false`。在锁库或登出时，内存缓冲区立即强制清零，杜绝冷启动与内存转储泄露。

### 🚪 OPRF 椭圆曲线盲化验证 (OPRF Blind Gate)
- **椭圆曲线防护**：基于 `NIST P-256` (`secp256r1`) 曲线的无知伪随机函数（Oblivious Pseudorandom Function）机制。
- **零明文验证**：客户端在发起请求前对凭证进行盲化处理，服务端在完全不知晓明文的情况下完成校验，彻底防御字典攻击与凭证撞库。

### ⚡ 全球边缘基础设施 (Global Edge Architecture)
- **毫秒级边缘触达**：依托 Cloudflare 全球 300+ 边缘 PoP 节点网络。
- **分布式 SQL 与对象存储**：文件树元数据由 Cloudflare D1 分布式 SQL 引擎毫秒级查询，加密文件由 R2 对象存储实时流式传输。

### 📊 交互式可视化表格编辑器 (Visual Table Editor)
- **所见即所得网格**：在 Markdown 笔记中直接增删行列、调整对齐与单元格内容。
- **实时公式引擎**：内置数学计算引擎，支持 `SUM`、`AVG`、`COUNT`、`MIN`、`MAX`、`IF` 及基础算术表达式。
- **GFM 无损转换**：与标准 GitHub Flavored Markdown 表格语法无缝互转。

### 📐 科学与工程排版套件
- **KaTeX 数学公式引擎**：支持行内公式（`$...$`）与块级公式（`$$...$$`）的高性能渲染。
- **Mermaid 动态图表 AST**：直接根据代码块生成流程图、时序图、类图与甘特图。
- **Lezer 增量语法解析**：支持 Markdown、JavaScript、Python、CSS、HTML、JSON 等语言的高速语法高亮。

### ⏳ 内容寻址版本控制 (Merkle DAG Time-Travel)
- **不可篡改提交链**：每次文档修改均通过 SHA-256 计算唯一哈希指纹，并组装为 Merkle DAG 树。
- **精确时间点回滚**：支持任意历史版本检视与一键无损回溯。

### 🔑 多因素认证与防重放门禁 (MFA & Anti-Replay)
- **RFC 6238 TOTP**：原生支持 30 秒动态口令验证，兼容 Google Authenticator、1Password 与 Apple 钥匙串。
- **防重放挑战门禁**：基于 6 字节挑战 Nonce 与 RFC 9449 DPoP 设备绑定，具备自动熔断机制。

### 🌐 全要素国际化多语言 (i18n)
- 原生支持 8 种主流语言无缝切换：
  - 🇨🇳 简体中文 (`zh-CN`)
  - 🇭🇰/🇹🇼 正體中文 (`zh-TW`)
  - 🇺🇸 English (`en-US`)
  - 🇯🇵 日本語 (`ja-JP`)
  - 🇰🇷 한국어 (`ko-KR`)
  - 🇩🇪 Deutsch (`de-DE`)
  - 🇪🇸 Español (`es-ES`)
  - 🇻🇳 Tiếng Việt (`vi-VN`)

### 🎨 OLED 纯黑美学与排版
- 针对纯黑 OLED 背景（`#050507`）调校的高对比度视觉体验。
- 深度集成 **GitHub Monaspace Neon** 代码等宽字体与 **Noto 全语言多文种字族**。

---

## 🏗️ 系统架构与拓展性

Markspace 采用 Monorepo 多工作区模块化架构，具备良好的可拓展性与多环境适应能力：

```
markspace/
├── apps/
│   ├── api/                   # Cloudflare Workers 后端 API
│   │   ├── src/
│   │   │   ├── db/            # D1 SQLite 数据模型与迁移脚本
│   │   │   ├── services/      # 存储、OPRF、TOTP 及保险库服务
│   │   │   └── index.ts       # 路由网关与边缘处理逻辑
│   │   ├── wrangler.jsonc     # Cloudflare Worker 配置
│   │   └── package.json
│   └── ui/                    # React 18 + Vite + Tailwind 前端
│       ├── src/
│       │   ├── components/    # 模块化 UI 组件 (AuthModal, Editor 等)
│       │   ├── context/       # 全局应用与密码学状态 Context
│       │   ├── hooks/         # 模块化保险库与文件操作 Hook
│       │   ├── i18n/          # 多语言本地化字典与 Provider
│       │   ├── services/      # WebCrypto 与 API 通信客户端
│       │   └── utils/         # 文件、公式、表格与 Markdown 工具库
│       ├── index.html
│       └── package.json
├── docs/                      # 架构设计与工程规范文档
└── package.json               # 根项目 Workspace 依赖声明
```

### 未来拓展方向
- **可插拔存储适配器**：支持拓展对接 AWS S3、MinIO、自建私有存储或本地文件系统。
- **自定义渲染管线**：支持拓展自定义 Markdown 语法指令、内嵌组件与扩展图表。
- **离线与同步协议**：预留 P2P / CRDT 分布式协同协议与离线优先缓存支持。

---

## 🚀 快速上手

### 环境要求
- [Node.js](https://nodejs.org/) (v18.0.0 或更高版本)
- [npm](https://www.npmjs.com/) (v9.0.0 或更高版本) 或 [pnpm](https://pnpm.io/)
- [Cloudflare Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (已集成在开发依赖中)

### 1. 克隆代码并安装依赖
```bash
git clone https://github.com/your-username/markspace.git
cd markspace
npm install
```

### 2. 本地数据库初始化 (Cloudflare D1)
初始化并执行本地数据库迁移：
```bash
npm run d1:migrate:local
```

### 3. 启动本地开发服务
在两个独立的终端窗口中分别启动后端与前端：

```bash
# 终端 1：启动边缘后端 API
npm run dev:api

# 终端 2：启动前端 UI 开发服务
npm run dev:ui
```
启动后在浏览器中打开 `http://localhost:5173` 即可体验。

---

## 🚢 部署发布

### 1. 远程数据库迁移
初始化并同步生产环境 Cloudflare D1 数据库：
```bash
# 创建 D1 数据库（若尚未创建）
npm run d1:create

# 对远端生产数据库应用迁移
npm run d1:migrate:prod
```

### 2. 构建并部署
打包前端资源并一键发布至 Cloudflare Workers：
```bash
npm run deploy
```

---

## 🛠️ 技术栈总览

| 模块分层 | 核心技术 |
| :--- | :--- |
| **前端框架** | React 18, TypeScript, Vite |
| **样式与设计** | Tailwind CSS, Lucide React, Monaspace Neon |
| **文档与解析** | Marked, Lezer AST, KaTeX, Mermaid.js |
| **密码学机制** | Web Crypto API (SubtleCrypto), PBKDF2, AES-GCM, OPRF NIST P-256 |
| **边缘与后端** | Cloudflare Workers, Cloudflare D1 SQL, Cloudflare R2 Storage |
| **工程化管理** | npm workspaces, TypeScript Project References |

---

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request！请遵循以下规范：
1. Fork 本仓库并新建特性分支 (`git checkout -b feature/awesome-feature`)；
2. 遵循严格的 TypeScript 类型安全与代码风格校验 (`npm run typecheck`)；
3. 提交清晰规范的 Commit 记录 (`git commit -m 'feat: add awesome feature'`)；
4. 推送分支并提交 PR (`git push origin feature/awesome-feature`)。

---

## 📄 开源许可证

本项目基于 **GNU Affero General Public License v3.0 (AGPLv3)** 开源。  
详情请参阅 [LICENSE](LICENSE) 文件。
