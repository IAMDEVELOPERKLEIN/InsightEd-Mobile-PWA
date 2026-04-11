import os
import uuid
import bcrypt
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv('DATABASE_URL')

def restore_school(school_id, email, password, passcode):
    """
    Restores a missing user account and links it to existing ph_schools data.
    """
    conn = None
    try:
        conn = psycopg2.connect(DATABASE_URL, sslmode='require')
        cur = conn.cursor(cursor_factory=RealDictCursor)

        print(f"[SEARCH] Checking ph_schools for School ID: {school_id}...")
        cur.execute("SELECT iern, school_name, region, division, province, municipality FROM ph_schools WHERE school_id = %s", (school_id,))
        school_data = cur.fetchone()

        if not school_data:
            print(f"❌ Error: School ID {school_id} not found in ph_schools. They may need a fresh registration.")
            return

        iern = school_data['iern']
        print(f"[OK] Found existing data. IERN: {iern}")

        # 1. Check if user already exists
        cur.execute("SELECT uid, email FROM users WHERE LOWER(email) = %s OR school_id = %s", (email.lower(), school_id))
        existing_user = cur.fetchone()

        if existing_user:
            print(f"⚠️ Warning: A user record already exists for this email/school (UID: {existing_user['uid']}).")
            confirm = input("Do you want to update this existing user and re-link? (y/n): ")
            if confirm.lower() != 'y':
                print("Aborted.")
                return
            uid = existing_user['uid']
        else:
            uid = str(uuid.uuid4())
            print(f"[NEW] Generating new UID: {uid}")

        # 2. Hash Password
        print("[AUTH] Hashing password...")
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # 3. Create/Update User
        if existing_user:
            print(f"[UPDATE] Updating user {uid}...")
            cur.execute("""
                UPDATE users SET 
                    email = %s, role = %s, school_id = %s, iern = %s, 
                    password_hash = %s, hash_version = %s, passcode = %s,
                    region = %s, division = %s, province = %s, city = %s,
                    registrant_type = 'School Head', created_at = CURRENT_TIMESTAMP
                WHERE uid = %s
            """, (email.lower(), 'School Head', school_id, iern, hashed_password, 'bcrypt', passcode,
                  school_data['region'], school_data['division'], school_data['province'], school_data['municipality'], uid))
        else:
            print(f"[INSERT] Inserting new user {uid}...")
            cur.execute("""
                INSERT INTO users (
                    uid, email, role, school_id, iern, password_hash, hash_version, passcode,
                    region, division, province, city, registrant_type, created_at
                ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, CURRENT_TIMESTAMP)
            """, (uid, email.lower(), 'School Head', school_id, iern, hashed_password, 'bcrypt', passcode,
                  school_data['region'], school_data['division'], school_data['province'], school_data['municipality'], 'School Head'))

        # 4. Link ph_schools
        print(f"[LINK] Linking ph_schools record to UID {uid}...")
        cur.execute("UPDATE ph_schools SET submitted_by = %s, updated_at = CURRENT_TIMESTAMP WHERE iern = %s", (uid, iern))

        # 5. Link completion tracking (Uses IERN, but we update timestamp)
        cur.execute("UPDATE ph_school_completion SET updated_at = CURRENT_TIMESTAMP WHERE iern = %s", (iern,))

        conn.commit()
        print(f"[DONE] Success! School {school_id} has been restored and linked.")
        print(f"User Email: {email}")
        print(f"New UID: {uid}")
        print("The user can now log in and resume their work.")

    except Exception as e:
        if conn:
            conn.rollback()
        print(f"Error: {e}")
    finally:
        if conn:
            cur.close()
            conn.close()

if __name__ == "__main__":
    import getpass
    print("--- School Registration Restoration Tool ---")
    school_id = input("Enter School ID: ").strip()
    email = input("Enter Registration Email: ").strip()
    password = getpass.getpass("Enter New Password: ").strip()
    passcode = input("Enter 6-digit Passcode: ").strip()

    if not school_id or not email or not password or not passcode:
        print("Error: All fields are required.")
    else:
        restore_school(school_id, email, password, passcode)
