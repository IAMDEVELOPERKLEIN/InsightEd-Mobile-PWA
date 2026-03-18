import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const PasscodeSetupPrompt = () => {
    const { user, setUser } = useAuth();
    const [isOpen, setIsOpen] = useState(false);
    const [step, setStep] = useState('prompt'); // 'prompt' | 'setup' | 'confirm'
    const [tempPasscode, setTempPasscode] = useState('');
    const [confirmPasscode, setConfirmPasscode] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        // Check if user is logged in but has no passcode
        const needsSetup = user && !user.passcode;
        
        if (user && user.passcode) {
            localStorage.removeItem('needs_pin_setup');
        }

        console.log("[PasscodeSetupPrompt] Check:", { 
            hasUser: !!user, 
            hasPasscode: user?.passcode ? 'YES' : 'NO', 
            localStorageFlag: localStorage.getItem('needs_pin_setup'),
            willShow: !!needsSetup
        });

        setIsOpen(!!needsSetup);
    }, [user]);

    const handleKeyPress = (num) => {
        setError('');
        const current = step === 'setup' ? tempPasscode : confirmPasscode;
        if (current.length < 6) {
            if (step === 'setup') setTempPasscode(prev => prev + num);
            else setConfirmPasscode(prev => prev + num);
        }
    };

    const handleDelete = () => {
        setError('');
        if (step === 'setup') setTempPasscode(prev => prev.slice(0, -1));
        else setConfirmPasscode(prev => prev.slice(0, -1));
    };

    const handleNext = () => {
        if (tempPasscode.length === 6) {
            setStep('confirm');
        } else {
            setError('Please enter a 6-digit passcode');
        }
    };

    const handleFinalize = async () => {
        if (confirmPasscode.length !== 6) {
            setError('Please re-enter your 6-digit passcode');
            return;
        }
        if (tempPasscode !== confirmPasscode) {
            setError('Passcodes do not match. Try again.');
            setTempPasscode('');
            setConfirmPasscode('');
            setStep('setup');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('/api/auth/setup-passcode', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ passcode: tempPasscode })
            });

            if (res.ok) {
                const data = await res.json();
                // Update local user state
                setUser(prev => ({ ...prev, passcode: tempPasscode }));
                localStorage.removeItem('needs_pin_setup');
                setIsOpen(false);
                alert('✅ Passcode set up successfully!');
            } else {
                const data = await res.json();
                setError(data.error || 'Failed to save passcode');
            }
        } catch (err) {
            console.error("Passcode setup error:", err);
            setError('Connection error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-300">
                
                {step === 'prompt' ? (
                    <div className="p-8 text-center">
                        <div className="w-20 h-20 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-6 text-blue-600">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                            </svg>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-800 mb-2">Secure Your Account</h2>
                        <p className="text-slate-500 mb-8 leading-relaxed">
                            To ensure your account stays safe, please set up a 6-digit passcode. This will be required for sensitive actions like logging out.
                        </p>
                        <button
                            onClick={() => setStep('setup')}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 rounded-2xl shadow-lg shadow-blue-500/30 transition-all active:scale-[0.98]"
                        >
                            Set Up Now
                        </button>
                    </div>
                ) : (
                    <div className="p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-slate-800 mb-1">
                                {step === 'setup' ? 'Create Passcode' : 'Confirm Passcode'}
                            </h2>
                            <p className="text-slate-500 text-sm">
                                {step === 'setup' ? 'Enter a 6-digit number' : 'Re-enter to confirm'}
                            </p>
                        </div>

                        <div className="flex justify-center gap-3 mb-6">
                            {[...Array(6)].map((_, i) => (
                                <div 
                                    key={i} 
                                    className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 ${
                                        (step === 'setup' ? tempPasscode : confirmPasscode).length > i 
                                            ? 'bg-blue-600 border-blue-600 scale-110' 
                                            : 'bg-transparent border-slate-300'
                                    }`}
                                />
                            ))}
                        </div>

                        <div className="h-6 mb-4 text-center">
                            {error && <p className="text-red-500 text-xs font-bold animate-pulse">{error}</p>}
                        </div>

                        <div className="grid grid-cols-3 gap-y-4 gap-x-2 mb-8">
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                                <button
                                    key={num}
                                    type="button"
                                    onClick={() => handleKeyPress(num.toString())}
                                    className="w-14 h-14 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-xl font-bold mx-auto flex items-center justify-center transition-colors focus:outline-none text-slate-700"
                                >
                                    {num}
                                </button>
                            ))}
                            <div className="col-start-2">
                                <button
                                    type="button"
                                    onClick={() => handleKeyPress('0')}
                                    className="w-14 h-14 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-xl font-bold mx-auto flex items-center justify-center transition-colors focus:outline-none text-slate-700"
                                >
                                    0
                                </button>
                            </div>
                            <div className="col-start-3 flex items-center justify-center">
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="w-14 h-14 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                                    </svg>
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2">
                            <button
                                onClick={step === 'setup' ? handleNext : handleFinalize}
                                disabled={loading || (step === 'setup' ? tempPasscode : confirmPasscode).length !== 6}
                                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl py-4 font-bold hover:shadow-lg transition-all disabled:opacity-50"
                            >
                                {loading ? 'Saving...' : step === 'setup' ? 'Next' : 'Confirm & Save'}
                            </button>
                            <button
                                onClick={() => {
                                    setStep('prompt');
                                    setTempPasscode('');
                                    setConfirmPasscode('');
                                    setError('');
                                }}
                                className="w-full text-slate-400 py-2 hover:text-slate-600 text-sm font-bold transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PasscodeSetupPrompt;
