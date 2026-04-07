import os
import sys
import psycopg2
from dotenv import load_dotenv

def run_migration():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    print("--- Executing Calaca City Division Migration ---")
    
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # 1. Update schools_IERN table
            print("Step 1: Updating schools_IERN...")
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Division" = 'CALACA CITY'
                WHERE UPPER(TRIM("Municipality")) = 'CALACA'
                AND UPPER(TRIM("Region")) = 'REGION IV-A';
            """)
            print(f"SUCCESS: Updated {cur.rowcount} schools.")

            # 2. Update all_locations table
            print("Step 2: Refreshing all_locations...")
            cur.execute("""
                INSERT INTO all_locations (region, division, district, province, municipality, legislative_district)
                SELECT DISTINCT "Region", "Division", "District", "Province", "Municipality", "Legislative_District"
                FROM "schools_IERN"
                WHERE UPPER(TRIM("Division")) = 'CALACA CITY'
                ON CONFLICT DO NOTHING;
            """)
            print(f"SUCCESS: Refreshed {cur.rowcount} location records.")

            # 3. Update ph_offices table
            print("Step 3: Updating ph_offices (Functional Divisions)...")
            cur.execute("""
                INSERT INTO ph_offices (governance_level, functional_division)
                VALUES ('Schools Division Office', 'SDO CALACA CITY')
                ON CONFLICT DO NOTHING;
            """)
            print(f"SUCCESS: Added SDO record.")

            conn.commit()
            print("\nDONE: Migration successfully committed!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"❌ CRITICAL: Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
