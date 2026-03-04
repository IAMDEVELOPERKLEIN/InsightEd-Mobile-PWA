import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiEdit2, FiCheck, FiArrowRight, FiChevronLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_CHAPTERS = 2; // Chapter 1: Utilities, Chapter 2: Placeholder

export default function Unit6PhysicalFacilities() {
    const navigate = useNavigate();

    // ── Global State ─────────────────────────────────────────────────────────
    const [schoolId, setSchoolId] = useState("");
    const [loading, setLoading] = useState(false);
    const [savedData, setSavedData] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    const [currentChapter, setCurrentChapter] = useState(1);

    // ── Chapter 1 State (Utilities) ──────────────────────────────────────────
    const [utilitiesData, setUtilitiesData] = useState({
        hasElectricity: null, // true/false
        hasInternet: null,    // true/false
        waterSource: null     // "Local Pipe Network" | "Deep Well" | "None / Rainwater"
    });

    const WATER_SOURCES = [
        { id: "pipe", label: "Local Pipe Network", icon: "🚰", color: "blue" },
        { id: "well", label: "Deep Well", icon: "💧", color: "cyan" },
        { id: "none", label: "None / Rainwater", icon: "🌧️", color: "gray" }
    ];

    // ── Data Fetching ─────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem("schoolId");
            if (!storedId) return;
            setSchoolId(storedId);

            try {
                const res = await fetch(`/api/ph_schools/${storedId}`);
                if (res.ok) {
                    const saved = await res.json();
                    if (saved.exists && saved.data) {
                        const d = saved.data;
                        setSavedData(d);

                        // If they have classrooms OR a water source, they already saved this module at least once
                        if (d.unit6_completed) {
                            
                            // Rehydrate state
                            setUtilitiesData({
                                hasElectricity: d.has_electricity,
                                hasInternet: d.has_internet,
                                waterSource: d.water_source
                            });

                            // Open Review Mode
                            setIsReviewMode(true);
                        }
                    }
                }
            } catch (e) {
                console.warn("Could not fetch Unit 6 data", e);
            }
        };
        init();
    }, []);

    // ── Navigation Logic ──────────────────────────────────────────────────
    const handleNext = () => {
        if (currentChapter < TOTAL_CHAPTERS) {
            setCurrentChapter(currentChapter + 1);
        }
    };

    const handleBack = () => {
        if (currentChapter > 1) {
            setCurrentChapter(currentChapter - 1);
        } else {
            navigate("/modular-dashboard");
        }
    };

    // ── Validation ─────────────────────────────────────────────────────────
    const isStepValid = () => {
        if (currentChapter === 1) {
            return (
                utilitiesData.hasElectricity !== null &&
                utilitiesData.hasInternet !== null &&
                utilitiesData.waterSource !== null
            );
        }
        return true;
    };

    // ── Submission ─────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!schoolId) return alert("No school ID found.");

        try {
            setLoading(true);

            // Construct payload mappings
            const payload = {
                has_electricity: utilitiesData.hasElectricity,
                has_internet: utilitiesData.hasInternet,
                water_source: utilitiesData.waterSource,
                // Placeholder defaults for unbuilt chapters to satisfy DB
                classrooms_total: savedData?.classrooms_total || 0,
                classrooms_good: savedData?.classrooms_good || 0,
                classrooms_repair: savedData?.classrooms_repair || 0,
                classrooms_condemned: savedData?.classrooms_condemned || 0,
                toilets_male: savedData?.toilets_male || 0,
                toilets_female: savedData?.toilets_female || 0,
                toilets_pwd: savedData?.toilets_pwd || 0,
                handwashing_stations: savedData?.handwashing_stations || 0,
            };

            const res = await fetch(`/api/ph_schools/unit6/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save Physical Facilities");

            // Update Progress
            const stored = localStorage.getItem('quest_progress');
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(6)) {
                progress.completedUnits.push(6);
                progress.xp += 300; // Big reward for facilities
                localStorage.setItem('quest_progress', JSON.stringify(progress));
            }

            setShowSuccess(true);
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to sync facilities data.");
        } finally {
            setLoading(false);
        }
    };


    // ── UI Styles ──────────────────────────────────────────────────────────
    const chunkyInput = "w-full bg-gray-50 border-2 border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none transition-all placeholder-gray-300";

    const slideVariants = {
        enter: { opacity: 0, x: 50 },
        center: { opacity: 1, x: 0 },
        exit: { opacity: 0, x: -50 }
    };

    const progressPercentage = (currentChapter / TOTAL_CHAPTERS) * 100;

    // ── Render Review Mode ────────────────────────────────────────────────
    if (isReviewMode) {
        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
                <header className="sticky top-0 z-50 bg-white shadow-sm px-4 py-3 flex items-center justify-between">
                    <button onClick={() => navigate('/modular-dashboard')} className="p-2 text-gray-400 hover:text-gray-600">
                        <FiX className="w-6 h-6" />
                    </button>
                    <div className="font-bold text-gray-800">Review Mode</div>
                    <div className="w-10"></div>
                </header>

                <main className="flex-1 w-full max-w-md mx-auto p-6 flex flex-col pt-8">
                    <div className="flex justify-center mb-6 text-green-500">
                        <FiCheckCircle className="w-20 h-20" />
                    </div>
                    <h1 className="text-3xl font-black text-center text-gray-800 tracking-tight leading-tight">
                        Facilities<br />Saved!
                    </h1>
                    <p className="text-center text-gray-500 mt-3 font-medium px-4 mb-8">
                        Your essential lifeline connections have been successfully recorded.
                    </p>

                    <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-gray-100 flex flex-col gap-4 mb-8">
                        <div className="flex items-center justify-between pb-4 border-b-2 border-gray-50">
                            <span className="text-gray-500 font-bold">Electricity</span>
                            <span className="text-gray-800 font-black">{utilitiesData.hasElectricity ? "✅ Yes" : "❌ No"}</span>
                        </div>
                        <div className="flex items-center justify-between pb-4 border-b-2 border-gray-50">
                            <span className="text-gray-500 font-bold">Internet</span>
                            <span className="text-gray-800 font-black">{utilitiesData.hasInternet ? "✅ Yes" : "❌ No"}</span>
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-gray-500 font-bold text-sm">Primary Water Source</span>
                            <span className="text-blue-600 font-black text-lg bg-blue-50 px-3 py-2 rounded-xl border-2 border-blue-100 mt-1">
                                {utilitiesData.waterSource || "Not specified"}
                            </span>
                        </div>
                    </div>

                    <button onClick={() => setIsReviewMode(false)}
                        className="mt-auto w-full py-4 rounded-2xl text-gray-600 font-black text-lg bg-white border-2 border-gray-200 active:bg-gray-50 transition-all flex justify-center items-center gap-2">
                        <FiEdit2 /> Unlock & Edit Data
                    </button>
                </main>
            </div>
        );
    }

    // ── Render Wizard ─────────────────────────────────────────────────────
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans overflow-x-hidden">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        {currentChapter === 1 ? <FiX className="w-6 h-6" /> : <FiChevronLeft className="w-6 h-6" />}
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-amber-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                    </div>
                </div>
            </header>

            <main className="flex-1 w-full max-w-md mx-auto p-6 flex flex-col pt-8">
                <AnimatePresence mode="wait">
                    
                    {/* ────────────────────────────────────────────────────────
                        CHAPTER 1: Utilities Gatekeeper
                        ──────────────────────────────────────────────────────── */}
                    {currentChapter === 1 && (
                        <motion.div key="ch1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="pb-10">
                            
                            <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-8">
                                Let's check your school's lifelines! 💡
                            </h2>

                            <div className="space-y-8">
                                
                                {/* Electricity Toggle */}
                                <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100">
                                    <h3 className="font-bold text-gray-700 mb-4 px-1 text-lg">Does your school have an active Electricity connection?</h3>
                                    <div className="flex gap-3">
                                        <button onClick={() => setUtilitiesData(p => ({ ...p, hasElectricity: true }))}
                                            className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${utilitiesData.hasElectricity === true ? "bg-amber-100 border-amber-500 text-amber-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                            <FiCheck className="w-6 h-6" /> Yes
                                        </button>
                                        <button onClick={() => setUtilitiesData(p => ({ ...p, hasElectricity: false }))}
                                            className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${utilitiesData.hasElectricity === false ? "bg-rose-100 border-rose-500 text-rose-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                            <FiX className="w-6 h-6" /> No
                                        </button>
                                    </div>
                                </div>

                                {/* Internet Toggle */}
                                <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100">
                                    <h3 className="font-bold text-gray-700 mb-4 px-1 text-lg">Does your school have Internet Access for admin use?</h3>
                                    <div className="flex gap-3">
                                        <button onClick={() => setUtilitiesData(p => ({ ...p, hasInternet: true }))}
                                            className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${utilitiesData.hasInternet === true ? "bg-indigo-100 border-indigo-500 text-indigo-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                            <FiCheck className="w-6 h-6" /> Yes
                                        </button>
                                        <button onClick={() => setUtilitiesData(p => ({ ...p, hasInternet: false }))}
                                            className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${utilitiesData.hasInternet === false ? "bg-rose-100 border-rose-500 text-rose-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                            <FiX className="w-6 h-6" /> No
                                        </button>
                                    </div>
                                </div>

                                {/* Water Source Area */}
                                <div>
                                    <h3 className="font-bold text-gray-700 mb-4 px-2 text-lg">What is your primary Water Source?</h3>
                                    <div className="space-y-3">
                                        {WATER_SOURCES.map((ws) => {
                                            const isSelected = utilitiesData.waterSource === ws.label;
                                            return (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => setUtilitiesData(p => ({ ...p, waterSource: ws.label }))}
                                                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between shadow-sm outline-none ${
                                                        isSelected
                                                            ? "bg-blue-50 border-blue-500 ring-2 ring-blue-500 ring-offset-1"
                                                            : "bg-white border-gray-100 hover:border-gray-300"
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl ${isSelected ? 'bg-white shadow-sm' : 'bg-gray-50'}`}>
                                                            {ws.icon}
                                                        </div>
                                                        <div className="text-left py-1">
                                                            <div className={`font-bold ${isSelected ? 'text-blue-800' : 'text-gray-700'}`}>
                                                                {ws.label}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    {isSelected && (
                                                        <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white mr-2">
                                                            <FiCheck className="w-4 h-4" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ────────────────────────────────────────────────────────
                        CHAPTER 2: Placeholder
                        ──────────────────────────────────────────────────────── */}
                    {currentChapter === 2 && (
                        <motion.div key="ch2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="pb-10 flex flex-col items-center justify-center mt-12 text-center">
                            <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-4">
                                Ready for Classroom Audit!
                            </h2>
                            <p className="text-gray-500 mb-8 font-medium">Chapter 2 magic math component goes here.</p>
                            
                            <button onClick={handleSubmit} disabled={loading}
                                className="w-full py-4 rounded-2xl text-white font-black text-lg bg-emerald-500 border-b-[6px] border-emerald-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg shadow-emerald-200 flex justify-center items-center gap-2">
                                {loading ? "Saving..." : "Submit Unit 6 ✓"}
                            </button>
                        </motion.div>
                    )}

                </AnimatePresence>
            </main>

            {/* Bottom Sticky Action Bar (For Chapter 1) */}
            {currentChapter === 1 && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white/80 backdrop-blur-md border-t border-gray-100 lg:static lg:bg-transparent lg:border-t-0 mt-auto">
                    <div className="max-w-md mx-auto">
                        <button onClick={handleNext} disabled={!isStepValid()}
                            className="w-full py-4 rounded-2xl text-white font-black text-lg bg-indigo-500 border-b-[6px] border-indigo-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 disabled:bg-gray-300 disabled:border-gray-400 shadow-lg shadow-indigo-200 flex justify-center items-center gap-2">
                            Continue <FiArrowRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="Unit 6 Utilities saved! Facilities linked. ✓"
                redirectUrl="/modular-dashboard"
            />
        </div>
    );
}
