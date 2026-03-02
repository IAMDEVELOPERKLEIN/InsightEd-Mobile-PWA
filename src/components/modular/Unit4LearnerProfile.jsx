import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiEdit2, FiUsers, FiChevronRight, FiChevronLeft, FiAlertTriangle, FiCheck } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_CHAPTERS = 5; // 1: Gatekeeper, 2: Demo Loop, 3: Move Loop, 4: Health Check, 5: Review & Submit

const GRADES = [
    { id: "k",  label: "Kinder" },
    { id: "g1", label: "Grade 1" },
    { id: "g2", label: "Grade 2" },
    { id: "g3", label: "Grade 3" },
    { id: "g4", label: "Grade 4" },
    { id: "g5", label: "Grade 5" },
    { id: "g6", label: "Grade 6" },
];

const DEMOGRAPHIC_CARDS = [
    { id: "als",       icon: "📚", label: "ALS Learners",                    color: "amber" },
    { id: "muslim",    icon: "🕌", label: "Muslim Learners (ALIVE)",         color: "emerald" },
    { id: "ip",        icon: "⛰️", label: "Indigenous People (IP)",           color: "orange" },
    { id: "lwd",       icon: "♿", label: "Learners with Disability (LWD)", color: "blue" },
    { id: "displaced", icon: "🏕️", label: "Displaced Learners",              color: "rose" },
    { id: "overage",   icon: "🎂", label: "Overage Learners",                color: "fuchsia" },
    { id: "sned",      icon: "🧠", label: "SNED Learners",                   color: "violet" },
];

const MOVEMENT_TYPES = [
    { id: "dropout",  icon: "🔻", label: "Dropouts (Last Year)", color: "red" },
    { id: "repeater", icon: "🔄", label: "Repeaters (This Year)", color: "orange" },
];

const colorClasses = {
    amber:   { bg: "bg-amber-100",   border: "border-amber-500",   text: "text-amber-700",   shadow: "shadow-amber-200" },
    emerald: { bg: "bg-emerald-100", border: "border-emerald-500", text: "text-emerald-700", shadow: "shadow-emerald-200" },
    orange:  { bg: "bg-orange-100",  border: "border-orange-500",  text: "text-orange-700",  shadow: "shadow-orange-200" },
    blue:    { bg: "bg-blue-100",    border: "border-blue-500",    text: "text-blue-700",    shadow: "shadow-blue-200" },
    rose:    { bg: "bg-rose-100",    border: "border-rose-500",    text: "text-rose-700",    shadow: "shadow-rose-200" },
    fuchsia: { bg: "bg-fuchsia-100", border: "border-fuchsia-500", text: "text-fuchsia-700", shadow: "shadow-fuchsia-200" },
    violet:  { bg: "bg-violet-100",  border: "border-violet-500",  text: "text-violet-700",  shadow: "shadow-violet-200" },
    red:     { bg: "bg-red-100",     border: "border-red-500",     text: "text-red-700",     shadow: "shadow-red-200" },
};

const chunkyInput = "w-full p-3 bg-gray-50 border-2 border-gray-200 rounded-xl text-lg font-bold text-gray-700 focus:outline-none focus:border-violet-500 focus:bg-violet-50 transition-colors shadow-sm text-center";

// ── Framer Motion Variants ────────────────────────────────────────────────
const slideVariants = {
    enter: { opacity: 0, x: 60, scale: 0.97 },
    center: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -60, scale: 0.97 },
};

// ══════════════════════════════════════════════════════════════════════════
const Unit4LearnerProfile = () => {
    const navigate = useNavigate();

    // ── Core State ────────────────────────────────────────────────────────
    const [currentChapter, setCurrentChapter] = useState(1);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [savedData, setSavedData] = useState(null);

    // ── Chapter 1 State (Gatekeeper) ──────────────────────────────────────
    const [selectedGroups, setSelectedGroups] = useState([]); // Array of IDs

    // ── Chapter 2 State (Category Loop) ───────────────────────────────────
    const [catIdx, setCatIdx] = useState(0); // Index in selectedGroups
    const [demographicsData, setDemographicsData] = useState({}); // { als_k: "2", muslim_g1: "5" }

    // ── Chapter 3 State (Movement Loop) ───────────────────────────────────
    const [hasMovement, setHasMovement] = useState(null); // true/false
    const [movementIdx, setMovementIdx] = useState(0); // 0 = dropout, 1 = repeater
    const [movementData, setMovementData] = useState({}); // { dropout_k: "1", repeater_g1: "0" }

    // ── Chapter 4 State (Health Check) ────────────────────────────────────
    const [enrollmentTotal, setEnrollmentTotal] = useState(0);
    const [bmiData, setBmiData] = useState({ severely_wasted: "", wasted: "", overweight_obese: "" });

    // ── Chapter 5 State (Review & Submit) ─────────────────────────────────
    const [isVerified, setIsVerified] = useState(false);

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

                        // Grab total_enrollment from Unit 2
                        setEnrollmentTotal(parseInt(d.total_enrollment) || 0);

                        if (d.selected_learner_groups !== null) {
                            // Pres-fill Chapter 1
                            if (Array.isArray(d.selected_learner_groups)) {
                                setSelectedGroups(d.selected_learner_groups);
                            }

                            // Pres-fill Chapter 2 & 3 Dynamic Columns
                            const demoObj  = {};
                            const moveObj  = {};
                            let hasAnyMove = false;

                            // Ch 2
                            DEMOGRAPHIC_CARDS.forEach(c => {
                                GRADES.forEach(g => {
                                    const key = `${c.id}_${g.id}`;
                                    if (d[key] !== undefined && d[key] !== null) {
                                        demoObj[key] = d[key].toString();
                                    }
                                });
                            });
                            
                            // Ch 3
                            MOVEMENT_TYPES.forEach(m => {
                                GRADES.forEach(g => {
                                    const key = `${m.id}_${g.id}`;
                                    if (d[key] !== undefined && d[key] !== null) {
                                        moveObj[key] = d[key].toString();
                                        if (d[key] > 0) hasAnyMove = true;
                                    }
                                });
                            });

                            // Ch 4 Pre-fill BMI
                            setBmiData({
                                severely_wasted: d.bmi_severely_wasted?.toString() || "",
                                wasted: d.bmi_wasted?.toString() || "",
                                overweight_obese: d.bmi_overweight_obese?.toString() || ""
                            });

                            setDemographicsData(demoObj);
                            setMovementData(moveObj);
                            
                            if (hasAnyMove) setHasMovement(true);
                            else if (d.updated_at) setHasMovement(false); // If they've saved before but have 0 movement, prepopulate False

                            // Open Review Mode
                            setIsReviewMode(true);
                        }
                    }
                }
            } catch (e) {
                console.warn("Could not fetch Unit 4 data", e);
            }
        };
        init();
    }, []);

    // ── Computed Totals ───────────────────────────────────────────────────
    const currentCategory = selectedGroups[catIdx];
    
    const catTotal = useMemo(() => {
        if (!currentCategory) return 0;
        return GRADES.reduce((sum, g) => sum + (parseInt(demographicsData[`${currentCategory}_${g.id}`]) || 0), 0);
    }, [currentCategory, demographicsData]);

    const currentMovement = MOVEMENT_TYPES[movementIdx];
    
    const moveTotal = useMemo(() => {
        if (!currentMovement) return 0;
        return GRADES.reduce((sum, g) => sum + (parseInt(movementData[`${currentMovement.id}_${g.id}`]) || 0), 0);
    }, [currentMovement, movementData]);

    // Computed total for Chapter 5 recap
    const overallDropSum = useMemo(() => GRADES.reduce((s, g) => s + (parseInt(movementData[`dropout_${g.id}`]) || 0), 0), [movementData]);
    const overallRepSum = useMemo(() => GRADES.reduce((s, g) => s + (parseInt(movementData[`repeater_${g.id}`]) || 0), 0), [movementData]);

    // BMI Magic Math
    const totalWastedObese = useMemo(() => {
        return (parseInt(bmiData.severely_wasted) || 0) + (parseInt(bmiData.wasted) || 0) + (parseInt(bmiData.overweight_obese) || 0);
    }, [bmiData]);
    const normalBmiCount = Math.max(0, enrollmentTotal - totalWastedObese);

    // ── Navigation Logic ──────────────────────────────────────────────────
    const handleNext = () => {
        // From Ch 1 -> Ch 2 or Ch 3
        if (currentChapter === 1) {
            if (selectedGroups.length === 0) {
                setCurrentChapter(3); // Skip Ch 2 loop entirely
            } else {
                setCurrentChapter(2);
                setCatIdx(0);
            }
        }
        // From Ch 2 loop
        else if (currentChapter === 2) {
            if (catIdx < selectedGroups.length - 1) {
                setCatIdx(i => i + 1);
            } else {
                setCurrentChapter(3); // Move to Ch 3 Movement Gatekeeper
            }
        }
        // From Ch 3 Gatekeeper / Loop
        else if (currentChapter === 3) {
            if (hasMovement === false) {
                setCurrentChapter(4); // Skip straight to Ch 4
            } else if (hasMovement === true) {
                if (movementIdx === 0) { // On Dropouts, go to Repeaters
                    setMovementIdx(1);
                } else { // On Repeaters, go to Ch 4
                    setCurrentChapter(4);
                }
            }
        }
        // From Ch 4 -> Ch 5
        else if (currentChapter === 4) {
            setCurrentChapter(5);
        }
    };

    const handleBack = () => {
        if (currentChapter === 5) {
            setCurrentChapter(4);
        }
        else if (currentChapter === 4) {
            setCurrentChapter(3);
            if (hasMovement === true) setMovementIdx(1); // Go back to Repeater screen
        }
        else if (currentChapter === 3) {
            if (hasMovement === true && movementIdx === 1) {
                setMovementIdx(0); // Go back to Dropout screen
            } else {
                // Going back from Ch 3 Gatekeeper or Dropout screen -> Ch 2 or Ch 1
                if (selectedGroups.length === 0) {
                    setCurrentChapter(1);
                } else {
                    setCurrentChapter(2);
                    setCatIdx(selectedGroups.length - 1);
                }
            }
        }
        else if (currentChapter === 2) {
            if (catIdx > 0) {
                setCatIdx(i => i - 1);
            } else {
                setCurrentChapter(1);
            }
        }
        else {
            navigate("/modular-dashboard");
        }
    };

    // ── Submit ────────────────────────────────────────────────────────────
    const handleSubmit = async () => {
        if (!schoolId) return;
        try {
            setLoading(true);

            // Payload builder
            const payload = {
                selected_learner_groups: selectedGroups,
            };

            // Inject demographics
            selectedGroups.forEach(cat => {
                GRADES.forEach(g => {
                    const key = `${cat}_${g.id}`;
                    payload[key] = parseInt(demographicsData[key]) || 0;
                });
            });

            // Inject movements
            if (hasMovement) {
                MOVEMENT_TYPES.forEach(m => {
                    GRADES.forEach(g => {
                        const key = `${m.id}_${g.id}`;
                        payload[key] = parseInt(movementData[key]) || 0;
                    });
                });
            } else {
                // Overwrite with zeroes if they said No
                MOVEMENT_TYPES.forEach(m => {
                    GRADES.forEach(g => {
                        payload[`${m.id}_${g.id}`] = 0;
                    });
                });
            }

            // Inject BMI
            payload.bmi_severely_wasted = parseInt(bmiData.severely_wasted) || 0;
            payload.bmi_wasted = parseInt(bmiData.wasted) || 0;
            payload.bmi_overweight_obese = parseInt(bmiData.overweight_obese) || 0;
            payload.bmi_normal = normalBmiCount;

            const res = await fetch(`/api/ph_schools/unit4/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `Server Error ${res.status}`);
            }

            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(4)) {
                progress.completedUnits.push(4);
                progress.xp += 250;
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }
            setShowSuccess(true);
        } catch (err) {
            alert("Failed to save data. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Input Validations ─────────────────────────────────────────────────
    const isStepValid = (() => {
        if (currentChapter === 1) return true; // Empty array allowed
        if (currentChapter === 2) return true; // Empty numeric forms default to 0
        if (currentChapter === 3) {
            if (hasMovement === null) return false;
            return true;
        }
        if (currentChapter === 4) {
            if (enrollmentTotal === 0) return false; // Must complete Unit 2 for total
            if (totalWastedObese > enrollmentTotal) return false; // Can't have more than total
            return true;
        }
        if (currentChapter === 5) {
            return isVerified;
        }
        return true;
    })();

    const progressPercentage = (() => {
        if (currentChapter === 1) return 15;
        if (currentChapter === 2) return 15 + ((catIdx + 1) / selectedGroups.length) * 35; // scales 15 to 50
        if (currentChapter === 3) {
            if (hasMovement !== true) return 70;
            return 50 + ((movementIdx + 1) / 2) * 20; // scales 50 to 70
        }
        if (currentChapter === 4) return 85;
        return 100;
    })();

    // ══════════════════════════════════════════════════════════════════════
    // REVIEW MODE
    // ══════════════════════════════════════════════════════════════════════
    if (isReviewMode) {
        const displayGroups = (savedData?.selected_learner_groups || []).map(
            id => DEMOGRAPHIC_CARDS.find(c => c.id === id) || { id, label: id, color: "gray", icon: "📌" }
        );

        // Derive dropouts/repeaters totals directly from savedData
        const sumMove = (prefix) => GRADES.reduce((s, g) => s + (parseInt(savedData?.[`${prefix}_${g.id}`]) || 0), 0);
        const dropSum = sumMove("dropout");
        const repSum  = sumMove("repeater");

        return (
            <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-indigo-50/30 to-purple-50 flex flex-col font-sans">
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                    <div className="max-w-md mx-auto flex items-center gap-3">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                            <FiX className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                        </button>
                        <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full w-full bg-violet-500 rounded-full" />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto pb-28">
                    <motion.div initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="max-w-md w-full mx-auto mt-10 px-6">
                        
                        <div className="text-center mb-6">
                            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 bg-violet-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-violet-200">
                                <FiCheckCircle className="w-8 h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-gray-800">Unit 4 Complete!</h2>
                        </div>

                        <div className="space-y-4">
                            {/* Groups Card */}
                            <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
                                <div className="h-2 bg-gradient-to-r from-violet-400 to-fuchsia-400" />
                                <div className="px-6 py-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Saved Community Profile</p>
                                    
                                    {displayGroups.length === 0 ? (
                                        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-3 text-center">
                                            <p className="font-bold text-emerald-700">✅ No special groups selected</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {displayGroups.map((g) => {
                                                const totalEnrolled = GRADES.reduce((s, gr) => s + (parseInt(savedData?.[`${g.id}_${gr.id}`]) || 0), 0);
                                                return (
                                                    <div key={g.id} className={`flex items-center justify-between px-4 py-3 rounded-2xl border-2 ${colorClasses[g.color]?.bg || "bg-gray-100"} ${colorClasses[g.color]?.border || "border-gray-200"}`}>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-2xl">{g.icon}</span>
                                                            <span className={`font-black text-sm ${colorClasses[g.color]?.text || "text-gray-700"}`}>{g.label}</span>
                                                        </div>
                                                        <div className={`px-3 py-1 bg-white rounded-lg shadow-sm border ${colorClasses[g.color]?.border}`}>
                                                            <span className={`font-black tracking-wide ${colorClasses[g.color]?.text}`}>{totalEnrolled}</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Movement Card */}
                            {(dropSum > 0 || repSum > 0) && (
                                <div className="bg-white rounded-3xl shadow-xl border border-gray-100 px-6 py-5">
                                    <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-4">Learner Movement</p>
                                    <div className="flex gap-3">
                                        <div className="flex-1 bg-red-50 border border-red-200 rounded-2xl p-3 text-center">
                                            <span className="text-2xl mb-1 block">🔻</span>
                                            <p className="text-[10px] font-bold text-red-400 uppercase">Dropouts</p>
                                            <p className="text-2xl font-black text-red-600">{dropSum}</p>
                                        </div>
                                        <div className="flex-1 bg-orange-50 border border-orange-200 rounded-2xl p-3 text-center">
                                            <span className="text-2xl mb-1 block">🔄</span>
                                            <p className="text-[10px] font-bold text-orange-400 uppercase">Repeaters</p>
                                            <p className="text-2xl font-black text-orange-600">{repSum}</p>
                                        </div>
                                    </div>
                                </div>
                            )}

                        </div>

                        <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                            onClick={() => { setIsReviewMode(false); setCurrentChapter(1); }}
                            className="mt-6 mb-8 w-full py-5 rounded-2xl font-black text-lg tracking-wide bg-gradient-to-r from-violet-500 to-fuchsia-600 text-white shadow-xl shadow-violet-200 border-b-[5px] border-violet-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3"
                        >
                            <FiEdit2 className="w-5 h-5" />
                            Unlock &amp; Edit Data
                        </motion.button>
                    </motion.div>
                </main>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════
    // WIZARD MODE
    // ══════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-indigo-50/30 to-purple-50 flex flex-col font-sans">
            
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                        <FiX className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-violet-500 rounded-full" animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.4 }} />
                    </div>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-md w-full mx-auto mt-6 px-4">
                    <AnimatePresence mode="wait">

                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 1: The Demographics Gatekeeper
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 1 && (
                            <motion.div key="ch1-u4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-6">
                                    <div className="w-16 h-16 bg-violet-100 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-sm">
                                        <FiUsers className="w-8 h-8 text-violet-600" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800">Your school community</h2>
                                    <p className="text-sm text-gray-500 mt-2 mx-4">Which learner groups are present this year? (Tap all that apply)</p>
                                </div>

                                <div className="space-y-3 px-2">
                                    {DEMOGRAPHIC_CARDS.map((card, idx) => {
                                        const isSelected = selectedGroups.includes(card.id);
                                        const cStyles = isSelected ? colorClasses[card.color] : null;
                                        
                                        return (
                                            <motion.button key={card.id} whileTap={{ scale: 0.97 }}
                                                onClick={() => setSelectedGroups(p => p.includes(card.id) ? p.filter(x => x !== card.id) : [...p, card.id])}
                                                className={`w-full p-4 rounded-3xl border-2 transition-all flex items-center gap-4 text-left ${isSelected ? `${cStyles.bg} ${cStyles.border} shadow-md` : "bg-white border-gray-100 hover:border-gray-200"}`}>
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl ${isSelected ? "bg-white/60 shadow-inner" : "bg-gray-50"}`}>
                                                    {card.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`font-black tracking-wide ${isSelected ? cStyles.text : "text-gray-700"}`}>{card.label}</span>
                                                </div>
                                                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${isSelected ? `bg-white ${cStyles.border}` : "bg-white border-gray-300"}`}>
                                                    {isSelected && <div className={`w-3 h-3 rounded-full ${cStyles.bg.replace("100", "500")}`} />}
                                                </div>
                                            </motion.button>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 2: Category Loop
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 2 && currentCategory && (() => {
                            const cInfo = DEMOGRAPHIC_CARDS.find(c => c.id === currentCategory) || {};
                            const cStyle = colorClasses[cInfo.color];

                            return (
                                <motion.div key={`ch2-${currentCategory}`} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="pb-10">
                                    
                                    {/* Pagination Mini-Nav */}
                                    <div className="flex justify-center gap-1.5 mb-6">
                                        {selectedGroups.map((_, i) => (
                                            <div key={i} className={`h-1.5 rounded-full transition-all ${i === catIdx ? `w-6 ${cStyle.bg.replace("100", "500")}` : i < catIdx ? `w-3 bg-violet-300` : `w-2 bg-gray-200`}`} />
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 mb-2 px-2">
                                        <div className={`w-12 h-12 ${cStyle.bg} border ${cStyle.border} rounded-2xl flex items-center justify-center text-2xl shadow-sm`}>{cInfo.icon}</div>
                                        <div>
                                            <p className={`text-[10px] font-bold uppercase tracking-widest ${cStyle.text}`}>Record count by grade</p>
                                            <h2 className="text-xl font-black text-gray-800 leading-tight">{cInfo.label}</h2>
                                        </div>
                                    </div>

                                    <div className="bg-white border-2 border-gray-100 rounded-3xl p-4 shadow-sm mt-5 space-y-3">
                                        {GRADES.map(g => {
                                            const fieldKey = `${currentCategory}_${g.id}`;
                                            return (
                                                <div key={g.id} className="flex items-center gap-3">
                                                    <div className="w-24 text-right">
                                                        <span className="text-sm font-bold text-gray-600">{g.label}</span>
                                                    </div>
                                                    <div className="flex-1">
                                                        <input 
                                                            type="number" min="0" placeholder="0"
                                                            value={demographicsData[fieldKey] !== undefined ? demographicsData[fieldKey] : ""}
                                                            onFocus={e => { if (e.target.value === '0') setDemographicsData(prev => ({ ...prev, [fieldKey]: "" })) }}
                                                            onChange={e => setDemographicsData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                                            className={`${chunkyInput} !py-2 !text-base focus:!bg-white focus:!border-violet-400`}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        
                                        {/* Auto-sum footer */}
                                        <div className={`mt-4 pt-3 border-t-2 border-dashed ${cStyle.border.replace("500", "200")} flex justify-between items-center px-4`}>
                                            <span className={`text-xs font-bold uppercase tracking-wider ${cStyle.text}`}>Total</span>
                                            <span className={`text-2xl font-black ${cStyle.text}`}>{catTotal}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 3: Learner Movement (Gatekeeper & Loop)
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 3 && (
                            <motion.div key={`ch3-${hasMovement === true ? movementIdx : "gate"}`} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="pb-10">
                                
                                {hasMovement === null || hasMovement === false ? (
                                    /* Gatekeeper Screen */
                                    <div className="text-center mt-6">
                                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                            <span className="text-3xl">🚫</span>
                                        </div>
                                        <h2 className="text-2xl font-black text-gray-800 mb-2">Learner Movement</h2>
                                        <p className="text-sm text-gray-500 mb-8 px-4">Did you have any Dropouts last school year, or any Repeaters this year?</p>
                                        
                                        <div className="flex gap-4 px-6">
                                            <button onClick={() => setHasMovement(true)} 
                                                className={`flex-1 py-5 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-2 ${hasMovement === true ? "bg-blue-100 border-blue-500 text-blue-700 shadow-md" : "bg-white border-gray-200 text-gray-400"}`}>
                                                <span className="text-2xl">✓</span> Yes
                                            </button>
                                            <button onClick={() => { setHasMovement(false); setMovementIdx(0); }} 
                                                className={`flex-1 py-5 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-2 ${hasMovement === false ? "bg-emerald-100 border-emerald-500 text-emerald-700 shadow-md" : "bg-white border-gray-200 text-gray-400"}`}>
                                                <span className="text-2xl">✗</span> No
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {hasMovement === false && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-8 px-6 text-emerald-600 font-bold overflow-hidden">
                                                    Perfect! We'll skip the movement section. Tap Continue.
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                ) : (
                                    /* Loop Screen (Dropouts or Repeaters) */
                                    <div>
                                        {/* Pagination Mini-Nav */}
                                        <div className="flex justify-center gap-1.5 mb-6">
                                            {MOVEMENT_TYPES.map((_, i) => (
                                                <div key={i} className={`h-1.5 rounded-full transition-all ${i === movementIdx ? `w-6 bg-blue-500` : i < movementIdx ? `w-3 bg-blue-300` : `w-2 bg-gray-200`}`} />
                                            ))}
                                        </div>

                                        <div className="flex items-center gap-3 mb-2 px-2">
                                            <div className={`w-12 h-12 ${colorClasses[currentMovement.color].bg} border ${colorClasses[currentMovement.color].border} rounded-2xl flex items-center justify-center text-2xl shadow-sm`}>{currentMovement.icon}</div>
                                            <div>
                                                <p className={`text-[10px] font-bold uppercase tracking-widest ${colorClasses[currentMovement.color].text}`}>Record count by grade</p>
                                                <h2 className="text-xl font-black text-gray-800 leading-tight">{currentMovement.label}</h2>
                                            </div>
                                        </div>

                                        <div className="bg-white border-2 border-gray-100 rounded-3xl p-4 shadow-sm mt-5 space-y-3">
                                            {GRADES.map(g => {
                                                const fieldKey = `${currentMovement.id}_${g.id}`;
                                                return (
                                                    <div key={g.id} className="flex items-center gap-3">
                                                        <div className="w-24 text-right">
                                                            <span className="text-sm font-bold text-gray-600">{g.label}</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <input 
                                                                type="number" min="0" placeholder="0"
                                                                value={movementData[fieldKey] !== undefined ? movementData[fieldKey] : ""}
                                                                onFocus={e => { if (e.target.value === '0') setMovementData(prev => ({ ...prev, [fieldKey]: "" })) }}
                                                                onChange={e => setMovementData(prev => ({ ...prev, [fieldKey]: e.target.value }))}
                                                                className={`${chunkyInput} !py-2 !text-base focus:!bg-white focus:!border-blue-400`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                            
                                            {/* Auto-sum footer */}
                                            <div className={`mt-4 pt-3 border-t-2 border-dashed ${colorClasses[currentMovement.color].border.replace("500", "200")} flex justify-between items-center px-4`}>
                                                <span className={`text-xs font-bold uppercase tracking-wider ${colorClasses[currentMovement.color].text}`}>Total</span>
                                                <span className={`text-2xl font-black ${colorClasses[currentMovement.color].text}`}>{moveTotal}</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </motion.div>
                        )}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 4: Health Check (BMI)
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 4 && (
                            <motion.div key="ch4-bmi" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="pb-10">
                                
                                <div className="text-center mt-4">
                                    <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                                        <span className="text-3xl">🩺</span>
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 mb-2">Time for a Health Check!</h2>
                                </div>

                                {enrollmentTotal === 0 ? (
                                    <div className="mt-6 bg-rose-50 border-2 border-rose-200 rounded-2xl p-4 text-center">
                                        <FiAlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
                                        <h3 className="font-bold text-rose-700">Missing Total Enrollment</h3>
                                        <p className="text-xs text-rose-600 mt-1">We noticed your total enrollment is 0. Please make sure you have fully completed Unit 2 (The Learners) before entering BMI data so our magic math works.</p>
                                    </div>
                                ) : (
                                    <div className="mt-4">
                                        <p className="text-sm text-gray-500 mb-6 text-center leading-relaxed">
                                            Out of your <strong className="text-emerald-600 px-1">{enrollmentTotal}</strong> enrolled learners, how many fall into these Nutritional Status categories?
                                        </p>

                                        <div className="space-y-3">
                                            {[
                                                { key: "severely_wasted", label: "Severely Wasted", color: "text-rose-600" },
                                                { key: "wasted", label: "Wasted", color: "text-orange-600" },
                                                { key: "overweight_obese", label: "Overweight or Obese", color: "text-amber-600" }
                                            ].map(f => (
                                                <div key={f.key} className="flex items-center gap-3 bg-white p-3 rounded-2xl border-2 border-gray-100 shadow-sm">
                                                    <div className="flex-1 pl-2">
                                                        <span className={`text-sm font-bold ${f.color}`}>{f.label}</span>
                                                    </div>
                                                    <div className="w-24">
                                                        <input 
                                                            type="number" min="0" placeholder="0"
                                                            value={bmiData[f.key] !== undefined ? bmiData[f.key] : ""}
                                                            onFocus={e => { if (e.target.value === '0') setBmiData(p => ({ ...p, [f.key]: "" })) }}
                                                            onChange={e => {
                                                                let val = e.target.value;
                                                                if (val.length > 1 && val.startsWith('0')) val = val.substring(1);
                                                                setBmiData(p => ({ ...p, [f.key]: val }));
                                                            }}
                                                            className={`${chunkyInput} !py-2 !text-base focus:!bg-white focus:!border-emerald-400`}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-6 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-3xl p-[3px] shadow-lg shadow-emerald-200">
                                            <div className="bg-emerald-50 rounded-[21px] p-5 text-center">
                                                <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest mb-1">Calculated BMI</p>
                                                <div className="flex justify-center items-end gap-2 text-emerald-700">
                                                    <span className="text-4xl font-black">{Math.max(0, normalBmiCount)}</span>
                                                    <span className="text-sm font-bold mb-1">Normal</span>
                                                </div>
                                                {totalWastedObese > enrollmentTotal && (
                                                    <p className="text-xs font-bold text-rose-500 mt-2 bg-rose-100 py-1.5 px-3 rounded-lg mx-4">
                                                        Wait! The selected inputs exceed your total enrollment.
                                                    </p>
                                                )}
                                                {totalWastedObese <= enrollmentTotal && (
                                                    <p className="text-xs text-emerald-600 mt-2 font-medium">
                                                        Awesome! That means {normalBmiCount} learners have a NORMAL BMI. We did the math.
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                    </div>
                                )}
                            </motion.div>
                        )}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 5: Final Submission (Review & Submit)
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 5 && (
                            <motion.div key="ch5-u4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }} className="pb-10">
                                
                                <div className="text-center mt-6">
                                    <div className="w-16 h-16 bg-gradient-to-tr from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-violet-200">
                                        <FiCheckCircle className="w-8 h-8 text-white" />
                                    </div>
                                    <h2 className="text-2xl font-black text-gray-800 mb-1">Review &amp; Submit</h2>
                                    <p className="text-sm text-gray-500 mb-6 px-4">You're almost done! Let's quickly review the community data you entered.</p>
                                </div>

                                <div className="bg-white border flex flex-col gap-4 border-gray-100 rounded-3xl p-5 shadow-sm mb-6">
                                    
                                    <div className="flex items-center justify-between border-b-2 border-dashed border-gray-100 pb-3">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <span className="text-xl">🗂️</span>
                                            <span className="font-bold text-sm">Special Groups Tracked</span>
                                        </div>
                                        <span className="font-black text-lg text-violet-600">{selectedGroups.length}</span>
                                    </div>

                                    <div className="flex items-center justify-between border-b-2 border-dashed border-gray-100 pb-3">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <span className="text-xl">🚶</span>
                                            <span className="font-bold text-sm">Total Learner Movement</span>
                                        </div>
                                        <span className="font-black text-lg text-blue-600">{overallDropSum + overallRepSum}</span>
                                    </div>

                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 text-gray-600">
                                            <span className="text-xl">🥗</span>
                                            <span className="font-bold text-sm">Normal BMI Calculated</span>
                                        </div>
                                        <span className="font-black text-lg text-emerald-600">{normalBmiCount}</span>
                                    </div>

                                </div>

                                <button
                                    onClick={() => setIsVerified(!isVerified)}
                                    className={`w-full p-4 rounded-2xl flex items-center justify-center gap-3 border-2 transition-all ${isVerified ? "bg-emerald-50 border-emerald-500 text-emerald-700" : "bg-white border-gray-200 text-gray-500"}`}
                                >
                                    <div className={`w-6 h-6 rounded border flex items-center justify-center ${isVerified ? "bg-emerald-500 border-emerald-600" : "bg-white border-gray-300"}`}>
                                        {isVerified && <FiCheck strokeWidth={4} className="text-white w-4 h-4" />}
                                    </div>
                                    <span className="font-bold text-sm">I verify this data is correct as of {new Date().toLocaleDateString()}</span>
                                </button>

                            </motion.div>
                        )}


                    </AnimatePresence>
                </div>
            </main>

            {/* ── Sticky Footer ── */}
            <div className="fixed bottom-0 left-0 w-full p-4 bg-white/90 backdrop-blur-md border-t border-gray-100 flex justify-center z-50 shadow-[0_-4px_16px_rgba(0,0,0,0.02)]">
                <div className="w-full max-w-md flex gap-3 px-2">
                    
                    {(currentChapter > 1 || (currentChapter === 2 && catIdx > 0)) && (
                        <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                            onClick={handleBack}
                            className="w-14 flex-shrink-0 flex justify-center items-center rounded-2xl bg-gray-100 text-gray-500 border-b-[4px] border-gray-200 active:border-b-0 active:translate-y-[4px] transition-all">
                            <FiChevronLeft className="w-6 h-6" />
                        </motion.button>
                    )}

                    {currentChapter === TOTAL_CHAPTERS ? (
                        <button onClick={handleSubmit} disabled={loading}
                                className="w-full py-4 rounded-2xl text-white font-black text-lg bg-emerald-500 border-b-[6px] border-emerald-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg flex justify-center items-center gap-2">
                                {loading ? "Saving..." : "Submit Learner Profile"}
                        </button>
                    ) : (
                        <button onClick={handleNext} disabled={!isStepValid}
                            className="flex-1 py-4 rounded-2xl text-white font-black text-lg bg-violet-500 border-b-[6px] border-violet-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 shadow-lg shadow-violet-200 flex justify-center items-center gap-2">
                            {currentChapter === 2 && selectedGroups.length > 1 && catIdx < selectedGroups.length - 1 ? "Next Category" : currentChapter === 1 && selectedGroups.length === 0 ? "Skip Demographics" : "Continue"}
                            <FiChevronRight className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="Learner Profile complete! ✓ Community, Movement & BMI linked. 🚀"
                redirectUrl="/modular-dashboard"
            />
        </div>
    );
};

export default Unit4LearnerProfile;
