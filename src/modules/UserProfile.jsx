// src/modules/UserProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import LoadingScreen from '../components/LoadingScreen';
import SchoolHeadBottomNav from './SchoolHeadBottomNav';

const UserProfile = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    // Fetch extended user info from Firestore (Users collection)
                    const userDoc = await getDoc(doc(db, "users", user.uid));
                    if (userDoc.exists()) {
                        setUserData(userDoc.data());
                    } else {
                        // Fallback to Auth data if Firestore doc isn't found
                        setUserData({
                            firstName: user.displayName?.split(' ')[0] || 'User',
                            lastName: user.displayName?.split(' ')[1] || '',
                            email: user.email,
                            role: 'School Head'
                        });
                    }
                } catch (error) {
                    console.error("Error fetching profile:", error);
                }
            } else {
                navigate('/login');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, [navigate]);

    const handleLogout = async () => {
    try {
        await signOut(auth);
        localStorage.clear();
        sessionStorage.clear();
        // Use window.location.href to force a full browser reload to the login page
        // This clears any "stuck" React states that cause white screens
        window.location.href = '/login'; 
    } catch (error) {
        console.error("Logout Error:", error);
    }
};

    if (loading) return <LoadingScreen message="Opening Profile..." />;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32">
            {/* --- HEADER --- */}
            <div className="bg-[#004A99] px-6 pt-16 pb-28 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                <div className="relative z-10 text-center">
                    <div className="w-24 h-24 bg-white rounded-full mx-auto mb-4 border-4 border-white/20 flex items-center justify-center text-4xl shadow-lg">
                        {userData?.firstName?.charAt(0)}{userData?.lastName?.charAt(0)}
                    </div>
                    <h1 className="text-2xl font-bold text-white uppercase tracking-tight">
                        {userData?.firstName} {userData?.lastName}
                    </h1>
                    <p className="text-blue-200 text-sm font-medium">{userData?.role || 'School Head'}</p>
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="px-6 -mt-16 relative z-20 max-w-md mx-auto space-y-4">
                
                {/* Account Details */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Account Information</h2>
                    </div>
                    <div className="p-4 space-y-4">
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">EMAIL</span>
                            <span className="text-sm font-semibold text-gray-800">{userData?.email}</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">POSITION</span>
                            <span className="text-sm font-semibold text-gray-800">School Head / Principal</span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-xs font-bold text-gray-500">STATUS</span>
                            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full uppercase">Verified Account</span>
                        </div>
                    </div>
                </div>

                {/* App Settings */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                    <div className="p-4 border-b border-gray-50 bg-gray-50/50">
                        <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">App Settings</h2>
                    </div>
                    <div className="p-2">
                        <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🔔</span>
                                <span className="text-sm font-bold text-gray-700">Notifications</span>
                            </div>
                            <span className="text-gray-300">→</span>
                        </button>
                        <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition">
                            <div className="flex items-center gap-3">
                                <span className="text-xl">🛡️</span>
                                <span className="text-sm font-bold text-gray-700">Privacy & Security</span>
                            </div>
                            <span className="text-gray-300">→</span>
                        </button>
                    </div>
                </div>

                {/* Logout Button */}
                <button 
                    onClick={handleLogout}
                    className="w-full bg-white border-2 border-red-100 text-red-600 font-bold py-4 rounded-2xl shadow-sm hover:bg-red-50 active:scale-95 transition flex items-center justify-center gap-2"
                >
                    <span>🚪</span> Sign Out from InsightEd
                </button>

                <p className="text-center text-[10px] text-gray-400 font-bold uppercase tracking-widest pt-4">
                    InsightEd Mobile v2.0.4 • 2026
                </p>
            </div>

            <SchoolHeadBottomNav />
        </div>
    );
};

export default UserProfile;