import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import SchoolLocation from '../../forms/SchoolLocation';
import BottomNav from '../../modules/BottomNav';

const Unit9SchoolLocation = () => {
    const navigate = useNavigate();

    const handleBack = () => {
        navigate('/nexus-dashboard');
    };

    const handleSaveSuccess = () => {
        // Update localStorage so ModularDashboard immediately reflects completion
        const stored = localStorage.getItem('quest_progress');
        let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
        if (!progress.completedUnits.includes(9)) {
            progress.completedUnits.push(9);
            progress.xp = (progress.xp || 0) + 500;
        }
        localStorage.setItem('quest_progress', JSON.stringify(progress));
        navigate('/nexus-dashboard');
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="min-h-screen bg-slate-50 font-sans pb-32"
        >
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md rounded-b-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-slate-100 px-4 py-4 sm:px-6">
                <div className="max-w-md mx-auto relative flex items-center justify-between">
                    <button
                        onClick={handleBack}
                        className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                        aria-label="Go back"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
                        <h1 className="text-lg font-black text-[#004A99] tracking-tight">
                            Unit 9: <span className="text-[#FDB913]">SHA Hub</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Special Hardship Allowance</p>
                    </div>

                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-md mx-auto px-4 pt-6">
                <SchoolLocation 
                    schoolId={localStorage.getItem('schoolId')} 
                    onSaveSuccess={handleSaveSuccess}
                />
            </main>

            <BottomNav userRole="School Head" />
        </motion.div>
    );
};

export default Unit9SchoolLocation;
