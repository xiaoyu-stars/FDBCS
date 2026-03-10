# FDBCS 命令行工具 (CLI) 使用指南

FDBCS 提供了一个强大的 Python 命令行工具 (`scripts/db_processor.py`)，用于在不启动 Web 服务的情况下，直接在终端对 FASTA 数据库进行初始化、统计导出、序列删除和提取等操作。

## 基本语法

```bash
python3 scripts/db_processor.py <command> [options]
```

支持的子命令 (`<command>`) 包括：
- `init`: 初始化数据库并计算统计信息
- `delete`: 删除数据库中的指定序列
- `extract`: 根据条件提取序列并输出为 FASTA 格式

---

## 1. 初始化数据库 (`init`)

将原始的 FASTA 文件和 Metadata 元数据文件编译为 SQLite 索引数据库，并自动计算所有分类层级的统计信息。

### 参数
- `--fasta` (必填): 原始 FASTA 文件的路径。
- `--metadata` (可选): 包含分类信息的 Metadata 文件路径。
- `--sqlite` (必填): 输出的 SQLite 索引数据库路径。
- `--export-stats` (可选): 导出指定分类层级（如 `Species`, `Genus`, `Phylum` 等）的统计数据。
- `--output` (可选): 统计数据的导出文件路径（JSON 格式）。如果不指定，则直接打印到终端屏幕。

### 示例

**基础初始化：**
```bash
python3 scripts/db_processor.py init \
  --fasta data/human_hbb/db.fa \
  --metadata data/human_hbb/Metadata.txt \
  --sqlite storage/human_hbb.index.db
```

**初始化并导出 Species (物种) 层级的统计数据到文件：**
```bash
python3 scripts/db_processor.py init \
  --fasta data/human_hbb/db.fa \
  --metadata data/human_hbb/Metadata.txt \
  --sqlite storage/human_hbb.index.db \
  --export-stats Species \
  --output species_stats.json
```

---

## 2. 删除序列 (`delete`)

从 SQLite 索引数据库中删除指定的序列记录。**注意：此操作仅删除 SQLite 索引中的记录，不会修改原始的 FASTA 文件。**

### 参数
- `--sqlite` (必填): SQLite 索引数据库路径。
- `--accession` (互斥必填): 要删除的序列 Accession ID。
- `--taxonomy` (互斥必填): 要删除的分类学关键词（模糊匹配）。

*(注：`--accession` 和 `--taxonomy` 必须且只能指定其中一个)*

### 示例

**按 Accession ID 删除单个序列：**
```bash
python3 scripts/db_processor.py delete \
  --sqlite storage/human_hbb.index.db \
  --accession NM_000518
```

**按分类学关键词批量删除序列：**
```bash
python3 scripts/db_processor.py delete \
  --sqlite storage/human_hbb.index.db \
  --taxonomy "Homo sapiens"
```

---

## 3. 提取序列 (`extract`)

利用 SQLite 数据库中存储的字节偏移量 (Byte Offset)，实现 O(1) 复杂度的极速序列提取。提取的序列将保持原始的 FASTA 格式。

### 参数
- `--sqlite` (必填): SQLite 索引数据库路径。
- `--fasta` (必填): 原始 FASTA 文件的路径。
- `--accession` (互斥必填): 要提取的序列 Accession ID。
- `--taxonomy` (互斥必填): 要提取的分类学关键词（模糊匹配）。
- `--output` (可选): 提取结果的保存路径。如果不指定，则直接打印到终端屏幕 (stdout)。

*(注：`--accession` 和 `--taxonomy` 必须且只能指定其中一个)*

### 示例

**按 Accession ID 提取序列并打印到屏幕：**
```bash
python3 scripts/db_processor.py extract \
  --sqlite storage/human_hbb.index.db \
  --fasta data/human_hbb/db.fa \
  --accession NM_000518
```

**按分类学关键词批量提取序列并保存为新的 FASTA 文件：**
```bash
python3 scripts/db_processor.py extract \
  --sqlite storage/human_hbb.index.db \
  --fasta data/human_hbb/db.fa \
  --taxonomy "Homo sapiens" \
  --output homo_sapiens_extracted.fa
```
