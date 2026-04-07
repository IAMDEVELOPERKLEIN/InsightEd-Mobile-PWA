import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")

try:
    conn = psycopg2.connect(db_url)
    with conn.cursor() as cur:
        cur.execute("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'schools_IERN'")
        cols = cur.fetchall()
        for col in cols:
            print(f"{col[0]}: {col[1]}")
except Exception as e:
    print(f"Error: {e}")
finally:
    if conn:
        conn.close()
