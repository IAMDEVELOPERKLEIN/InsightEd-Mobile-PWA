import os
import psycopg2
from dotenv import load_dotenv

def list_all_regions():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT "Region", COUNT(*) 
                FROM "schools_IERN" 
                GROUP BY "Region"
                ORDER BY "Region"
            """)
            print(f"{'Region Name':<40} | {'Count':<10}")
            print("-" * 55)
            for row in cur.fetchall():
                print(f"{str(row[0]):<40} | {row[1]:<10}")
    finally:
        conn.close()

if __name__ == "__main__":
    list_all_regions()
