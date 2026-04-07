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
        # Some School IDs might be integers, convert to string
        excel_ids = set(df['School ID'].astype(str).str.strip())
        school_info = df.set_index(df['School ID'].astype(str).str.strip())[['School Name', 'Municipality']].to_dict('index')

        # Connect to Database
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Check schools_IERN - using SchoolID column for the 6-digit number
            cur.execute('SELECT "SchoolID" FROM "schools_IERN"')
            iern_db = set(str(row[0]).strip() for row in cur.fetchall() if row[0])

            # Check ph_schools - using normalized iern
            cur.execute('SELECT iern FROM ph_schools')
            ph_db = set(normalize_iern(row[0]) for row in cur.fetchall() if row[0])

            # Schools in Excel but NOT in schools_IERN
            missing_short_list = []
            
            print(f"Total schools in Excel: {len(excel_ids)}")
            
            missing_from_iern = excel_ids - iern_db
            print(f"Missing from schools_IERN: {len(missing_from_iern)}")
            
            # Find schools in Excel that are NOT in schools_IERN
            # Let's list them
            sorted_missing = sorted(list(missing_from_iern))
            
            print("\nList of Schools in Excel but NOT in schools_IERN:")
            print("-" * 80)
            print(f"{'School ID':<12} | {'School Name':<40} | {'Municipality'}")
            print("-" * 80)
            
            count = 0
            for iern in sorted_missing:
                info = school_info.get(iern, {})
                name = info.get('School Name', 'Unknown')
                munc = info.get('Municipality', 'Unknown')
                # Check if it's in ph_schools
                in_ph = "YES" if iern in ph_db else "NO"
                print(f"{iern:<12} | {name[:40]:<40} | {munc} (In ph_schools: {in_ph})")
                count += 1
            
            print("-" * 80)
            print(f"Total Missing: {count}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
