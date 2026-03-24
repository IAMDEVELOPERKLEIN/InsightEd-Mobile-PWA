import pandas as pd
from sqlalchemy import create_engine, text

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

engine = create_engine(DB_CONNECTION_STRING)

print("Deleting existing data quality alerts...")
with engine.connect() as conn:
    result = conn.execute(text("DELETE FROM notifications WHERE sender_name = 'Data Quality Monitor'"))
    conn.commit()
    print(f"Deleted {result.rowcount} existing alerts")
