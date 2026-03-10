#!/usr/bin/env python3
import sys
import os
import argparse
from scripts.db_processor import process_database, delete_records, extract_records
from scripts.nucleotide_composition import analyze_nucleotides
from scripts.taxonomy_audit import audit_taxonomy

def main():
    parser = argparse.ArgumentParser(description='FDBCS Unified Command Line Interface')
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

    # Composition command
    parser_comp = subparsers.add_parser('composition', help='Analyze nucleotide composition')
    parser_comp.add_argument('--fasta', required=True, help='Path to the FASTA file')

    # Audit command
    parser_audit = subparsers.add_parser('audit', help='Audit taxonomy consistency')
    parser_audit.add_argument('--metadata', required=True, help='Path to the metadata file')

    args = parser.parse_args()
    
    # Resolve sqlite path
    if hasattr(args, 'sqlite') and args.sqlite:
        db_dir = os.path.dirname(args.sqlite)
        db_name = os.path.basename(args.sqlite).replace(".index.db", "")
        new_path = os.path.join(db_dir, db_name, os.path.basename(args.sqlite))
        
        if args.command == 'init':
            if not os.path.exists(os.path.dirname(new_path)):
                os.makedirs(os.path.dirname(new_path), exist_ok=True)
            args.sqlite = new_path
        elif os.path.exists(new_path):
            args.sqlite = new_path
    
    if args.command == 'init':
        process_database(args.fasta, args.metadata, args.sqlite, args.export_stats_rank, args.export_stats_file)
    elif args.command == 'delete':
        delete_records(args.sqlite, args.accession, args.taxonomy)
    elif args.command == 'extract':
        extract_records(args.sqlite, args.fasta, args.accession, args.taxonomy, args.output)
    elif args.command == 'composition':
        analyze_nucleotides(args.fasta)
    elif args.command == 'audit':
        audit_taxonomy(args.metadata)
    else:
        parser.print_help()

if __name__ == "__main__":
    main()
