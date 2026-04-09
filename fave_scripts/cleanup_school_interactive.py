import os
import psycopg2
from psycopg2 import sql
from dotenv import load_dotenv
import sys

# Load environment variables
# Assuming .env is in the parent directory as per the original JS script
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '.env')
load_dotenv(dotenv_path)

DATABASE_URL = os.getenv('DATABASE_URL')

TABLES_TO_CLEAN = [
    'ph_buildings_demolition',
    'ph_buildings_inventory',
    'ph_buildings_repairs',
    'ph_ecart_batches',
    'ph_school_buildable_spaces',
    'school_location_profiles',
    'school_ownership_docs',
    'ph_school_completion',
    'pending_schools',
    'users',
    'ph_schools'
]

def purge(school_id):
    if not school_id or not school_id.strip():
        print("❌ Error: Invalid School ID.")
        sys.exit(1)

    school_id = school_id.strip()
    print(f"\nStarting selective purge for School ID: {school_id}")

    if not DATABASE_URL:
        print("Error: DATABASE_URL not found in .env")
        sys.exit(1)

    try:
        # Connect to the database
        # psycopg2 handles SSL via connection string or extra params. 
        # For Heroku/RDS it usually needs sslmode=require if not in localhost
        conn = psycopg2.connect(DATABASE_URL)
        conn.autocommit = False # Ensure we are in a transaction
        cur = conn.cursor()

        try:
            for table in TABLES_TO_CLEAN:
                try:
                    # Execute deletion using sql.SQL for dynamic table names safely
                    query = sql.SQL("DELETE FROM {} WHERE school_id = %s").format(sql.Identifier(table))
                    cur.execute(query, (school_id,))
                    print(f" [SUCCESS] [{table}] Deleted {cur.rowcount} records.")
                except Exception as e:
                    print(f" [ERROR] [{table}] Error: {e}")
                    raise e

            conn.commit()
            print("\nPurge completed successfully.")
        except Exception as e:
            conn.rollback()
            print(f"\nTransaction rolled back due to error: {e}")
        finally:
            cur.close()
            conn.close()

    except Exception as e:
        print(f"Connection Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    print("--- InsightEd School Cleanup Tool (Python) ---")
    try:
        school_id_input = input("Enter the School ID to remove records for: ")
        purge(school_id_input)
    except KeyboardInterrupt:
        print("\nOperation cancelled by user.")
        sys.exit(0)
