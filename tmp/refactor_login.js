
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// --- REFACTOR standard login ---
const loginTarget = /app\.post\('\/api\/auth\/login', async \(req, res\) => \{[\s\S]*?\}\);/;
const loginReplacement = `app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required." });

  try {
    const user = await resolveUserAndMigrate(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials." });
    }

    // Only check password if the user has a password_hash
    if (user.password_hash) {
      const isMatch = await bcrypt.compare(password, user.password_hash);
      if (!isMatch) return res.status(401).json({ error: "Invalid credentials." });
    } else {
      return res.status(401).json({ error: "Account exists but password not set. Please use Master Login or Register." });
    }

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
    
    // Fetch School ID if applicable
    let schoolId = user.school_id || null;
    if (!schoolId) {
        if (user.uid.startsWith('school_')) {
            schoolId = user.uid.split('_')[1];
        } else {
            const profileLookup = await pool.query('SELECT school_id FROM school_profiles WHERE submitted_by = $1 LIMIT 1', [user.uid]);
            if (profileLookup.rows.length > 0) schoolId = profileLookup.rows[0].school_id;
        }
    }

    res.json({ 
        success: true, 
        token, 
        user: { 
            uid: user.uid, 
            email: user.email, 
            role: user.role,
            first_name: user.first_name,
            last_name: user.last_name,
            school_id: schoolId
        } 
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
});`;

content = content.replace(loginTarget, loginReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Standard Login refactored successfully.");
