const fs = require('fs');
const data = JSON.parse(fs.readFileSync('e:\\InsightEd-Mobile-PWA\\tmp\\columns_dump.json', 'utf8'));

const ph_schools = data.filter(r => r.table_name === 'ph_schools').map(r => ({ name: r.column_name, type: r.data_type }));
const school_profiles = data.filter(r => r.table_name === 'school_profiles').map(r => ({ name: r.column_name, type: r.data_type }));

const ph_names = ph_schools.map(c => c.name);
const sp_names = school_profiles.map(c => c.name);

const exact_matches = [];
const likely_matches = [];
const sp_only = [];
const ph_only = [];

// 1. Exact Matches
school_profiles.forEach(sp => {
  const match = ph_schools.find(ph => ph.name === sp.name);
  if (match) {
    exact_matches.push({ name: sp.name, type_old: sp.type, type_new: match.type });
  } else {
    sp_only.push(sp);
  }
});

ph_schools.forEach(ph => {
  if (!sp_names.includes(ph.name)) {
    ph_only.push(ph);
  }
});

// 2. Likely Matches (Simplified heuristic)
// For now, let's just look for similar names in sp_only and ph_only
const used_sp = new Set();
const used_ph = new Set();

const heuristics = [
  { old: /^grade_(\d+|kinder)$/, new: /^enroll_(\d+|kinder)$/ },
  { old: /^grade_(\d+|kinder)$/, new: /^enrollment_(\d+|kinder)$/ },
  { old: /^res_handwash_/, new: /^handwashing_stations$/ },
  // Add more as needed
];

sp_only.forEach(sp => {
  ph_only.forEach(ph => {
    if (used_sp.has(sp.name) || used_ph.has(ph.name)) return;
    
    // Fuzzy logic or common patterns
    if (sp.name.includes(ph.name) || ph.name.includes(sp.name)) {
        likely_matches.push({ old: sp.name, new: ph.name, reason: 'Partial name match' });
        used_sp.add(sp.name);
        used_ph.add(ph.name);
    }
  });
});

const report = {
  summary: {
    total_sp: school_profiles.length,
    total_ph: ph_schools.length,
    exact_matches: exact_matches.length,
    likely_matches: likely_matches.length,
    sp_unique: sp_only.length - used_sp.size,
    ph_unique: ph_only.length - used_ph.size
  },
  exact_matches,
  likely_matches,
  sp_only: sp_only.filter(s => !used_sp.has(s.name)),
  ph_only: ph_only.filter(p => !used_ph.has(p.name))
};

fs.writeFileSync('e:\\InsightEd-Mobile-PWA\\tmp\\full_comparison_report.json', JSON.stringify(report, null, 2), 'utf8');
console.log('✅ Full comparison report written to tmp/full_comparison_report.json');
