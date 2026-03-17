import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PinSetup = () => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState(1); // 1: Enter PIN, 2: Confirm PIN
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const getDashboardPath = () => {
    const role = localStorage.getItem('userRole') || 'User';
    const accountCategory = localStorage.getItem('accountCategory');

    if (role === 'Division Engineer' || role === 'Engineer') {
      return accountCategory === 'Non-DepEd Engineer' ? '/non-deped-dashboard' : '/engineer-dashboard';
    }
    const roleMap = {
      'Local Government Unit': '/lgu-dashboard',
      'School Head': '/my-activity',
      'Human Resource': '/hr-dashboard',
      'Regional Office': '/monitoring-dashboard',
      'School Division Office': '/monitoring-dashboard',
      'Admin': '/admin-dashboard',
      'Super Admin': '/super-user-selector',
      'Super User': '/super-user-selector',
      'Central Office': '/monitoring-dashboard',
      'Central Office Finance': '/finance-dashboard',
      'EFD': '/efd-dashboard',
      'HRODI': '/efd-dashboard',
    };
    return roleMap[role] || '/';
  };

  const handleKeyPress = (num) => {
    if (error) setError('');
    const current = step === 1 ? pin : confirmPin;
    if (current.length < 6) {
      if (step === 1) setPin(prev => prev + num);
      else setConfirmPin(prev => prev + num);
    }
  };

  const handleDelete = () => {
    if (error) setError('');
    if (step === 1) setPin(prev => prev.slice(0, -1));
    else setConfirmPin(prev => prev.slice(0, -1));
  };

  const handleNext = async () => {
    if (step === 1) {
      if (pin.length === 6) setStep(2);
      else setError('Please enter a 6-digit PIN');
      return;
    }

    if (step === 2) {
      if (confirmPin.length !== 6) {
        setError('Please confirm your 6-digit PIN');
        return;
      }
      if (pin !== confirmPin) {
        setError('PINs do not match. Try again.');
        setPin('');
        setConfirmPin('');
        setStep(1);
        return;
      }

      setIsSubmitting(true);
      try {
        const userEmail = localStorage.getItem('userEmail');
        if (!userEmail) throw new Error("Missing user email");

        const response = await fetch('/api/auth/setup-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail, pin })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          // Record successful skip/setup
          sessionStorage.setItem('stride_unlocked', 'true');
          navigate(getDashboardPath(), { replace: true });
        } else {
          setError(data.error || 'Failed to setup PIN. Please try again.');
          setPin('');
          setConfirmPin('');
          setStep(1);
        }
      } catch (err) {
        console.error("Error setting PIN", err);
        setError('Network error. Please try again later.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const skipSetup = () => {
    sessionStorage.setItem('stride_unlocked', 'true');
    navigate(getDashboardPath(), { replace: true });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-900 via-blue-700 to-slate-200 p-4 font-sans relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100 animate-gradient-xy"></div>
      
      <div className="bg-white/90 backdrop-blur-xl border border-white/50 p-8 rounded-3xl shadow-2xl w-full max-w-sm text-center relative z-10 transition-all">
        <h2 className="text-2xl font-bold mb-2 text-slate-800 tracking-tight">
          {step === 1 ? 'Set Up Passcode' : 'Confirm Passcode'}
        </h2>
        <p className="text-slate-500 mb-8 text-sm font-medium">
          {step === 1 
            ? 'Create a 6-digit PIN for faster logins' 
            : 'Re-enter your PIN to confirm'}
        </p>

        <div className="flex justify-center gap-3 mb-8">
          {[...Array(6)].map((_, i) => (
            <div 
              key={i} 
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                (step === 1 ? pin : confirmPin).length > i 
                  ? 'bg-blue-600 border-blue-600 scale-110' 
                  : 'bg-transparent border-slate-300'
              }`}
            />
          ))}
        </div>

        <div className="h-6 mb-4">
            {error && <p className="text-red-500 text-sm font-medium animate-pulse">{error}</p>}
        </div>

        <div className="grid grid-cols-3 gap-y-6 gap-x-4 mb-8">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
            <button
              key={num}
              onClick={() => handleKeyPress(num.toString())}
              className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-2xl font-medium mx-auto flex items-center justify-center transition-colors focus:outline-none text-slate-700"
            >
              {num}
            </button>
          ))}
          <div className="col-start-2">
            <button
              onClick={() => handleKeyPress('0')}
              className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 text-2xl font-medium mx-auto flex items-center justify-center transition-colors focus:outline-none text-slate-700"
            >
              0
            </button>
          </div>
          <div className="col-start-3 flex items-center justify-center">
            <button
              onClick={handleDelete}
              className="w-16 h-16 rounded-full hover:bg-slate-100 active:bg-slate-200 text-slate-500 hover:text-slate-700 flex items-center justify-center transition-colors focus:outline-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
              </svg>
            </button>
          </div>
        </div>

        <button
          onClick={handleNext}
          disabled={isSubmitting || (step === 1 ? pin : confirmPin).length !== 6}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl py-3.5 font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mb-4"
        >
          {isSubmitting ? 'Saving...' : step === 1 ? 'Next' : 'Confirm PIN'}
        </button>

        <button
          onClick={skipSetup}
          className="w-full text-slate-500 font-medium py-3 hover:text-slate-800 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default PinSetup;
