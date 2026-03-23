const fs = require('fs');
const path = require('path');

const projectRoot = 'e:/InsightEd-Mobile-PWA';
const modularDir = path.join(projectRoot, 'src', 'components', 'modular');
const userProfilePath = path.join(projectRoot, 'src', 'modules', 'UserProfile.jsx');

const results = {};

function extractFormData(content, fileName) {
    let keys = [];
    const match = content.match(/const \[formData, setFormData\] = useState\(\{([\s\S]*?)\}\);/);
    if (match) {
        const lines = match[1].split('\n').filter(line => line.trim() && !line.trim().startsWith('//'));
        keys = lines.map(line => {
            const keyMatch = line.match(/^\s*([a-zA-Z0-9_]+)\s*:/);
            if (keyMatch) return keyMatch[1];
            return null;
        }).filter(Boolean);
    } 
    
    if (keys.length === 0) {
        // Try getting individual useStates
        const stateMatches = content.matchAll(/const \[([a-zA-Z0-9_]+),\s*set[a-zA-Z0-9_]+\]\s*=\s*useState/g);
        for (const match of stateMatches) {
            const name = match[1];
            // Filter out obvious UI state
            if (!['loading', 'isSaving', 'showSuccess', 'isReadOnly', 'hasSubmitted', 'isReviewMode', 'showWelcomeBack', 'showDraftModal', 'currentStep', 'currentGradeIndex', 'availableGrades', 'schoolOffering', 'hasKinder', 'hasElementary'].includes(name)) {
                keys.push(name);
            }
        }
    }
    
    results[fileName] = keys.length ? keys : ['No fields found'];
}

if (fs.existsSync(userProfilePath)) {
    extractFormData(fs.readFileSync(userProfilePath, 'utf8'), 'UserProfile.jsx');
}

if (fs.existsSync(modularDir)) {
    const files = fs.readdirSync(modularDir).filter(f => f.startsWith('Unit') && f.endsWith('.jsx'));
    for (const file of files) {
        const content = fs.readFileSync(path.join(modularDir, file), 'utf8');
        extractFormData(content, file);
    }
}

fs.writeFileSync(path.join(projectRoot, 'tmp', 'school_head_fields.json'), JSON.stringify(results, null, 2));
console.log('Fields extracted to tmp/school_head_fields.json');
