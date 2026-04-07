import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        cur.execute("SELECT iern FROM ph_schools LIMIT 10")
        rows = cur.fetchall()
        print("ph_schools Sample IERNs:")
        for row in rows:
            print(row[0])
        
        cur.execute("SELECT COUNT(*) FROM ph_schools")
        count = cur.fetchone()[0]
        print(f"\nTotal rows in ph_schools: {count}")

        # Check if any Palawan schools are in ph_schools but named differently
        cur.execute("SELECT iern, school_name FROM ph_schools WHERE division ILIKE '%Palawan%' LIMIT 10")
        rows = cur.fetchall()
        print("\nPalawan Schools in ph_schools (Sample):")
        for row in rows:
            print(f"{row[0]}: {row[1]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
