import os
import psycopg2
from dotenv import load_dotenv
import sys

# Load environment variables from .env file in the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def add_barangay(region, province, municipality, barangay):
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ Error: DATABASE_URL not found in .env file.")
        return

    try:
        # Connect to the database
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # 1. First, verify that the region/province/municipality combination exists
        loc_check_query = """
            SELECT DISTINCT region, province, municipality 
            FROM ph_barangays 
            WHERE UPPER(TRIM(region)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(province)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(municipality)) = UPPER(TRIM(%s))
        """
        cur.execute(loc_check_query, (region, province, municipality))
        if not cur.fetchone():
            print(f"\n[❌] Error: The location '{municipality}, {province} ({region})' was not found in the database.")
            print("Please ensure the spelling matches the existing records exactly.")
            cur.close()
            conn.close()
            return

        # 2. Check if the barangay already exists in the given municipality
        check_query = """
            SELECT id FROM ph_barangays 
            WHERE UPPER(TRIM(region)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(province)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(municipality)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(barangay)) = UPPER(TRIM(%s))
        """
        cur.execute(check_query, (region, province, municipality, barangay))
        
        if cur.fetchone():
            print(f"\n[!] Barangay '{barangay}' already exists in {municipality}, {province} ({region}).")
        else:
            # 3. Insert the new barangay
            insert_query = """
                INSERT INTO ph_barangays (region, province, municipality, barangay) 
                VALUES (%s, %s, %s, %s)
            """
            cur.execute(insert_query, (region, province, municipality, barangay))
            conn.commit()
            print(f"\n[✅] Successfully added '{barangay}' to {municipality}, {province} ({region}).")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database Error: {str(e)}")

if __name__ == "__main__":
    print("--- Add Barangay to Database ---")
    try:
        region = input("Enter Region (e.g., Region III): ").strip()
        province = input("Enter Province (e.g., BULACAN): ").strip()
        municipality = input("Enter Municipality (e.g., CITY OF MALOLOS (Capital)): ").strip()
        barangay = input("Enter Barangay Name to Add: ").strip()

        if not all([region, province, municipality, barangay]):
            print("❌ Error: All fields are required.")
        else:
            add_barangay(region, province, municipality, barangay)
            
    except KeyboardInterrupt:
        print("\nExiting...")
