
import pandas as pd
from sqlalchemy import create_engine, text
from datetime import datetime

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def create_data_quality_alerts():
    """
    Create alert notifications for school heads of schools that are not Excellent.
    Uses the issues column from school_summary as the alert message.
    """
    print("=== Creating Data Quality Alerts ===\n")
    engine = create_engine(DB_CONNECTION_STRING)
    
    # Get schools that are not Excellent with their head's UID
    query = """
        SELECT 
            sp.submitted_by as school_head_uid,
            sp.school_id,
            sp.school_name,
            ss.data_health_score,
            ss.data_health_description,
            ss.issues
        FROM school_summary ss
        JOIN school_profiles sp ON ss.school_id = sp.school_id
        WHERE ss.data_health_description != 'Excellent'
        AND sp.submitted_by IS NOT NULL
        AND ss.issues != 'None'
        ORDER BY ss.data_health_score ASC
    """
    
    schools = pd.read_sql(query, engine)
    
    print(f"Found {len(schools)} schools requiring data quality alerts\n")
    
    if len(schools) == 0:
        print("No alerts needed - all schools are Excellent!")
        return
    
    # Display summary by health category
    print("Alert Distribution:")
    for health_desc in ['Critical', 'Fair', 'Good']:
        count = len(schools[schools['data_health_description'] == health_desc])
        if count > 0:
            print(f"  {health_desc}: {count} schools")
    
    # Create notifications
    print("\nCreating notifications...")
    
    with engine.connect() as conn:
        inserted = 0
        for _, row in schools.iterrows():
            # Create notification title based on health status
            if row['data_health_description'] == 'Critical':
                title = "URGENT: Critical Data Quality Issues Detected"
            elif row['data_health_description'] == 'Fair':
                title = "WARNING: Data Quality Issues Need Attention"
            else:  # Good
                title = "NOTICE: Minor Data Quality Issues Detected"
            
            # Message only includes the issues
            message = row['issues']
            
            # Insert notification
            insert_stmt = text("""
                INSERT INTO notifications(
                    recipient_uid, 
                    sender_uid, 
                    sender_name, 
                    title, 
                    message, 
                    type,
                    created_at
                )
                VALUES (
                    :recipient_uid,
                    'SYSTEM',
                    'Data Quality Monitor',
                    :title,
                    :message,
                    'alert',
                    :created_at
                )
                ON CONFLICT DO NOTHING
            """)
            
            conn.execute(insert_stmt, {
                'recipient_uid': row['school_head_uid'],
                'title': title,
                'message': message,
                'created_at': datetime.now()
            })
            
            inserted += 1
        
        conn.commit()
    
    print(f"\n[SUCCESS] Successfully created {inserted} data quality alerts")
    
    # Show sample alerts
    print("\nSample Alerts Created:")
    sample_query = """
        SELECT 
            sp.school_name,
            n.title,
            n.message,
            n.created_at
        FROM notifications n
        JOIN school_profiles sp ON n.recipient_uid = sp.submitted_by
        WHERE n.sender_name = 'Data Quality Monitor'
        ORDER BY n.created_at DESC
        LIMIT 5
    """
    
    samples = pd.read_sql(sample_query, engine)
    if len(samples) > 0:
        print(samples.to_string())
    
    print("\n[SUCCESS] Data quality alerts created and sent to school head dashboards.")

if __name__ == "__main__":
    create_data_quality_alerts()
