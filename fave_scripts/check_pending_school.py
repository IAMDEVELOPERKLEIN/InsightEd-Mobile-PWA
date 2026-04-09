
import os
import psycopg2
from dotenv import load_dotenv
import sys

# Set default encoding to utf-8
if sys.stdout.encoding != 'utf-8':
    import io
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

load_dotenv('.env')

def check_pending(school_id):
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("[Error] DATABASE_URL not found in .env file.")
        return

    try:
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Check columns of pending_schools
        print("Checking columns of pending_schools...")
        cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'pending_schools'")
        pending_cols = [c[0] for c in cur.fetchall()]
        print(f"Columns in pending_schools: {pending_cols}")

        if not pending_cols:
             print("[Error] Table pending_schools not found or has no columns.")
        else:
            # Check in pending_schools using available columns
            col = None
            if 'school_id' in pending_cols: col = 'school_id'
            elif 'SchoolID' in pending_cols: col = 'SchoolID'
            elif 'id' in pending_cols: col = 'id'
            
            if col:
                print(f"Checking for {school_id} in pending_schools using column '{col}'...")
                cur.execute(f"SELECT * FROM pending_schools WHERE \"{col}\" = %s", (school_id,))
                rows = cur.fetchall()
                if rows:
                    print(f"[Done] Found in pending_schools: {rows}")
                else:
                    print(f"[Not Found] Not found in pending_schools.")
            else:
                print("Could not find a likely school ID column in pending_schools.")

        # Also check other potential tables
        cur.execute("SELECT table_name FROM information_schema.tables WHERE table_name ILIKE 'pending%'")
        tables = [t[0] for t in cur.fetchall()]
        print(f"Other 'pending' tables found: {tables}")
        
        for table in tables:
            if table == 'pending_schools': continue
            try:
                # Check column names first to see if SchoolID exists
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                cols = [c[0] for c in cur.fetchall()]
                if 'SchoolID' in cols or 'school_id' in cols:
                    col = 'SchoolID' if 'SchoolID' in cols else 'school_id'
                    cur.execute(f"SELECT * FROM \"{table}\" WHERE \"{col}\" = %s", (school_id,))
                    res = cur.fetchall()
                    if res:
                        print(f"[Done] Found in {table}: {res}")
            except Exception as e:
                print(f"Error checking {table}: {e}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database Error: {str(e)}")

if __name__ == "__main__":
    check_pending('502928')
