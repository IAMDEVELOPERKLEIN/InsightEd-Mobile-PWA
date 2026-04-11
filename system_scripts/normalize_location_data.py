#!/usr/bin/env python3
import os
import sys
import psycopg2
from dotenv import load_dotenv

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env")
        sys.exit(1)

    print("--- System-wide Location Normalization Initialized ---")
    
    conn = None
    try:
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # 1. Normalize schools_IERN (Quoted Mixed-Case Columns)
            print("[INFO] Normalizing schools_IERN...")
            cur.execute("""
                UPDATE "schools_IERN"
                SET "Region" = TRIM(UPPER("Region")),
                    "Division" = TRIM(UPPER("Division")),
                    "District" = TRIM(UPPER("District")),
                    "Province" = TRIM(UPPER("Province")),
                    "Municipality" = TRIM(UPPER("Municipality")),
                    "Legislative_District" = TRIM(UPPER("Legislative_District"))
                WHERE "Region" IS NOT NULL 
                   OR "Division" IS NOT NULL
                   OR "District" IS NOT NULL
                   OR "Province" IS NOT NULL
                   OR "Municipality" IS NOT NULL
                   OR "Legislative_District" IS NOT NULL
            """)
            print(f"[OK] schools_IERN updated: {cur.rowcount} rows affected.")

            # 2. Normalize ph_schools (Lowercase Columns)
            print("[INFO] Normalizing ph_schools...")
            cur.execute("""
                UPDATE ph_schools
                SET region = TRIM(UPPER(region)),
                    division = TRIM(UPPER(division)),
                    district = TRIM(UPPER(district)),
                    province = TRIM(UPPER(province)),
                    municipality = TRIM(UPPER(municipality)),
                    leg_district = TRIM(UPPER(leg_district))
                WHERE region IS NOT NULL 
                   OR division IS NOT NULL
                   OR district IS NOT NULL
                   OR province IS NOT NULL
                   OR municipality IS NOT NULL
                   OR leg_district IS NOT NULL
            """)
            print(f"[OK] ph_schools updated: {cur.rowcount} rows affected.")

            # 3. Normalize all_locations
            print("[INFO] Normalizing all_locations...")
            cur.execute("""
                UPDATE all_locations
                SET region = TRIM(UPPER(region)),
                    division = TRIM(UPPER(division)),
                    district = TRIM(UPPER(district)),
                    province = TRIM(UPPER(province)),
                    municipality = TRIM(UPPER(municipality)),
                    legislative_district = TRIM(UPPER(legislative_district))
                WHERE region IS NOT NULL 
                   OR division IS NOT NULL
                   OR district IS NOT NULL
                   OR province IS NOT NULL
                   OR municipality IS NOT NULL
                   OR legislative_district IS NOT NULL
            """)
            print(f"[OK] all_locations updated: {cur.rowcount} rows affected.")

            # 4. Normalize users
            print("[INFO] Normalizing users...")
            cur.execute("""
                UPDATE users
                SET region = TRIM(UPPER(region)),
                    division = TRIM(UPPER(division)),
                    province = TRIM(UPPER(province)),
                    city = TRIM(UPPER(city))
                WHERE region IS NOT NULL 
                   OR division IS NOT NULL
                   OR province IS NOT NULL
                   OR city IS NOT NULL
            """)
            print(f"[OK] users updated: {cur.rowcount} rows affected.")

            conn.commit()
            print("[DONE] Database normalization complete!")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"CRITICAL: Normalization failed: {e}")
        sys.exit(1)
    finally:
        if conn:
            conn.close()

if __name__ == "__main__":
    main()
