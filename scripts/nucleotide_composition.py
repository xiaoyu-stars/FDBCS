#!/usr/bin/env python3
import sys
import os
import json
import argparse

def analyze_nucleotides(fasta_path):
    stats = {'A': 0, 'T': 0, 'C': 0, 'G': 0, 'N': 0, 'other': 0, 'total': 0}
    
    if not os.path.exists(fasta_path):
        print(json.dumps({"error": f"File not found: {fasta_path}"}))
        sys.exit(1)

    try:
        with open(fasta_path, 'r') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('>'):
                    continue
                
                for char in line.upper():
                    if char in stats:
                        stats[char] += 1
                    else:
                        stats['other'] += 1
                    stats['total'] += 1
        
        gc_count = stats['G'] + stats['C']
        at_count = stats['A'] + stats['T']
        
        total_atgc = gc_count + at_count
        gc_content = (gc_count / total_atgc * 100) if total_atgc > 0 else 0
        at_gc_ratio = (at_count / gc_count) if gc_count > 0 else 0

        result = {
            "operation": "Nucleotide Composition Analysis (Python)",
            "timestamp": os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip(),
            "results": {
                "counts": stats,
                "frequencies": {
                    "A": f"{(stats['A'] / stats['total'] * 100):.2f}%" if stats['total'] > 0 else "0%",
                    "T": f"{(stats['T'] / stats['total'] * 100):.2f}%" if stats['total'] > 0 else "0%",
                    "C": f"{(stats['C'] / stats['total'] * 100):.2f}%" if stats['total'] > 0 else "0%",
                    "G": f"{(stats['G'] / stats['total'] * 100):.2f}%" if stats['total'] > 0 else "0%",
                    "N": f"{(stats['N'] / stats['total'] * 100):.2f}%" if stats['total'] > 0 else "0%",
                },
                "metrics": {
                    "gc_content": f"{gc_content:.2f}%",
                    "at_gc_ratio": f"{at_gc_ratio:.2f}"
                }
            }
        }
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Analyze nucleotide composition of a FASTA file.')
    parser.add_argument('fasta', help='Path to the FASTA file')
    args = parser.parse_args()
    analyze_nucleotides(args.fasta)
