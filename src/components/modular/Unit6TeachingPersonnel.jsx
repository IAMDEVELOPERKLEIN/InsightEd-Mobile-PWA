import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2, FiUnlock, FiUsers, FiBriefcase, FiTrendingUp, FiChevronRight, FiChevronLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

const TOTAL_STEPS = 6;

// ── Shared styles ─────────────────────────────────────────────────────────────
const chunkyInput = "w-full p-4 bg-gray-50 border-2 border-slate-200 rounded-2xl text-xl font-black text-slate-700 text-center focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-all shadow-sm";
const toggleBtnBase = "flex-1 py-4 px-4 rounded-2xl font-black border-2 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-widest";
const toggleBtnActive = "bg-blue-100 border-blue-500 text-blue-700 shadow-md";
const toggleBtnInactive = "bg-white border-gray-100 text-gray-400 hover:bg-gray-50";

const slideVariants = {
    enter: (direction) => ({
        x: direction > 0 ? 50 : -50,
        opacity: 0,
        scale: 0.98
    }),
    center: {
        zIndex: 1,
        x: 0,
        opacity: 1,
        scale: 1
    },
    exit: (direction) => ({
        zIndex: 0,
        x: direction < 0 ? 50 : -50,
        opacity: 0,
        scale: 0.98
    })
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

// ── Shared sub-components (defined outside to prevent focus loss) ─────────────
const NumField = ({ name, label, icon, value, onChange, placeholder = "0" }) => (
    <div className="flex flex-col">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 ml-1 flex items-center gap-1">
            {icon && <span>{icon}</span>} {label}
        </label>
        <input
            type="number" name={name} min="0" placeholder={placeholder}
            value={value} onChange={onChange}
            className={chunkyInput}
        />
    </div>
);

const YesNoToggle = ({ value, onYes, onNo, label }) => (
    <div className="mt-8">
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 text-center">{label}</p>
        <div className="flex gap-4">
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

// ── Component ─────────────────────────────────────────────────────────────────
const Unit6TeachingPersonnel = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [direction, setDirection] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [curricularOffering, setCurricularOffering] = useState("");

    const [gradeIndex, setGradeIndex] = useState(0);
    const [hasOtherFunding, setHasOtherFunding] = useState(false);
    const [hasSpecialRoles, setHasSpecialRoles] = useState(false);
    const [hasDepartmentalized, setHasDepartmentalized] = useState(false);

    const [formData, setFormData] = useState({
        fund_deped: "", fund_lgu: "", fund_others: "",
        deploy_k: "", deploy_g1: "", deploy_g2: "", deploy_g3: "", deploy_g4: "", deploy_g5: "", deploy_g6: "",
        deploy_g7: "", deploy_g8: "", deploy_g9: "", deploy_g10: "", deploy_g11: "", deploy_g12: "",
        deploy_sned: "", non_advisory: "",
        deploy_kinder: "", deploy_elem: "", deploy_jhs: "", deploy_shs: "",
        mg_1_2: "", mg_3_4: "", mg_5_6: "",
        mg_has_3_plus: false, mg_3_plus_count: "",
        dept_english: "", dept_filipino: "", dept_science: "", dept_math: "",
        dept_ap: "", dept_mapeh: "", dept_tle: "", dept_values: "",
        dept_gened: "", dept_ece: "", dept_others: "",
        exp_0_1: "", exp_2_5: "", exp_6_10: "", exp_11_15: "", exp_16_20: "",
        exp_21_25: "", exp_26_30: "", exp_31_35: "", exp_36_40: "", exp_40_45: "",
        verified: false
    });

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
                            let tp = {};
                            try {
                                const tpRes = await fetch(`/api/ph_schools/unit7/${storedId}`);
                                if (tpRes.ok) {
                                    const tpData = await tpRes.json();
                                    if (tpData.exists && tpData.data) tp = tpData.data;
                                }
                            } catch (e) { console.warn("Could not fetch unit7 row", e); }

                            setFormData(prev => ({
                                ...prev,
                                fund_deped: tp.fund_deped ?? d.fund_deped ?? "", 
                                fund_lgu: tp.fund_lgu ?? d.fund_lgu ?? "", 
                                fund_others: tp.fund_others ?? d.fund_others ?? "",
                                deploy_k: tp.deploy_k ?? "", deploy_g1: tp.deploy_g1 ?? "", deploy_g2: tp.deploy_g2 ?? "",
                                deploy_g3: tp.deploy_g3 ?? "", deploy_g4: tp.deploy_g4 ?? "", deploy_g5: tp.deploy_g5 ?? "",
                                deploy_g6: tp.deploy_g6 ?? "", deploy_g7: tp.deploy_g7 ?? "", deploy_g8: tp.deploy_g8 ?? "",
                                deploy_g9: tp.deploy_g9 ?? "", deploy_g10: tp.deploy_g10 ?? "", deploy_g11: tp.deploy_g11 ?? "",
                                deploy_g12: tp.deploy_g12 ?? "",
                                deploy_sned: tp.deploy_sned ?? d.deploy_sned ?? "", 
                                non_advisory: tp.non_advisory ?? d.non_advisory ?? "",
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
                            if (pInt(tp.fund_lgu ?? d.fund_lgu) > 0 || pInt(tp.fund_others ?? d.fund_others) > 0) setHasOtherFunding(true);
                            if (pInt(tp.deploy_sned ?? d.deploy_sned) > 0 || pInt(tp.non_advisory ?? d.non_advisory) > 0) setHasSpecialRoles(true);
                            const deptKeys = ['dept_english','dept_filipino','dept_science','dept_math','dept_ap','dept_mapeh','dept_tle','dept_values','dept_gened','dept_ece','dept_others'];
                            if (deptKeys.some(k => pInt(d[k]) > 0)) setHasDepartmentalized(true);
                            setIsReviewMode(true);
                        }
                    }
                }
            } catch (e) {
                console.warn("Init fetch failed", e);
            }
        };
        init();
    }, []);

    const hasElementary = useMemo(() => {
        const co = (curricularOffering || "").toLowerCase();
        return co.includes("elementary") || co.includes("k to 12") || co === "" || co.includes("all offering");
    }, [curricularOffering]);

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
        return grades.length === 0 ? [...ALL_GRADES] : grades;
    }, [curricularOffering]);

    const handleBack = () => {
        setDirection(-1);
        if (currentStep === 2) {
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
        if (prevStep === 2) setGradeIndex(visibleGrades.length);

        if (prevStep >= 1) setCurrentStep(prevStep);
        else navigate("/modular-dashboard");
    };

    const handleNext = () => {
        setDirection(1);
        if (currentStep === 2) {
            if (gradeIndex < visibleGrades.length) {
                setGradeIndex(gradeIndex + 1);
                return;
            }
        }
        let nextStep = currentStep + 1;
        if (nextStep === 3 && !hasElementary) nextStep = 4;
        if (nextStep === 2) setGradeIndex(0);
        if (nextStep <= TOTAL_STEPS) setCurrentStep(nextStep);
        else handleSubmit();
    };

    const handleChange = (e) => {
        let { name, value } = e.target;
        if (value.length > 3) value = value.slice(0, 3);
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

    useEffect(() => {
        const autoVal = Math.max(0, magicMathRemainder);
        if (pInt(formData.exp_40_45) !== autoVal) {
            setFormData(prev => ({ ...prev, exp_40_45: autoVal.toString() }));
        }
    }, [magicMathRemainder]);

    const isStepValid = () => {
        if (currentStep === 1) return totalFunding > 0;
        if (currentStep === 2) {
            if (gradeIndex < visibleGrades.length) return true;
            return totalDeployment === totalFunding;
        }
        if (currentStep === 3) return true;
        if (currentStep === 4) {
             if (!hasDepartmentalized) return true;
             return totalDepartmentalized === totalFunding;
        }
        if (currentStep === 5) return magicMathRemainder >= 0;
        if (currentStep === 6) return true;
        return false;
    };

    const progressPercent = useMemo(() => {
        let displayS = (!hasElementary && currentStep > 3) ? currentStep - 1 : currentStep;
        let totalS = hasElementary ? 6 : 5;
        return (displayS / totalS) * 100;
    }, [currentStep, hasElementary]);

    const handleSubmit = async () => {
        if (!schoolId) return alert("No school ID found.");
        try {
            setLoading(true);
            const res = await fetch(`/api/ph_schools/unit7/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error("Failed override save");

            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(7)) {
                progress.completedUnits.push(7);
                progress.xp += 350;
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate("/modular-dashboard");
            }, 2500);
        } catch (err) {
            console.error(err);
            alert("Failed to save data.");
        } finally {
            setLoading(false);
        }
    };

    const Unit7Summary = () => (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pb-32">
            <div className="px-6 py-6 border-b border-white/50 mb-8 mt-2">
                <div className="text-center">
                    <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center shadow-2xl shadow-blue-200">
                        <FiUsers className="w-10 h-10 text-white" />
                    </div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-blue-200">
                        Unit 7 • Teaching Personnel
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 leading-tight">Staffing Result</h1>
                    <p className="text-slate-500 font-medium mt-2">Verified records for SY 2024-2025</p>
                </div>
            </div>

            <div className="px-6 space-y-8">
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 shadow-inner">
                            <FiUsers className="w-6 h-6 text-blue-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Master Count</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{totalFunding}</span>
                    </div>
                    <div className="bg-white rounded-[2rem] p-6 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 shadow-inner">
                            <FiCheckCircle className="w-6 h-6 text-emerald-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Matched</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{totalDeployment}</span>
                    </div>
                </div>

                <div className="bg-slate-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden">
                    <div className="relative z-10">
                        <p className="text-slate-400 text-xs font-black uppercase tracking-widest mb-1">Funding Profile</p>
                        <h3 className="text-2xl font-black mb-4 flex items-center gap-2">
                             🏛️ DepEd Nationally Funded
                        </h3>
                        <div className="text-6xl font-black">{formData.fund_deped || 0}</div>
                        {(pInt(formData.fund_lgu) > 0 || pInt(formData.fund_others) > 0) && (
                            <div className="mt-8 pt-6 border-t border-white/10 grid grid-cols-2 gap-4">
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">LGU</span>
                                    <p className="text-xl font-black">{formData.fund_lgu || 0}</p>
                                </div>
                                <div>
                                    <span className="text-[10px] font-black uppercase text-slate-400">Others</span>
                                    <p className="text-xl font-black">{formData.fund_others || 0}</p>
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="absolute bottom-0 right-0 p-8 opacity-10">
                         <FiBriefcase className="w-40 h-40" />
                    </div>
                </div>

                <section>
                    <div className="flex items-center gap-2 mb-4 ml-2">
                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Deployment Breakdown</h3>
                    </div>
                    <div className="bg-white rounded-3xl border border-slate-100 divide-y divide-slate-50 overflow-hidden shadow-sm">
                        {visibleGrades.map(g => (
                             pInt(formData[g.key]) > 0 && (
                                <div key={g.key} className="p-4 flex justify-between items-center group">
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{g.emoji}</span>
                                        <span className="font-bold text-slate-700">{g.label}</span>
                                    </div>
                                    <div className="bg-slate-50 px-3 py-1.5 rounded-xl font-black text-slate-800 min-w-[3rem] text-center group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                        {formData[g.key]}
                                    </div>
                                </div>
                             )
                        ))}
                        {(pInt(formData.deploy_sned) > 0 || pInt(formData.non_advisory) > 0) && (
                            <div className="p-4 bg-gray-50/50">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-3">Special Roles</span>
                                <div className="space-y-2">
                                    {pInt(formData.deploy_sned) > 0 && (
                                        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                                            <span className="text-sm font-bold text-slate-600 italic">SNED Teachers</span>
                                            <span className="font-black text-blue-600">{formData.deploy_sned}</span>
                                        </div>
                                    )}
                                    {pInt(formData.non_advisory) > 0 && (
                                        <div className="flex justify-between items-center bg-white p-3 rounded-2xl border border-slate-100">
                                            <span className="text-sm font-bold text-slate-600 italic">Non-Advisory Load</span>
                                            <span className="font-black text-blue-600">{formData.non_advisory}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </section>

                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="pt-4">
                    <button onClick={() => setIsReviewMode(false)}
                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-blue-100 text-blue-700 font-black text-lg shadow-xl shadow-blue-100/50 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3">
                        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiUnlock className="w-5 h-5" />
                        </div>
                        <span>Unlock to Update Roster</span>
                    </button>
                    <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 opacity-50">
                        School ID: {schoolId}
                    </p>
                </motion.div>
            </div>
        </motion.div>
    );

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
            <AnimatePresence>
                {showSuccess && <SuccessModal title="Roster Saved!" message="Personnel data updated successfully." />}
            </AnimatePresence>

            <header className="bg-white border-b border-gray-100 sticky top-0 z-50 px-4 py-3 shadow-sm">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <button onClick={() => navigate("/modular-dashboard")} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100">
                        <FiX className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-[0.2em]">Unit 7</p>
                        <h1 className="text-xs font-black text-gray-800">Teaching Personnel</h1>
                    </div>
                    <div className="w-10 text-right">
                        <span className="text-xs font-bold text-slate-400">
                             {isReviewMode ? 'Verified' : `${Math.round(progressPercent)}%`}
                        </span>
                    </div>
                </div>
                {!isReviewMode && (
                    <div className="w-full h-1 bg-slate-100 mt-3 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-blue-500" initial={{ width: 0 }} animate={{ width: `${progressPercent}%` }} />
                    </div>
                )}
            </header>

            <main className="flex-1 w-full max-w-md mx-auto overflow-y-auto">
                <AnimatePresence mode="wait">
                    {isReviewMode ? (
                        <Unit7Summary key="summary" />
                    ) : (
                        <div className="p-6">
                            <AnimatePresence mode="wait" custom={direction}>
                                {currentStep === 1 && (
                                    <motion.div key="s1" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <div className="text-center mb-10">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Phase 1 • Funding</span>
                                            <h2 className="text-4xl font-black text-slate-800 mb-2">Primary Funding</h2>
                                            <p className="text-slate-500 font-medium font-lg leading-relaxed">How many teachers are funded by DepEd National?</p>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-4 border-slate-100 flex flex-col items-center">
                                            <div className="w-20 h-20 bg-blue-50 rounded-3xl flex items-center justify-center mb-6 shadow-inner">
                                                <span className="text-4xl">🏛️</span>
                                            </div>
                                            <input type="number" name="fund_deped" min="0" placeholder="0"
                                                value={formData.fund_deped === "0" ? "" : formData.fund_deped}
                                                onChange={handleChange}
                                                className="w-full text-7xl font-black text-center bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-100"
                                                autoFocus
                                            />
                                        </div>

                                        <YesNoToggle value={hasOtherFunding} label="Supplemental funding from other sources?"
                                            onYes={() => setHasOtherFunding(true)}
                                            onNo={() => { setHasOtherFunding(false); setFormData(p => ({ ...p, fund_lgu: "", fund_others: "" })); }} />
                                        
                                        <AnimatePresence>
                                            {hasOtherFunding && (
                                                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                                                    className="mt-6 grid grid-cols-2 gap-4">
                                                    <NumField name="fund_lgu" label="LGU-Funded" icon="🏢" value={formData.fund_lgu} onChange={handleChange} />
                                                    <NumField name="fund_others" label="Others" icon="📦" value={formData.fund_others} onChange={handleChange} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {currentStep === 2 && (
                                    <motion.div key={`s2-${gradeIndex}`} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <div className="text-center mb-8">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Phase 2 • Deployment</span>
                                            <h2 className="text-3xl font-black text-slate-800 mb-1">
                                                {gradeIndex < visibleGrades.length ? visibleGrades[gradeIndex].label : "Almost Done"}
                                            </h2>
                                            <p className="text-slate-500 font-medium">Assignment: step {gradeIndex + 1} of {visibleGrades.length + 1}</p>
                                        </div>

                                        <div className="bg-white rounded-[2.5rem] p-10 shadow-xl border-4 border-slate-100 flex flex-col items-center relative overflow-hidden">
                                            {gradeIndex < visibleGrades.length ? (
                                                <>
                                                    <div className="text-7xl mb-6">{visibleGrades[gradeIndex].emoji}</div>
                                                    <input type="number" name={visibleGrades[gradeIndex].key} min="0" placeholder="0"
                                                        value={formData[visibleGrades[gradeIndex].key]}
                                                        onChange={(e) => {
                                                            let val = e.target.value;
                                                            if (val.length > 3) val = val.slice(0, 3);
                                                            setFormData(prev => ({ ...prev, [visibleGrades[gradeIndex].key]: val }));
                                                        }}
                                                        className="w-full text-7xl font-black text-center bg-transparent border-none outline-none text-slate-800 placeholder:text-slate-100"
                                                        autoFocus
                                                    />
                                                </>
                                            ) : (
                                                <div className="w-full text-center space-y-8">
                                                    <FiCheckCircle className="w-20 h-20 text-emerald-500 mx-auto" strokeWidth={3} />
                                                    <p className="font-bold text-slate-600">All grades processed. Any special roles?</p>
                                                    <YesNoToggle value={hasSpecialRoles} label="Teachers in SNED or Non-Advisory?"
                                                        onYes={() => setHasSpecialRoles(true)}
                                                        onNo={() => { setHasSpecialRoles(false); setFormData(p => ({ ...p, deploy_sned: "", non_advisory: "" })); }} />
                                                    <AnimatePresence>
                                                        {hasSpecialRoles && (
                                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-4 mt-6">
                                                                <NumField name="deploy_sned" label="SNED" icon="♿" value={formData.deploy_sned} onChange={handleChange} />
                                                                <NumField name="non_advisory" label="Others" icon="📋" value={formData.non_advisory} onChange={handleChange} />
                                                            </motion.div>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            )}
                                        </div>

                                        <div className={`mt-8 p-6 rounded-[2rem] border-2 transition-all duration-500 flex justify-between items-center ${
                                            remainingDeployment === 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-emerald-100' :
                                            remainingDeployment < 0 ? 'bg-red-50 border-red-200 text-red-700 shadow-red-100 scale-[1.02]' :
                                            'bg-blue-50 border-blue-200 text-blue-700'
                                        }`}>
                                             <div>
                                                 <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Master Allocation</p>
                                                 <p className="text-sm font-black whitespace-nowrap">
                                                     {remainingDeployment === 0 ? 'All Match!' : remainingDeployment < 0 ? 'Exceeds Budget' : 'Remaining To Deploy'}
                                                 </p>
                                             </div>
                                             <div className="text-4xl font-black">{Math.abs(remainingDeployment)}</div>
                                        </div>
                                    </motion.div>
                                )}

                                {currentStep === 3 && hasElementary && (
                                    <motion.div key="s3" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <div className="text-center mb-10">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Phase 3 • Combinations</span>
                                            <h2 className="text-3xl font-black text-slate-800 mb-2">Multi-Grade</h2>
                                            <p className="text-slate-500 font-medium">How many teachers handle joined grade sessions?</p>
                                        </div>
                                        <div className="grid grid-cols-3 gap-3">
                                            <NumField name="mg_1_2" label="1 & 2" icon="1️⃣" value={formData.mg_1_2} onChange={handleChange} />
                                            <NumField name="mg_3_4" label="3 & 4" icon="3️⃣" value={formData.mg_3_4} onChange={handleChange} />
                                            <NumField name="mg_5_6" label="5 & 6" icon="5️⃣" value={formData.mg_5_6} onChange={handleChange} />
                                        </div>
                                        <YesNoToggle value={formData.mg_has_3_plus} label="Handling 3 or more grades?"
                                            onYes={() => setFormData(p => ({ ...p, mg_has_3_plus: true }))}
                                            onNo={() => setFormData(p => ({ ...p, mg_has_3_plus: false, mg_3_plus_count: "" }))} />
                                        <AnimatePresence>
                                            {formData.mg_has_3_plus && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-6 overflow-hidden">
                                                    <NumField name="mg_3_plus_count" label="Count (3+ Grades)" icon="📊" value={formData.mg_3_plus_count} onChange={handleChange} />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {currentStep === 4 && (
                                    <motion.div key="s4" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <div className="text-center mb-8">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Phase 4 • Specialized</span>
                                            <h2 className="text-3xl font-black text-slate-800 mb-2">Departmentalized</h2>
                                            <p className="text-slate-500 font-medium leading-relaxed">Distribution of your {totalFunding} staff across subjects.</p>
                                        </div>

                                        <YesNoToggle value={hasDepartmentalized} label="Does school use Departmentalized Teaching?"
                                            onYes={() => setHasDepartmentalized(true)}
                                            onNo={() => { setHasDepartmentalized(false); setFormData(p => ({ ...p, dept_english: "", dept_filipino: "", dept_science: "", dept_math: "", dept_ap: "", dept_mapeh: "", dept_tle: "", dept_values: "", dept_gened: "", dept_ece: "", dept_others: "" })); }} />
                                        
                                        <AnimatePresence>
                                            {hasDepartmentalized && (
                                                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6 mt-8">
                                                    <div className={`mt-4 p-5 rounded-[2rem] border-2 transition-all flex justify-between items-center ${totalDepartmentalized === totalFunding ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                                        <span className="text-xs font-black uppercase tracking-widest opacity-60">Subject Total</span>
                                                        <span className="text-3xl font-black whitespace-nowrap">{totalDepartmentalized} / {totalFunding}</span>
                                                    </div>
                                                    <div className="grid grid-cols-2 gap-4">
                                                        {[
                                                            { key: "dept_english", label: "English" }, { key: "dept_filipino", label: "Filipino" },
                                                            { key: "dept_science", label: "Science" }, { key: "dept_math", label: "Math" },
                                                            { key: "dept_ap", label: "Aral Pan" }, { key: "dept_mapeh", label: "MAPEH" },
                                                            { key: "dept_tle", label: "TLE" }, { key: "dept_values", label: "Val Ed" },
                                                            { key: "dept_gened", label: "Gen Ed" }, { key: "dept_others", label: "Others" },
                                                        ].map(s => <NumField key={s.key} name={s.key} label={s.label} value={formData[s.key]} onChange={handleChange} />)}
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {currentStep === 5 && (
                                    <motion.div key="s5" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <div className="text-center mb-8">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4">Phase 5 • Tenure</span>
                                            <h2 className="text-3xl font-black text-slate-800 mb-2">Experience Brackets</h2>
                                            <p className="text-slate-500 font-medium">Distribute the {totalFunding} staff by years of service.</p>
                                        </div>
                                        <div className={`mb-8 p-5 rounded-[2rem] border-2 transition-all flex justify-between items-center ${totalExperience === totalFunding ? 'bg-emerald-50 border-emerald-200 text-emerald-700 shadow-lg' : 'bg-blue-50 border-blue-200 text-blue-700'}`}>
                                            <span className="text-xs font-black uppercase tracking-widest opacity-60">Exp Total</span>
                                            <span className="text-3xl font-black whitespace-nowrap">{totalExperience} / {totalFunding}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {[
                                                { key: "exp_0_1", label: "0–1 Yrs" }, { key: "exp_2_5", label: "2–5 Yrs" },
                                                { key: "exp_6_10", label: "6–10 Yrs" }, { key: "exp_11_15", label: "11–15 Yrs" },
                                                { key: "exp_16_20", label: "16–20 Yrs" }, { key: "exp_21_25", label: "21–25 Yrs" },
                                                { key: "exp_26_30", label: "26–30 Yrs" }, { key: "exp_36_40", label: "36–40 Yrs" },
                                            ].map(b => <NumField key={b.key} name={b.key} label={b.label} value={formData[b.key]} onChange={handleChange} />)}
                                            <div className={`p-4 rounded-2xl border-2 flex flex-col items-center justify-center transition-all ${magicMathRemainder >= 0 ? 'bg-blue-50/50 border-blue-100 text-blue-600' : 'bg-red-50 border-red-200 text-red-600'}`}>
                                                <span className="text-[10px] font-black uppercase tracking-[0.2em] mb-1">40–45 Yrs*</span>
                                                <span className="text-2xl font-black">{magicMathRemainder >= 0 ? magicMathRemainder : '⚠️'}</span>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {currentStep === 6 && (
                                    <motion.div key="s6" custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <div className="text-center mb-10">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm">Review Phase</span>
                                            <h2 className="text-3xl font-black text-slate-800 mb-2">Final Verification</h2>
                                            <p className="text-slate-500 font-medium">Verify the compiled roster for {totalFunding} teachers.</p>
                                        </div>
                                        <div className="bg-white rounded-[2.5rem] p-4 shadow-xl border border-slate-100 mb-8 overflow-hidden">
                                             <div className="bg-slate-50 p-6 text-center border-b border-white">
                                                <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Master Count</p>
                                                <div className="text-5xl font-black text-slate-800 mt-1">{totalFunding}</div>
                                             </div>
                                             <div className="p-6 space-y-4">
                                                 <div className="flex justify-between items-center">
                                                     <span className="font-bold text-slate-500">Matched Registry</span>
                                                     <span className={`font-black text-lg ${totalDeployment === totalFunding ? 'text-emerald-500' : 'text-slate-800'}`}>{totalDeployment}</span>
                                                 </div>
                                                 <div className="flex justify-between items-center">
                                                     <span className="font-bold text-slate-500">Exp. Matched</span>
                                                     <span className={`font-black text-lg ${totalExperience === totalFunding ? 'text-emerald-500' : 'text-slate-800'}`}>{totalExperience}</span>
                                                 </div>
                                             </div>
                                        </div>
                                        <div className={`p-6 rounded-[2rem] border-2 cursor-pointer transition-all flex gap-4 items-start ${formData.verified ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-slate-200'}`} onClick={() => setFormData(p => ({ ...p, verified: !p.verified }))}>
                                            <div className={`mt-1 w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${formData.verified ? 'bg-blue-600 border-blue-600 shadow-md' : 'bg-white border-slate-300'}`}>
                                                {formData.verified && <FiCheck className="text-white w-4 h-4" strokeWidth={4} />}
                                            </div>
                                            <p className="text-sm font-bold text-slate-700 select-none">I attest that the teaching personnel figures provided are accurate and reflects current deployment.</p>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    )}
                </AnimatePresence>
            </main>

            {!isReviewMode && (
                <footer className="fixed bottom-0 left-0 w-full bg-white/95 backdrop-blur-md border-t border-slate-100 flex justify-center z-50 px-6 py-6 pb-safe shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
                    <div className="w-full max-w-md flex gap-4">
                        {(currentStep > 1 || gradeIndex > 0) && (
                            <button onClick={handleBack} className="h-16 w-16 bg-slate-100 rounded-[1.25rem] font-bold text-slate-500 border-b-[5px] border-slate-200 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center">
                                <FiChevronLeft className="w-6 h-6" />
                            </button>
                        )}
                        <button onClick={handleNext} disabled={loading || !isStepValid() || (currentStep === 6 && !formData.verified)}
                            className={`flex-1 h-16 rounded-[1.25rem] text-white font-black text-lg transition-all shadow-lg flex items-center justify-center gap-2 ${
                                currentStep === 6 ? "bg-emerald-500 border-b-[6px] border-emerald-700" : "bg-blue-600 border-b-[6px] border-blue-800"
                            } active:border-b-0 active:translate-y-[6px] disabled:opacity-30 disabled:grayscale disabled:translate-y-0`}>
                            {currentStep === 6 ? (loading ? "Verifying..." : "Verified & Save") : "Continue Task"} 
                            <FiChevronRight className="ml-1 w-5 h-5" />
                        </button>
                    </div>
                </footer>
            )}
        </div>
    );
};

export default Unit6TeachingPersonnel;
