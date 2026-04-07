import fs from 'fs';

try {
    const data = JSON.parse(fs.readFileSync('identical_content_report.json', 'utf8'));
    
    // Map to store schools and their total count of redundant clones (count - 1)
    const schoolMap = new Map();
    let totalWasteRows = 0;

    data.forEach(group => {
        const schoolName = group.school_name || "Unknown School";
        const schoolId = group.school_id || "No ID";
        const key = `${schoolName} (ID: ${schoolId})`;
        
        const redundantCount = parseInt(group.dup_count) - 1;
        totalWasteRows += redundantCount;

        const current = schoolMap.get(key) || 0;
        schoolMap.set(key, current + redundantCount);
    });

    const sortedSchools = [...schoolMap.entries()].sort((a,b) => b[1] - a[1]);

    let output = `# 📊 Duplicate Schools Summary Report\n\n`;
    output += `**Total Schools Affected**: ${schoolMap.size}\n`;
    output += `**Total Redundant Records Found**: ${totalWasteRows}\n\n`;
    output += `| School Name & ID | Redundant Copies (To be Deleted) |\n`;
    output += `| :--- | :--- |\n`;

    sortedSchools.forEach(([school, count]) => {
        output += `| ${school} | **${count}** |\n`;
    });

    fs.writeFileSync('school_duplicate_summary.md', output);
    console.log("✅ Summary generated: school_duplicate_summary.md");

} catch (err) {
    console.error("❌ Failed to process report:", err.message);
}
