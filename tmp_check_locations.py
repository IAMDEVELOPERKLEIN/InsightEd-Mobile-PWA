import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()
cur.execute("SELECT * FROM all_locations LIMIT 5")
print("all_locations samples:")
for row in cur.fetchall():
    print(row)
cur.close()
conn.close()
