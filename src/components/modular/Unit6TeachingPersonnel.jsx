import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2 } from "react-icons/fi";
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

// ── Component ─────────────────────────────────────────────────────────────────
const Unit6TeachingPersonnel = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [curricularOffering, setCurricularOffering] = useState("");

    // ── Form State ────────────────────────────────────────────────────────────
    const [formData, setFormData] = useState({
        // Step 1: Funding
        fund_deped: "", fund_lgu: "", fund_others: "",
        // Step 2: Deployment & Roles
        deploy_kinder: "", deploy_elem: "", deploy_jhs: "", deploy_shs: "",
        deploy_sned: "", non_advisory: "",
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
                            setFormData(prev => ({
                                ...prev,
                                fund_deped: d.fund_deped ?? "", fund_lgu: d.fund_lgu ?? "", fund_others: d.fund_others ?? "",
                                deploy_kinder: d.deploy_kinder ?? "", deploy_elem: d.deploy_elem ?? "",
                                deploy_jhs: d.deploy_jhs ?? "", deploy_shs: d.deploy_shs ?? "",
                                deploy_sned: d.deploy_sned ?? "", non_advisory: d.non_advisory ?? "",
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

    const visibleDeployGrades = useMemo(() => {
        const co = (curricularOffering || "").toLowerCase();
        const grades = [];
        if (co.includes("elementary") || co.includes("k to 12") || co === "" || co.includes("all offering")) {
            grades.push({ key: "deploy_kinder", label: "Kindergarten" }, { key: "deploy_elem", label: "Elementary" });
        }
        if (co.includes("junior") || co.includes("jhs") || co.includes("k to 12") || co === "" || co.includes("all offering")) {
            grades.push({ key: "deploy_jhs", label: "Junior High School" });
        }
        if (co.includes("senior") || co.includes("shs") || co.includes("k to 12") || co === "" || co.includes("all offering")) {
            grades.push({ key: "deploy_shs", label: "Senior High School" });
        }
        if (grades.length === 0) {
            grades.push(
                { key: "deploy_kinder", label: "Kindergarten" }, { key: "deploy_elem", label: "Elementary" },
                { key: "deploy_jhs", label: "Junior High School" }, { key: "deploy_shs", label: "Senior High School" }
            );
        }
        return grades;
    }, [curricularOffering]);

    // ── Navigation ────────────────────────────────────────────────────────────
    const handleBack = () => {
        let prevStep = currentStep - 1;
        if (prevStep === 3 && !hasElementary) prevStep = 2;
        if (prevStep >= 1) setCurrentStep(prevStep);
        else navigate("/modular-dashboard");
    };

    const handleNext = () => {
        let nextStep = currentStep + 1;
        if (nextStep === 3 && !hasElementary) nextStep = 4;
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

    const totalExperience = ['exp_0_1','exp_2_5','exp_6_10','exp_11_15','exp_16_20','exp_21_25','exp_26_30','exp_31_35','exp_36_40','exp_40_45']
        .reduce((sum, k) => sum + pInt(formData[k]), 0);

    // ── Validation ────────────────────────────────────────────────────────────
    const isStepValid = () => {
        if (currentStep === 1) return totalFunding > 0;
        if (currentStep === 2) return true;
        if (currentStep === 3) return !hasElementary ? true : true; // Multi-grade is optional
        if (currentStep === 4) return true;
        if (currentStep === 5) return totalExperience > 0;
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
            </header>

            {/* ── MAIN ──────────────────────────────────────────────────────── */}
            <main className="flex-1 overflow-y-auto pb-28">
                <AnimatePresence mode="wait">

                {/* ── REVIEW MODE ───────────────────────────────────────────── */}
                {isReviewMode ? (
                    <motion.div key="review-tp" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }} transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="max-w-md w-full mx-auto mt-10 px-6"
                    >
                        <div className="text-center mb-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
                                <FiCheckCircle className="w-8 h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-gray-800">Teaching Personnel Complete!</h2>
                            <p className="text-sm text-gray-400 mt-1">Personnel data has been saved.</p>
                        </div>
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 overflow-hidden">
                            <div className="h-2 bg-emerald-400" />
                            <div className="px-6 py-5 space-y-4">
                                <div className="flex items-center justify-between bg-green-50 rounded-2xl px-4 py-3 border-2 border-green-100">
                                    <span className="font-bold text-green-700">Total Staff</span>
                                    <span className="text-3xl font-black text-green-600">{totalFunding}</span>
                                </div>
                                {/* Funding Breakdown */}
                                <div className="space-y-2">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-300">Funding Source</p>
                                    {[{ l: "DepEd", v: formData.fund_deped }, { l: "LGU", v: formData.fund_lgu }, { l: "Others", v: formData.fund_others }]
                                        .filter(i => pInt(i.v) > 0).map(i => (
                                        <div key={i.l} className="flex justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-2">
                                            <span className="text-sm font-semibold text-blue-700">{i.l}</span>
                                            <span className="font-black text-blue-600">{pInt(i.v)}</span>
                                        </div>
                                    ))}
                                </div>
                                {/* Experience Total */}
                                <div className="flex items-center justify-between bg-purple-50 rounded-xl px-4 py-2 border border-purple-100">
                                    <span className="text-sm font-semibold text-purple-700">By Experience Brackets</span>
                                    <span className="font-black text-purple-600">{totalExperience}</span>
                                </div>
                            </div>
                        </motion.div>
                        <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                            onClick={() => { setIsReviewMode(false); setCurrentStep(1); }}
                            className="mt-6 w-full py-5 rounded-2xl font-black text-lg bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3">
                            <FiEdit2 className="w-5 h-5" /> Unlock & Edit Data
                        </motion.button>
                    </motion.div>
                ) : (

                <div className="flex-1 max-w-md w-full mx-auto mt-8 px-6">
                <AnimatePresence mode="wait">

                    {/* ── STEP 1: Funding Source ─────────────────────────────── */}
                    {currentStep === 1 && (
                        <motion.div key="s1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Funding Source</h2>
                            <p className="mt-2 text-sm text-gray-400">How many teaching positions are funded under each source?</p>

                            <div className="sticky top-4 bg-white border-2 border-green-200 shadow-md rounded-2xl p-4 mt-6 z-10 flex justify-between items-center mb-6">
                                <span className="font-bold text-gray-500">Total Teachers</span>
                                <span className="text-3xl font-black text-green-600">{totalFunding}</span>
                            </div>

                            <div className="space-y-5">
                                <NumField name="fund_deped" label="DepEd Nationally-Funded" icon="🏛️" />
                                <NumField name="fund_lgu" label="LGU-Funded" icon="🏢" />
                                <NumField name="fund_others" label="Others (NGO, Private, etc.)" icon="📦" />
                            </div>
                        </motion.div>
                    )}

                    {/* ── STEP 2: Deployment & Roles ────────────────────────── */}
                    {currentStep === 2 && (
                        <motion.div key="s2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Deployment & Roles</h2>
                            <p className="mt-2 text-sm text-gray-400">How many teachers are deployed per level?</p>

                            <div className="space-y-5 mt-6">
                                {visibleDeployGrades.map(g => (
                                    <NumField key={g.key} name={g.key} label={g.label} icon="👩‍🏫" />
                                ))}
                                <div className="pt-3 border-t-2 border-dashed border-gray-100">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-300 mb-4">Special Roles</p>
                                    <div className="space-y-5">
                                        <NumField name="deploy_sned" label="SNED Teachers" icon="♿" />
                                        <NumField name="non_advisory" label="Teachers with Non-Advisory" icon="📋" />
                                    </div>
                                </div>
                            </div>
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

                    {/* ── STEP 4: Departmentalized by Subject ───────────────── */}
                    {currentStep === 4 && (
                        <motion.div key="s4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Departmentalized Teachers</h2>
                            <p className="mt-2 text-sm text-gray-400">Number of teachers per subject specialization.</p>

                            <div className="grid grid-cols-2 gap-4 mt-6">
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

                    {/* ── STEP 5: Teaching Experience ────────────────────────── */}
                    {currentStep === 5 && (
                        <motion.div key="s5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                            <h2 className="text-2xl font-bold text-gray-800">Teaching Experience</h2>
                            <p className="mt-2 text-sm text-gray-400">Distribute teachers by years of experience.</p>

                            <div className="sticky top-4 bg-white border-2 border-purple-200 shadow-md rounded-2xl p-4 mt-6 z-10 flex justify-between items-center mb-6">
                                <span className="font-bold text-gray-500">Total Counted</span>
                                <span className="text-3xl font-black text-purple-600">{totalExperience}</span>
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
                                    { key: "exp_40_45", label: "40–45 Years" },
                                ].map(b => (
                                    <div key={b.key}>
                                        <label className="text-xs font-bold uppercase tracking-wider text-gray-400 block mb-1">{b.label}</label>
                                        <input type="number" name={b.key} min="0" placeholder="0"
                                            value={formData[b.key]} onChange={handleChange}
                                            className={chunkyInput} />
                                    </div>
                                ))}
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
                        {currentStep > 1 && (
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
