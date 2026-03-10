#!/usr/bin/env python3
import sys
import os
import json
import sqlite3
import argparse
from collections import Counter

def process_database(fasta_path, metadata_path, sqlite_path):
    if not os.path.exists(fasta_path):
        print(json.dumps({"error": f"FASTA file not found: {fasta_path}"}))
        sys.exit(1)

    # 1. Initialize SQLite
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    
    # Create tables
    cursor.execute("DROP TABLE IF EXISTS sequences")
    cursor.execute("""
        CREATE TABLE sequences (
            accession TEXT PRIMARY KEY,
            header TEXT,
            offset INTEGER,
            length INTEGER,
            taxonomy TEXT,
            metadata TEXT
        )
    """)
    
    cursor.execute("DROP TABLE IF EXISTS stats")
    cursor.execute("""
        CREATE TABLE stats (
            key TEXT PRIMARY KEY,
            value TEXT
        )
    """)
    
    # 2. Parse Metadata
    metadata_map = {}
    if metadata_path and os.path.exists(metadata_path):
        with open(metadata_path, 'r', encoding='utf-8') as f:
            lines = f.readlines()
            if lines:
                header_line = lines[0]
                delimiter = '\t' if '\t' in header_line else ','
                
                # Find taxonomy column
                cols = header_line.strip().split(delimiter)
                tax_idx = -1
                for i, col in enumerate(cols):
                    if 'tax' in col.lower():
                        tax_idx = i
                        break
                if tax_idx == -1: tax_idx = 1 # Fallback
                
                for line in lines[1:]:
                    parts = line.strip().split(delimiter)
                    if len(parts) < 2: continue
                    
                    acc = parts[0].strip()
                    tax = parts[tax_idx].strip() if len(parts) > tax_idx else "unknown"
                    metadata_str = delimiter.join([p for i, p in enumerate(parts) if i != 0 and i != tax_idx])
                    
                    metadata_map[acc] = {"taxonomy": tax, "metadata": metadata_str}
                    metadata_map[acc.lower()] = {"taxonomy": tax, "metadata": metadata_str}
                    if '.' in acc: metadata_map[acc.split('.')[0]] = {"taxonomy": tax, "metadata": metadata_str}
                    if '|' in acc:
                        for p in acc.split('|'): metadata_map[p.strip()] = {"taxonomy": tax, "metadata": metadata_str}

    # 3. Parse FASTA and Insert into SQLite
    total_sequences = 0
    total_bases = 0
    lengths = []
    taxonomy_counts = Counter()
    
    batch = []
    batch_size = 1000
    
    with open(fasta_path, 'r', encoding='utf-8') as f:
        current_record = None
        offset = 0
        
        # We need to track byte offset for random access
        f.seek(0, os.SEEK_END)
        file_size = f.tell()
        f.seek(0)
        
        # Re-opening in binary mode to get accurate byte offsets
        with open(fasta_path, 'rb') as fb:
            line = fb.readline()
            byte_pointer = 0
            
            while line:
                line_str = line.decode('utf-8', errors='ignore')
                if line_str.startswith('>'):
                    if current_record:
                        batch.append(current_record)
                        if len(batch) >= batch_size:
                            cursor.executemany("INSERT OR REPLACE INTO sequences VALUES (?,?,?,?,?,?)", batch)
                            batch = []
                    
                    header = line_str[1:].strip()
                    acc = header.split()[0] if header else "unknown"
                    
                    # Match metadata
                    meta = metadata_map.get(acc, metadata_map.get(acc.lower(), {"taxonomy": "unknown", "metadata": ""}))
                    if meta["taxonomy"] == "unknown" and '|' in acc:
                        for p in acc.split('|'):
                            if p.strip() in metadata_map:
                                meta = metadata_map[p.strip()]
                                break
                    
                    current_record = [acc, header, byte_pointer, 0, meta["taxonomy"], meta["metadata"]]
                    total_sequences += 1
                    taxonomy_counts[meta["taxonomy"]] += 1
                elif current_record:
                    seq_len = len(line_str.strip())
                    current_record[3] += seq_len
                    total_bases += seq_len
                    lengths.append(seq_len)
                
                byte_pointer += len(line)
                line = fb.readline()
                
            if current_record:
                batch.append(current_record)
            if batch:
                cursor.executemany("INSERT OR REPLACE INTO sequences VALUES (?,?,?,?,?,?)", batch)

    # 4. Calculate Statistics
    if lengths:
        avg_len = sum(lengths) / len(lengths)
        max_len = max(lengths)
        min_len = min(lengths)
    else:
        avg_len = max_len = min_len = 0
        
    # Taxonomy stats
    tax_stats = {}
    ranks = ['LEVEL_0', 'Domain', 'Kingdom', 'Phylum', 'Class', 'Order', 'Family', 'Genus', 'Species']
    for tax, count in taxonomy_counts.items():
        parts = tax.split(';')
        for i, part in enumerate(parts):
            rank = ranks[i] if i < len(ranks) else f"Level_{i+1}"
            if rank not in tax_stats: tax_stats[rank] = Counter()
            tax_stats[rank][part.strip()] += count

    # 5. Store Stats in SQLite
    overview = {
        "totalSequences": total_sequences,
        "totalBasePairs": total_bases,
        "uniqueTaxonomies": len(taxonomy_counts),
        "avgLength": round(avg_len, 2),
        "maxLength": max_len,
        "minLength": min_len
    }
    
    cursor.execute("INSERT INTO stats VALUES (?,?)", ("overview", json.dumps(overview)))
    cursor.execute("INSERT INTO stats VALUES (?,?)", ("taxonomy", json.dumps({k: dict(v) for k, v in tax_stats.items()})))
    
    conn.commit()
    conn.close()
    
    print(json.dumps({"status": "success", "overview": overview}))

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process FASTA and Metadata into SQLite.')
    parser.add_argument('--fasta', required=True, help='Path to the FASTA file')
    parser.add_argument('--metadata', help='Path to the metadata file')
    parser.add_argument('--sqlite', required=True, help='Path to the output SQLite file')
    args = parser.parse_args()
    process_database(args.fasta, args.metadata, args.sqlite)
