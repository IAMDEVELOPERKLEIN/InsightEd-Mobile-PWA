
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env')

def trace_502928():
    database_url = os.getenv('DATABASE_URL')
    try:
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Check ph_schools
        print("Checking ph_schools for 502928...")
        cur.execute("SELECT * FROM ph_schools WHERE school_id = '502928'")
        row = cur.fetchone()
        if row:
            colnames = [desc[0] for desc in cur.description]
            print(f"Found in ph_schools: {dict(zip(colnames, row))}")
        else:
            print("Not found in ph_schools.")

        # Check schools_IERN
        print("\nChecking schools_IERN for 502928...")
        cur.execute("SELECT * FROM \"schools_IERN\" WHERE \"SchoolID\" = '502928'")
        row = cur.fetchone()
        if row:
            colnames = [desc[0] for desc in cur.description]
            print(f"Found in schools_IERN: {dict(zip(colnames, row))}")
        else:
            print("Not found in schools_IERN.")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    trace_502928()
