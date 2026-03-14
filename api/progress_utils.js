
/**
 * Shared helper to calculate rigorous school progress across dashboards.
 * Ensures consistent XP and completion flags.
 */
export const calculateRigorousSchoolProgress = async (pool, schoolId) => {
  const result = await pool.query(
    `SELECT 
      unit1_completed, unit2_completed, unit3_completed, unit4_completed,
      unit5_completed, unit6_completed, unit7_completed, unit8_completed,
      unit9_completed, unit10_completed, curricular_offering,
      unit1, unit2, unit3, unit4, unit5, unit6, unit7, unit8, unit9, unit10,
      school_id, school_name, total_enrollment, division, region, unit_completion,
      province, municipality, barangay, district, leg_district, latitude, longitude,
      head_first_name, head_last_name, head_sex, head_position_title, 
      head_date_of_birth, head_date_hired
     FROM ph_schools WHERE school_id = $1`,
    [schoolId]
  );

  if (result.rows.length === 0) return null;

  const row = result.rows[0];
  let completedUnits = [];
  let incompleteUnits = [];
  let xp = 0;
  const backfillClauses = [];

  // --- Unit 1: School Identity ---
  const u1Fields = [
    row.school_id, row.school_name, row.region, row.province, 
    row.municipality, row.barangay, row.division, row.district, 
    row.leg_district, row.curricular_offering, row.latitude, 
    row.longitude, row.head_first_name, row.head_last_name, 
    row.head_sex, row.head_position_title, row.head_date_of_birth, 
    row.head_date_hired
  ];
  const u1StrictlyDone = u1Fields.every(f => f !== null && f !== undefined && String(f).trim() !== "");
  
  let u1 = row.unit1_completed || u1StrictlyDone;
  
  if (u1StrictlyDone && !row.unit1_completed) {
    backfillClauses.push("unit1_completed = TRUE, unit1 = 1");
  } else if (!u1StrictlyDone && row.unit1_completed) {
    u1 = false;
    backfillClauses.push("unit1_completed = FALSE, unit1 = 2");
  }

  if (u1) { completedUnits.push(1); xp += 150; } else if (row.unit1 === 2 || !u1StrictlyDone) { incompleteUnits.push(1); }

  // --- Unit 2: Enrollment ---
  let u2 = row.unit2_completed;
  if (!u2 && row.total_enrollment > 0) { u2 = true; backfillClauses.push("unit2_completed = TRUE, unit2 = 1"); }
  if (!u2) {
    const ck = await pool.query(`SELECT unit2_simplified_enrollment FROM ph_schools WHERE school_id = $1 AND unit2_simplified_enrollment IS NOT NULL LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
    if (ck.rows.length > 0) { u2 = true; backfillClauses.push("unit2_completed = TRUE, unit2 = 1"); }
  }
  if (u2) { completedUnits.push(2); xp += 200; } else if (row.unit2 === 2) { incompleteUnits.push(2); }

  // --- Unit 3: Organized Classes ---
  let u3 = row.unit3_completed;
  if (!u3) {
    const ck = await pool.query(`SELECT unit3_simplified_counts FROM ph_schools WHERE school_id = $1 AND unit3_simplified_counts IS NOT NULL LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
    if (ck.rows.length > 0) { u3 = true; backfillClauses.push("unit3_completed = TRUE, unit3 = 1"); }
  }
  if (u3) { completedUnits.push(3); xp += 200; } else if (row.unit3 === 2) { incompleteUnits.push(3); }

  // --- Unit 4: Learner Profile ---
  let u4 = row.unit4_completed;
  if (!u4) {
    const ck = await pool.query(`SELECT als_g1 FROM ph_schools WHERE school_id = $1 AND als_g1 IS NOT NULL AND als_g1 > 0 LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
    if (ck.rows.length > 0) { u4 = true; backfillClauses.push("unit4_completed = TRUE, unit4 = 1"); }
  }
  if (u4) { completedUnits.push(4); xp += 250; } else if (row.unit4 === 2) { incompleteUnits.push(4); }

  // --- Unit 5: Shifting & Modality ---
  let u5 = row.unit5_completed;
  if (!u5) {
    const ck = await pool.query(`SELECT shifting_modality FROM ph_schools WHERE school_id = $1 AND shifting_modality IS NOT NULL AND shifting_modality != '' LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
    if (ck.rows.length > 0) { u5 = true; backfillClauses.push("unit5_completed = TRUE, unit5 = 1"); }
  }
  if (u5) { completedUnits.push(5); xp += 300; } else if (row.unit5 === 2) { incompleteUnits.push(5); }

  // --- Unit 6: Teaching Personnel (LIVE CHECK) ---
  let u6 = false;
  const u6Teachers = await pool.query(
    `SELECT COUNT(*) as total,
            SUM(CASE WHEN (COALESCE(monday_mins,0) + COALESCE(tuesday_mins,0) + COALESCE(wednesday_mins,0) + COALESCE(thursday_mins,0) + COALESCE(friday_mins,0)) = 0 THEN 1 ELSE 0 END) as zero_load
     FROM ph_teachers_list WHERE school_id = $1`, [schoolId]
  ).catch(() => ({ rows: [{ total: 0, zero_load: 0 }] }));
  const { total: u6Total, zero_load: u6ZeroLoad } = u6Teachers.rows[0] || { total: 0, zero_load: 0 };
  if (parseInt(u6Total) > 0) {
    if (parseInt(u6ZeroLoad) > 0) {
      incompleteUnits.push(6);
      backfillClauses.push("unit6_completed = FALSE, unit6 = 2");
    } else {
      u6 = true;
      backfillClauses.push("unit6_completed = TRUE, unit6 = 1");
    }
  }
  if (u6) { completedUnits.push(6); xp += 300; }

  // --- Unit 7: School Resources ---
  let u7 = row.unit7_completed;
  if (!u7) {
    const ck = await pool.query(`SELECT unit7_furniture FROM ph_schools WHERE school_id = $1 AND unit7_furniture IS NOT NULL LIMIT 1`, [schoolId]).catch(() => ({ rows: [] }));
    if (ck.rows.length > 0) { u7 = true; backfillClauses.push("unit7_completed = TRUE, unit7 = 1"); }
  }
  if (u7) { completedUnits.push(7); xp += 350; } else if (row.unit7 === 2) { incompleteUnits.push(7); }

  // --- Unit 8: Physical Facilities ---
  let u8 = row.unit8_completed || (row.unit8 === 1);
  if (!u8) {
    const ck = await pool.query(`
      SELECT (SELECT COUNT(*) FROM ph_buildings_inventory WHERE school_id = $1) as inv,
             (SELECT COUNT(*) FROM ph_buildings_repairs WHERE school_id = $1) as rep,
             (SELECT COUNT(*) FROM ph_buildings_demolition WHERE school_id = $1) as demo
    `, [schoolId]).catch(() => ({ rows: [{ inv: 0, rep: 0, demo: 0 }] }));
    const c = ck.rows[0];
    if (parseInt(c.inv) > 0 || parseInt(c.rep) > 0 || parseInt(c.demo) > 0) { u8 = true; backfillClauses.push("unit8_completed = TRUE, unit8 = 1"); }
  }
  if (u8) { completedUnits.push(8); xp += 500; } else if (row.unit8 === 2) { incompleteUnits.push(8); }

  // --- Unit 9: School Location ---
  let u9 = row.unit9_completed;
  if (!u9) {
    const ck = await pool.query(`SELECT COUNT(*) as cnt FROM school_location_profiles WHERE school_id = $1`, [schoolId]).catch(() => ({ rows: [{ cnt: 0 }] }));
    if (parseInt(ck.rows[0]?.cnt) > 0) { u9 = true; backfillClauses.push("unit9_completed = TRUE, unit9 = 1"); }
  }
  if (u9) { completedUnits.push(9); xp += 500; } else if (row.unit9 === 2) { incompleteUnits.push(9); }

  // --- Unit 10 ---
  if (row.unit10_completed) { completedUnits.push(10); xp += 500; } else if (row.unit10 === 2) { incompleteUnits.push(10); }

  const totalUnits = 9; // Core units
  const percentage = parseFloat(((completedUnits.filter(u => u <= 9).length / totalUnits) * 100).toFixed(2));

  // --- Retroactive Backfill ---
  backfillClauses.push(`unit_completion = ${percentage}`);
  if (backfillClauses.length > 0) {
    const unique = [...new Set(backfillClauses.join(', ').split(', '))].join(', ');
    pool.query(`UPDATE ph_schools SET ${unique} WHERE school_id = $1`, [schoolId])
      .catch(e => console.warn(`[Progress Backfill] ${schoolId}:`, e.message));
  }

  return {
    completedUnits,
    incompleteUnits,
    xp,
    percentage,
    curricular_offering: row.curricular_offering,
    division: row.division,
    region: row.region
  };
};
