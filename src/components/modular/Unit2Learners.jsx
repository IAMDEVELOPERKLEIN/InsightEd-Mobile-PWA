import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiChevronLeft, FiAlertTriangle, FiUnlock } from 'react-icons/fi';
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

    // Step 4: Grade Totals & Availability (Monograde/Standalone)
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

    const activeMonogrades = useMemo(() => {
        if (!schoolOffering) return [];
        // Filters based on available grades. Kinder is Step 1.
        return availableGrades.filter(g => g.id !== 'kinder' && !lockedGrades.has(g.id));
    }, [availableGrades, schoolOffering, lockedGrades]);

    const grandTotal = useMemo(() => {
        let sum = (parseInt(kinderEnrollment) || 0);
        // Monograde totals
        activeMonogrades.forEach(g => sum += (parseInt(gradeTotals[g.id]) || 0));
        // Multigrade combinations
        mgCombinations.forEach(c => {
            c.grades.forEach(lvl => sum += (parseInt(gradeTotals[lvl]) || 0));
        });
        // SNED
        if (hasSnedSelfContained) sum += (parseInt(sned_self_contained_count) || 0);

        return sum;
    }, [kinderEnrollment, gradeTotals, activeMonogrades, mgCombinations, hasSnedSelfContained, sned_self_contained_count, gradeAvailability]);

    const genderSum = useMemo(() => {
        return (parseInt(genderTotals.male) || 0) + (parseInt(genderTotals.female) || 0);
    }, [genderTotals]);

    const gradeCapacities = useMemo(() => {
        const caps = {};
        // Default all to 0
        ELEM_GRADES.forEach(id => caps[id] = 0);

        // 1. Monograde Capacities
        activeMonogrades.forEach(g => {
            caps[g.id] = (parseInt(gradeTotals[g.id]) || 0);
        });
        // 2. Add Multigrade combinations back into capacity for each grade (for ARAL validation)
        mgCombinations.forEach(c => {
            c.grades.forEach(lvl => {
                if (!caps[lvl]) caps[lvl] = 0;
                caps[lvl] += (parseInt(gradeTotals[lvl]) || 0);
            });
        });
        return caps;
    }, [gradeTotals, activeMonogrades, mgCombinations]);

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
        let limitedVal = val;
        if (limitedVal.length > 4) limitedVal = limitedVal.slice(0, 4);
        setGradeTotals(prev => ({ ...prev, [gradeId]: limitedVal }));
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
        let limitedVal = val;
        if (limitedVal.length > 4) limitedVal = limitedVal.slice(0, 4);
        if (subject === 'math') setAralMath(prev => ({ ...prev, [gradeId]: limitedVal }));
        if (subject === 'reading') setAralReading(prev => ({ ...prev, [gradeId]: limitedVal }));
        if (subject === 'science') setAralScience(prev => ({ ...prev, [gradeId]: limitedVal }));
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
        }
        // Step 2: Org Gatekeeper
        else if (currentStep === 2) {
            if (!orgType) return;
            if (orgType === 'pure_mg') {
                setCurrentStep(3); // Go to Combinations Builder
            } else if (orgType === 'mixed') {
                setCurrentStep(3); // Start with combinations
            } else { // orgType === 'nano'
                setCurrentStep(4); // Go to Monograde Pages
            }
        }
        // Step 3: MG Builder
        else if (currentStep === 3) {
            if (orgType === 'pure_mg') {
                setCurrentStep(5); // Skip Monograde Pages, go to SNED
            } else {
                setCurrentStep(4); // Mixed: Go to Monograde Pages
            }
        }
        // Step 4: Grade-by-Grade (Monograde/Standalone)
        else if (currentStep === 4) {
            if (activeMonogrades.length === 0) {
                setCurrentStep(5);
                window.scrollTo({ top: 0, behavior: 'smooth' });
                return;
            }
            if (currentGradeIndex < activeMonogrades.length - 1) {
                setCurrentGradeIndex(prev => prev + 1);
            } else {
                setCurrentStep(5); // Finished grades -> SNED
            }
        }
        // Step 6: ARAL (Skip if not elementary)
        else if (currentStep === 5 && !hasElementary) {
            setCurrentStep(7); // Skip ARAL, go to Gender
        } else {
            setCurrentStep(prev => prev + 1);
        }
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
        else if (currentStep === 3) {
            setCurrentStep(2);
            return;
        }

        // Back from Monograde Pages
        else if (currentStep === 4) {
            if (currentGradeIndex > 0) {
                setCurrentGradeIndex(prev => prev - 1);
            } else {
                if (hasElementary) {
                    setCurrentStep(orgType === 'mixed' ? 3 : 2);
                } else if (hasKinder) {
                    setCurrentStep(1);
                } else {
                    navigate("/modular-dashboard");
                }
            }
            return;
        }

        // Back from SNED
        else if (currentStep === 5) {
            if (activeMonogrades.length > 0) {
                setCurrentGradeIndex(activeMonogrades.length - 1);
                setCurrentStep(4);
            } else {
                if (hasElementary) {
                    setCurrentStep(orgType === 'pure_mg' ? 3 : 2);
                } else if (hasKinder) {
                    setCurrentStep(1);
                } else {
                    navigate("/modular-dashboard");
                }
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
            const monogrades = activeMonogrades.map(g => {
                const totalActive = gradeAvailability[g.id] !== false;
                const count = parseInt(gradeTotals[g.id]) || 0;
                return {
                    grade_level: g.id,
                    is_active: totalActive,
                    total: totalActive ? count : 0,
                    male: 0, female: 0
                };
            });

            // For Multigrade combinations, map the individual inputs directly down to the database columns
            const mgGrades = mgCombinations.flatMap(c => {
                return c.grades.map((id) => ({
                    grade_level: id,
                    is_active: true,
                    total: parseInt(gradeTotals[id]) || 0,
                    male: 0, female: 0
                }));
            });

            const kinderGrade = hasKinder ? [{
                grade_level: 'kinder',
                is_active: gradeAvailability.kinder !== false,
                total: (gradeAvailability.kinder !== false) ? (parseInt(kinderEnrollment) || 0) : 0,
                male: 0, female: 0
            }] : [];

            const downstreamGrades = [...kinderGrade, ...monogrades, ...mgGrades];

            const payload = {
                array: downstreamGrades, 
                questionnaire: questionnaire 
            };

            // Calculate the 3 multigrade string slots for DB fixed-column parity
            const buildMgString = (gradesArray) => {
                if (!gradesArray || gradesArray.length === 0) return null;
                const labels = gradesArray.map(gId => gId.replace('g', '')); // 'g1' -> '1'
                if (labels.length === 1) return `Grade ${labels[0]}`;
                if (labels.length === 2) return `Grade ${labels[0]} & ${labels[1]}`;
                
                const last = labels.pop();
                return `Grade ${labels.join(', ')} & ${last}`;
            };

            const mg_1 = mgCombinations.length > 0 ? buildMgString(mgCombinations[0].grades) : null;
            const mg_2 = mgCombinations.length > 1 ? buildMgString(mgCombinations[1].grades) : null;
            const mg_3 = mgCombinations.length > 2 ? buildMgString(mgCombinations[2].grades) : null;

            const mg_1_enrollment = mgCombinations.length > 0 ? mgCombinations[0].grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0) : null;
            const mg_2_enrollment = mgCombinations.length > 1 ? mgCombinations[1].grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0) : null;
            const mg_3_enrollment = mgCombinations.length > 2 ? mgCombinations[2].grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0) : null;

            const res = await fetch(`/api/ph_schools/unit2/${storedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    unit2_simplified_enrollment: payload,
                    sned_self_contained_count: parseInt(sned_self_contained_count) || 0,
                    multigrade_groupings_1: mg_1,
                    multigrade_groupings_2: mg_2,
                    multigrade_groupings_3: mg_3,
                    multigrade_enrollment_1: mg_1_enrollment,
                    multigrade_enrollment_2: mg_2_enrollment,
                    multigrade_enrollment_3: mg_3_enrollment
                })
            });

            if (res.ok) {
                // Sync progress to cloud for Activity Dashboard (fire-and-forget)
                fetch(`/api/user/progress`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ unitId: 2, schoolId: storedId })
                }).catch(e => console.warn("Activity sync failed:", e));

                // Update localStorage so ModularDashboard immediately reflects completion
                const stored = localStorage.getItem('quest_progress');
                let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
                if (!progress.completedUnits.includes(2)) {
                    progress.completedUnits.push(2);
                    progress.xp = (progress.xp || 0) + 200;
                }
                localStorage.setItem('quest_progress', JSON.stringify(progress));

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
            <div className="max-w-md mx-auto pb-32 mt-4">
                {/* Header */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="w-20 h-20 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200"
                    >
                        <span className="text-4xl text-white">👥</span>
                    </motion.div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-indigo-200">
                        Unit 2 • Learners
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 leading-tight">Summary</h1>
                    <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="col-span-2 bg-indigo-600 rounded-[2rem] p-6 text-white shadow-2xl shadow-indigo-200 flex items-center justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Grand Total</p>
                            <h2 className="text-5xl font-black leading-none">{grandTotal}</h2>
                        </div>
                        <div className="text-6xl opacity-20 relative z-10">🌍</div>
                        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    </div>
                    
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                            👦
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Male</span>
                        <span className="text-3xl font-black text-blue-600 mt-1">{maleVal}</span>
                    </div>
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-rose-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                            👧
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Female</span>
                        <span className="text-3xl font-black text-rose-600 mt-1">{femaleVal}</span>
                    </div>
                </div>

                {/* Multigrade Combinations */}
                {mgCombinations.length > 0 && (
                    <section className="mb-8">
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-rose-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Multigrade Joinings</h3>
                        </div>
                        <div className="grid gap-3">
                            {mgCombinations.map((c, idx) => {
                                const labels = c.grades.map(g => g.replace('g', ''));
                                let labelStr = "";
                                if (labels.length === 1) labelStr = `Grade ${labels[0]}`;
                                else if (labels.length === 2) labelStr = `Grade ${labels[0]} & ${labels[1]}`;
                                else if (labels.length > 2) {
                                    const last = labels.pop();
                                    labelStr = `Grade ${labels.join(', ')} & ${last}`;
                                }
                                
                                const totalJoined = c.grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0);
                                return (
                                    <div key={c.id} className="bg-white rounded-2xl p-4 border-2 border-rose-100 flex items-center justify-between shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-16 h-16 bg-rose-50 rounded-full blur-xl translate-x-4 -translate-y-4" />
                                        <div className="flex flex-col relative z-10 w-full">
                                            <div className="flex justify-between items-center mb-3">
                                                <span className="font-black text-rose-800 text-lg">{labelStr}</span>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[9px] uppercase font-black text-rose-400 tracking-widest mb-1">Joined Enrollment</span>
                                                    <div className="bg-rose-500 px-4 py-1.5 rounded-xl shadow-md border border-rose-600">
                                                        <span className="font-black text-white text-lg">{totalJoined}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2 border-t border-slate-50 pt-3">
                                                {c.grades.map(g => (
                                                    <span key={g} className="text-[10px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-lg font-bold uppercase tracking-widest">
                                                        {ALL_GRADES.find(x => x.id === g)?.label}: {parseInt(gradeTotals[g]) || 0}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Grade Breakdown */}
                <section>
                    <div className="flex items-center gap-2 mb-4 ml-2">
                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Demographics Breakdown</h3>
                    </div>
                    <div className="grid gap-3">
                        {availableGrades.map((g) => {
                            const count = g.id === 'kinder' ? (parseInt(kinderEnrollment) || 0) : (parseInt(gradeTotals[g.id]) || 0);
                            const isInactive = gradeAvailability[g.id] === false;
                            if (count === 0 && isInactive) return null;

                            return (
                                <div key={g.id} className="bg-white rounded-2xl p-4 border border-slate-50 flex items-center justify-between shadow-sm">
                                    <div className="flex flex-col">
                                        <span className="font-bold text-slate-700 text-lg">{g.label}</span>
                                        <span className="text-[10px] text-slate-400 font-medium uppercase">{isInactive ? "Inactive" : "Standard Enrollment"}</span>
                                    </div>
                                    <div className="bg-indigo-50 px-4 py-2 rounded-xl">
                                        <span className="font-black text-indigo-700 text-lg">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Unlock Action */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12"
                >
                    <button 
                        onClick={() => setIsReadOnly(false)}
                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiUnlock className="w-5 h-5 text-indigo-700" />
                        </div>
                        <span>Unlock to Edit Enrollment</span>
                    </button>
                    <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">Authorized Access Only</p>
                </motion.div>
            </div>
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
                                    const gradeWeight = 1 / (activeMonogrades.length || 1);
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
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (val.length > 4) val = val.slice(0, 4);
                                                    setKinderEnrollment(val);
                                                }}
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
                                    { id: 'nano', label: 'Monograde', sub: 'Standard 1-grade-per-page (Pure Monograde)', icon: '🏫' },
                                    { id: 'pure_mg', label: 'Pure Multigrade', sub: 'Only builds combinations (e.g. G1+G2)', icon: '🤝' },
                                    { id: 'mixed', label: 'Mixed Organization', sub: 'Both Monograde grades and Multigrade combinations', icon: '🔄' }
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
                                                {c.grades.length > 0 && (
                                                    <div className="mt-4 pt-4 border-t-2 border-slate-100">
                                                        <label className="text-xs font-black uppercase text-slate-400 tracking-widest block mb-4">Individual Grade Totals</label>
                                                        <div className="grid grid-cols-2 gap-4">
                                                            {c.grades.map(lvl => {
                                                                const gName = ALL_GRADES.find(x => x.id === lvl)?.label || lvl;
                                                                return (
                                                                    <div key={`mg-input-${lvl}`} className="bg-white p-4 rounded-2xl border-2 border-slate-100 shadow-sm">
                                                                        <label className="text-[10px] font-black uppercase text-indigo-400 tracking-widest block mb-2">{gName}</label>
                                                                        <input 
                                                                            type="number"
                                                                            placeholder="0"
                                                                            value={gradeTotals[lvl] || ""}
                                                                            onChange={(e) => handleGradeChange(lvl, e.target.value)}
                                                                            className={`${chunkyInput} !h-16 !text-3xl`}
                                                                        />
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                        <div className="mt-4 flex items-center justify-between bg-indigo-50 p-4 rounded-2xl border-2 border-indigo-100">
                                                            <span className="text-xs font-black uppercase text-indigo-600 tracking-widest">Total Joined Enrollment</span>
                                                            <span className="text-2xl font-black text-indigo-800">
                                                                {c.grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={handleNext} 
                                disabled={
                                    mgCombinations.length === 0 || 
                                    mgCombinations.some(c => 
                                        c.grades.length === 0 || 
                                        c.grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0) === 0
                                    )
                                }
                                className="w-full h-20 py-5 rounded-[2.5rem] bg-indigo-600 text-white font-black text-xl shadow-[0_15px_40px_rgba(79,70,229,0.3)] hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                            >
                                Continue <FiArrowRight className="w-8 h-8" />
                            </button>
                        </motion.div>
                    )}
                    {/* STEP 4: Grade-by-Grade Enrollment */}
                    {currentStep === 4 && activeMonogrades[currentGradeIndex] && (
                        <motion.div key={`grade-${activeMonogrades[currentGradeIndex].id}`} variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            {(() => {
                                const g = activeMonogrades[currentGradeIndex];
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
                                                onChange={(e) => {
                                                    let val = e.target.value;
                                                    if (val.length > 4) val = val.slice(0, 4);
                                                    setSnedSelfContainedCount(val);
                                                }} 
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

                    {/* STEP 7: Global Gender Breakdown */}
                    {currentStep === 7 && (
                        <motion.div key="step7" variants={pageVariants} initial="initial" animate="in" exit="out" transition={{ duration: 0.3 }}>
                            <div className="text-center mb-10">
                                <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black uppercase tracking-[0.2em] mb-4 shadow-sm">
                                    Step 7 • Final Validation
                                </span>
                                <h1 className="text-4xl font-black text-slate-800 mb-2 leading-tight">
                                    Gender Breakdown
                                </h1>
                                <p className="text-slate-500 font-medium">Verify the male and female totals match the grand total of {grandTotal}.</p>
                            </div>

                            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-indigo-100/50 mb-8">
                                <div className="space-y-8">
                                    <div>
                                        <div className="flex items-center justify-between mb-4 ml-2">
                                            <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Male Learners 👦</label>
                                            <span className="text-[10px] font-black bg-blue-50 text-blue-600 px-3 py-1 rounded-lg uppercase">Auto-calculates</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={genderTotals.male} 
                                            onChange={(e) => handleGenderChange('male', e.target.value)}
                                            placeholder="0"
                                            className={chunkyInput}
                                        />
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4 ml-2">
                                            <label className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Female Learners 👧</label>
                                            <span className="text-[10px] font-black bg-rose-50 text-rose-600 px-3 py-1 rounded-lg uppercase">Auto-calculates</span>
                                        </div>
                                        <input 
                                            type="number" 
                                            value={genderTotals.female} 
                                            onChange={(e) => handleGenderChange('female', e.target.value)}
                                            placeholder="0"
                                            className={chunkyInput}
                                        />
                                    </div>
                                </div>

                                <div className={`mt-10 p-6 rounded-3xl border-4 transition-all flex items-center gap-4 ${isMathPerfect ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shadow-lg ${isMathPerfect ? 'bg-emerald-500 text-white' : 'bg-amber-500 text-white'}`}>
                                        {isMathPerfect ? '✅' : '⚖️'}
                                    </div>
                                    <div className="flex-1">
                                        <h4 className={`font-black uppercase tracking-widest text-[10px] mb-1 ${isMathPerfect ? 'text-emerald-700' : 'text-amber-700'}`}>
                                            {isMathPerfect ? 'Verification Pass' : 'Verification Pending'}
                                        </h4>
                                        <p className={`text-sm font-bold leading-tight ${isMathPerfect ? 'text-emerald-800' : 'text-amber-800'}`}>
                                            {isMathPerfect 
                                                ? "Male + Female perfectly matches the grand enrollment total. You're ready to save!" 
                                                : `The total (${genderSum}) must exactly match the grand total of ${grandTotal}.`
                                            }
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleSave} 
                                disabled={isSaving || !isMathPerfect}
                                className="w-full h-20 py-5 rounded-[2.5rem] bg-emerald-600 text-white font-black text-xl shadow-[0_15px_40px_rgba(16,185,129,0.3)] hover:bg-emerald-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:bg-slate-700 disabled:cursor-not-allowed"
                            >
                                {isSaving ? (
                                    <>
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving Profile...
                                    </>
                                ) : (
                                    <>
                                        💾 Save School Profile
                                    </>
                                )}
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
