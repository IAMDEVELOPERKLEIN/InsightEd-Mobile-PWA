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
    try:
        conn = psycopg2.connect(db_url, sslmode='require')
        print("Connected successfully.")
        conn.autocommit = False
        with conn.cursor() as cur:
            print("--- Step 1: Normalizing schools_IERN ---")
            
            # Normalize numbered Regions to Title Case (e.g., 'Region XI')
            # But keep acronyms in ALL CAPS (e.g., 'NCR', 'CAR', 'MIMAROPA', 'CARAGA', 'NIR')
            # We use a case-insensitive match to find numbered regions.
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Region" = INITCAP("Region")
                WHERE "Region" ~* '^Region [IVXLCDM]+$'
                  AND "Region" != INITCAP("Region")
            """)
            print(f"Normalized numbered regions (Title Case): {cur.rowcount} rows")

            # Specifically fix 'REGION XI' to 'Region XI' just in case the regex is too broad/narrow
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Region" = 'Region XI'
                WHERE "Region" = 'REGION XI'
            """)
            if cur.rowcount > 0:
                print(f"Fixed specific REGION XI anomaly: {cur.rowcount} rows")

            # Normalize Acronym Regions to ALL CAPS
            for acronym in ['NCR', 'CAR', 'MIMAROPA', 'CARAGA', 'NIR']:
                cur.execute(f"""
                    UPDATE "schools_IERN"
                    SET "Region" = '{acronym}'
                    WHERE UPPER("Region") = '{acronym}' AND "Region" != '{acronym}'
                """)
                if cur.rowcount > 0:
                    print(f"Normalized {acronym} to ALL CAPS: {cur.rowcount} rows")

            # Normalize Provinces and Municipalities to ALL CAPS
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Province" = UPPER("Province")
                WHERE "Province" != UPPER("Province")
            """)
            print(f"Normalized Provinces to ALL CAPS: {cur.rowcount} rows")

            cur.execute("""
                UPDATE "schools_IERN"
                SET "Municipality" = UPPER("Municipality")
                WHERE "Municipality" != UPPER("Municipality")
            """)
            print(f"Normalized Municipalities to ALL CAPS: {cur.rowcount} rows")

            # Normalize Divisions, Districts, and Legislative Districts to Title Case
            # Note: We use INITCAP but might need refinement for names like "St. John"
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Division" = INITCAP("Division")
                WHERE "Division" != INITCAP("Division")
            """)
            print(f"Normalized Divisions to Title Case: {cur.rowcount} rows")

            cur.execute("""
                UPDATE "schools_IERN"
                SET "District" = INITCAP("District")
                WHERE "District" != INITCAP("District")
            """)
            print(f"Normalized Districts to Title Case: {cur.rowcount} rows")

            cur.execute("""
                UPDATE "schools_IERN"
                SET "Legislative_District" = INITCAP("Legislative_District")
                WHERE "Legislative_District" != INITCAP("Legislative_District")
            """)
            print(f"Normalized Legislative Districts to Title Case: {cur.rowcount} rows")

            print("\n--- Step 2: Synchronizing all_locations ---")
            
            # Truncate all_locations
            cur.execute('TRUNCATE TABLE all_locations')
            print("Truncated all_locations table.")

            # Repopulate from distinct schools_IERN (Active)
            cur.execute("""
                INSERT INTO all_locations (region, division, district, province, municipality, legislative_district)
                SELECT DISTINCT "Region", "Division", "District", "Province", "Municipality", "Legislative_District"
                FROM "schools_IERN"
                WHERE "status" = 'Active'
                ORDER BY "Region", "Division", "District"
            """)
            print(f"Repopulated all_locations from schools_IERN: {cur.rowcount} entries")

            conn.commit()
            print("\n--- Transaction Committed Successfully ---")

    except Exception as e:
        conn.rollback()
        print(f"CRITICAL ERROR: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    unify_locations()
