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

    print("--- Executing Calaca City Casing Migration ---")
    
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # 1. Update schools_IERN table
            print("Step 1: Updating schools_IERN (Division casing)...")
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Division" = 'Calaca City'
                WHERE "Division" = 'CALACA CITY';
            """)
            print(f"SUCCESS: Updated {cur.rowcount} school records.")

            # 2. Update all_locations table
            print("Step 2: Updating all_locations (division casing)...")
            cur.execute("""
                UPDATE all_locations
                SET division = 'Calaca City'
                WHERE division = 'CALACA CITY';
            """)
            print(f"SUCCESS: Updated {cur.rowcount} location records.")

            # 3. Update users table (if any)
            print("Step 3: Updating users (division casing)...")
            cur.execute("""
                UPDATE users
                SET division = 'Calaca City'
                WHERE division = 'CALACA CITY';
            """)
            print(f"SUCCESS: Updated {cur.rowcount} user records.")

            # 4. Update ph_offices table (Check for SDO CALACA CITY)
            print("Step 4: Updating ph_offices (functional_division casing)...")
            cur.execute("""
                UPDATE ph_offices
                SET functional_division = 'SDO Calaca City'
                WHERE functional_division = 'SDO CALACA CITY';
            """)
            print(f"SUCCESS: Updated {cur.rowcount} office records.")

            conn.commit()
            print("\nDONE: Migration successfully committed!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"CRITICAL: Migration failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    run_migration()
