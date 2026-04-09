import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()
database_url = os.getenv('DATABASE_URL')
conn = psycopg2.connect(database_url)
cur = conn.cursor()
cur.execute("SELECT column_name FROM information_schema.columns WHERE table_name = 'schools_IERN'")
print("schools_IERN columns:")
print([row[0] for row in cur.fetchall()])
cur.close()
conn.close()
