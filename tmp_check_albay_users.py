
import os
import psycopg2
from dotenv import load_dotenv

load_dotenv()

def check_albay_users():
    conn = psycopg2.connect(os.getenv('DATABASE_URL'))
    cur = conn.cursor()
    
    print("Checking for variations of 'Albay' in users table...")
    cur.execute("""
        SELECT division, COUNT(*) 
        FROM users 
        WHERE division ILIKE '%Albay%' 
        GROUP BY division
    """)
    rows = cur.fetchall()
    
    print("\nProjected Counts by Division String:")
    total = 0
    for row in rows:
        print(f"'{row[0]}': {row[1]}")
        total += row[1]
    print("\nTotal users matching '%Albay%': {total}")

    print("\nDistinct Roles in the database:")
    cur.execute("SELECT role, COUNT(*) FROM users GROUP BY role")
    roles = cur.fetchall()
    for role in roles:
        print(f"Role: {role[0]}, Count: {role[1]}")

    print("\nAll School Division Office users:")
    cur.execute("SELECT email, region, division FROM users WHERE role = 'School Division Office' ORDER BY division")
    for row in cur.fetchall():
        print(f"Email: {row[0]}, Region: '{row[1]}', Division: '{row[2]}'")

    print("\nAll Division Engineer users:")
    cur.execute("SELECT email, region, division FROM users WHERE role = 'Division Engineer' ORDER BY division")
    for row in cur.fetchall():
        print(f"Email: {row[0]}, Region: '{row[1]}', Division: '{row[2]}'")
    
    cur.close()
    conn.close()

if __name__ == "__main__":
    check_albay_users()
