import os
import psycopg2
from dotenv import load_dotenv

def check_regions():
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
                WHERE "Region" ILIKE '%Region XI%' 
                GROUP BY "Region"
            """)
            print("Regions matching 'Region XI':")
            for row in cur.fetchall():
                print(f"'{row[0]}': {row[1]}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_regions()
