# FDBCS 纯 UNIX CLI 开发计划（含 CodeX Vibe Coding 路线）

> 依据 `PROJECT.md`、`DEVELOPMENT_LOG.md`、`CLI_USAGE.md` 重构。
> 本计划以“**纯 UNIX CLI FASTA 数据库管理系统**”为唯一目标，**不再保留 Web/API 交付路径**。

---

## 0. 项目重定位（必须先执行）

### 0.1 新定位
FDBCS = 本地/服务器运行的 Python CLI 工具链：
- 输入：`data/<db_name>/db.fa` + `Metadata.txt`
- 存储：`storage/<db_name>.index.db` (SQLite)
- 输出：终端结果、JSON/FASTA 文件、`analysis_results/` 系统发育结果

### 0.2 明确排除范围
以下全部移出主交付范围：
- React/Vite/Tailwind/Recharts 前端
- Express/Node API 层与 server middleware
- 任何“仪表盘、网页统计图、网页检索页面”相关逻辑

### 0.3 代码治理原则
- “CLI-first” 改为 “CLI-only”。
- 每个能力必须可由 `python3 fdbcs.py ...` 独立执行。
- 文档与测试只围绕 CLI 场景组织。

---

## 1. 总体目标与验收标准

### 1.1 总体目标
在服务器上完成 FDBCS 剩余开发，使其成为：
1. 可批量处理 FASTA/Metadata 的稳定 CLI 系统；
2. 可审计、可回放、可自动化（Cron/CI）运行；
3. 对中大型数据库具备可预测性能与明确失败恢复路径。

### 1.2 最终验收（Definition of Done）
- 所有核心能力均通过 CLI 子命令覆盖：`init/delete/extract/composition/audit` + phylogeny。
- Web/API 代码不再作为运行依赖。
- 提供完整“服务器部署 + 自动化执行 + 故障恢复”文档。
- 建立可重复的测试矩阵与基准测试报告。

---

## 2. 8 周实施路线（CLI-only）

## Phase A（第 1-2 周）— 架构收敛与去 Web 化
**目标：将仓库从混合栈收敛到 CLI 主体。**

### A1. 仓库瘦身与边界清理
- 标记并迁移 Web 相关目录为 `legacy_web/`（或直接删除，视版本策略）。
- 从 README/PROJECT 文档中移除 Web 入口说明，改为 CLI 入口说明。
- 清理 `package.json` 中仅为前端服务的脚本依赖（若不再需要）。

### A2. 统一 CLI 入口
- 强化 `fdbcs.py` 为唯一入口，子命令帮助信息统一风格。
- 建立命令返回码规范（0 成功；非 0 按错误类型区分）。

### A3. 环境检查
- 增加 `doctor` 子命令（建议新增）：检查 Python 版本、SQLite 可写性、MAFFT/FastTree 可用性、目录权限。

**阶段交付物**
- 《CLI-only 架构说明》
- 去 Web 化变更清单
- `doctor` 原型命令

## Phase B（第 3-4 周）— 核心能力补全与稳定性强化
**目标：完成 CLI 主链路的生产级可靠性。**

### B1. init 链路增强
- 引入分阶段执行日志：解析 FASTA → 匹配 Metadata → 写入 SQLite → 统计计算 → phylogeny。
- 支持 `--skip-phylogeny`、`--only-index`、`--only-stats`（建议新增）。

### B2. extract/delete 精准化
- 提供 dry-run（建议新增）输出：命中记录数、受影响 accession 列表预览。
- 删除后自动刷新受影响统计（或给出明确提醒与命令建议）。

### B3. audit/composition 报告化
- 输出结构化 JSON（可 `--output` 指定），用于后续自动化流水线归档。

**阶段交付物**
- 命令级错误码表
- 结构化日志与 JSON 报告规范
- CLI 关键路径集成测试

## Phase C（第 5-6 周）— 性能、批处理、可运维性
**目标：让系统适应服务器上的长期批量任务。**

### C1. 性能基准
- 建立 small/medium/large 三档样本，记录：init 总耗时、峰值内存、extract P95 延迟。
- 对 SQLite schema 与索引策略进行压测后调优。

### C2. 批处理编排
- 新增 `batch` 子命令（建议）：读取 YAML/JSON 任务清单，顺序执行多个库任务。
- 支持失败重试策略与断点续跑（最小实现：失败任务清单输出）。

### C3. 服务器运维能力
- 提供日志轮转建议（按日期归档）。
- 提供 systemd/Cron 样例脚本（部署时可直接复用）。

**阶段交付物**
- 《性能基线报告》
- `batch` 任务编排能力
- 《服务器运维手册（CLI）》

## Phase D（第 7-8 周）— 发布收口与可持续协作
**目标：形成可持续迭代的 CLI 工程体系。**

### D1. 测试门禁
- PR 最低门禁：lint + 单元测试 + CLI smoke test + 样本数据集回归。

### D2. 版本治理
- SemVer 发布策略 + CHANGELOG 模板。
- 升级说明需包含：数据库兼容性、命令参数变更、外部工具要求。

### D3. 文档闭环
- 同步维护：`PROJECT*`、`CLI_USAGE*`、`DEVELOPMENT_LOG.md`、本计划。
- 约束：功能合入必须附带 CLI 示例与失败场景说明。

**阶段交付物**
- v1.0 CLI-only 发布候选
- 标准化发布/回滚手册

---

## 3. CodeX 服务器端 Vibe Coding 技术路线（详细）

> 目标：用 CodeX 在服务器上完成“需求→实现→验证→提交→PR”闭环。

### 3.1 工作模式（每个任务循环）
1. **Read**：先读相关文档与代码（最小必要上下文）。
2. **Plan**：用 3~6 条可执行步骤定义本轮目标。
3. **Patch**：小步提交，优先改 CLI 核心与测试。
4. **Verify**：运行命令级测试 + 回归样例。
5. **Commit**：单一主题提交。
6. **PR**：描述动机、改动、测试证据、风险与回滚方式。

### 3.2 分支策略
- `main`：稳定分支。
- `feat/cli-<topic>`：功能分支（如 `feat/cli-doctor`）。
- `fix/cli-<topic>`：缺陷分支。
- 每个 PR 聚焦单个能力，避免“大杂烩 PR”。

### 3.3 提交信息规范
- `feat(cli): add doctor command for environment diagnostics`
- `fix(init): handle missing metadata delimiter fallback`
- `docs(cli): update usage for batch mode`
- `test(cli): add integration test for extract --taxonomy`

### 3.4 CodeX 提示词模板（可复用）
- **实现类**：
  - “基于 `fdbcs.py` 现有子命令，新增 `doctor` 子命令。要求：检查 Python 版本、MAFFT/FastTree 可执行、data/storage 读写权限；输出表格与 JSON 两种格式；补充 CLI_USAGE 文档和测试。”
- **重构类**：
  - “将 `init` 逻辑拆分为 parse/index/stats/phylogeny 四个函数，保持参数兼容，补充失败回滚与单元测试。”
- **修复类**：
  - “定位并修复 `extract --taxonomy` 在大小写混合 taxonomy 下漏匹配问题；提交最小补丁并增加回归测试。”

### 3.5 自动化验证脚本建议
在仓库维护 `scripts/ci_cli_checks.sh`（示例职责）：
- 语法检查（Python）
- 单元测试
- `fdbcs.py --help` 与每个子命令 `--help`
- 样本数据库 init/extract/audit smoke
- 结果文件存在性与关键字段断言

### 3.6 每日执行节奏（服务器实践）
- 上午：实现 1 个明确功能点（不跨模块）。
- 下午：补测试 + 补文档 + 跑全量检查。
- 晚上：提交 + PR + DEVELOPMENT_LOG 追加记录。

### 3.7 质量红线
- 没有测试证据不合并。
- 文档不更新不合并。
- 改动引入新参数必须写示例。
- 外部工具失败必须给出可执行降级路径。

---

## 4. CLI 模块级任务清单（Backlog）

### 4.1 命令层
- [ ] 新增 `doctor`（环境诊断）
- [ ] 新增 `batch`（批处理编排）
- [ ] `init` 增加阶段开关参数
- [ ] `delete/extract` 增加 dry-run

### 4.2 数据层
- [ ] SQLite 索引策略评估与迁移脚本
- [ ] 统计结果表结构版本化
- [ ] 大文件处理内存阈值保护

### 4.3 分析层
- [ ] phylogeny 可配置化（线程、超时、跳过策略）
- [ ] 审计报告细化（层级缺失、非法字符、歧义节点）

### 4.4 工程层
- [ ] 单元/集成测试框架完善
- [ ] CLI smoke 数据集固化
- [ ] CI 门禁与发布脚本

---

## 5. 风险与应对
- **去 Web 后历史兼容风险**：保留 `legacy_web` 目录 1 个版本周期后再移除。
- **外部工具缺失**：`doctor` 提前阻断并给出安装提示；`init` 支持 `--skip-phylogeny`。
- **大规模数据性能不稳定**：先给基准上限，再优化；不承诺未验证规模。
- **多人协作漂移**：所有需求以 CLI 子命令与样例输入输出为唯一对齐对象。

---

## 6. 最近两周（立即执行）
1. 完成去 Web 化清单与仓库结构调整方案。
2. 实现 `doctor` 子命令 + CLI_USAGE 文档更新。
3. 为 `init/extract/audit` 建立最小集成测试。
4. 输出第一版《CLI-only 架构说明》和《服务器运维手册（草案）》。

