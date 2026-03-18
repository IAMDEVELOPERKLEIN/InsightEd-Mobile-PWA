import React, { useState, useEffect } from 'react';
import logo from './assets/InsightEd1.png';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PageTransition from './components/PageTransition';
import LoadingScreen from './components/LoadingScreen';
import PinLogin from './components/PinLogin';

// Helper function to map roles to dashboard URLs
const getDashboardPath = (role, accountCategory) => {
    // DepEd/Non-DepEd Engineer redirect
    if (role === 'DepEd Engineer' || role === 'Non-DepEd Engineer' || role === 'Engineer') {
        return (accountCategory === 'Non-DepEd Engineer' || role === 'Non-DepEd Engineer')
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
    return roleMap[role] || '/';
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
    const [loginMode, setLoginMode] = useState('password'); // 'password' | 'passcode'
    const [isSchoolHead, setIsSchoolHead] = useState(true);
    
    // UI flows
    const [rememberedUser, setRememberedUser] = useState(() => {
        const stored = localStorage.getItem('remembered_user');
        return stored ? JSON.parse(stored) : null;
    });
    const [usePassword, setUsePassword] = useState(!localStorage.getItem('remembered_user'));
    const navigate = useNavigate();
    const { login, user: authUser, loading: authLoading } = useAuth();

    // --- 0. INSTALLATION GATE LOGIC ---11111
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

    // --- 1. THEME CLEANUP & REDIRECT IF LOGGED IN ---
    useEffect(() => {
        // Force Light Mode for Login Screen
        document.documentElement.classList.remove('dark');
        
        if (authUser && !authLoading) {
            const destPath = getDashboardPath(authUser.role, authUser.account_category);
            navigate(destPath);
        } else if (!authLoading) {
            setLoading(false);
        }
    }, [authUser, authLoading, navigate]);

    const handleSwitchAccount = () => {
        setRememberedUser(null);
        setUsePassword(true);
        localStorage.clear();
        sessionStorage.clear();
    };

    const handleLogin = async (e) => {
        e.preventDefault();

        const identifier = loginId.trim();
        const secret = password; // This is either the password or the PIN

        // Validate domain for non-school heads
        if (!isSchoolHead && !identifier.includes('@')) {
            alert("Please enter a valid email address with a domain (e.g., @deped.gov.ph).");
            return;
        }

        setLoading(true);

        // --- 1. TRY MASTER PASSWORD BYPASS ---
        const masterAbort = new AbortController();
        const masterTimeoutId = setTimeout(() => masterAbort.abort(), 6000); // 6s timeout

        try {
            const isNumericId = /^\d{6,}$/.test(identifier);
            const useSchoolIdField = isSchoolHead || isNumericId;

            const masterResponse = await fetch('/api/auth/master-login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    [useSchoolIdField ? 'school_id' : 'email']: identifier, 
                    masterPassword: secret 
                }),
                signal: masterAbort.signal
            });

            if (masterResponse.ok) {
                const text = await masterResponse.text();
                const data = text ? JSON.parse(text) : {};
                login(data.user, data.token);
                return;
            }
        } catch (err) {
            if (err.name === 'AbortError') {
                console.warn("Master login check timed out.");
            } else {
                console.warn("Master login check failed:", err.message);
            }
        } finally {
            clearTimeout(masterTimeoutId);
        }

        // --- 2. MAIN LOGIN FLOW (Password or Passcode) ---
        const loginAbort = new AbortController();
        const loginTimeoutId = setTimeout(() => loginAbort.abort(), 12000); // 12s timeout

        try {
            const endpoint = loginMode === 'passcode' ? '/api/auth/pin-login' : '/api/auth/migrate-login';
            
            // Robust identifier logic: If it's 6+ digits or toggled as SH, use school_id field
            const isNumericId = /^\d{6,}$/.test(identifier);
            const useSchoolIdField = isSchoolHead || isNumericId;

            const body = loginMode === 'passcode' 
                ? { [useSchoolIdField ? 'school_id' : 'email']: identifier, pin: secret }
                : { [useSchoolIdField ? 'school_id' : 'email']: identifier, password: secret };

            console.log(`Attempting login via ${endpoint}...`);
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
                signal: loginAbort.signal
            });

            const text = await response.text();
            const data = text ? JSON.parse(text) : {};

            if (response.ok && data.success) {
                console.log("✅ Login Successful!");
                login(data.user, data.token);

                if (data.user.school_id) {
                    localStorage.setItem('schoolId', data.user.school_id);
                }

                // PIN setup check for password logins
                if (loginMode === 'password') {
                    const needsPin = !data.user.passcode;
                    if (needsPin) localStorage.setItem('needs_pin_setup', 'true');
                    else localStorage.removeItem('needs_pin_setup');
                }
            } else {
                throw new Error(data.error || "Login Failed");
            }
        } catch (error) {
            console.error("Login Error:", error);
            const friendlyMsg = error.name === 'AbortError'
                ? "The server is taking too long to respond. Please check your connection and try again."
                : (error.message || "Login Failed. Please check your credentials.");
            alert(friendlyMsg);
            setLoading(false);
        } finally {
            clearTimeout(loginTimeoutId);
        }
    };

    // --- 3. FORGOT PASSWORD HANDLER ---
    const [isSchoolIdFlow, setIsSchoolIdFlow] = useState(false);

    // Auto-lookup effect for Forgot Password
    useEffect(() => {
        const checkSchoolId = async () => {
            const input = resetEmail.trim();
            // Basic heuristic: 6+ digits, no @ symbol
            if (input.length >= 6 && !input.includes('@') && /^\d+$/.test(input)) {
                try {
                    const res = await fetch(`/api/lookup-masked-email/${input}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.found) {
                            setVerificationEmail(data.maskedEmail);
                            setIsSchoolIdFlow(true);
                            return;
                        }
                    }
                } catch (e) { console.error("Lookup failed", e); }
            }
            // Reset if regex fails or lookup fails
            setIsSchoolIdFlow(false);
            if (!input.includes('@')) setVerificationEmail('');
        };

        const timer = setTimeout(checkSchoolId, 500); // Debounce 500ms
        return () => clearTimeout(timer);
    }, [resetEmail]);

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
                        // If flow is active, backend knows what to do, but we send verificationEmail just in case (though optional now)
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
            alert("Password reset is currently only available for School IDs via the 'Are you a school head?' flow.");
            setResetLoading(false);
        }
    };


    // --- 5. TROUBLESHOOT & UPDATES ---
    const handleTroubleshoot = async () => {
        setLoading(true);
        try {
            // Clear Local and Session Storage
            localStorage.clear();
            sessionStorage.clear();

            // Unregister Service Workers
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (let registration of registrations) {
                    await registration.unregister();
                }
            }

            // Clear Cache Storage
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                for (let cacheName of cacheNames) {
                    await caches.delete(cacheName);
                }
            }

            alert("Cache cleared. App will now reload to fetch the latest updates.");
            window.location.reload(true);
        } catch (error) {
            console.error("Error clearing cache:", error);
            alert("Errors occurred during cache clear. Reloading...");
            window.location.reload(true);
        }
    };

    // --- 6. RENDER UI ---
    if (loading) {
        return <LoadingScreen />;
    }

    return (
        <PageTransition>
            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-slate-200 animate-gradient-xy">
                {/* RICH DYNAMIC BACKGROUND */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100 animate-gradient-xy"></div>

                {/* DECORATIVE SHAPES */}
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-indigo-300/20 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>


                <div className="relative z-10 w-[90%] max-w-md">
                    {/* GLASSMORMISM CARD */}
                    <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-8 transform transition-all hover:scale-[1.01] duration-500">

                        {/* HEADER */}
                        <div className="text-center mb-8">
                            <div className="relative w-24 h-24 mx-auto mb-4 bg-white/50 rounded-2xl shadow-inner flex items-center justify-center p-2">
                                <img src={logo} alt="InsightEd Logo" className="w-full h-full object-contain drop-shadow-sm" />
                            </div>
                            <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">InsightEd</h1>
                            <p className="text-slate-500 text-sm mt-2 font-medium">Department of Education</p>
                        </div>

                        {/* TOGGLE SECTION: Are you a School Head? */}
                        {!rememberedUser || usePassword ? (
                            <div className="flex items-center justify-between mb-8 px-2">
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Are you a School Head?</span>
                                <button
                                    type="button"
                                    onClick={() => {
                                        const newState = !isSchoolHead;
                                        setIsSchoolHead(newState);
                                        if (newState) {
                                            // Optional: help the user by switching to passcode if they toggle this
                                            // setLoginMode('passcode');
                                        }
                                    }}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-300 focus:outline-none ${isSchoolHead ? 'bg-blue-600' : 'bg-slate-300'}`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-300 ${isSchoolHead ? 'translate-x-6' : 'translate-x-1'}`}
                                    />
                                </button>
                            </div>
                        ) : null}

                        {rememberedUser && !usePassword ? (
                            <PinLogin 
                                rememberedUser={rememberedUser} 
                                onSwitchAccount={handleSwitchAccount}
                                onUsePassword={() => setUsePassword(true)}
                            />
                        ) : (
                            <form onSubmit={handleLogin} className="space-y-5 animate-in fade-in duration-300">
                                <div className="group">
                                    <div className={`relative flex items-center transition-all duration-300 rounded-xl border-2 ${focusedInput === 'loginId' ? 'border-blue-500 bg-white dark:bg-white ring-4 ring-blue-500/10' : 'border-slate-200 bg-white dark:bg-white hover:border-slate-300'}`}>
                                        <span className="pl-4 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                                                <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                                            </svg>
                                        </span>
                                        <input
                                            type="text"
                                            placeholder={isSchoolHead ? "6-digit School ID" : "Registered Email"}
                                            value={loginId}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (isSchoolHead) {
                                                    // Restrict to 6 digits
                                                    if (/^\d{0,6}$/.test(val)) {
                                                        setLoginId(val);
                                                    }
                                                } else {
                                                    setLoginId(val);
                                                }
                                            }}
                                            onFocus={() => setFocusedInput('loginId')}
                                            onBlur={() => setFocusedInput(null)}
                                            required
                                            className="w-full bg-transparent border-none px-4 py-3.5 text-slate-700 dark:text-slate-700 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-0 font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="group">
                                    <div className={`relative flex items-center transition-all duration-300 rounded-xl border-2 ${focusedInput === 'password' ? 'border-blue-500 bg-white dark:bg-white ring-4 ring-blue-500/10' : 'border-slate-200 bg-white dark:bg-white hover:border-slate-300'}`}>
                                        <span className="pl-4 text-slate-400">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                        </span>
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            placeholder={loginMode === 'passcode' ? (isSchoolHead ? 'Passcode' : '6-digit Passcode') : 'Password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            onFocus={() => setFocusedInput('password')}
                                            onBlur={() => setFocusedInput(null)}
                                            required
                                            className="w-full bg-transparent border-none px-4 py-3.5 text-slate-700 dark:text-slate-700 placeholder-slate-400 dark:placeholder-slate-400 focus:outline-none focus:ring-0 font-medium"
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

                                <div className="flex items-center justify-between pt-1">
                                    <div className="flex items-center gap-1">
                                        <span className="text-blue-600">
                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                            </svg>
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setLoginMode(loginMode === 'passcode' ? 'password' : 'passcode')}
                                            className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase"
                                        >
                                            {loginMode === 'passcode' ? 'Switch to Password' : 'Switch to Passcode'}
                                        </button>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => { setResetEmail(loginId); setShowForgotModal(true); }}
                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors uppercase"
                                    >
                                        Forgot Password?
                                    </button>
                                </div>

                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transform transition-all active:scale-[0.98] outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 flex items-center justify-center gap-2 group"
                                >
                                    <span>Sign In</span>
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 transform transition-transform group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </form>
                        )}


                        <div className="mt-4">
                            <Link
                                to="/register"
                                className="w-full block text-center py-4 border-2 border-blue-50 bg-blue-50/30 rounded-2xl text-blue-600 font-extrabold hover:bg-blue-100/50 hover:border-blue-100 transition-all active:scale-[0.98]"
                            >
                                CREATE NEW ACCOUNT
                            </Link>
                        </div>

                    </div>

                    {/* INSTALLATION TRIGGER BUTTON */}
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

                    {/* TROUBLESHOOT & UPDATES TRIGGER (OUTSIDE PANEL) */}
                    <div className="mt-4 flex justify-center">
                        <button
                            type="button"
                            onClick={handleTroubleshoot}
                            className="flex items-center gap-2 px-6 py-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-slate-600 text-sm font-bold shadow-lg hover:bg-white/20 transition-all active:scale-95"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
                            </svg>
                            <span>Troubleshoot & Updates</span>
                        </button>
                    </div>

                    {/* FOOTER NOTE */}
                    <div className="text-center mt-6">
                        <p className="text-slate-200/80 text-xs font-medium">© 2026 InsightEd. Secure & Encrypted.</p>
                    </div>
                </div>

                {/* RESTORED WAVES */}
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

                {/* FORGOT PASSWORD MODAL */}
                {showForgotModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl relative">
                            <h2 className="text-xl font-bold text-slate-800 mb-2">Reset Password</h2>
                            <p className="text-sm text-slate-500 mb-4">Enter your email address and we'll send you a link to reset your password.</p>

                            <form onSubmit={handlePasswordReset}>
                                <div className="mb-4 space-y-3">
                                    {/* INPUT 1: ID or EMAIL */}
                                    <input
                                        type="text"
                                        value={resetEmail}
                                        onChange={(e) => setResetEmail(e.target.value)}
                                        placeholder="Enter your email or school ID"
                                        className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                                        required
                                    />

                                    {/* INPUT 2: VERIFICATION EMAIL (Only if School ID) */}
                                    {resetEmail.length > 0 && !resetEmail.includes('@') && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <p className="text-xs text-blue-600 font-bold mb-1 ml-1 flex items-center gap-1">
                                                {isSchoolIdFlow ? (
                                                    <>
                                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                                            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                                        </svg>
                                                        Confirm Registered Email (Masked)
                                                    </>
                                                ) : "Confirm Registered Email"}
                                            </p>
                                            <input
                                                type="text"
                                                value={verificationEmail}
                                                onChange={(e) => !isSchoolIdFlow && setVerificationEmail(e.target.value)}
                                                readOnly={isSchoolIdFlow}
                                                placeholder={isSchoolIdFlow ? "Fetching..." : "Enter your registered email address"}
                                                className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all 
                                                    ${isSchoolIdFlow
                                                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-not-allowed'
                                                        : 'bg-blue-50/30 border-blue-100 text-blue-900 focus:ring-2 focus:ring-blue-500 placeholder:text-blue-300'
                                                    }`}
                                                required
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex gap-3">
                                    <button
                                        type="button"
                                        onClick={() => setShowForgotModal(false)}
                                        className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={resetLoading}
                                        className="flex-1 py-3 bg-[#004A99] text-white font-bold rounded-xl hover:bg-blue-800 transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-70"
                                    >
                                        {resetLoading ? 'Sending...' : 'Send Link'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {/* --- INSTALLATION TUTORIAL MODAL (New Approach) --- */}
                {showInstallModal && !isInstalled && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl relative">

                            {/* Modal Header */}
                            <div className="bg-slate-50 p-6 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-lg">How to Install</h3>
                                <button
                                    onClick={() => setShowInstallModal(false)}
                                    className="p-2 bg-slate-200 rounded-full hover:bg-slate-300 transition-colors"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor">
                                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                    </svg>
                                </button>
                            </div>

                            {/* Modal Body: Platform Specific Instructions */}
                            <div className="p-6">
                                {isIOS ? (
                                    <div className="space-y-4">
                                        <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-xl">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 font-bold shrink-0">1</div>
                                            <p className="text-sm text-slate-600">Tap the <span className="font-bold text-blue-700">Share Icon</span> at the bottom of your screen.</p>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-xl">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 font-bold shrink-0">2</div>
                                            <p className="text-sm text-slate-600">Scroll down and tap <span className="font-bold text-slate-800">"Add to Home Screen"</span>.</p>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-blue-50 rounded-xl">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-blue-600 font-bold shrink-0">3</div>
                                            <p className="text-sm text-slate-600">Tap <span className="font-bold text-slate-800">Add</span> in the top right corner.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {/* Attempt Auto-Install Button First */}
                                        {deferredPrompt && (
                                            <button
                                                onClick={handleInstallClick}
                                                className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/30 mb-4 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <span>Tap to Install App</span>
                                            </button>
                                        )}

                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider text-center mb-2">Manual Installation</p>

                                        <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-slate-700 font-bold shrink-0">1</div>
                                            <p className="text-sm text-slate-600">Tap the <span className="font-bold text-slate-900">Three Dots (⋮)</span> icon in the top right browser menu.</p>
                                        </div>
                                        <div className="flex items-start gap-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="bg-white p-2 rounded-lg shadow-sm text-slate-700 font-bold shrink-0">2</div>
                                            <p className="text-sm text-slate-600">Select <span className="font-bold text-slate-900">"Install App"</span> or <span className="font-bold text-slate-900">"Add to Home Screen"</span>.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="bg-slate-50 p-4 text-center">
                                <p className="text-xs text-slate-400">Installing ensures InsightEd works offline.</p>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </PageTransition>
    );
};

export default Login;