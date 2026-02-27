import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2 } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

const TOTAL_STEPS = 5;

// Shared styling
const chunkyInput = "w-full p-4 mt-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm disabled:opacity-50 disabled:bg-gray-100";
const chunkySelect = "w-full p-4 mt-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm appearance-none bg-white disabled:opacity-50 disabled:bg-gray-100";
const toggleBtnBase = "flex-1 py-3 px-4 rounded-xl font-bold border-2 transition-all flex items-center justify-center gap-2";
const toggleBtnActive = "bg-blue-100 border-blue-500 text-blue-700";
const toggleBtnInactive = "bg-white border-gray-200 text-gray-400 hover:bg-gray-50";

const Unit2Learners = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        // Step 1: Base
        enroll_kinder: "",
        enroll_g1: "",
        enroll_g2: "",
        enroll_g3: "",
        enroll_g4: "",
        enroll_g5: "",
        enroll_g6: "",
        
        // Step 2: Special
        hasSned: null, // boolean or null
        sned_learners: "",
        hasNonGraded: null, // boolean or null
        non_graded_learners: "",

        // Step 3: ARAL
        hasAralMath: null,
        hasAralRead: null,
        hasAralSci: null,
        aral_math_g1: "", aral_math_g2: "", aral_math_g3: "", aral_math_g4: "", aral_math_g5: "", aral_math_g6: "",
        aral_read_g1: "", aral_read_g2: "", aral_read_g3: "", aral_read_g4: "", aral_read_g5: "", aral_read_g6: "",
        aral_sci_g1: "", aral_sci_g2: "", aral_sci_g3: "", aral_sci_g4: "", aral_sci_g5: "", aral_sci_g6: "",

        // Step 4: Gender Logic
        male_enrollment: "",
        verified_as_of: false
    });

    useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem('schoolId');
            if (!storedId) {
                console.warn("No schoolId found in localStorage");
                return;
            }
            setSchoolId(storedId);

            // Fetch saved data from ph_schools
            try {
                const res = await fetch(`/api/ph_schools/${storedId}`);
                if (res.ok) {
                    const saved = await res.json();
                    if (saved.exists && saved.data && saved.data.enroll_kinder !== null) {
                        const d = saved.data;
                        // Pre-fill all form fields from saved data
                        setFormData(prev => ({
                            ...prev,
                            enroll_kinder: d.enroll_kinder ?? "",
                            enroll_g1: d.enroll_g1 ?? "",
                            enroll_g2: d.enroll_g2 ?? "",
                            enroll_g3: d.enroll_g3 ?? "",
                            enroll_g4: d.enroll_g4 ?? "",
                            enroll_g5: d.enroll_g5 ?? "",
                            enroll_g6: d.enroll_g6 ?? "",
                            sned_learners: d.sned_learners ?? "",
                            hasSned: d.sned_learners > 0,
                            non_graded_learners: d.non_graded_learners ?? "",
                            hasNonGraded: d.non_graded_learners > 0,
                            hasAralMath: [d.aral_math_g1,d.aral_math_g2,d.aral_math_g3,d.aral_math_g4,d.aral_math_g5,d.aral_math_g6].some(v => v > 0),
                            hasAralRead: [d.aral_read_g1,d.aral_read_g2,d.aral_read_g3,d.aral_read_g4,d.aral_read_g5,d.aral_read_g6].some(v => v > 0),
                            hasAralSci: [d.aral_sci_g1,d.aral_sci_g2,d.aral_sci_g3,d.aral_sci_g4,d.aral_sci_g5,d.aral_sci_g6].some(v => v > 0),
                            aral_math_g1: d.aral_math_g1 ?? "",
                            aral_math_g2: d.aral_math_g2 ?? "",
                            aral_math_g3: d.aral_math_g3 ?? "",
                            aral_math_g4: d.aral_math_g4 ?? "",
                            aral_math_g5: d.aral_math_g5 ?? "",
                            aral_math_g6: d.aral_math_g6 ?? "",
                            aral_read_g1: d.aral_read_g1 ?? "",
                            aral_read_g2: d.aral_read_g2 ?? "",
                            aral_read_g3: d.aral_read_g3 ?? "",
                            aral_read_g4: d.aral_read_g4 ?? "",
                            aral_read_g5: d.aral_read_g5 ?? "",
                            aral_read_g6: d.aral_read_g6 ?? "",
                            aral_sci_g1: d.aral_sci_g1 ?? "",
                            aral_sci_g2: d.aral_sci_g2 ?? "",
                            aral_sci_g3: d.aral_sci_g3 ?? "",
                            aral_sci_g4: d.aral_sci_g4 ?? "",
                            aral_sci_g5: d.aral_sci_g5 ?? "",
                            aral_sci_g6: d.aral_sci_g6 ?? "",
                            male_enrollment: d.male_enrollment ?? "",
                        }));
                        setIsReviewMode(true);
                        return;
                    }
                }
            } catch (e) {
                console.warn("Could not fetch saved Unit 2 data", e);
            }
        };
        init();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    // --- MAGIC MATH LOGIC ---
    // sum base enrollment
    const totalEnrollment = useMemo(() => {
        const fields = ['enroll_kinder', 'enroll_g1', 'enroll_g2', 'enroll_g3', 'enroll_g4', 'enroll_g5', 'enroll_g6'];
        return fields.reduce((sum, field) => {
            const val = parseInt(formData[field]) || 0;
            return sum + val;
        }, 0);
    }, [
        formData.enroll_kinder, formData.enroll_g1, formData.enroll_g2, 
        formData.enroll_g3, formData.enroll_g4, formData.enroll_g5, formData.enroll_g6
    ]);

    // derive female
    const femaleEnrollment = useMemo(() => {
        const male = parseInt(formData.male_enrollment) || 0;
        return Math.max(0, totalEnrollment - male); // prevent negative visually
    }, [totalEnrollment, formData.male_enrollment]);


    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate(-1);
        }
    };

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    };

    // ---------- Validation per step ----------
    const isStep1Valid = totalEnrollment > 0;
    const isStep2Valid = formData.hasSned !== null && formData.hasNonGraded !== null;
    const isStep3Valid = formData.hasAralMath !== null && formData.hasAralRead !== null && formData.hasAralSci !== null;
    const isStep4Valid = formData.male_enrollment !== "" && parseInt(formData.male_enrollment) <= totalEnrollment;
    const isStep5Valid = formData.verified_as_of === true;

    const isCurrentStepValid = () => {
        if (currentStep === 1) return isStep1Valid;
        if (currentStep === 2) return isStep2Valid;
        if (currentStep === 3) return isStep3Valid;
        if (currentStep === 4) return isStep4Valid;
        if (currentStep === 5) return isStep5Valid;
        return false;
    };

    const handleSubmit = async () => {
        if (!schoolId) {
            alert("No school ID found. Cannot save.");
            return;
        }

        try {
            setLoading(true);

            // Prepare payload
            const payload = {
                ...formData,
                total_enrollment: totalEnrollment,
                female_enrollment: femaleEnrollment
            };

            const res = await fetch(`/api/ph_schools/unit2/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("Server returned error:", errorData);
                throw new Error(errorData.error || `Server HTTP Error: ${res.status}`);
            }

            // Update local progress to unlock unit 3
            const stored = localStorage.getItem('quest_progress');
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            
            if (!progress.completedUnits.includes(2)) {
                progress.completedUnits.push(2);
                progress.xp += 200; // Reward XP
                localStorage.setItem('quest_progress', JSON.stringify(progress));
            }

            setShowSuccess(true);
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to sync data.");
        } finally {
            setLoading(false);
        }
    };

    const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

    // Slide animation direction
    const slideVariants = {
        enter: { opacity: 0, x: 60, scale: 0.97 },
        center: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -60, scale: 0.97 },
    };

    const expandVariants = {
        hidden: { opacity: 0, height: 0, marginTop: 0 },
        visible: { opacity: 1, height: "auto", marginTop: 16 }
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button
                        onClick={() => navigate('/modular-dashboard')}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                    >
                        <FiX className="w-6 h-6" />
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-green-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-28">
                <AnimatePresence mode="wait">

                {/* ---- REVIEW MODE: Summary Receipt Card ---- */}
                {isReviewMode ? (
                    <motion.div
                        key="review-card-u2"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="max-w-md w-full mx-auto mt-10 px-6"
                    >
                        {/* Receipt Header */}
                        <div className="text-center mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200"
                            >
                                <FiCheckCircle className="w-8 h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-gray-800">Unit 2 Complete!</h2>
                            <p className="text-sm text-gray-400 mt-1">Learner enrollment data has been saved.</p>
                        </div>

                        {/* Enrollment Receipt */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 overflow-hidden"
                        >
                            <div className="h-2 bg-emerald-400" />
                            <div className="px-6 py-5 space-y-4">
                                {/* Grand Total */}
                                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}
                                    className="flex items-center justify-between bg-green-50 rounded-2xl px-4 py-3 border-2 border-green-100">
                                    <span className="font-bold text-green-700">Grand Total</span>
                                    <span className="text-3xl font-black text-green-600">{totalEnrollment.toLocaleString()}</span>
                                </motion.div>

                                {/* Gender Split */}
                                <div className="grid grid-cols-2 gap-3">
                                    {[
                                        { label: "Male 👦", value: formData.male_enrollment || 0, color: "blue" },
                                        { label: "Female 👧", value: femaleEnrollment, color: "pink" },
                                    ].map((item, i) => (
                                        <motion.div key={item.label}
                                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 + i * 0.05 }}
                                            className={`bg-${item.color}-50 border-2 border-${item.color}-100 rounded-2xl px-4 py-3 text-center`}
                                        >
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-400">{item.label}</p>
                                            <p className={`text-2xl font-black text-${item.color}-600 mt-1`}>{Number(item.value).toLocaleString()}</p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Special Categories */}
                                {[
                                    { label: "SNED Learners", value: formData.sned_learners, icon: "♿" },
                                    { label: "Non-Graded", value: formData.non_graded_learners, icon: "📋" },
                                ].filter(item => Number(item.value) > 0).map((item, i) => (
                                    <motion.div key={item.label}
                                        initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.5 + i * 0.05 }}
                                        className="flex items-center gap-3">
                                        <span className="text-lg">{item.icon}</span>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-300">{item.label}</p>
                                            <p className="text-base font-semibold text-gray-800">{Number(item.value).toLocaleString()}</p>
                                        </div>
                                    </motion.div>
                                ))}

                                {/* ARAL Intervention Counts */}
                                {(() => {
                                    const aralGroups = [
                                        {
                                            label: "ARAL Math", icon: "➗",
                                            total: ['g1','g2','g3','g4','g5','g6'].reduce((s,g) => s + (Number(formData[`aral_math_${g}`]) || 0), 0),
                                            has: formData.hasAralMath,
                                        },
                                        {
                                            label: "ARAL Reading", icon: "📖",
                                            total: ['g1','g2','g3','g4','g5','g6'].reduce((s,g) => s + (Number(formData[`aral_read_${g}`]) || 0), 0),
                                            has: formData.hasAralRead,
                                        },
                                        {
                                            label: "ARAL Science", icon: "🔬",
                                            total: ['g1','g2','g3','g4','g5','g6'].reduce((s,g) => s + (Number(formData[`aral_sci_${g}`]) || 0), 0),
                                            has: formData.hasAralSci,
                                        },
                                    ].filter(g => g.has && g.total > 0);

                                    if (aralGroups.length === 0) return null;
                                    return (
                                        <div className="pt-2 space-y-2">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-300">ARAL Learners</p>
                                            {aralGroups.map((g, i) => (
                                                <motion.div key={g.label}
                                                    initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.55 + i * 0.05 }}
                                                    className="flex items-center justify-between bg-amber-50 border border-amber-100 rounded-xl px-4 py-2"
                                                >
                                                    <span className="text-sm font-semibold text-amber-700 flex items-center gap-2">
                                                        <span>{g.icon}</span>{g.label}
                                                    </span>
                                                    <span className="text-lg font-black text-amber-600">{g.total.toLocaleString()}</span>
                                                </motion.div>
                                            ))}
                                        </div>
                                    );
                                })()}
                            </div>
                            <div className="mx-6 border-t-2 border-dashed border-gray-100" />
                            <div className="px-6 py-4">
                                <p className="text-xs text-center text-gray-300">Tap below to update your data</p>
                            </div>
                        </motion.div>

                        {/* Unlock & Edit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setIsReviewMode(false); setCurrentStep(1); }}
                            className="mt-6 w-full py-5 rounded-2xl font-black text-lg tracking-wide bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3"
                        >
                            <FiEdit2 className="w-5 h-5" />
                            Unlock &amp; Edit Data
                        </motion.button>
                    </motion.div>
                ) : (
                    /* ---- WIZARD MODE ---- */
                    <div className="flex-1 max-w-md w-full mx-auto mt-8 px-6">
                    <AnimatePresence mode="wait">

                        {/* ---- STEP 1: Base Enrollment ---- */}
                        {currentStep === 1 && (
                            <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <h2 className="text-2xl font-bold text-gray-800">Count Your Learners</h2>
                                <p className="mt-2 text-sm text-gray-400">Enter the total enrollment per grade level.</p>

                                {/* Dynamic Sticky Total */}
                                <div className="sticky top-4 bg-white border-2 border-green-200 shadow-md rounded-2xl p-4 mt-6 z-10 flex justify-between items-center mb-6">
                                    <span className="font-bold text-gray-500">Grand Total</span>
                                    <span className="text-3xl font-black text-green-600">{totalEnrollment}</span>
                                </div>

                                <div className="space-y-4">
                                    {['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'].map((grade) => (
                                        <div key={grade} className="flex items-center gap-4">
                                            <label className="w-20 text-sm font-bold uppercase tracking-wider text-gray-400">
                                                {grade === 'kinder' ? 'Kinder' : grade.toUpperCase()}
                                            </label>
                                            <input
                                                type="number"
                                                name={`enroll_${grade}`}
                                                value={formData[`enroll_${grade}`]}
                                                onChange={handleChange}
                                                placeholder="0"
                                                min="0"
                                                className={`${chunkyInput} !mt-0 !bg-white`}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        {/* ---- STEP 2: Special Categories ---- */}
                        {currentStep === 2 && (
                            <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <h2 className="text-2xl font-bold text-gray-800">Special Categories</h2>
                                <p className="mt-2 text-sm text-gray-400">Do you have learners in these special programs?</p>

                                <div className="mt-8">
                                    <label className="block text-sm font-bold text-gray-600 mb-3">Do you have SNED learners?</label>
                                    <div className="flex gap-3">
                                        <button onClick={() => setFormData(p => ({ ...p, hasSned: true }))} className={`${toggleBtnBase} ${formData.hasSned === true ? toggleBtnActive : toggleBtnInactive}`}>Yes</button>
                                        <button onClick={() => setFormData(p => ({ ...p, hasSned: false, sned_learners: "" }))} className={`${toggleBtnBase} ${formData.hasSned === false ? toggleBtnActive : toggleBtnInactive}`}>No</button>
                                    </div>
                                    <AnimatePresence>
                                        {formData.hasSned && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                <input type="number" name="sned_learners" value={formData.sned_learners} onChange={handleChange} placeholder="How many SNED learners?" className={chunkyInput} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <div className="mt-8 border-t border-gray-100 pt-6">
                                    <label className="block text-sm font-bold text-gray-600 mb-3">Do you have Non-Graded learners?</label>
                                    <div className="flex gap-3">
                                        <button onClick={() => setFormData(p => ({ ...p, hasNonGraded: true }))} className={`${toggleBtnBase} ${formData.hasNonGraded === true ? toggleBtnActive : toggleBtnInactive}`}>Yes</button>
                                        <button onClick={() => setFormData(p => ({ ...p, hasNonGraded: false, non_graded_learners: "" }))} className={`${toggleBtnBase} ${formData.hasNonGraded === false ? toggleBtnActive : toggleBtnInactive}`}>No</button>
                                    </div>
                                    <AnimatePresence>
                                        {formData.hasNonGraded && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                <input type="number" name="non_graded_learners" value={formData.non_graded_learners} onChange={handleChange} placeholder="How many Non-Graded learners?" className={chunkyInput} />
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}

                        {/* ---- STEP 3: ARAL ---- */}
                        {currentStep === 3 && (
                            <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <h2 className="text-2xl font-bold text-gray-800">ARAL / Remedial</h2>
                                <p className="mt-2 text-sm text-gray-400">Identify learners needing intervention per subject.</p>

                                {/* Helper for rendering grades */}
                                {["Math", "Read", "Sci"].map((subj) => (
                                    <div key={subj} className="mt-8 border-b border-gray-100 pb-6 last:border-0">
                                        <label className="block text-sm font-bold text-gray-600 mb-3">Do you have ARAL Learners in {subj === 'Read' ? 'Reading' : subj === 'Sci' ? 'Science' : subj}?</label>
                                        <div className="flex gap-3">
                                            <button onClick={() => setFormData(p => ({ ...p, [`hasAral${subj}`]: true }))} className={`${toggleBtnBase} ${formData[`hasAral${subj}`] === true ? toggleBtnActive : toggleBtnInactive}`}>Yes</button>
                                            <button onClick={() => setFormData(p => ({ ...p, [`hasAral${subj}`]: false }))} className={`${toggleBtnBase} ${formData[`hasAral${subj}`] === false ? toggleBtnActive : toggleBtnInactive}`}>No</button>
                                        </div>
                                        <AnimatePresence>
                                            {formData[`hasAral${subj}`] && (
                                                <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden grid grid-cols-2 gap-3">
                                                    {[1, 2, 3, 4, 5, 6].map(g => (
                                                        <div key={g}>
                                                            <label className="block text-xs font-bold text-gray-400 mb-1">G{g}</label>
                                                            <input type="number" name={`aral_${subj.toLowerCase()}_g${g}`} value={formData[`aral_${subj.toLowerCase()}_g${g}`]} onChange={handleChange} placeholder="0" className={`${chunkyInput} !mt-0 !p-3 text-base`} />
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </motion.div>
                        )}

                        {/* ---- STEP 4: Gender Logic ---- */}
                        {currentStep === 4 && (
                            <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <h2 className="text-2xl font-bold text-gray-800">The Magic Math 🪄</h2>
                                <p className="mt-2 text-sm text-gray-400">Let's calculate your gender split instantly.</p>

                                <div className="mt-8 text-center bg-blue-50 py-6 px-4 rounded-3xl border-2 border-blue-100">
                                    <p className="font-medium text-gray-600">Out of your <span className="font-bold text-2xl text-blue-600">{totalEnrollment}</span> learners,</p>
                                    <p className="font-medium text-gray-600 mt-1">how many are MALE?</p>
                                    
                                    <div className="max-w-xs mx-auto mt-6">
                                        <input 
                                            type="number" 
                                            name="male_enrollment" 
                                            value={formData.male_enrollment} 
                                            onChange={handleChange} 
                                            placeholder="0" 
                                            className={`${chunkyInput} text-center !text-3xl !py-6 !bg-white`} 
                                        />
                                    </div>
                                </div>

                                <AnimatePresence>
                                    {formData.male_enrollment !== "" && parseInt(formData.male_enrollment) <= totalEnrollment && (
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} 
                                            className="mt-6 text-center bg-green-50 py-6 px-4 rounded-3xl border-2 border-green-200 shadow-sm"
                                        >
                                            <p className="font-medium text-green-700">Got it! That means you have...</p>
                                            <div className="mt-4">
                                                <input 
                                                    type="number" 
                                                    value={femaleEnrollment} 
                                                    readOnly 
                                                    className={`${chunkyInput} text-center !text-3xl !py-6 !font-bold !bg-transparent !border-0 !shadow-none !text-green-600`} 
                                                />
                                            </div>
                                            <p className="font-bold uppercase tracking-widest text-green-600 text-sm mt-2">Female Learners</p>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                            </motion.div>
                        )}

                        {/* ---- STEP 5: Verification ---- */}
                        {currentStep === 5 && (
                            <motion.div key="step5" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <h2 className="text-2xl font-bold text-gray-800">Final Verification</h2>
                                <p className="mt-2 text-sm text-gray-400">Review your "receipt" before submitting.</p>

                                <div className="mt-6 bg-white border border-gray-200 shadow-sm rounded-3xl overflow-hidden">
                                    <div className="bg-gray-50 border-b border-gray-200 p-4 text-center">
                                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Total Population</p>
                                        <p className="text-4xl font-black text-gray-800 mt-1">{totalEnrollment}</p>
                                    </div>
                                    <div className="grid grid-cols-2 divide-x divide-gray-100 py-3">
                                        <div className="text-center p-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase">Male</p>
                                            <p className="text-xl font-bold text-blue-600">{formData.male_enrollment}</p>
                                        </div>
                                        <div className="text-center p-2">
                                            <p className="text-xs font-bold text-gray-400 uppercase">Female</p>
                                            <p className="text-xl font-bold text-red-500">{femaleEnrollment}</p>
                                        </div>
                                    </div>
                                    {(formData.hasSned || formData.hasNonGraded) && (
                                        <div className="bg-orange-50 p-4 text-sm border-t border-orange-100 text-orange-800 flex justify-between">
                                            <span className="font-bold">Special Care:</span>
                                            <span>
                                                {formData.hasSned ? `${formData.sned_learners} SNED` : ''} 
                                                {formData.hasSned && formData.hasNonGraded ? ' / ' : ''}
                                                {formData.hasNonGraded ? `${formData.non_graded_learners} Non-Grade` : ''}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="mt-8 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3 cursor-pointer" onClick={() => setFormData(p => ({ ...p, verified_as_of: !p.verified_as_of }))}>
                                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${formData.verified_as_of ? 'bg-blue-600 border-blue-600' : 'bg-white border-blue-300'}`}>
                                        {formData.verified_as_of && <FiCheck className="text-white w-4 h-4" />}
                                    </div>
                                    <p className="text-sm text-blue-800 font-medium select-none">
                                        I verify this data is correct and accurately reflects our enrollment as of {new Date().toLocaleDateString()}.
                                    </p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
                )}
                </AnimatePresence>
            </main>

            {!isReviewMode && (
            <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-gray-100 flex justify-center z-50">
                <div className="w-full max-w-md flex gap-3">
                    {currentStep > 1 && (
                        <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} onClick={handleBack} className="px-5 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 border-b-[4px] border-gray-200 active:border-b-0 active:translate-y-[4px] transition-all">
                            Back
                        </motion.button>
                    )}

                    {currentStep === TOTAL_STEPS ? (
                        <button onClick={handleNext} disabled={loading || !isCurrentStepValid()} className="flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center bg-green-500 border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg">
                            {loading ? "Syncing..." : "Submit Verification ⭐"}
                        </button>
                    ) : (
                        <button onClick={handleNext} disabled={!isCurrentStepValid()} className="flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center bg-blue-500 border-b-[6px] border-blue-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg">
                            Continue
                        </button>
                    )}
                </div>
            </div>
            )}

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="Unit 2 completed! The next objective is unlocked."
                redirectUrl="/modular-dashboard"
            />
        </div>
    );
};

export default Unit2Learners;
