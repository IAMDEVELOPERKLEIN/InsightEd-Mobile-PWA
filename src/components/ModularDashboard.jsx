import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiHome, FiUsers, FiBox, FiBookOpen, FiArrowLeft, FiGrid } from "react-icons/fi";

import { motion } from "framer-motion";
import { getUnit1Draft } from "../db";
import BarongMascot from "./BarongMascot";

const ModularDashboard = () => {
    const navigate = useNavigate();
    const [hasDraft, setHasDraft] = useState(false);
    const [questProgress, setQuestProgress] = useState({ completedUnits: [], xp: 0 });

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

            // Sync with backend if schoolId exists
            const schoolId = localStorage.getItem('schoolId');
            if (schoolId) {
                try {
                    const res = await fetch(`/api/ph_schools/progress/${schoolId}`);
                    if (res.ok) {
                        const data = await res.json();
                        if (data.success && data.progress) {
                            // Merge backend Truth with local if backend has more completion
                            if (data.progress.completedUnits.length > initialProgress.completedUnits.length) {
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

    const modules = [
        {
            id: 1,
            title: "School",
            icon: <FiHome className="w-7 h-7" />,
            path: "/modular/unit-1",
            locked: false,
        },
        {
            id: 2,
            title: "Enroll",
            icon: <FiUsers className="w-7 h-7" />,
            path: "/modular/unit-2",
            locked: !questProgress.completedUnits.includes(1),
        },
        {
            id: 3,
            title: "Classes",
            icon: <FiGrid className="w-7 h-7" />,
            path: "/modular/unit-3",
            locked: !questProgress.completedUnits.includes(2),
        },
        {
            id: 4,
            title: "Personnel",
            icon: <FiBookOpen className="w-7 h-7" />,
            path: "/teaching-personnel",
            locked: !questProgress.completedUnits.includes(3),
        },
    ];

    // Alternating margins for winding path
    const pathOffsets = ["ml-0", "-ml-16", "ml-16", "ml-0"];

    const handleModuleClick = (mod) => {
        if (mod.locked) return;
        navigate(mod.path);
    };

    // Determine mascot message based on progress
    const getMascotMessage = () => {
        const completed = questProgress.completedUnits.length;
        if (completed === 0) return "Start with the School Profile module! 🏫";
        if (completed === 1) return "Great job! Try testing Enrollment next!";
        if (completed === 2) return "You're on fire! Facilities is next! 🔥";
        if (completed === 3) return "Almost there! One more module to go!";
        return "You've completed all modules! 🎉";
    };

    return (
        // Task 1: Soft Spotlight Background
        <div className="min-h-screen flex flex-col items-center pb-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 overflow-hidden font-sans">

            {/* Task 2: Gamified Player Status Header */}
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-sm rounded-b-3xl shadow-[0_4px_20px_rgba(0,0,0,0.06)] px-4 py-3 sm:px-6">
                <div className="max-w-md mx-auto flex justify-between items-center">
                    <button
                        onClick={handleBack}
                        className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-500"
                        aria-label="Go back"
                    >
                        <FiArrowLeft className="w-5 h-5" />
                    </button>

                    <h1 className="text-lg font-black text-gray-800 tracking-tight">
                        Insight<span className="text-indigo-500">Ed</span> Quest
                    </h1>

                    <div className="flex items-center gap-3">
                        {/* Streak */}
                        <div className="flex items-center gap-1">
                            <span className="text-base">🔥</span>
                            <span className="text-sm font-bold text-orange-500">1</span>
                        </div>
                        {/* Gems */}
                        <div className="flex items-center gap-1">
                            <span className="text-base">💎</span>
                            <span className="text-sm font-bold text-blue-500">{questProgress.xp}</span>
                        </div>
                        {/* Lives */}
                        <div className="flex items-center gap-1">
                            <span className="text-base">❤️</span>
                            <span className="text-sm font-bold text-red-500">5</span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Task 3: Winding Path Layout */}
            <div className="flex flex-col items-center mt-12 space-y-8 w-full max-w-md relative px-4">

                {/* Decorative dashed path line */}
                <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-1 border-l-[3px] border-dashed border-gray-200 z-0" />

                {modules.map((mod, idx) => {
                    const isCompleted = questProgress.completedUnits.includes(mod.id);
                    const isActive = !mod.locked && !isCompleted;

                    return (
                        <motion.div
                            key={mod.id}
                            initial={{ opacity: 0, y: 30, scale: 0.8 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            transition={{ delay: idx * 0.12, type: "spring", bounce: 0.4 }}
                            className={`relative z-10 flex flex-col items-center ${pathOffsets[idx]}`}
                        >
                            {/* Module Label */}
                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.12 + 0.2 }}
                                className={`mb-2 text-xs font-bold uppercase tracking-widest ${
                                    mod.locked ? "text-gray-300" : isCompleted ? "text-emerald-500" : "text-indigo-500"
                                }`}
                            >
                                {isCompleted ? "✓ Done" : `Unit ${mod.id}`}
                            </motion.p>

                            {/* Task 4: Chunky 3D Bouncy Button */}
                            {mod.locked ? (
                                // Locked button
                                <div className="w-24 h-24 rounded-full flex flex-col justify-center items-center text-gray-400 font-bold text-sm bg-gray-200 border-b-[6px] border-gray-300 shadow-sm cursor-not-allowed select-none">
                                    <span className="text-2xl mb-0.5">🔒</span>
                                    <span className="text-[10px]">{mod.title}</span>
                                </div>
                            ) : isCompleted ? (
                                // Completed button
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    onClick={() => handleModuleClick(mod)}
                                    className="w-24 h-24 rounded-full flex flex-col justify-center items-center text-white font-bold text-sm bg-emerald-500 border-b-[6px] border-emerald-700 shadow-lg active:border-b-0 active:translate-y-[6px] transition-all cursor-pointer"
                                >
                                    {mod.icon}
                                    <span className="text-[10px] mt-1">{mod.title}</span>
                                </motion.button>
                            ) : (
                                // Active / unlocked button
                                <div className="relative">
                                    {/* Pulsing ring behind active node */}
                                    <div className="absolute inset-0 w-24 h-24 rounded-full border-[3px] border-green-400/40 animate-ping pointer-events-none" />
                                    <motion.button
                                        whileHover={{ scale: 1.08 }}
                                        whileTap={{ scale: 0.92 }}
                                        animate={{ y: [0, -4, 0] }}
                                        transition={{ y: { repeat: Infinity, duration: 2, ease: "easeInOut" } }}
                                        onClick={() => handleModuleClick(mod)}
                                        className="relative w-24 h-24 rounded-full flex flex-col justify-center items-center text-white font-bold text-sm bg-green-500 border-b-[6px] border-green-700 shadow-lg active:border-b-0 active:translate-y-[6px] transition-all cursor-pointer"
                                    >
                                        {mod.icon}
                                        <span className="text-[10px] mt-1">{mod.title}</span>
                                    </motion.button>
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            {/* Task 5: Mascot Cheerleader */}
            <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8, type: "spring" }}
                className="fixed bottom-6 left-6 flex items-end drop-shadow-xl z-50"
            >
                {/* Speech Bubble */}
                <div className="relative bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-lg border border-gray-100 max-w-[200px] mr-2">
                    <p className="text-xs text-gray-600 leading-relaxed font-medium">
                        {getMascotMessage()}
                    </p>
                    {/* Pointer */}
                    <div className="absolute -bottom-1.5 left-3 w-3 h-3 bg-white border-b border-r border-gray-100 rotate-45" />
                </div>

                {/* Mascot Avatar — Kid in Barong Tagalog */}
                <BarongMascot className="w-14 h-14 sm:w-16 sm:h-16" />
            </motion.div>
        </div>
    );
};

export default ModularDashboard;
