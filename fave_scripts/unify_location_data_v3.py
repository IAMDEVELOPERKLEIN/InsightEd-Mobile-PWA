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
            
            config = [
                ("Region", "Region I", "EXACT"),
                ("Region", "Region II", "EXACT"),
                ("Region", "Region III", "EXACT"),
                ("Region", "Region IV-A", "EXACT"),
                ("Region", "Region V", "EXACT"),
                ("Region", "Region VI", "EXACT"),
                ("Region", "Region VII", "EXACT"),
                ("Region", "Region VIII", "EXACT"),
                ("Region", "Region IX", "EXACT"),
                ("Region", "Region X", "EXACT"),
                ("Region", "Region XI", "EXACT"),
                ("Region", "Region XII", "EXACT"),
                ("Region", "NCR", "EXACT"),
                ("Region", "CAR", "EXACT"),
                ("Region", "MIMAROPA", "EXACT"),
                ("Region", "CARAGA", "EXACT"),
                ("Region", "NIR", "EXACT"),
            ]
            
            # --- Step 1: Normalize Regions (in transaction) ---
            print("--- Step 1: Normalizing Regions ---")
            for field, target, mode in config:
                cur.execute(
                    f'SELECT COUNT(*) FROM "schools_IERN" WHERE UPPER("{field}") = UPPER(%s) AND "{field}" != %s',
                    (target, target)
                )
                count = cur.fetchone()[0]
                if count > 0:
                    print(f"  Found {count} rows needing normalization to {target}")
                    cur.execute(
                        f'UPDATE "schools_IERN" SET "{field}" = %s WHERE UPPER("{field}") = UPPER(%s) AND "{field}" != %s',
                        (target, target, target)
                    )
                    print(f"  Updated {target}: {cur.rowcount} rows")

            # --- Step 2: Normalize Other Fields (in transaction) ---
            print("--- Step 2: Normalizing Other Fields ---")
            other_fields = [
                ("Province", "UPPER"),
                ("Municipality", "UPPER"),
                ("Division", "INITCAP"),
                ("District", "INITCAP"),
                ("Legislative_District", "INITCAP")
            ]
            
            for field, mode in other_fields:
                func = "UPPER" if mode == "UPPER" else "INITCAP"
                cur.execute(f'SELECT COUNT(*) FROM "schools_IERN" WHERE "{field}" != {func}("{field}")')
                count = cur.fetchone()[0]
                if count > 0:
                    print(f"  Found {count} rows in {field} needing {mode} normalization")
                    cur.execute(f'UPDATE "schools_IERN" SET "{field}" = {func}("{field}") WHERE "{field}" != {func}("{field}")')
                    print(f"  Updated {field}: {cur.rowcount} rows")

            # --- Step 3: Atomic TRUNCATE + INSERT for all_locations ---
            print("--- Step 3: Synchronizing all_locations (atomic) ---")

            # HARDENED: TRUNCATE and INSERT run in the same transaction.
            # If the INSERT fails, the TRUNCATE is rolled back — table never left empty or locked.
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
