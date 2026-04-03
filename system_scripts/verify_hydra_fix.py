import psycopg2
import os
from dotenv import load_dotenv

def verify_hydra_schema():
    load_dotenv()
    db_url = os.getenv('DATABASE_URL')
    if not db_url:
        print("❌ DATABASE_URL not found in .env")
        return

    try:
        conn = psycopg2.connect(db_url)
        cur = conn.cursor()

        tables = ['engineer_documents', 'school_ownership_docs', 'lgu_projects']
        
        print("Auditing Hydra Manifest Columns...")
        for table in tables:
            cur.execute(f"""
                SELECT column_name, data_type 
                FROM information_schema.columns 
                WHERE table_name = '{table}' AND column_name = 'hydra_manifest'
            """)
            res = cur.fetchone()
            if res:
                print(f"[OK] {table}.hydra_manifest exists: {res[1]}")
            else:
                print(f"[FAIL] {table}.hydra_manifest MISSING")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"Verification Error: {e}")

if __name__ == "__main__":
    verify_hydra_schema()
