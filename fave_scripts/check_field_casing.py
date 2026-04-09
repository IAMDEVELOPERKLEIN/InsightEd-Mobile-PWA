import os
import psycopg2
from dotenv import load_dotenv

def check_field_casing():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            fields = ["Division", "Province", "Municipality", "District", "Legislative_District"]
            for field in fields:
                print(f"\n--- Sample unique values for {field} ---")
                cur.execute(f'SELECT DISTINCT "{field}" FROM "schools_IERN" WHERE "Region" = \'Region II\' LIMIT 5')
                for row in cur.fetchall():
                    print(row[0])
    finally:
        conn.close()

if __name__ == "__main__":
    check_field_casing()
