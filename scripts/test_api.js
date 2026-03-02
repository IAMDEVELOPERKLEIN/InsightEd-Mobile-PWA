import fetch from 'node-fetch';

async function check() {
    try {
        const res = await fetch('http://localhost:3000/api/ph_schools/112155');
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    } catch (e) {
        console.error(e);
    }
}
check();
