
import pandas as pd
from sqlalchemy import create_engine

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def verify_health_scores():
    print("Verifying Health Scores in school_summary...")
    engine = create_engine(DB_CONNECTION_STRING)
    
    # Load school_summary with health data
    query = """
        SELECT school_name, total_learners, total_teachers, total_classrooms, 
               total_seats, total_toilets, total_furniture,
               data_health_score, data_health_description,
               flag_outlier_ptr, flag_outlier_pcr, flag_outlier_psr,
               flag_zero_teachers, flag_zero_classrooms
        FROM school_summary 
        WHERE total_learners > 0
        LIMIT 10
    """
    df = pd.read_sql(query, engine)
    
    print("\nSample Schools with Health Scores:")
    print(df.to_string())
    
    # Summary statistics
    stats_query = """
        SELECT 
            COUNT(*) as total_schools,
            AVG(data_health_score) as avg_health_score,
            COUNT(CASE WHEN data_health_description = 'Excellent' THEN 1 END) as excellent,
            COUNT(CASE WHEN data_health_description = 'Good' THEN 1 END) as good,
            COUNT(CASE WHEN data_health_description = 'Fair' THEN 1 END) as fair,
            COUNT(CASE WHEN data_health_description = 'Critical' THEN 1 END) as critical,
            COUNT(CASE WHEN flag_outlier_ptr = TRUE THEN 1 END) as outlier_ptr,
            COUNT(CASE WHEN flag_outlier_pcr = TRUE THEN 1 END) as outlier_pcr,
            COUNT(CASE WHEN flag_zero_teachers = TRUE THEN 1 END) as zero_teachers
        FROM school_summary
    """
    stats_df = pd.read_sql(stats_query, engine)
    
    print("\nHealth Score Distribution:")
    print(stats_df.to_string())
    
    # Check specific outliers
    outlier_query = """
        SELECT school_name, total_learners, total_teachers, total_classrooms,
               data_health_score, data_health_description,
               flag_outlier_ptr, flag_outlier_pcr, flag_outlier_psr
        FROM school_summary 
        WHERE flag_outlier_ptr = TRUE OR flag_outlier_pcr = TRUE OR flag_outlier_psr = TRUE
        LIMIT 5
    """
    outliers_df = pd.read_sql(outlier_query, engine)
    
    if len(outliers_df) > 0:
        print("\nSample Schools with Outlier Flags:")
        print(outliers_df.to_string())
    else:
        print("\nNo schools flagged as outliers.")
    
    print("\n[SUCCESS] Health scores verification complete.")

if __name__ == "__main__":
    verify_health_scores()
