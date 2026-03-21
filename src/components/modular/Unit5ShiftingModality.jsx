import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiArrowLeft, FiCheckCircle, FiEdit2, FiCheck, FiClock, FiAlertTriangle, FiMonitor, FiRadio, FiBook, FiLayers, FiUnlock, FiSave } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";

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
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [curricularOffering, setCurricularOffering] = useState("");
    const [showDraftModal, setShowDraftModal] = useState(false);

    // ── Dynamic grades based on curricular offering ──────────────────────
    const activeGrades = useMemo(() => {
        let coLower = (curricularOffering || "").toLowerCase();
        let keys = [];
        if (coLower.includes("kinder")) keys.push("kinder");
        if (coLower.includes("elementary") || coLower.includes("primary")) {
            keys.push("kinder", "g1", "g2", "g3", "g4", "g5", "g6");
        }
        if (coLower.includes("junior high") || coLower.includes("jhs")) {
            keys.push("g7", "g8", "g9", "g10");
        }
        if (coLower.includes("senior high") || coLower.includes("shs")) {
            keys.push("g11", "g12");
        }
        // Safety
        if (keys.length === 0) keys = Object.keys(GRADE_LABEL_MAP);
        
        // Ensure unique keys (in case of overlap like elementary + jhs)
        const uniqueKeys = Array.from(new Set(keys));
        return uniqueKeys.map(k => ({ key: k, label: GRADE_LABEL_MAP[k] }));
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
    // ── Navigation ──────────────────────────────────────────────────────────
    // Added specific local state properly decoupled from the memoized Curriculum list
    const [filteredGrades, setFilteredGrades] = useState([]);

    // ── Data fetch on mount ─────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem("schoolId");
            if (!storedId) return;
            setSchoolId(storedId);

            try {
                const draft = await getUnitDraft(5, storedId);
                const res = await fetch(`/api/ph_schools/${storedId}?t=${Date.now()}`);
                
                if (res.ok) {
                    const saved = await res.json();
                    let d = (saved.exists && saved.data) ? saved.data : {};

                    // Fallback to local quest progress for curricular offering
                    if (!d.curricular_offering) {
                        try {
                            const qp = JSON.parse(localStorage.getItem('quest_progress') || '{}');
                            d.curricular_offering = qp.curricular_offering || "";
                        } catch (e) {}
                    }

                    setCurricularOffering(d.curricular_offering || "");
                    
                    let offeringKeys = [];
                    let coLower = (d.curricular_offering || "").toLowerCase();
                    if (coLower.includes("kinder")) offeringKeys.push("kinder");
                    if (coLower.includes("elementary") || coLower.includes("primary")) {
                        offeringKeys.push("kinder", "g1", "g2", "g3", "g4", "g5", "g6");
                    }
                    if (coLower.includes("junior high") || coLower.includes("jhs")) {
                        offeringKeys.push("g7", "g8", "g9", "g10");
                    }
                    if (coLower.includes("senior high") || coLower.includes("shs")) {
                        offeringKeys.push("g11", "g12");
                    }
                    if (offeringKeys.length === 0) offeringKeys = Object.keys(GRADE_LABEL_MAP);

                    let baseGrades = offeringKeys.map(k => ({ key: k, label: GRADE_LABEL_MAP[k] }));
                    let finalGrades = baseGrades;

                    if (d.unit2_simplified_enrollment) {
                        try {
                            const u2 = typeof d.unit2_simplified_enrollment === 'string' 
                                ? JSON.parse(d.unit2_simplified_enrollment) 
                                : d.unit2_simplified_enrollment;
                            const q = u2.questionnaire || {};
                            let processedActiveIds = new Set();
                            baseGrades.forEach(g => {
                                const isAvail = q.gradeAvailability?.[g.key] !== false;
                                const hasData = q.gradeTotals?.[g.key] !== undefined || (g.key === 'kinder' && q.kinderEnrollment !== undefined);
                                if (isAvail && hasData) processedActiveIds.add(g.key);
                            });
                            (q.mgCombinations || []).forEach(combo => { (combo.grades || []).forEach(gid => processedActiveIds.add(gid)); });
                            let u2Array = Array.isArray(u2) ? u2 : (u2.array || []);
                            u2Array.forEach(item => {
                                if (item.grade_level) {
                                    if (q.gradeAvailability?.[item.grade_level] === false || item.is_active === false) processedActiveIds.delete(item.grade_level);
                                    else processedActiveIds.add(item.grade_level);
                                }
                            });
                            if (processedActiveIds.size > 0) finalGrades = baseGrades.filter(g => processedActiveIds.has(g.key));
                        } catch (e) { console.warn("Unit 2 Parse error in Unit 5", e); }
                    }

                    setFilteredGrades(finalGrades);

                    // MASTER PRECEDENCE: Draft > Database
                    if (draft) {
                        setCurrentChapter(draft.currentChapter || 1);
                        setHasStandardShifting(draft.hasStandardShifting);
                        setGradeIdx(draft.gradeIdx || 0);
                        setMapData(draft.mapData || {});
                        setHasAdms(draft.hasAdms);
                        setAdmData(draft.admData || { adm_mdl: false, adm_odl: false, adm_tvi: false, adm_blended: false });
                        setIsReviewMode(false); // Force edit mode for drafts
                        setShowWelcomeBack(true);
                        setTimeout(() => setShowWelcomeBack(false), 3000);
                    } else if (d.unit5_completed) {
                        setSavedData(d);
                        setHasStandardShifting(d.has_standard_shifting);
                        const prefillMap = {};
                        finalGrades.forEach(g => {
                            prefillMap[`shift_${g.key}`] = d[`shift_${g.key}`] || "";
                            prefillMap[`mode_${g.key}`] = d[`mode_${g.key}`] || "";
                        });
                        setMapData(prefillMap);
                        setHasAdms(d.adm_mdl || d.adm_odl || d.adm_tvi || d.adm_blended);
                        setAdmData({
                            adm_mdl: !!d.adm_mdl, adm_odl: !!d.adm_odl, adm_tvi: !!d.adm_tvi, adm_blended: !!d.adm_blended
                        });
                        setIsReviewMode(true);
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
        if (!filteredGrades.length) return true;
        const currentFieldShift = mapData[`shift_${filteredGrades[gradeIdx]?.key}`];
        const currentFieldMode = mapData[`mode_${filteredGrades[gradeIdx]?.key}`];
        return !!currentFieldShift && !!currentFieldMode;
    };

    const isStep3Valid = hasAdms === false || (hasAdms === true && Object.values(admData).some(v => v));

    // ── Progress ────────────────────────────────────────────────────────────
    const progressPercentage = (() => {
        if (currentChapter === 1) return 15;
        if (currentChapter === 2) return 15 + ((gradeIdx + 1) / (filteredGrades.length || 1)) * 45; // up to 60
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
                filteredGrades.forEach(g => {
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
            if (gradeIdx < filteredGrades.length - 1) {
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

    const handleSaveDraftAndExit = async () => {
        if (!schoolId) return;
        const draftData = {
            currentChapter,
            hasStandardShifting,
            gradeIdx,
            mapData,
            hasAdms,
            admData
        };
        await saveUnitDraft(5, schoolId, draftData);
        navigate("/modular-dashboard");
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

            // Sync progress to dashboard
            try {
                await fetch('/api/user/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ unitId: 5, schoolId })
                });
            } catch (e) { console.warn("Progress sync failed", e); }

            // Ensure app syncs to start the dashboard animation correctly
            window.dispatchEvent(new Event("storage"));
            await clearUnitDraft(5, schoolId);
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
            <div className="min-h-screen bg-slate-50/50 font-sans">
                {/* Exit Header */}
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                    <div className="max-w-md mx-auto flex items-center gap-3">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <FiArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 text-center">
                            <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Unit 5</div>
                            <h1 className="text-sm font-black text-gray-800">Shifting & Modality</h1>
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
                        <FiClock className="w-10 h-10 text-white" />
                    </motion.div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm">
                        Unit 5 • Modality Profile
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 leading-tight">Summary</h1>
                    <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 shadow-inner">
                            <span className="text-xl">🏫</span>
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Base Setup</span>
                        <span className="text-xl font-black text-slate-800 mt-1">
                            {hasStandardShifting ? "Standard" : "Mixed"}
                        </span>
                    </div>
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-3 shadow-inner">
                            <FiAlertTriangle className="w-6 h-6 text-rose-600" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Emergency ADMs</span>
                        <span className="text-xl font-black text-slate-800 mt-1">
                            {hasAdms ? "Active Tracker" : "None Utilized"}
                        </span>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-6">
                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Schedule Mapping</h3>
                        </div>
                        
                        {hasStandardShifting ? (
                            <div className="bg-white rounded-2xl p-6 border border-slate-50 text-center shadow-sm">
                                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-3">
                                    <FiCheckCircle className="w-8 h-8 text-indigo-500" />
                                </div>
                                <h4 className="font-black text-slate-800 text-lg mb-1">100% Homogeneous</h4>
                                <p className="text-sm font-medium text-slate-500">All grades strictly track Single Shift and In-Person classes.</p>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {filteredGrades.map(g => (
                                    <div key={g.key} className="bg-white rounded-2xl p-4 border border-slate-50 flex flex-col shadow-sm">
                                        <span className="font-bold text-slate-700 text-lg mb-2 pl-1 border-l-4 border-indigo-400">{g.label}</span>
                                        <div className="flex gap-2">
                                            <div className="bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100">
                                                <span className="font-bold text-slate-600 text-[10px] uppercase">{mapData[`shift_${g.key}`]}</span>
                                            </div>
                                            <div className="bg-indigo-50 px-3 py-1.5 rounded-xl border border-indigo-100">
                                                <span className="font-bold text-indigo-600 text-[10px] uppercase">{mapData[`mode_${g.key}`]}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>

                    {hasAdms && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 ml-2">
                                <div className="w-1 h-4 bg-rose-500 rounded-full" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Active ADMs</h3>
                            </div>
                            <div className="bg-white rounded-2xl p-5 border border-slate-50 shadow-sm">
                                <div className="flex flex-wrap gap-2">
                                    {Object.entries(admData).map(([k, v]) => {
                                        if (!v) return null;
                                        const match = ADM_CARDS.find(c => c.id === k);
                                        return (
                                            <div key={k} className="bg-rose-50 text-rose-700 font-bold text-xs px-3 py-2 rounded-xl flex items-center gap-2">
                                                {match?.icon && <span className="scale-75">{match.icon}</span>}
                                                {match?.label}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </section>
                    )}
                </div>

                {/* Unlock Action */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12"
                >
                    <button 
                        onClick={() => { setIsReviewMode(false); setCurrentChapter(1); setIsVerified(false); }}
                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiUnlock className="w-5 h-5 text-indigo-700" />
                        </div>
                        <span>Unlock to Edit Modality</span>
                    </button>
                </motion.div>
                </div>
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
                        <FiArrowLeft className="w-6 h-6 text-gray-400 hover:text-gray-600" />
                    </button>
                    <div className="mx-4 h-4 bg-gray-200 rounded-full overflow-hidden flex-1">
                        <motion.div className="h-full bg-indigo-500 rounded-full" animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.4 }} />
                    </div>
                </div>
            </header>

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
                            if (!filteredGrades.length || gradeIdx >= filteredGrades.length) return null;
                            const { key, label } = filteredGrades[gradeIdx];
                            const currentShift = mapData[`shift_${key}`];
                            const currentMode = mapData[`mode_${key}`];

                            return (
                                <motion.div key={`ch2-${key}`} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                    
                                    {/* Pagination Mini-Nav */}
                                    <div className="flex justify-center gap-1.5 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                                        {filteredGrades.map((_, i) => (
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
                    {currentChapter === 1 ? (
                        <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all outline-none">
                            <FiSave className="w-6 h-6" />
                        </button>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={handleBack}
                                className="w-16 h-16 flex justify-center items-center rounded-3xl bg-slate-100 text-slate-500 border-2 border-slate-200 active:translate-y-[2px] transition-all outline-none">
                                <FiArrowLeft className="w-6 h-6" />
                            </button>
                            <button onClick={() => setShowDraftModal(true)}
                                className="w-16 h-16 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-500 hover:text-blue-700 active:scale-95 transition-all outline-none"
                            >
                                <FiSave className="w-6 h-6" />
                            </button>
                        </div>
                    )}
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
                onClose={() => navigate("/modular/unit-6")} 
                redirectUrl="/modular/unit-6"
                title="Amazing!" 
                message="You've successfully mapped out your Shifting and Modalities." 
                buttonText="Back to Quest Board" 
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

export default Unit5ShiftingModality;
