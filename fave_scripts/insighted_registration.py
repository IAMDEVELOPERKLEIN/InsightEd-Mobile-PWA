#!/usr/bin/env python3
"""
Regional School Migration Audit Tool
Provides a breakdown of migration coverage per region.
"""
import os
import sys
import psycopg2
from dotenv import load_dotenv

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    print("--- Regional School Migration Audit Initialized ---")
    
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Complex CTE to get stats per region
            query = """
            WITH legacy_counts AS (
                SELECT "Region" as region_name, COUNT(*) as total_legacy
                FROM "schools_IERN"
                WHERE "Region" IS NOT NULL 
                  AND "Region" != '' 
                  AND "Region" != 'Blank Region'
                  AND "Region" != 'Blank'
                GROUP BY "Region"
            ),
            migrated_counts AS (
                SELECT legacy."Region" as region_name, COUNT(DISTINCT legacy.iern) as migrated_count
                FROM "schools_IERN" legacy
                JOIN ph_schools prod ON legacy.iern = prod.iern
                WHERE legacy."Region" IS NOT NULL 
                  AND legacy."Region" != '' 
                  AND legacy."Region" != 'Blank Region'
                  AND legacy."Region" != 'Blank'
                GROUP BY legacy."Region"
            )
            SELECT 
                l.region_name,
                l.total_legacy,
                COALESCE(m.migrated_count, 0) as migrated_count,
                ROUND((COALESCE(m.migrated_count, 0)::numeric / l.total_legacy * 100), 2) as percentage
            FROM legacy_counts l
            LEFT JOIN migrated_counts m ON l.region_name = m.region_name
            ORDER BY percentage DESC, l.region_name ASC;
            """
            cur.execute(query)
            rows = cur.fetchall()

            # Output Table
            headers = ["Region", "Total Schools", "Registered Schools", "Percentage"]
            col_widths = [30, 18, 22, 12]
            
            # Border
            border = "+" + "+".join("-" * w for w in col_widths) + "+"
            print(border)
            
            # Header
            header_row = "|" + "|".join(f" {h}".ljust(w-1) for h, w in zip(headers, col_widths)) + "|"
            print(header_row)
            print(border)
            
            grand_legacy = 0
            grand_migrated = 0
            
            for row in rows:
                region, legacy, migrated, pct = row
                row_str = f"| {str(region)[:28]}".ljust(col_widths[0]) + \
                         f"| {str(legacy)}".ljust(col_widths[1]) + \
                         f"| {str(migrated)}".ljust(col_widths[2]) + \
                         f"| {str(pct)}%".ljust(col_widths[3]) + "|"
                print(row_str)
                grand_legacy += legacy
                grand_migrated += migrated
            
            print(border)
            
            # Grand Total
            total_pct = round((grand_migrated / grand_legacy * 100), 2) if grand_legacy > 0 else 0
            footer_row = f"| {'GRAND TOTAL'.ljust(col_widths[0]-1)} " + \
                         f"| {str(grand_legacy)}".ljust(col_widths[1]) + \
                         f"| {str(grand_migrated)}".ljust(col_widths[2]) + \
                         f"| {str(total_pct)}%".ljust(col_widths[3]) + "|"
            print(footer_row)
            print(border)

    except Exception as e:
        print(f"CRITICAL: Regional audit failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
