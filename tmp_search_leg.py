import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()
cur.execute("SELECT table_name, column_name FROM information_schema.columns WHERE column_name LIKE '%legislative%' OR column_name LIKE '%leg_district%'")
print("Tables/Columns with 'legislative' or 'leg_district':")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
