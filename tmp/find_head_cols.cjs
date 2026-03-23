const fs = require('fs');
const data = JSON.parse(fs.readFileSync('e:\\InsightEd-Mobile-PWA\\tmp\\columns_dump.json', 'utf8'));

const ph_schools = data.filter(r => r.table_name === 'ph_schools').map(r => ({ name: r.column_name, type: r.data_type }));
const school_profiles = data.filter(r => r.table_name === 'school_profiles').map(r => ({ name: r.column_name, type: r.data_type }));

const head_keywords = ['head', 'principal', 'lead', 'name', 'contact', 'email', 'phone', 'mobile', 'position', 'designation', 'sex', 'gender', 'birth', 'hired', 'position_title', 'first_name', 'last_name', 'middle_name'];

const ph_head = ph_schools.filter(c => head_keywords.some(k => c.name.toLowerCase().includes(k)));
const sp_head = school_profiles.filter(c => head_keywords.some(k => c.name.toLowerCase().includes(k)));

const result = {
  ph_schools_head_related: ph_head,
  school_profiles_head_related: sp_head
};

fs.writeFileSync('e:\\InsightEd-Mobile-PWA\\tmp\\head_comparison.json', JSON.stringify(result, null, 2), 'utf8');
console.log('✅ Result written to tmp/head_comparison.json');
