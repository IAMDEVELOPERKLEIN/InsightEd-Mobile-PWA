import fs from 'fs';
const lines = fs.readFileSync('api/index.js', 'utf8').split('\n');
lines.forEach((line, i) => {
    if (line.toLowerCase().includes("inventory") && line.toLowerCase().includes("app.post")) {
        console.log('inventory POST related at:', i + 1);
    }
    if (line.includes("INSERT INTO ph_inventory")) {
        console.log('INSERT INTO ph_inventory at:', i + 1);
    }
    if (line.includes("INSERT INTO facility_inventory")) {
        console.log('INSERT INTO facility_inventory at:', i + 1);
    }
    if (line.includes("INSERT INTO ph_buildings_inventory")) {
        console.log('INSERT INTO ph_buildings_inventory at:', i + 1);
    }
});
