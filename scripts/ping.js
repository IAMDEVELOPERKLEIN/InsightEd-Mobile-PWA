fetch('http://localhost:3000/api/ph_schools/unit1', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ school_id: '123456', school_name: 'test', region: 'r', division: 'd', district: 'di', curricular_offering: 'c' })
})
.then(r => r.text())
.then(console.log)
.catch(console.error);
