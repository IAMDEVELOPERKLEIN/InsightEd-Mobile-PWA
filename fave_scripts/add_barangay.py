import os
import psycopg2
from dotenv import load_dotenv
import sys

# Load environment variables from .env file in the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def add_barangay(region, province, barangay):
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ Error: DATABASE_URL not found in .env file.")
        return

    try:
        # Connect to the database
        conn = psycopg2.connect(database_url, sslmode='require')
        cur = conn.cursor()

        # Set other hierarchy fields to NULL as requested
        division = None
        district = None
        municipality = None
        legislative_district = None

        print(f"ℹ️ Creating barangay mapping in 'all_new_locations' for Province: {province}")
        print(f"   (Municipality, Division, District, and Legislative District will be set to NULL)")

        # 1. Check if the exact combination already exists in all_new_locations
        check_query = """
            SELECT id FROM all_new_locations 
            WHERE UPPER(TRIM(region)) = UPPER(TRIM(%s)) 
              AND UPPER(TRIM(province)) = UPPER(TRIM(%s)) 
              AND division IS NULL
              AND district IS NULL
              AND municipality IS NULL
              AND legislative_district IS NULL
              AND UPPER(TRIM(barangay)) = UPPER(TRIM(%s))
        """
        cur.execute(check_query, (region, province, barangay))
        
        if cur.fetchone():
            print(f"\n[!] Barangay '{barangay}' already exists in 'all_new_locations' for {province} ({region}).")
        else:
            # 2. Insert the new barangay mapping
            insert_query = """
                INSERT INTO all_new_locations (region, province, division, district, municipality, legislative_district, barangay) 
                VALUES (%s, %s, %s, %s, %s, %s, %s)
            """
            cur.execute(insert_query, (region, province, division, district, municipality, legislative_district, barangay))
            conn.commit()
            print(f"\n[✅] Successfully added Barangay '{barangay}' to 'all_new_locations' for {province} ({region}).")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"\n[ERROR] Database Error: {str(e)}")

if __name__ == "__main__":
    print("--- Add Barangay to Database (all_new_locations) ---")
    try:
        region = input("Enter Region (e.g., REGION III, CARAGA): ").strip()
        province = input("Enter Province (e.g., BULACAN, DAVAO DEL SUR): ").strip()
        barangay = input("Enter Barangay Name to Add: ").strip()

        if not all([region, province, barangay]):
            print("❌ Error: All fields are required.")
        else:
            add_barangay(region, province, barangay)
            
    except KeyboardInterrupt:
        print("\nExiting...")
