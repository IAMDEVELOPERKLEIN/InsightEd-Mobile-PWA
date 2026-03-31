import fs from 'fs';
const filePath = 'e:/InsightEd-Mobile-PWA/api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// 1. Fix submitted_by
content = content.replace(/sp\.submitted_by,/g, 'NULL as submitted_by,');

// 2. Fix grade_kinder -> enroll_kinder
content = content.replace(/sp\.grade_kinder/g, 'sp.enroll_kinder');
content = content.replace(/sp\.grade_(\d+)/g, 'sp.enroll_g$1');

// 3. Blanket replace dangerous legacy school_profiles columns with NULL
const dangerousCols = [
  'classes_kinder', 'classes_grade_',
  'aral_math_', 'aral_read_', 'aral_sci_',
  'cnt_less_', 'cnt_within_', 'cnt_above_',
  'stat_sned_', 'stat_disability_', 'stat_als_', 'stat_muslim_', 'stat_ip_', 'stat_displaced_', 'stat_repetition_', 'stat_overage_', 'stat_dropout_',
  'shift_kinder', 'shift_g', 'mode_kinder', 'mode_g', 'adm_mdl', 'adm_odl', 'adm_tvi', 'adm_blended',
  'teach_kinder', 'teach_g', 'teach_multi_', 'teach_exp_',
  'spec_math_', 'spec_science_', 'spec_english_', 'spec_filipino_', 'spec_ap_', 'spec_mapeh_', 'spec_esp_', 'spec_tle_', 'spec_general_', 'spec_ece_',
  'build_classrooms_', 'res_ecart_', 'res_laptop_', 'res_printer_', 'res_tv_', 'seats_kinder', 'seats_grade_',
  'res_toilets_', 'res_sci_labs', 'res_com_labs', 'res_tvl_workshops', 'res_electricity_', 'res_water_', 'res_buildable_', 'sha_category'
];

dangerousCols.forEach(col => {
  const regex = new RegExp('sp\\\\.' + col + '[a-zA-Z0-9_]*', 'g');
  content = content.replace(regex, 'NULL /* missing from ph_schools */');
});

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed api/index.js safely');
