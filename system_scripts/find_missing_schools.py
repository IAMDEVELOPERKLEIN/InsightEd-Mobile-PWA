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

    print("--- Searching for Missing Palawan Schools ---")

    try:
        # Load Excel file
        excel_path = "e:/InsightEd-Mobile-PWA/Palawan Schools.xlsx"
        df = pd.read_excel(excel_path)
        # Convert School ID to string and strip spaces for robust comparison
        excel_ids = set(df['School ID'].astype(str).str.strip())
        school_info = df.set_index(df['School ID'].astype(str).str.strip())[['School Name', 'Municipality']].to_dict('index')

        # Connect to Database
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Query all iern values from schools_IERN
            cur.execute('SELECT iern FROM "schools_IERN"')
            db_ierns = set(row[0].strip() for row in cur.fetchall() if row[0])

            # Find missing IERNs (in Excel but not in DB)
            missing_ierns = excel_ids - db_ierns
            
            # Print missing schools
            print(f"Total schools in Excel: {len(excel_ids)}")
            print(f"Total schools found in DB: {len(excel_ids - missing_ierns)}")
            print(f"Missing schools: {len(missing_ierns)}")
            print("\nList of Missing Schools:")
            print("-" * 60)
            print(f"{'School ID':<10} | {'School Name':<35} | {'Municipality'}")
            print("-" * 60)
            
            # Sort missing IERNs for consistent output
            for iern in sorted(list(missing_ierns)):
                info = school_info.get(iern, {})
                name = info.get('School Name', 'Unknown')
                munc = info.get('Municipality', 'Unknown')
                print(f"{iern:<10} | {name[:35]:<35} | {munc}")
            print("-" * 60)

    except Exception as e:
        print(f"CRITICAL: Failed to find missing schools: {e}", file=sys.stderr)
        sys.exit(1)
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
