import os
import psycopg2
from dotenv import load_dotenv

def check_location_tables():
    load_dotenv()
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("DATABASE_URL not found")
        return

    conn = psycopg2.connect(db_url)
    try:
        with conn.cursor() as cur:
            # Check for table existence
            cur.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_name IN ('all_locations', 'all_new_locations', 'schools_IERN')
            """)
            tables = [row[0] for row in cur.fetchall()]
            print(f"Tables found: {tables}")

            for table in tables:
                print(f"\n--- Columns in {table} ---")
                cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'")
                cols = [row[0] for row in cur.fetchall()]
                print(cols)

                cur.execute(f"SELECT COUNT(*) FROM \"{table}\"")
                print(f"Row count: {cur.fetchone()[0]}")

            if 'all_locations' in tables:
                print("\n--- Sample from all_locations ---")
                cur.execute("SELECT * FROM all_locations LIMIT 5")
                for row in cur.fetchall():
                    print(row)
    finally:
        conn.close()

if __name__ == "__main__":
    check_location_tables()
