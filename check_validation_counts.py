import pyodbc

# Connect to database
conn_str = (
    "Driver={ODBC Driver 18 for SQL Server};"
    "Server=tcp:insighted.database.windows.net,1433;"
    "Database=insighted;"
    "Uid=CloudSAe7c5cc04@insighted;"
    "Pwd=P@ssw0rd123;"
    "Encrypt=yes;"
    "TrustServerCertificate=no;"
    "Connection Timeout=30;"
)

conn = pyodbc.connect(conn_str)
cursor = conn.cursor()

# Check school_summary table
print("=== SCHOOL_SUMMARY TABLE ANALYSIS ===\n")

cursor.execute("SELECT COUNT(*) FROM school_summary")
total = cursor.fetchone()[0]
print(f"Total records in school_summary: {total}\n")

cursor.execute("""
    SELECT 
        data_health_description, 
        COUNT(*) as count
    FROM school_summary 
    GROUP BY data_health_description
    ORDER BY count DESC
""")
print("Breakdown by health description:")
for row in cursor.fetchall():
    desc = row[0] if row[0] else "NULL"
    print(f"  {desc}: {row[1]}")

# Check completed schools with health status
print("\n=== COMPLETED SCHOOLS WITH HEALTH STATUS ===\n")
cursor.execute("""
    SELECT 
        COUNT(*) as completed_with_summary
    FROM school_profiles sp
    INNER JOIN school_summary ss ON sp.school_id = ss.school_id
    WHERE sp.completion_percentage = 100
""")
completed_with_summary = cursor.fetchone()[0]
print(f"Completed schools with school_summary entry: {completed_with_summary}")

cursor.execute("""
    SELECT 
        ss.data_health_description,
        COUNT(*) as count
    FROM school_profiles sp
    INNER JOIN school_summary ss ON sp.school_id = ss.school_id
    WHERE sp.completion_percentage = 100
    GROUP BY ss.data_health_description
    ORDER BY count DESC
""")
print("\nCompleted schools by health status:")
for row in cursor.fetchall():
    desc = row[0] if row[0] else "NULL"
    print(f"  {desc}: {row[1]}")

# Check a specific region (Region II from the screenshot)
print("\n=== REGION II ANALYSIS ===\n")
cursor.execute("""
    SELECT 
        s.division,
        COUNT(s.school_id) as total_schools,
        COUNT(CASE WHEN sp.completion_percentage = 100 THEN 1 END) as completed,
        COUNT(CASE WHEN ss.data_health_description = 'Excellent' THEN 1 END) as excellent,
        COUNT(CASE WHEN ss.data_health_description != 'Excellent' AND ss.data_health_description IS NOT NULL THEN 1 END) as non_excellent
    FROM schools s
    LEFT JOIN school_profiles sp ON s.school_id = sp.school_id
    LEFT JOIN school_summary ss ON s.school_id = ss.school_id
    WHERE s.region = 'Region II'
    GROUP BY s.division
    ORDER BY s.division
""")
print("Division stats:")
for row in cursor.fetchall():
    print(f"  {row[0]}: Total={row[1]}, Completed={row[2]}, Excellent={row[3]}, Non-Excellent={row[4]}")

conn.close()
print("\n=== ANALYSIS COMPLETE ===")
