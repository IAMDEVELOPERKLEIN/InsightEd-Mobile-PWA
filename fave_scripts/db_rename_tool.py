import os
import psycopg2
from dotenv import load_dotenv
import sys

# Load environment variables from .env file in the parent directory
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def get_db_connection():
    database_url = os.getenv('DATABASE_URL')
    if not database_url:
        print("❌ Error: DATABASE_URL not found in .env file.")
        sys.exit(1)
    return psycopg2.connect(database_url, sslmode='require')

def get_dependencies(cur, table_name, column_name):
    """
    Finds all tables that have a foreign key pointing to the target table/column.
    """
    query = """
    SELECT
        tc.table_name AS referencing_table, 
        kcu.column_name AS referencing_column
    FROM 
        information_schema.table_constraints AS tc 
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
          AND tc.table_schema = kcu.table_schema
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
          AND ccu.table_schema = tc.table_schema
    WHERE tc.constraint_type = 'FOREIGN KEY' 
      AND ccu.table_name = %s
      AND ccu.column_name = %s;
    """
    cur.execute(query, (table_name, column_name))
    return cur.fetchall()

def rename_entry():
    print("--- 🛠️ DB Rename & Dependency Tool ---")
    
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # 1. Gather Inputs
        table = input("1. Which table in the postgres? ").strip()
        column = input("2. Which column? ").strip()
        old_val = input("3. Which exact entry would i like to change (current value)? ").strip()
        new_val = input("4. What do i like to change it to? ").strip()

        # Verify entry exists
        check_query = f"SELECT count(*) FROM {table} WHERE {column} = %s"
        cur.execute(check_query, (old_val,))
        count = cur.fetchone()[0]

        if count == 0:
            print(f"❌ Error: No entry found in '{table}.{column}' with value '{old_val}'.")
            return

        print(f"Found {count} row(s) to update.")

        # 5a. Check database dependencies
        print("\n🔍 Checking for database dependencies...")
        deps = get_dependencies(cur, table, column)
        
        if deps:
            print(f"Found references in {len(deps)} other tables:")
            for ref_table, ref_col in deps:
                # Count referencing rows
                cur.execute(f"SELECT count(*) FROM {ref_table} WHERE {ref_col} = %s", (old_val,))
                ref_count = cur.fetchone()[0]
                print(f"  - Table: {ref_table}, Column: {ref_col} ({ref_count} references)")
        else:
            print("No external database foreign key dependencies found.")

        # 5b. Check codebase dependencies
        print("\n🔍 Checking for codebase references (this may take a moment)...")
        code_refs = []
        try:
            search_dirs = ['api', 'src', 'insighted-backend']
            for sdir in search_dirs:
                abs_sdir = os.path.join(os.path.dirname(__file__), '..', sdir)
                if not os.path.exists(abs_sdir): continue
                
                for root, dirs, files in os.walk(abs_sdir):
                    if 'node_modules' in dirs: dirs.remove('node_modules')
                    for file in files:
                        if file.endswith(('.js', '.ts', '.py', '.sql', '.html')):
                            fpath = os.path.join(root, file)
                            try:
                                with open(fpath, 'r', encoding='utf-8', errors='ignore') as f:
                                    for i, line in enumerate(f, 1):
                                        if old_val in line:
                                            code_refs.append((fpath, i, line.strip()))
                            except Exception: pass
        except Exception as e:
            print(f"⚠️ Warning: Codebase search encountered an error: {e}")

        if code_refs:
            print(f"Found {len(code_refs)} potential references in the codebase:")
            for i in range(min(10, len(code_refs))):
                fpath, line_no, content = code_refs[i]
                rel_path = os.path.relpath(fpath, os.path.join(os.path.dirname(__file__), '..'))
                print(f"  - {rel_path}:{line_no}: {content[:60]}...")
            if len(code_refs) > 10:
                print(f"  ... and {len(code_refs) - 10} more.")
            print("\n⚠️ NOTE: Codebase references must be updated manually in your editor.")
        else:
            print("No potential codebase references found.")

        # 6. Confirmation and Execution
        confirm = input(f"\n⚠️ Proceed with updating DB '{old_val}' to '{new_val}'? (y/n): ").lower()
        if confirm != 'y':
            print("Aborted.")
            return

        try:
            # Start transaction explicitly if needed, but psycopg2 does it automatically on execute
            # Update main table
            update_main_query = f"UPDATE {table} SET {column} = %s WHERE {column} = %s"
            cur.execute(update_main_query, (new_val, old_val))
            
            # Update dependencies
            for ref_table, ref_col in deps:
                update_dep_query = f"UPDATE {ref_table} SET {ref_col} = %s WHERE {ref_col} = %s"
                cur.execute(update_dep_query, (new_val, old_val))

            conn.commit()
            print(f"\n✅ Successfully updated '{old_val}' to '{new_val}' in {table} and its dependencies.")
        except Exception as e:
            conn.rollback()
            print(f"❌ Error during update: {e}")

        cur.close()
        conn.close()

    except Exception as e:
        print(f"❌ Connection Error: {e}")

if __name__ == "__main__":
    try:
        rename_entry()
    except KeyboardInterrupt:
        print("\nExiting...")
