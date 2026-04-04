#!/usr/bin/env python3
"""
Postgres Storage Assessment Tool (PSAT)
Master-level storage audit for the InsightEd database.
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv
from typing import List, Tuple

# Vibe: authoritative, disk-aware
DEBUG = os.getenv("DEBUG", "false").lower() == "true"

def format_bytes(size_bytes: int) -> str:
    """Helper to convert bytes to human-readable units."""
    if size_bytes == 0:
        return "0B"
    size_name = ("B", "KB", "MB", "GB", "TB")
    import math
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return f"{s} {size_name[i]}"

def get_storage_stats(db_url: str) -> List[dict]:
    """Execute the master storage query."""
    query = """
    SELECT
        relname AS table_name,
        pg_table_size(C.oid) AS table_size,
        pg_indexes_size(C.oid) AS index_size,
        pg_total_relation_size(C.oid) AS total_size
    FROM pg_class C
    LEFT JOIN pg_namespace N ON (N.oid = C.relnamespace)
    WHERE nspname NOT IN ('pg_catalog', 'information_schema')
      AND relkind='r'
    ORDER BY pg_total_relation_size(C.oid) DESC;
    """
    
    conn = None
    stats = []
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            if DEBUG:
                cur.execute("SELECT version();")
                version = cur.fetchone()[0]
                print(f"[DEBUG] Connected to: {version}")
                
            cur.execute(query)
            rows = cur.fetchall()
            for row in rows:
                table_name, table_size, index_size, total_size = row
                stats.append({
                    "table": table_name,
                    "table_size": table_size,
                    "index_size": index_size,
                    "total_size": total_size
                })
    except Exception as e:
        print(f"CRITICAL: Failed to retrieve storage stats: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()
    return stats

def print_table(stats: List[dict]):
    """Print results in a pedantic, perfectly aligned ASCII table."""
    headers = ["Table Name", "Table Size", "Index Size", "Total Size", "Index %"]
    col_widths = [max(len(s["table"]) for s in stats + [{"table": headers[0]}]) + 2, 15, 15, 15, 10]
    
    # Border
    border = "+" + "+".join("-" * w for w in col_widths) + "+"
    print(border)
    
    # Header
    header_row = "|" + "|".join(f" {h}".ljust(w-1) for h, w in zip(headers, col_widths)) + "|"
    print(header_row)
    print(border)
    
    grand_total = 0
    for s in stats:
        t_size = format_bytes(s["table_size"])
        i_size = format_bytes(s["index_size"])
        tot_size = format_bytes(s["total_size"])
        idx_pct = f"{(s['index_size'] / s['total_size'] * 100):.1f}%" if s["total_size"] > 0 else "0%"
        
        row = f"| {s['table']}".ljust(col_widths[0]) + \
              f"| {t_size}".ljust(col_widths[1]) + \
              f"| {i_size}".ljust(col_widths[2]) + \
              f"| {tot_size}".ljust(col_widths[3]) + \
              f"| {idx_pct}".ljust(col_widths[4]) + "|"
        print(row)
        grand_total += s["total_size"]
    
    print(border)
    footer = f" GRAND TOTAL: {format_bytes(grand_total)} ".center(sum(col_widths) + 4, "=")
    print(footer)

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env. Initialization aborted.", file=sys.stderr)
        sys.exit(1)
    
    print("--- Postgres Storage Assessment Initialized ---")
    stats = get_storage_stats(db_url)
    if not stats:
        print("No tables found in the user namespace.")
    else:
        print_table(stats)

if __name__ == "__main__":
    main()
