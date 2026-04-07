import os
import sys
import pandas as pd
import psycopg2
from dotenv import load_dotenv
from difflib import get_close_matches

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
                if row[1]: db_ids.add(normalize_iern(row[1]))

            # Identify missing from Excel
            excel_ids_str = df_excel['School ID'].astype(str).str.strip().tolist()
            missing_ids = [eid for eid in excel_ids_str if eid not in db_ids]
            df_missing = df_excel[df_excel['School ID'].astype(str).str.strip().isin(missing_ids)]

            # Get school names from DB ONLY for Palawan division
            # First, find the exact division name
            cur.execute("SELECT DISTINCT \"Division\" FROM \"schools_IERN\" WHERE \"Division\" ILIKE '%Palawan%'")
            divisions = [d[0] for d in cur.fetchall()]
            print(f"Found Palawan divisions in DB: {divisions}")
            
            if not divisions:
                print("No Palawan division found in DB!")
                return

            # Query names from these divisions
            placeholders = ','.join(['%s'] * len(divisions))
            query = f'SELECT "SchoolID", "School_Name", "Municipality", "Division" FROM "schools_IERN" WHERE "Division" IN ({placeholders})'
            cur.execute(query, divisions)
            db_schools = cur.fetchall()
            
            db_names = [row[1] for row in db_schools if row[1]]
            name_to_info = {}
            for row in db_schools:
                if row[1]:
                    if row[1] not in name_to_info:
                        name_to_info[row[1]] = []
                    name_to_info[row[1]].append((row[0], row[2], row[3]))

            print(f"\nChecking {len(df_missing)} schools for similarity within Palawan Division...\n")
            print("-" * 120)
            print(f"{'Missing School Name':<40} | {'Suggested Match in Palawan':<40} | {'Match ID':<10} | {'Municipality'}")
            print("-" * 120)

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
                        for db_id, db_munc, db_div in name_to_info[match]:
                            print(f"{m_name[:40]:<40} | {match[:40]:<40} | {str(db_id):<10} | {db_munc}")
                else:
                    print(f"{m_name[:40]:<40} | {'No similar name found in Palawan':<40} | -          | -")

            print("-" * 120)

    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn:
            conn.close()

if __name__ == "__main__":
    main()
