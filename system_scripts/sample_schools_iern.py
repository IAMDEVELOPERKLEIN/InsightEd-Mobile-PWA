import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        cur.execute('SELECT iern, "SchoolID", "School_Name" FROM "schools_IERN" LIMIT 20')
        rows = cur.fetchall()
        print(f"{'iern':<15} | {'SchoolID':<15} | {'School_Name'}")
        print("-" * 60)
        for row in rows:
            print(f"{str(row[0]):<15} | {str(row[1]):<15} | {str(row[2])}")
        
        cur.execute('SELECT COUNT(*) FROM "schools_IERN"')
        print(f"\nTotal rows in schools_IERN: {cur.fetchone()[0]}")

except Exception as e:
    print(f"Error: {e}")
finally:
    if 'conn' in locals() and conn:
        conn.close()
