#!/usr/bin/env python3
"""
School Migration Audit Tool
Calculates migration coverage from legacy schools_IERN to ph_schools.
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

def format_percent(part, total):
    if total == 0:
        return "0.00%"
    return f"{(part / total * 100):.2f}%"

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    print("--- School Migration Audit Initialized ---")
    
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # 1. Total schools in schools_IERN
            # Using double quotes for schools_IERN as it was found to be mixed-case in some contexts
            cur.execute('SELECT COUNT(*) FROM "schools_IERN"')
            total_legacy = cur.fetchone()[0]

            # 2. Schools already in ph_schools (joined by iern)
            # Distinct iern to avoid double counting if there are duplicates
            query_migrated = """
            SELECT COUNT(DISTINCT legacy.iern)
            FROM "schools_IERN" legacy
            JOIN ph_schools prod ON legacy.iern = prod.iern
            """
            cur.execute(query_migrated)
            migrated_count = cur.fetchone()[0]

            # 3. Schools missing in ph_schools
            missing_count = total_legacy - migrated_count

            # Output Formatting
            col_width = 30
            print("+" + "-" * (col_width + 15) + "+")
            print(f"| {'Metric'.ljust(col_width)} | {'Value'.ljust(10)} |")
            print("+" + "-" * (col_width + 15) + "+")
            print(f"| {'Total Schools (Legacy IERN)'.ljust(col_width)} | {str(total_legacy).rjust(10)} |")
            print(f"| {'Migrated to PH Schools'.ljust(col_width)} | {str(migrated_count).rjust(10)} |")
            print(f"| {'Missing in PH Schools'.ljust(col_width)} | {str(missing_count).rjust(10)} |")
            print("+" + "-" * (col_width + 15) + "+")
            print(f"| {'Migration Percentage'.ljust(col_width)} | {format_percent(migrated_count, total_legacy).rjust(10)} |")
            print("+" + "-" * (col_width + 15) + "+")

    except Exception as e:
        print(f"CRITICAL: Audit failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
