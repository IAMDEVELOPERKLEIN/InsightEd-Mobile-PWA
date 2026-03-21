import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiEdit2, FiUsers, FiChevronRight, FiChevronLeft, FiAlertTriangle, FiCheck, FiActivity, FiUnlock, FiSave, FiArrowLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";

// ── Constants ────────────────────────────────────────────────────────────────
const TOTAL_CHAPTERS = 5; // 1: Gatekeeper, 2: Demo Loop, 3: Move Loop, 4: Health Check, 5: Review & Submit

const ALL_GRADES_REF = [
    { id: "kinder", label: "Kinder" },
    { id: "g1", label: "Grade 1" },
    { id: "g2", label: "Grade 2" },
    { id: "g3", label: "Grade 3" },
    { id: "g4", label: "Grade 4" },
    { id: "g5", label: "Grade 5" },
    { id: "g6", label: "Grade 6" },
    { id: "g7", label: "Grade 7" },
    { id: "g8", label: "Grade 8" },
    { id: "g9", label: "Grade 9" },
    { id: "g10", label: "Grade 10" },
    { id: "g11", label: "Grade 11" },
    { id: "g12", label: "Grade 12" },
];

const DEMOGRAPHIC_CARDS = [
    { id: "als",       icon: "📚", label: "ALS Learners",                    color: "amber" },
    { id: "muslim",    icon: "🕌", label: "Muslim Learners",         color: "emerald" },
    { id: "ip",        icon: "⛰️", label: "Indigenous People (IP)",           color: "orange" },
    { id: "displaced", icon: "🏕️", label: "Displaced Learners",              color: "rose" },
    { id: "overage",   icon: "🎂", label: "Overage Learners",                color: "fuchsia" },
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
const pageVariants = {
    initial: { opacity: 0, y: 30, scale: 0.98 },
    in: { opacity: 1, y: 0, scale: 1 },
    out: { opacity: 0, y: -30, scale: 0.98 }
};

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
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [savedData, setSavedData] = useState(null);
    const [showDraftModal, setShowDraftModal] = useState(false);

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
    const [dynamicGrades, setDynamicGrades] = useState([]); // Array of {id, label}
    const [gradeTotalsMap, setGradeTotalsMap] = useState({}); // { kinder: 10, g1: 20 ... }
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
                const draft = await getUnitDraft(4, storedId);
                const res = await fetch(`/api/ph_schools/${storedId}?t=${Date.now()}`);
                
                if (res.ok) {
                    const saved = await res.json();
                    let d = (saved.exists && saved.data) ? saved.data : {};
                    setSavedData(d);

                    // 1. Determine Allowed Grades
                    const qp = JSON.parse(localStorage.getItem('quest_progress') || '{}');
                    const co = (qp.curricular_offering || d.curricular_offering || "").toLowerCase();
                    let offeringAllowed = [];
                    if (co.includes("kinder")) offeringAllowed.push("kinder");
                    if (co.includes("elementary") || co.includes("primary")) {
                        offeringAllowed.push("kinder", "g1", "g2", "g3", "g4", "g5", "g6");
                    }
                    if (co.includes("junior high") || co.includes("jhs")) {
                        offeringAllowed.push("g7", "g8", "g9", "g10");
                    }
                    if (co.includes("senior high") || co.includes("shs")) {
                        offeringAllowed.push("g11", "g12");
                    }
                    if (offeringAllowed.length === 0) offeringAllowed = ALL_GRADES_REF.map(g => g.id);

                    // 2. Process Unit 2 Data
                    let filteredGrades = [];
                    if (d.unit2_simplified_enrollment) {
                        try {
                            const u2 = typeof d.unit2_simplified_enrollment === 'string' 
                                ? JSON.parse(d.unit2_simplified_enrollment) 
                                : d.unit2_simplified_enrollment;
                            const q = u2.questionnaire || {};
                            let processedActiveIds = new Set();
                            let processedTotals = {};

                            ALL_GRADES_REF.forEach(g => {
                                const gid = g.id;
                                if (!offeringAllowed.includes(gid)) return;
                                if (q.gradeAvailability?.[gid] !== false && (q.gradeTotals?.[gid] !== undefined || (gid === 'kinder' && q.kinderEnrollment !== undefined))) {
                                    processedActiveIds.add(gid);
                                    processedTotals[gid] = parseInt(q.gradeTotals?.[gid]) || (gid === 'kinder' ? parseInt(q.kinderEnrollment) : 0) || 0;
                                }
                            });

                            (q.mgCombinations || []).forEach(combo => {
                                const comboTot = parseInt(combo.enrollment) || 0;
                                (combo.grades || []).forEach(gid => { if (offeringAllowed.includes(gid)) { processedActiveIds.add(gid); processedTotals[gid] = comboTot; } });
                            });

                            let u2Array = Array.isArray(u2) ? u2 : (u2.array || []);
                            u2Array.forEach(item => {
                                const gid = item.grade_level;
                                if (gid && offeringAllowed.includes(gid)) {
                                    if (q.gradeAvailability?.[gid] === false || item.is_active === false) { processedActiveIds.delete(gid); } 
                                    else { processedActiveIds.add(gid); if (!processedTotals[gid]) processedTotals[gid] = parseInt(item.total) || (parseInt(item.male||0) + parseInt(item.female||0)) || 0; }
                                }
                            });

                            filteredGrades = ALL_GRADES_REF.filter(g => processedActiveIds.has(g.id));
                            setDynamicGrades(filteredGrades);
                            setGradeTotalsMap(processedTotals);
                            setEnrollmentTotal(parseInt(q.grandTotal) || parseInt(d.total_enrollment) || 0);
                        } catch (e) { console.warn("Unit 2 Parse error", e); }
                    } else {
                        filteredGrades = ALL_GRADES_REF.filter(g => offeringAllowed.includes(g.id));
                        setDynamicGrades(filteredGrades);
                        setEnrollmentTotal(parseInt(d.total_enrollment) || 0);
                    }

                    // MASTER PRECEDENCE: Draft > Database
                    if (draft) {
                        setCurrentChapter(draft.currentChapter || 1);
                        setSelectedGroups(draft.selectedGroups || []);
                        setCatIdx(draft.catIdx || 0);
                        setDemographicsData(draft.demographicsData || {});
                        setHasMovement(draft.hasMovement);
                        setMovementIdx(draft.movementIdx || 0);
                        setMovementData(draft.movementData || {});
                        setBmiData(draft.bmiData || { severely_wasted: "", wasted: "", overweight_obese: "" });
                        setIsReviewMode(false);
                        setShowWelcomeBack(true);
                        setTimeout(() => setShowWelcomeBack(false), 3000);
                    } else if (d.unit4_completed) {
                        if (Array.isArray(d.selected_learner_groups)) setSelectedGroups(d.selected_learner_groups);
                        const demoObj = {};
                        const moveObj = {};
                        let hasAnyMove = false;

                        DEMOGRAPHIC_CARDS.forEach(c => {
                            if (c.id === 'als') { if (d.als_total !== undefined && d.als_total !== null) demoObj['als_total'] = d.als_total.toString(); } 
                            else { filteredGrades.forEach(g => { const key = `${c.id}_${g.id}`; if (d[key] !== undefined && d[key] !== null) demoObj[key] = d[key].toString(); }); }
                        });
                        
                        MOVEMENT_TYPES.forEach(m => {
                            filteredGrades.forEach(g => { const key = `${m.id}_${g.id}`; if (d[key] !== undefined && d[key] !== null) { moveObj[key] = d[key].toString(); if (d[key] > 0) hasAnyMove = true; } });
                        });

                        setBmiData({ severely_wasted: d.bmi_severely_wasted?.toString() || "", wasted: d.bmi_wasted?.toString() || "", overweight_obese: d.bmi_overweight_obese?.toString() || "" });
                        setDemographicsData(demoObj);
                        setMovementData(moveObj);
                        if (hasAnyMove) setHasMovement(true);
                        else if (d.updated_at) setHasMovement(false);
                        setIsReviewMode(true);
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
        if (currentCategory === 'als') return parseInt(demographicsData[`als_total`]) || 0;
        return dynamicGrades.reduce((sum, g) => sum + (parseInt(demographicsData[`${currentCategory}_${g.id}`]) || 0), 0);
    }, [currentCategory, demographicsData, dynamicGrades]);

    const currentMovement = MOVEMENT_TYPES[movementIdx];
    
    const moveTotal = useMemo(() => {
        if (!currentMovement) return 0;
        return dynamicGrades.reduce((sum, g) => sum + (parseInt(movementData[`${currentMovement.id}_${g.id}`]) || 0), 0);
    }, [currentMovement, movementData, dynamicGrades]);

    // Computed total for Chapter 5 recap
    const overallDropSum = useMemo(() => dynamicGrades.reduce((s, g) => s + (parseInt(movementData[`dropout_${g.id}`]) || 0), 0), [movementData, dynamicGrades]);
    const overallRepSum = useMemo(() => dynamicGrades.reduce((s, g) => s + (parseInt(movementData[`repeater_${g.id}`]) || 0), 0), [movementData, dynamicGrades]);

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

    const handleSaveDraftAndExit = async () => {
        if (!schoolId) return;
        const draftData = {
            currentChapter,
            selectedGroups,
            catIdx,
            demographicsData,
            hasMovement,
            movementIdx,
            movementData,
            bmiData
        };
        await saveUnitDraft(4, schoolId, draftData);
        navigate("/modular-dashboard");
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
                if (cat === 'als') {
                    payload.als_total = parseInt(demographicsData.als_total) || 0;
                    // Zero out grade-specific ones if they exist
                    dynamicGrades.forEach(g => { payload[`als_${g.id}`] = 0; });
                } else {
                    dynamicGrades.forEach(g => {
                        const key = `${cat}_${g.id}`;
                        payload[key] = parseInt(demographicsData[key]) || 0;
                    });
                }
            });

            // Inject movements
            if (hasMovement) {
                MOVEMENT_TYPES.forEach(m => {
                    dynamicGrades.forEach(g => {
                        const key = `${m.id}_${g.id}`;
                        payload[key] = parseInt(movementData[key]) || 0;
                    });
                });
            } else {
                // Overwrite with zeroes if they said No
                MOVEMENT_TYPES.forEach(m => {
                    dynamicGrades.forEach(g => {
                        payload[`${m.id}_${g.id}`] = 0;
                    });
                });
            }

            // Inject BMI
            payload.bmi_severely_wasted = parseInt(bmiData.severely_wasted) || 0;
            payload.bmi_wasted = parseInt(bmiData.wasted) || 0;
            payload.bmi_overweight_obese = parseInt(bmiData.overweight_obese) || 0;
            payload.bmi_normal = normalBmiCount;

            console.log("UNIT 4 PAYLOAD BEFORE SUBMISSION:", payload);

            let res;
            try {
                res = await fetch(`/api/ph_schools/unit4/${schoolId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } catch (networkErr) {
                console.error("UNIT 4 NETWORK ERROR:", networkErr);
                throw new Error("Network error connecting to the server.");
            }

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                console.error("UNIT 4 EXPLICIT SERVER ERROR:", err);
                throw new Error(err.error || `Server Error ${res.status}`);
            }

            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(4)) {
                progress.completedUnits.push(4);
                progress.xp += 250;
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }

            // Sync progress to dashboard
            try {
                await fetch('/api/user/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ unitId: 4, schoolId })
                });
            } catch (e) { console.warn("Progress sync failed", e); }

            await clearUnitDraft(4, schoolId);
            setShowSuccess(true);
        } catch (err) {
            console.error("UNIT 4 BOTTLENECK CATCH:", err);
            alert("Failed to save data. " + err.message);
        } finally {
            setLoading(false);
        }
    };

    // ── Input Validations ─────────────────────────────────────────────────
    const isStepValid = (() => {
        if (currentChapter === 1) return true; // Empty array allowed
        
        if (currentChapter === 2) {
            const currentCat = selectedGroups[catIdx];
            if (currentCat === 'als') return true; // Global ALS count doesn't validate against grade totals
            
            // Check if any grade in CURRENT category exceeds its cap
            return dynamicGrades.every(g => {
                const val = parseInt(demographicsData[`${currentCat}_${g.id}`]) || 0;
                return val <= (gradeTotalsMap[g.id] || 0);
            });
        }

        if (currentChapter === 3) {
            if (hasMovement === null) return false;
            if (hasMovement === false) return true;
            
            // If hasMovement is true, check current movement type loop
            const currentMove = MOVEMENT_TYPES[movementIdx].id;
            return dynamicGrades.every(g => {
                const val = parseInt(movementData[`${currentMove}_${g.id}`]) || 0;
                return val <= (gradeTotalsMap[g.id] || 0);
            });
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

        const sumMove = (prefix) => dynamicGrades.reduce((s, g) => s + (parseInt(savedData?.[`${prefix}_${g.id}`]) || 0), 0);
        const dropSum = sumMove("dropout");
        const repSum  = sumMove("repeater");

        return (
            <div className="min-h-screen bg-slate-50/50 font-sans">
                {/* Exit Header */}
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                    <div className="max-w-md mx-auto flex items-center gap-3">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <FiX className="w-6 h-6" />
                        </button>
                        <div className="flex-1 text-center">
                            <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Unit 4</div>
                            <h1 className="text-sm font-black text-gray-800">Learner Profile</h1>
                        </div>
                        <div className="w-10" />
                    </div>
                </header>

                <div className="max-w-md mx-auto pb-32 mt-4 px-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200"
                    >
                        <FiUsers className="w-10 h-10 text-white" />
                    </motion.div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm">
                        Unit 4 • Learner Profile
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 leading-tight">Summary</h1>
                    <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 shadow-inner">
                            <FiUsers className="w-6 h-6 text-indigo-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Enrolled</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{enrollmentTotal}</span>
                    </div>
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 shadow-inner">
                            <span className="text-xl">🗂️</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Groups Tracked</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{displayGroups.length}</span>
                    </div>
                </div>

                {/* Subsections */}
                <div className="space-y-6">
                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Special Groups</h3>
                        </div>
                        <div className="grid gap-3">
                            {displayGroups.length === 0 ? (
                                <div className="bg-white rounded-2xl p-4 border border-slate-50 text-center shadow-sm">
                                    <span className="text-slate-400 font-medium italic text-sm">No special groups reported.</span>
                                </div>
                            ) : (
                                displayGroups.map(g => {
                                    const total = g.id === 'als' 
                                        ? (parseInt(savedData?.als_total) || 0)
                                        : dynamicGrades.reduce((sum, gr) => sum + (parseInt(savedData?.[`${g.id}_${gr.id}`]) || 0), 0);
                                    return (
                                        <div key={g.id} className="bg-white rounded-2xl p-4 border border-slate-50 flex items-center justify-between shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <span className="text-2xl">{g.icon}</span>
                                                <span className="font-bold text-slate-700 text-lg">{g.label}</span>
                                            </div>
                                            <div className="bg-indigo-50 px-3 py-1.5 rounded-xl">
                                                <span className="font-black text-indigo-700">{total}</span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </section>

                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Learner Activity</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-red-400 tracking-widest block mb-1">Dropouts</span>
                                <span className="text-2xl font-black text-slate-800">{dropSum}</span>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-orange-400 tracking-widest block mb-1">Repeaters</span>
                                <span className="text-2xl font-black text-slate-800">{repSum}</span>
                            </div>
                        </div>
                    </section>

                    <section>
                        <div className="bg-white border-2 border-indigo-100 rounded-3xl p-5 shadow-sm mt-6">
                             <div className="flex justify-between items-center mb-4">
                                  <div className="flex items-center gap-2">
                                       <span className="text-xl">🥗</span>
                                       <span className="font-black text-slate-700 text-sm">Health Profile</span>
                                   </div>
                              </div>
                              <div className="flex items-center justify-between">
                                   <div className="flex flex-col">
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Normal BMI</span>
                                       <span className="text-xl font-black text-slate-800">{savedData?.bmi_normal || 0}</span>
                                   </div>
                                   <div className="flex flex-col items-end">
                                       <span className="text-2xl font-black text-emerald-600">
                                            {enrollmentTotal > 0 ? (((savedData?.bmi_normal || 0) / enrollmentTotal) * 100).toFixed(0) : 0}%
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
                        onClick={() => { setIsReviewMode(false); setCurrentChapter(1); }}
                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiUnlock className="w-5 h-5 text-indigo-700" />
                        </div>
                        <span>Unlock to Edit Profile</span>
                    </button>
                </motion.div>
                </div>
            </div>
        );
    }

    // ══════════════════════════════════════════════════════════════════════
    // WIZARD MODE
    // ══════════════════════════════════════════════════════════════════════
    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-gray-100 flex flex-col font-sans text-slate-800">
            {/* Welcome Back Toast */}
            <AnimatePresence>
                {showWelcomeBack && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-2xl text-[13px] font-bold flex items-center gap-2 z-[60]">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                        Recovered your draft!
                    </motion.div>
                )}
            </AnimatePresence>

            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm px-4 py-4 mb-2">
                <div className="max-w-xl mx-auto flex items-center justify-start gap-2">
                    <button onClick={handleBack} className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors">
                        <FiArrowLeft className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <main className="flex-1 overflow-y-auto pb-32">
                <div className="max-w-md w-full mx-auto mt-6 px-4">
                    <AnimatePresence mode="wait">

                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 1: The Demographics Gatekeeper
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 1 && (
                            <motion.div key="ch1-u4" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                                <div className="text-center mb-10">
                                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                        Step 1 • Demographics
                                    </span>
                                    <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                        Your School Community
                                    </h1>
                                    <p className="text-slate-500 font-medium italic mx-4">"Which learner groups are present this year?"</p>
                                </div>

                                <div className="space-y-4 px-2">
                                    {DEMOGRAPHIC_CARDS.map((card, idx) => {
                                        const isSelected = selectedGroups.includes(card.id);
                                        const cStyles = isSelected ? colorClasses[card.color] : null;
                                        
                                        return (
                                            <motion.button key={card.id} whileTap={{ scale: 0.98 }}
                                                onClick={() => setSelectedGroups(p => p.includes(card.id) ? p.filter(x => x !== card.id) : [...p, card.id])}
                                                className={`w-full p-6 rounded-[2rem] border-4 transition-all duration-300 flex items-center gap-5 text-left shadow-xl ${isSelected ? `${cStyles.bg} ${cStyles.border} shadow-indigo-100/50 scale-100` : "bg-white border-slate-100 hover:border-indigo-100 grayscale hover:grayscale-0 scale-[0.98]"}`}>
                                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl ${isSelected ? "bg-white shadow-inner" : "bg-slate-50"}`}>
                                                    {card.icon}
                                                </div>
                                                <div className="flex-1">
                                                    <span className={`text-lg font-black tracking-tight ${isSelected ? cStyles.text : "text-slate-700"}`}>{card.label}</span>
                                                    <p className={`text-xs font-bold uppercase tracking-widest mt-1 ${isSelected ? cStyles.text : "text-slate-400 opacity-60"}`}>
                                                        {isSelected ? "Included in Profile" : "Not Selected"}
                                                    </p>
                                                </div>
                                                <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${isSelected ? `bg-white ${cStyles.border}` : "bg-white border-slate-200"}`}>
                                                    {isSelected && <div className={`w-4 h-4 rounded-full ${cStyles.bg.replace("100", "500")}`} />}
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
                                <motion.div key={`ch2-${currentCategory}`} variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }} className="pb-10 px-2">
                                    
                                    <div className="text-center mb-8">
                                        <span className={`inline-block px-4 py-1.5 rounded-full ${cStyle.bg} ${cStyle.text} text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm`}>
                                            Step 2 • {catIdx + 1} of {selectedGroups.length}
                                        </span>
                                        <div className="flex items-center justify-center gap-4 mb-2">
                                            <div className={`w-14 h-14 ${cStyle.bg} border-2 ${cStyle.border} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>{cInfo.icon}</div>
                                            <h1 className="text-3xl font-black text-slate-800 leading-tight">{cInfo.label}</h1>
                                        </div>
                                        <p className="text-slate-500 font-medium italic">"Record the counts for each active grade level."</p>
                                    </div>

                                    {/* Master Switch Panel for Context */}
                                    <div className={`bg-white p-8 rounded-[2.5rem] border-4 transition-all duration-500 shadow-2xl shadow-slate-200/50 ${cStyle.border.replace("500", "100/50")}`}>
                                        
                                        <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50 mb-8">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Profiling</span>
                                                <span className={`text-lg font-bold ${cStyle.text}`}>
                                                    {cInfo.label}
                                                </span>
                                            </div>
                                            <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${cStyle.bg} ${cStyle.text}`}>
                                                Active
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            {currentCategory === 'als' ? (
                                                <div className="space-y-2">
                                                    <div className="flex items-center justify-between px-2">
                                                        <label className="text-xs font-black uppercase tracking-widest text-slate-400">
                                                            Total ALS Learners
                                                        </label>
                                                        <span className="text-[10px] font-bold text-slate-400 uppercase">Independent Count</span>
                                                    </div>
                                                    <div className="relative group">
                                                        <input 
                                                            type="number" min="0" placeholder="0"
                                                            value={demographicsData[`als_total`] || ""}
                                                            onFocus={e => { if (e.target.value === '0') setDemographicsData(prev => ({ ...prev, als_total: "" })) }}
                                                            onChange={e => {
                                                                let val = e.target.value;
                                                                if (val.length > 3) val = val.slice(0, 3);
                                                                setDemographicsData(prev => ({ ...prev, als_total: val }));
                                                            }}
                                                            className="w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-2xl font-black text-slate-700 focus:outline-none focus:border-indigo-400 focus:bg-white focus:shadow-xl focus:shadow-indigo-100/50 transition-all duration-300"
                                                        />
                                                    </div>
                                                    <p className="text-[10px] font-black text-slate-400 text-center uppercase tracking-widest bg-slate-50 py-1 rounded-lg">
                                                        ℹ️ ALS learners are not included in total enrollment caps.
                                                    </p>
                                                </div>
                                            ) : (
                                                dynamicGrades.map(g => {
                                                    const fieldKey = `${currentCategory}_${g.id}`;
                                                    const maxVal = gradeTotalsMap[g.id] || 0;
                                                    const currentVal = parseInt(demographicsData[fieldKey]) || 0;
                                                    const isExceeded = currentVal > maxVal;

                                                    return (
                                                        <div key={g.id} className="space-y-2">
                                                            <div className="flex items-center justify-between px-2">
                                                                <label className={`text-xs font-black uppercase tracking-widest ${isExceeded ? 'text-rose-500' : 'text-slate-400'}`}>
                                                                    {g.label} Total
                                                                </label>
                                                                <span className="text-[10px] font-bold text-slate-400 tracking-tight">UNIT 2 MAX: {maxVal}</span>
                                                            </div>
                                                            <div className="relative group">
                                                                <input 
                                                                    type="number" min="0" placeholder="0"
                                                                    max={maxVal}
                                                                    value={demographicsData[fieldKey] !== undefined ? demographicsData[fieldKey] : ""}
                                                                    onFocus={e => { if (e.target.value === '0') setDemographicsData(prev => ({ ...prev, [fieldKey]: "" })) }}
                                                                    onChange={e => {
                                                                        let val = e.target.value;
                                                                        if (val.length > 3) val = val.slice(0, 3);
                                                                        setDemographicsData(prev => ({ ...prev, [fieldKey]: val }));
                                                                    }}
                                                                    className={`w-full p-5 bg-slate-50 border-4 rounded-3xl text-2xl font-black text-slate-700 focus:outline-none transition-all duration-300 ${isExceeded ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400' : 'border-slate-100 focus:border-indigo-400 focus:bg-white focus:shadow-xl focus:shadow-indigo-100/50'}`}
                                                                />
                                                                {isExceeded && (
                                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-rose-500 text-white rounded-lg shadow-lg animate-bounce">
                                                                        <FiAlertTriangle className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isExceeded && (
                                                                <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest bg-rose-50 py-1 rounded-lg px-2">
                                                                    ⚠️ Limit exceeded. Only {maxVal} students enrolled in {g.label}.
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                        
                                        {/* Auto-sum footer */}
                                        <div className={`mt-10 pt-6 border-t-4 border-dashed ${cStyle.border.replace("500", "100")} flex justify-between items-center px-4`}>
                                            <div className="flex flex-col">
                                                <span className={`text-xs font-black uppercase tracking-[0.2em] ${cStyle.text} opacity-60`}>Grand Total</span>
                                                <span className="text-sm font-bold text-slate-400">Aggregated Counts</span>
                                            </div>
                                            <span className={`text-4xl font-black ${cStyle.text}`}>{catTotal}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })()}


                        {/* ────────────────────────────────────────────────────────
                            CHAPTER 3: Learner Movement (Gatekeeper & Loop)
                            ──────────────────────────────────────────────────────── */}
                        {currentChapter === 3 && (
                            <motion.div key={`ch3-${hasMovement === true ? movementIdx : "gate"}`} variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }} className="pb-10 px-2">
                                
                                {hasMovement === null || hasMovement === false ? (
                                    /* Gatekeeper Screen */
                                    <div className="text-center mt-6">
                                        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                            Step 3 • Movement
                                        </span>
                                        <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                            Learner Movement
                                        </h1>
                                        <p className="text-slate-500 font-medium italic mb-10 px-4">"Did you have any Dropouts last year, or Repeaters this year?"</p>
                                        
                                        <div className="flex gap-4 px-2">
                                            <button onClick={() => setHasMovement(true)} 
                                                className={`flex-1 py-8 rounded-[2rem] font-black text-xl border-4 transition-all flex flex-col items-center gap-3 shadow-xl ${hasMovement === true ? "bg-blue-50 border-blue-200 text-blue-700 scale-100" : "bg-white border-slate-100 text-slate-400 scale-[0.98] grayscale hover:grayscale-0 hover:border-blue-100"}`}>
                                                <span className="text-4xl block mb-1 font-normal">✅</span>
                                                Yes, we do.
                                            </button>
                                            <button onClick={() => { setHasMovement(false); setMovementIdx(0); }} 
                                                className={`flex-1 py-8 rounded-[2rem] font-black text-xl border-4 transition-all flex flex-col items-center gap-3 shadow-xl ${hasMovement === false ? "bg-emerald-50 border-emerald-200 text-emerald-700 scale-100" : "bg-white border-slate-100 text-slate-400 scale-[0.98] grayscale hover:grayscale-0 hover:border-emerald-100"}`}>
                                                <span className="text-4xl block mb-1 font-normal">🚫</span>
                                                No movement.
                                            </button>
                                        </div>

                                        <AnimatePresence>
                                            {hasMovement === false && (
                                                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-10 px-6 text-emerald-600 font-black uppercase tracking-widest text-xs bg-emerald-50 py-3 rounded-2xl border-2 border-emerald-100/50">
                                                    Perfect! Skipping to Health Check.
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>

                                ) : (
                                    /* Loop Screen (Dropouts or Repeaters) */
                                    <div>
                                        <div className="text-center mb-8">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 text-blue-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                                Movement • {movementIdx === 0 ? "Dropouts" : "Repeaters"}
                                            </span>
                                            <div className="flex items-center justify-center gap-4 mb-2">
                                                <div className={`w-14 h-14 ${colorClasses[currentMovement.color].bg} border-2 ${colorClasses[currentMovement.color].border} rounded-2xl flex items-center justify-center text-3xl shadow-lg`}>{currentMovement.icon}</div>
                                                <h1 className="text-3xl font-black text-slate-800 leading-tight">{currentMovement.label}</h1>
                                            </div>
                                            <p className="text-slate-500 font-medium italic">"Breakdown of {currentMovement.label.toLowerCase()} by grade."</p>
                                        </div>

                                        <div className={`bg-white p-8 rounded-[2.5rem] border-4 transition-all duration-500 shadow-2xl shadow-slate-200/50 ${colorClasses[currentMovement.color].border.replace("500", "100/50")}`}>
                                            
                                            <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50 mb-8">
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                                                    <span className={`text-lg font-bold ${colorClasses[currentMovement.color].text}`}>
                                                        Recording Cycle
                                                    </span>
                                                </div>
                                                <div className={`px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest ${colorClasses[currentMovement.color].bg} ${colorClasses[currentMovement.color].text}`}>
                                                    {movementIdx + 1} of 2
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                {dynamicGrades.map(g => {
                                                    const fieldKey = `${currentMovement.id}_${g.id}`;
                                                    const maxVal = gradeTotalsMap[g.id] || 0;
                                                    const currentVal = parseInt(movementData[fieldKey]) || 0;
                                                    const isExceeded = currentVal > maxVal;

                                                    return (
                                                        <div key={g.id} className="space-y-2">
                                                            <div className="flex items-center justify-between px-2">
                                                                <label className={`text-xs font-black uppercase tracking-widest ${isExceeded ? 'text-rose-500' : 'text-slate-400'}`}>
                                                                    {g.label} Total
                                                                </label>
                                                                <span className="text-[10px] font-bold text-slate-400">MAX: {maxVal}</span>
                                                            </div>
                                                            <div className="relative group">
                                                                <input 
                                                                    type="number" min="0" placeholder="0"
                                                                    max={maxVal}
                                                                    value={movementData[fieldKey] !== undefined ? movementData[fieldKey] : ""}
                                                                    onFocus={e => { if (e.target.value === '0') setMovementData(prev => ({ ...prev, [fieldKey]: "" })) }}
                                                                    onChange={e => {
                                                                        let val = e.target.value;
                                                                        if (val.length > 3) val = val.slice(0, 3);
                                                                        setMovementData(prev => ({ ...prev, [fieldKey]: val }));
                                                                    }}
                                                                    className={`w-full p-5 bg-slate-50 border-4 rounded-3xl text-2xl font-black text-slate-700 focus:outline-none transition-all duration-300 ${isExceeded ? 'border-rose-200 bg-rose-50 text-rose-600 focus:border-rose-400' : 'border-slate-100 focus:border-blue-400 focus:bg-white focus:shadow-xl focus:shadow-blue-100/50'}`}
                                                                />
                                                                {isExceeded && (
                                                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 p-2 bg-rose-500 text-white rounded-lg shadow-lg animate-bounce">
                                                                        <FiAlertTriangle className="w-5 h-5" />
                                                                    </div>
                                                                )}
                                                            </div>
                                                            {isExceeded && (
                                                                <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-widest bg-rose-50 py-1 rounded-lg">
                                                                    ⚠️ Limit exceeded. Only {maxVal} students enrolled in {g.label}.
                                                                </p>
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            
                                            {/* Auto-sum footer */}
                                            <div className={`mt-10 pt-6 border-t-4 border-dashed ${colorClasses[currentMovement.color].border.replace("500", "100")} flex justify-between items-center px-4`}>
                                                <div className="flex flex-col">
                                                    <span className={`text-xs font-black uppercase tracking-[0.2em] ${colorClasses[currentMovement.color].text} opacity-60`}>Grand Total</span>
                                                    <span className="text-sm font-bold text-slate-400">Aggregated Counts</span>
                                                </div>
                                                <span className={`text-4xl font-black ${colorClasses[currentMovement.color].text}`}>{moveTotal}</span>
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
                            <motion.div key="ch4-u4" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }} className="pb-10 px-2">
                                
                                <div className="text-center mb-10">
                                    <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                        Step 4 • Health Check
                                    </span>
                                    <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                        Nutritional Status
                                    </h1>
                                    <p className="text-slate-500 font-medium italic">"Based on our latest BMI measurements."</p>
                                </div>

                                {enrollmentTotal === 0 ? (
                                    <div className="bg-white p-8 rounded-[2rem] border-4 border-slate-100 text-center shadow-xl">
                                        <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">⚠️</div>
                                        <h3 className="text-xl font-black text-slate-700 mb-2">Unit 2 Data Missing</h3>
                                        <p className="text-slate-400 text-sm font-medium">Please complete Unit 2: Enrollment first to enable the BMI calculation logic.</p>
                                    </div>
                                ) : (
                                    <div className="bg-white p-8 rounded-[2.5rem] border-4 border-emerald-100/50 shadow-2xl shadow-emerald-100/30">
                                        
                                        <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50 mb-8">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Enrollment</span>
                                                <span className="text-2xl font-black text-slate-700">
                                                    {enrollmentTotal} <span className="text-xs text-slate-400">Learners</span>
                                                </span>
                                            </div>
                                            <div className="px-5 py-3 rounded-2xl bg-emerald-500 text-white font-black text-lg shadow-lg shadow-emerald-100">
                                                <FiActivity />
                                            </div>
                                        </div>

                                        <div className="space-y-6">
                                            {[
                                                { label: "Severely Wasted", key: "severely_wasted", color: "rose" },
                                                { label: "Wasted", key: "wasted", color: "orange" },
                                                { label: "Overweight / Obese", key: "overweight_obese", color: "violet" }
                                            ].map((f) => (
                                                <div key={f.key} className="space-y-2">
                                                    <label className={`text-xs font-black uppercase tracking-widest text-slate-400 ml-2`}>{f.label}</label>
                                                    <input 
                                                        type="number" min="0" placeholder="0"
                                                        value={bmiData[f.key] !== undefined ? bmiData[f.key] : ""}
                                                        onFocus={e => { if (e.target.value === '0') setBmiData(prev => ({ ...prev, [f.key]: "" })) }}
                                                        onChange={e => {
                                                            let val = e.target.value;
                                                            if (val.length > 3) val = val.slice(0, 3);
                                                            setBmiData(p => ({ ...p, [f.key]: val }));
                                                        }}
                                                        className={`w-full p-5 bg-slate-50 border-4 border-slate-100 rounded-3xl text-2xl font-black text-slate-700 focus:outline-none focus:border-${f.color}-400 focus:bg-white focus:shadow-xl transition-all duration-300`}
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div className="mt-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-[2rem] p-[3px] shadow-xl shadow-emerald-200">
                                            <div className="bg-emerald-50 rounded-[1.8rem] p-6 text-center">
                                                <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.3em] mb-2">Automatic Calculation</p>
                                                <div className="flex justify-center items-end gap-2 text-emerald-700">
                                                    <span className="text-5xl font-black leading-none">{Math.max(0, normalBmiCount)}</span>
                                                    <span className="text-sm font-bold uppercase tracking-widest mb-1.5 opacity-60">Normal</span>
                                                </div>
                                                
                                                <div className="mt-4 pt-4 border-t-2 border-emerald-100/50">
                                                    {totalWastedObese > enrollmentTotal ? (
                                                        <div className="flex items-center justify-center gap-2 text-rose-500">
                                                            <FiAlertTriangle className="w-5 h-5" />
                                                            <p className="text-xs font-black uppercase tracking-tighter">Inputs exceed total enrollment!</p>
                                                        </div>
                                                    ) : (
                                                        <p className="text-xs text-emerald-600 font-bold italic opacity-80">
                                                            "Awesome! That means {normalBmiCount} learners are within the healthy range."
                                                        </p>
                                                    )}
                                                </div>
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
                            <motion.div key="ch5-u4" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }} className="pb-10 px-2 text-center">
                                
                                <div className="text-center mt-6">
                                    <span className="inline-block px-4 py-1.5 rounded-full bg-violet-100 text-violet-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                        Step 5 • Review
                                    </span>
                                    <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                        Confirm &amp; Submit
                                    </h1>
                                    <p className="text-slate-500 font-medium italic mb-10 px-4">"One last look before we save everything."</p>
                                </div>

                                <div className="bg-white p-8 rounded-[2.5rem] border-4 border-slate-100 shadow-2xl shadow-slate-200/50 mb-8 space-y-6">
                                    
                                    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🗂️</div>
                                            <div className="text-left">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">Groups</span>
                                                <span className="font-bold text-slate-700">Special Profiles</span>
                                            </div>
                                        </div>
                                        <span className="font-black text-2xl text-violet-600">{selectedGroups.length}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🚶</div>
                                            <div className="text-left">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">Activity</span>
                                                <span className="font-bold text-slate-700">Learner Movement</span>
                                            </div>
                                        </div>
                                        <span className="font-black text-2xl text-blue-600">{overallDropSum + overallRepSum}</span>
                                    </div>

                                    <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-2xl shadow-sm">🥗</div>
                                            <div className="text-left">
                                                <span className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none block mb-1">Health</span>
                                                <span className="font-bold text-slate-700">Normal BMI</span>
                                            </div>
                                        </div>
                                        <span className="font-black text-2xl text-emerald-600">{normalBmiCount}</span>
                                    </div>

                                </div>

                                <motion.button
                                    whileTap={{ scale: 0.98 }}
                                    onClick={() => setIsVerified(!isVerified)}
                                    className={`w-full p-6 rounded-[2rem] flex items-center justify-center gap-4 border-4 transition-all duration-300 ${isVerified ? "bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xl shadow-emerald-100" : "bg-white border-slate-100 text-slate-400"}`}
                                >
                                    <div className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center transition-all ${isVerified ? "bg-emerald-500 border-emerald-600 shadow-md" : "bg-white border-slate-200"}`}>
                                        {isVerified && <FiCheck strokeWidth={4} className="text-white w-5 h-5" />}
                                    </div>
                                    <span className="font-black text-sm uppercase tracking-widest">I verify this data is correct</span>
                                </motion.button>

                            </motion.div>
                        )}


                    </AnimatePresence>
                </div>
            </main>

            {/* ── Sticky Footer ── */}
            <div className="fixed bottom-0 left-0 w-full p-6 bg-white/90 backdrop-blur-md border-t border-slate-100 flex justify-center z-50 shadow-[0_-8px_30px_rgb(0,0,0,0.04)]">
                <div className="w-full max-w-xl flex gap-4">
                    
                    {currentChapter === 1 ? (
                         <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all outline-none">
                             <FiSave className="w-6 h-6" />
                         </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleBack}
                                className="w-16 h-16 flex justify-center items-center rounded-3xl bg-slate-100 text-slate-500 border-2 border-slate-200 active:translate-y-[2px] transition-all">
                                <FiArrowLeft className="w-6 h-6" />
                            </button>
                            <button onClick={() => setShowDraftModal(true)}
                                className="w-16 h-16 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-500 hover:text-blue-700 active:scale-95 transition-all outline-none"
                            >
                                <FiSave className="w-6 h-6" />
                            </button>
                        </div>
                    )}

                    {currentChapter === TOTAL_CHAPTERS ? (
                        <button onClick={handleSubmit} disabled={loading || !isVerified}
                                className="flex-1 h-16 rounded-3xl text-white font-black text-xl bg-emerald-600 border-b-[6px] border-emerald-800 active:border-b-0 active:translate-y-[6px] transition-all duration-100 disabled:opacity-50 shadow-xl shadow-emerald-100 flex justify-center items-center gap-2">
                                {loading ? "Syncing..." : "Submit Profile"}
                        </button>
                    ) : (
                        <button onClick={handleNext} disabled={!isStepValid}
                            className="flex-1 h-16 rounded-3xl text-white font-black text-xl bg-indigo-600 border-b-[6px] border-indigo-800 active:border-b-0 active:translate-y-[6px] transition-all duration-100 disabled:opacity-50 shadow-xl shadow-indigo-100 flex justify-center items-center gap-2 uppercase tracking-widest">
                            {currentChapter === 2 && selectedGroups.length > 1 && catIdx < selectedGroups.length - 1 ? "Next Group" : currentChapter === 1 && selectedGroups.length === 0 ? "Skip Steps" : "Continue"}
                            <FiChevronRight className="w-6 h-6" />
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

            <AnimatePresence>
                {showDraftModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end justify-center">
                        <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-md rounded-t-[3rem] p-10 pb-12 shadow-2xl relative">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                            <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto flex items-center justify-center text-3xl shadow-2xl shadow-blue-200 mb-6 font-bold text-white">
                                <FiSave />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 text-center leading-tight">Save Progress?</h2>
                            <p className="text-gray-500 text-center font-medium mt-3 px-4">Would you like to save your progress and go back to the modules overview?</p>
                            
                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <button onClick={() => setShowDraftModal(false)}
                                    className="py-5 rounded-[2rem] bg-gray-100 text-gray-900 font-black text-lg active:scale-95 transition-all outline-none">
                                    Continue
                                </button>
                                <button onClick={handleSaveDraftAndExit}
                                    className="py-5 rounded-[2rem] bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all outline-none">
                                    Save & Exit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Unit4LearnerProfile;
