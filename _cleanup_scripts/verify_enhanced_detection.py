
import pandas as pd
from sqlalchemy import create_engine

DB_CONNECTION_STRING = "postgresql+psycopg2://Administrator1:pRZTbQ2T1JD7@stride-posgre-prod-01.postgres.database.azure.com:5432/insightEd"

def verify_enhanced_detection():
    print("=== Enhanced Fraud Detection Verification ===\n")
    engine = create_engine(DB_CONNECTION_STRING)
    
    # Overall statistics
    stats_query = """
        SELECT 
            COUNT(*) as total_schools,
            AVG(data_health_score) as avg_health_score,
            COUNT(CASE WHEN data_health_description = 'Excellent' THEN 1 END) as excellent,
            COUNT(CASE WHEN data_health_description = 'Good' THEN 1 END) as good,
            COUNT(CASE WHEN data_health_description = 'Fair' THEN 1 END) as fair,
            COUNT(CASE WHEN data_health_description = 'Critical' THEN 1 END) as critical
        FROM school_summary
    """
    stats = pd.read_sql(stats_query, engine).iloc[0]
    
    print("Overall Health Distribution:")
    print(f"  Total Schools: {stats['total_schools']}")
    print(f"  Average Score: {stats['avg_health_score']:.1f}/100")
    print(f"  Excellent: {stats['excellent']} ({stats['excellent']/stats['total_schools']*100:.1f}%)")
    print(f"  Good: {stats['good']} ({stats['good']/stats['total_schools']*100:.1f}%)")
    print(f"  Fair: {stats['fair']} ({stats['fair']/stats['total_schools']*100:.1f}%)")
    print(f"  Critical: {stats['critical']} ({stats['critical']/stats['total_schools']*100:.1f}%)")
    
    # Zero-value flags
    print("\n=== Rule 1: Zero-Value Detection ===")
    zero_flags = [
        'flag_zero_teachers', 'flag_zero_classrooms', 'flag_zero_seats',
        'flag_zero_toilets', 'flag_zero_furniture', 'flag_zero_resources',
        'flag_zero_organized_classes'
    ]
    
    for flag in zero_flags:
        count_query = f"SELECT COUNT(*) FROM school_summary WHERE {flag} = TRUE"
        count = pd.read_sql(count_query, engine).iloc[0, 0]
        print(f"  {flag.replace('flag_zero_', '').capitalize()}: {count} schools")
    
    # Correlation anomalies
    print("\n=== Rule 2: Correlation-Based Anomalies ===")
    anomaly_flags = [
        'flag_anomaly_teachers', 'flag_anomaly_classrooms', 'flag_anomaly_seats',
        'flag_anomaly_toilets', 'flag_anomaly_furniture', 'flag_anomaly_organized_classes'
    ]
    
    for flag in anomaly_flags:
        count_query = f"SELECT COUNT(*) FROM school_summary WHERE {flag} = TRUE"
        count = pd.read_sql(count_query, engine).iloc[0, 0]
        print(f"  {flag.replace('flag_anomaly_', '').capitalize()}: {count} schools")
    
    # Teacher validation
    print("\n=== Rule 3: Teacher Metrics Validation ===")
    exp_mismatch = pd.read_sql("SELECT COUNT(*) FROM school_summary WHERE flag_exp_mismatch = TRUE", engine).iloc[0, 0]
    spec_exceeds = pd.read_sql("SELECT COUNT(*) FROM school_summary WHERE flag_spec_exceeds = TRUE", engine).iloc[0, 0]
    
    print(f"  Experience Mismatch: {exp_mismatch} schools")
    print(f"  Specialized Exceeds Total: {spec_exceeds} schools")
    
    # Sample schools with issues
    print("\n=== Sample Schools with Multiple Flags ===")
    sample_query = """
        SELECT school_name, total_learners, total_teachers, total_classrooms,
               data_health_score, data_health_description,
               flag_zero_seats, flag_zero_toilets, flag_zero_furniture,
               flag_anomaly_teachers, flag_anomaly_classrooms,
               flag_exp_mismatch, flag_spec_exceeds
        FROM school_summary 
        WHERE data_health_score < 90
        ORDER BY data_health_score ASC
        LIMIT 10
    """
    flagged_schools = pd.read_sql(sample_query, engine)
    
    if len(flagged_schools) > 0:
        print(flagged_schools.to_string())
    else:
        print("No schools with health score < 90")
    
    # Critical schools detail
    print("\n=== Critical Schools (Score < 50) ===")
    critical_query = """
        SELECT school_name, total_learners, total_teachers, total_classrooms,
               total_seats, total_toilets, total_furniture, total_organized_classes,
               total_teaching_experience, total_specialized_teachers,
               data_health_score
        FROM school_summary 
        WHERE data_health_description = 'Critical'
        ORDER BY data_health_score ASC
    """
    critical = pd.read_sql(critical_query, engine)
    
    if len(critical) > 0:
        print(critical.to_string())
    else:
        print("No critical schools found.")
    
    print("\n[SUCCESS] Enhanced fraud detection verification complete.")

if __name__ == "__main__":
    verify_enhanced_detection()
