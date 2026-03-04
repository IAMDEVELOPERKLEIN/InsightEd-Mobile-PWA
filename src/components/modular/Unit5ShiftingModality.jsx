import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiEdit2, FiCheck, FiClock, FiAlertTriangle, FiMonitor, FiRadio, FiBook, FiLayers } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_CHAPTERS = 4; // 1: Gatekeeper, 2: Grade Loop, 3: ADM, 4: Review

// Grade label map for display
const GRADE_LABEL_MAP = {
    kinder: 'Kinder', g1: 'Grade 1', g2: 'Grade 2', g3: 'Grade 3',
    g4: 'Grade 4', g5: 'Grade 5', g6: 'Grade 6', g7: 'Grade 7',
    g8: 'Grade 8', g9: 'Grade 9', g10: 'Grade 10', g11: 'Grade 11', g12: 'Grade 12'
};

const SHIFT_OPTIONS = [
    { id: "Single Shift", label: "Single Shift" },
    { id: "Double Shift", label: "Double Shift" },
    { id: "Triple Shift", label: "Triple Shift" }
];

const MODE_OPTIONS = [
    { id: "In-Person Classes", label: "In-Person" },
    { id: "Blended (3 days in-person, 2 days distance)", label: "Blended (3-2)" },
    { id: "Blended (4 days in-person, 1 day distance)", label: "Blended (4-1)" },
    { id: "Full Distance Learning", label: "Full Distance" }
];

const ADM_CARDS = [
    { id: "adm_mdl", label: "Modular (MDL)", icon: <FiBook className="w-6 h-6" />, color: "border-blue-500 bg-blue-50 text-blue-700", inactive: "border-gray-200 bg-white shadow-sm" },
    { id: "adm_odl", label: "Online (ODL)", icon: <FiMonitor className="w-6 h-6" />, color: "border-violet-500 bg-violet-50 text-violet-700", inactive: "border-gray-200 bg-white shadow-sm" },
    { id: "adm_tvi", label: "TV/Radio (TVI)", icon: <FiRadio className="w-6 h-6" />, color: "border-emerald-500 bg-emerald-50 text-emerald-700", inactive: "border-gray-200 bg-white shadow-sm" },
    { id: "adm_blended", label: "Blended", icon: <FiLayers className="w-6 h-6" />, color: "border-orange-500 bg-orange-50 text-orange-700", inactive: "border-gray-200 bg-white shadow-sm" },
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const pillBase = "flex-1 py-3 px-2 rounded-2xl font-black text-sm border-[3px] transition-all flex items-center justify-center text-center shadow-sm whitespace-pre-wrap select-none";
const pillActive = "border-indigo-500 bg-indigo-50 text-indigo-700 shadow-main transform scale-105 z-10";
const pillInactive = "border-gray-200 bg-white text-gray-500 hover:border-indigo-300 hover:bg-gray-50 text-xs text-gray-400";

// ── Framer Motion variants ────────────────────────────────────────────────────
const slideVariants = {
    enter: { opacity: 0, x: 60, scale: 0.97 },
    center: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -60, scale: 0.97 },
};
const expandVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { opacity: 1, height: "auto", marginTop: 16 },
};

// ══════════════════════════════════════════════════════════════════════════════
const Unit5ShiftingModality = () => {
    const navigate = useNavigate();

    // ── Core state ──────────────────────────────────────────────────────────
    const [currentChapter, setCurrentChapter] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [curricularOffering, setCurricularOffering] = useState("");

    // ── Dynamic grades based on curricular offering ──────────────────────
    const activeGrades = useMemo(() => {
        const co = (curricularOffering || "").toLowerCase();
        let keys;
        if (co.includes("purely elementary")) {
            keys = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
        } else if (co.includes("purely junior")) {
            keys = ['g7', 'g8', 'g9', 'g10'];
        } else if (co.includes("purely senior")) {
            keys = ['g11', 'g12'];
        } else if (co.includes("junior high and senior high") || co.includes("jhs with shs")) {
            keys = ['g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
        } else if (co.includes("elementary school and junior high school")) {
            keys = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'];
        } else {
            keys = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
        }
        return keys.map(k => ({ key: k, label: GRADE_LABEL_MAP[k] }));
    }, [curricularOffering]);

    // ── Chapter 1: Standard Setup ───────────────────────────────────────────
    const [hasStandardShifting, setHasStandardShifting] = useState(null);

    // ── Chapter 2: Grade Loop ───────────────────────────────────────────────
    const [gradeIdx, setGradeIdx] = useState(0);
    const [mapData, setMapData] = useState({}); // { shift_kinder: "...", mode_kinder: "..." }

    // ── Chapter 3: ADMs ─────────────────────────────────────────────────────
    const [hasAdms, setHasAdms] = useState(null);
    const [admData, setAdmData] = useState({ adm_mdl: false, adm_odl: false, adm_tvi: false, adm_blended: false });

    // ── Chapter 4: Review / Submit ──────────────────────────────────────────
    const [isVerified, setIsVerified] = useState(false);

    // ── Saved data (Review Mode) ────────────────────────────────────────────
    const [savedData, setSavedData] = useState(null);

    // ── Data fetch on mount ─────────────────────────────────────────────────
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
                        setCurricularOffering(d.curricular_offering || "");

                        // If there is saved Unit 5 data, jump to review mode
                        if (d.unit5_completed) {
                            setSavedData(d);
                            setHasStandardShifting(d.has_standard_shifting);
                            
                            const prefillMap = {};
                            activeGrades.forEach(g => {
                                prefillMap[`shift_${g.key}`] = d[`shift_${g.key}`] || "";
                                prefillMap[`mode_${g.key}`] = d[`mode_${g.key}`] || "";
                            });
                            setMapData(prefillMap);
                            
                            setHasAdms(d.adm_mdl || d.adm_odl || d.adm_tvi || d.adm_blended);
                            setAdmData({
                                adm_mdl: !!d.adm_mdl,
                                adm_odl: !!d.adm_odl,
                                adm_tvi: !!d.adm_tvi,
                                adm_blended: !!d.adm_blended
                            });

                            setIsReviewMode(true);
                        }
                    }
                }
            } catch (e) {
                console.warn("Could not fetch Unit 5 data", e);
            }
        };
        init();
    }, []);

    // ── Validation ──────────────────────────────────────────────────────────
    const isStep1Valid = hasStandardShifting !== null;
    
    const isGradeInputValid = () => {
        const currentFieldShift = mapData[`shift_${activeGrades[gradeIdx].key}`];
        const currentFieldMode = mapData[`mode_${activeGrades[gradeIdx].key}`];
        return !!currentFieldShift && !!currentFieldMode;
    };

    const isStep3Valid = hasAdms === false || (hasAdms === true && Object.values(admData).some(v => v));

    // ── Progress ────────────────────────────────────────────────────────────
    const progressPercentage = (() => {
        if (currentChapter === 1) return 15;
        if (currentChapter === 2) return 15 + ((gradeIdx + 1) / activeGrades.length) * 45; // up to 60
        if (currentChapter === 3) return 85;
        if (currentChapter === 4) return 100;
        return 0;
    })();

    // ── Navigation ──────────────────────────────────────────────────────────
    const handleNext = () => {
        if (currentChapter === 1) {
            if (hasStandardShifting) {
                // Auto-fill all grades
                const autoFill = {};
                activeGrades.forEach(g => {
                    autoFill[`shift_${g.key}`] = "Single Shift";
                    autoFill[`mode_${g.key}`] = "In-Person Classes";
                });
                setMapData(autoFill);
                setCurrentChapter(3); // Skip chapter 2
            } else {
                setCurrentChapter(2);
                setGradeIdx(0);
            }
        } else if (currentChapter === 2) {
            if (gradeIdx < activeGrades.length - 1) {
                setGradeIdx(prev => prev + 1);
            } else {
                setCurrentChapter(3);
            }
        } else if (currentChapter === 3) {
            setCurrentChapter(4);
        }
    };

    const handleBack = () => {
        if (currentChapter === 2) {
            if (gradeIdx > 0) {
                setGradeIdx(prev => prev - 1);
            } else {
                setCurrentChapter(1);
            }
        } else if (currentChapter === 3) {
            if (hasStandardShifting) {
                setCurrentChapter(1);
            } else {
                setCurrentChapter(2);
                setGradeIdx(activeGrades.length - 1);
            }
        } else if (currentChapter === 4) {
            setCurrentChapter(3);
        } else {
            navigate("/modular-dashboard");
        }
    };

    // ── Submission ──────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!schoolId) return;
        try {
            setLoading(true);

            // Clean ADM data if user said NO
            const finalAdm = hasAdms ? admData : { adm_mdl: false, adm_odl: false, adm_tvi: false, adm_blended: false };

            const payload = {
                has_standard_shifting: hasStandardShifting,
                ...mapData,
                ...finalAdm
            };

            const res = await fetch(`/api/ph_schools/unit5/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server Error ${res.status}`);
            }

            // Update local quest progress
            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(5)) {
                progress.completedUnits.push(5);
                progress.xp += 300; // Big reward for Unit 5
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }

            // Ensure app syncs to start the dashboard animation correctly
            window.dispatchEvent(new Event("storage"));
            setShowSuccess(true);
        } catch (err) {
            alert("Failed to save data. " + err.message);
        } finally {
            setLoading(false);
        }
    };


    // ══════════════════════════════════════════════
    // REVIEW MODE
    // ══════════════════════════════════════════════
    if (isReviewMode) {
        return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                    <div className="max-w-md mx-auto flex items-center gap-3">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <FiX className="w-6 h-6" />
                        </button>
                        <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-indigo-500 rounded-full" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-28">
                    <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="max-w-md w-full mx-auto mt-10 px-6">
                        
                        <div className="text-center mb-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
                                <FiCheckCircle className="w-8 h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-gray-800">Unit 5 Complete!</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Recap Summary */}
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="h-2 bg-indigo-400" />
                                <div className="px-6 py-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Saved Setup</p>

                                    {hasStandardShifting ? (
                                        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl px-4 py-4 text-center">
                                            <p className="font-bold text-indigo-700 text-lg mb-1">Standard Setup 🏫</p>
                                            <p className="text-sm font-medium text-indigo-600">100% Single Shift &amp; In-Person</p>
                                        </div>
                                    ) : (
                                        <div className="bg-orange-50 border border-orange-200 rounded-2xl px-4 py-4 text-center">
                                            <p className="font-bold text-orange-700 text-lg mb-1">Mixed Schedule ⚙️</p>
                                            <p className="text-sm font-medium text-orange-600">Grade-by-Grade mapping configured.</p>
                                        </div>
                                    )}

                                    {/* Sub-list of grades if mixed */}
                                    {!hasStandardShifting && (
                                        <div className="mt-4 space-y-2">
                                            {activeGrades.map(g => (
                                                <div key={g.key} className="flex flex-col bg-gray-50 border border-gray-100 rounded-xl px-3 py-2">
                                                    <span className="text-sm font-black text-gray-700">{g.label}</span>
                                                    <div className="flex gap-2">
                                                        <span className="text-xs font-bold text-indigo-500">{mapData[`shift_${g.key}`]}</span>
                                                        <span className="text-xs text-gray-400">•</span>
                                                        <span className="text-xs font-bold text-emerald-500">{mapData[`mode_${g.key}`]}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* ADMs */}
                                    <div className="mt-6 border-t-2 border-dashed border-gray-100 pt-4">
                                        <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-3">Emergency ADMs</p>
                                        {hasAdms ? (
                                            <div className="flex flex-wrap gap-2">
                                                {Object.entries(admData).map(([k, v]) => {
                                                    if (!v) return null;
                                                    const match = ADM_CARDS.find(c => c.id === k);
                                                    return (
                                                        <div key={k} className="bg-emerald-50 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded-lg border border-emerald-200">
                                                            {match?.label}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-center">
                                                <p className="font-bold text-gray-500 text-sm">None utilized</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { setIsReviewMode(false); setCurrentChapter(1); setIsVerified(false); }}
                            className="mt-6 mb-8 w-full py-5 rounded-2xl font-black text-lg tracking-wide bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3"
                        >
                            <FiEdit2 className="w-5 h-5" />
                            Unlock &amp; Edit Data
                        </motion.button>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ══════════════════════════════════════════════
    // WIZARD MODE
    // ══════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-indigo-50/30 to-purple-50 flex flex-col font-sans relative overflow-x-hidden">
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <FiX className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-indigo-500 rounded-full" animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.4 }} />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-visible pb-32">
                <div className="max-w-md w-full mx-auto mt-6 px-4">
                    <AnimatePresence mode="wait">

                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 1: The Standard Setup Gatekeeper
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 1 && (
                            <motion.div key="ch1-u5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-6 mt-4">
                                    <div className="w-16 h-16 bg-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <FiClock className="w-8 h-8 text-indigo-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800">Let's check your daily schedule!</h2>
                                </div>

                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm text-center">
                                    <p className="text-base font-bold text-gray-600 mb-6 px-2">Does your entire school follow a standard <span className="text-indigo-600">Single Shift</span> schedule with <span className="text-emerald-600">100% In-Person</span> classes?</p>

                                    <div className="space-y-4">
                                        <button onClick={() => setHasStandardShifting(true)} 
                                            className={`w-full py-5 px-6 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-2 ${hasStandardShifting === true ? "bg-indigo-50 border-indigo-500 text-indigo-700 shadow-md" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                                            <span className="text-3xl">✅</span>
                                            Yes, standard setup
                                        </button>
                                        
                                        <button onClick={() => setHasStandardShifting(false)} 
                                            className={`w-full py-5 px-6 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-2 ${hasStandardShifting === false ? "bg-orange-50 border-orange-500 text-orange-700 shadow-md" : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                                            <span className="text-3xl">⚙️</span>
                                            No, we have mixed schedules
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 2: Grade-by-Grade Mapper
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 2 && (() => {
                            const { key, label } = activeGrades[gradeIdx];
                            const currentShift = mapData[`shift_${key}`];
                            const currentMode = mapData[`mode_${key}`];

                            return (
                                <motion.div key={`ch2-${key}`} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                    
                                    {/* Pagination Mini-Nav */}
                                    <div className="flex justify-center gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                        {activeGrades.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full flex-shrink-0 transition-all ${i === gradeIdx ? `w-6 bg-indigo-500` : i < gradeIdx ? `w-3 bg-indigo-300` : `w-2 bg-gray-200`}`} />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 mb-4 px-2">
                                        <div className="w-12 h-12 bg-white border-2 border-gray-200 rounded-2xl flex items-center justify-center text-xl font-black text-gray-700 shadow-sm">{label.split(" ")[1] || "K"}</div>
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-500">Mapping Schedule</p>
                                            <h2 className="text-2xl font-black text-gray-800 leading-tight">{label}</h2>
                                        </div>
                                    </div>

                                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm mt-5 space-y-6">
                                        {/* Shifting */}
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Shifting Model</p>
                                            <div className="flex gap-2">
                                                {SHIFT_OPTIONS.map(opt => {
                                                    const isActive = currentShift === opt.id;
                                                    return (
                                                        <button key={opt.id} onClick={() => setMapData(p => ({ ...p, [`shift_${key}`]: opt.id }))}
                                                            className={`${pillBase} ${isActive ? pillActive : pillInactive}`}>
                                                            {opt.label.replace(" Shift", "nShift")}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>

                                        <div className="border-t border-dashed border-gray-200"></div>

                                        {/* Modality */}
                                        <div>
                                            <p className="text-sm font-bold text-gray-600 mb-3 uppercase tracking-wider">Delivery Modality</p>
                                            <div className="grid grid-cols-2 gap-2">
                                                {MODE_OPTIONS.map(opt => {
                                                    const isActive = currentMode === opt.id;
                                                    return (
                                                        <button key={opt.id} onClick={() => setMapData(p => ({ ...p, [`mode_${key}`]: opt.id }))}
                                                            className={`${pillBase} ${isActive ? pillActive.replace("indigo", "emerald") : pillInactive} px-1`}>
                                                            {opt.label}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 3: Emergency ADMs
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 3 && (
                            <motion.div key="ch3-u5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mt-4 mb-6">
                                    <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <FiAlertTriangle className="w-8 h-8 text-red-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 mb-2">Emergency ADMs</h2>
                                    <p className="text-sm text-gray-500 mb-6 px-4">Are you currently utilizing any Emergency Alternative Delivery Modes due to congestion or natural disasters?</p>
                                </div>

                                <div className="flex gap-4 px-2 mb-6">
                                    <button onClick={() => setHasAdms(true)}
                                        className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex items-center justify-center gap-2 ${hasAdms === true ? "bg-red-50 border-red-500 text-red-700 shadow-md" : "bg-white border-gray-200 text-gray-400"}`}>
                                        Yes
                                    </button>
                                    <button onClick={() => { setHasAdms(false); setAdmData({ adm_mdl: false, adm_odl: false, adm_tvi: false, adm_blended: false }); }}
                                        className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex items-center justify-center gap-2 ${hasAdms === false ? "bg-gray-100 border-gray-400 text-gray-600 shadow-md" : "bg-white border-gray-200 text-gray-400"}`}>
                                        No
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {hasAdms && (
                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden px-2 space-y-3">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-500 ml-1 mb-2">Tap all that apply:</p>
                                            {ADM_CARDS.map(card => {
                                                const isActive = admData[card.id];
                                                return (
                                                    <motion.div key={card.id} whileTap={{ scale: 0.98 }}
                                                        onClick={() => setAdmData(p => ({ ...p, [card.id]: !p[card.id] }))}
                                                        className={`p-4 rounded-2xl border-2 transition-all flex items-center gap-4 cursor-pointer ${isActive ? card.color : card.inactive}`}
                                                    >
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isActive ? "bg-white/60" : "bg-gray-50 text-gray-400"}`}>
                                                            {card.icon}
                                                        </div>
                                                        <span className={`font-black flex-1 text-lg ${isActive ? "" : "text-gray-700"}`}>{card.label}</span>
                                                        <div className={`w-6 h-6 border-2 rounded-full flex items-center justify-center ${isActive ? "border-current bg-white" : "border-gray-300"}`}>
                                                            {isActive && <div className="w-3 h-3 rounded-full bg-current" />}
                                                        </div>
                                                    </motion.div>
                                                )
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 4: Final Submission
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 4 && (
                            <motion.div key="ch4-u5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mt-6">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                                        <FiCheckCircle className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 mb-1">Final Review</h2>
                                    <p className="text-sm text-gray-500 mb-6 px-4">Ready to lock in your shifting and modality setups?</p>
                                </div>

                                <div className="bg-white border flex flex-col gap-4 border-gray-100 rounded-3xl p-5 shadow-sm mb-6">
                                    <div className="flex items-center justify-between border-b-2 border-dashed border-gray-100 pb-3">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <span className="text-xl">🏫</span>
                                            <span className="font-bold text-sm">Base Setup</span>
                                        </div>
                                        <span className="font-black text-sm text-indigo-600">
                                            {hasStandardShifting ? "100% Standard" : "Mixed/Custom"}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <span className="text-xl">🚨</span>
                                            <span className="font-bold text-sm">Emergency ADMs</span>
                                        </div>
                                        <span className={`font-black text-sm ${hasAdms ? "text-amber-600" : "text-emerald-600"}`}>
                                            {hasAdms ? "Active" : "None"}
                                        </span>
                                    </div>
                                </div>

                                <button
                                    onClick={() => setIsVerified(!isVerified)}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all ${isVerified ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-bold" : "bg-white border-gray-200 text-gray-500 font-medium"}`}
                                >
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center ${isVerified ? "bg-emerald-500 border-emerald-600" : "bg-white border-gray-300"}`}>
                                        {isVerified && <FiCheck strokeWidth={4} className="text-white w-4 h-4" />}
                                    </div>
                                    <span className="text-sm">I verify this setup is correct.</span>
                                </button>
                            </motion.div>
                        )}


                    </AnimatePresence>
                </div>
            </main>

            {/* ── Sticky Footer ── */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-center z-40 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
                <div className="w-full max-w-md flex gap-3 px-2">
                    {currentChapter < 4 && (
                        <button
                            onClick={handleNext}
                            disabled={
                                (currentChapter === 1 && !isStep1Valid) ||
                                (currentChapter === 2 && !isGradeInputValid()) ||
                                (currentChapter === 3 && !isStep3Valid)
                            }
                            className="flex-1 py-4 rounded-2xl font-black text-lg bg-indigo-600 text-white shadow-lg shadow-indigo-200 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {currentChapter === 1 ? (hasStandardShifting ? "Continue to ADMs" : "Start Mapping") : currentChapter === 3 ? "Review Data" : "Next Grade"}
                        </button>
                    )}
                    {currentChapter === 4 && (
                        <button
                            onClick={handleSubmit}
                            disabled={!isVerified || loading}
                            className="flex-[2] py-4 rounded-2xl font-black text-lg bg-emerald-500 text-white shadow-lg shadow-emerald-200 active:scale-95 transition-all disabled:opacity-40 disabled:active:scale-100 flex items-center justify-center gap-2"
                        >
                            {loading ? <span className="animate-pulse">Saving...</span> : <span><FiCheck className="inline w-5 h-5 mr-1 mb-0.5" /> Submit Data</span>}
                        </button>
                    )}
                </div>
            </div>

            <SuccessModal 
                isOpen={showSuccess} 
                onClose={() => navigate("/modular-dashboard")} 
                title="Amazing!" 
                message="You've successfully mapped out your Shifting and Modalities." 
                buttonText="Back to Quest Board" 
            />
        </div>
    );
};

export default Unit5ShiftingModality;
