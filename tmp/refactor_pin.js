
import fs from 'fs';

const filePath = 'e:/OneDrive - Department of Education/001 DepEd Seb/InsightED/InsightEd-Mobile-PWA/api/index.js';
let content = fs.readFileSync(filePath, 'utf8');

// --- 1. REFACTOR setup-pin ---
const setupPinTarget = /app\.post\('\/api\/auth\/setup-pin', async \(req, res\) => \{[\s\S]*?\}\);/;
const setupPinReplacement = `app.post('/api/auth/setup-pin', async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin || pin.length !== 6) {
    return res.status(400).json({ success: false, error: "Valid 6-digit PIN and email are required." });
  }
  
  try {
    const user = await resolveUserAndMigrate(email);
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found." });
    }
    
    await pool.query('UPDATE users SET passcode = $1 WHERE uid = $2', [pin, user.uid]);
    
    return res.json({ success: true, message: "PIN set successfully." });
  } catch (err) {
    console.error("Setup PIN Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});`;

content = content.replace(setupPinTarget, setupPinReplacement);

// --- 2. REFACTOR pin-login ---
const pinLoginTarget = /app\.post\('\/api\/auth\/pin-login', async \(req, res\) => \{[\s\S]*?\}\);/;
const pinLoginReplacement = `app.post('/api/auth/pin-login', async (req, res) => {
  const { email, pin } = req.body;
  if (!email || !pin) {
    return res.status(400).json({ success: false, error: "Email and PIN are required." });
  }

  try {
    const user = await resolveUserAndMigrate(email);

    if (!user) {
      return res.status(401).json({ success: false, error: "Invalid Credentials" });
    }

    // STRICT Plain Text Comparison
    if (user.passcode !== pin) {
      return res.status(401).json({ success: false, error: "Incorrect PIN." });
    }

    // --- AUTO-NORMALIZE ACCOUNT CATEGORY ---
    let finalCategory = user.account_category;
    if (!finalCategory || user.role === 'EFD' || user.role === 'HRODI') {
      if (user.role === 'EFD' || user.role === 'HRODI') {
        finalCategory = 'EFD Engineer';
      } else if (user.role === 'Division Engineer' || user.role === 'DepEd Engineer') {
        finalCategory = 'DepEd Engineer';
      } else {
        finalCategory = user.role;
      }
    }

    // Generate Firebase Token for PWA session matching
    let customToken = null;
    try {
      if (admin.apps.length > 0) {
        customToken = await admin.auth().createCustomToken(user.uid, { role: user.role });
      }
    } catch (tokenErr) {
      console.error("[PIN LOGIN] Custom Token Error:", tokenErr.message);
    }

    return res.json({
      success: true,
      customToken: customToken,
      user: {
        uid: user.uid,
        email: user.email,
        role: user.role,
        region: user.region,
        division: user.division,
        account_category: finalCategory
      }
    });

  } catch (err) {
    console.error("PIN Login Error:", err);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});`;

content = content.replace(pinLoginTarget, pinLoginReplacement);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Setup-PIN and PIN-Login refactored successfully.");
