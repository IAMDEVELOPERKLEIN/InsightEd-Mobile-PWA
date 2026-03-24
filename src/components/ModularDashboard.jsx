import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { FiHome, FiUsers, FiGrid, FiBookOpen, FiArrowLeft, FiClock, FiShield, FiStar, FiAward, FiCheck, FiMapPin } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getUnitDraft } from "../db";
import BarongMascot from "./BarongMascot";
import BottomNav from "../modules/BottomNav";
import { DASHBOARD_METADATA } from "../config/dashboardMetadata";
import { useAuth } from "../context/AuthContext";

const CircularProgress = ({ progress = 0, size = 60, strokeWidth = 5, children, isLocked }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const dashoffset = circumference - (progress / 100) * circumference;

    return (
        <div className="relative flex items-center justify-center font-bold" style={{ width: size, height: size }}>
            <svg className="absolute top-0 left-0 transform -rotate-90 pointer-events-none" width={size} height={size}>
                <circle
                    className={isLocked ? "text-slate-100" : "text-slate-100"}
                    strokeWidth={strokeWidth}
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
                <circle
                    className={isLocked ? "text-slate-200" : "text-[#FDB913] transition-all duration-1000 ease-out"}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="transparent"
                    r={radius}
                    cx={size / 2}
                    cy={size / 2}
                />
            </svg>
            <div className={`absolute inset-0 flex items-center justify-center rounded-full ${isLocked ? 'grayscale opacity-60' : ''}`}>
                {children}
            </div>
        </div>
    );
};

const getRank = (xp) => {
    if (xp >= 500) return { title: 'Platinum', badgeClass: 'bg-slate-800 text-slate-100 border-slate-700 shadow-slate-200', icon: <FiAward /> };
    if (xp >= 300) return { title: 'Gold', badgeClass: 'bg-amber-100 text-amber-900 border-amber-300 shadow-amber-100', icon: <FiStar /> };
    if (xp >= 150) return { title: 'Silver', badgeClass: 'bg-slate-100 text-slate-700 border-slate-300 shadow-slate-100', icon: <FiShield /> };
    return { title: 'Bronze', badgeClass: 'bg-orange-50 text-orange-800 border-orange-200 shadow-sm', icon: <FiShield /> };
};

const ModularDashboard = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    
    // Parse UID and Mode from query params
    const impersonatedUid = searchParams.get('uid');
    const mode = searchParams.get('mode');

    const [hasDraft, setHasDraft] = useState(false);
    const [questProgress, setQuestProgress] = useState(() => {
        // Only use cache if not impersonating
        if (!impersonatedUid) {
            const stored = localStorage.getItem('quest_progress');
            return stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
        }
        return { completedUnits: [], xp: 0 };
    });
    const [curricularOffering, setCurricularOffering] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [unitDrafts, setUnitDrafts] = useState({});
    const [unitTimestamps, setUnitTimestamps] = useState({});

    useEffect(() => {
        const loadProgress = async () => {
            try {
                let schoolId = localStorage.getItem('schoolId');
                
                // --- SUPER USER IMPERSONATION ---
                if (user?.role === 'Super User' && impersonatedUid) {
                    console.log(`[ModularDashboard] Impersonating UID: ${impersonatedUid}`);
                    const profileRes = await fetch(`/api/school-by-user/${impersonatedUid}`);
                    const profileJson = await profileRes.json();
                    if (profileJson.exists && profileJson.data.school_id) {
                        schoolId = profileJson.data.school_id;
                        console.log(`[ModularDashboard] Found impersonated School ID: ${schoolId}`);
                    }
                }

                if (schoolId) {
                    const res = await fetch(`/api/ph_schools/progress/${schoolId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.progress) {
                            if (data.progress.curricular_offering) {
                                setCurricularOffering(data.progress.curricular_offering);
                            }
                            // Sync if server has more/different data
                            setQuestProgress(data.progress);
                            if (data.progress.timestamps) {
                                setUnitTimestamps(data.progress.timestamps);
                            }
                            
                            // Only cache if not impersonating
                            if (!impersonatedUid) {
                                localStorage.setItem('quest_progress', JSON.stringify(data.progress));
                            }
                        }
                    }
                }
            } catch (err) {
                console.error("Failed to sync quest progress from server", err);
            }
            setIsLoading(false);
        };
        
        if (user) {
            loadProgress();
        }

        const checkAllDrafts = async () => {
            const schoolId = localStorage.getItem('schoolId');
            if (!schoolId) return;

            const drafts = {};
            // Check Units 1-9
            for (let i = 1; i <= 9; i++) {
                try {
                    const draft = await getUnitDraft(i, schoolId);
                    if (draft) {
                        // For Unit 1, it has a specific step check in legacy code, 
                        // but let's be general: if it exists, it's a draft.
                        drafts[i] = true;
                    }
                } catch (e) {
                    console.warn(`Error checking draft for unit ${i}`, e);
                }
            }
            setUnitDrafts(drafts);
        };
        checkAllDrafts();
    }, [user]);

    const formatTimestamp = (ts) => {
        if (!ts) return "Not started";
        const date = new Date(ts);
        if (isNaN(date.getTime())) return "Not started";
        
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        const timeStr = new Intl.DateTimeFormat('en-PH', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
        
        if (isToday) return `Today, ${timeStr}`;
        
        return new Intl.DateTimeFormat('en-PH', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).format(date);
    };

    const handleBack = () => {
        navigate(-1);
    };

    const modules = React.useMemo(() => {
        const offering = (curricularOffering || "").toLowerCase();
        
        const hasHighSchool = offering.includes('7') || offering.includes('8') || offering.includes('9') || 
                              offering.includes('10') || offering.includes('11') || offering.includes('12') || 
                              offering.includes('high school');

        let units = DASHBOARD_METADATA.units;

        return units.map(u => {
            let title = u.title;
            if (u.dynamicTitle) {
                if (u.id === 2) title = hasHighSchool ? "JHS/SHS Enrollment" : "Enrollment";
                if (u.id === 4) title = hasHighSchool ? "JHS/SHS Profile" : "Learner Profile";
            }

            const Icon = u.icon;

            return {
                id: u.id,
                title: title,
                icon: <Icon className="w-5 h-5" />,
                path: u.path,
                locked: false, // Logic for locking can be added here if needed
                hasDraft: !!unitDrafts[u.id],
                lastUpdated: unitTimestamps[`unit${u.id}`]
            };
        });
    }, [curricularOffering, questProgress.completedUnits, mode]);

    const handleModuleClick = (mod) => {
        if (mod.locked) return;
        const targetPath = impersonatedUid ? `${mod.path}?uid=${impersonatedUid}` : mod.path;
        navigate(targetPath);
    };

    const getMascotMessage = () => {
        const completed = questProgress.completedUnits.length;
        const total = modules.length;
        const isHighSchool = (curricularOffering || "").toLowerCase().includes('high');

        if (completed === 0) return "Start with your School Profile! 🏢";
        if (completed === 1) return `Great job! Let's map out ${isHighSchool ? 'High School ' : ''}Enrollment next!`;
        if (completed === 2) return "Excellent progress! Log your organized classes! 📈";
        if (completed === 3) return "Halfway there! Complete the learner profile. 📚";
        if (completed === 4) return "Almost done! Let's configure shifting modalities! ⏱️";
        if (completed === 5) return "Keep it going! Update your Teaching Personnel. 👨‍🏫";
        if (completed === 6) return "Great! Tell us about teacher specializations. 🎓";
        if (completed === 7) return "You're doing amazing! Check your School Resources. 📦";
        if (completed === 8) return "Phenomenal! You've conquered all core modules! 🏆";
        if (completed === total) return "Phenomenal! You've conquered all modules! 🏆";
        return "Keep up the great work! ✨";
    };

    const userRank = getRank(questProgress.xp);

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="min-h-screen flex flex-col items-center bg-slate-50 font-sans pb-32"
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
                            InsightEd <span className="text-[#FDB913]">Quest</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Modular Data Flow</p>
                    </div>

                    <div className="w-10 h-10" />
                </div>
            </header>

            <div className="flex flex-col mt-10 w-full max-w-md relative px-4">
                <div className="absolute top-8 bottom-12 left-8 w-[2px] border-l-2 border-dashed border-slate-200 z-0" />

                <div className="space-y-4 w-full relative z-10 pl-6">
                    {modules.map((mod, idx) => {
                        const isCompleted = questProgress.completedUnits.includes(mod.id);
                        const isLocked = mod.locked;
                        const isNextActiveRound = !isCompleted && !isLocked && 
                                                  modules.slice(0, idx).every(m => questProgress.completedUnits.includes(m.id));
                        const ringProgress = isCompleted ? 100 : (isNextActiveRound ? 25 : 0);

                        return (
                            <motion.div
                                key={mod.id}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: idx * 0.08, type: "spring", stiffness: 100 }}
                            >
                                <motion.button
                                    whileHover={!isLocked ? { scale: 1.02 } : {}}
                                    whileTap={!isLocked ? { scale: 0.98 } : {}}
                                    onClick={() => handleModuleClick(mod)}
                                    className={`relative flex items-center gap-4 w-full p-3 rounded-3xl shadow-sm border transition-all duration-300 text-left cursor-pointer
                                        ${isLocked ? 'border-slate-100 bg-slate-50 cursor-not-allowed opacity-75' : 
                                          isCompleted ? 'border-[#004A99]/20 bg-white hover:border-[#004A99]/40 hover:shadow-md' : 
                                          isNextActiveRound ? 'border-[#FDB913] bg-[#FDB913]/5 shadow-md shadow-[#FDB913]/10 ring-2 ring-[#FDB913]/20 hover:bg-white' : 
                                          'border-slate-200 bg-white hover:border-[#004A99]/30 hover:shadow-md'}
                                    `}
                                >
                                    <div className="flex-shrink-0 -mb-2">
                                        <CircularProgress progress={ringProgress} size={54} strokeWidth={4} isLocked={isLocked}>
                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors
                                                ${isLocked ? 'bg-slate-200 text-slate-400' :
                                                  isCompleted ? 'bg-[#004A99] text-white shadow-inner' :
                                                  isNextActiveRound ? 'bg-[#FDB913] text-[#004A99] shadow-inner shadow-yellow-600/20' :
                                                  'bg-blue-50 text-[#004A99]'
                                                }`}>
                                                {isCompleted ? <FiCheck className="w-5 h-5" /> : mod.icon}
                                            </div>
                                        </CircularProgress>
                                    </div>

                                    <div className="flex flex-col flex-grow py-1">
                                        <div className="flex items-center justify-between mb-0.5">
                                            <span className={`text-[10px] font-black uppercase tracking-[0.15em]
                                                ${isLocked ? 'text-slate-400' : isCompleted ? 'text-slate-400' : 'text-[#004A99]'}
                                            `}>
                                                Unit {mod.id}
                                            </span>
                                            {isCompleted ? (
                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Done
                                                </span>
                                            ) : questProgress.incompleteUnits?.includes(mod.id) ? (
                                                <span className="text-[9px] font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Incomplete
                                                </span>
                                            ) : null}
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={`text-sm font-black tracking-tight ${isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                                                {mod.title}
                                            </span>
                                            {mod.hasDraft && (
                                                <motion.span 
                                                    initial={{ scale: 0.8, opacity: 0 }}
                                                    animate={{ scale: 1, opacity: 1 }}
                                                    className="px-2 py-0.5 rounded-lg bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider shadow-sm shadow-amber-200"
                                                >
                                                    Draft
                                                </motion.span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <FiClock className="w-3 h-3 text-slate-300" />
                                            <span className="text-[10px] font-bold text-slate-400">
                                                {formatTimestamp(mod.lastUpdated)}
                                            </span>
                                        </div>
                                    </div>
                                    
                                    {isNextActiveRound && (
                                        <div className="absolute inset-0 bg-white/40 rounded-[2rem] -z-10 pointer-events-none" />
                                    )}
                                </motion.button>
                            </motion.div>
                        );
                    })}
                </div>
            </div>

            <motion.div
                initial={{ opacity: 0, y: 50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, type: "spring", bounce: 0.4 }}
                className="fixed bottom-6 left-6 flex items-end drop-shadow-xl z-50 pointer-events-none"
            >
                <AnimatePresence>
                    {!isLoading && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.8, x: -20 }}
                            animate={{ opacity: 1, scale: 1, x: 0 }}
                            className="relative bg-white rounded-3xl rounded-bl-xl border-2 border-slate-100 px-5 py-4 shadow-2xl max-w-[220px] mr-4 z-10 pointer-events-auto"
                        >
                            <p className="text-xs text-slate-700 leading-relaxed font-bold">
                                {getMascotMessage()}
                            </p>
                            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white border-b-2 border-l-2 border-slate-100 -rotate-45" />
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.div 
                    whileHover={{ scale: 1.05, rotate: [-2, 2, 0] }}
                    className="text-6xl drop-shadow-md cursor-pointer select-none"
                >
                    🦁
                </motion.div>
            </motion.div>

            <BottomNav userRole="School Head" />
        </motion.div>
    );
};

export default ModularDashboard;
