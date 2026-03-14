  } catch (err) {
    console.error("Get LGU Projects Error:", err);
    res.status(500).json({ error: "Failed to fetch LGU projects." });
  }
});
*/

// 3. Update LGU Project (Liquidation)
app.put('/api/lgu/projects/:id', async (req, res) => {
  const { id } = req.params;
  // Support both Liquidation AND Progress updates
  const {
    liquidated_amount, liquidation_date,
    project_status, accomplishment_percentage, status_as_of_date, amount_utilized, nature_of_delay
  } = req.body;

  try {
    // 1. Fetch current data
    const pRes = await pool.query('SELECT * FROM lgu_projects WHERE lgu_project_id = $1', [id]);
    if (pRes.rows.length === 0) {
      return res.status(404).json({ error: "Project not found" });
    }
    const current = pRes.rows[0];

    // 2. Prepare Updates
    let updates = [];
    let values = [];
    let idx = 1;

    // Liquidation Logic
    if (liquidated_amount !== undefined) {
      const totalFunds = parseFloat(current.total_funds || 0);
      let liq = 0;
      if (typeof liquidated_amount === 'string') {
        liq = parseFloat(liquidated_amount.replace(/,/g, ''));
      } else {
        liq = parseFloat(liquidated_amount || 0);
      }

      let pct = 0;
      if (totalFunds > 0) pct = parseFloat(((liq / totalFunds) * 100).toFixed(2));

      updates.push(`liquidated_amount = $${idx++} `); values.push(liq);
      updates.push(`percentage_liquidated = $${idx++} `); values.push(pct);

      if (liquidation_date) {
        updates.push(`liquidation_date = $${idx++} `); values.push(liquidation_date);
      }
    }

    // Progress Logic
    if (project_status !== undefined) { updates.push(`project_status = $${idx++} `); values.push(project_status); }
    if (accomplishment_percentage !== undefined) {
      let acc = accomplishment_percentage;
      if (typeof acc === 'string') acc = parseFloat(acc.replace(/,/g, ''));
      updates.push(`accomplishment_percentage = $${idx++} `); values.push(acc);
    }
    if (status_as_of_date !== undefined) { updates.push(`status_as_of_date = $${idx++} `); values.push(status_as_of_date); }
    if (amount_utilized !== undefined) {
      let util = amount_utilized;
      if (typeof util === 'string') util = parseFloat(util.replace(/,/g, ''));
      updates.push(`amount_utilized = $${idx++} `); values.push(util);
    }
    if (nature_of_delay !== undefined) { updates.push(`nature_of_delay = $${idx++} `); values.push(nature_of_delay); }

    if (updates.length === 0) {
      return res.json({ success: true, message: "No changes detected." });
    }

    values.push(id);
    const query = `
      UPDATE lgu_projects
      SET ${updates.join(', ')}
      WHERE lgu_project_id = $${idx}
RETURNING *;
`;
    const result = await pool.query(query, values);

    res.json({ success: true, project: result.rows[0] });

  } catch (err) {
    console.error("Update LGU Project Error:", err);
    res.status(500).json({ error: "Failed to update project." });
  }
});

// --- LGU LIQUIDATION ENDPOINTS (DEPRECATED/KEPT FOR REF IF NEEDED but we rely on new table now) ---

// 1. Update Liquidation (Old LGU Forms - keeping if needed for other modules but user wants NEW table)
// Leaving this here as it was part of existing code, but our new UI will use the new endpoints above.
app.put('/api/lgu/projects/:id/liquidation', async (req, res) => {
  const { id } = req.params; // project_id in lgu_forms
  const { liquidated_amount, liquidation_date, funds_downloaded } = req.body;

  try {
    // Calculate percentage
    // Ensure we have funds_downloaded. If not passed, fetch it.
    let totalFunds = funds_downloaded;

    if (!totalFunds) {
