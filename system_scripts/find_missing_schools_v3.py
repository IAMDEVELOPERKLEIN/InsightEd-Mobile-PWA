import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv

def normalize_iern(iern):
    if not iern:
        return ""
    # Remove any prefix like '2026-'
    if '-' in iern:
        return iern.split('-')[-1].strip()
    return iern.strip()

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    try:
        # Load Excel file
        excel_path = "e:/InsightEd-Mobile-PWA/Palawan Schools.xlsx"
        df = pd.read_excel(excel_path)
        excel_ids = set(df['School ID'].astype(str).str.strip())
        school_info = df.set_index(df['School ID'].astype(str).str.strip())[['School Name', 'Municipality']].to_dict('index')

        # Connect to Database
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Check schools_IERN
            cur.execute('SELECT iern FROM "schools_IERN"')
            iern_db = set(normalize_iern(row[0]) for row in cur.fetchall() if row[0])

            # Check ph_schools
            cur.execute('SELECT iern FROM ph_schools')
            ph_db = set(normalize_iern(row[0]) for row in cur.fetchall() if row[0])

            # Schools in ph_schools but NOT in schools_IERN (from the Excel file)
            missing_from_iern = excel_ids - iern_db
            in_ph_schools = missing_from_iern.intersection(ph_db)
            
            # Find schools in Excel that are NOT in schools_IERN
            print(f"Total schools in Excel: {len(excel_ids)}")
            print(f"Missing from schools_IERN: {len(missing_from_iern)}")
            print(f"Found in ph_schools (but missing from schools_IERN): {len(in_ph_schools)}")

            if len(in_ph_schools) > 0:
                print("\nSchools in ph_schools but NOT in schools_IERN:")
                print("-" * 60)
                for iern in sorted(list(in_ph_schools)):
                    info = school_info.get(iern, {})
                    print(f"{iern:<10} | {info.get('School Name', 'Unknown')[:35]:<35} | {info.get('Municipality', 'Unknown')}")
            
            # If the user specifically said 10 schools, maybe they are just looking for the first 10 or something else?
            # Or maybe they know there are 10 that were recently added to ph_schools but not yet in schools_IERN?
            
            # Let's also check schools in Excel that are NOT in BOTH (truly missing)
            truly_missing = missing_from_iern - ph_db
            print(f"\nTruly missing (not in either table): {len(truly_missing)}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
