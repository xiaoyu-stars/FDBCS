import express from "express";
import path from "path";
import fs from "fs";
import Database from "better-sqlite3";
import { fileURLToPath } from "url";
import { exec } from "child_process";
import { promisify } from "util";
import dotenv from "dotenv";

const execAsync = promisify(exec);

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.join(__dirname, "data");
const STORAGE_DIR = path.join(__dirname, "storage");

console.log("Starting FDBCS Server...");
console.log("Data Directory:", DATA_DIR);
console.log("Storage Directory:", STORAGE_DIR);

console.log("Executing server.ts...");

try {
  const testDb = new Database(":memory:");
  console.log("better-sqlite3 is working!");
  testDb.close();
} catch (err) {
  console.error("better-sqlite3 failed:", err);
}

// Ensure directories exist
try {
  if (!fs.existsSync(DATA_DIR)) {
    console.log("Creating Data Directory...");
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORAGE_DIR)) {
    console.log("Creating Storage Directory...");
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
} catch (err) {
  console.error("Failed to create directories:", err);
}

async function startServer() {
  console.log("startServer() called");
  try {
    const app = express();
    const PORT = 3000;

    app.use(express.json());

    // Logging middleware
    app.use((req, res, next) => {
      console.log(`${req.method} ${req.url}`);
      next();
    });

    app.get("/api/health", (req, res) => {
      res.json({ status: "ok" });
    });

    // List available database folders in data/
    app.get("/api/databases", (req, res) => {
      try {
        const dirs = fs
          .readdirSync(DATA_DIR, { withFileTypes: true })
          .filter((dirent) => dirent.isDirectory())
          .map((dirent) => {
            const dbPath = path.join(DATA_DIR, dirent.name);
            const hasFasta = fs.existsSync(path.join(dbPath, "db.fa"));
            const hasMetadata = fs.existsSync(path.join(dbPath, "Metadata.txt"));
            const indexExists = fs.existsSync(path.join(STORAGE_DIR, `${dirent.name}.index.db`));

            return {
              name: dirent.name,
              hasFasta,
              hasMetadata,
              indexExists,
              status: indexExists ? "ready" : hasFasta ? "pending" : "incomplete",
            };
          });
        res.json(dirs);
      } catch (error) {
        res.status(500).json({ error: "Failed to list databases" });
      }
    });

    // Load/Index a database
    app.post("/api/databases/load", async (req, res) => {
      const { name } = req.body;
      if (!name) return res.status(400).json({ error: "Database name required" });

      const dbPath = path.join(DATA_DIR, name);
      const fastaFile = path.join(dbPath, "db.fa");
      const metadataFile = path.join(dbPath, "Metadata.txt");
      const indexPath = path.join(STORAGE_DIR, `${name}.index.db`);

      if (!fs.existsSync(fastaFile)) {
        return res.status(400).json({ error: "Missing db.fa in database folder" });
      }

      try {
        if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

        const scriptPath = path.join(__dirname, "fdbcs.py");
        const cmd = `python3 "${scriptPath}" init --fasta "${fastaFile}" --metadata "${metadataFile}" --sqlite "${indexPath}"`;

        console.log(`Executing: ${cmd}`);
        const { stdout, stderr } = await execAsync(cmd);

        if (stderr && !stdout) {
          console.error("Processor Error:", stderr);
          return res.status(500).json({ error: "Database processing failed", details: stderr });
        }

        const result = JSON.parse(stdout);
        res.json({ message: `Database ${name} processed successfully`, overview: result.overview });
      } catch (error: any) {
        console.error("Indexing Error:", error);
        res.status(500).json({ error: "Indexing failed: " + error.message });
      }
    });

    // Generic SQL Query Endpoint
    app.post("/api/query", (req, res) => {
      const { dbName, query, params = [] } = req.body;
      if (!dbName || !query) return res.status(400).json({ error: "dbName and query required" });

      const indexPath = path.join(STORAGE_DIR, `${dbName}.index.db`);
      if (!fs.existsSync(indexPath)) return res.status(404).json({ error: "Database index not found" });

      try {
        const db = new Database(indexPath);
        const results = db.prepare(query).all(...params);
        res.json(results);
      } catch (error: any) {
        res.status(500).json({ error: "Query failed", details: error.message });
      }
    });

    // Read from FASTA using offset
    app.post("/api/read_fasta", (req, res) => {
      const { dbName, offset } = req.body;
      if (!dbName || offset === undefined) return res.status(400).json({ error: "dbName and offset required" });

      const fastaFile = path.join(DATA_DIR, dbName as string, "db.fa");
      if (!fs.existsSync(fastaFile)) return res.status(404).json({ error: "FASTA file not found" });

      try {
        const fd = fs.openSync(fastaFile, "r");
        const buffer = Buffer.alloc(1024 * 1024);
        fs.readSync(fd, buffer, 0, buffer.length, offset);
        fs.closeSync(fd);

        const content = buffer.toString("utf-8");
        const lines = content.split("\n");
        let sequence = "";
        const header = lines[0];
        for (let i = 1; i < lines.length; i++) {
          if (lines[i].startsWith(">")) break;
          sequence += lines[i].trim();
        }

        res.json({ header, sequence });
      } catch (error) {
        res.status(500).json({ error: "Failed to read FASTA" });
      }
    });

    app.post("/api/operations/run", async (req, res) => {
      const { dbName, type } = req.body;
      if (!dbName || !type) return res.status(400).json({ error: "Missing parameters" });

      const dbPath = path.join(DATA_DIR, dbName);
      const fastaFile = path.join(dbPath, "db.fa");
      const metadataFile = path.join(dbPath, "Metadata.txt");

      if (!fs.existsSync(fastaFile)) return res.status(404).json({ error: "FASTA not found" });

      try {
        let cmd = "";
        const scriptPath = path.join(__dirname, "fdbcs.py");

        if (type === "nucleotide_composition") {
          cmd = `python3 "${scriptPath}" composition --fasta "${fastaFile}"`;
        } else if (type === "taxonomy_audit") {
          if (!fs.existsSync(metadataFile)) return res.status(404).json({ error: "Metadata not found" });
          cmd = `python3 "${scriptPath}" audit --metadata "${metadataFile}"`;
        } else {
          return res.status(400).json({ error: "Unknown operation type" });
        }

        const { stdout, stderr } = await execAsync(cmd);

        if (stderr && !stdout) {
          console.error("Script Error:", stderr);
          return res.status(500).json({ error: "Operation script failed", details: stderr });
        }

        try {
          const result = JSON.parse(stdout);
          res.json(result);
        } catch (parseError) {
          console.error("Failed to parse script output:", stdout);
          res.status(500).json({ error: "Invalid output from operation script" });
        }
      } catch (error) {
        console.error("Execution Error:", error);
        res.status(500).json({ error: "Failed to execute operation" });
      }
    });

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`FDBCS Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to start server:", err);
  }
}

startServer();
