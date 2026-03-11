import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiGrid, FiBookOpen, FiArrowLeft, FiClock, FiShield, FiStar, FiAward, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { getUnit1Draft } from "../db";
import BarongMascot from "./BarongMascot";
import BottomNav from "../modules/BottomNav";

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
    const [hasDraft, setHasDraft] = useState(false);
    const [questProgress, setQuestProgress] = useState({ completedUnits: [], xp: 0 });
    const [curricularOffering, setCurricularOffering] = useState('');
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const loadProgress = async () => {
            const stored = localStorage.getItem('quest_progress');
            let initialProgress = { completedUnits: [], xp: 0 };
            
            if (stored) {
                try {
                    initialProgress = JSON.parse(stored);
                    setQuestProgress(initialProgress);
                } catch (err) {
                    console.error("Failed to parse quest progress", err);
                }
            }

            const schoolId = localStorage.getItem('schoolId');
            if (schoolId) {
                try {
                    const res = await fetch(`/api/ph_schools/progress/${schoolId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.progress) {
                            if (data.progress.curricular_offering) {
                                setCurricularOffering(data.progress.curricular_offering);
                            }
                            if (data.progress.completedUnits.length >= initialProgress.completedUnits.length) {
                                setQuestProgress(data.progress);
                                localStorage.setItem('quest_progress', JSON.stringify(data.progress));
                            }
                        }
                    }
                } catch (err) {
                    console.error("Failed to sync quest progress from server", err);
                }
            }
            setIsLoading(false);
        };
        loadProgress();

        const checkDraft = async () => {
            const draft = await getUnit1Draft('draft_unit_1');
            if (draft && draft.step > 1 && draft.step <= 3) {
                setHasDraft(true);
            }
        };
        checkDraft();
    }, []);

    const handleBack = () => {
        navigate(-1);
    };

    const modules = React.useMemo(() => {
        const offering = (curricularOffering || "").toLowerCase();
        
        const hasHighSchool = offering.includes('7') || offering.includes('8') || offering.includes('9') || 
                              offering.includes('10') || offering.includes('11') || offering.includes('12') || 
                              offering.includes('high school');

        let mods = [
            { id: 1, title: "School Profile", icon: <FiHome className="w-5 h-5" />, path: "/modular/unit-1", locked: false },
            { id: 2, title: hasHighSchool ? "JHS/SHS Enrollment" : "Enrollment", icon: <FiUsers className="w-5 h-5" />, path: "/modular/unit-2", locked: false },
            { id: 3, title: "Organized Classes", icon: <FiGrid className="w-5 h-5" />, path: "/modular/unit-3", locked: false },
            { id: 4, title: hasHighSchool ? "JHS/SHS Profile" : "Learner Profile", icon: <FiBookOpen className="w-5 h-5" />, path: "/modular/unit-4", locked: false },
            { id: 5, title: "Shifting & Modality", icon: <FiClock className="w-5 h-5" />, path: "/modular/unit-5", locked: false },
            { id: 6, title: "Teaching Personnel", icon: <FiUsers className="w-5 h-5" />, path: "/modular/unit-6", locked: false },
            { id: 7, title: "School Resources", icon: <FiBookOpen className="w-5 h-5" />, path: "/modular/unit-7", locked: false },
            { id: 8, title: "Physical Facilities", icon: <FiBookOpen className="w-5 h-5" />, path: "/modular/unit-8", locked: false },
        ];
        return mods;
    }, [curricularOffering, questProgress.completedUnits]);

    const handleModuleClick = (mod) => {
        if (mod.locked) return;
        navigate(mod.path);
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
        if (completed === total - 1) return "Final stretch! Ready up the Facilities report! 🏫";
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

                    <div className="flex flex-col items-end">
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-sm ${userRank.badgeClass}`}>
                            {userRank.icon}
                            <span className="text-xs font-black uppercase tracking-wider">{userRank.title}</span>
                        </div>
                        <div className="flex items-center gap-1 mt-1 text-[#004A99]">
                            <span className="text-[10px] font-bold text-[#FDB913] uppercase">XP</span>
                            <span className="text-sm font-black tracking-tight">{questProgress.xp}</span>
                        </div>
                    </div>
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
                                            {isCompleted && (
                                                <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                    Done
                                                </span>
                                            )}
                                        </div>
                                        <span className={`text-sm font-black tracking-tight ${isLocked ? 'text-slate-500' : 'text-slate-800'}`}>
                                            {mod.title}
                                        </span>
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
                >
                    <BarongMascot className="w-16 h-16 drop-shadow-md" />
                </motion.div>
            </motion.div>

            <BottomNav userRole="School Head" />
        </motion.div>
    );
};

export default ModularDashboard;
