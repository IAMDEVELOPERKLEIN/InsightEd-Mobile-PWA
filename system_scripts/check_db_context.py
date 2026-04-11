
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')

def check_context():
    database_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Check records around id 46957
        print("Checking records around id 46957 in schools_IERN...")
        cur.execute('SELECT id, iern, "SchoolID", "School_Name", updated_at FROM "schools_IERN" WHERE id >= 46000 ORDER BY id DESC LIMIT 50')
        rows = cur.fetchall()
        print(f"{'ID':<6} | {'IERN':<12} | {'SchoolID':<8} | {'Name':<30} | {'Updated At'}")
        print("-" * 80)
        for r in rows:
            print(f"{r[0]:<6} | {r[1]:<12} | {r[2]:<8} | {str(r[3])[:30]:<30} | {r[4]}")

        # Check for triggers on ph_schools and ph_school_completion
        for table in ['ph_schools', 'ph_school_completion']:
            print(f"\nChecking triggers for {table}...")
            cur.execute(f"""
                SELECT tgname, tgenabled, tgtype
                FROM pg_trigger
                WHERE tgrelid = '{table}'::regclass
                AND tgisinternal = false
            """)
            triggers = cur.fetchall()
            if triggers:
                for t in triggers:
                    print(t)
            else:
                print("No user triggers found.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    check_context()
