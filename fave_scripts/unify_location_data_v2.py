import os
import psycopg2
from dotenv import load_dotenv

def unify_locations():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return

    print(f"Connecting to: {db_url.split('@')[-1]}")
    conn = psycopg2.connect(db_url, sslmode='require')
    conn.autocommit = False  # HARDENED: explicit transaction control

    try:
        with conn.cursor() as cur:
            print("Connected successfully.")
            
            # --- Step 1: Normalize Regions (in transaction) ---
            print("--- Step 1: Normalizing Regions ---")
            numbered_regions = [
                'Region I', 'Region II', 'Region III', 'Region IV-A', 'Region V', 
                'Region VI', 'Region VII', 'Region VIII', 'Region IX', 'Region X', 
                'Region XI', 'Region XII'
            ]
            
            for region in numbered_regions:
                cur.execute(f"""
                    UPDATE "schools_IERN"
                    SET "Region" = '{region}'
                    WHERE UPPER("Region") = UPPER('{region}') AND "Region" != '{region}'
                """)
                if cur.rowcount > 0:
                    print(f"  Normalized {region}: {cur.rowcount} rows")

            for acronym in ['NCR', 'CAR', 'MIMAROPA', 'CARAGA', 'NIR']:
                cur.execute(f"""
                    UPDATE "schools_IERN"
                    SET "Region" = '{acronym}'
                    WHERE UPPER("Region") = '{acronym}' AND "Region" != '{acronym}'
                """)
                if cur.rowcount > 0:
                    print(f"  Normalized {acronym}: {cur.rowcount} rows")

            # --- Step 2: Normalize Other Fields (in transaction) ---
            print("--- Step 2: Normalizing Other Fields ---")

            for field in ["Province", "Municipality"]:
                cur.execute(f'UPDATE "schools_IERN" SET "{field}" = UPPER("{field}") WHERE "{field}" != UPPER("{field}")')
                print(f"  Normalized {field} to ALL CAPS: {cur.rowcount} rows")

            for field in ["Division", "District", "Legislative_District"]:
                cur.execute(f'UPDATE "schools_IERN" SET "{field}" = INITCAP("{field}") WHERE "{field}" != INITCAP("{field}")')
                print(f"  Normalized {field} to Title Case: {cur.rowcount} rows")

            # --- Step 3: Atomic TRUNCATE + INSERT for all_locations ---
            print("--- Step 3: Synchronizing all_locations (atomic) ---")

            # HARDENED: TRUNCATE and INSERT run inside the same transaction.
            # If the INSERT fails, the TRUNCATE is rolled back — table is never left empty.
            cur.execute('TRUNCATE TABLE all_locations')
            print("  Truncated all_locations.")

            cur.execute("""
                INSERT INTO all_locations (region, division, district, province, municipality, legislative_district)
                SELECT DISTINCT "Region", "Division", "District", "Province", "Municipality", "Legislative_District"
                FROM "schools_IERN"
                WHERE "status" = 'Active'
                ORDER BY "Region", "Division", "District"
            """)
            print(f"  Repopulated all_locations: {cur.rowcount} entries")

        # All-or-nothing commit — only reaches here if EVERYTHING succeeded
        conn.commit()
        print("\n[OK] Unification committed successfully.")

    except Exception as e:
        conn.rollback()
        print(f"\n[ROLLBACK] CRITICAL ERROR — all changes reverted: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    unify_locations()
