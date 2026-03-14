
const API_BASE = 'http://127.0.0.1:3000/api';

async function verify() {
  console.log("🚀 Starting Finance Dashboard Verification...");
  
  try {
    // 1. Get all projects
    const initialRes = await fetch(`${API_BASE}/finance-dashboard/projects`);
    const initialData = await initialRes.json();
    if (!initialRes.ok) throw new Error(`Finance Dashboard API Error: ${initialData.error}`);
    
    const initialProjects = initialData.projects;
    console.log(`📊 Initial Finance Projects: ${initialProjects.length}`);
    
    if (initialProjects.length === 0) {
      console.log("⚠️ No projects in Finance Dashboard. Please ensure at least one project has MOA/RTA PDFs uploaded.");
      return;
    }
    
    const targetProject = initialProjects[0];
    console.log(`🎯 Testing with Project: ${targetProject.project_name} (ID: ${targetProject.project_id})`);
    
    // 2. Perform a status update via the regular update endpoint
    console.log("📝 Performing Regular Status Update...");
    const updateResponse = await fetch(`${API_BASE}/update-project/${targetProject.project_id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        statusOfConstructionPhase: 'Under Construction',
        update_type: 'Verification Test',
        uid: 'dummy_verifier',
        modifiedBy: 'Antigravity Verifier'
      })
    });
    
    const updateResult = await updateResponse.json();
    if (!updateResponse.ok) {
      throw new Error(`API Update failed: ${updateResult.message || updateResult.error}`);
    }
    
    console.log("✅ Update successful.");
    
    // 3. Refresh Finance Dashboard
    console.log("🔄 Refreshing Finance Dashboard...");
    const finalRes = await fetch(`${API_BASE}/finance-dashboard/projects`);
    const finalData = await finalRes.json();
    if (!finalRes.ok) throw new Error(`Finance Dashboard API Error: ${finalData.error}`);
    
    const finalProjects = finalData.projects;
    
    // Check if our project is still there (using IPC if possible, or name)
    const stillThere = finalProjects.find(p => p.project_name === targetProject.project_name);
    
    if (stillThere) {
      console.log("✅ Project PERSISTED in Finance Dashboard after update!");
      console.log(`💰 Tranche 1: ${stillThere.tranche_1}, MOA PDF: ${stillThere.moa_pdf ? 'Exists' : 'MISSING'}`);
      
      if (!stillThere.moa_pdf || !stillThere.rta_pdf) {
          console.error("❌ MOA or RTA PDF was lost during update!");
      } else {
          console.log("✅ MOA/RTA PDFs preserved successfully.");
      }
    } else {
      console.error("❌ Project DISAPPEARED from Finance Dashboard after update!");
    }
    
  } catch (err) {
    console.error("❌ Verification failed:", err.message);
  }
}

verify();
