import pandas as pd
from sqlalchemy import create_engine

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

engine = create_engine(DB_CONNECTION_STRING)
stats = pd.read_sql("""
    SELECT 
        COUNT(CASE WHEN data_health_description = 'Excellent' THEN 1 END) as excellent,
        COUNT(CASE WHEN data_health_description = 'Good' THEN 1 END) as good,
        COUNT(CASE WHEN data_health_description = 'Fair' THEN 1 END) as fair,
        COUNT(CASE WHEN data_health_description = 'Critical' THEN 1 END) as critical
    FROM school_summary
""", engine).iloc[0]

print("=== Updated Health Distribution ===")
print(f"Excellent (score = 100): {int(stats['excellent'])} schools")
print(f"Good (score 80-99): {int(stats['good'])} schools")
print(f"Fair (score 50-79): {int(stats['fair'])} schools")
print(f"Critical (score < 50): {int(stats['critical'])} schools")
