import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { setPersistence, browserLocalPersistence, signInWithCustomToken } from 'firebase/auth';

const PinLogin = ({ rememberedUser, onSwitchAccount, onUsePassword }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleKeyPress = useCallback((num) => {
    if (error) setError('');
    if (pin.length < 6) {
      setPin(prev => prev + num);
      
      // Auto-submit on 6th digit
      if (pin.length === 5) {
        verifyPin(pin + num);
      }
    }
  }, [error, pin.length]);

  const handleDelete = useCallback(() => {
    if (error) setError('');
    setPin(prev => prev.slice(0, -1));
  }, [error]);
  
  // Need wrapper mapping logic for dashboards
  const getDashboardPath = (role, accountCategory) => {
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
        'Super Admin': '/super-admin',
        'Central Office': '/monitoring-dashboard',
        'Central Office Finance': '/finance-dashboard',
        'Super User': '/super-user-selector',
        'EFD': '/efd-dashboard',
        'HRODI': '/efd-dashboard',
    };
    return roleMap[role] || '/';
  };

  const verifyPin = async (completedPin) => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/pin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: rememberedUser.email,
          pin: completedPin
        })
      });
      
      const data = await response.json();
      
      if (response.ok && data.success && data.user) {
        // Soft login successful! Apply session data securely
        localStorage.setItem('uid', data.user.uid);
        localStorage.setItem('userRole', data.user.role);
        localStorage.setItem('userEmail', data.user.email);
        sessionStorage.setItem('stride_unlocked', 'true');
        
        if (data.user.region) localStorage.setItem('userRegion', data.user.region);
        if (data.user.division) localStorage.setItem('userDivision', data.user.division);
        if (data.user.account_category) localStorage.setItem('accountCategory', data.user.account_category);

        // Sign into Firebase silently if Custom Token is returned
        if (data.customToken) {
          try {
            await setPersistence(auth, browserLocalPersistence);
            await signInWithCustomToken(auth, data.customToken);
          } catch (fbErr) {
            console.warn("Firebase silent login failed", fbErr);
          }
        }
        
        // Navigation 
        const destPath = getDashboardPath(data.user.role, data.user.account_category);
        navigate(destPath);
      } else {
        setError(data.error || 'Incorrect PIN');
        setPin(''); 
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center p-4 w-full">
      <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-inner mb-4 overflow-hidden outline outline-4 outline-white outline-offset-[-2px]">
        {/* Placeholder avatar or just the first initial */}
        <span className="text-blue-600 text-3xl font-black uppercase tracking-tighter">
            {rememberedUser?.firstName?.charAt(0) || 'U'}
        </span>
      </div>
      
      <h2 className="text-2xl font-bold mb-1 text-slate-800">
        Welcome back, {rememberedUser?.firstName}!
      </h2>
      <p className="text-slate-500 mb-6 text-sm">
        Enter your 6-digit PIN to continue
      </p>

      <div className="flex justify-center gap-3 mb-8">
        {[...Array(6)].map((_, i) => (
          <div 
            key={i} 
            className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
              pin.length > i 
                ? 'bg-blue-600 border-blue-600 scale-110' 
                : 'bg-slate-200 border-transparent'
            } ${error ? 'border-red-500 bg-red-500/20' : ''}`}
          />
        ))}
      </div>

      <div className="h-6 mb-2">
          {error && <p className="text-red-500 text-sm font-bold animate-pulse">{error}</p>}
      </div>

      {loading ? (
          <div className="flex justify-center items-center h-64">
              <div className="w-10 h-10 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
      ) : (
          <div className="grid grid-cols-3 gap-y-6 gap-x-6 mb-8 w-full max-w-[280px]">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
              <button
                key={num}
                onClick={() => handleKeyPress(num.toString())}
                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-2xl font-semibold mx-auto flex items-center justify-center transition-all focus:outline-none text-slate-700 shadow-sm"
              >
                {num}
              </button>
            ))}
            <div className="col-start-2">
              <button
                onClick={() => handleKeyPress('0')}
                className="w-16 h-16 rounded-full bg-slate-50 hover:bg-slate-200 active:bg-slate-300 active:scale-95 text-2xl font-semibold mx-auto flex items-center justify-center transition-all focus:outline-none text-slate-700 shadow-sm"
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                </svg>
              </button>
            </div>
          </div>
      )}

      <div className="flex flex-col gap-4 mt-2 mb-2">
        <button
          onClick={onUsePassword}
          className="text-blue-600 font-bold text-sm hover:text-blue-800 transition-colors"
        >
          Use Password Instead
        </button>
        
        <button
          onClick={onSwitchAccount}
          className="text-slate-400 font-medium text-xs hover:text-slate-600 transition-colors uppercase tracking-widest"
        >
          Not you? Switch Account
        </button>
      </div>
    </div>
  );
};

export default PinLogin;
