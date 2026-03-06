import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiChevronLeft, FiAlertTriangle } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessModal from '../SuccessModal';

// --- Shared Styles ---
const chunkyInput = "w-full p-4 mt-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-2xl font-black text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 transition-colors shadow-sm text-center";
const toggleBtnBase = "flex-1 py-4 px-6 rounded-2xl font-black text-lg border-2 transition-all flex items-center justify-center gap-2 shadow-sm";
const toggleBtnActive = "bg-indigo-100 border-indigo-500 text-indigo-700 shadow-indigo-100";
const toggleBtnInactive = "bg-white border-gray-200 text-gray-400 hover:bg-gray-50";

// --- Data Constants ---
const ALL_GRADES = [
    { id: 'kinder', label: 'Kindergarten', type: 'elem' },
    { id: 'g1', label: 'Grade 1', type: 'elem' },
    { id: 'g2', label: 'Grade 2', type: 'elem' },
    { id: 'g3', label: 'Grade 3', type: 'elem' },
    { id: 'g4', label: 'Grade 4', type: 'elem' },
    { id: 'g5', label: 'Grade 5', type: 'elem' },
    { id: 'g6', label: 'Grade 6', type: 'elem' },
    { id: 'g7', label: 'Grade 7', type: 'jhs' },
    { id: 'g8', label: 'Grade 8', type: 'jhs' },
    { id: 'g9', label: 'Grade 9', type: 'jhs' },
    { id: 'g10', label: 'Grade 10', type: 'jhs' },
    { id: 'g11', label: 'Grade 11', type: 'shs' },
    { id: 'g12', label: 'Grade 12', type: 'shs' }
];

const ELEM_GRADES = ['g1', 'g2', 'g3', 'g4', 'g5', 'g6'];

const Unit2Learners = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    // --- Wizard State ---
    const [currentStep, setCurrentStep] = useState(1);
    const [currentGradeIndex, setCurrentGradeIndex] = useState(0); 
    const [availableGrades, setAvailableGrades] = useState([]);
    const [schoolOffering, setSchoolOffering] = useState("");
    const [hasKinder, setHasKinder] = useState(false);
    const [hasElementary, setHasElementary] = useState(false);

    // Step 1: Kinder
    const [kinderEnrollment, setKinderEnrollment] = useState("");

    // Step 2 & 3: Organization (G1-G6 Only)
    const [orgType, setOrgType] = useState(null); // 'nano', 'pure_mg', 'mixed'
    const [mgCombinations, setMgCombinations] = useState([]); // [{ id, grades: [], enrollment }]

    // Step 4: Grade Totals & Availability (Nano/Standalone)
    const [gradeTotals, setGradeTotals] = useState({});
    const [gradeAvailability, setGradeAvailability] = useState({});
    
    // Step 3: Special Learners (SNED / Non-Graded)
    const [hasSnedSelfContained, setHasSnedSelfContained] = useState(null);
    const [sned_self_contained_count, setSnedSelfContainedCount] = useState("");
    const [snedLanguage, setSnedLanguage] = useState("en"); // "en" | "ph"

    // Step 3: ARAL Program (Conditional)
    const [hasAralMath, setHasAralMath] = useState(null);
    const [hasAralReading, setHasAralReading] = useState(null);
    const [hasAralScience, setHasAralScience] = useState(null);
    
    const [aralMath, setAralMath] = useState({});
    const [aralReading, setAralReading] = useState({});
    const [aralScience, setAralScience] = useState({});

    // Step 4: Global Gender
    const [genderTotals, setGenderTotals] = useState({ male: "", female: "" });

    // --- Derived State ---
    const lockedGrades = useMemo(() => {
        const locked = new Set();
        mgCombinations.forEach(c => c.grades.forEach(g => locked.add(g)));
        return locked;
    }, [mgCombinations]);

    const activeNanoGrades = useMemo(() => {
        // Only show grades NOT in combinations and NOT Kinder (handled separately)
        return availableGrades.filter(g => !lockedGrades.has(g.id) && g.id !== 'kinder');
    }, [availableGrades, lockedGrades]);

    const grandTotal = useMemo(() => {
        let sum = 0;
        // Kinder standalone
        const isKinderActive = gradeAvailability.kinder !== false;
        if (isKinderActive) {
            sum += (parseInt(kinderEnrollment) || 0);
        }
        
        // Nano totals
        activeNanoGrades.forEach(g => sum += (parseInt(gradeTotals[g.id]) || 0));
        // MG totals
        mgCombinations.forEach(c => sum += (parseInt(c.enrollment) || 0));
        
        // SNED Self-Contained (Non-Graded)
        if (hasSnedSelfContained && sned_self_contained_count) {
            sum += parseInt(sned_self_contained_count) || 0;
        }
        return sum;
    }, [kinderEnrollment, gradeTotals, activeNanoGrades, mgCombinations, hasSnedSelfContained, sned_self_contained_count, gradeAvailability]);

    const genderSum = useMemo(() => {
        return (parseInt(genderTotals.male) || 0) + (parseInt(genderTotals.female) || 0);
    }, [genderTotals]);

    const gradeCapacities = useMemo(() => {
        const capacities = {};
        // Default all to 0
        ELEM_GRADES.forEach(id => capacities[id] = 0);

        // 1. Nano Capacities
        activeNanoGrades.forEach(g => {
            capacities[g.id] = parseInt(gradeTotals[g.id]) || 0;
        });

        // 2. MG Capacities (Each grade in MG shares the combination's enrollment limit)
        mgCombinations.forEach(c => {
            const enrollment = parseInt(c.enrollment) || 0;
            c.grades.forEach(gradeId => {
                capacities[gradeId] = enrollment;
            });
        });

        return capacities;
    }, [gradeTotals, activeNanoGrades, mgCombinations]);

    const isMathPerfect = genderSum === grandTotal && grandTotal > 0;

    // --- Init / Fetch Data ---
    useEffect(() => {
        const initData = async () => {
            const storedId = localStorage.getItem('schoolId');
            if (!storedId) {
                setLoading(false);
                return;
            }

            try {
                const res = await fetch(`/api/ph_schools/${storedId}`);
                if (res.ok) {
                    const data = await res.json();
                    if (data.exists && data.data) {
                        const d = data.data;

                        // 1. Determine Available Grades via Unit 1
                        const offering = d.curricular_offering || localStorage.getItem('schoolOffering') || "";
                        setSchoolOffering(offering);

                        const text = offering.toLowerCase();
                        let filteredIds = [];

                        if (text.includes("integrated") || text.includes("k-12") || text.includes("k to 12") || text.includes("k-10") || text.includes("k to 10")) {
                            filteredIds = ALL_GRADES.map(g => g.id);
                        } else {
                            if (text.includes("elementary") || text.includes("primary")) {
                                filteredIds.push('kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6');
                            }
                            if (text.includes("jhs") || text.includes("junior high")) {
                                filteredIds.push('g7', 'g8', 'g9', 'g10');
                            }
                            if (text.includes("shs") || text.includes("senior high")) {
                                filteredIds.push('g11', 'g12');
                            }
                        }

                        filteredIds = [...new Set(filteredIds)];
                        const uniqueObj = ALL_GRADES.filter(g => filteredIds.includes(g.id));
                        
                        setAvailableGrades(uniqueObj);
                        setHasKinder(uniqueObj.some(g => g.id === 'kinder'));
                        const hasElem = uniqueObj.some(g => g.type === 'elem' && g.id !== 'kinder');
                        setHasElementary(hasElem);

                        // 2. Auto-advance if Kinder/Elementary is not offered
                        if (!uniqueObj.some(g => g.id === 'kinder')) {
                            if (hasElem) {
                                setCurrentStep(2);
                            } else {
                                setOrgType('nano');
                                setCurrentStep(4);
                            }
                        }

                        if (d.unit2_simplified_enrollment) {
                            setHasSubmitted(true);
                            setIsReadOnly(true);
                            try {
                                const parsed = typeof d.unit2_simplified_enrollment === 'string' 
                                    ? JSON.parse(d.unit2_simplified_enrollment) 
                                    : d.unit2_simplified_enrollment;
                                
                                // In the new schema, we store an object wrapping both the downstream array and the raw questionnaire data
                                if (parsed.questionnaire) {
                                    const q = parsed.questionnaire;
                                    setKinderEnrollment(q.kinderEnrollment || "");
                                    setGradeTotals(q.gradeTotals || {});
                                    setGradeAvailability(q.gradeAvailability || {});
                                    
                                    setHasSnedSelfContained(q.hasSnedSelfContained);
                                    setSnedSelfContainedCount(q.sned_self_contained_count || "");

                                    setHasAralMath(q.hasAralMath);
                                    setAralMath(q.aralMath || {});
                                    setHasAralReading(q.hasAralReading);
                                    setAralReading(q.aralReading || {});
                                    setHasAralScience(q.hasAralScience);
                                    setAralScience(q.aralScience || {});

                                    setGenderTotals(q.genderTotals || { male: "", female: "" });

                                    if (q.orgType) setOrgType(q.orgType);
                                    if (q.mgCombinations) setMgCombinations(q.mgCombinations);
                                } else if (Array.isArray(parsed)) {
                                    // Fallback: migrate from the intermediate master-controller array format
                                    const totals = {};
                                    const availability = {};
                                    let gMale = 0; let gFemale = 0;
                                    parsed.forEach(item => {
                                        totals[item.grade_level] = item.total || 0;
                                        availability[item.grade_level] = item.is_active !== false;
                                        gMale += item.male || 0;
                                        gFemale += item.female || 0;
                                    });
                                    setGradeTotals(totals);
                                    setGradeAvailability(availability);
                                    setGenderTotals({ male: gMale, female: gFemale });
                                }
                            } catch (e) { console.warn("Parse error", e); }
                        }
                    }
                }
            } catch (e) {
                console.error("Error fetching Unit 2 data:", e);
            } finally {
                setLoading(false);
            }
        };
        initData();
    }, []);

    // --- Handlers ---
    const handleGradeChange = (gradeId, val) => {
        setGradeTotals(prev => ({ ...prev, [gradeId]: val }));
    };

    const toggleAvailability = (gradeId) => {
        setGradeAvailability(prev => {
            const newState = !prev[gradeId];
            if (!newState) {
                // If turning OFF, force total to 0
                if (gradeId === 'kinder') {
                    setKinderEnrollment("0");
                } else {
                    setGradeTotals(t => ({ ...t, [gradeId]: "0" }));
                }
            }
            return { ...prev, [gradeId]: newState };
        });
    };

    const handleAralChange = (subject, gradeId, val) => {
        if (subject === 'math') setAralMath(prev => ({ ...prev, [gradeId]: val }));
        if (subject === 'reading') setAralReading(prev => ({ ...prev, [gradeId]: val }));
        if (subject === 'science') setAralScience(prev => ({ ...prev, [gradeId]: val }));
    };

    const handleGenderChange = (field, val) => {
        const numVal = parseInt(val) || 0;
        const clampedVal = Math.min(numVal, grandTotal);
        const remainder = Math.max(0, grandTotal - clampedVal);

        if (field === 'male') {
            setGenderTotals({ 
                male: clampedVal.toString(), 
                female: remainder.toString() 
            });
        } else {
            setGenderTotals({ 
                female: clampedVal.toString(), 
                male: remainder.toString() 
            });
        }
    };

    const handleNext = () => {
        // Step 1: Kindergarten
        if (currentStep === 1) {
            if (hasElementary) {
                setCurrentStep(2);
            } else {
                setOrgType('nano');
                setCurrentStep(4);
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Step 2: Org Gatekeeper
        if (currentStep === 2) {
            if (!orgType) return;
            if (orgType === 'pure_mg' || orgType === 'mixed') {
                setCurrentStep(3); // Go to MG Builder
            } else {
                setCurrentStep(4); // Go to Nano Pages
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Step 3: MG Builder
        if (currentStep === 3) {
            if (orgType === 'pure_mg') {
                setCurrentStep(5); // Skip Nano Pages, go to SNED
            } else {
                setCurrentStep(4); // Mixed: Go to Nano Pages
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        // Step 4: Grade-by-Grade (Nano/Standalone)
        if (currentStep === 4) {
            if (activeNanoGrades.length === 0) {
                setCurrentStep(5);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (currentGradeIndex < activeNanoGrades.length - 1) {
                setCurrentGradeIndex(prev => prev + 1);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            setCurrentStep(5); // Finished grades -> SNED
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }
        
        // Step 6: ARAL (Skip if not elementary)
        if (currentStep === 5 && !hasElementary) {
            setCurrentStep(7); // Skip ARAL, go to Gender
            window.scrollTo({ top: 0, behavior: 'smooth' });
            return;
        }

        setCurrentStep(prev => prev + 1);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleBack = () => {
        if (currentStep === 1) {
            navigate("/modular-dashboard");
            return;
        }

        // Back from Org Gatekeeper
        if (currentStep === 2) {
            if (hasKinder) {
                setCurrentStep(1);
            } else {
                navigate("/modular-dashboard");
            }
            return;
        }

        // Back from MG Builder
        if (currentStep === 3) {
            setCurrentStep(2);
            return;
        }

        // Back from Nano Pages
        if (currentStep === 4) {
            if (currentGradeIndex > 0) {
                setCurrentGradeIndex(prev => prev - 1);
                return;
            }
            if (hasElementary) {
                if (orgType === 'pure_mg' || orgType === 'mixed') {
                    setCurrentStep(3);
                } else {
                    setCurrentStep(2);
                }
            } else {
                if (hasKinder) {
                    setCurrentStep(1);
                } else {
                    navigate("/modular-dashboard");
                }
            }
            return;
        }

        // Back from SNED
        if (currentStep === 5) {
            if (activeNanoGrades.length > 0) {
                setCurrentStep(4);
                setCurrentGradeIndex(activeNanoGrades.length - 1);
            } else if (hasElementary) {
                if (orgType === 'pure_mg' || orgType === 'mixed') {
                    setCurrentStep(3);
                } else {
                    setCurrentStep(2);
                }
            } else if (hasKinder) {
                setCurrentStep(1);
            } else {
                navigate("/modular-dashboard");
            }
            return;
        }

        // Back from ARAL
        if (currentStep === 6) {
            setCurrentStep(5);
            return;
        }

        // Back from Gender
        if (currentStep === 7) {
            if (hasElementary) {
                setCurrentStep(6);
            } else {
                setCurrentStep(5);
            }
            return;
        }

        setCurrentStep(prev => prev - 1);
    };

    const handleSave = async () => {
        const storedId = localStorage.getItem('schoolId');
        if (!storedId) return;
        setIsSaving(true);

        try {
            // Construct the exact questionnaire state representation
            const questionnaire = {
                kinderEnrollment,
                orgType,
                mgCombinations,
                gradeTotals,
                gradeAvailability,
                hasSnedSelfContained,
                sned_self_contained_count: parseInt(sned_self_contained_count) || 0,
                hasAralMath, aralMath: hasAralMath ? aralMath : {},
                hasAralReading, aralReading: hasAralReading ? aralReading : {},
                hasAralScience, aralScience: hasAralScience ? aralScience : {},
                genderTotals,
                grandTotal
            };

            // Backwards compatibility for Unit 3 and Unit 9: Construct the downstream grades array
            const nanoGrades = activeNanoGrades.map(g => {
                const totalActive = gradeAvailability[g.id] !== false;
                const count = parseInt(gradeTotals[g.id]) || 0;
                return {
                    grade_level: g.id,
                    is_active: totalActive,
                    total: totalActive ? count : 0,
                    male: 0, female: 0
                };
            });

            // For Multigrade combinations, we split the total to the first grade in the combo
            // to ensure the backend's sum(total) equals the grandTotal (excluding SNED).
            const mgGrades = mgCombinations.flatMap(c => {
                return c.grades.map((id, idx) => ({
                    grade_level: id,
                    is_active: true,
                    total: idx === 0 ? (parseInt(c.enrollment) || 0) : 0,
                    male: 0, female: 0
                }));
            });

            const kinderGrade = hasKinder ? [{
                grade_level: 'kinder',
                is_active: gradeAvailability.kinder !== false,
                total: (gradeAvailability.kinder !== false) ? (parseInt(kinderEnrollment) || 0) : 0,
                male: 0, female: 0
            }] : [];

            const downstreamGrades = [...kinderGrade, ...nanoGrades, ...mgGrades];

            const payload = {
                array: downstreamGrades, 
                questionnaire: questionnaire 
            };


            const res = await fetch(`/api/ph_schools/unit2/${storedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    unit2_simplified_enrollment: payload,
                    sned_self_contained_count: parseInt(sned_self_contained_count) || 0,
                })
            });

            if (res.ok) {
                // Determine completion
                const progRes = await fetch(`/api/user/progress`);
                if (progRes.ok) {
                    const progData = await progRes.json();
                    if (progData.progress && (!progData.progress.completed_units || !progData.progress.completed_units.includes(2))) {
                         await fetch(`/api/user/progress`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ unitId: 2 })
                        });
                    }
                }
                setHasSubmitted(true);
                setIsReadOnly(true);
                setShowSuccess(true);
            } else {
                alert("Failed to save enrollment. Please try again.");
            }
        } catch (e) {
            console.error(e);
            alert("An error occurred during save.");
        } finally {
            setIsSaving(false);
        }
    };

    // --- Transitions ---
    const pageVariants = {
        initial: { opacity: 0, y: 30, scale: 0.98 },
        in: { opacity: 1, y: 0, scale: 1 },
        out: { opacity: 0, y: -30, scale: 0.98 }
    };
    
    const expandVariants = {
        hidden: { opacity: 0, height: 0, marginTop: 0 },
        visible: { opacity: 1, height: "auto", marginTop: 16 },
    };

    // --- Internal Summary Component ---
    const Unit2Summary = () => {
        const maleVal = parseInt(genderTotals.male) || 0;
        const femaleVal = parseInt(genderTotals.female) || 0;
        
        return (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 animate-in fade-in slide-in-from-bottom-5 duration-700">
                <div className="text-center mb-8">
                    <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 shadow-sm border border-emerald-200">
                        Enrollment Dashboard ✓
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">Master Summary</h1>
                    <p className="text-slate-500 font-medium italic">Current official records for this academic year.</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 gap-4">
                    <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-200 flex items-center justify-between overflow-hidden relative group transition-transform active:scale-95">
                        <div className="relative z-10">
                            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Grand Total Enrollment</p>
                            <h2 className="text-6xl font-black leading-none">{grandTotal}</h2>
                        </div>
                        <div className="text-6xl opacity-20 relative z-10">🌍</div>
                        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-blue-50 border-4 border-blue-100 rounded-[2.5rem] p-6 text-center">
                            <p className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Male</p>
                            <h3 className="text-4xl font-black text-blue-600">{maleVal}</h3>
                        </div>
                        <div className="bg-rose-50 border-4 border-rose-100 rounded-[2.5rem] p-6 text-center">
                            <p className="text-rose-400 text-[10px] font-black uppercase tracking-widest mb-1">Total Female</p>
                            <h3 className="text-4xl font-black text-rose-600">{femaleVal}</h3>
                        </div>
                    </div>
                </div>

                {/* Grade Breakdown */}
                <div className="space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest pl-4">Grade Breakdown</h4>
                    {availableGrades.map((g) => {
                        const count = g.id === 'kinder' ? (parseInt(kinderEnrollment) || 0) : (parseInt(gradeTotals[g.id]) || 0);
                        const isInactive = gradeAvailability[g.id] === false;
                        if (count === 0 && isInactive) return null;

                        return (
                            <div key={g.id} className="bg-white rounded-[2rem] p-5 shadow-sm border-2 border-slate-100 flex items-center justify-between hover:border-indigo-300 transition-colors">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-xl shadow-inner font-black text-slate-400">
                                        {g.label.match(/\d+/) ? g.label.match(/\d+/)[0] : 'K'}
                                    </div>
                                    <div>
                                        <h5 className="font-black text-slate-800">{g.label}</h5>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isInactive ? "Not Offered" : "Standard Enrollment"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="bg-slate-50 px-5 py-3 rounded-2xl">
                                        <span className="text-lg font-black text-slate-700">{count}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Unlock Button */}
                <div className="border-t-2 border-slate-100 pt-8 mt-12 pb-20">
                    <button 
                        onClick={() => setIsReadOnly(false)}
                        className="w-full flex items-center justify-center gap-3 py-6 rounded-3xl bg-slate-900 shadow-2xl shadow-slate-200 text-white font-black text-lg active:scale-95 transition-all"
                    >
                        <span>🔓</span> Unlock to Edit Enrollment
                    </button>
                    <p className="text-center text-slate-400 text-xs font-bold mt-4 uppercase tracking-[0.2em]">Authorized Access Only</p>
                </div>
            </motion.div>
        );
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-50 to-gray-100 font-sans text-slate-800 pb-32">
            
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md shadow-sm px-4 py-4 mb-8">
                <div className="max-w-xl mx-auto flex items-center justify-between">
                     <button onClick={handleBack} className="p-2 -ml-2 rounded-full hover:bg-slate-100 transition-colors text-slate-400">
                        <FiChevronLeft className="w-8 h-8" />
                    </button>
                    <div className="flex-1 px-6">
                        <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden flex">
                            {/* Calculate total sub-steps: Org + GradeCount + Special + (ARAL?) + Gender + Confirm */}
                            {(() => {
                                const totalProg = 8;
                                let currentProg = currentStep;
                                if (currentStep === 4) {
                                    // Sub-steps for grades
                                    const gradeWeight = 1 / (activeNanoGrades.length || 1);
                                    currentProg = 3 + (currentGradeIndex + 1) * gradeWeight;
                                }

                                return Array.from({ length: totalProg }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={`h-full transition-all duration-500 ease-out border-r-2 border-white last:border-0 ${currentProg >= i + 1 ? 'bg-indigo-500' : 'bg-transparent'}`} 
                                        style={{ width: `${100 / totalProg}%` }} 
                                    />
                                ));
                            })()}
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-xl mx-auto px-4">
                {isReadOnly ? (
                    <Unit2Summary />
                ) : (
                    <>
                        {!schoolOffering && !loading && (
                            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
                                className="mb-8 p-6 bg-rose-50 border-4 border-rose-100 rounded-[2rem] flex items-center gap-4 shadow-xl shadow-rose-100/50">
                                <div className="w-12 h-12 bg-rose-500 rounded-2xl flex items-center justify-center text-white text-2xl shadow-lg">⚠️</div>
                                <div className="flex-1">
                                    <h3 className="font-black text-rose-800 uppercase tracking-widest text-xs mb-1">Attention Required</h3>
                                    <p className="text-rose-700 font-bold leading-tight">Please complete Unit 1 to set your Curricular Offering so the correct grade levels appear here.</p>
                                </div>
                            </motion.div>
                        )}
                        <AnimatePresence mode="wait">
                    
                    {/* STEP 1: Kindergarten (Mandatory Standalone) */}
                    {currentStep === 1 && (
                        <motion.div key="kinder" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            <div className="text-center mb-10">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                    Step 1 • Early Childhood
                                </span>
                                <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                    Kindergarten Enrollment
                                </h1>
                                <p className="text-slate-500 font-medium italic">"Every child's journey starts here."</p>
                            </div>

                            {(() => {
                                const isAvailable = gradeAvailability.kinder !== false;
                                return (
                                    <>
                                        <div className={`bg-white p-8 rounded-[2.5rem] border-4 transition-all duration-500 shadow-2xl shadow-slate-200/50 mb-8 ${isAvailable ? 'border-indigo-100/50 scale-100' : 'border-slate-100 grayscale scale-[0.98]'}`}>
                                            {/* Master Switch Panel */}
                                            <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50 mb-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                                                    <span className={`text-xl font-bold ${isAvailable ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                        {isAvailable ? "Active Session" : "Not Offered"}
                                                    </span>
                                                </div>
                                                <button 
                                                    onClick={() => toggleAvailability('kinder')}
                                                    className={`px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 ${isAvailable ? 'bg-white text-rose-500 border-2 border-rose-100 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                                >
                                                    {isAvailable ? "Disable Grade" : "Enable Grade"}
                                                </button>
                                            </div>

                                            <label className={`block text-xs font-black uppercase tracking-widest mb-4 ml-2 ${isAvailable ? 'text-slate-400' : 'text-slate-300'}`}>Total Kinder Learners</label>
                                            <input 
                                                type="number" 
                                                value={kinderEnrollment}
                                                disabled={!isAvailable}
                                                onChange={(e) => setKinderEnrollment(e.target.value)}
                                                placeholder="0"
                                                className={`${chunkyInput} ${!isAvailable ? 'bg-slate-50 border-slate-100 text-slate-300' : ''}`}
                                                autoFocus={isAvailable}
                                            />
                                            <div className={`mt-8 p-4 rounded-2xl border-2 flex gap-3 items-center ${isAvailable ? 'bg-amber-50 border-amber-100' : 'bg-slate-50 border-slate-100 opacity-50'}`}>
                                                <span className="text-2xl">💡</span>
                                                <p className={`text-sm font-medium leading-snug ${isAvailable ? 'text-amber-700' : 'text-slate-400'}`}>
                                                    Kindergarten is handled standalone and is <strong>not included</strong> in multigrade combinations.
                                                </p>
                                            </div>
                                        </div>

                                        <button 
                                            onClick={handleNext} 
                                            disabled={isAvailable && (!kinderEnrollment || parseInt(kinderEnrollment) === 0)}
                                            className="w-full h-20 py-5 rounded-[2.5rem] bg-indigo-600 text-white font-black text-xl shadow-[0_15px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                                        >
                                            Continue <FiArrowRight className="w-8 h-8" />
                                        </button>
                                    </>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* STEP 2: Organization Gatekeeper (G1-G6 Only) */}
                    {currentStep === 2 && (
                        <motion.div key="org" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            <div className="text-center mb-10">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                    Step 2 • Elementary Organization
                                </span>
                                <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                    How are your Grade 1 to Grade 6 classes organized?
                                </h1>
                                <p className="text-slate-500 font-medium">Choose the setup that fits your school.</p>
                            </div>

                            <div className="space-y-4 mb-8">
                                {[
                                    { id: 'nano', label: 'Nano Grade', sub: 'Standard 1-grade-per-page (Pure Monograde)', icon: '🏫' },
                                    { id: 'pure_mg', label: 'Pure Multigrade', sub: 'Only builds combinations (e.g. G1+G2)', icon: '🤝' },
                                    { id: 'mixed', label: 'Mixed Organization', sub: 'Both Nano grades and Multigrade combinations', icon: '🔄' }
                                ].map(opt => (
                                    <button
                                        key={opt.id}
                                        onClick={() => setOrgType(opt.id)}
                                        className={`w-full p-6 rounded-[2rem] border-4 transition-all flex items-center gap-6 text-left ${orgType === opt.id ? 'border-indigo-500 bg-indigo-50/50 shadow-xl shadow-indigo-100 scale-[1.02]' : 'border-slate-100 bg-white hover:border-indigo-200'}`}
                                    >
                                        <div className="text-4xl">{opt.icon}</div>
                                        <div className="flex-1">
                                            <h3 className="font-black text-xl text-slate-800">{opt.label}</h3>
                                            <p className="text-sm font-medium text-slate-500">{opt.sub}</p>
                                        </div>
                                        <div className={`w-8 h-8 rounded-full border-4 flex items-center justify-center transition-all ${orgType === opt.id ? 'border-indigo-500 bg-indigo-500' : 'border-slate-200'}`}>
                                            {orgType === opt.id && <FiCheckCircle className="text-white w-5 h-5" />}
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <button 
                                onClick={handleNext} 
                                disabled={!orgType}
                                className="w-full h-20 py-5 rounded-[2.5rem] bg-indigo-600 text-white font-black text-xl shadow-[0_15px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                Continue <FiArrowRight className="w-8 h-8" />
                            </button>
                        </motion.div>
                    )}

                    {/* STEP 3: Multigrade Builder */}
                    {currentStep === 3 && (
                        <motion.div key="mg-builder" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            <div className="text-center mb-10">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                    Step 3 • Combination Builder
                                </span>
                                <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                    Build your multigrade classes
                                </h1>
                                <p className="text-slate-500 font-medium">Create Grade 1-6 combinations and enter totals.</p>
                            </div>

                            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-indigo-100/50 mb-8">
                                <div className="flex justify-between items-center mb-6">
                                    <h2 className="text-xl font-black text-slate-800">Combinations</h2>
                                    <button 
                                        onClick={() => setMgCombinations(prev => [...prev, { id: Date.now(), grades: [], enrollment: 0 }])}
                                        className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center gap-2"
                                    >
                                        + Add Combo
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {mgCombinations.length === 0 && (
                                        <div className="text-center py-16 bg-slate-50 rounded-[2rem] border-4 border-dashed border-slate-100">
                                            <p className="text-slate-400 font-black italic">No combinations added yet.</p>
                                        </div>
                                    )}
                                    {mgCombinations.map((c, idx) => (
                                        <div key={c.id} className="p-6 bg-slate-50 rounded-[2rem] border-2 border-slate-100 relative shadow-inner">
                                            <button 
                                                onClick={() => setMgCombinations(prev => prev.filter(x => x.id !== c.id))}
                                                className="absolute top-6 right-6 text-slate-300 hover:text-rose-500 transition-colors bg-white p-2 rounded-xl"
                                            >
                                                ✕
                                            </button>
                                            <div className="space-y-6">
                                                <div>
                                                    <label className="text-xs font-black uppercase text-indigo-500 tracking-widest block mb-4">G1-G6 Included</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {ELEM_GRADES.map(lvl => {
                                                            const g = ALL_GRADES.find(x => x.id === lvl);
                                                            const isSelected = c.grades.includes(lvl);
                                                            const isLockedByOther = mgCombinations.some(other => other.id !== c.id && other.grades.includes(lvl));
                                                            
                                                            return (
                                                                <button
                                                                    key={lvl}
                                                                    disabled={isLockedByOther}
                                                                    onClick={() => {
                                                                        setMgCombinations(prev => prev.map(p => {
                                                                            if (p.id !== c.id) return p;
                                                                            const newG = isSelected ? p.grades.filter(x => x !== lvl) : [...p.grades, lvl];
                                                                            return { ...p, grades: newG };
                                                                        }));
                                                                    }}
                                                                    className={`px-4 py-2 rounded-xl text-sm font-black transition-all ${isSelected ? 'bg-indigo-600 text-white shadow-lg' : isLockedByOther ? 'bg-slate-200 text-slate-400 cursor-not-allowed grayscale' : 'bg-white text-slate-400 border-2 border-slate-200 hover:border-indigo-300'}`}
                                                                >
                                                                    {g?.label}
                                                                </button>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-1">Combined Total</label>
                                                    <input 
                                                        type="number"
                                                        placeholder="0"
                                                        value={c.enrollment || ""}
                                                        onChange={(e) => setMgCombinations(prev => prev.map(p => p.id === c.id ? { ...p, enrollment: parseInt(e.target.value) || 0 } : p))}
                                                        className={chunkyInput}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleNext} 
                                disabled={mgCombinations.length === 0 || mgCombinations.some(c => c.grades.length === 0 || !c.enrollment)}
                                className="w-full h-20 py-5 rounded-[2.5rem] bg-indigo-600 text-white font-black text-xl shadow-[0_15px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                Continue <FiArrowRight className="w-8 h-8" />
                            </button>
                        </motion.div>
                    )}
                    {/* STEP 4: Grade-by-Grade Enrollment */}
                    {currentStep === 4 && activeNanoGrades[currentGradeIndex] && (
                        <motion.div key={`grade-${activeNanoGrades[currentGradeIndex].id}`} variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            {(() => {
                                const g = activeNanoGrades[currentGradeIndex];
                                const isAvailable = gradeAvailability[g.id] !== false;
                                return (
                                    <div className="space-y-6">
                                        <div className="text-center mb-10">
                                            <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-600 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                                Step 4 • Standalone Grades
                                            </span>
                                            <h1 className="text-5xl font-black text-slate-800 mb-2 leading-tight">
                                                {g.label}
                                            </h1>
                                            <p className="text-slate-500 font-medium">Define availability and total enrollment for this grade.</p>
                                        </div>

                                        <div className={`bg-white rounded-[2.5rem] p-8 shadow-xl border-4 transition-all duration-500 ${isAvailable ? 'border-indigo-100/50 scale-100' : 'border-slate-100 grayscale scale-[0.98]'}`}>
                                            <div className="flex flex-col items-center gap-6">
                                                
                                                {/* Master Switch Panel */}
                                                <div className="w-full flex items-center justify-between p-4 bg-slate-50/50 rounded-3xl border-2 border-slate-100/50">
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Status</span>
                                                        <span className={`text-xl font-bold ${isAvailable ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                            {isAvailable ? "Active Session" : "Not Offered"}
                                                        </span>
                                                    </div>
                                                    <button 
                                                        onClick={() => toggleAvailability(g.id)}
                                                        className={`px-8 py-4 rounded-2xl font-black text-sm transition-all shadow-md active:scale-95 ${isAvailable ? 'bg-white text-rose-500 border-2 border-rose-100 hover:bg-rose-50' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
                                                    >
                                                        {isAvailable ? "Disable Grade" : "Enable Grade"}
                                                    </button>
                                                </div>

                                                {/* Input Field Panel */}
                                                <div className="w-full relative py-4">
                                                    <div className="flex flex-col items-center">
                                                        <label className={`text-sm font-black uppercase tracking-[0.2em] mb-4 ${isAvailable ? 'text-indigo-400' : 'text-slate-300'}`}>
                                                            Learner Count
                                                        </label>
                                                        <div className="relative group">
                                                            <input 
                                                                type="number"
                                                                min="0"
                                                                placeholder="0"
                                                                disabled={!isAvailable}
                                                                value={gradeTotals[g.id] || ""}
                                                                onChange={(e) => handleGradeChange(g.id, e.target.value)}
                                                                className={`w-64 h-32 text-7xl font-black text-center rounded-[2rem] transition-all duration-300 ${isAvailable ? 'bg-indigo-50 border-4 border-indigo-200 text-indigo-700 focus:bg-white focus:border-indigo-500 shadow-xl shadow-indigo-100/50' : 'bg-slate-50 border-2 border-slate-100 text-slate-300'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="bg-slate-800 rounded-[2rem] p-6 shadow-lg flex justify-between items-center text-white">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cumulative Enrollment</span>
                                                <span className="text-3xl font-black">{grandTotal}</span>
                                            </div>
                                            <button 
                                                onClick={handleNext} 
                                                disabled={isAvailable && (!gradeTotals[g.id] || parseInt(gradeTotals[g.id]) === 0)}
                                                className="h-16 px-10 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-lg transition-all shadow-lg active:scale-95 flex items-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                                            >
                                                Next <FiArrowRight className="w-6 h-6" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </motion.div>
                    )}

                    {/* STEP 5: Special Learners / SNED Self-Contained */}
                    {currentStep === 5 && (
                        <motion.div key="step5" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            <div className="text-center mb-8 relative">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-500 rounded-2xl text-2xl mb-4">🌟</div>
                                <h1 className="text-3xl font-black text-slate-800 mb-3">Step 5: Special Learners</h1>
                                <p className="text-slate-500 font-medium px-4">Do you have learners enrolled in specific special programs outside of the standard grade levels?</p>
                            </div>

                            <div className="bg-white rounded-[2.5rem] p-8 shadow-xl border-4 border-indigo-100/50 relative overflow-hidden">
                                {/* Language Toggle */}
                                <div className="absolute top-6 right-8 flex bg-slate-100 p-1 rounded-xl">
                                    <button 
                                        onClick={() => setSnedLanguage("en")}
                                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${snedLanguage === "en" ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        EN
                                    </button>
                                    <button 
                                        onClick={() => setSnedLanguage("ph")}
                                        className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all ${snedLanguage === "ph" ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400'}`}
                                    >
                                        PH
                                    </button>
                                </div>

                                <div className="mb-8 pr-16">
                                    <h3 className="text-xl font-black text-slate-800 leading-tight">
                                        {snedLanguage === "en" 
                                            ? "Do you have Special Needs Education Learners organized in self-contained classes (non-graded)?" 
                                            : "Mayroon ba kayong Special Needs Education Learners na naka-organisa sa self-contained classes (non-graded)?"
                                        }
                                    </h3>
                                </div>

                                <div className="bg-slate-50 rounded-3xl p-5 mb-8 border-2 border-slate-100 italic">
                                    <p className="text-sm font-bold text-slate-500 leading-relaxed text-center">
                                        {snedLanguage === "en"
                                            ? "The self-contained class is exclusively for those LWDs who are diagnosed or identified to have severe to profound disabilities. They are the non-graded LWDs or those who are in the transition program."
                                            : "Ang self-contained class ay eksklusibo para sa mga LWD na may severe hanggang profound na kapansanan. Sila ang mga non-graded LWD o ang mga nasa transition program."
                                        }
                                    </p>
                                </div>

                                <div className="flex gap-4 mb-8">
                                    <button 
                                        onClick={() => setHasSnedSelfContained(true)}
                                        className={`flex-1 flex flex-col items-center gap-2 p-6 rounded-[2rem] border-4 transition-all ${hasSnedSelfContained === true ? 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 grayscale opacity-60'}`}
                                    >
                                        <span className="text-3xl">🙋‍♂️</span>
                                        <span className={`font-black uppercase tracking-widest text-xs ${hasSnedSelfContained === true ? 'text-indigo-600' : 'text-slate-400'}`}>Yes, we have</span>
                                    </button>
                                    <button 
                                        onClick={() => { setHasSnedSelfContained(false); setSnedSelfContainedCount(""); }}
                                        className={`flex-1 flex flex-col items-center gap-2 p-6 rounded-[2rem] border-4 transition-all ${hasSnedSelfContained === false ? 'bg-indigo-50 border-indigo-500 shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 grayscale opacity-60'}`}
                                    >
                                        <span className="text-3xl">✕</span>
                                        <span className={`font-black uppercase tracking-widest text-xs ${hasSnedSelfContained === false ? 'text-indigo-600' : 'text-slate-400'}`}>No, none</span>
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {hasSnedSelfContained === true && (
                                        <motion.div 
                                            initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                            className="flex flex-col items-center pt-4 border-t-2 border-indigo-50"
                                        >
                                            <label className="text-[10px] font-black uppercase text-indigo-400 tracking-[0.2em] mb-4">
                                                Number of Non-Graded Learners
                                            </label>
                                            <input 
                                                type="number" 
                                                min="0" 
                                                placeholder="0" 
                                                value={sned_self_contained_count} 
                                                onChange={(e) => setSnedSelfContainedCount(e.target.value)} 
                                                className="w-48 h-24 text-5xl font-black text-center rounded-3xl bg-indigo-50 border-4 border-indigo-200 text-indigo-700 outline-none focus:bg-white focus:border-indigo-500 shadow-lg"
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="mt-8 flex gap-4">
                                <button
                                    onClick={handleBack}
                                    className="flex-1 h-18 py-5 rounded-[2rem] bg-white border-4 border-slate-100 text-slate-400 font-black text-lg transition-all hover:bg-slate-50 flex items-center justify-center gap-2"
                                >
                                    <FiChevronLeft className="w-6 h-6" /> Back
                                </button>
                                <button 
                                    onClick={handleNext} 
                                    disabled={hasSnedSelfContained === null || (hasSnedSelfContained === true && !sned_self_contained_count)}
                                    className="flex-[2] h-18 py-5 rounded-[2rem] bg-indigo-600 text-white font-black text-lg shadow-[0_10px_30px_rgba(79,70,229,0.3)] hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:shadow-none flex items-center justify-center gap-2"
                                >
                                    Continue <FiArrowRight className="w-6 h-6" />
                                </button>
                            </div>
                        </motion.div>
                    )}

                    {/* STEP 6: ARAL Program (Elementary Only) */}
                    {currentStep === 6 && (
                        <motion.div key="step6" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            <div className="text-center mb-8">
                                <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 text-indigo-500 rounded-2xl text-2xl mb-4">📚</div>
                                <h1 className="text-3xl font-black text-slate-800 mb-3">Step 6: ARAL Program</h1>
                                <p className="text-slate-500 font-medium">Record learners under the Academic Recovery and Acceleration Program (G1-G6).</p>
                            </div>

                            {/* Math */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-slate-100 mb-6">
                                <h3 className="text-lg font-bold text-slate-700 mb-4">Do you have ARAL Learners in Mathematics?</h3>
                                <div className="flex gap-3 mb-4">
                                    <button onClick={() => setHasAralMath(true)} className={`${toggleBtnBase} ${hasAralMath === true ? toggleBtnActive : toggleBtnInactive}`}>Yes</button>
                                    <button onClick={() => { setHasAralMath(false); setAralMath({}); }} className={`${toggleBtnBase} ${hasAralMath === false ? toggleBtnActive : toggleBtnInactive}`}>No</button>
                                </div>
                                <AnimatePresence>
                                    {hasAralMath && (
                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-2 gap-3 mt-4">
                                            {ELEM_GRADES.map(lvl => {
                                                const isAvailable = gradeAvailability[lvl] !== false;
                                                const capacity = gradeCapacities[lvl] || 0;
                                                const currentVal = parseInt(aralMath[lvl]) || 0;
                                                const isExceeded = currentVal > capacity;

                                                return (
                                                    <div key={lvl} className={!isAvailable ? 'opacity-40 grayscale' : ''}>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Grade {lvl.replace('g','')}</p>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max={capacity}
                                                            placeholder="0" 
                                                            disabled={!isAvailable}
                                                            value={aralMath[lvl] || ""} 
                                                            onChange={(e) => handleAralChange('math', lvl, e.target.value)} 
                                                            className={`${chunkyInput} !p-3 !text-lg !mt-0 ${isExceeded ? 'border-red-500 bg-red-50 text-red-600' : ''}`} 
                                                        />
                                                        {isAvailable && (
                                                            <p className={`text-[9px] font-black text-center mt-1 uppercase tracking-tighter ${isExceeded ? 'text-red-500' : 'text-slate-400'}`}>
                                                                Max: {capacity}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Reading */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-slate-100 mb-6">
                                <h3 className="text-lg font-bold text-slate-700 mb-4">Do you have ARAL Learners in Reading?</h3>
                                <div className="flex gap-3 mb-4">
                                    <button onClick={() => setHasAralReading(true)} className={`${toggleBtnBase} ${hasAralReading === true ? toggleBtnActive : toggleBtnInactive}`}>Yes</button>
                                    <button onClick={() => { setHasAralReading(false); setAralReading({}); }} className={`${toggleBtnBase} ${hasAralReading === false ? toggleBtnActive : toggleBtnInactive}`}>No</button>
                                </div>
                                <AnimatePresence>
                                    {hasAralReading && (
                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-2 gap-3 mt-4">
                                            {ELEM_GRADES.map(lvl => {
                                                const isAvailable = gradeAvailability[lvl] !== false;
                                                const capacity = gradeCapacities[lvl] || 0;
                                                const currentVal = parseInt(aralReading[lvl]) || 0;
                                                const isExceeded = currentVal > capacity;

                                                return (
                                                    <div key={lvl} className={!isAvailable ? 'opacity-40 grayscale' : ''}>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Grade {lvl.replace('g','')}</p>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max={capacity}
                                                            placeholder="0" 
                                                            disabled={!isAvailable}
                                                            value={aralReading[lvl] || ""} 
                                                            onChange={(e) => handleAralChange('reading', lvl, e.target.value)} 
                                                            className={`${chunkyInput} !p-3 !text-lg !mt-0 ${isExceeded ? 'border-red-500 bg-red-50 text-red-600' : ''}`} 
                                                        />
                                                        {isAvailable && (
                                                            <p className={`text-[9px] font-black text-center mt-1 uppercase tracking-tighter ${isExceeded ? 'text-red-500' : 'text-slate-400'}`}>
                                                                Max: {capacity}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Science */}
                            <div className="bg-white rounded-3xl p-6 shadow-sm border-2 border-slate-100 mb-8">
                                <h3 className="text-lg font-bold text-slate-700 mb-4">Do you have ARAL Learners in Science?</h3>
                                <div className="flex gap-3 mb-4">
                                    <button onClick={() => setHasAralScience(true)} className={`${toggleBtnBase} ${hasAralScience === true ? toggleBtnActive : toggleBtnInactive}`}>Yes</button>
                                    <button onClick={() => { setHasAralScience(false); setAralScience({}); }} className={`${toggleBtnBase} ${hasAralScience === false ? toggleBtnActive : toggleBtnInactive}`}>No</button>
                                </div>
                                <AnimatePresence>
                                    {hasAralScience && (
                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="grid grid-cols-2 gap-3 mt-4">
                                            {ELEM_GRADES.map(lvl => {
                                                const isAvailable = gradeAvailability[lvl] !== false;
                                                const capacity = gradeCapacities[lvl] || 0;
                                                const currentVal = parseInt(aralScience[lvl]) || 0;
                                                const isExceeded = currentVal > capacity;

                                                return (
                                                    <div key={lvl} className={!isAvailable ? 'opacity-40 grayscale' : ''}>
                                                        <p className="text-[10px] font-bold text-slate-400 uppercase text-center mb-1">Grade {lvl.replace('g','')}</p>
                                                        <input 
                                                            type="number" 
                                                            min="0" 
                                                            max={capacity}
                                                            placeholder="0" 
                                                            disabled={!isAvailable}
                                                            value={aralScience[lvl] || ""} 
                                                            onChange={(e) => handleAralChange('science', lvl, e.target.value)} 
                                                            className={`${chunkyInput} !p-3 !text-lg !mt-0 ${isExceeded ? 'border-red-500 bg-red-50 text-red-600' : ''}`} 
                                                        />
                                                        {isAvailable && (
                                                            <p className={`text-[9px] font-black text-center mt-1 uppercase tracking-tighter ${isExceeded ? 'text-red-500' : 'text-slate-400'}`}>
                                                                Max: {capacity}
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <button 
                                onClick={handleNext} 
                                disabled={
                                    hasAralMath === null || 
                                    hasAralReading === null || 
                                    hasAralScience === null ||
                                    (hasAralMath === true && (Object.values(aralMath).reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 0 || ELEM_GRADES.some(lvl => (parseInt(aralMath[lvl]) || 0) > (gradeCapacities[lvl] || 0)))) ||
                                    (hasAralReading === true && (Object.values(aralReading).reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 0 || ELEM_GRADES.some(lvl => (parseInt(aralReading[lvl]) || 0) > (gradeCapacities[lvl] || 0)))) ||
                                    (hasAralScience === true && (Object.values(aralScience).reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 0 || ELEM_GRADES.some(lvl => (parseInt(aralScience[lvl]) || 0) > (gradeCapacities[lvl] || 0))))
                                } 
                                className="w-full py-5 rounded-2xl bg-indigo-600 text-white font-black text-lg shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-slate-300 disabled:cursor-not-allowed"
                            >
                                Continue <FiArrowRight className="w-6 h-6 inline ml-2" />
                            </button>
                        </motion.div>
                    )}
                        </AnimatePresence>
                    </>
                )}
            </main>

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message="Smart Enrollment Sync Saved! Your learner counts are locked in." redirectUrl="/modular-dashboard" />
        </div>
    );
};

export default Unit2Learners;
