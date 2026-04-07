import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv
from difflib import get_close_matches

def main():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("ERROR: DATABASE_URL not found in .env", file=sys.stderr)
        sys.exit(1)

    try:
        # Load Excel file and get the 13 missing schools
        excel_path = "e:/InsightEd-Mobile-PWA/Palawan Schools.xlsx"
        df_excel = pd.read_excel(excel_path)
        
        # Connect to DB and get all schools
        conn = psycopg2.connect(db_url)
        with conn.cursor() as cur:
            # Get IDs currently in DB
            cur.execute('SELECT "SchoolID", iern FROM "schools_IERN"')
            rows = cur.fetchall()
            db_ids = set()
            for row in rows:
                if row[0]: db_ids.add(str(row[0]).strip())
                if row[1]: 
                    if '-' in row[1]: db_ids.add(row[1].split('-')[-1].strip())
                    else: db_ids.add(row[1].strip())

            # Identify missing from Excel
            excel_ids = df_excel['School ID'].astype(str).str.strip().tolist()
            missing_ids = [eid for eid in excel_ids if eid not in db_ids]
            df_missing = df_excel[df_excel['School ID'].astype(str).str.strip().isin(missing_ids)]

            # Get all school names from DB for similarity check
            cur.execute('SELECT "SchoolID", "School_Name", "Municipality" FROM "schools_IERN"')
            db_schools = cur.fetchall()
            db_names = [row[1] for row in db_schools if row[1]]
            name_to_info = {row[1]: (row[0], row[2]) for row in db_schools if row[1]}

            print(f"Checking {len(df_missing)} schools for similarity...\n")
            print("-" * 100)
            print(f"{'Missing School Name':<40} | {'Suggested Match in DB':<40} | {'Match ID'}")
            print("-" * 100)

            for index, row in df_missing.iterrows():
                m_name = row['School Name']
                m_id = str(row['School ID'])
                
                # Simple exact name match (ignoring case)
                exact_matches = [dn for dn in db_names if dn.lower() == m_name.lower()]
                
                # Fuzzy matches
                matches = get_close_matches(m_name, db_names, n=1, cutoff=0.8)
                
                final_matches = list(set(exact_matches + matches))
                
                if final_matches:
                    for match in final_matches:
                        db_id, db_munc = name_to_info[match]
                        print(f"{m_name[:40]:<40} | {match[:40]:<40} | {db_id}")
                else:
                    print(f"{m_name[:40]:<40} | {'No similar name found':<40} | -")

            print("-" * 100)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
