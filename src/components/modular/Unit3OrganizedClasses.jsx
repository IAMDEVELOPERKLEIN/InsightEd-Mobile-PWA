import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiChevronRight, FiChevronLeft, FiLayers, FiUsers, FiUnlock, FiSave, FiArrowLeft } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";

// ── Shared styles ─────────────────────────────────────────────────────────────
const chunkyInput = "w-full p-4 mt-2 bg-gray-50 border-2 border-slate-200 rounded-2xl text-xl font-black text-slate-700 text-center focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50 disabled:bg-slate-100";
const subInput = "w-full p-3 mt-1 bg-white border-2 border-slate-200 rounded-xl text-lg font-bold text-slate-700 text-center focus:outline-none focus:border-indigo-400 focus:bg-indigo-50 hover:border-slate-300 transition-colors shadow-sm disabled:opacity-50 disabled:bg-slate-100";

const ALL_GRADES = [
    { label: "Kindergarten", id: "kinder" },
    { label: "Grade 1", id: "g1" },
    { label: "Grade 2", id: "g2" },
    { label: "Grade 3", id: "g3" },
    { label: "Grade 4", id: "g4" },
    { label: "Grade 5", id: "g5" },
    { label: "Grade 6", id: "g6" },
    { label: "Grade 7", id: "g7" },
    { label: "Grade 8", id: "g8" },
    { label: "Grade 9", id: "g9" },
    { label: "Grade 10", id: "g10" },
    { label: "Grade 11", id: "g11" },
    { label: "Grade 12", id: "g12" },
];

const getClassSizeOptions = (className) => {
    const name = (className || "").toLowerCase().trim();
    
    if (name.includes("&") || name.includes("joined") || name.includes("multigrade")) {
        return ["< 25 learners", "25 learners", "> 25 learners"];
    }
    if (name.includes("kinder")) {
        return ["< 25 learners", "25-30 learners", "> 30 learners"];
    }
    if (name === "grade 1" || name === "grade 2" || name === "grade 3") {
        return ["< 30 learners", "30-35 learners", "> 35 learners"];
    }
    if (name === "grade 11" || name === "grade 12") {
        return ["< 45 learners", "45 learners", "> 45 learners"];
    }
    // Default for Grades 4-10
    return ["< 40 learners", "40-45 learners", "> 45 learners"];
};

const Unit3OrganizedClasses = ({ targetSchoolId, isReadOnly: propReadOnly }) => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);

    const [isFetching, setIsFetching] = useState(true);
    const [fetchError, setFetchError] = useState(null);

    // Dynamic Grades State
    const [availableGrades, setAvailableGrades] = useState([]);
    const [hasElementary, setHasElementary] = useState(false);

    // Wizard State
    // Steps mapping:
    // 0: Multigrade (skipped if hasElementary === false)
    // 1 to N: Grades in availableGrades
    const [currentStep, setCurrentStep] = useState(0);

    // Form State
    const [sectionData, setSectionData] = useState({});

    // Summary & Enrollment State
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [totalEnrollment, setTotalEnrollment] = useState(0);

    const parseClassStructure = (d) => {
        let activeClasses = [];
        let parsedData = {};
        let isActuallySaved = false;
        
        // --- 0. Parse Unit 2 Data for Strict Filtering ---
        let u2ActiveGrades = {}; // Map of gradeId -> { is_active, total }
        if (d.unit2_simplified_enrollment) {
            try {
                const u2Raw = typeof d.unit2_simplified_enrollment === 'string'
                    ? JSON.parse(d.unit2_simplified_enrollment)
                    : d.unit2_simplified_enrollment;
                
                const u2Arr = Array.isArray(u2Raw) ? u2Raw : (u2Raw.array || []);
                u2Arr.forEach(item => {
                    u2ActiveGrades[item.grade_level] = {
                        is_active: item.is_active !== false,
                        total: parseInt(item.total) || 0
                    };
                });
            } catch (e) { console.warn("U2 Parse Error in Unit 3", e); }
        }

        // 1. Check Multigrade Slots (Primary Source for groupings)
        for (let i = 1; i <= 3; i++) {
            const groupName = d[`multigrade_groupings_${i}`];
            const groupSize = d[`multigrade_size_${i}`];
            const groupSections = d[`multigrade_sections_${i}`] || 0; 

            if (groupName) {
                const id = `mg_${i}`;
                activeClasses.push({ label: groupName, id });
                parsedData[id] = { 
                    selectedSize: groupSize || null, 
                    total_sections: groupSections || 0,
                    col_below: 0,
                    col_within: 0,
                    col_above: 0
                };
                if (groupSize) isActuallySaved = true;
            }
        }
        
        // 2. Check Single Grades
        const singleGradeMappings = [
            { key: 'grade_kinder_size', label: 'Kindergarten', id: 'kinder' },
            { key: 'grade_1_size', label: 'Grade 1', id: 'g1' },
            { key: 'grade_2_size', label: 'Grade 2', id: 'g2' },
            { key: 'grade_3_size', label: 'Grade 3', id: 'g3' },
            { key: 'grade_4_size', label: 'Grade 4', id: 'g4' },
            { key: 'grade_5_size', label: 'Grade 5', id: 'g5' },
            { key: 'grade_6_size', label: 'Grade 6', id: 'g6' },
            { key: 'grade_7_size', label: 'Grade 7', id: 'g7' },
            { key: 'grade_8_size', label: 'Grade 8', id: 'g8' },
            { key: 'grade_9_size', label: 'Grade 9', id: 'g9' },
            { key: 'grade_10_size', label: 'Grade 10', id: 'g10' },
            { key: 'grade_11_size', label: 'Grade 11', id: 'g11' },
            { key: 'grade_12_size', label: 'Grade 12', id: 'g12' }
        ];

        // Track multigrade labels to hide joined single grades
        const mgLabels = activeClasses.map(ac => ac.label.toLowerCase());

        // Determine which single grades are actually active in the school
        let co = (d.curricular_offering || "").toLowerCase();
        let offeringGrades = [];
        if (co.includes("integrated") || co.includes("k-12") || co.includes("k to 12") || co.includes("k-10") || co.includes("k to 10")) {
            offeringGrades = singleGradeMappings.map(m => m.id);
        } else {
            if (co.includes("kinder")) offeringGrades.push("kinder");
            if (co.includes("elementary") || co.includes("primary")) {
                offeringGrades.push("kinder", "g1", "g2", "g3", "g4", "g5", "g6");
            }
            if (co.includes("junior high") || co.includes("jhs")) {
                offeringGrades.push("g7", "g8", "g9", "g10");
            }
            if (co.includes("senior high") || co.includes("shs")) {
                offeringGrades.push("g11", "g12");
            }
        }
        offeringGrades = [...new Set(offeringGrades)];

        singleGradeMappings.forEach(mapping => {
            const size = d[mapping.key];
            
            // --- STRICT FILTERING LOGIC ---
            // A grade is allowed iff:
            // 1. It is in the general Curricular Offering
            // 2. AND (If Unit 2 is saved) it is marked ACTIVE and has TOTAL > 0
            
            const isOffered = offeringGrades.includes(mapping.id);
            const u2Data = u2ActiveGrades[mapping.id];
            
            // If u2Data exists, it must be active and have count > 0.
            // If u2Data doesn't exist (not saved yet), we fall back to general offering.
            const isActuallyActive = u2Data 
                ? (u2Data.is_active && u2Data.total > 0)
                : isOffered;

            if (!isActuallyActive) return;

            // Check if this single grade is part of ANY multigrade label
            const isJoined = mgLabels.some(label => {
                const gradeNum = mapping.label.replace(/\D/g, "");
                if (gradeNum) {
                    const numRegex = new RegExp(`\\b${gradeNum}\\b`);
                    return numRegex.test(label) || label.includes(mapping.label.toLowerCase());
                }
                return label.includes(mapping.label.toLowerCase());
            });

            if (!isJoined) {
                activeClasses.push({ label: mapping.label, id: mapping.id });
                parsedData[mapping.id] = { 
                    selectedSize: size || null, 
                    total_sections: 0,
                    col_below: 0,
                    col_within: 0,
                    col_above: 0
                };
                if (size) isActuallySaved = true;
            }
        });

        return { activeClasses, parsedData, isActuallySaved };
    };

    useEffect(() => {
        const init = async () => {
            setIsFetching(true);
            setFetchError(null);
            
            const storedId = targetSchoolId || localStorage.getItem("schoolId");
            if (!storedId) {
                setFetchError("School ID not found. Please re-login.");
                setIsFetching(false);
                return;
            }
            setSchoolId(storedId);

            try {
                // Check for Draft First
                const draft = await getUnitDraft(3, storedId);

                const res = await fetch(`/api/ph_schools/${storedId}`);
                if (!res.ok) {
                    throw new Error("Failed to fetch. Please check your connection.");
                }
                
                const saved = await res.json();
                if (saved.exists && saved.data) {
                    const d = saved.data;
                    setTotalEnrollment(d.total_enrollment || 0);
                    
                    // --- New Fixed-Column Hydration ---
                    const { activeClasses, parsedData, isActuallySaved } = parseClassStructure(d);
                    setAvailableGrades(activeClasses);

                    // If unit3 counts are saved, restore them into sectionData
                    let sectionCounts = {};
                    if (d.unit3_simplified_counts) {
                        try {
                            const raw = typeof d.unit3_simplified_counts === 'string'
                                ? JSON.parse(d.unit3_simplified_counts)
                                : d.unit3_simplified_counts;
                            const arr = Array.isArray(raw) ? raw : (raw.array || []);
                            
                            arr.forEach(item => {
                                sectionCounts[item.grade_level] = {
                                    total_sections: item.total_sections || 0,
                                    col_below: item.col_below || 0,
                                    col_within: item.col_within || 0,
                                    col_above: item.col_above || 0,
                                    selectedSize: item.class_size || item.selectedSize || null
                                };
                            });
                        } catch (e) { console.warn("Unit3 parse err", e); }
                    }

                    // Merge parsed structure with saved counts
                    let mergedData = {};
                    activeClasses.forEach(ac => {
                        mergedData[ac.id] = {
                            selectedSize: parsedData[ac.id]?.selectedSize || sectionCounts[ac.id]?.selectedSize || null,
                            total_sections: sectionCounts[ac.id]?.total_sections || 0,
                            col_below: sectionCounts[ac.id]?.col_below || 0,
                            col_within: sectionCounts[ac.id]?.col_within || 0,
                            col_above: sectionCounts[ac.id]?.col_above || 0
                        };
                    });

                    // MASTER DATA PRECEDENCE: Draft > Database
                    if (draft) {
                        setSectionData(draft.sectionData || mergedData);
                        setCurrentStep(draft.step !== undefined ? draft.step : 1);
                        setIsReadOnly(false); // Force edit mode for drafts
                        setShowWelcomeBack(true);
                        setTimeout(() => setShowWelcomeBack(false), 3000);
                    } else {
                        setSectionData(mergedData);
                        if (isActuallySaved || d.unit3_completed || propReadOnly) {
                            setIsReadOnly(true);
                            setCurrentStep(1);
                        } else {
                            setIsReadOnly(false);
                            setCurrentStep(1);
                            if (activeClasses.length === 0) {
                                setFetchError("No active classes found. Please complete Unit 2.");
                            }
                        }
                    }
                    
                    setIsFetching(false);
                } else {
                    throw new Error("Invalid data format received.");
                }
            } catch (e) {
                console.warn("Could not fetch Unit 3 data", e);
                setFetchError(e.message || "An unexpected error occurred while loading class data.");
                setIsFetching(false);
            }
        };
        init();
    }, []);

    const handleChange = (gradeId, field, value) => {
        let val = value;
        if (field === 'total_sections' || field.startsWith('col_')) {
            // Trim to 2 digits maximum
            if (val.length > 2) val = val.slice(0, 2);
            val = parseInt(val) || 0;
        }
        setSectionData(prev => ({ 
            ...prev, 
            [gradeId]: {
                ...prev[gradeId],
                [field]: val
            }
        }));
    };

    // Wizard Navigation Logic
    const totalSteps = availableGrades.length;
    const canGoBack = currentStep > 1;
    const isEditingGrade = currentStep > 0 && currentStep <= totalSteps;
    const currentGrade = isEditingGrade ? availableGrades[currentStep - 1] : null;

    // Wizard Validation Logic for Current Step Only
    const isCurrentStepValid = useMemo(() => {
        if (isEditingGrade && currentGrade) {
            const data = sectionData[currentGrade.id] || { total_sections: 0, col_below: 0, col_within: 0, col_above: 0 };
            const total = parseInt(data.total_sections) || 0;
            if (total === 0) return true; // Can bypass if 0 sections
            
            const sum = (parseInt(data.col_below) || 0) + (parseInt(data.col_within) || 0) + (parseInt(data.col_above) || 0);
            return sum === total;
        }
        return true;
    }, [currentStep, isEditingGrade, currentGrade, sectionData]);

    const handleBack = () => {
        if (canGoBack) setCurrentStep(prev => prev - 1);
    };

    const handleNext = () => {
        if (isCurrentStepValid) {
            // If we are on the last grade, move to Step N+1 (Confirmation)
            setCurrentStep(prev => prev + 1);
        }
    };

    const handleSaveDraftAndExit = async () => {
        if (!schoolId) return;
        await saveUnitDraft(3, schoolId, { sectionData, step: currentStep });
        navigate("/modular-dashboard");
    };

    const handleFinalSubmit = async () => {
        if (!schoolId || !isCurrentStepValid) return;
        setLoading(true);

        try {
            // Build the simplified counts array
            const payloadArray = availableGrades.map(g => {
                const data = sectionData[g.id] || { total_sections: 0, col_below: 0, col_within: 0, col_above: 0 };
                return {
                    grade_level: g.id,
                    is_active: true,
                    total_sections: data.total_sections,
                    col_below: data.col_below,
                    col_within: data.col_within,
                    col_above: data.col_above
                };
            });

            const payload = {
                has_multigrade: availableGrades.some(g => g.id.startsWith("mg_")),
                multigrade_sections_count: 0,
                multigrade_groups: null,
                unit3_simplified_counts: JSON.stringify(payloadArray)
            };

            // Extract the strings cleanly for API routing
            availableGrades.forEach(g => {
                const data = sectionData[g.id] || { total_sections: 0, col_below: 0, col_within: 0, col_above: 0 };
                const pills = getClassSizeOptions(g.label);
                
                // Construct a summary string for the flat text column
                let summaryParts = [];
                if (data.col_below > 0) summaryParts.push(`${data.col_below} (${pills[0]})`);
                if (data.col_within > 0) summaryParts.push(`${data.col_within} (${pills[1]})`);
                if (data.col_above > 0) summaryParts.push(`${data.col_above} (${pills[2]})`);
                
                const sSize = summaryParts.length > 0 ? summaryParts.join(", ") : null;

                if (g.id === "kinder") payload.grade_kinder_size = sSize;
                else if (g.id.startsWith("g")) payload[`grade_${g.id.replace('g', '')}_size`] = sSize;
                else if (g.id.startsWith("mg_")) {
                    const idx = g.id.split("_")[1];
                    payload[`multigrade_groupings_${idx}`] = g.label;
                    payload[`multigrade_size_${idx}`] = sSize;
                }
            });

            const res = await fetch(`/api/ph_schools/unit3/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save class organization");

            // Sync progress to cloud (fire-and-forget)
            try {
                await fetch('/api/user/progress', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ unitId: 3, schoolId })
                });
            } catch (e) { console.warn("Progress sync failed", e); }

            // Update localStorage so ModularDashboard immediately reflects completion
            const stored = localStorage.getItem('quest_progress');
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(3)) {
                progress.completedUnits.push(3);
                progress.xp = (progress.xp || 0) + 200;
            }
            localStorage.setItem('quest_progress', JSON.stringify(progress));

            await clearUnitDraft(3, schoolId);
            setShowSuccess(true);
            setTimeout(() => {
                setShowSuccess(false);
                navigate("/modular-dashboard");
            }, 2500);
        } catch (err) {
            alert(err.message);
        }
        setLoading(false);
    };

    // Calculate overall wizard progress percentage
    const progressPercent = useMemo(() => {
        // Steps: Grades + Confirmation
        const total = totalSteps + 1; 
        const current = currentStep; 
        if (total === 0) return 0;
        return (current / total) * 100;
    }, [currentStep, totalSteps]);

    const Unit3ClassesSummary = () => {
        // Calculate Total Classes across active grades
        const totalClasses = (availableGrades || []).reduce((sum, g) => {
            const data = sectionData[g.id] || {};
            return sum + (data.total_sections || 0);
        }, 0);

        const averageClassSize = totalClasses > 0 ? Math.round(totalEnrollment / totalClasses) : 0;

        // Calculate global distribution percentages
        const distribution = (availableGrades || []).reduce((acc, g) => {
            const data = sectionData[g.id] || {};
            acc.below += (data.col_below || 0);
            acc.within += (data.col_within || 0);
            acc.above += (data.col_above || 0);
            return acc;
        }, { below: 0, within: 0, above: 0 });

        const getPercent = (val) => totalClasses > 0 ? Math.round((val / totalClasses) * 100) : 0;

        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-md mx-auto pb-32 mt-4 space-y-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="w-20 h-20 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-teal-100"
                    >
                        <FiLayers className="w-10 h-10 text-white" />
                    </motion.div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-teal-50 text-teal-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-teal-100">
                        Unit 3 • Section Organization
                    </span>
                    <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight px-4 text-center">Classroom Registry</h1>
                    <p className="text-slate-500 font-medium mt-2 italic px-4 text-center">"Section distribution and class-size optimization report"</p>
                </div>

                {/* Main Stats */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-teal-100 relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">📋</div>
                    <div className="relative z-10">
                        <p className="text-teal-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2 text-center">Overall Class Capacity</p>
                        <div className="flex items-center justify-around py-4 border-y border-white/10 mt-4">
                            <div className="text-center">
                                <p className="text-4xl font-black leading-none">{totalClasses}</p>
                                <p className="text-[9px] font-bold text-teal-400 uppercase mt-2 tracking-widest">Total Sections</p>
                            </div>
                            <div className="w-px h-12 bg-white/10" />
                            <div className="text-center">
                                <p className="text-4xl font-black leading-none">{averageClassSize}</p>
                                <p className="text-[9px] font-bold text-teal-400 uppercase mt-2 tracking-widest">Avg Size</p>
                            </div>
                        </div>

                        {/* Distribution Visualizer */}
                        <div className="mt-8 space-y-3">
                            <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-teal-200">
                                <span>Size Distribution</span>
                                <span>In Standard: {getPercent(distribution.within)}%</span>
                            </div>
                            <div className="h-3 w-full bg-white/10 rounded-full overflow-hidden flex">
                                <div style={{ width: `${getPercent(distribution.below)}%` }} className="h-full bg-blue-400" title="Below Standard" />
                                <div style={{ width: `${getPercent(distribution.within)}%` }} className="h-full bg-emerald-400" title="Within Standard" />
                                <div style={{ width: `${getPercent(distribution.above)}%` }} className="h-full bg-rose-400" title="Above Standard" />
                            </div>
                            <div className="flex justify-between gap-2">
                                <span className="flex items-center gap-1 text-[8px] font-black uppercase text-blue-300">
                                    <div className="w-1.5 h-1.5 bg-blue-400 rounded-full" /> Below
                                </span>
                                <span className="flex items-center gap-1 text-[8px] font-black uppercase text-emerald-300">
                                    <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" /> In-Standard
                                </span>
                                <span className="flex items-center gap-1 text-[8px] font-black uppercase text-rose-300">
                                    <div className="w-1.5 h-1.5 bg-rose-400 rounded-full" /> Over
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Detailed Breakdown */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-6 bg-teal-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Grade-by-Grade Detail</h3>
                        </div>
                    </div>

                    <div className="grid gap-4">
                        {(availableGrades || []).map(g => {
                            const data = sectionData[g.id] || {};
                            if (!data.is_active && data.is_active !== undefined) return null;
                            const pills = getClassSizeOptions(g.label);
                            const isMG = g.id.startsWith("mg_");
                            
                            return (
                                <div key={g.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:border-teal-200 transition-colors">
                                    <div className="flex items-start justify-between relative z-10">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h4 className="text-xl font-black text-slate-800 tracking-tight">{g.label}</h4>
                                                {isMG && <span className="px-2 py-0.5 rounded-lg bg-rose-50 text-rose-600 text-[8px] font-black uppercase border border-rose-100 tracking-tighter">Multigrade</span>}
                                            </div>
                                            
                                            <div className="mt-4 space-y-3">
                                                {/* Threshold Guide */}
                                                <div className="flex items-center gap-2 text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                                    <span>Standard Thresholds:</span>
                                                    <span className="text-teal-600 font-bold">{pills[1]}</span>
                                                </div>

                                                <div className="flex flex-wrap gap-2">
                                                    {data.col_below > 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 border border-blue-100">
                                                                <span className="w-2 h-2 rounded-full bg-blue-400" />
                                                                <span className="text-[10px] font-black text-blue-700">{data.col_below} Sec</span>
                                                                <span className="text-[8px] font-bold text-blue-400 uppercase tracking-tighter">({pills[0]})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {data.col_within > 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-100">
                                                                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                                                                <span className="text-[10px] font-black text-emerald-700">{data.col_within} Sec</span>
                                                                <span className="text-[8px] font-bold text-emerald-400 uppercase tracking-tighter">({pills[1]})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                    {data.col_above > 0 && (
                                                        <div className="flex flex-col gap-1">
                                                            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 border border-rose-100">
                                                                <span className="w-2 h-2 rounded-full bg-rose-400" />
                                                                <span className="text-[10px] font-black text-rose-700">{data.col_above} Sec</span>
                                                                <span className="text-[8px] font-bold text-rose-400 uppercase tracking-tighter">({pills[2]})</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right ml-4">
                                            <p className="text-[9px] font-black text-slate-400 uppercase mb-1">Total Sections</p>
                                            <div className="bg-slate-900 text-white px-5 py-2 rounded-2xl font-black text-2xl shadow-lg group-hover:bg-teal-600 transition-colors">
                                                {data.total_sections || 0}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Unlock Action */}
                {!propReadOnly && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="mt-12"
                    >
                        <button 
                            onClick={() => setIsReadOnly(false)}
                            className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-teal-100 text-teal-700 font-black text-lg shadow-xl shadow-teal-100/50 hover:border-teal-200 hover:bg-teal-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-teal-500/0 via-teal-500/5 to-teal-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                            <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <FiUnlock className="w-5 h-5 text-teal-700" />
                            </div>
                            <span>Unlock to Edit Registry</span>
                        </button>
                        <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 px-8">
                            Any changes to section counts will impact school-wide teacher-to-student ratio calculations.
                        </p>
                    </motion.div>
                )}
            </motion.div>
        );
    };

    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <AnimatePresence>
                {showSuccess && <SuccessModal title="Data Saved!" message="Section Counts updated." />}
            </AnimatePresence>

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

            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between relative">
                    <div className="flex items-center gap-2 z-10">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors">
                            <FiArrowLeft className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="absolute left-0 right-0 text-center pointer-events-none">
                        <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Unit 3</div>
                        <h1 className="text-sm font-black text-gray-800">Section Registry</h1>
                    </div>
                    <div className="w-10 z-10 text-right">
                         <span className="text-xs font-bold text-slate-400">
                             {currentStep > totalSteps ? 'Final' : currentStep > 0 ? `${currentStep} / ${totalSteps}` : 'Intro'}
                         </span>
                    </div>
                </div>

                {/* Progress Bar */}
                {!isReadOnly && !isFetching && !fetchError && (
                    <div className="w-full h-1 bg-slate-100">
                        <div 
                            className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                            style={{ width: `${progressPercent}%` }}
                        />
                    </div>
                )}
            </header>

            <main className="max-w-md mx-auto p-5 pb-10 mt-4">
                
                {isFetching ? (
                    <div className="flex flex-col items-center justify-center h-64">
                         <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-4"></div>
                         <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Loading Classes...</p>
                    </div>
                ) : fetchError ? (
                     <div className="bg-red-50 border-2 border-red-100 p-6 rounded-3xl text-center shadow-sm">
                          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <FiX className="w-8 h-8 text-red-500" />
                          </div>
                         <h3 className="text-xl font-black text-red-700 mb-2">Unavailable</h3>
                         <p className="text-red-600/80 font-medium mb-6">{fetchError}</p>
                         <button 
                             onClick={() => window.location.reload()} 
                             className="px-6 py-3 bg-white border-2 border-red-200 text-red-600 font-bold rounded-xl shadow-sm hover:bg-red-50 transition-all"
                         >
                             Try Again
                         </button>
                     </div>
                ) : isReadOnly ? (
                    <Unit3ClassesSummary />
                ) : (
                    <>
                {/* Page 0 (Multigrade) Removed */}


                {/* ── Page 1 to N: Single Grade ── */}
                {isEditingGrade && currentGrade && (
                     <motion.div
                        key={`step-${currentStep}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                             <div className="text-center mb-10">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                                Section Setup • {currentStep}/{totalSteps}
                                            </span>
                                            <h1 className="text-5xl font-black text-slate-800 mb-2 leading-tight">
                                                {currentGrade.label}
                                            </h1>
                                            <p className="text-slate-500 font-medium text-lg">
                                                Count sections and distribute them by class size.
                                            </p>
                                        </div>

                        {(()=>{
                            const g = currentGrade;
                            const data = sectionData[g.id] || { total_sections: 0, selectedSize: null };
                            const isActive = true;
                            const total = data.total_sections || 0;
                            const isMathValid = total === 0 || !!data.selectedSize;
                            const pills = getClassSizeOptions(g.label);

                            return (
                            <div className={`bg-white rounded-[2.5rem] p-8 shadow-xl border-4 transition-all duration-500 ${total > 0 ? 'border-indigo-100/50 scale-100' : 'border-slate-100 grayscale scale-[0.98]'}`}>
                                <div className="space-y-10">
                                    
                                    {/* Total Sections Input */}
                                    <div className="flex flex-col items-center">
                                        <label className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400 mb-4">Total Sections</label>
                                        <input 
                                            type="number"
                                            min="0"
                                            value={total === 0 ? "" : total}
                                            onChange={(e) => handleChange(g.id, 'total_sections', e.target.value)}
                                            placeholder="0"
                                            className="w-48 h-32 text-7xl font-black text-center bg-indigo-50 border-4 border-indigo-200 text-indigo-700 rounded-[2rem] focus:bg-white focus:border-indigo-500 shadow-xl shadow-indigo-100/50 outline-none transition-all"
                                        />
                                    </div>

                                    {/* Evaluation Input Grid */}
                                    <AnimatePresence>
                                        {total > 0 && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                                                <div className="pt-6 border-t border-slate-100 mt-6">
                                                    <p className={`text-center font-bold mb-6 ${!isCurrentStepValid ? 'text-indigo-500' : 'text-emerald-500'}`}>
                                                        {isCurrentStepValid ? "✨ Sections Distributed!" : `Distribute the ${total} ${total === 1 ? 'section' : 'sections'} by size:`}
                                                    </p>
                                                    
                                                    <div className="grid grid-cols-3 gap-4">
                                                        {[
                                                            { label: pills[0], field: 'col_below', color: 'blue' },
                                                            { label: pills[1], field: 'col_within', color: 'indigo' },
                                                            { label: pills[2], field: 'col_above', color: 'purple' }
                                                        ].map(col => (
                                                            <div key={col.field} className="flex flex-col items-center">
                                                                <label className={`text-[10px] font-black uppercase tracking-widest text-${col.color}-400 mb-2`}>{col.label}</label>
                                                                <input 
                                                                    type="number"
                                                                    min="0"
                                                                    max={total}
                                                                    value={data[col.field] === 0 ? "" : data[col.field]}
                                                                    onChange={(e) => handleChange(g.id, col.field, e.target.value)}
                                                                    placeholder="0"
                                                                    className={`w-full p-4 bg-${col.color}-50 border-2 border-${col.color}-100 text-${col.color}-700 rounded-2xl text-2xl font-black text-center focus:bg-white focus:border-${col.color}-400 outline-none transition-all`}
                                                                />
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {/* Error Message if Sum Mismatch */}
                                                    {total > 0 && !isCurrentStepValid && (
                                                        <p className="text-center text-red-500 font-bold text-xs mt-6 animate-pulse">
                                                            ⚠️ Total distributed must equal {total} sections
                                                        </p>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                            );
                        })()}
                    </motion.div>
                )}

                {/* ── Page N+1: Final Confirmation (Receipt) ── */}
                {currentStep > totalSteps && (
                     <motion.div
                        key="step-confirm"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="text-center mb-8">
                            <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                Review & Verify
                            </span>
                            <h2 className="text-3xl font-black text-slate-800 leading-tight">Class Registry Result</h2>
                            <p className="text-slate-500 font-medium mt-2">Is this data correct as of {new Date().toLocaleDateString()}?</p>
                        </div>

                        <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-slate-100 mb-8 overflow-hidden relative">
                             <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                                <FiCheckCircle className="w-32 h-32" />
                            </div>

                            <div className="space-y-6 relative z-10">
                                {/* Multigrade Receipt Portion Removed */}

                                <div className="space-y-3">
                                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2">Grade Level Distribution</p>
                                    {availableGrades.map(g => {
                                        const data = sectionData[g.id] || { total_sections: 0 };
                                        if (data.total_sections === 0) return null;
                                        return (
                                            <div key={g.id} className="flex justify-between items-center py-2 border-b border-slate-50 last:border-0">
                                                <span className="font-bold text-slate-700">{g.label}</span>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-xs font-black text-slate-400 tracking-widest">{data.selectedSize}</span>
                                                    <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{data.total_sections} Sec</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="pt-4 mt-6 border-t-4 border-slate-100 flex justify-between items-center">
                                    <span className="text-lg font-black text-slate-800 uppercase tracking-tight">Total Sections</span>
                                    <span className="text-4xl font-black text-indigo-600">
                                        {availableGrades.reduce((sum, g) => sum + (sectionData[g.id]?.total_sections || 0), 0)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="h-10" />
                    </motion.div>
                )}
                </>
                )}
            </main>

            {/* Stepper Navigation */}
            {!isReadOnly && (
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 flex justify-center z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] px-5 py-6 pb-safe">
                    <div className="w-full max-w-md flex items-center justify-between gap-4">
                        
                        {/* Back / Edit Button */}
                        {currentStep > totalSteps ? (
                            <button 
                                onClick={() => setCurrentStep(1)} 
                                disabled={loading}
                                className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold border-2 border-slate-200 transition-all active:scale-95 flex items-center justify-center shrink-0 w-16 h-16 outline-none"
                            >
                                <FiArrowLeft className="w-6 h-6" />
                            </button>
                        ) : currentStep === 0 ? (
                            <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all outline-none">
                                <FiSave className="w-6 h-6" />
                            </button>
                        ) : (
                            <div className="flex gap-2">
                                <button onClick={handleBack} disabled={loading}
                                    className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold border-2 border-slate-200 transition-all active:scale-95 flex items-center justify-center shrink-0 w-16 h-16 outline-none"
                                >
                                    <FiArrowLeft className="w-6 h-6" />
                                </button>
                                <button onClick={() => setShowDraftModal(true)}
                                    className="w-16 h-16 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-500 hover:text-blue-700 active:scale-95 transition-all outline-none"
                                >
                                    <FiSave className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    
                    {/* Next / Submit Button */}
                        <button 
                            disabled={loading || (currentStep <= totalSteps && !isCurrentStepValid)} 
                            onClick={currentStep > totalSteps ? handleFinalSubmit : handleNext} 
                            className={`flex-1 h-16 rounded-2xl text-white font-black text-lg text-center transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 disabled:translate-y-0 shadow-lg flex items-center justify-center gap-2 ${currentStep > totalSteps ? 'bg-emerald-500 border-emerald-700' : 'bg-indigo-500 border-indigo-700'} border-b-[5px] active:border-b-0 active:translate-y-[5px]`}
                        >
                            {currentStep > totalSteps ? (
                                loading ? "Saving..." : "Yes, Save Registry"
                            ) : (
                                <>Next Step <FiChevronRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </div>
            )}

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

export default Unit3OrganizedClasses;
