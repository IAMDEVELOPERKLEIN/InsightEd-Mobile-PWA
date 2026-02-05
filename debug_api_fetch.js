
// Native fetch used (Node 18+)

async function verifyApi() {
    const region = 'Region II';
    const division = 'Batanes';
    const url = `http://localhost:3000/api/monitoring/schools?region=${encodeURIComponent(region)}&division=${encodeURIComponent(division)}&limit=1000`;

    console.log("Fetching:", url);
    try {
        const res = await fetch(url);
        if (!res.ok) {
            console.error("Fetch failed:", res.status, res.statusText);
            const text = await res.text();
            console.error(text);
            return;
        }

        // Check if response is wrapped
        const json = await res.json();
        const data = Array.isArray(json) ? json : json.data;

        console.log(`Total Schools Returned: ${data.length}`);

        // Count incomplete
        let missingPct = 0;
        let zeroPct = 0;

        data.forEach(s => {
            if (s.completion_percentage === undefined || s.completion_percentage === null) {
                console.log(`[MISSING PCT] ${s.school_name} (${s.school_id})`);
                missingPct++;
            } else if (parseInt(s.completion_percentage) === 0) {
                console.log(`[ZERO PCT]    ${s.school_name} (${s.school_id})`);
                zeroPct++;
            }
        });

        console.log(`Schools with missing pct: ${missingPct}`);
        console.log(`Schools with 0 pct: ${zeroPct}`);

    } catch (err) {
        console.error(err);
    }
}

verifyApi();
