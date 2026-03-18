
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const initAuth = async () => {
            const token = localStorage.getItem('token');
            if (token) {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 7000); // 7s timeout

                try {
                    const res = await fetch('/api/auth/me', {
                        headers: {
                            'Authorization': `Bearer ${token}`
                        },
                        signal: controller.signal
                    });
                    if (res.ok) {
                        const userData = await res.json();
                        // Sync localStorage
                        if (userData.uid) localStorage.setItem('uid', userData.uid);
                        if (userData.role) localStorage.setItem('userRole', userData.role);
                        if (userData.email) localStorage.setItem('userEmail', userData.email);
                        if (userData.account_category) localStorage.setItem('accountCategory', userData.account_category);
                        
                        setUser(userData);
                        
                        // Sync session data for components relying on localStorage
                        if (userData.uid) localStorage.setItem('userId', userData.uid);
                        if (userData.role) localStorage.setItem('userRole', userData.role);
                        if (userData.school_id) localStorage.setItem('schoolId', userData.school_id);
                    } else {
                        // Token invalid or expired
                        localStorage.removeItem('token');
                        localStorage.removeItem('userId');
                        localStorage.removeItem('userRole');
                        setUser(null);
                    }
                } catch (err) {
                    if (err.name === 'AbortError') {
                        console.warn("Auth initialization timed out.");
                    } else {
                        console.error("Auth init error:", err);
                    }
                    setUser(null);
                } finally {
                    clearTimeout(timeoutId);
                }
            }
            setLoading(false);
        };

        initAuth();
    }, []);

    const login = (userData, token) => {
        localStorage.setItem('token', token);
        if (userData.uid) localStorage.setItem('uid', userData.uid);
        if (userData.role) localStorage.setItem('userRole', userData.role);
        if (userData.email) localStorage.setItem('userEmail', userData.email);
        if (userData.account_category) localStorage.setItem('accountCategory', userData.account_category);
        
        localStorage.setItem('remembered_user', JSON.stringify(userData));
        
        // Ensure consistent identity storage
        if (userData.uid) localStorage.setItem('userId', userData.uid);
        if (userData.role) localStorage.setItem('userRole', userData.role);
        if (userData.school_id) localStorage.setItem('schoolId', userData.school_id);
        
        setUser(userData);
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        localStorage.removeItem('userRole');
        setUser(null);
    };

    // --- SECURE LOGOUT WITH PASSCODE ---
    const [isPasscodeModalOpen, setIsPasscodeModalOpen] = useState(false);
    const [passcodeValue, setPasscodeValue] = useState('');
    const [passcodeError, setPasscodeError] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);

    const confirmLogout = () => {
        setIsPasscodeModalOpen(true);
        setPasscodeValue('');
        setPasscodeError('');
    };

    const handlePasscodeKeyPress = (num) => {
        setPasscodeError('');
        if (passcodeValue.length < 6) {
            setPasscodeValue(prev => prev + num);
        }
    };

    const handlePasscodeDelete = () => {
        setPasscodeError('');
        setPasscodeValue(prev => prev.slice(0, -1));
    };

    const handlePasscodeSubmit = async () => {
        if (passcodeValue.length !== 6) {
            setPasscodeError('Please enter a 6-digit passcode.');
            return;
        }

        setIsVerifying(true);
        setPasscodeError('');

        console.log("[AuthContext] Initiating logout passcode verification...");
        try {
            const token = localStorage.getItem('token');
            if (!token) {
                console.error("[AuthContext] No auth token found during logout.");
                setPasscodeError('Session expired. Please refresh.');
                return;
            }

            const res = await fetch('/api/auth/verify-passcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ passcode: passcodeValue })
            });

            console.log("[AuthContext] Verification response status:", res.status);

            if (res.ok) {
                console.log("[AuthContext] Passcode verified successfully. Logging out...");
                setIsPasscodeModalOpen(false);
                logout();
            } else {
                const data = await res.json();
                console.warn("[AuthContext] Verification failed:", data.error);
                setPasscodeError(data.error || 'Invalid passcode. Please try again.');
            }
        } catch (err) {
            console.error("[AuthContext] Logout verification error:", err);
            setPasscodeError('Connection error. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <AuthContext.Provider value={{ user, setUser, login, logout, confirmLogout, loading }}>
            {children}

            {/* SECURE LOGOUT MODAL */}
            {isPasscodeModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-md">
                                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                                </svg>
                            </div>
                            <h2 className="text-xl font-bold text-white mb-1">Security Verification</h2>
                            <p className="text-blue-100 text-sm">Enter your 6-digit registration passcode to log out.</p>
                        </div>

                        <div className="p-8">
                            <div className="flex justify-center gap-2 mb-6">
                                {[...Array(6)].map((_, i) => (
                                    <div 
                                        key={i}
                                        className={`w-10 h-12 border-2 rounded-xl flex items-center justify-center text-xl font-bold transition-all
                                            ${passcodeValue[i] ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-slate-200 bg-slate-50 text-slate-400'}`}
                                    >
                                        {passcodeValue[i] ? '•' : ''}
                                    </div>
                                ))}
                            </div>

                            <div className="h-6 mb-4 text-center">
                                {passcodeError && (
                                    <p className="text-red-500 text-xs font-bold animate-shake">{passcodeError}</p>
                                )}
                            </div>

                            {/* NUMERIC KEYPAD */}
                            <div className="grid grid-cols-3 gap-y-4 gap-x-2 mb-8">
                                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                    <button
                                        key={num}
                                        type="button"
                                        onClick={() => handlePasscodeKeyPress(num.toString())}
                                        className="w-14 h-14 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-xl font-bold mx-auto flex items-center justify-center transition-colors focus:outline-none text-slate-700"
                                    >
                                        {num}
                                    </button>
                                ))}
                                <div className="col-start-2">
                                    <button
                                        type="button"
                                        onClick={() => handlePasscodeKeyPress('0')}
                                        className="w-14 h-14 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-xl font-bold mx-auto flex items-center justify-center transition-colors focus:outline-none text-slate-700"
                                    >
                                        0
                                    </button>
                                </div>
                                <div className="col-start-3 flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={handlePasscodeDelete}
                                        className="w-14 h-14 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={handlePasscodeSubmit}
                                    disabled={isVerifying || passcodeValue.length !== 6}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98] disabled:opacity-50 flex justify-center items-center gap-2"
                                >
                                    {isVerifying ? (
                                        <>
                                            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                            Verifying...
                                        </>
                                    ) : 'Confirm Logout'}
                                </button>
                                <button
                                    onClick={() => setIsPasscodeModalOpen(false)}
                                    className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-4 rounded-2xl transition-all active:scale-[0.98]"
                                >
                                    Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
