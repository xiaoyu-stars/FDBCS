# 开发过程文档 (Development Log)

本项目旨在构建一个高效、直观的 eDNA 参考数据库管理与检索系统。

## 修改记录

### 2026-03-09
- **[08:15] 全栈架构搭建**: 采用 Express + Vite + React 架构，支持后端 API 与前端 UI 的无缝集成。
- **[08:20] 数据库索引系统**:
    - 使用 `better-sqlite3` 实现 FASTA 文件的快速索引。
    - 索引包含 Accession, Header, Offset, Length, Taxonomy 等关键字段。
- **[08:25] 序列检索功能**:
    - 支持通过 Accession、分类信息或 Header 进行全文检索。
    - 集成 Gemini AI 进行序列功能分析与物种背景介绍。
- **[08:30] 数据库总览 (Overview)**:
    - 实时统计序列总数、物种总数及总碱基数。
    - 展示序列长度分布（平均、最大、最小）。
    - 新增序列列表预览功能（前 500 条）。
- **[08:35] 分类阶元系统优化**:
    - 将原始的 `Level 1-8` 统一更新为 9 级阶元：**LEVEL_0, Domain (域), Kingdom (界), Phylum (门), Class (纲), Order (目), Family (科), Genus (属), Species (种)**。
    - 统计逻辑与 UI 显示均已同步更新，支持更多层级的分类体系。
- **[08:40] 开发过程文档**:
    - 创建并维护 `DEVELOPMENT_LOG.md`，记录项目演进过程。
- **[08:45] 系统化转型 (System Transition)**:
    - 调整项目定位，从“应用 (App)”转向“本地系统 + Web 页面 (Local System + Web Interface)”。
    - 更新 UI 术语，将“立即检索”等引导性用语改为“进入检索模块”等功能性描述。
    - 强化了 FDBCS (Fasta Database Control System) 的系统品牌标识。
    - 确保所有交互逻辑符合本地管理系统的操作习惯。
- **[08:50] 数据更新 (Data Updates)**:
    - 在示例数据库 `human_hbb` 中增加了小鼠 (Mus musculus)、大鼠 (Rattus norvegicus) 和斑马鱼 (Danio rerio) 的血红蛋白序列。
    - 丰富了分类多样性，涵盖了哺乳纲 (Mammalia) 和辐鳍鱼纲 (Actinopterygii)。
- **[08:55] 功能增强 (Feature Enhancements)**:
    - 增加了数据库“重新初始化 (Re-initialize)”功能。用户现在可以在数据库已就绪的情况下，通过“重置”按钮或总览页面的“重新初始化”按钮强制重新构建索引。
    - 升级了“物种 (Species)”卡片，现在可直接展示各分类层级（域、界、门、纲等）的唯一独特分类单元计数。
    - 实现了分类层级的“下钻 (Drill-down)”功能，支持点击特定层级以查看其包含的所有唯一分类单元列表及其序列分布。
    - 优化了数据加载流程，在进入库总览时同步预加载分类统计数据，提升交互响应速度。
- **[09:00] Bug 修复 (Bug Fixes)**:
    - 修复了数据库总览页面中“物种 (Species)”卡片显示不准确（常显示为 1）的问题。
    - 优化了元数据解析逻辑，支持自动识别多种分隔符（Tab, 逗号, 分号, 空格）。
    - 增强了序列 ID 匹配的鲁棒性，支持忽略版本号及大小写不敏感匹配。
    - 改进了物种计数算法，现在通过提取分类路径的末端节点来计算唯一物种数。
- **[09:05] 工程文档标准化 (Engineering Documentation)**:
    - 创建了 `PROJECT.md` (英文) 和 `PROJECT_CN.md` (中文) 作为项目的“单一事实来源 (Source of Truth)”。
    - 详细记录了技术栈、系统架构、数据流、API 规范及开发流程。
    - 确立了协同开发 (Team) 的文档更新机制，确保后续接手人员或 AI 能够无缝衔接。
- **[09:15] 架构优化 (Architectural Optimization)**:
    - **计算与展示分离**: 将所有生物信息学处理逻辑（FASTA/Metadata 解析、统计计算）从 Node.js 迁移至 Python 脚本 (`db_processor.py`)。
    - **数据库职责强化**: SQL 数据库 (SQLite) 现在不仅存储序列元数据，还存储预计算的统计信息（总览、分类分布等），极大提升了前端展示的响应速度。
    - **Web 逻辑精简**: Node.js 后端现在仅作为轻量级的 API 代理，负责触发 Python 脚本及查询数据库，不再参与复杂的生物信息计算。
- [21:15] 命令行工具 (CLI) 增强:
    - CLI 接口重构: 将 `scripts/db_processor.py` 升级为全功能的命令行工具 `fdbcs.py`。
    - CLI 文档同步: 新增 `CLI_USAGE.md` 和 `CLI_USAGE_CN.md`。
- [21:29] 统一 CLI 接口与后端集成:
    - 完成了 `fdbcs.py` 的统一接口设计，整合了所有 CLI 功能。
    - 更新了 `server.ts` 以调用统一的 `fdbcs.py` 接口，并修复了路径引用问题。
    - 同步更新了 `CLI_USAGE.md` 和 `CLI_USAGE_CN.md` 文档。
- [00:59] 自动化系统发育分析:
    - 在数据库初始化流程中新增了自动化系统发育分析步骤。
    - 实现了按“目” (Order) 分组序列，并自动调用 MAFFT 和 FastTree 进行比对与建树。
    - 分析结果自动保存至 `analysis_results/` 目录。
    - 同步更新了 CLI 使用说明、开发过程及工程文档。

### 2026-03-10
- [11:26] 开发计划重构（CLI-only）:
    - 按“纯 UNIX CLI FASTA 数据库管理系统”要求，重写 `DEVELOPMENT_PLAN.md`，移除 Web/API 路线。
    - 新增在服务器使用 CodeX 完成剩余开发的详细 Vibe Coding 技术路线（分支、提交、提示词、验证与节奏）。

- [10:40] 新增开发计划文档:
    - 读取 `PROJECT.md`、`DEVELOPMENT_LOG.md`、`CLI_USAGE.md` 后，新增 `DEVELOPMENT_PLAN.md`。
    - 制定了覆盖稳定性、性能、功能完善与发布维护的 8 周分阶段开发路线图。

- [04:30] 开发文档维护:
    - 按照“一天一单元”的规范重构了 `DEVELOPMENT_LOG.md`。
    - 确保所有修改记录均包含准确的时间戳。

---
*此文档将持续记录后续的所有修改与优化信息。详细工程细节请参阅 [PROJECT.md](./PROJECT.md) 或 [PROJECT_CN.md](./PROJECT_CN.md)。*
