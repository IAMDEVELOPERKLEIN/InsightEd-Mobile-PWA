import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()
cur.execute("SELECT * FROM ph_barangays LIMIT 5")
print("ph_barangays samples:")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
