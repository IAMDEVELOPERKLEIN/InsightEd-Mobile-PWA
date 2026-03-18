import React, { useState, useEffect } from 'react';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition'; // Import Transition
import { useAuth } from '../context/AuthContext';

const HRDashboard = () => {
    const { user, token } = useAuth();
    const [userName, setUserName] = useState('User');

    useEffect(() => {
        if (user) {
            setUserName(user.firstName || user.displayName || 'User');
        }
    }, [user]);

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#FFF0F0] p-5 pb-24 md:p-10 font-sans">
                
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6">
                        <h1 className="text-[#CC0000] text-3xl font-bold">
                            Welcome, {userName}! 👩‍💼
                        </h1>
                        <p className="text-gray-500 text-sm mt-1">
                            Manage personnel, hiring, and welfare.
                        </p>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 mb-4">
                        <h3 className="font-bold text-gray-700 mb-2">Personnel Updates</h3>
                        <p className="text-gray-500 text-sm">
                            All employee records are up to date.
                        </p>
                    </div>

                    {/* Example Stats for HR */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                            <span className="text-2xl font-bold text-[#CC0000]">3</span>
                            <p className="text-xs text-gray-500 uppercase font-semibold">New Applicants</p>
                        </div>
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
                            <span className="text-2xl font-bold text-gray-700">45</span>
                            <p className="text-xs text-gray-500 uppercase font-semibold">Total Staff</p>
                        </div>
                    </div>
                </div>

                <BottomNav homeRoute="/hr-dashboard" />
            </div>
        </PageTransition>
    );
};

export default HRDashboard;