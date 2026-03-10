# FDBCS - Fasta Database Control System (Project Specification)

## 1. Project Overview
FDBCS is a lightweight, high-performance local system designed for managing and analyzing eDNA reference sequence libraries. It provides a web-based interface for indexing large FASTA files, performing rapid searches, and generating taxonomic statistics.

- **Goal**: Provide a "Local System + Web Interface" solution for bioinformatics data management.
- **Target Users**: Researchers and bioinformaticians working with eDNA and reference databases.

---

## 2. Technical Stack

### Backend (System Core)
- **Runtime**: Node.js (ES Modules)
- **Framework**: Express.js
- **Database**: SQLite (via `better-sqlite3`) for metadata indexing and rapid retrieval.
- **File System**: Native `fs` for direct FASTA byte-offset reading (O(1) sequence retrieval).

### Frontend (Web Interface)
- **Framework**: React 18 (TypeScript)
- **Build Tool**: Vite
- **Styling**: Tailwind CSS (Brutalist Design Style)
- **Visualization**: Recharts (Pie charts, Bar charts)
- **Animations**: Framer Motion
- **Icons**: Lucide React

### AI Integration
- **Model**: Google Gemini (via `@google/genai`)
- **Function**: Taxonomic background analysis and sequence functional insights.

---

## 3. System Architecture

The FDBCS system follows a decoupled architecture designed for performance and scalability:

- **Presentation Layer (Web)**: React + Tailwind CSS + Recharts for a modern, responsive user interface.
- **API Layer (Node.js)**: Express server acting as a thin proxy between the Web UI and the processing/storage layers.
- **Database Operation Unit (Python)**: Standalone Unix executables (Python scripts) responsible for all heavy-lifting bioinformatics processing, including FASTA parsing, metadata matching, and statistical calculations.
- **Storage Layer (SQLite)**: Persistent storage for both sequence metadata and pre-calculated statistical reports, ensuring near-instantaneous data retrieval for the UI.

### Data Flow
1. **Input**: FASTA file (`db.fa`) and Metadata file (`Metadata.txt`) placed in `data/[db_name]/`.
2. **Processing**: The **Database Operation Unit (Python)** parses the files, calculates byte offsets for each sequence, and generates comprehensive statistical reports.
3. **Storage**: Metadata and pre-calculated stats are stored in a local SQLite database (`storage/[db_name].index.db`).
4. **Retrieval**:
   - Metadata/Search/Stats: Queried directly from SQLite (O(1) for stats, fast indexed search for metadata).
   - Sequence Content: Read directly from FASTA using stored byte offsets (no need to load full file into memory).
4. **Visualization**: Backend aggregates taxonomic counts; Frontend renders interactive charts.

### Taxonomy Rank System
The system supports a 9-level taxonomic hierarchy:
1. `LEVEL_0` (Top-level grouping)
2. `Domain` (域)
3. `Kingdom` (界)
4. `Phylum` (门)
5. `Class` (纲)
6. `Order` (目)
7. `Family` (科)
8. `Genus` (属)
9. `Species` (种)

---

## 4. Core Modules & Features

### 1. Database Management (Dashboard)
- Scans the `data/` directory for database folders.
- Detects presence of required files (`db.fa`, `Metadata.txt`).
- Handles SQLite indexing process with transaction support for performance.
- **Re-initialize Index**: Supports resetting and rebuilding indices for existing databases to sync latest file changes.

### 2. Database Overview
- Real-time statistics: Total sequences, unique taxonomies, total base pairs.
- **Taxonomy Rank Overview**: Displays the count of unique taxa for each rank (Domain, Kingdom, Phylum, etc.) directly within the Species card.
- **Rank Drill-down**: Supports clicking on any taxonomic rank to open a detailed list of all unique taxa within that rank, along with their sequence counts.
- Sequence length distribution: Average, Maximum, Minimum.
- Preview list of the first 500 sequences.

### 3. Sequence Search Module
- Full-text search across Accession, Header, and Taxonomy fields.
- Detailed view for individual sequences.
- AI-powered taxonomy analysis.

### 4. Statistical Reports
- Visual distribution of taxonomic ranks.
- Interactive pie charts for top-level (LEVEL_0) distribution.
- Detailed breakdown modal for all taxonomic levels.

### 5. Database Operation Unit (Bio-Ops)
- **Unix Executable Integration**: Core bioinformatics algorithms are implemented as standalone Python scripts, called via system execution.
- **Nucleotide Composition Analysis**: Python-based calculation of total GC content, base frequencies, and AT/GC ratios.
- **Taxonomy Consistency Audit**: Python-based detection of taxonomic hierarchy errors or invalid nodes in metadata.
- Terminal-style result output interface.

---

## 5. Engineering Details

### Directory Structure
- `/data/`: User-provided database files (Input).
- `/storage/`: System-generated SQLite indexes (Internal).
- `/src/System.tsx`: Main entry point for the Web Interface.
- `/server.ts`: Backend logic, API routes, and Vite middleware.
- `/DEVELOPMENT_LOG.md`: Chronological record of changes.
- `/PROJECT.md`: This document (English version).
- `/PROJECT_CN.md`: Chinese version of the engineering specification.

### API Specification
- `GET /api/databases`: List available databases.
- `POST /api/databases/load`: Trigger indexing for a specific folder.
- `GET /api/search?dbName=...&query=...`: Search metadata.
- `GET /api/overview?dbName=...`: Get summary stats.
- `GET /api/stats?dbName=...`: Get taxonomic rank counts.
- `POST /api/operations/run`: Execute a bioinformatics operation.
- `GET /api/sequence?dbName=...&accession=...`: Retrieve sequence string.

---

## 6. Development Workflow (Team/AI Handoff)
- **Documentation First**: Any major architectural change must be reflected in `PROJECT_SPEC.md`.
- **Change Tracking**: Every modification must be summarized in `DEVELOPMENT_LOG.md`.
- **Environment**: Ensure `GEMINI_API_KEY` is set for AI features.
- **Port**: The system runs on port `3000`.

---

## 7. Current Status & Roadmap
- [x] 9-level taxonomy support.
- [x] Brutalist UI implementation.
- [x] Byte-offset sequence retrieval.
- [ ] Multi-user session support (Future).
- [ ] Batch sequence export (Future).
