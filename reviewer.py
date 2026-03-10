#!/usr/bin/env python3
import sys
import os
import subprocess
import argparse
import sqlite3

def parse_fasta_header(header):
    # Simple parser for FASTA header
    if "species=" in header:
        return header.split("species=")[1].split()[0]
    return None

def find_accessions_by_taxonomy(sqlite_path, taxonomy):
    conn = sqlite3.connect(sqlite_path)
    cursor = conn.cursor()
    cursor.execute("SELECT accession FROM sequences WHERE taxonomy LIKE ?", (f"%{taxonomy}%",))
    rows = cursor.fetchall()
    conn.close()
    return [row[0] for row in rows]

def run_mafft_and_fasttree(input_fasta, output_prefix):
    aligned_fasta = f"{output_prefix}_aligned.fasta"
    tree_file = f"{output_prefix}.tree"
    
    print(f"Running MAFFT on {input_fasta}...")
    # Ensure mafft and fasttree are installed in the environment
    subprocess.run(["mafft", "--auto", input_fasta], stdout=open(aligned_fasta, "w"), check=True)
    
    print(f"Running FastTree on {aligned_fasta}...")
    subprocess.run(["fasttree", "-nt", aligned_fasta], stdout=open(tree_file, "w"), check=True)
    
    return aligned_fasta, tree_file

def main():
    parser = argparse.ArgumentParser(description='Reviewer script for FASTA submission')
    parser.add_argument('--fasta', required=True, help='Input FASTA file')
    parser.add_argument('--sqlite', required=True, help='Path to the SQLite database')
    args = parser.parse_args()

    # 1. Read FASTA and parse header
    species = None
    with open(args.fasta, 'r') as f:
        for line in f:
            if line.startswith('>'):
                species = parse_fasta_header(line[1:].strip())
                break
    
    if not species:
        print("Could not parse species from header. Please check format.")
        return
    print(f"Detected species: {species}")

    # 2. Find similar accessions
    accessions = find_accessions_by_taxonomy(args.sqlite, species)
    print(f"Found {len(accessions)} similar accessions in database.")

    # 3. Run MAFFT and FastTree
    aligned, tree = run_mafft_and_fasttree(args.fasta, "output_analysis")
    print(f"Analysis complete. Tree saved to {tree}")

    # 4. Wait for confirmation
    confirm = input("Do you want to write this to the database? (y/n): ")
    if confirm.lower() == 'y':
        print("Calling manager.py...")
        # subprocess.run(["python3", "manager.py", ...])
    else:
        print("Operation cancelled.")

if __name__ == "__main__":
    main()
