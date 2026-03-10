# FDBCS Command Line Interface (CLI) Guide

FDBCS provides a powerful Python CLI tool (`scripts/db_processor.py`) to initialize databases, export statistics, delete records, and extract sequences directly from the terminal without starting the Web UI.

## Basic Syntax

```bash
python3 scripts/db_processor.py <command> [options]
```

Supported subcommands (`<command>`):
- `init`: Initialize the database and compute statistics.
- `delete`: Delete specific sequence records from the index.
- `extract`: Extract sequences based on conditions and output as FASTA.

---

## 1. Initialize Database (`init`)

Compiles the raw FASTA and Metadata files into a SQLite index database, and automatically calculates statistics for all taxonomic ranks.

### Arguments
- `--fasta` (Required): Path to the raw FASTA file.
- `--metadata` (Optional): Path to the Metadata file containing taxonomy info.
- `--sqlite` (Required): Path to the output SQLite index database.
- `--export-stats` (Optional): Export statistics for a specific taxonomic rank (e.g., `Species`, `Genus`, `Phylum`).
- `--output` (Optional): File path to save the exported statistics (JSON format). If not specified, prints to the terminal.

### Examples

**Basic Initialization:**
```bash
python3 scripts/db_processor.py init \
  --fasta data/human_hbb/db.fa \
  --metadata data/human_hbb/Metadata.txt \
  --sqlite storage/human_hbb.index.db
```

**Initialize and export 'Species' statistics to a file:**
```bash
python3 scripts/db_processor.py init \
  --fasta data/human_hbb/db.fa \
  --metadata data/human_hbb/Metadata.txt \
  --sqlite storage/human_hbb.index.db \
  --export-stats Species \
  --output species_stats.json
```

---

## 2. Delete Sequences (`delete`)

Deletes specified sequence records from the SQLite index database. **Note: This operation only removes records from the SQLite index and does not modify the original FASTA file.**

### Arguments
- `--sqlite` (Required): Path to the SQLite index database.
- `--accession` (Mutually Exclusive Required): Accession ID of the sequence to delete.
- `--taxonomy` (Mutually Exclusive Required): Taxonomy keyword to delete (fuzzy match).

*(Note: You must specify either `--accession` or `--taxonomy`, but not both)*

### Examples

**Delete a single sequence by Accession ID:**
```bash
python3 scripts/db_processor.py delete \
  --sqlite storage/human_hbb.index.db \
  --accession NM_000518
```

**Batch delete sequences by taxonomy keyword:**
```bash
python3 scripts/db_processor.py delete \
  --sqlite storage/human_hbb.index.db \
  --taxonomy "Homo sapiens"
```

---

## 3. Extract Sequences (`extract`)

Utilizes the byte offsets stored in the SQLite database to achieve ultra-fast O(1) sequence extraction. The extracted sequences are output in the original FASTA format.

### Arguments
- `--sqlite` (Required): Path to the SQLite index database.
- `--fasta` (Required): Path to the raw FASTA file.
- `--accession` (Mutually Exclusive Required): Accession ID of the sequence to extract.
- `--taxonomy` (Mutually Exclusive Required): Taxonomy keyword to extract (fuzzy match).
- `--output` (Optional): File path to save the extracted sequences. If not specified, prints to the terminal (stdout).

*(Note: You must specify either `--accession` or `--taxonomy`, but not both)*

### Examples

**Extract a sequence by Accession ID and print to screen:**
```bash
python3 scripts/db_processor.py extract \
  --sqlite storage/human_hbb.index.db \
  --fasta data/human_hbb/db.fa \
  --accession NM_000518
```

**Batch extract sequences by taxonomy and save to a new FASTA file:**
```bash
python3 scripts/db_processor.py extract \
  --sqlite storage/human_hbb.index.db \
  --fasta data/human_hbb/db.fa \
  --taxonomy "Homo sapiens" \
  --output homo_sapiens_extracted.fa
```
