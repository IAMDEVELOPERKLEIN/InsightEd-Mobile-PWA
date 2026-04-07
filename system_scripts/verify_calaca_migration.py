import os
import sys
import psycopg2
from dotenv import load_dotenv

def verify_migration():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    print("--- Verifying Calaca City Division Migration ---")
    
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # 1. Check schools_IERN
            cur.execute("""
                SELECT COUNT(*) FROM "schools_IERN" WHERE "Division" = 'CALACA CITY'
            """)
            count = cur.fetchone()[0]
            print(f"CHECK 1: Schools in CALACA CITY division: {count}")
            if count > 0:
                print("  SUCCESS: Schools successfully migrated.")
            else:
                print("  FAILURE: No schools found in CALACA CITY division.")

            # 2. Check all_locations
            cur.execute("""
                SELECT COUNT(*) FROM all_locations WHERE division = 'CALACA CITY'
            """)
            count = cur.fetchone()[0]
            print(f"CHECK 2: CALACA CITY in all_locations: {'YES' if count > 0 else 'NO'}")
            if count > 0:
                print("  SUCCESS: Location cache updated.")

            # 3. Check ph_offices
            cur.execute("""
                SELECT COUNT(*) FROM ph_offices WHERE functional_division = 'SDO CALACA CITY'
            """)
            count = cur.fetchone()[0]
            print(f"CHECK 3: SDO CALACA CITY in ph_offices: {'YES' if count > 0 else 'NO'}")
            if count > 0:
                print("  SUCCESS: Functional division added.")

            # 4. Check a sample school
            cur.execute("""
                SELECT "SchoolID", "School_Name", "Division" 
                FROM "schools_IERN" 
                WHERE UPPER(TRIM("Municipality")) = 'CALACA' 
                LIMIT 3
            """)
            rows = cur.fetchall()
            print("\nSAMPLE CHECK:")
            for row in rows:
                print(f"  School {row[0]} ({row[1]}): {row[2]}")

    except Exception as e:
        print(f"ERROR: Verification failed: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    verify_migration()
