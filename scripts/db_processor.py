#!/usr/bin/env python3
import sys
import os
import json
import sqlite3
import argparse
from collections import Counter

def process_database(fasta_path, metadata_path, sqlite_path, export_stats_rank=None, export_stats_file=None):
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
    
    # Export stats if requested
    if export_stats_rank:
        if export_stats_rank in tax_stats:
            stats_to_export = dict(tax_stats[export_stats_rank])
            if export_stats_file:
                with open(export_stats_file, 'w', encoding='utf-8') as f:
                    json.dump(stats_to_export, f, indent=2, ensure_ascii=False)
            else:
                print(f"\n--- {export_stats_rank} Statistics ---", file=sys.stderr)
                print(json.dumps(stats_to_export, indent=2, ensure_ascii=False), file=sys.stderr)
        else:
            print(f"Warning: Rank '{export_stats_rank}' not found in taxonomy stats.", file=sys.stderr)

    print(json.dumps({"status": "success", "overview": overview}))

def delete_records(sqlite_path, accession=None, taxonomy=None):
    if not os.path.exists(sqlite_path):
        print(f"Error: Database not found: {sqlite_path}", file=sys.stderr)
        sys.exit(1)
        
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    
    if accession:
        cursor.execute("DELETE FROM sequences WHERE accession = ?", (accession,))
        print(f"Deleted {cursor.rowcount} record(s) with accession: {accession}")
    elif taxonomy:
        cursor.execute("DELETE FROM sequences WHERE taxonomy LIKE ?", (f"%{taxonomy}%",))
        print(f"Deleted {cursor.rowcount} record(s) matching taxonomy: {taxonomy}")
    else:
        print("Error: Must specify either --accession or --taxonomy for deletion.", file=sys.stderr)
        
    conn.commit()
    conn.close()

def extract_records(sqlite_path, fasta_path, accession=None, taxonomy=None, output_file=None):
    if not os.path.exists(sqlite_path):
        print(f"Error: Database not found: {sqlite_path}", file=sys.stderr)
        sys.exit(1)
    if not os.path.exists(fasta_path):
        print(f"Error: FASTA file not found: {fasta_path}", file=sys.stderr)
        sys.exit(1)
        
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    
    if accession:
        cursor.execute("SELECT header, offset, length FROM sequences WHERE accession = ?", (accession,))
    elif taxonomy:
        cursor.execute("SELECT header, offset, length FROM sequences WHERE taxonomy LIKE ?", (f"%{taxonomy}%",))
    else:
        print("Error: Must specify either --accession or --taxonomy for extraction.", file=sys.stderr)
        sys.exit(1)
        
    rows = cursor.fetchall()
    conn.close()
    
    if not rows:
        print("No records found matching the criteria.", file=sys.stderr)
        return
        
    out_f = open(output_file, 'w', encoding='utf-8') if output_file else sys.stdout
    
    try:
        with open(fasta_path, 'rb') as f:
            for header, offset, length in rows:
                f.seek(offset)
                seq_data = b""
                line = f.readline()
                seq_data += line
                while True:
                    pos = f.tell()
                    line = f.readline()
                    if not line or line.startswith(b'>'):
                        break
                    seq_data += line
                
                out_f.write(seq_data.decode('utf-8', errors='ignore'))
    finally:
        if output_file:
            out_f.close()
            print(f"Extracted {len(rows)} record(s) to {output_file}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Process FASTA and Metadata into SQLite, and provide CLI operations.')
    subparsers = parser.add_subparsers(dest='command', help='Available commands')
    
    # Init command
    parser_init = subparsers.add_parser('init', help='Initialize the database')
    parser_init.add_argument('--fasta', required=True, help='Path to the FASTA file')
    parser_init.add_argument('--metadata', help='Path to the metadata file')
    parser_init.add_argument('--sqlite', required=True, help='Path to the output SQLite file')
    parser_init.add_argument('--export-stats', dest='export_stats_rank', help='Export statistics for a specific taxonomic rank (e.g., Species, Genus)')
    parser_init.add_argument('--output', dest='export_stats_file', help='File to save the exported statistics (if not specified, prints to stderr)')
    
    # Delete command
    parser_del = subparsers.add_parser('delete', help='Delete records from the database')
    parser_del.add_argument('--sqlite', required=True, help='Path to the SQLite database')
    group_del = parser_del.add_mutually_exclusive_group(required=True)
    group_del.add_argument('--accession', help='Accession ID to delete')
    group_del.add_argument('--taxonomy', help='Taxonomy keyword to delete')
    
    # Extract command
    parser_ext = subparsers.add_parser('extract', help='Extract sequences from the database')
    parser_ext.add_argument('--sqlite', required=True, help='Path to the SQLite database')
    parser_ext.add_argument('--fasta', required=True, help='Path to the original FASTA file')
    group_ext = parser_ext.add_mutually_exclusive_group(required=True)
    group_ext.add_argument('--accession', help='Accession ID to extract')
    group_ext.add_argument('--taxonomy', help='Taxonomy keyword to extract')
    parser_ext.add_argument('--output', help='File to save the extracted sequences (if not specified, prints to stdout)')
    
    args = parser.parse_args()
    
    if args.command == 'init':
        process_database(args.fasta, args.metadata, args.sqlite, args.export_stats_rank, args.export_stats_file)
    elif args.command == 'delete':
        delete_records(args.sqlite, args.accession, args.taxonomy)
    elif args.command == 'extract':
        extract_records(args.sqlite, args.fasta, args.accession, args.taxonomy, args.output)
    else:
        parser.print_help()
