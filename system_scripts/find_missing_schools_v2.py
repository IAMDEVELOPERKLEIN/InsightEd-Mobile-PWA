import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv

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
            iern_db = set(row[0].strip() for row in cur.fetchall() if row[0])

            # Check ph_schools
            cur.execute('SELECT iern FROM ph_schools')
            ph_db = set(row[0].strip() for row in cur.fetchall() if row[0])

            # Combined DB set
            all_db = iern_db.union(ph_db)

            missing_from_iern = excel_ids - iern_db
            missing_from_ph = excel_ids - ph_db
            missing_from_both = excel_ids - all_db

            print(f"Total schools in Excel: {len(excel_ids)}")
            print(f"Missing from schools_IERN: {len(missing_from_iern)}")
            print(f"Missing from ph_schools: {len(missing_from_ph)}")
            print(f"Missing from BOTH: {len(missing_from_both)}")

            if len(missing_from_both) > 0:
                print("\nSchools Missing from BOTH Tables:")
                print("-" * 60)
                for iern in sorted(list(missing_from_both)):
                    info = school_info.get(iern, {})
                    print(f"{iern:<10} | {info.get('School Name', 'Unknown')[:35]:<35} | {info.get('Municipality', 'Unknown')}")
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
