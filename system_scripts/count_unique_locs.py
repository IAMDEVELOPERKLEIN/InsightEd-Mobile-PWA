import os
import psycopg2
from dotenv import load_dotenv

def count_unique_combinations():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT COUNT(DISTINCT ("Region", "Division", "District", "Province", "Municipality", "Legislative_District")) 
                FROM "schools_IERN"
                WHERE "status" = 'Active'
            """)
            print(f"Unique combinations in schools_IERN (Active): {cur.fetchone()[0]}")
            
            cur.execute("SELECT COUNT(*) FROM all_locations")
            print(f"Total rows in all_locations: {cur.fetchone()[0]}")
    finally:
        conn.close()

if __name__ == "__main__":
    count_unique_combinations()
