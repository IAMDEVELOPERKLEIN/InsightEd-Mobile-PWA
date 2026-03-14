  }
});

// ==================================================================
//               FINANCE DASHBOARD ENDPOINTS (UPDATED)
// ==================================================================
app.get('/api/finance-dashboard/projects', async (req, res) => {
  try {
    const aggregateQuery = `
      SELECT 
        COUNT(*) as total_projects,
        SUM(COALESCE(tranche_1, 0)) as total_tranche_1,
        SUM(COALESCE(tranche_2, 0)) as total_tranche_2,
        SUM(COALESCE(tranche_3, 0)) as total_tranche_3
      FROM (
        SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
          tranche_1, tranche_2, tranche_3
        FROM engineer_form
        WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
          AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
        ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      ) Latest
    `;
    const aggResult = await pool.query(aggregateQuery);

    const tableQuery = `
      SELECT DISTINCT ON (COALESCE(ipc, project_id::text)) 
        project_id, project_name, status_of_construction_phase AS status,
        mode_of_project, tranche_1, tranche_2, tranche_3,
        moa_pdf, rta_pdf, moa, rta
      FROM engineer_form
      WHERE (NULLIF(moa_pdf, '') IS NOT NULL OR NULLIF(moa, '') IS NOT NULL)
        AND (NULLIF(rta_pdf, '') IS NOT NULL OR NULLIF(rta, '') IS NOT NULL)
      ORDER BY COALESCE(ipc, project_id::text), project_id DESC
    `;
    const tableResult = await pool.query(tableQuery);

    res.json({
      aggregates: {
        totalProjects: parseInt(aggResult.rows[0].total_projects || 0, 10),
        totalTranche1: parseFloat(aggResult.rows[0].total_tranche_1 || 0),
        totalTranche2: parseFloat(aggResult.rows[0].total_tranche_2 || 0),
        totalTranche3: parseFloat(aggResult.rows[0].total_tranche_3 || 0)
      },
      projects: tableResult.rows
    });
  } catch (err) {
    console.error("❌ Error fetching finance projects:", err.message);
    res.status(500).json({ error: "Failed to fetch finance projects" });
  }
});

app.patch('/api/finance-dashboard/projects/:id/tranches', async (req, res) => {
  const { id } = req.params;
  const { tranche_1, tranche_2, tranche_3 } = req.body;
  try {
    const query = `
      UPDATE engineer_form 
      SET 
        tranche_1 = COALESCE($1, tranche_1), 
        tranche_2 = COALESCE($2, tranche_2), 
        tranche_3 = COALESCE($3, tranche_3)
      WHERE project_id = $4
      RETURNING project_id, tranche_1, tranche_2, tranche_3
    `;
    const result = await pool.query(query, [tranche_1, tranche_2, tranche_3, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }

    res.json({ success: true, project: result.rows[0] });
  } catch (err) {
    console.error("❌ Error updating project tranches:", err.message);
    res.status(500).json({ error: "Failed to update project tranches" });
  }
});

// ==================================================================
//               IMPLEMENTING AGENCY DASHBOARD ENDPOINTS
// ==================================================================
app.get('/api/agency-dashboard/projects', async (req, res) => {
  try {
    const aggregateQuery = `
      WITH ValidProjects AS (
          SELECT DISTINCT ON (COALESCE(ipc, project_id::text))
            project_id, implementing_agencies, tranche_1, status_of_construction_phase AS status
          FROM engineer_form
          WHERE mode_of_project = 'MOA'
            AND implementing_agencies IS NOT NULL
            AND tranche_1 IS NOT NULL
            AND (moa IS NOT NULL OR moa_pdf IS NOT NULL)
            AND (rta IS NOT NULL OR rta_pdf IS NOT NULL)
          ORDER BY COALESCE(ipc, project_id::text), project_id DESC
      )
      SELECT 
        COUNT(DISTINCT implementing_agencies) as total_active_agencies,
        COUNT(*) as total_moa_projects,
        SUM(tranche_1) as total_tranche_1_value,
        COUNT(*) FILTER (WHERE status != 'Completed' AND status IS NOT NULL) as pending_moa_tasks
