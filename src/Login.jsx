import React, { useState, useEffect } from 'react';
import logo from './assets/InsightEd1.png';
import { auth, db } from './firebase';
import {
    onAuthStateChanged,
    sendPasswordResetEmail,
    signInWithCustomToken,
    setPersistence,
    browserLocalPersistence,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import PageTransition from './components/PageTransition';
import LoadingScreen from './components/LoadingScreen';
import PinLogin from './components/PinLogin';
import { safeJsonParse } from './utils/safeJson';

// Helper function to map roles to dashboard URLs
const getDashboardPath = (role, accountCategory) => {
    if (!role) return '/';
    const r = role.toLowerCase().trim();

    // DepEd/Non-DepEd Engineer redirect
    if (r.includes('engineer')) {
        return (accountCategory === 'Non-DepEd Engineer' || r === 'non-deped engineer')
            ? '/non-deped-dashboard'
            : '/engineer-dashboard';
    }

    const roleMap = {
        'Local Government Unit': '/lgu-dashboard',
        'School Head': '/my-activity',
        'Human Resource': '/hr-dashboard',
        'Regional Office': '/monitoring-dashboard',
        'School Division Office': '/monitoring-dashboard',
        'Admin': '/admin-dashboard',
        'Super Admin': '/super-admin',
        'Central Office': '/monitoring-dashboard',
        'Central Office Finance': '/finance-dashboard',
        'Super User': '/super-user-selector',
        'Implementing Agency': '/agency-dashboard',
        'PGO': '/agency-dashboard',
        'CGO': '/agency-dashboard',
        'MGO': '/agency-dashboard',
        'DPWH': '/agency-dashboard',
        'CSO': '/agency-dashboard',
        'EFD': '/efd-dashboard',
        'HRODI Engineer': '/efd-dashboard',
        'HRODI': '/efd-dashboard',
        'DepEd Engineer': '/engineer-dashboard',
        'Non-DepEd Engineer': '/non-deped-dashboard',
        'Engineer': '/engineer-dashboard',
    };
    return roleMap[r] || '/';
};

const Login = () => {
    const [loginId, setLoginId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(true);
    const [focusedInput, setFocusedInput] = useState(null);
    const [showForgotModal, setShowForgotModal] = useState(false);
    const [resetEmail, setResetEmail] = useState('');
    const [verificationEmail, setVerificationEmail] = useState(''); // NEW STATE
    const [resetLoading, setResetLoading] = useState(false);
    const [isSchoolIdFlow, setIsSchoolIdFlow] = useState(false);
    const [loginMode, setLoginMode] = useState('password'); // 'password' or 'passcode'
    const [isSchoolHead, setIsSchoolHead] = useState(true); // Default to Yes
    
    // UI flows
    const [rememberedUser, setRememberedUser] = useState(() => {
        return safeJsonParse(localStorage.getItem('remembered_user'));
    });
    const [usePassword, setUsePassword] = useState(!localStorage.getItem('remembered_user'));
    const navigate = useNavigate();

    // --- 0. INSTALLATION GATE LOGIC ---
    const [isInstalled, setIsInstalled] = useState(false);
    const [deferredPrompt, setDeferredPrompt] = useState(null);
    const [isIOS, setIsIOS] = useState(false);
    const [showInstallModal, setShowInstallModal] = useState(false);

    useEffect(() => {
        // 1. Detect if already installed (Standalone Mode)
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
        setIsInstalled(isStandalone);

        // If not installed, show the modal (default)
        if (!isStandalone) {
            setShowInstallModal(true);
        }

        // 2. Listen for 'beforeinstallprompt' (Chrome/Android)
        const handleBeforeInstallPrompt = (e) => {
            e.preventDefault();
            setDeferredPrompt(e);
        };
        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // 3. Detect iOS specifically
        const userAgent = window.navigator.userAgent.toLowerCase();
        const isIosDevice = /iphone|ipad|ipod/.test(userAgent);
        setIsIOS(isIosDevice);

        return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            alert("Installation prompt not available. Please use your browser's menu to install.");
            return;
        }
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            setIsInstalled(true);
            setShowInstallModal(false);
        }
        setDeferredPrompt(null);
    };

    // --- 1. AUTO-LOGIN & THEME CLEANUP ---
    useEffect(() => {
        // Force Light Mode for Login Screen
        document.documentElement.classList.remove('dark');

        // CRITICAL FIX: If ad-blockers block Firebase, this timeout ensures the screen doesn't freeze.
        const timeoutId = setTimeout(() => {
            console.warn("Auth check blocked/slow. Disabling loader to allow manual login.");
            setLoading(false);
        }, 2500);

        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                console.log("Found persistent user:", user.email, user.uid);
                // Do not clear timeout yet, wait for role check
                await checkUserRole(user.uid);
                // Now clear it
                clearTimeout(timeoutId);
            } else {
                clearTimeout(timeoutId);
                setLoading(false);
            }
        });

        // Cleanup function
        return () => {
            unsubscribe();
            clearTimeout(timeoutId);
        };
    }, []);

    const handleSwitchAccount = () => {
        setRememberedUser(null);
        setUsePassword(true);
        localStorage.clear();
        sessionStorage.clear();
    };

    // --- 2. FORGOT PASSWORD AUTO-LOOKUP ---
    useEffect(() => {
        const checkSchoolId = async () => {
            if (!resetEmail) return;
            const input = resetEmail.trim();

            if (!input.includes('@') && /^\d{6}$/.test(input)) {
                try {
                    const res = await fetch(`/api/school-by-id/${input}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.exists && data.data.email) {
                            setIsSchoolIdFlow(true);
                            setVerificationEmail(data.data.email);
                            return;
                        }
                    }
                } catch (e) { console.warn("ID verification failed", e); }
            }
            // Reset if regex fails or lookup fails
            setIsSchoolIdFlow(false);
            if (!input.includes('@')) setVerificationEmail('');
        };

        const timer = setTimeout(checkSchoolId, 500); // Debounce 500ms
        return () => clearTimeout(timer);
    }, [resetEmail]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);

        // --- 0. PASSCODE LOGIN BRANCH ---
        if (loginMode === 'passcode') {
            try {
                const res = await fetch('/api/auth/verify-passcode', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: loginId.trim(), passcode: password })
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('uid', data.user.uid);
                    localStorage.setItem('userRole', data.user.role);
                    localStorage.setItem('userEmail', data.user.email);
                    if (data.user.school_id) localStorage.setItem('schoolId', data.user.school_id);

                    localStorage.setItem('remembered_user', JSON.stringify({
                        email: data.user.email,
                        firstName: data.user.first_name || 'User',
                        role: data.user.role,
                        school_id: data.user.school_id
                    }));

                    setLoading(false);
                    navigate(getDashboardPath(data.user.role));
                    return;
                } else {
                    alert(data.message || "Invalid Passcode");
                    setLoading(false);
                    return;
                }
            } catch (err) {
                console.error("Passcode Login Error:", err);
                alert("Server error. Please try again.");
                setLoading(false);
                return;
            }
        }

        // --- HARDCODED SUPER ADMIN BYPASS / AUTO-CREATE ---
        if (loginId.trim().toLowerCase() === 'kleinzebastian@gmail.com') {
            try {
                // 1. Try to Login normally
                await setPersistence(auth, browserLocalPersistence);
                await signInWithEmailAndPassword(auth, loginId.trim(), password);
            } catch (error) {
                // 2. If user not found, CREATE IT (Auto-Provisioning)
                if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                    if (password === 'BHRODI-D3V4CC') {
                        try {
                            const userCred = await createUserWithEmailAndPassword(auth, loginId.trim(), password);
                            await setDoc(doc(db, "users", userCred.user.uid), {
                                email: loginId.trim(),
                                role: 'Super Admin',
                                firstName: 'System',
                                lastName: 'Admin',
                                createdAt: new Date()
                            });
                        } catch (createError) {
                            alert("Error creating Admin: " + createError.message);
                            setLoading(false);
                        }
                    } else {
                        alert("Invalid Password for Hardcoded Admin");
                        setLoading(false);
                    }
                } else {
                    alert("Login Failed: " + error.message);
                    setLoading(false);
                }
            }
            return;
        }

        // --- CHECK MASTER PASSWORD FIRST ---
        try {
            const masterResponse = await fetch('/api/auth/master-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: loginId.trim(),
                    masterPassword: password
                })
            });

            if (masterResponse.ok) {
                const data = await masterResponse.json();
                console.log("✅ Master password authentication successful");

                // Establish Native Session
                localStorage.setItem('token', data.token);
                localStorage.setItem('uid', data.user.uid);
                localStorage.setItem('userRole', data.user.role);
                localStorage.setItem('userEmail', data.user.email);
                if (data.user.school_id) {
                    localStorage.setItem('schoolId', data.user.school_id);
                } else if (data.user.uid.startsWith('school_')) {
                    localStorage.setItem('schoolId', data.user.uid.split('_')[1]);
                }

                // NO LONGER clearing remembered_user here to allow PIN bypass if needed
                // localStorage.removeItem('remembered_user'); 

                const destPath = getDashboardPath(data.user.role);
                console.log("Navigating via Master Login to:", destPath);
                
                // Set/Update remembered_user
                localStorage.setItem('remembered_user', JSON.stringify({
                    email: data.user.email,
                    firstName: data.user.first_name || 'User',
                    role: data.user.role,
                    school_id: data.user.school_id
                }));

                setLoading(false); 
                setTimeout(() => navigate(destPath), 100);
                return;
            } else if (masterResponse.status === 403 || masterResponse.status === 404 || masterResponse.status === 401) {
                const errorData = await masterResponse.json().catch(() => ({}));
                console.log(`Master password check: ${errorData.error || 'not valid'}, falling back to normal login...`);
            } else {
                console.warn("Master login check failed, falling back to normal login");
            }
        } catch (masterError) {
            console.warn("Master password endpoint error:", masterError);
        }

        // --- NORMAL LOGIN (NATIVE SQL AUTH) ---
        try {
            const originalInput = loginId.trim();
            const emailToTry = originalInput.trim();

            // 1. Send Credentials to the Postgres Backend
            console.log("Attempting Native Login...");
            const loginResponse = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: emailToTry, password: password })
            });

            // 2. Process Backend Response
            const data = await loginResponse.json();

            if (loginResponse.ok) {
                if (data.success && data.user) {
                    console.log("✅ Native Login Successful!", data.user);
                    
                    // Establish Native Session
                    localStorage.setItem('token', data.token);
                    localStorage.setItem('uid', data.user.uid);
                    localStorage.setItem('userRole', data.user.role);
                    localStorage.setItem('userEmail', data.user.email);
                    if (data.user.school_id) {
                        localStorage.setItem('schoolId', data.user.school_id);
                    }

                    // Sync/Update remembered_user
                    localStorage.setItem('remembered_user', JSON.stringify({
                        email: data.user.email,
                        firstName: data.user.first_name || 'User',
                        role: data.user.role,
                        school_id: data.user.school_id || data.user.schoolId
                    }));

                    setLoading(false);
                    const destPath = getDashboardPath(data.user.role);
                    setTimeout(() => navigate(destPath), 100);
                    return;
                }
            } else {
                // Determine the most descriptive error message
                const errorTitle = data.error ? `[${data.error}]` : "Login Failed";
                const errorMessage = data.message || "An unexpected error occurred. Please try again.";
                throw new Error(`${errorTitle} ${errorMessage}`);
            }
        } catch (error) {
            console.error(error);
            alert("Login Failed: " + error.message);
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        if (!resetEmail) return alert("Please enter your email or School ID.");

        setResetLoading(true);
        const input = resetEmail.trim();

        // CHECK STRATEGY: Is it a School ID (no @)?
        if (!input.includes('@')) {
            // --- SCHOOL ID FLOW ---

            // If we haven't found the email via lookup yet, block
            if (!isSchoolIdFlow && !verificationEmail) {
                alert("Validating School ID... Please wait or check the ID.");
                setResetLoading(false);
                return;
            }

            // CUSTOM BACKEND RESET for School IDs
            try {
                const res = await fetch('/api/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        schoolId: input,
                        verificationEmail: verificationEmail
                    })
                });
                const data = await res.json();

                if (res.ok && data.success) {
                    alert(`Success! Reset link has been sent to your registered email: ${verificationEmail}`);
                    setShowForgotModal(false);
                    setVerificationEmail('');
                    setIsSchoolIdFlow(false);
                } else {
                    alert("Failed: " + (data.error || "Unknown error"));
                }
            } catch (err) {
                console.error("Custom Reset Error:", err);
                alert("Network error: " + err.message);
            } finally {
                setResetLoading(false);
            }
        } else {
            // --- STANDARD FIREBASE FLOW (EMAIL) ---
            try {
                await sendPasswordResetEmail(auth, input);
                alert("Password reset email sent! Check your inbox.");
                setShowForgotModal(false);
            } catch (error) {
                console.error(error);
                alert("Failed to send reset email: " + error.message);
            } finally {
                setResetLoading(false);
            }
        }
    };

    // --- 4. CHECK ROLE & GATEKEEPER LOGIC ---
    const checkUserRole = async (uid) => {
        console.log("Starting checkUserRole for:", uid);
        try {
            // A. Get Role from Firestore (with Timeout Protection)
            const docRef = doc(db, "users", uid);
            let role;
            let userData = {};

            try {
                console.log("Racing Firestore...");
                const docSnap = await Promise.race([
                    getDoc(docRef),
                    new Promise((_, reject) => setTimeout(() => reject(new Error("Firestore Timeout")), 3000))
                ]);

                if (docSnap.exists()) {
                    console.log("Firestore doc found");
                    userData = docSnap.data();
                    role = userData.role;

                    if (userData.school_id || userData.schoolId || userData.iern) {
                        localStorage.setItem('schoolId', userData.school_id || userData.schoolId || userData.iern);
                    }

                    try {
                        const valRes = await fetch(`/api/auth/validate/${uid}`);
                        if (valRes.ok) {
                            const valData = await valRes.json();
                            if (!valData.valid) {
                                await auth.signOut();
                                alert(valData.reason === 'disabled' ? "Account disabled." : "Account not found.");
                                setLoading(false);
                                return;
                            }
                            role = valData.role || role;
                        }
                    } catch (valErr) { console.warn("Backend validation unreachable", valErr); }
                } else {
                    const valRes = await fetch(`/api/auth/validate/${uid}`);
                    if (valRes.ok) {
                        const valData = await valRes.json();
                        if (valData.valid) {
                            role = valData.role;
                            if (valData.school_id) localStorage.setItem('schoolId', valData.school_id);
                        }
                    }
                }
            } catch (firestoreErr) {
                const valRes = await fetch(`/api/auth/validate/${uid}`);
                if (valRes.ok) {
                    const valData = await valRes.json();
                    if (valData.valid) role = valData.role;
                }
            }

            if (role) {
                // Normalize Role
                const r = role.toLowerCase().trim();
                let normalized = role;
                if (r === 'school_head') normalized = 'School Head';
                if (r === 'lgu') normalized = 'Local Government Unit';
                if (r === 'admin') normalized = 'Admin';
                if (r === 'super_admin') normalized = 'Super Admin';
                
                role = normalized;
                localStorage.setItem('userRole', role);

                const destPath = getDashboardPath(role);
                setLoading(false);
                navigate(destPath);
            } else {
                setLoading(false);
            }
        } catch (err) {
            console.error("Role Check Error:", err);
            setLoading(false);
        }
    };

    const handleTroubleshoot = async () => {
        setLoading(true);
        try {
            localStorage.clear();
            sessionStorage.clear();
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) await registration.unregister();
            }
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let cacheName of cacheNames) await caches.delete(cacheName);
            }
            window.location.reload(true);
        } catch (error) { window.location.reload(true); }
    };

    if (loading) return <LoadingScreen />;

    return (
        <PageTransition>
            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-slate-200 animate-gradient-xy">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100 animate-gradient-xy"></div>
                
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-indigo-300/20 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>

                <div className="relative z-10 w-[90%] max-w-md">
                    <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 transform transition-all hover:scale-[1.01] duration-500">
                        <div className="text-center mb-8">
                            <div className="relative w-24 h-24 mx-auto mb-4 bg-white/50 rounded-2xl shadow-inner flex items-center justify-center p-2">
                                <img src={logo} alt="InsightEd Logo" className="w-full h-full object-contain drop-shadow-sm" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">InsightEd</h1>
                            <p className="text-slate-500 text-sm mt-2 font-medium">Department of Education</p>
                        </div>

                        {rememberedUser && !usePassword ? (
                            <PinLogin 
                                rememberedUser={rememberedUser} 
                                onSwitchAccount={handleSwitchAccount}
                                onUsePassword={() => {
                                    const role = rememberedUser.role?.toLowerCase();
                                    const isSH = role === 'school head' || role === 'school_head';
                                    setIsSchoolHead(isSH);
                                    setLoginId(isSH ? (rememberedUser.school_id || rememberedUser.schoolId || '') : (rememberedUser.email || ''));
                                    setUsePassword(true);
                                }}
                            />
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-300">
                                {/* Sleek School Head Toggle */}
                                <div className="flex items-center justify-between px-1 mb-2">
                                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Are you a School Head?</span>
                                    <button 
                                        type="button"
                                        onClick={() => {
                                            setIsSchoolHead(!isSchoolHead);
                                            setLoginId(''); // Clear on toggle to avoid confusion
                                        }}
                                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ring-2 ring-offset-2 ${isSchoolHead ? 'bg-blue-600 ring-blue-500/20' : 'bg-slate-200 ring-transparent'}`}
                                    >
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isSchoolHead ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </button>
                                </div>

                                <div className="group">
                                    <div className={`relative flex items-center transition-all duration-300 rounded-xl border-2 ${focusedInput === 'loginId' ? 'border-blue-500 bg-white ring-4 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <span className="pl-4 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                            </svg>
                                        </span>
                                        <input
                                            type={isSchoolHead ? "tel" : "text"}
                                            inputMode={isSchoolHead ? "numeric" : "email"}
                                            placeholder={isSchoolHead ? "6-digit School ID" : "Email Address"}
                                            value={loginId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (isSchoolHead) {
                                                    // Restrict to 6 digits numeric
                                                    if (/^\d*$/.test(val) && val.length <= 6) {
                                                        setLoginId(val);
                                                    }
                                                } else {
                                                    setLoginId(val);
                                                }
                                            }}
                                            onFocus={() => setFocusedInput('loginId')}
                                            onBlur={() => setFocusedInput(null)}
                                            required
                                            className="w-full bg-transparent border-none px-4 py-3.5 text-slate-700 placeholder-slate-400 focus:outline-none font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <div className={`relative flex items-center transition-all duration-300 rounded-xl border-2 ${focusedInput === 'password' ? 'border-blue-500 bg-white ring-4 ring-blue-500/10' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
                                        <span className="pl-4 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <input
                                            type={loginMode === 'passcode' ? 'text' : (showPassword ? 'text' : 'password')}
                                            inputMode={loginMode === 'passcode' ? 'numeric' : 'text'}
                                            placeholder={loginMode === 'passcode' ? "6-digit Passcode" : "Password"}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedInput('password')}
                                            onBlur={() => setFocusedInput(null)}
                                            required
                                            className="w-full bg-transparent border-none px-4 py-3.5 text-slate-700 placeholder-slate-400 focus:outline-none font-medium"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="pr-3 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                                            tabIndex={-1}
                                        >
                                            {showPassword ? (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path fillRule="evenodd" d="M3.707 2.293a1 1 0 00-1.414 1.414l14 14a1 1 0 001.414-1.414l-1.473-1.473A10.014 10.014 0 0019.542 10C18.268 5.943 14.478 3 10 3a9.958 9.958 0 00-4.512 1.074l-1.78-1.781zm4.261 4.26l1.514 1.515a2.003 2.003 0 012.45 2.45l1.514 1.514a4 4 0 00-5.478-5.478z" clipRule="evenodd" />
                                                    <path d="M12.454 16.697L9.75 13.992a4 4 0 01-3.742-3.741L2.335 6.578A9.98 9.98 0 00.458 10c1.274 4.057 5.065 7 9.542 7 .847 0 1.669-.105 2.454-.303z" />
                                                </svg>
                                            ) : (
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                                    <path d="M10 12a2 2 0 100-4 2 2 0 000 4z" />
                                                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex justify-between items-center">
                                    <button
                                        type="button"
                                        onClick={() => setLoginMode(loginMode === 'password' ? 'passcode' : 'password')}
                                        className="text-sm font-bold text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-1"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                                            <path d="M10 2a5 5 0 00-5 5v2a2 2 0 00-2 2v5a2 2 0 002 2h10a2 2 0 002-2v-5a2 2 0 00-2-2V7a5 5 0 00-5-5zM7 7a3 3 0 016 0v2H7V7z" />
                                        </svg>
                                        Switch to {loginMode === 'password' ? 'Passcode' : 'Password'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => { setResetEmail(loginId); setShowForgotModal(true); }}
                                        className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 transform transition-all active:scale-[0.98] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2"
                                >
                                    <span>Sign In</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </form>
                        )}

                        <div className="mt-4">
                            <Link
                                to="/register"
                                className="w-full block text-center py-3.5 border-2 border-blue-100 bg-blue-50/50 rounded-xl text-blue-600 font-bold hover:bg-blue-100 hover:border-blue-200 transition-all active:scale-[0.98]"
                            >
                                Create New Account
                            </Link>
                        </div>
                    </div>

                    {!isInstalled && (
                        <div className="mt-4 flex justify-center">
                            <button
                                onClick={() => setShowInstallModal(true)}
                                className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white text-sm font-bold shadow-lg hover:bg-white/20 transition-all active:scale-95"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Install App</span>
                            </button>
                        </div>
                    )}

                    <div className="mt-4 flex justify-center">
                        <button
                            type="button"
                            onClick={handleTroubleshoot}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-slate-200 text-sm font-bold shadow-lg hover:bg-white/20 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            <span>Troubleshoot & Updates</span>
                        </button>
                    </div>

                    <div className="text-center mt-6">
                        <p className="text-slate-200/80 text-xs font-medium">© 2026 InsightEd. Secure & Encrypted.</p>
                    </div>
                </div>

                <div className="waves-container">
                    <svg className="waves" xmlns="http://www.w3.org/2000/svg" xmlnsXlink="http://www.w3.org/1999/xlink"
                        viewBox="0 24 150 28" preserveAspectRatio="none" shapeRendering="auto">
                        <defs>
                            <path id="gentle-wave" d="M-160 44c30 0 58-18 88-18s 58 18 88 18 58-18 88-18 58 18 88 18 v44h-352z" />
                        </defs>
                        <g className="parallax">
                            <use xlinkHref="#gentle-wave" x="48" y="0" fill="rgba(255,255,255,0.7)" />
                            <use xlinkHref="#gentle-wave" x="48" y="3" fill="rgba(255,255,255,0.5)" />
                            <use xlinkHref="#gentle-wave" x="48" y="5" fill="rgba(255,255,255,0.3)" />
                            <use xlinkHref="#gentle-wave" x="48" y="7" fill="#fff" />
                        </g>
                    </svg>
                </div>

                {showForgotModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Reset Password</h2>
                            <p className="text-sm text-slate-500 mb-4">Enter your email address and we'll send you a link to reset your password.</p>

                            <form onSubmit={handlePasswordReset}>
                                <div className="mb-4 space-y-3">
                                    <input
                                        type="text"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="Enter your email or school ID"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />

                                    {resetEmail.length > 0 && !resetEmail.includes('@') && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <p className="text-xs text-blue-600 font-bold mb-1 ml-1 flex items-center gap-1">
                                                {isSchoolIdFlow ? "Confirm Registered Email (Masked)" : "Confirm Registered Email"}
                                            </p>
                                            <input
                                                type="text"
                                                value={verificationEmail}
                                                onChange={(e) => !isSchoolIdFlow && setVerificationEmail(e.target.value)}
                                                readOnly={isSchoolIdFlow}
                                                placeholder={isSchoolIdFlow ? "Fetching..." : "Enter your registered email address"}
                                                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all ${isSchoolIdFlow ? 'bg-slate-100 border-slate-200 text-slate-500' : 'bg-blue-50/30 border-blue-100'}`}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button type="button" onClick={() => setShowForgotModal(false)} className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl active:scale-95 transition-all">Cancel</button>
                                    <button type="submit" disabled={resetLoading} className="flex-1 py-3 bg-[#004A99] text-white font-bold rounded-xl shadow-lg active:scale-95 transition-all disabled:opacity-70">{resetLoading ? 'Sending...' : 'Send Link'}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {showInstallModal && !isInstalled && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">
                            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-lg">How to Install</h3>
                                <button onClick={() => setShowInstallModal(false)} className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>
                            <div className="p-6">
                                {isIOS ? (
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-xl">
                                            <div className="bg-white p-2 rounded-lg text-blue-600 font-bold shrink-0">1</div>
                                            <p className="text-sm text-slate-600">Tap the <span className="font-bold text-blue-700">Share Icon</span> at the bottom of your screen.</p>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-xl">
                                            <div className="bg-white p-2 rounded-lg text-blue-600 font-bold shrink-0">2</div>
                                            <p className="text-sm text-slate-600">Scroll down and tap <span className="font-bold text-slate-800">"Add to Home Screen"</span>.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {deferredPrompt && (
                                            <button onClick={handleInstallClick} className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg hover:bg-blue-700 transition-all">Install App Now</button>
                                        )}
                                        <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="bg-white p-2 rounded-lg text-slate-700 font-bold shrink-0">1</div>
                                            <p className="text-sm text-slate-600">Tap the <span className="font-bold text-slate-900">Three Dots (⋮)</span> icon in browser menu.</p>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="bg-white p-2 rounded-lg text-slate-700 font-bold shrink-0">2</div>
                                            <p className="text-sm text-slate-600">Select <span className="font-bold text-slate-900">"Install App"</span>.</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-50 p-4 text-center">
                                <p className="text-xs text-slate-400 font-medium">Installing ensures InsightEd works offline.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default Login;