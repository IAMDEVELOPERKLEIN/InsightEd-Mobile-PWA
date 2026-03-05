import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiChevronRight, FiChevronLeft, FiLayers } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";

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

const getCongestionLabels = (gradeId) => {
    switch (gradeId) {
        case "kinder":
            return { below: "< 25", within: "25 - 30", above: "> 30" };
        case "g1":
        case "g2":
        case "g3":
            return { below: "< 30", within: "30 - 35", above: "> 35" };
        case "g4":
        case "g5":
        case "g6":
        case "g7":
        case "g8":
        case "g9":
        case "g10":
            return { below: "< 40", within: "40 - 45", above: "> 45" };
        case "g11":
        case "g12":
            return { below: "< 45", within: "45", above: "> 45" };
        default:
            return { below: "< 40", within: "40 - 45", above: "> 45" };
    }
};

const Unit3OrganizedClasses = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolId, setSchoolId] = useState("");

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
                        const co = (d.curricular_offering || "").toLowerCase();

                        // Parse available grades from Curricular Offering
                        let grades = [];
                        let isElem = false;

                        if (co.includes("kinder")) grades.push("kinder");
                        if (co.includes("elementary") || co.includes("k to 10") || co.includes("k to 12") || co.includes("k-10") || co.includes("k-12")) {
                            grades.push("kinder", "g1", "g2", "g3", "g4", "g5", "g6");
                            isElem = true;
                        }
                        if (co.includes("junior high") || co.includes("jhs") || co.includes("k to 10") || co.includes("k to 12") || co.includes("k-10") || co.includes("k-12")) {
                            grades.push("g7", "g8", "g9", "g10");
                        }
                        if (co.includes("senior high") || co.includes("shs") || co.includes("k to 12") || co.includes("k-12")) {
                            grades.push("g11", "g12");
                        }

                        // Remove duplicates and maintain sort order
                        const baseGrades = ALL_GRADES.filter(g => grades.includes(g.id));

                        // Parse Unit 2 explicit JSON to lock out inactive grades
                        let u2Raw = [];
                        if (d.unit2_simplified_enrollment) {
                            try {
                                u2Raw = typeof d.unit2_simplified_enrollment === 'string'
                                    ? JSON.parse(d.unit2_simplified_enrollment)
                                    : d.unit2_simplified_enrollment;
                            } catch (e) { console.warn("Parse error for enrollment", e); }
                        }
                        const u2Parsed = Array.isArray(u2Raw) ? u2Raw : (u2Raw.array || []);

                        // Filter Unit 3 wizard pages to ONLY include Active Grades from Unit 2
                        const activeGradesFromU2 = baseGrades.filter(g => {
                            const match = u2Parsed.find(x => x.grade_level === g.id);
                            return match ? match.is_active !== false : true; // Default to true if not set
                        });

                        setAvailableGrades(activeGradesFromU2);
                        setHasElementary(isElem);
                        
                        // Setup Wizard Start
                        setCurrentStep(1);

                        // Load saved counts into complex structure
                        let loadedData = {};
                        activeGradesFromU2.forEach(g => { 
                            loadedData[g.id] = { 
                                is_active: true, 
                                total_sections: 0, 
                                col_below: 0, 
                                col_within: 0, 
                                col_above: 0 
                            }; 
                        });

                        if (d.unit3_simplified_counts) {
                            try {
                                const parsed = typeof d.unit3_simplified_counts === 'string' 
                                    ? JSON.parse(d.unit3_simplified_counts) 
                                    : d.unit3_simplified_counts;
                                    
                                parsed.forEach(p => { 
                                    loadedData[p.grade_level] = {
                                        is_active: typeof p.is_active !== 'undefined' ? p.is_active : true,
                                        total_sections: p.total_sections || p.sections || 0,
                                        // Load new generic keys, fallback to legacy specific keys for smooth migration
                                        col_below: p.col_below || p.size_under_50 || 0,
                                        col_within: p.col_within || p.size_50_to_60 || 0,
                                        col_above: p.col_above || p.size_over_60 || 0
                                    }
                                });
                            } catch (e) { console.warn("Parse error for sections", e); }
                        } else if (d.unit3_sections) {
                             // Fallback: migrate from early beta complex section registry payload
                             try {
                                const parsed = typeof d.unit3_sections === 'string' ? JSON.parse(d.unit3_sections) : d.unit3_sections;
                                parsed.forEach(sec => {
                                    if (sec.grade_level.length === 1) {
                                        const gId = sec.grade_level[0];
                                        if (loadedData[gId]) {
                                             loadedData[gId].total_sections = (loadedData[gId].total_sections || 0) + 1;
                                        }
                                    }
                                });
                             } catch (e) {}
                        } else {
                            // Deep fallback: map from legacy int columns 
                             activeGradesFromU2.forEach(g => {
                                 const gId = g.id;
                                 if (d[`sections_${gId}`]) {
                                      loadedData[gId].total_sections = parseInt(d[`sections_${gId}`]) || 0;
                                      loadedData[gId].col_below = parseInt(d[`size_less_${gId}`]) || 0;
                                      loadedData[gId].col_within = parseInt(d[`size_within_${gId}`]) || 0;
                                      loadedData[gId].col_above = parseInt(d[`size_above_${gId}`]) || 0;
                                 }
                             });
                        }
                        
                        setSectionData(loadedData);
                        
                        // Removed Multigrade loading logic
                    }
                }
            } catch (e) {
                console.warn("Could not fetch Unit 3 data", e);
            }
        };
        init();
    }, []);

    const handleChange = (gradeId, field, value) => {
        let val = parseInt(value) || 0;
        if (val < 0) val = 0;
        
        setSectionData(prev => ({ 
            ...prev, 
            [gradeId]: {
                ...prev[gradeId],
                [field]: val
            }
        }));
    };

    // Wizard Navigation Logic
    const totalSteps = availableGrades.length; // Max step index is totalSteps (since we do 1-based indexing for grades)
    const canGoBack = currentStep > 1;
    const isEditingGrade = currentStep > 0 && currentStep <= totalSteps;
    const currentGrade = isEditingGrade ? availableGrades[currentStep - 1] : null;

    // Wizard Validation Logic for Current Step Only
    const isCurrentStepValid = useMemo(() => {
        if (isEditingGrade && currentGrade) {
            const data = sectionData[currentGrade.id] || { total_sections: 0, col_below: 0, col_within: 0, col_above: 0 };
            
            const total = data.total_sections;
            if (total === 0) return true; // 0 sections is valid
            
            const sum = data.col_below + data.col_within + data.col_above;
            return total === sum;
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
                    col_above: data.col_above,
                };
            });

            const payload = {
                has_multigrade: false,
                multigrade_sections_count: 0,
                multigrade_groups: null,
                unit3_simplified_counts: JSON.stringify(payloadArray)
            };

            const res = await fetch(`/api/ph_schools/unit3/${schoolId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save class organization");
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


    return (
        <div className="min-h-screen bg-gray-50 pb-32">
            <AnimatePresence>
                {showSuccess && <SuccessModal title="Data Saved!" message="Section Counts updated." />}
            </AnimatePresence>

            {/* Header */}
            <header className="bg-white border-b border-gray-100 sticky top-0 z-40 shadow-sm">
                <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between relative">
                    <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-50 transition-colors z-10">
                        <FiX className="w-6 h-6" />
                    </button>
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
                <div className="w-full h-1 bg-slate-100">
                    <div 
                        className="h-full bg-indigo-500 transition-all duration-300 ease-out"
                        style={{ width: `${progressPercent}%` }}
                    />
                </div>
            </header>

            <main className="max-w-md mx-auto p-5 pb-10 mt-4">
                
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
                            const data = sectionData[g.id] || { total_sections: 0, col_below: 0, col_within: 0, col_above: 0 };
                            const isActive = true;
                            const total = data.total_sections || 0;
                            const sum = data.col_below + data.col_within + data.col_above;
                            
                            const isExpanded = total > 0;
                            const isMathValid = total === sum || total === 0;
                            const dynamicLabels = getCongestionLabels(g.id);

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

                                    {/* 3-Column Congestion Grid */}
                                    <AnimatePresence>
                                        {total > 0 && (
                                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="space-y-6">
                                                <div className="pt-6 border-t border-slate-100">
                                                    <p className={`text-center font-bold mb-6 ${sum !== total ? 'text-rose-500' : 'text-emerald-500'}`}>
                                                        {sum === total ? "✨ Perfectly Distributed!" : `⚠️ Distribute ${total} sections below:`}
                                                    </p>
                                                    
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-full bg-slate-50 rounded-2xl border-2 border-slate-100 p-2 text-center mb-2">
                                                                <span className="text-[10px] font-black uppercase text-slate-400">{dynamicLabels.below}</span>
                                                            </div>
                                                            <input 
                                                                type="number" min="0" placeholder="0"
                                                                value={data.col_below || ""}
                                                                onChange={(e) => handleChange(g.id, 'col_below', e.target.value)}
                                                                className="w-full h-20 text-3xl font-black text-center bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-full bg-slate-50 rounded-2xl border-2 border-slate-100 p-2 text-center mb-2">
                                                                <span className="text-[10px] font-black uppercase text-slate-400">{dynamicLabels.within}</span>
                                                            </div>
                                                            <input 
                                                                type="number" min="0" placeholder="0"
                                                                value={data.col_within || ""}
                                                                onChange={(e) => handleChange(g.id, 'col_within', e.target.value)}
                                                                className="w-full h-20 text-3xl font-black text-center bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none"
                                                            />
                                                        </div>
                                                        <div className="flex flex-col items-center">
                                                            <div className="w-full bg-slate-50 rounded-2xl border-2 border-slate-100 p-2 text-center mb-2">
                                                                <span className="text-[10px] font-black uppercase text-slate-400">{dynamicLabels.above}</span>
                                                            </div>
                                                            <input 
                                                                type="number" min="0" placeholder="0"
                                                                value={data.col_above || ""}
                                                                onChange={(e) => handleChange(g.id, 'col_above', e.target.value)}
                                                                className="w-full h-20 text-3xl font-black text-center bg-white border-2 border-slate-200 rounded-2xl focus:border-indigo-500 focus:bg-indigo-50/30 transition-all outline-none"
                                                            />
                                                        </div>
                                                    </div>
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
                                                    <span className="text-xs text-slate-400">Dist: {data.col_below}/{data.col_within}/{data.col_above}</span>
                                                    <span className="font-black text-indigo-600 bg-indigo-50 px-3 py-1 rounded-lg">{data.total_sections}</span>
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

                        <div className="flex gap-4">
                            <button onClick={() => setCurrentStep(1)} className="flex-1 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                                No, Edit Again
                            </button>
                            <button onClick={handleFinalSubmit} disabled={loading} className="flex-[2] py-4 rounded-2xl bg-indigo-600 text-white font-black shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50">
                                {loading ? "Saving..." : "Yes, Save Registry"}
                            </button>
                        </div>
                    </motion.div>
                )}
            </main>

            {/* Stepper Navigation */}
            {currentStep <= totalSteps && (
                <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-100 flex justify-center z-40 shadow-[0_-10px_30px_rgba(0,0,0,0.03)] px-5 py-6 pb-safe">
                    <div className="w-full max-w-md flex items-center justify-between gap-4">
                        
                        {/* Back Button */}
                        {canGoBack ? (
                            <button 
                                onClick={handleBack} 
                                disabled={loading}
                                className="p-4 bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-2xl font-bold border-2 border-slate-200 transition-all active:scale-95 flex items-center justify-center shrink-0 w-16 h-16"
                            >
                                <FiChevronLeft className="w-6 h-6" />
                            </button>
                        ) : ( <div className="w-16 h-16 shrink-0" /> )}
                    
                    {/* Next Button */}
                        <button 
                            disabled={loading || !isCurrentStepValid} 
                            onClick={handleNext} 
                            className={`flex-1 h-16 rounded-2xl text-white font-black text-lg text-center transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:border-slate-400 disabled:text-slate-500 disabled:translate-y-0 shadow-lg flex items-center justify-center gap-2 bg-indigo-500 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px]`}
                        >
                            Next Step <FiChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Unit3OrganizedClasses;
