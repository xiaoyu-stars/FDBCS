#!/usr/bin/env python3
import sys
import os
import json
import argparse

def audit_taxonomy(metadata_path):
    if not os.path.exists(metadata_path):
        print(json.dumps({"error": f"File not found: {metadata_path}"}))
        sys.exit(1)

    issues = []
    total_records = 0
    
    try:
        with open(metadata_path, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f):
                line = line.strip()
                if not line:
                    continue
                total_records += 1
                
                parts = line.split('\t')
                if len(parts) < 2:
                    issues.append(f"Line {idx + 1}: Missing taxonomy path (Check if Tab-separated)")
                    continue
                
                tax_path = parts[1]
                nodes = [n.strip() for n in tax_path.split(';') if n.strip()]
                
                if len(nodes) < 5:
                    issues.append(f"Line {idx + 1}: Taxonomy path too shallow ({len(nodes)} levels)")
                
                invalid_keywords = ['undefined', 'null', 'none', 'unknown']
                if any(n.lower() in invalid_keywords for n in nodes):
                    issues.append(f"Line {idx + 1}: Contains invalid nodes")

        status = "PASSED"
        if len(issues) > 0:
            status = "WARNING" if len(issues) < total_records * 0.1 else "CRITICAL"

        result = {
            "operation": "Taxonomy Consistency Audit (Python)",
            "timestamp": os.popen('date -u +"%Y-%m-%dT%H:%M:%SZ"').read().strip(),
            "summary": {
                "total_records": total_records,
                "issues_found": len(issues),
                "status": status
            },
            "details": issues[:50]
        }
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Audit taxonomy consistency of a metadata file.')
    parser.add_argument('metadata', help='Path to the metadata file')
    args = parser.parse_args()
    audit_taxonomy(args.metadata)
