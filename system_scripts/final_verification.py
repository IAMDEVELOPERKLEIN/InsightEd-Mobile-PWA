import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv

def normalize_iern(iern):
    if not iern:
        return ""
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
        excel_path = "e:/InsightEd-Mobile-PWA/Palawan Schools.xlsx"
        df = pd.read_excel(excel_path)
        excel_ids = set(df['School ID'].astype(str).str.strip())
        school_info = df.set_index(df['School ID'].astype(str).str.strip())[['School Name', 'Municipality']].to_dict('index')

        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Get all IDs from both SchoolID and iern (normalized) in schools_IERN
            cur.execute('SELECT "SchoolID", iern FROM "schools_IERN"')
            rows = cur.fetchall()
            
            db_ids = set()
            for row in rows:
                if row[0]: # SchoolID
                    db_ids.add(str(row[0]).strip())
                if row[1]: # iern
                    db_ids.add(normalize_iern(row[1]))

            missing_from_all = excel_ids - db_ids
            
            print(f"Total schools in Excel: {len(excel_ids)}")
            print(f"Missing from both SchoolID and iern columns in schools_IERN: {len(missing_from_all)}")
            
            if len(missing_from_all) > 0:
                print("\nFinal List of Missing Schools:")
                print("-" * 80)
                print(f"{'School ID':<12} | {'School Name':<40} | {'Municipality'}")
                print("-" * 80)
                for iern in sorted(list(missing_from_all)):
                    info = school_info.get(iern, {})
                    print(f"{iern:<12} | {info.get('School Name', 'Unknown')[:40]:<40} | {info.get('Municipality', 'Unknown')}")
                print("-" * 80)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
