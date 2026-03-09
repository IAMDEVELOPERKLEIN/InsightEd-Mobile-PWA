import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2, FiUnlock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

const TOTAL_STEPS = 6;

// ── Shared styling ────────────────────────────────────────────────────────────
const chunkyInput = "w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm";
const toggleBtnBase = "flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2";
const toggleBtnActive = "bg-blue-100 border-blue-500 text-blue-700";
const toggleBtnInactive = "bg-white border-gray-200 text-gray-400 hover:bg-gray-50";

const slideVariants = {
    enter: { opacity: 0, x: 60, scale: 0.97 },
    center: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -60, scale: 0.97 },
};

// ── Grade definitions ─────────────────────────────────────────────────────────
const ALL_GRADES = [
    { key: "deploy_k", label: "Kindergarten", emoji: "💒", level: "elem" },
    { key: "deploy_g1", label: "Grade 1", emoji: "1️⃣", level: "elem" },
    { key: "deploy_g2", label: "Grade 2", emoji: "2️⃣", level: "elem" },
    { key: "deploy_g3", label: "Grade 3", emoji: "3️⃣", level: "elem" },
    { key: "deploy_g4", label: "Grade 4", emoji: "4️⃣", level: "elem" },
    { key: "deploy_g5", label: "Grade 5", emoji: "5️⃣", level: "elem" },
    { key: "deploy_g6", label: "Grade 6", emoji: "6️⃣", level: "elem" },
    { key: "deploy_g7", label: "Grade 7", emoji: "7️⃣", level: "jhs" },
    { key: "deploy_g8", label: "Grade 8", emoji: "8️⃣", level: "jhs" },
    { key: "deploy_g9", label: "Grade 9", emoji: "9️⃣", level: "jhs" },
    { key: "deploy_g10", label: "Grade 10", emoji: "🔟", level: "jhs" },
    { key: "deploy_g11", label: "Grade 11", emoji: "📘", level: "shs" },
    { key: "deploy_g12", label: "Grade 12", emoji: "📗", level: "shs" },
];

// ── Component ─────────────────────────────────────────────────────────────────
const Unit6TeachingPersonnel = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [curricularOffering, setCurricularOffering] = useState("");

    // Step 2 sub-step: index into the grade array, then special roles screen
    const [gradeIndex, setGradeIndex] = useState(0);

    // Gatekeeper toggles
    const [hasOtherFunding, setHasOtherFunding] = useState(false);
    const [hasSpecialRoles, setHasSpecialRoles] = useState(false);
    const [hasDepartmentalized, setHasDepartmentalized] = useState(false);

    // ── Form State ────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        // Step 1: Funding
        fund_deped: "", fund_lgu: "", fund_others: "",
        // Step 2: Per-grade deployment + special roles
        deploy_k: "", deploy_g1: "", deploy_g2: "", deploy_g3: "", deploy_g4: "", deploy_g5: "", deploy_g6: "",
        deploy_g7: "", deploy_g8: "", deploy_g9: "", deploy_g10: "", deploy_g11: "", deploy_g12: "",
        deploy_sned: "", non_advisory: "",
        // Legacy broad fields (kept for backward compat)
        deploy_kinder: "", deploy_elem: "", deploy_jhs: "", deploy_shs: "",
        // Step 3: Multi-Grade
        mg_1_2: "", mg_3_4: "", mg_5_6: "",
        mg_has_3_plus: false, mg_3_plus_count: "",
        // Step 4: Departmentalized
        dept_english: "", dept_filipino: "", dept_science: "", dept_math: "",
        dept_ap: "", dept_mapeh: "", dept_tle: "", dept_values: "",
        dept_gened: "", dept_ece: "", dept_others: "",
        // Step 5: Experience
        exp_0_1: "", exp_2_5: "", exp_6_10: "", exp_11_15: "", exp_16_20: "",
        exp_21_25: "", exp_26_30: "", exp_31_35: "", exp_36_40: "", exp_40_45: "",
    });

    // ── Data Fetch ────────────────────────────────────────────────────────────
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
                        setCurricularOffering(saved.data.curricular_offering || "");

                        if (saved.data.unit7_completed) {
                            const d = saved.data;
                            // Also fetch the dedicated teaching_personnel row
                            let tp = {};
                            try {
                                const tpRes = await fetch(`/api/ph_schools/unit7/${storedId}`);
                                if (tpRes.ok) {
                                    const tpData = await tpRes.json();
                                    if (tpData.exists && tpData.data) tp = tpData.data;
                                }
                            } catch (e) { console.warn("Could not fetch teaching_personnel row", e); }

                            setFormData(prev => ({
                                ...prev,
                                fund_deped: tp.fund_deped ?? d.fund_deped ?? "", fund_lgu: tp.fund_lgu ?? d.fund_lgu ?? "", fund_others: tp.fund_others ?? d.fund_others ?? "",
                                deploy_k: tp.deploy_k ?? "", deploy_g1: tp.deploy_g1 ?? "", deploy_g2: tp.deploy_g2 ?? "",
                                deploy_g3: tp.deploy_g3 ?? "", deploy_g4: tp.deploy_g4 ?? "", deploy_g5: tp.deploy_g5 ?? "",
                                deploy_g6: tp.deploy_g6 ?? "", deploy_g7: tp.deploy_g7 ?? "", deploy_g8: tp.deploy_g8 ?? "",
                                deploy_g9: tp.deploy_g9 ?? "", deploy_g10: tp.deploy_g10 ?? "", deploy_g11: tp.deploy_g11 ?? "",
                                deploy_g12: tp.deploy_g12 ?? "",
                                deploy_kinder: d.deploy_kinder ?? "", deploy_elem: d.deploy_elem ?? "",
                                deploy_jhs: d.deploy_jhs ?? "", deploy_shs: d.deploy_shs ?? "",
                                deploy_sned: tp.deploy_sned ?? d.deploy_sned ?? "", non_advisory: tp.non_advisory ?? d.non_advisory ?? "",
                                mg_1_2: d.mg_1_2 ?? "", mg_3_4: d.mg_3_4 ?? "", mg_5_6: d.mg_5_6 ?? "",
                                mg_has_3_plus: !!d.mg_has_3_plus, mg_3_plus_count: d.mg_3_plus_count ?? "",
                                dept_english: d.dept_english ?? "", dept_filipino: d.dept_filipino ?? "",
                                dept_science: d.dept_science ?? "", dept_math: d.dept_math ?? "",
                                dept_ap: d.dept_ap ?? "", dept_mapeh: d.dept_mapeh ?? "",
                                dept_tle: d.dept_tle ?? "", dept_values: d.dept_values ?? "",
                                dept_gened: d.dept_gened ?? "", dept_ece: d.dept_ece ?? "",
                                dept_others: d.dept_others ?? "",
                                exp_0_1: d.exp_0_1 ?? "", exp_2_5: d.exp_2_5 ?? "", exp_6_10: d.exp_6_10 ?? "",
                                exp_11_15: d.exp_11_15 ?? "", exp_16_20: d.exp_16_20 ?? "",
                                exp_21_25: d.exp_21_25 ?? "", exp_26_30: d.exp_26_30 ?? "",
                                exp_31_35: d.exp_31_35 ?? "", exp_36_40: d.exp_36_40 ?? "",
                                exp_40_45: d.exp_40_45 ?? "",
                            }));

                            // Restore gatekeeper states
                            if (pInt(tp.fund_lgu ?? d.fund_lgu) > 0 || pInt(tp.fund_others ?? d.fund_others) > 0) setHasOtherFunding(true);
                            if (pInt(tp.deploy_sned ?? d.deploy_sned) > 0 || pInt(tp.non_advisory ?? d.non_advisory) > 0) setHasSpecialRoles(true);
                            const deptKeys = ['dept_english','dept_filipino','dept_science','dept_math','dept_ap','dept_mapeh','dept_tle','dept_values','dept_gened','dept_ece','dept_others'];
                            if (deptKeys.some(k => pInt(d[k]) > 0)) setHasDepartmentalized(true);

                            setIsReviewMode(true);
                        }
                    }
                }
            } catch (e) {
                console.warn("Could not fetch teaching personnel data", e);
            }
        };
        init();
    }, []);

    // ── Dynamic Logic ─────────────────────────────────────────────────────────
    const hasElementary = useMemo(() => {
        const co = (curricularOffering || "").toLowerCase();
        return co.includes("elementary") || co.includes("k to 12") || co === "" || co.includes("all offering");
    }, [curricularOffering]);

    // Build the grade list based on curricular offering
    const visibleGrades = useMemo(() => {
        const co = (curricularOffering || "").toLowerCase();
        const isElem = co.includes("elementary") || co.includes("k to 12") || co === "" || co.includes("all offering");
        const isJHS = co.includes("junior") || co.includes("jhs") || co.includes("k to 12") || co === "" || co.includes("all offering");
        const isSHS = co.includes("senior") || co.includes("shs") || co.includes("k to 12") || co === "" || co.includes("all offering");

        let grades = ALL_GRADES.filter(g => {
            if (g.level === "elem" && isElem) return true;
            if (g.level === "jhs" && isJHS) return true;
            if (g.level === "shs" && isSHS) return true;
            return false;
        });

        // Fallback: show all if nothing matches
        if (grades.length === 0) grades = [...ALL_GRADES];
        return grades;
    }, [curricularOffering]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const handleBack = () => {
        // Step 2 sub-navigation
        if (currentStep === 2) {
            // If on the special roles screen (gradeIndex === visibleGrades.length)
            if (gradeIndex === visibleGrades.length) {
                setGradeIndex(visibleGrades.length - 1);
                return;
            }
            if (gradeIndex > 0) {
                setGradeIndex(gradeIndex - 1);
                return;
            }
        }

        let prevStep = currentStep - 1;
        if (prevStep === 3 && !hasElementary) prevStep = 2;
        if (prevStep === 2) {
            // Go back to last grade in the loop
            setGradeIndex(visibleGrades.length); // special roles screen
        }
        if (prevStep >= 1) setCurrentStep(prevStep);
        else navigate("/modular-dashboard");
    };

    const handleNext = () => {
        // Step 2 sub-navigation
        if (currentStep === 2) {
            if (gradeIndex < visibleGrades.length) {
                // Move to next grade or the special roles screen
                setGradeIndex(gradeIndex + 1);
                return;
            }
            // gradeIndex === visibleGrades.length means we're on the special roles screen → move to step 3
        }

        let nextStep = currentStep + 1;
        if (nextStep === 3 && !hasElementary) nextStep = 4;
        if (nextStep === 2) setGradeIndex(0); // reset grade index entering step 2
        if (nextStep <= TOTAL_STEPS) setCurrentStep(nextStep);
        else handleSubmit();
    };

    // ── Helpers ───────────────────────────────────────────────────────────────
    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const pInt = (v) => parseInt(v) || 0;

    const totalFunding = pInt(formData.fund_deped) + pInt(formData.fund_lgu) + pInt(formData.fund_others);

    const totalDeployment = visibleGrades.reduce((sum, g) => sum + pInt(formData[g.key]), 0)
        + pInt(formData.deploy_sned) + pInt(formData.non_advisory);

    const totalDepartmentalized = [
        'dept_english', 'dept_filipino', 'dept_science', 'dept_math', 'dept_ap',
        'dept_mapeh', 'dept_tle', 'dept_values', 'dept_gened', 'dept_ece', 'dept_others'
    ].reduce((sum, key) => sum + pInt(formData[key]), 0);

    const sumOfFirstNineBrackets = ['exp_0_1','exp_2_5','exp_6_10','exp_11_15','exp_16_20','exp_21_25','exp_26_30','exp_31_35','exp_36_40']
        .reduce((sum, k) => sum + pInt(formData[k]), 0);

    const magicMathRemainder = totalFunding - sumOfFirstNineBrackets;

    const totalExperience = sumOfFirstNineBrackets + Math.max(0, magicMathRemainder);
    const remainingDeployment = totalFunding - totalDeployment;

    // Keep exp_40_45 in sync with the auto-calculated value
    useEffect(() => {
        const autoVal = Math.max(0, magicMathRemainder);
        if (pInt(formData.exp_40_45) !== autoVal) {
            setFormData(prev => ({ ...prev, exp_40_45: autoVal.toString() }));
        }
    }, [magicMathRemainder]);

    // ── Validation ────────────────────────────────────────────────────────────
    const isStepValid = () => {
        if (currentStep === 1) return totalFunding > 0;
        if (currentStep === 2) {
            if (gradeIndex < visibleGrades.length) return true; // Let them click through the grade loop
            return totalDeployment === totalFunding; // Block leaving Step 2 if exactly matched total is not reached
        }
        if (currentStep === 3) return true; // Multi-grade is optional
        if (currentStep === 4) {
             if (!hasDepartmentalized) return true;
             return totalDepartmentalized === totalFunding;
        }
        if (currentStep === 5) return magicMathRemainder >= 0; // Ensures Experience sum doesn't exceed funding
        if (currentStep === 6) return true; // Review step
        return false;
    };

    // ── Progress ──────────────────────────────────────────────────────────────
    const activeTotalSteps = hasElementary ? 6 : 5;
    const displayStep = (!hasElementary && currentStep > 3) ? currentStep - 1 : currentStep;
    const progressPercentage = (displayStep / activeTotalSteps) * 100;

    // ── Submission ────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!schoolId) return alert("No school ID found.");
        try {
            setLoading(true);
            const res = await fetch(`/api/ph_schools/unit7/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error("Failed to save Teaching Personnel data");

            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(7)) {
                progress.completedUnits.push(7);
                progress.xp += 350;
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }
            setShowSuccess(true);
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to save Teaching Personnel data.");
        } finally {
            setLoading(false);
        }
    };

    // ── Field builder helper ──────────────────────────────────────────────────
    const NumField = ({ name, label, icon }) => (
        <div className="flex items-center gap-3">
            {icon && <span className="text-xl flex-shrink-0">{icon}</span>}
            <div className="flex-1">
                <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">{label}</label>
                <input
                    type="number" name={name} min="0" placeholder="0"
                    value={formData[name]} onChange={handleChange}
                    className={chunkyInput}
                />
            </div>
        </div>
    );

    // ── Yes/No Toggle ─────────────────────────────────────────────────────────
    const YesNoToggle = ({ value, onYes, onNo, label }) => (
        <div className="mt-6">
            <p className="text-sm font-bold text-gray-600 mb-3">{label}</p>
            <div className="flex gap-3">
                <button type="button" onClick={onYes}
                    className={`${toggleBtnBase} ${value === true ? toggleBtnActive : toggleBtnInactive}`}>
                    ✅ Yes
                </button>
                <button type="button" onClick={onNo}
                    className={`${toggleBtnBase} ${value === false ? toggleBtnActive : toggleBtnInactive}`}>
                    ❌ No
                </button>
            </div>
        </div>
    );

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">
            {/* ── HEADER ────────────────────────────────────────────────────── */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => navigate("/modular-dashboard")}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        <FiX className="w-6 h-6" />
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-green-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                    <span className="text-sm font-bold text-gray-400 whitespace-nowrap">
                        {displayStep}/{activeTotalSteps}
                    </span>
                </div>

                {/* ── Real-time Total Teachers Counter ───────────────────────── */}
                <div className="max-w-md mx-auto mt-2">
                    <div className="flex justify-between items-center bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl px-4 py-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-green-600">Total Teachers (Funded)</span>
                        <span className="text-2xl font-black text-green-600">{totalFunding}</span>
                    </div>
                </div>
            </header>

            {/* ── MAIN ──────────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto pb-28">
                <AnimatePresence mode="wait">

                {/* ── REVIEW MODE ───────────────────────────────────────────── */}
                {isReviewMode ? (
                    <div className="max-w-md mx-auto pb-32 mt-4">
                        {/* Header */}
                        <div className="text-center mb-10">
                            <motion.div 
                                initial={{ scale: 0 }} 
                                animate={{ scale: 1 }} 
                                className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200"
                            >
                                <span className="text-4xl text-white">👨‍🏫</span>
                            </motion.div>
                            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-indigo-200">
                                Unit 6 • Teaching Staff
                            </span>
                            <h1 className="text-4xl font-black text-slate-800 leading-tight">Summary</h1>
                            <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                        </div>

                        {/* Metric Cards Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-10">
                            <div className="col-span-2 bg-indigo-600 rounded-[2rem] p-6 text-white shadow-2xl shadow-indigo-200 flex items-center justify-between overflow-hidden relative">
                                <div className="relative z-10">
                                    <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Grand Total</p>
                                    <h2 className="text-5xl font-black leading-none">{totalFunding}</h2>
                                </div>
                                <div className="text-6xl opacity-20 relative z-10">🌟</div>
                                <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                            </div>

                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                                    🏢
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Dept. Base</span>
                                <span className="text-3xl font-black text-slate-800 mt-1">{pInt(formData.fund_deped)}</span>
                            </div>
                            <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                                    💼
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Deployed</span>
                                <span className="text-3xl font-black text-slate-800 mt-1">{totalDeployment}</span>
                            </div>
                        </div>

                        {/* Subsections */}
                        <div className="space-y-6">
                            {(pInt(formData.fund_lgu) > 0 || pInt(formData.fund_others) > 0) && (
                                <section>
                                    <div className="flex items-center gap-2 mb-4 ml-2">
                                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Supplemental Funding</h3>
                                    </div>
                                    <div className="grid gap-3">
                                        {pInt(formData.fund_lgu) > 0 && (
                                            <div className="bg-white rounded-2xl p-4 border border-slate-50 flex items-center justify-between shadow-sm">
                                                <span className="font-bold text-slate-700">LGU Funded</span>
                                                <div className="bg-indigo-50 px-3 py-1.5 rounded-xl">
                                                    <span className="font-black text-indigo-700 text-sm">{formData.fund_lgu}</span>
                                                </div>
                                            </div>
                                        )}
                                        {pInt(formData.fund_others) > 0 && (
                                            <div className="bg-white rounded-2xl p-4 border border-slate-50 flex items-center justify-between shadow-sm">
                                                <span className="font-bold text-slate-700">Other Sources</span>
                                                <div className="bg-indigo-50 px-3 py-1.5 rounded-xl">
                                                    <span className="font-black text-indigo-700 text-sm">{formData.fund_others}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </section>
                            )}

                            <section>
                                <div className="flex items-center gap-2 mb-4 ml-2">
                                    <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Experience Profile</h3>
                                </div>
                                <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-sm">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xl">👩‍🎓</span>
                                            <span className="font-black text-slate-700 text-sm">Experience Distribution</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Total Counted</span>
                                            <span className="text-xl font-black text-slate-800">{totalExperience}</span>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <span className={`text-2xl font-black ${totalExperience === totalFunding ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                {totalFunding > 0 ? ((totalExperience / totalFunding) * 100).toFixed(0) : 0}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Unlock Action */}
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-12"
                        >
                            <button 
                                onClick={() => { setIsReviewMode(false); setCurrentStep(1); }}
                                className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FiUnlock className="w-5 h-5 text-indigo-700" />
                                </div>
                                <span>Unlock to Edit Staff Info</span>
                            </button>
                            <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                                Note: Unlocking will require re-saving data.
                            </p>
                        </motion.div>
                    </div>
                ) : (

                <div className="flex-1 max-w-md w-full mx-auto mt-8 px-6">
                <AnimatePresence mode="wait">

                    {/* ── STEP 1: Funding Source (with Gatekeeper) ────────────── */}
                    {currentStep === 1 && (
                        <motion.div key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Funding Source</h2>
                            <p className="mt-2 text-sm text-gray-400">How many teaching positions are funded under each source?</p>

                            <div className="space-y-5 mt-6">
                                <NumField name="fund_deped" label="DepEd Nationally-Funded" icon="🏛️" />

                                <YesNoToggle
                                    value={hasOtherFunding}
                                    label="Do you have teachers funded by other sources (LGU, NGO, Private)?"
                                    onYes={() => setHasOtherFunding(true)}
                                    onNo={() => {
                                        setHasOtherFunding(false);
                                        setFormData(p => ({ ...p, fund_lgu: "", fund_others: "" }));
                                    }}
                                />

                                <AnimatePresence>
                                    {hasOtherFunding && (
                                        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                            className="space-y-5 overflow-hidden">
                                            <NumField name="fund_lgu" label="LGU-Funded" icon="🏢" />
                                            <NumField name="fund_others" label="Others (NGO, Private, etc.)" icon="📦" />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Grade-by-Grade Deployment Loop ─────────────── */}
                    {currentStep === 2 && (
                        <motion.div key={`s2-${gradeIndex}`} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            {gradeIndex < visibleGrades.length ? (
                                /* ── Individual Grade Screen ── */
                                <>
                                    <h2 className="text-2xl font-bold text-gray-800">Teacher Deployment</h2>
                                    <p className="mt-2 text-sm text-gray-400">
                                        Grade {gradeIndex + 1} of {visibleGrades.length}
                                    </p>

                                    {/* Grade progress indicator */}
                                    <div className="flex gap-1 mt-4 mb-6">
                                        {visibleGrades.map((_, i) => (
                                            <div key={i} className={`h-1.5 flex-1 rounded-full transition-colors ${i <= gradeIndex ? 'bg-blue-500' : 'bg-gray-200'}`} />
                                        ))}
                                    </div>

                                    {/* Running deployment total */}
                                    <div className={`border-2 shadow-md rounded-2xl p-4 z-10 flex justify-between items-center mb-6 transition-colors ${
                                        remainingDeployment === 0 ? 'bg-green-50 border-green-200' :
                                        remainingDeployment < 0 ? 'bg-red-50 border-red-200' :
                                        'bg-blue-50 border-blue-200'
                                    }`}>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${
                                                remainingDeployment === 0 ? 'text-green-600' :
                                                remainingDeployment < 0 ? 'text-red-500' :
                                                'text-blue-500'
                                            }`}>
                                                {remainingDeployment === 0 ? 'Perfectly Deployed!' : remainingDeployment < 0 ? '⚠️ Exceeds Total' : 'Remaining to Assign'}
                                            </span>
                                            <span className="text-xs text-gray-500">Out of {totalFunding} Master Total</span>
                                        </div>
                                        <span className={`text-3xl font-black ${
                                            remainingDeployment === 0 ? 'text-green-700' :
                                            remainingDeployment < 0 ? 'text-red-600' :
                                            'text-blue-600'
                                        }`}>{Math.abs(remainingDeployment)}</span>
                                    </div>

                                    <div className="bg-white rounded-3xl shadow-lg border border-gray-100 p-6">
                                        <div className="text-center mb-4">
                                            <span className="text-5xl">{visibleGrades[gradeIndex].emoji}</span>
                                            <h3 className="text-xl font-black text-gray-800 mt-3">
                                                {visibleGrades[gradeIndex].label}
                                            </h3>
                                        </div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-2 text-center">
                                            How many teachers are assigned?
                                        </label>
                                        <input
                                            type="number"
                                            name={visibleGrades[gradeIndex].key}
                                            min="0"
                                            placeholder="0"
                                            value={formData[visibleGrades[gradeIndex].key]}
                                            onChange={handleChange}
                                            className={`${chunkyInput} text-center text-2xl`}
                                            autoFocus
                                        />
                                    </div>
                                </>
                            ) : (
                                /* ── Special Roles Gatekeeper Screen ── */
                                <>
                                    <h2 className="text-2xl font-bold text-gray-800">Special Roles</h2>
                                    <p className="mt-2 text-sm text-gray-400">Almost done with deployment!</p>

                                    <div className={`border-2 shadow-md rounded-2xl p-4 mt-6 z-10 flex justify-between items-center mb-6 transition-colors ${
                                        remainingDeployment === 0 ? 'bg-green-50 border-green-200' :
                                        remainingDeployment < 0 ? 'bg-red-50 border-red-200' :
                                        'bg-blue-50 border-blue-200'
                                    }`}>
                                        <div className="flex flex-col">
                                            <span className={`font-bold ${
                                                remainingDeployment === 0 ? 'text-green-600' :
                                                remainingDeployment < 0 ? 'text-red-500' :
                                                'text-blue-500'
                                            }`}>
                                                {remainingDeployment === 0 ? 'Perfectly Deployed!' : remainingDeployment < 0 ? '⚠️ Exceeds Total' : 'Remaining to Assign'}
                                            </span>
                                            <span className="text-xs text-gray-500">Out of {totalFunding} Master Total</span>
                                        </div>
                                        <span className={`text-3xl font-black ${
                                            remainingDeployment === 0 ? 'text-green-700' :
                                            remainingDeployment < 0 ? 'text-red-600' :
                                            'text-blue-600'
                                        }`}>{Math.abs(remainingDeployment)}</span>
                                    </div>

                                    <YesNoToggle
                                        value={hasSpecialRoles}
                                        label="Do you have any teachers in Special Roles (SNED or Non-Advisory)?"
                                        onYes={() => setHasSpecialRoles(true)}
                                        onNo={() => {
                                            setHasSpecialRoles(false);
                                            setFormData(p => ({ ...p, deploy_sned: "", non_advisory: "" }));
                                        }}
                                    />

                                    <AnimatePresence>
                                        {hasSpecialRoles && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                                className="space-y-5 mt-5 overflow-hidden">
                                                <NumField name="deploy_sned" label="SNED Teachers" icon="♿" />
                                                <NumField name="non_advisory" label="Teachers with Non-Advisory" icon="📋" />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* ── STEP 3: Multi-Grade (Elementary Only) ─────────────── */}
                    {currentStep === 3 && hasElementary && (
                        <motion.div key="s3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Multi-Grade Teachers</h2>
                            <p className="mt-2 text-sm text-gray-400">How many teachers handle combined grade groups?</p>

                            <div className="space-y-5 mt-6">
                                <NumField name="mg_1_2" label="Grades 1 & 2" icon="1️⃣" />
                                <NumField name="mg_3_4" label="Grades 3 & 4" icon="3️⃣" />
                                <NumField name="mg_5_6" label="Grades 5 & 6" icon="5️⃣" />

                                <div className="pt-3 border-t-2 border-dashed border-gray-100">
                                    <p className="text-sm font-bold text-gray-600 mb-3">Teachers handling 3 or more grades?</p>
                                    <div className="flex gap-3">
                                        <button type="button"
                                            onClick={() => setFormData(p => ({ ...p, mg_has_3_plus: true }))}
                                            className={`${toggleBtnBase} ${formData.mg_has_3_plus ? toggleBtnActive : toggleBtnInactive}`}>
                                            Yes
                                        </button>
                                        <button type="button"
                                            onClick={() => setFormData(p => ({ ...p, mg_has_3_plus: false, mg_3_plus_count: "" }))}
                                            className={`${toggleBtnBase} ${formData.mg_has_3_plus === false ? toggleBtnActive : toggleBtnInactive}`}>
                                            No
                                        </button>
                                    </div>

                                    <AnimatePresence>
                                        {formData.mg_has_3_plus && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
                                                <div className="mt-4">
                                                    <NumField name="mg_3_plus_count" label="How many?" icon="📊" />
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 4: Departmentalized by Subject (with Gatekeeper) ── */}
                    {currentStep === 4 && (
                        <motion.div key="s4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Departmentalized Teachers</h2>
                            <p className="mt-2 text-sm text-gray-400">Distribute your {totalFunding} teachers across subjects.</p>

                            <YesNoToggle
                                value={hasDepartmentalized}
                                label="Does your school utilize Departmentalized Teaching (teachers assigned to specific subjects)?"
                                onYes={() => setHasDepartmentalized(true)}
                                onNo={() => {
                                    setHasDepartmentalized(false);
                                    setFormData(p => ({
                                        ...p,
                                        dept_english: "", dept_filipino: "", dept_science: "", dept_math: "",
                                        dept_ap: "", dept_mapeh: "", dept_tle: "", dept_values: "",
                                        dept_gened: "", dept_ece: "", dept_others: "",
                                    }));
                                }}
                            />

                            <AnimatePresence>
                                {hasDepartmentalized && (
                                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                        className="overflow-hidden">

                                        <div className="sticky top-4 bg-white border-2 shadow-md rounded-2xl p-4 mt-6 z-10 flex justify-between items-center mb-6 transition-colors border-indigo-200">
                                            <span className="font-bold text-gray-500">Total Counted</span>
                                            <span className={`text-3xl font-black ${
                                                totalDepartmentalized === totalFunding ? 'text-green-600' : 
                                                totalDepartmentalized > totalFunding ? 'text-red-600' : 'text-indigo-600'
                                            }`}>
                                                {totalDepartmentalized}
                                                <span className="text-lg text-gray-400 font-medium"> / {totalFunding}</span>
                                            </span>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4 mt-2">
                                            {[
                                                { key: "dept_english", label: "English" },
                                                { key: "dept_filipino", label: "Filipino" },
                                                { key: "dept_science", label: "Science" },
                                                { key: "dept_math", label: "Math" },
                                                { key: "dept_ap", label: "Araling Panlipunan" },
                                                { key: "dept_mapeh", label: "MAPEH" },
                                                { key: "dept_tle", label: "TLE" },
                                                { key: "dept_values", label: "Values Ed" },
                                                { key: "dept_gened", label: "Gen Ed" },
                                                { key: "dept_ece", label: "ECE" },
                                                { key: "dept_others", label: "Others" },
                                            ].map(s => (
                                                <div key={s.key}>
                                                    <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">{s.label}</label>
                                                    <input type="number" name={s.key} min="0" placeholder="0"
                                                        value={formData[s.key]} onChange={handleChange}
                                                        className={chunkyInput} />
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {/* ── STEP 5: Teaching Experience ────────────────────────── */}
                    {currentStep === 5 && (
                        <motion.div key="s5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Teaching Experience</h2>
                            <p className="mt-2 text-sm text-gray-400">Distribute your {totalFunding} teachers by years of experience.</p>

                            <div className="sticky top-4 bg-white border-2 border-purple-200 shadow-md rounded-2xl p-4 mt-6 z-10 flex justify-between items-center mb-6">
                                <span className="font-bold text-gray-500">Total Counted</span>
                                <span className={`text-3xl font-black ${totalExperience === totalFunding ? 'text-green-600' : 'text-purple-600'}`}>{totalExperience}<span className="text-lg text-gray-400 font-medium"> / {totalFunding}</span></span>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                {[
                                    { key: "exp_0_1", label: "0–1 Years" },
                                    { key: "exp_2_5", label: "2–5 Years" },
                                    { key: "exp_6_10", label: "6–10 Years" },
                                    { key: "exp_11_15", label: "11–15 Years" },
                                    { key: "exp_16_20", label: "16–20 Years" },
                                    { key: "exp_21_25", label: "21–25 Years" },
                                    { key: "exp_26_30", label: "26–30 Years" },
                                    { key: "exp_31_35", label: "31–35 Years" },
                                    { key: "exp_36_40", label: "36–40 Years" },
                                ].map(b => (
                                    <div key={b.key}>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">{b.label}</label>
                                        <input type="number" name={b.key} min="0" placeholder="0"
                                            value={formData[b.key]} onChange={handleChange}
                                            className={chunkyInput} />
                                    </div>
                                ))}
                            </div>

                            {/* ── Magic Math: Auto-calculated 10th bracket ── */}
                            <div className={`col-span-2 mt-6 p-5 rounded-2xl border-2 transition-colors ${
                                magicMathRemainder >= 0
                                    ? 'bg-purple-50 border-purple-200'
                                    : 'bg-red-50 border-red-200'
                            }`}>
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-lg">✨</span>
                                    <label className={`text-xs font-bold uppercase tracking-wider ${
                                        magicMathRemainder >= 0 ? 'text-purple-600' : 'text-red-600'
                                    }`}>
                                        40–45 Years (Auto-Calculated)
                                    </label>
                                </div>
                                <div className={`text-4xl font-black ${
                                    magicMathRemainder >= 0 ? 'text-purple-700' : 'text-red-600'
                                }`}>
                                    {magicMathRemainder >= 0 ? magicMathRemainder : '⚠️ Exceeds Total'}
                                </div>
                                <p className={`text-xs mt-2 ${
                                    magicMathRemainder >= 0 ? 'text-purple-400' : 'text-red-400'
                                }`}>
                                    {magicMathRemainder >= 0
                                        ? `Calculated: ${totalFunding} total − ${sumOfFirstNineBrackets} entered = ${magicMathRemainder}`
                                        : `You've entered ${sumOfFirstNineBrackets} across 9 brackets, but only ${totalFunding} total teachers exist.`
                                    }
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 6: Review & Submit ────────────────────────────── */}
                    {currentStep === 6 && (
                        <motion.div key="s6" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Final Review</h2>
                            <p className="mt-2 text-sm text-gray-400">Confirm your teaching personnel data.</p>

                            <div className="mt-6 bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden">
                                {/* Funding */}
                                <div className="bg-gray-50 border-b border-gray-200 p-4 text-center">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Grand Total (Funding)</p>
                                    <p className="text-4xl font-black text-gray-800 mt-1">{totalFunding}</p>
                                </div>
                                <div className="px-5 py-4 space-y-3">
                                    {[
                                        { label: "DepEd", value: formData.fund_deped, color: "blue" },
                                        { label: "LGU", value: formData.fund_lgu, color: "teal" },
                                        { label: "Others", value: formData.fund_others, color: "orange" },
                                    ].filter(i => pInt(i.value) > 0).map(i => (
                                        <div key={i.label} className={`flex justify-between bg-${i.color}-50 border border-${i.color}-100 rounded-xl px-4 py-2`}>
                                            <span className={`text-sm font-semibold text-${i.color}-700`}>{i.label}</span>
                                            <span className={`font-black text-${i.color}-600`}>{pInt(i.value)}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Deployment */}
                                <div className="border-t border-gray-100 px-5 py-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Grade Deployment</p>
                                    <div className="flex justify-between bg-indigo-50 border border-indigo-100 rounded-xl px-4 py-2">
                                        <span className="text-sm font-semibold text-indigo-700">Total Deployed</span>
                                        <span className="font-black text-indigo-600">{totalDeployment}</span>
                                    </div>
                                </div>
                                {/* Experience */}
                                <div className="border-t border-gray-100 px-5 py-4">
                                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Experience Brackets</p>
                                    <div className="flex justify-between bg-purple-50 border border-purple-100 rounded-xl px-4 py-2">
                                        <span className="text-sm font-semibold text-purple-700">Total Counted</span>
                                        <span className="font-black text-purple-600">{totalExperience}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Verification Checkbox */}
                            <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3 cursor-pointer"
                                onClick={() => setFormData(p => ({ ...p, verified: !p.verified }))}>
                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${formData.verified ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-300'}`}>
                                    {formData.verified && <FiCheck className="text-white w-4 h-4" />}
                                </div>
                                <p className="text-sm text-blue-800 font-medium select-none">
                                    I verify this data is correct and accurately reflects our teaching personnel.
                                </p>
                            </div>
                        </motion.div>
                    )}

                </AnimatePresence>
                </div>
                )}
                </AnimatePresence>
            </main>

            {/* ── FOOTER ────────────────────────────────────────────────────── */}
            {!isReviewMode && (
                <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-gray-100 flex justify-center z-50">
                    <div className="w-full max-w-md flex gap-3">
                        {(currentStep > 1 || (currentStep === 2 && gradeIndex > 0)) && (
                            <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                onClick={handleBack}
                                className="px-5 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 border-b-[4px] border-gray-200 active:border-b-0 active:translate-y-[4px] transition-all">
                                Back
                            </motion.button>
                        )}
                        {currentStep === TOTAL_STEPS ? (
                            <button onClick={handleNext}
                                disabled={loading || !formData.verified}
                                className="flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center bg-green-500 border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg">
                                {loading ? "Saving..." : "Submit Data"}
                            </button>
                        ) : (
                            <button onClick={handleNext}
                                disabled={!isStepValid()}
                                className="flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center bg-blue-500 border-b-[6px] border-blue-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg">
                                Continue
                            </button>
                        )}
                    </div>
                </div>
            )}

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="Teaching Personnel data saved! Great work."
                redirectUrl="/modular-dashboard"
            />
        </div>
    );
};

export default Unit6TeachingPersonnel;
