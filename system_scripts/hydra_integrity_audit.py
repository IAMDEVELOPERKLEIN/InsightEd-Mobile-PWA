import os
import json
import psycopg2
from psycopg2.extras import RealDictCursor

# Database connection configuration
DB_CONFIG = {
    "dbname": "insighted_local",
    "user": "postgres",
    "password": "password",
    "host": "localhost",
    "port": "5432"
}

def check_hydra_integrity():
    try:
        conn = psycopg2.connect(**DB_CONFIG)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        print("🔍 [Hydra-Audit] Starting Integrity Check...")
        
        # 1. Check Engineer Documents
        cur.execute("SELECT project_id, ipc, hydra_manifest FROM engineer_documents WHERE hydra_manifest IS NOT NULL")
        eng_docs = cur.fetchall()
        print(f"📁 Found {len(eng_docs)} projects with Hydra manifests in engineer_documents.")
        
        for doc in eng_docs:
            manifest = doc['hydra_manifest']
            print(f"  - Project {doc['project_id']} (IPC: {doc['ipc']}):")
            for key, pages in manifest.items():
                print(f"    * {key.upper()}: {len(pages)} pages")
                # Verify shards exist in unified_binaries
                shard_ids = [p['binary_id'] for p in pages]
                if not shard_ids:
                    print(f"      ❌ ERROR: Empty manifest for {key}")
                    continue
                
                cur.execute("SELECT binary_id FROM unified_binaries WHERE binary_id IN %s", (tuple(shard_ids),))
                found_shards = [r['binary_id'] for r in cur.fetchall()]
                missing = set(shard_ids) - set(found_shards)
                
                if missing:
                    print(f"      ❌ ERROR: {len(missing)} shards missing from unified_binaries: {list(missing)}")
                else:
                    print(f"      ✅ All {len(shard_ids)} shards verified in registry.")

        # 2. Check School Ownership Docs
        cur.execute("SELECT iern, hydra_manifest FROM school_ownership_docs WHERE hydra_manifest IS NOT NULL")
        school_docs = cur.fetchall()
        print(f"\n📁 Found {len(school_docs)} schools with Hydra manifests in school_ownership_docs.")
        
        for doc in school_docs:
            manifest = doc['hydra_manifest']
            # Note: handle both keyed and non-keyed (for backward compatibility during migration)
            if isinstance(manifest, list):
                pages = manifest
                print(f"  - School IERN {doc['iern']}: {len(pages)} pages (Non-keyed)")
            else:
                print(f"  - School IERN {doc['iern']}: Keyed Manifest")
                for key, pages in manifest.items():
                    print(f"    * {key}: {len(pages)} pages")
            
        cur.close()
        conn.close()
        print("\n✅ [Hydra-Audit] Audit Complete.")
        
    except Exception as e:
        print(f"❌ [Hydra-Audit] Audit Failed: {str(e)}")

if __name__ == "__main__":
    check_hydra_integrity()
