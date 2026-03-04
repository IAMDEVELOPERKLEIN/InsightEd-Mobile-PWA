import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiEdit2, FiPlus, FiTrash2, FiLayers, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_STEPS = 3;

// Grade loop used in Step 2
const GRADE_LOOP = [
    { label: "Kindergarten", key: "kinder", emoji: "🌱" },
    { label: "Grade 1",      key: "g1",     emoji: "1️⃣" },
    { label: "Grade 2",      key: "g2",     emoji: "2️⃣" },
    { label: "Grade 3",      key: "g3",     emoji: "3️⃣" },
    { label: "Grade 4",      key: "g4",     emoji: "4️⃣" },
    { label: "Grade 5",      key: "g5",     emoji: "5️⃣" },
    { label: "Grade 6",      key: "g6",     emoji: "6️⃣" },
];

// Multigrade chip selector grades (Step 1 only)
const MULTIGRADE_CHIPS = ["Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6"];

// ── Shared styles ─────────────────────────────────────────────────────────────
const toggleBtnBase = "flex-1 py-4 px-6 rounded-2xl font-black text-base border-2 transition-all flex items-center justify-center gap-2 shadow-sm";
const toggleBtnActive = "bg-indigo-100 border-indigo-500 text-indigo-700 shadow-indigo-100";
const toggleBtnInactive = "bg-white border-gray-200 text-gray-400 hover:bg-gray-50";
const chunkyInput = "w-full p-4 mt-3 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 transition-colors shadow-sm";

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

// ── Helpers ───────────────────────────────────────────────────────────────────
const emptyCombination = () => ({ combined_grades: [], total_sections: 1 });

// Build empty grade-data state
const buildEmptyGradeData = () => {
    const obj = {};
    GRADE_LOOP.forEach(({ key }) => {
        obj[`sections_${key}`]    = "";
        obj[`size_less_${key}`]   = "";
        obj[`size_within_${key}`] = "";
    });
    return obj;
};

// ══════════════════════════════════════════════════════════════════════════════
const Unit3OrganizedClasses = () => {
    const navigate = useNavigate();

    // ── Core state ──────────────────────────────────────────────────────────
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);

    // ── Step 1: Multigrade ──────────────────────────────────────────────────
    const [hasMultigrade, setHasMultigrade] = useState(null);
    const [combinations, setCombinations] = useState([emptyCombination()]);

    // ── Step 2: Grade-by-grade loop ─────────────────────────────────────────
    const [gradeIdx, setGradeIdx] = useState(0);       // which grade in GRADE_LOOP
    const [gradeData, setGradeData] = useState(buildEmptyGradeData());

    // ── Step 3: Verification checkbox ──────────────────────────────────────
    const [verifiedStep3, setVerifiedStep3] = useState(false);

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
                    if (saved.exists && saved.data && saved.data.unit3_completed) {
                        const d = saved.data;
                        setSavedData(d);

                        // Pre-fill Step 1
                        setHasMultigrade(d.has_multigrade);
                        if (d.has_multigrade && Array.isArray(d.multigrade_details) && d.multigrade_details.length > 0) {
                            setCombinations(d.multigrade_details.map(c => ({
                                combined_grades: c.combined_grades || [],
                                total_sections: c.total_sections ?? "",
                            })));
                        }

                        // Pre-fill Step 2 grade data
                        const filled = buildEmptyGradeData();
                        GRADE_LOOP.forEach(({ key }) => {
                            filled[`sections_${key}`]    = d[`sections_${key}`] ?? "";
                            filled[`size_less_${key}`]   = d[`size_less_${key}`] ?? "";
                            filled[`size_within_${key}`] = d[`size_within_${key}`] ?? "";
                        });
                        setGradeData(filled);

                        setIsReviewMode(true);
                    }
                }
            } catch (e) {
                console.warn("Could not fetch Unit 3 data", e);
            }
        };
        init();
    }, []);

    // ── Step 1 helpers ──────────────────────────────────────────────────────
    const toggleGradeInCombo = (comboIdx, grade) => {
        setCombinations(prev => prev.map((c, i) => {
            if (i !== comboIdx) return c;
            const has = c.combined_grades.includes(grade);
            return {
                ...c,
                combined_grades: has
                    ? c.combined_grades.filter(g => g !== grade)
                    : [...c.combined_grades, grade],
            };
        }));
    };
    const updateSections = (comboIdx, val) =>
        setCombinations(prev => prev.map((c, i) => i === comboIdx ? { ...c, total_sections: val } : c));
    const addCombination = () => setCombinations(prev => [...prev, emptyCombination()]);
    const removeCombination = (idx) => setCombinations(prev => prev.filter((_, i) => i !== idx));

    // ── Step 2 helpers ──────────────────────────────────────────────────────
    const currentGrade = GRADE_LOOP[gradeIdx];

    const setField = (field, val) =>
        setGradeData(prev => ({ ...prev, [field]: val }));

    // Derive above = total - (less + within)
    const calcAbove = (key) => {
        const total  = parseInt(gradeData[`sections_${key}`])    || 0;
        const less   = parseInt(gradeData[`size_less_${key}`])   || 0;
        const within = parseInt(gradeData[`size_within_${key}`]) || 0;
        return Math.max(0, total - (less + within));
    };

    const isGradeInputValid = (key) => {
        const total  = parseInt(gradeData[`sections_${key}`]) || 0;
        if (total === 0) return true; // zero = skip
        const less   = parseInt(gradeData[`size_less_${key}`])   || 0;
        const within = parseInt(gradeData[`size_within_${key}`]) || 0;
        return (less + within) <= total;
    };

    // ── Computed grand totals (Step 3) ──────────────────────────────────────
    const grandTotals = useMemo(() => {
        let totalSections = 0, totalAbove = 0;
        GRADE_LOOP.forEach(({ key }) => {
            const sections = parseInt(gradeData[`sections_${key}`]) || 0;
            totalSections += sections;
            totalAbove += calcAbove(key);
        });
        return { totalSections, totalAbove };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [gradeData]);

    // ── Validation ──────────────────────────────────────────────────────────
    const isStep1Valid = (() => {
        if (hasMultigrade === null) return false;
        if (hasMultigrade === false) return true;
        // Every combination needs at least 2 grades
        if (!combinations.every(c => c.combined_grades.length >= 2)) return false;
        // No duplicate combinations (same set of grades)
        const seen = new Set();
        for (const c of combinations) {
            const key = [...c.combined_grades].sort().join(",");
            if (seen.has(key)) return false;
            seen.add(key);
        }
        return true;
    })();

    const isStep3Valid = verifiedStep3;

    // ── Navigation ──────────────────────────────────────────────────────────
    const handleBack = () => {
        if (currentStep === 2 && gradeIdx > 0) {
            setGradeIdx(i => i - 1);
        } else if (currentStep > 1) {
            setCurrentStep(s => s - 1);
            if (currentStep === 2) setGradeIdx(0);
        } else {
            navigate("/modular-dashboard");
        }
    };

    // "Next Grade" inside step 2; when all grades done → step 3
    const handleNextGrade = () => {
        if (gradeIdx < GRADE_LOOP.length - 1) {
            setGradeIdx(i => i + 1);
        } else {
            setCurrentStep(3);
        }
    };

    // Continue from Step 1 → Step 2
    const handleContinueStep1 = () => {
        setCurrentStep(2);
        setGradeIdx(0);
    };

    // ── Submit ──────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!schoolId) { alert("No school ID found."); return; }
        try {
            setLoading(true);

            const payload = {
                has_multigrade: hasMultigrade,
                multigrade_details: hasMultigrade
                    ? combinations.map(c => ({
                        combined_grades: c.combined_grades,
                        total_sections: parseInt(c.total_sections) || 1,
                    }))
                    : [],
            };

            // Attach per-grade data
            GRADE_LOOP.forEach(({ key }) => {
                payload[`sections_${key}`]    = parseInt(gradeData[`sections_${key}`])    || 0;
                payload[`size_less_${key}`]   = parseInt(gradeData[`size_less_${key}`])   || 0;
                payload[`size_within_${key}`] = parseInt(gradeData[`size_within_${key}`]) || 0;
                payload[`size_above_${key}`]  = calcAbove(key);
            });

            const res = await fetch(`/api/ph_schools/unit3/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server Error ${res.status}`);
            }

            // Update quest progress
            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(3)) {
                progress.completedUnits.push(3);
                progress.xp += 200;
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }
            setShowSuccess(true);
        } catch (err) {
            console.error("Unit 3 submission failed", err);
            alert("Failed to save data. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Progress bar ────────────────────────────────────────────────────────
    // Within step 2 we track sub-progress through grades
    const progressPercentage = (() => {
        if (currentStep === 1) return (1 / TOTAL_STEPS) * 100 * 0.5;
        if (currentStep === 2) return ((1 + (gradeIdx + 1) / GRADE_LOOP.length) / TOTAL_STEPS) * 100;
        return 100;
    })();

    // ══════════════════════════════════════════════
    // REVIEW MODE
    // ══════════════════════════════════════════════
    if (isReviewMode) {
        const isMultigrade = savedData?.has_multigrade;
        const details = savedData?.multigrade_details || [];
        const totalSaved = GRADE_LOOP.reduce((s, { key }) => s + (parseInt(savedData?.[`sections_${key}`]) || 0), 0);
        const aboveSaved = GRADE_LOOP.reduce((s, { key }) => s + (parseInt(savedData?.[`size_above_${key}`]) || 0), 0);

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
                    <motion.div
                        key="review-u3"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="max-w-md w-full mx-auto mt-10 px-6"
                    >
                        {/* Header */}
                        <div className="text-center mb-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 bg-indigo-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-indigo-200">
                                <FiCheckCircle className="w-8 h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-gray-800">Unit 3 Complete!</h2>
                            <p className="text-sm text-gray-400 mt-1">Organized classes data has been saved.</p>
                        </div>

                        {/* Receipt Card */}
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 overflow-hidden">
                            <div className="h-2 bg-indigo-400" />
                            <div className="px-6 py-5 space-y-4">

                                {/* Grand Total Banner */}
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
                                    className="flex items-center justify-between bg-indigo-50 border-2 border-indigo-100 rounded-2xl px-4 py-3">
                                    <span className="font-bold text-indigo-700">Total Sections (All Grades)</span>
                                    <span className="text-3xl font-black text-indigo-600">{totalSaved}</span>
                                </motion.div>

                                {/* Above-standard warning */}
                                {aboveSaved > 0 && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
                                        className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2.5">
                                        <span className="text-xl">⚠️</span>
                                        <p className="text-xs font-bold text-amber-700">
                                            Note: {aboveSaved} section{aboveSaved !== 1 ? "s" : ""} are above standard capacity.
                                        </p>
                                    </motion.div>
                                )}

                                {/* Per-grade breakdown */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-300">Grade Breakdown</p>
                                    {GRADE_LOOP.map(({ label, key, emoji }, i) => {
                                        const total  = parseInt(savedData?.[`sections_${key}`]) || 0;
                                        const less   = parseInt(savedData?.[`size_less_${key}`]) || 0;
                                        const within = parseInt(savedData?.[`size_within_${key}`]) || 0;
                                        const above  = parseInt(savedData?.[`size_above_${key}`]) || 0;
                                        if (total === 0) return null;
                                        return (
                                            <motion.div key={key}
                                                initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 + i * 0.05 }}
                                                className="grid grid-cols-4 gap-1.5 bg-gray-50 rounded-xl px-3 py-2 border border-gray-100">
                                                <div className="col-span-1">
                                                    <p className="text-[10px] text-gray-400 font-bold">{emoji} {label}</p>
                                                    <p className="text-sm font-black text-gray-700">{total} <span className="text-[10px] font-medium text-gray-400">sec</span></p>
                                                </div>
                                                {[["Less", less, "blue"], ["Within", within, "green"], ["Above", above, above > 0 ? "red" : "gray"]].map(([lbl, val, col]) => (
                                                    <div key={lbl} className="text-center">
                                                        <p className="text-[10px] text-gray-400">{lbl}</p>
                                                        <p className={`text-sm font-black text-${col}-500`}>{val}</p>
                                                    </div>
                                                ))}
                                            </motion.div>
                                        );
                                    })}
                                </div>

                                {/* Multigrade Status */}
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}
                                    className={`flex items-center justify-between rounded-2xl px-4 py-3 border-2 ${isMultigrade ? "bg-amber-50 border-amber-200" : "bg-emerald-50 border-emerald-200"}`}>
                                    <span className={`font-bold text-sm ${isMultigrade ? "text-amber-700" : "text-emerald-700"}`}>
                                        {isMultigrade ? "🏫 Has Multigrade Classes" : "✅ No Multigrade Classes"}
                                    </span>
                                    {isMultigrade && <span className="text-lg font-black text-amber-600">{details.length} combos</span>}
                                </motion.div>
                            </div>
                            <div className="mx-6 border-t-2 border-dashed border-gray-100" />
                            <div className="px-6 py-4">
                                <p className="text-xs text-center text-gray-300">Tap below to update your data</p>
                            </div>
                        </motion.div>

                        {/* Unlock & Edit */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
                            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { setIsReviewMode(false); setCurrentStep(1); }}
                            className="mt-6 w-full py-5 rounded-2xl font-black text-lg tracking-wide bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3"
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
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">

            {/* Progress Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => navigate("/modular-dashboard")}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        <FiX className="w-6 h-6" />
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-indigo-500 rounded-full"
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                    </div>
                    <span className="text-xs font-bold text-gray-300 tabular-nums">
                        {currentStep === 2
                            ? `${gradeIdx + 1}/${GRADE_LOOP.length}`
                            : `${currentStep}/${TOTAL_STEPS}`}
                    </span>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-md w-full mx-auto mt-8 px-6">
                    <AnimatePresence mode="wait">

                        {/* ════════════════════════════════
                            STEP 1: The Multigrade Gatekeeper
                            ════════════════════════════════ */}
                        {currentStep === 1 && (
                            <motion.div key="step1-u3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center">
                                        <FiLayers className="w-5 h-5 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Unit 3 · Step 1</p>
                                        <h2 className="text-2xl font-black text-gray-800 leading-tight">Let's organize your classes!</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 mb-8">Tell us about your class setup so we can build the right template.</p>

                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm">
                                    <p className="text-base font-bold text-gray-700 mb-1">Do you have any Multigrade Classes?</p>
                                    <p className="text-sm text-gray-400 mb-4">e.g., Grades 1 &amp; 2 combined in one room</p>

                                    <div className="flex gap-3">
                                        <button onClick={() => setHasMultigrade(true)} className={`${toggleBtnBase} ${hasMultigrade === true ? toggleBtnActive : toggleBtnInactive}`}>
                                            <span>👍</span> Yes
                                        </button>
                                        <button onClick={() => { setHasMultigrade(false); setCombinations([emptyCombination()]); }}
                                            className={`${toggleBtnBase} ${hasMultigrade === false ? toggleBtnActive : toggleBtnInactive}`}>
                                            <span>👎</span> No
                                        </button>
                                    </div>

                                    {/* No: Affirmation */}
                                    <AnimatePresence>
                                        {hasMultigrade === false && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                <div className="mt-4 bg-emerald-50 border-2 border-emerald-200 rounded-2xl px-4 py-3 text-center">
                                                    <p className="text-2xl mb-1">🎉</p>
                                                    <p className="font-bold text-emerald-700">Great — all single-grade classes!</p>
                                                    <p className="text-xs text-emerald-500 mt-1">Tap Continue to start the Magic Math loop.</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* Yes: Combination builder */}
                                    <AnimatePresence>
                                        {hasMultigrade === true && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                <div className="mt-4 space-y-5">
                                                    {combinations.map((combo, comboIdx) => (
                                                        <motion.div key={comboIdx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: comboIdx * 0.05 }}
                                                            className="bg-indigo-50 border-2 border-indigo-100 rounded-2xl p-4">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <p className="text-xs font-black uppercase tracking-wider text-indigo-500">Combination {comboIdx + 1}</p>
                                                                {combinations.length > 1 && (
                                                                    <button onClick={() => removeCombination(comboIdx)} className="text-red-400 hover:text-red-600 transition-colors">
                                                                        <FiTrash2 className="w-4 h-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <p className="text-xs font-bold text-gray-500 mb-2">Select grades combined in this room:</p>
                                                            <div className="flex flex-wrap gap-2 mb-1">
                                                                {MULTIGRADE_CHIPS.map(grade => {
                                                                    const selected = combo.combined_grades.includes(grade);
                                                                    return (
                                                                        <button key={grade} onClick={() => toggleGradeInCombo(comboIdx, grade)}
                                                                            className={`px-3 py-1.5 rounded-xl text-xs font-black border-2 transition-all select-none ${
                                                                                selected
                                                                                    ? "bg-indigo-500 border-indigo-600 text-white shadow-md shadow-indigo-200 scale-105"
                                                                                    : "bg-white border-gray-200 text-gray-400 hover:border-indigo-300 hover:text-indigo-500"
                                                                            }`}>
                                                                            {grade}
                                                                        </button>
                                                                    );
                                                                })}
                                                            </div>
                                                            {combo.combined_grades.length < 2 && (
                                                                <p className="text-[10px] text-indigo-400 mt-1">Select at least 2 grades</p>
                                                            )}

                                                            {/* Duplicate warning */}
                                                            {combo.combined_grades.length >= 2 && (() => {
                                                                const key = [...combo.combined_grades].sort().join(",");
                                                                const isDupe = combinations.some((c, otherIdx) =>
                                                                    otherIdx !== comboIdx &&
                                                                    [...c.combined_grades].sort().join(",") === key
                                                                );
                                                                return isDupe ? (
                                                                    <p className="text-[10px] text-red-500 bg-red-50 border border-red-100 rounded-lg px-2 py-1 mt-1 font-bold">
                                                                        ⚠️ This combination already exists above.
                                                                    </p>
                                                                ) : null;
                                                            })()}

                                                            {/* Fixed 1-class badge */}
                                                            <div className="mt-3 flex items-center gap-2 bg-indigo-100 border border-indigo-200 rounded-xl px-3 py-2">
                                                                <span className="text-indigo-500 text-lg font-black">1</span>
                                                                <div>
                                                                    <p className="text-xs font-black text-indigo-700">Class / Section</p>
                                                                    <p className="text-[10px] text-indigo-400">Each unique combination counts as 1 class</p>
                                                                </div>
                                                            </div>
                                                        </motion.div>
                                                    ))}

                                                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={addCombination}
                                                        className="w-full py-3.5 rounded-2xl font-bold text-sm text-indigo-600 bg-white border-2 border-dashed border-indigo-300 hover:bg-indigo-50 transition-colors flex items-center justify-center gap-2">
                                                        <FiPlus className="w-4 h-4" /> Add another combination
                                                    </motion.button>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}

                        {/* ════════════════════════════════
                            STEP 2: Grade-by-Grade Magic Math
                            ════════════════════════════════ */}
                        {currentStep === 2 && (() => {
                            const { key, label, emoji } = currentGrade;
                            const totalVal   = gradeData[`sections_${key}`];
                            const totalInt   = parseInt(totalVal) || 0;
                            const isZero     = totalVal !== "" && totalInt === 0;
                            const lessVal    = gradeData[`size_less_${key}`];
                            const withinVal  = gradeData[`size_within_${key}`];
                            const lessInt    = parseInt(lessVal)   || 0;
                            const withinInt  = parseInt(withinVal) || 0;
                            const above      = Math.max(0, totalInt - (lessInt + withinInt));
                            const inputsEnabled  = totalInt > 0 && totalVal !== "";
                            const isValid    = isGradeInputValid(key) && totalVal !== "";
                            const showAbove  = inputsEnabled && (lessVal !== "" || withinVal !== "");

                            return (
                                <motion.div key={`grad-${gradeIdx}`} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>

                                    {/* Grade chip nav */}
                                    <div className="flex items-center gap-2 overflow-x-auto pb-2 mb-6 scrollbar-hide">
                                        {GRADE_LOOP.map((g, i) => (
                                            <span key={g.key} className={`flex-shrink-0 text-xs font-black px-3 py-1.5 rounded-full transition-all ${
                                                i === gradeIdx
                                                    ? "bg-indigo-500 text-white shadow-md shadow-indigo-200"
                                                    : i < gradeIdx
                                                    ? "bg-emerald-100 text-emerald-600 border border-emerald-200"
                                                    : "bg-gray-100 text-gray-300"
                                            }`}>
                                                {i < gradeIdx ? "✓" : g.emoji} {g.label.replace("Kindergarten", "Kinder")}
                                            </span>
                                        ))}
                                    </div>

                                    {/* Header */}
                                    <div className="flex items-center gap-3 mb-2">
                                        <motion.div key={gradeIdx} initial={{ rotate: -10, scale: 0.8 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                                            className="w-14 h-14 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-indigo-200">
                                            {emoji}
                                        </motion.div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Step 2 · {label}</p>
                                            <h2 className="text-xl font-black text-gray-800 leading-tight">Magic Math 🪄</h2>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-6">Fill in the section counts for <span className="font-bold text-gray-600">{label}</span>.</p>

                                    {/* Input A: Total sections */}
                                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm space-y-5">

                                        <div>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">
                                                How many total sections do you have for <span className="text-indigo-600">{label}</span>?
                                            </label>
                                            <input
                                                type="number" min="0" placeholder="0"
                                                value={totalVal}
                                                onChange={e => {
                                                    const v = e.target.value;
                                                    setField(`sections_${key}`, v);
                                                    // Auto-zero B & C if total = 0
                                                    if (parseInt(v) === 0) {
                                                        setField(`size_less_${key}`, "0");
                                                        setField(`size_within_${key}`, "0");
                                                    } else if (v === "") {
                                                        setField(`size_less_${key}`, "");
                                                        setField(`size_within_${key}`, "");
                                                    }
                                                }}
                                                className={`${chunkyInput} !mt-1 !text-2xl !font-black text-center`}
                                            />
                                        </div>

                                        {/* Input B: Less than standard */}
                                        <div className={`transition-opacity ${inputsEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">
                                                Out of those <span className="text-indigo-600 font-black">{totalInt}</span> sections, how many have <span className="text-blue-600">LESS THAN</span> standard learner count?
                                            </label>
                                            <input
                                                type="number" min="0" max={totalInt} placeholder="0"
                                                value={lessVal}
                                                disabled={!inputsEnabled}
                                                onChange={e => setField(`size_less_${key}`, e.target.value)}
                                                className={`${chunkyInput} !mt-1 !bg-blue-50 focus:!border-blue-400 focus:!bg-blue-50`}
                                            />
                                        </div>

                                        {/* Input C: Within standard */}
                                        <div className={`transition-opacity ${inputsEnabled ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
                                            <label className="block text-sm font-bold text-gray-600 mb-1">
                                                And how many are <span className="text-green-600">WITHIN</span> the standard learner count?
                                            </label>
                                            <input
                                                type="number" min="0" max={totalInt} placeholder="0"
                                                value={withinVal}
                                                disabled={!inputsEnabled}
                                                onChange={e => setField(`size_within_${key}`, e.target.value)}
                                                className={`${chunkyInput} !mt-1 !bg-green-50 focus:!border-green-400 focus:!bg-green-50`}
                                            />
                                        </div>

                                        {/* Validation warning */}
                                        <AnimatePresence>
                                            {inputsEnabled && !isGradeInputValid(key) && (
                                                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                                    className="text-xs font-bold text-red-500 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
                                                    ⚠️ Less + Within ({lessInt + withinInt}) cannot exceed Total Sections ({totalInt}).
                                                </motion.p>
                                            )}
                                        </AnimatePresence>

                                        {/* Above-standard auto-reveal */}
                                        <AnimatePresence>
                                            {showAbove && isGradeInputValid(key) && (
                                                <motion.div
                                                    initial={{ opacity: 0, y: 12, scale: 0.96 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ type: "spring", bounce: 0.4 }}
                                                    className={`rounded-2xl px-4 py-4 border-2 text-center ${above > 0 ? "bg-red-50 border-red-200" : "bg-gray-50 border-gray-100"}`}
                                                >
                                                    <p className={`text-xs font-bold uppercase tracking-widest mb-1 ${above > 0 ? "text-red-400" : "text-gray-300"}`}>Above Standard (Auto-Calculated)</p>
                                                    <p className={`text-5xl font-black tabular-nums ${above > 0 ? "text-red-500" : "text-gray-400"}`}>{above}</p>
                                                    {above > 0 ? (
                                                        <p className="text-xs text-red-400 mt-2 font-medium">
                                                            🚨 Got it! {above} section{above !== 1 ? "s" : ""} {above !== 1 ? "are" : "is"} OVER standard size.
                                                        </p>
                                                    ) : (
                                                        <p className="text-xs text-gray-400 mt-2">All sections are at or below standard. 🎉</p>
                                                    )}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

                                        {/* Zero shortcut */}
                                        {isZero && (
                                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                                className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-center">
                                                <p className="text-sm text-gray-400">No sections for {label} — tap <span className="font-bold text-indigo-500">Next Grade</span> to continue.</p>
                                            </motion.div>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })()}

                        {/* ════════════════════════════════
                            STEP 3: Final Tally & Verify
                            ════════════════════════════════ */}
                        {currentStep === 3 && (() => {
                            const hasAbove = grandTotals.totalAbove > 0;
                            return (
                                <motion.div key="step3-u3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                    <div className="flex items-center gap-3 mb-2">
                                        <div className="w-10 h-10 bg-green-100 rounded-2xl flex items-center justify-center text-lg">📋</div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-green-500">Step 3 · Final Tally</p>
                                            <h2 className="text-2xl font-black text-gray-800 leading-tight">Review your data</h2>
                                        </div>
                                    </div>
                                    <p className="text-sm text-gray-400 mb-6">Here's your organized classes summary before submitting.</p>

                                    {/* Grand total receipt */}
                                    <div className="bg-white rounded-3xl border border-gray-100 shadow-lg overflow-hidden mb-5">
                                        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 px-5 py-4">
                                            <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1">Grand Total Sections</p>
                                            <p className="text-5xl font-black text-white tabular-nums">{grandTotals.totalSections}</p>
                                        </div>

                                        {/* Above-standard warning */}
                                        {hasAbove && (
                                            <div className="flex items-center gap-2 bg-amber-50 border-b border-amber-100 px-5 py-3">
                                                <span className="text-lg">⚠️</span>
                                                <p className="text-xs font-bold text-amber-700">
                                                    Note: {grandTotals.totalAbove} section{grandTotals.totalAbove !== 1 ? "s" : ""} are above standard capacity.
                                                </p>
                                            </div>
                                        )}

                                        {/* Per-grade rows */}
                                        <div className="divide-y divide-gray-50">
                                            {GRADE_LOOP.map(({ key, label, emoji }) => {
                                                const total  = parseInt(gradeData[`sections_${key}`]) || 0;
                                                const less   = parseInt(gradeData[`size_less_${key}`]) || 0;
                                                const within = parseInt(gradeData[`size_within_${key}`]) || 0;
                                                const above  = calcAbove(key);
                                                if (total === 0) return (
                                                    <div key={key} className="flex justify-between items-center px-5 py-3 opacity-40">
                                                        <span className="text-sm text-gray-400">{emoji} {label}</span>
                                                        <span className="text-xs text-gray-300">No sections</span>
                                                    </div>
                                                );
                                                return (
                                                    <div key={key} className="px-5 py-3">
                                                        <div className="flex justify-between items-center mb-1.5">
                                                            <span className="text-sm font-bold text-gray-700">{emoji} {label}</span>
                                                            <span className="text-lg font-black text-indigo-600">{total} <span className="text-xs font-medium text-gray-400">sections</span></span>
                                                        </div>
                                                        <div className="grid grid-cols-3 gap-2">
                                                            {[["Below Std", less, "blue"], ["Within Std", within, "green"], ["Above Std", above, above > 0 ? "red" : "gray"]].map(([lbl, val, col]) => (
                                                                <div key={lbl} className={`rounded-xl text-center py-1.5 px-1 bg-${col}-50 border border-${col}-100`}>
                                                                    <p className={`text-[10px] text-${col}-400 font-bold`}>{lbl}</p>
                                                                    <p className={`text-base font-black text-${col}-600`}>{val}</p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Multigrade summary line */}
                                        <div className={`mx-5 mb-4 mt-2 px-4 py-2.5 rounded-2xl border-2 text-sm font-bold flex items-center justify-between ${hasMultigrade ? "bg-amber-50 border-amber-200 text-amber-700" : "bg-emerald-50 border-emerald-200 text-emerald-700"}`}>
                                            <span>{hasMultigrade ? "🏫 Has Multigrade Classes" : "✅ No Multigrade Classes"}</span>
                                            {hasMultigrade && <span className="text-amber-600">{combinations.length} combo{combinations.length !== 1 ? "s" : ""}</span>}
                                        </div>
                                    </div>

                                    {/* Verification Checkbox */}
                                    <div
                                        onClick={() => setVerifiedStep3(v => !v)}
                                        className="bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
                                    >
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${verifiedStep3 ? "bg-blue-600 border-blue-600" : "bg-white border-blue-300"}`}>
                                            {verifiedStep3 && <FiCheck className="text-white w-4 h-4" />}
                                        </div>
                                        <p className="text-sm text-blue-800 font-medium select-none">
                                            I verify this section data is correct and accurately reflects our organized classes as of{" "}
                                            <span className="font-bold">{new Date().toLocaleDateString("en-PH", { year: "numeric", month: "long", day: "numeric" })}</span>.
                                        </p>
                                    </div>
                                </motion.div>
                            );
                        })()}

                    </AnimatePresence>
                </div>
            </main>

            {/* ── Sticky footer nav ── */}
            <div className="fixed bottom-0 left-0 w-full p-5 bg-white border-t border-gray-100 flex justify-center z-50">
                <div className="w-full max-w-md flex gap-3">

                    {/* Back / Prev Grade */}
                    {(currentStep > 1 || gradeIdx > 0) && (
                        <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                            onClick={handleBack}
                            className="px-5 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 border-b-[4px] border-gray-200 active:border-b-0 active:translate-y-[4px] transition-all">
                            Back
                        </motion.button>
                    )}

                    {/* Step 1 Continue */}
                    {currentStep === 1 && (
                        <button onClick={handleContinueStep1} disabled={!isStep1Valid}
                            className="flex-1 py-4 rounded-2xl text-white font-black text-lg bg-indigo-500 border-b-[6px] border-indigo-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg shadow-indigo-200">
                            Continue →
                        </button>
                    )}

                    {/* Step 2 Next Grade */}
                    {currentStep === 2 && (() => {
                        const { key } = currentGrade;
                        const totalVal = gradeData[`sections_${key}`];
                        const totalInt = parseInt(totalVal) || 0;
                        const isValid  = isGradeInputValid(key) && totalVal !== "";
                        const isLast   = gradeIdx === GRADE_LOOP.length - 1;
                        return (
                            <button onClick={handleNextGrade} disabled={!isValid}
                                className="flex-1 py-4 rounded-2xl text-white font-black text-lg bg-indigo-500 border-b-[6px] border-indigo-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg shadow-indigo-200">
                                {isLast ? "View Summary 📋" : `Next: ${GRADE_LOOP[gradeIdx + 1]?.label} →`}
                            </button>
                        );
                    })()}

                    {/* Step 3 Submit */}
                    {currentStep === 3 && (
                        <button onClick={handleSubmit} disabled={loading || !isStep3Valid}
                            className="flex-1 py-4 rounded-2xl text-white font-black text-lg bg-green-500 border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg shadow-green-200">
                            {loading ? "Saving..." : "Submit Classes"}
                        </button>
                    )}
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="Classes have been organized successfully! ✓"
                redirectUrl="/modular-dashboard"
            />
        </div>
    );
};

export default Unit3OrganizedClasses;
