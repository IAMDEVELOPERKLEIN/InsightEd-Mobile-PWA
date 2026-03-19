import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiArrowRight, 
    FiArrowLeft,
    FiBookOpen, 
    FiHeart, 
    FiTrendingUp,
    FiAward,
    FiZap,
    FiSearch,
    FiBell,
    FiGrid,
    FiMoreVertical
} from 'react-icons/fi';
import { TbReportAnalytics, TbTarget } from "react-icons/tb";
import { useAuth } from '../context/AuthContext';
import loadingLogo from '../assets/loading.gif';
import PageTransition from '../components/PageTransition';
import BottomNav from './BottomNav';

const NexusDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [questProgress, setQuestProgress] = useState({ completedUnits: [], xp: 0 });
    const [loading, setLoading] = useState(true);
    const [isNavigating, setIsNavigating] = useState(false);
    const [showEdWelcome, setShowEdWelcome] = useState(false);
    const [currentTime, setCurrentTime] = useState(new Date());
    const [esf7Status, setEsf7Status] = useState('NOT_STARTED');

    useEffect(() => {
        const timer = setInterval(() => setCurrentTime(new Date()), 60000); // Update every minute
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        const loadCommonData = async () => {
            const isNew = localStorage.getItem('isNewUser');
            if (isNew === 'true') {
                setShowEdWelcome(true);
            }

            const schoolId = localStorage.getItem('schoolId') || user?.school_id;
            if (schoolId) {
                try {
                    const res = await fetch(`/api/ph_schools/progress/${schoolId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success) setQuestProgress(data.progress);
                    }

                    // Fetch ESF7 Status
                    const esf7Res = await fetch(`/api/esf7/status/${schoolId}`);
                    if (esf7Res.ok) {
                        const esf7Data = await esf7Res.json();
                        if (esf7Data.success) setEsf7Status(esf7Data.status);
                    }
                } catch (err) {
                    console.error("Failed to sync progress", err);
                }
            }
            setLoading(false);
        };
        loadCommonData();
    }, [user]);

    const handleCardClick = (route, id) => {
        if (id === 'esf7') {
            setIsNavigating(true);
            setTimeout(() => {
                navigate(route);
            }, 600); // Small delay to show the high-impact loader
        } else {
            navigate(route);
        }
    };

    const calculateProgress = (unitIds) => {
        if (!questProgress.completedUnits) return 0;
        const completedCount = unitIds.filter(id => questProgress.completedUnits.includes(id)).length;
        return Math.round((completedCount / unitIds.length) * 100);
    };

    if (loading || isNavigating) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white">
                <div className="w-32 h-32 flex items-center justify-center">
                    <img src={loadingLogo} className="w-full h-full object-contain drop-shadow-xl" alt="InsightEd Loading" />
                </div>
                {isNavigating && (
                    <motion.p 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-[10px] font-black text-slate-300 uppercase tracking-[0.2em] mt-6 italic"
                    >
                        Initializing ESF7 Hub...
                    </motion.p>
                )}
            </div>
        );
    }

    const modules = [
        {
            id: 'school-info',
            title: 'School Profile',
            subtitle: 'Forms & History',
            emoji: '🏛️',
            icon: <FiBookOpen className="w-8 h-8" />,
            color: 'from-blue-500 to-blue-700',
            textColor: 'text-blue-600',
            bgLight: 'bg-blue-50',
            progress: calculateProgress([1, 2, 3, 4, 5, 6, 7, 8]),
            route: '/my-activity',
            description: 'Core Identity'
        },
        {
            id: 'sha',
            title: 'Special Hardship',
            subtitle: 'SHA Dashboard',
            emoji: '🛡️',
            icon: <FiAward className="w-8 h-8" />,
            color: 'from-rose-500 to-rose-700',
            textColor: 'text-rose-600',
            bgLight: 'bg-rose-50',
            progress: calculateProgress([9]),
            route: '/modular/unit-9',
            description: 'Hardship Allowance'
        },
        {
            id: 'esf7',
            title: 'ESF7 Hub',
            subtitle: 'Teacher workload',
            emoji: '🛡️',
            icon: <TbReportAnalytics className="w-8 h-8" />,
            color: esf7Status === 'VERIFIED' ? 'from-emerald-500 to-teal-600' : 'from-indigo-500 to-indigo-700',
            textColor: esf7Status === 'VERIFIED' ? 'text-emerald-600' : 'text-indigo-600',
            bgLight: esf7Status === 'VERIFIED' ? 'bg-emerald-50' : 'bg-indigo-50',
            progress: esf7Status === 'VERIFIED' ? 100 : (esf7Status === 'DRAFT' || esf7Status === 'PENDING_SDO' ? 50 : 0),
            route: '/draft/esf7',
            badge: esf7Status === 'VERIFIED' ? 'VERIFIED' : (esf7Status === 'NOT_STARTED' ? 'BETA' : 'STAGED'),
            description: 'Resource Sync'
        },
        {
            id: 'nspp',
            title: 'NSPP Path',
            subtitle: 'Assessment',
            emoji: '⚡',
            icon: <TbTarget className="w-8 h-8" />,
            color: 'from-amber-500 to-orange-600',
            textColor: 'text-amber-600',
            bgLight: 'bg-amber-50',
            progress: 0,
            route: '/draft/nspp',
            badge: 'COMING SOON',
            description: 'Targeted Goals'
        }
    ];

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return "Good Morning";
        if (hour < 18) return "Good Afternoon";
        return "Good Evening";
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="w-32 h-32 flex items-center justify-center">
                    <img src={loadingLogo} className="w-full h-full object-contain drop-shadow-xl" alt="InsightEd Loading" />
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-white pb-32 font-sans text-slate-900 overflow-y-auto">
                
                {/* --- TOP HEADER --- */}
                <div className="px-6 pt-8 pb-4 flex justify-between items-center">
                    <button 
                        onClick={() => navigate(-1)}
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:bg-slate-50 rounded-full transition-colors"
                    >
                        <FiArrowLeft className="w-6 h-6" />
                    </button>
                    <h2 className="text-lg font-bold text-slate-800">Home</h2>
                    <div className="relative">
                        <FiBell className="w-6 h-6 text-slate-800" />
                        <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-rose-500 border-2 border-white rounded-full"></span>
                    </div>
                </div>

                {/* --- WELCOME GREETING --- */}
                <div className="px-6 pt-2 pb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-5xl font-black text-slate-900 tracking-tight">Hi {user?.name?.split(' ')[0] || 'Jenifer'}!</h1>
                        <p className="text-slate-500 font-bold text-xl mt-1">{getGreeting()}</p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">
                            {currentTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                            {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                        </p>
                    </div>
                </div>

                {/* --- SEARCH BAR --- */}
                <div className="px-6 mb-8">
                    <div className="relative group">
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5 transition-colors group-focus-within:text-blue-600" />
                        <input 
                            type="text" 
                            placeholder="Search"
                            className="w-full bg-slate-50 border-0 rounded-3xl py-4 pl-12 pr-4 text-sm font-bold text-slate-800 focus:ring-2 focus:ring-blue-500/20 transition-all placeholder:text-slate-300"
                        />
                    </div>
                </div>

                {/* --- WELCOME BANNER --- */}
                <div className="px-6 mb-10">
                    <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 flex justify-between items-center shadow-[0_12px_35px_rgba(0,0,0,0.06)] border-b-8 border-slate-100 relative overflow-hidden group hover:shadow-lg transition-all active:translate-y-1">
                        <div className="relative z-10 w-2/3">
                            <h2 className="text-3xl font-black text-slate-900 mb-2">Welcome!</h2>
                            <p className="text-lg font-bold text-slate-500 leading-snug">Let's track your <br />school units</p>
                        </div>
                        <div className="w-32 h-32 relative z-10 flex items-center justify-center">
                            <div className="absolute inset-0 bg-blue-50 rounded-full scale-0 group-hover:scale-100 transition-transform duration-500"></div>
                            <span className="text-6xl relative z-10 drop-shadow-md select-none">🦁</span>
                        </div>
                        {/* Decorative background circle */}
                        <div className="absolute -right-10 -top-10 w-40 h-40 bg-blue-50/30 rounded-full blur-2xl"></div>
                    </div>
                </div>

                {/* --- SECTION TITLE --- */}
                <div className="px-6 mb-6 flex justify-between items-end">
                    <h3 className="text-xl font-black text-slate-900">Unit Quests</h3>
                    <button className="text-blue-600 text-xs font-black uppercase tracking-widest hover:text-blue-800 transition-colors">view all</button>
                </div>

                {/* --- 2X2 GRID MATCHING REFERENCE --- */}
                <div className="px-6 grid grid-cols-2 gap-4">
                    {modules.map((mod, idx) => {
                        const isPrimary = mod.id === 'esf7' && esf7Status !== 'VERIFIED';
                        return (
                            <motion.div
                                key={mod.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.1 }}
                                onClick={() => handleCardClick(mod.route, mod.id)}
                                className={`
                                    flex flex-col p-6 rounded-[2.5rem] cursor-pointer relative transition-all duration-300 active:scale-95 active:translate-y-1
                                    ${isPrimary 
                                        ? 'bg-[#10346B] text-white shadow-xl shadow-blue-900/40 border-b-4 border-blue-950' 
                                        : 'bg-white border border-slate-100 text-slate-900 shadow-[0_10px_25px_rgba(0,0,0,0.08)] border-b-4 border-slate-200'}
                                `}
                            >
                                <div className="flex justify-end items-start mb-6">
                                    <FiMoreVertical className={isPrimary ? 'text-blue-200' : 'text-slate-400'} />
                                </div>

                                <div className="mb-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 ${isPrimary ? 'bg-white/10 text-white' : 'bg-white border border-slate-100 shadow-sm text-slate-800'}`}>
                                        {mod.icon}
                                    </div>
                                    <h4 className={`font-black leading-tight mb-1 ${isPrimary ? 'text-xl' : 'text-lg'}`}>{mod.title}</h4>
                                    <p className={`text-sm font-bold uppercase tracking-widest ${isPrimary ? 'text-blue-200' : 'text-slate-500'}`}>{mod.subtitle}</p>
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-center mb-3">
                                        <span className={`text-xs font-black uppercase tracking-widest ${isPrimary ? 'text-blue-200' : 'text-slate-400'}`}>Progress</span>
                                        <span className={`text-base font-black ${isPrimary ? 'text-white' : 'text-slate-900'}`}>{mod.progress}%</span>
                                    </div>
                                    <div className={`h-1.5 w-full rounded-full overflow-hidden ${isPrimary ? 'bg-white/10' : 'bg-slate-200/50'}`}>
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${mod.progress}%` }}
                                            transition={{ duration: 1, delay: 0.5 }}
                                            className={`h-full rounded-full ${isPrimary ? 'bg-white' : 'bg-[#10346B]'}`}
                                        />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* --- DAILY QUEST BANNER --- */}
                <div className="mt-8 px-6">
                    <motion.div 
                        whileHover={{ scale: 1.02 }}
                        className="bg-white border-2 border-amber-100/50 rounded-[2.5rem] p-6 flex items-center justify-between relative overflow-hidden shadow-xl shadow-amber-500/5 cursor-pointer"
                    >
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100 shadow-inner">
                                <FiAward className="text-amber-500 w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-amber-700 uppercase tracking-tighter">Daily Streak: 5 Days! 🔥</h4>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Finish ESF7 to Level Up</p>
                            </div>
                        </div>
                        <FiArrowRight className="text-slate-300 w-5 h-5 group-hover:translate-x-1" />
                        
                        {/* Decorative background element */}
                        <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-amber-100/20 rounded-full blur-2xl"></div>
                    </motion.div>
                </div>

                <BottomNav userRole="School Head" />
            </div>

            {/* --- ED WELCOME OVERLAY --- */}
            <AnimatePresence>
                {showEdWelcome && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/40 backdrop-blur-[2px] p-6 pb-20"
                    >
                        <motion.div 
                            initial={{ y: 100, scale: 0.9 }}
                            animate={{ y: 0, scale: 1 }}
                            exit={{ y: 100, scale: 0.9, opacity: 0 }}
                            className="relative bg-white rounded-[3rem] p-8 shadow-2xl border-4 border-blue-500/20 max-w-sm w-full"
                        >
                            {/* Mascot Entry */}
                            <div className="absolute -top-20 left-1/2 -translate-x-1/2 text-center">
                                <motion.div 
                                    className="text-7xl drop-shadow-2xl"
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                >
                                    🦁
                                </motion.div>
                            </div>

                            <div className="mt-8 space-y-4 text-center">
                                <div className="inline-flex items-center gap-2 bg-blue-50 px-3 py-1 rounded-full border border-blue-100 mb-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    <p className="text-blue-700 text-[10px] font-black uppercase tracking-widest">Incoming Message</p>
                                </div>
                                
                                <h2 className="text-2xl font-black text-slate-800 italic uppercase leading-tight">
                                    Hi there! <span className="text-blue-600">Magandang Araw</span> sa iyo!
                                </h2>

                                <div className="space-y-3">
                                    <p className="text-sm font-bold text-slate-600 leading-relaxed">
                                        Welcome to the <span className="text-[#004A99]">InsightEd Nexus</span>. 
                                        Great job on finishing your registration!
                                    </p>
                                    <p className="text-[13px] font-medium text-slate-500 leading-relaxed italic">
                                        "I’m **Ed**, and I’ll be helping you navigate through our school management tools. 
                                        This is your command center—manage our **School Info**, check the **SHA**, or draft your **ESF7** and **NSPP** reports."
                                    </p>
                                    <p className="text-sm font-black text-slate-800">
                                        Everything is organized. Tayo na?
                                    </p>
                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => {
                                        localStorage.removeItem('isNewUser');
                                        setShowEdWelcome(false);
                                    }}
                                    className="w-full py-4 bg-[#004A99] text-white font-black rounded-2xl shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 group transition-all hover:bg-blue-800"
                                >
                                    <span>TAYO NA!</span>
                                    <FiArrowRight className="group-hover:translate-x-1 transition-transform" />
                                </motion.button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Global Animated Scanline Effect */}
        </PageTransition>
    );
};

export default NexusDashboard;
