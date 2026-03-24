import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiCheckCircle, FiChevronLeft, FiAlertTriangle, FiUnlock, FiSave, FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import SuccessModal from '../SuccessModal';
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from '../../db';
import { useAuth } from "../../context/AuthContext";

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

const Unit2Learners = ({ targetSchoolId, isReadOnly: propReadOnly }) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(propReadOnly || false);
    const [hasSubmitted, setHasSubmitted] = useState(false);

    const { user } = useAuth();
    const [isReviewMode, setIsReviewMode] = useState(false); 
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);

    // Final read-only determination: prop takes precedence
    const effectiveReadOnly = propReadOnly || isReadOnly;

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
            const storedId = targetSchoolId || localStorage.getItem('schoolId');
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
                        
                        // Check for Drafts
                        const [draft2, draft1] = await Promise.all([
                            getUnitDraft(2, storedId),
                            getUnitDraft(1, storedId)
                        ]);

                        // Prioritization: Unit 1 Draft Cache (nested in formData) -> localStorage -> Database
                        const storedOffering = draft1?.formData?.curricular_offering 
                            || localStorage.getItem('schoolOffering') 
                            || d.curricular_offering
                            || "";
                        
                        setSchoolOffering(storedOffering);

                        if (draft2) {
                            setKinderEnrollment(draft2.kinderEnrollment || "");
                            setOrgType(draft2.orgType || null);
                            setMgCombinations(draft2.mgCombinations || []);
                            setGradeTotals(draft2.gradeTotals || {});
                            setGradeAvailability(draft2.gradeAvailability || {});
                            setHasSnedSelfContained(draft2.hasSnedSelfContained);
                            setSnedSelfContainedCount(draft2.sned_self_contained_count || "");
                            setHasAralMath(draft2.hasAralMath);
                            setAralMath(draft2.aralMath || {});
                            setHasAralReading(draft2.hasAralReading);
                            setAralReading(draft2.aralReading || {});
                            setHasAralScience(draft2.hasAralScience);
                            setAralScience(draft2.aralScience || {});
                            setGenderTotals(draft2.genderTotals || { male: "", female: "" });
                            setCurrentStep(draft2.step || 1);
                            setCurrentGradeIndex(draft2.currentGradeIndex || 0);
                            
                            setShowWelcomeBack(true);
                            setTimeout(() => setShowWelcomeBack(false), 3000);
                        }

                        // --- Calculate Available Grades based on Offering ---
                        const text = storedOffering.toLowerCase();
                        let filteredIds = [];

                        if (text === "purely elementary") {
                            filteredIds = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6'];
                        } else if (text === "elementary school and junior high school (k-10)") {
                            filteredIds = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10'];
                        } else if (text === "junior high and senior high") {
                            filteredIds = ['g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
                        } else if (text === "all offering (k to 12)") {
                            filteredIds = ['kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6', 'g7', 'g8', 'g9', 'g10', 'g11', 'g12'];
                        } else if (text === "purely junior high school") {
                            filteredIds = ['g7', 'g8', 'g9', 'g10'];
                        } else if (text === "purely senior high school") {
                            filteredIds = ['g11', 'g12'];
                        } else {
                            // Fallback for legacy data or partial matches
                            if (text.includes("elementary") || text.includes("primary")) {
                                filteredIds.push('kinder', 'g1', 'g2', 'g3', 'g4', 'g5', 'g6');
                            }
                            if (text.includes("jhs") || text.includes("junior") || text.includes("high school")) {
                                filteredIds.push('g7', 'g8', 'g9', 'g10');
                            }
                            if (text.includes("shs") || text.includes("senior")) {
                                filteredIds.push('g11', 'g12');
                            }
                        }

                        filteredIds = [...new Set(filteredIds)];
                        const uniqueObj = ALL_GRADES.filter(g => filteredIds.includes(g.id));
                        
                        setAvailableGrades(uniqueObj);
                        const hasK = uniqueObj.some(g => g.id === 'kinder');
                        const hasE = uniqueObj.some(g => g.type === 'elem' && g.id !== 'kinder');
                        setHasKinder(hasK);
                        setHasElementary(hasE);

                        // 2. Auto-advance if Kinder/Elementary is not offered AND no draft exists
                        if (!draft2) {
                            if (!hasK) {
                                if (hasE) {
                                    setCurrentStep(2);
                                } else if (uniqueObj.length > 0) {
                                    setOrgType('nano');
                                    setCurrentStep(4);
                                }
                            }
                        } else {
                            // Ensure the restored grade index is still valid
                            const lockedG = new Set();
                            (draft2.mgCombinations || []).forEach(c => c.grades.forEach(gg => lockedG.add(gg)));
                            const monogrades = uniqueObj.filter(g => g.id !== 'kinder' && !lockedG.has(g.id));
                            
                            if (draft2.step === 4 && monogrades.length > 0) {
                                const clampedIndex = Math.min(draft2.currentGradeIndex || 0, monogrades.length - 1);
                                setCurrentGradeIndex(clampedIndex);
                            } else if (draft2.step === 4 && monogrades.length === 0) {
                                setCurrentStep(5); 
                            }
                        }

                        // 3. Restore Backend Data if finalized
                        if (d.unit2_simplified_enrollment) {
                            setHasSubmitted(true);
                            
                            // If no draft exists, we load the backend data as the starting point in Read Only mode.
                            // If a draft DOES exist, we skip this so the fresh draft (loaded above) isn't overwritten, 
                            // and we ensure the form is in Edit Mode.
                            if (!draft2) {
                                setIsReadOnly(true);
                                try {
                                    const parsed = typeof d.unit2_simplified_enrollment === 'string' 
                                        ? JSON.parse(d.unit2_simplified_enrollment) 
                                        : d.unit2_simplified_enrollment;
                                    
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
                                    }
                                } catch (e) { console.warn("Parse error", e); }
                            } else {
                                // Draft exists: strictly ensure we are in edit mode
                                setIsReadOnly(false);
                            }
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

    // ── Safety Guard: Ensure currentGradeIndex stays in bounds ──────────────────
    useEffect(() => {
        if (!loading && currentStep === 4) {
            if (activeMonogrades.length === 0) {
                setCurrentStep(5);
            } else if (currentGradeIndex >= activeMonogrades.length) {
                setCurrentGradeIndex(activeMonogrades.length - 1);
            }
        }
    }, [activeMonogrades.length, currentStep, loading, currentGradeIndex]);

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
        const cappedVal = Math.min(Math.max(0, numVal), grandTotal);
        const otherVal = grandTotal - cappedVal;

        if (field === 'male') {
            setGenderTotals({
                male: val === "" ? "" : cappedVal.toString(),
                female: val === "" ? "" : otherVal.toString()
            });
        } else {
            setGenderTotals({
                male: val === "" ? "" : otherVal.toString(),
                female: val === "" ? "" : cappedVal.toString()
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
                    // If we came from MG Builder (pure_mg is impossible at step 4, but mixed is)
                    setCurrentStep(orgType === 'mixed' ? 3 : 2);
                } else if (hasKinder) {
                    setCurrentStep(1);
                } else {
                    // Truly the first step for JHS/SHS only schools
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
            } else if (hasElementary) {
                // Skip Step 4 if monogrades empty
                setCurrentStep(orgType === 'pure_mg' ? 3 : 2);
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

    const handleSaveDraftAndExit = async () => {
        const storedId = localStorage.getItem('schoolId');
        if (!storedId) return;
        
        const draftData = {
            kinderEnrollment,
            orgType,
            mgCombinations,
            gradeTotals,
            gradeAvailability,
            hasSnedSelfContained,
            sned_self_contained_count,
            hasAralMath, aralMath,
            hasAralReading, aralReading,
            hasAralScience, aralScience,
            genderTotals,
            step: currentStep,
            currentGradeIndex
        };
        
        await saveUnitDraft(2, storedId, draftData);
        navigate("/modular-dashboard");
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
                await clearUnitDraft(2, storedId);
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
        const malePercent = grandTotal > 0 ? Math.round((maleVal / grandTotal) * 100) : 0;
        const femalePercent = grandTotal > 0 ? Math.round((femaleVal / grandTotal) * 100) : 0;
        
        return (
            <div className="max-w-md mx-auto pb-32 mt-4 space-y-8">
                {/* Header */}
                <div className="text-center mb-10">
                    <motion.div 
                        initial={{ scale: 0 }} 
                        animate={{ scale: 1 }} 
                        className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-100"
                    >
                        <span className="text-4xl text-white">👥</span>
                    </motion.div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-indigo-100">
                        Unit 2 • Learner Demographics
                    </span>
                    <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight px-4">Enrollment Registry</h1>
                    <p className="text-slate-500 font-medium mt-2 italic px-4">"Total enrollment verified and synced with ESF7 Registry"</p>
                </div>

                {/* Primary Metric Card */}
                <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group border border-white/5">
                    <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 rotate-12 group-hover:rotate-0 transition-transform duration-700">📚</div>
                    <div className="relative z-10">
                        <p className="text-indigo-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Total Combined Enrollment</p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-6xl font-black leading-none tracking-tighter">{grandTotal}</h2>
                            <span className="text-indigo-400 font-bold text-lg uppercase tracking-widest">Learners</span>
                        </div>
                        <div className="mt-8 flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10">
                            <div className="flex-1">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-2 text-indigo-200">
                                    <span>Gender Split</span>
                                    <span>{malePercent}% M / {femalePercent}% F</span>
                                </div>
                                <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden flex">
                                    <div style={{ width: `${malePercent}%` }} className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.5)]" />
                                    <div style={{ width: `${femalePercent}%` }} className="h-full bg-rose-400 shadow-[0_0_10px_rgba(244,114,182,0.5)]" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gender Breakdown Blocks */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-blue-50 border border-blue-100/50 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-blue-500 flex items-center justify-center mb-3 shadow-lg shadow-blue-200 text-2xl text-white">👦</div>
                        <span className="text-[10px] font-black uppercase text-blue-400 tracking-widest">Male Total</span>
                        <span className="text-3xl font-black text-blue-700 mt-1">{maleVal}</span>
                    </div>
                    <div className="bg-rose-50 border border-rose-100/50 rounded-3xl p-6 flex flex-col items-center text-center shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-rose-500 flex items-center justify-center mb-3 shadow-lg shadow-rose-200 text-2xl text-white">👧</div>
                        <span className="text-[10px] font-black uppercase text-rose-400 tracking-widest">Female Total</span>
                        <span className="text-3xl font-black text-rose-700 mt-1">{femaleVal}</span>
                    </div>
                </div>

                {/* Special Groups: SNED & ARAL */}
                <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm space-y-8">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Specialized Programs</h3>
                    </div>
                    
                    {/* SNED Block */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest">SNED Self-Contained</span>
                            <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border ${hasSnedSelfContained ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                                {hasSnedSelfContained ? "Active" : "None"}
                            </span>
                        </div>
                        {hasSnedSelfContained && (
                            <div className="p-5 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                <div>
                                    <p className="text-2xl font-black text-emerald-900 leading-none">{sned_self_contained_count}</p>
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase mt-1">Non-Graded Learners</p>
                                </div>
                                <div className="text-3xl">🧩</div>
                            </div>
                        )}
                    </div>

                    {/* ARAL Participation */}
                    <div className="space-y-4 pt-4 border-t border-slate-50">
                        <span className="text-[11px] font-black uppercase text-slate-400 tracking-widest block mb-4">ARAL Program Participation</span>
                        <div className="grid grid-cols-3 gap-3">
                            <div className={`p-4 rounded-2xl border text-center ${hasAralMath ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase text-indigo-400 mb-2">Math</p>
                                <p className={`text-xl font-black ${hasAralMath ? 'text-indigo-900' : 'text-slate-300'}`}>
                                    {hasAralMath ? Object.values(aralMath).reduce((s, v) => s + (parseInt(v) || 0), 0) : 0}
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl border text-center ${hasAralReading ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase text-indigo-400 mb-2">Reading</p>
                                <p className={`text-xl font-black ${hasAralReading ? 'text-indigo-900' : 'text-slate-300'}`}>
                                    {hasAralReading ? Object.values(aralReading).reduce((s, v) => s + (parseInt(v) || 0), 0) : 0}
                                </p>
                            </div>
                            <div className={`p-4 rounded-2xl border text-center ${hasAralScience ? 'bg-indigo-50 border-indigo-100' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[9px] font-black uppercase text-indigo-400 mb-2">Science</p>
                                <p className={`text-xl font-black ${hasAralScience ? 'text-indigo-900' : 'text-slate-300'}`}>
                                    {hasAralScience ? Object.values(aralScience).reduce((s, v) => s + (parseInt(v) || 0), 0) : 0}
                                </p>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Multigrade Joinings */}
                {mgCombinations.length > 0 && (
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 mb-2 ml-2">
                            <div className="w-1.5 h-6 bg-rose-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Multigrade Joinings</h3>
                        </div>
                        <div className="grid gap-4">
                            {mgCombinations.map((c) => {
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
                                    <div key={c.id} className="bg-white rounded-[2rem] p-6 border border-rose-100 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 w-24 h-24 bg-rose-50 rounded-full blur-2xl opacity-50" />
                                        <div className="relative z-10 flex items-center justify-between">
                                            <div className="flex-1">
                                                <h4 className="text-xl font-black text-rose-900 tracking-tight">{labelStr}</h4>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {c.grades.map(gId => (
                                                        <span key={gId} className="text-[9px] bg-slate-50 text-slate-500 border border-slate-100 px-2 py-1 rounded-lg font-black uppercase">
                                                            G{gId.replace('g','')}: {parseInt(gradeTotals[gId]) || 0}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="text-right ml-4">
                                                <p className="text-[9px] font-black text-rose-400 uppercase mb-1">Total Joined</p>
                                                <div className="bg-rose-600 text-white px-5 py-2 rounded-2xl font-black text-xl shadow-lg border border-rose-700">
                                                    {totalJoined}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                {/* Grade Breakdown */}
                <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-6">
                        <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Monograde Stats</h3>
                    </div>
                    <div className="grid gap-3">
                        {availableGrades.map((g) => {
                            const count = g.id === 'kinder' ? (parseInt(kinderEnrollment) || 0) : (parseInt(gradeTotals[g.id]) || 0);
                            const isInactive = gradeAvailability[g.id] === false;
                            const isMG = lockedGrades.has(g.id);
                            
                            if (isMG) return null; // Skip if handled in MG section above
                            if (count === 0 && isInactive) return null; // Skip if inactive AND zero

                            return (
                                <div key={g.id} className="flex items-center justify-between p-4 bg-slate-50rounded-2xl border border-slate-100 group hover:border-indigo-200 transition-colors">
                                    <div className="flex flex-col">
                                        <span className="font-black text-slate-700 text-lg tracking-tight group-hover:text-indigo-600 transition-colors leading-none">{g.label}</span>
                                        <span className="text-[9px] text-indigo-400 font-black uppercase mt-1 tracking-widest">{isInactive ? "Not Offered" : "Standard Class"}</span>
                                    </div>
                                    <div className="bg-white px-5 py-2 rounded-xl border border-slate-200 shadow-sm">
                                        <span className="font-black text-indigo-700 text-xl">{count}</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </section>

                {/* Unlock Action */}
                {!propReadOnly && isReadOnly && (
                    <div className="fixed bottom-0 left-0 w-full p-6 pb-20 bg-white/80 backdrop-blur-xl border-t border-slate-100 flex justify-center z-[60]">
                        <div className="w-full max-w-sm flex gap-3">
                            <button
                                onClick={() => setIsReadOnly(false)}
                                className="flex-1 py-5 rounded-[2rem] bg-indigo-600 text-white font-black text-xl shadow-xl shadow-indigo-100/50 hover:bg-indigo-700 active:scale-95 transition-all flex items-center justify-center gap-3"
                            >
                                <FiUnlock className="w-6 h-6" />
                                <span>Unlock to Audit</span>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8"><div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div></div>;

    // --- Centralized Validation Logic ---
    const canContinue = (() => {
        if (currentStep === 1) {
            const isAvailable = gradeAvailability.kinder !== false;
            return !isAvailable || (kinderEnrollment && parseInt(kinderEnrollment) > 0);
        }
        if (currentStep === 2) return !!orgType;
        if (currentStep === 3) {
            return mgCombinations.length > 0 && mgCombinations.every(c => 
                c.grades.length > 0 && 
                c.grades.reduce((sum, g) => sum + (parseInt(gradeTotals[g]) || 0), 0) > 0
            );
        }
        if (currentStep === 4) {
            const g = activeMonogrades[currentGradeIndex];
            if (!g) return true;
            const isAvailable = gradeAvailability[g.id] !== false;
            return !isAvailable || (gradeTotals[g.id] && parseInt(gradeTotals[g.id]) > 0);
        }
        if (currentStep === 5) {
            return hasSnedSelfContained === false || (hasSnedSelfContained === true && sned_self_contained_count);
        }
        if (currentStep === 6) {
            return (hasAralMath !== null && hasAralReading !== null && hasAralScience !== null) &&
                !(hasAralMath === true && (Object.values(aralMath).reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 0 || ELEM_GRADES.some(lvl => (parseInt(aralMath[lvl]) || 0) > (gradeCapacities[lvl] || 0)))) &&
                !(hasAralReading === true && (Object.values(aralReading).reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 0 || ELEM_GRADES.some(lvl => (parseInt(aralReading[lvl]) || 0) > (gradeCapacities[lvl] || 0)))) &&
                !(hasAralScience === true && (Object.values(aralScience).reduce((sum, val) => sum + (parseInt(val) || 0), 0) === 0 || ELEM_GRADES.some(lvl => (parseInt(aralScience[lvl]) || 0) > (gradeCapacities[lvl] || 0))));
        }
        if (currentStep === 7) return isMathPerfect;
        return true;
    })();

    return (
        <div className={`min-h-screen ${effectiveReadOnly ? 'bg-slate-50' : 'bg-[#fcfdff]'} relative pb-32`}>
            
            {/* Header */}
            {!effectiveReadOnly && (
                <div className="pt-8 pb-4 px-6 sticky top-0 bg-white/80 backdrop-blur-xl z-20 border-b border-gray-100/50">
                    <div className="max-w-xl mx-auto flex items-center justify-between">
                        <button onClick={handleBack} className="p-3 bg-gray-50 border-2 border-gray-100 rounded-2xl text-gray-400 hover:text-indigo-600 hover:border-indigo-100 transition-all active:scale-95 group">
                            <FiChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                        </button>
                        <div className="flex flex-col items-center">
                            <div className="flex gap-1.5 mb-2">
                                {[1, 2, 3, 4, 5, 6, 7].map(s => (
                                    <div key={s} className={`h-1.5 rounded-full transition-all duration-500 ${currentStep === s ? 'w-8 bg-indigo-600 shadow-sm shadow-indigo-100' : 'w-2 bg-slate-200'}`} />
                                ))}
                            </div>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Module Status</span>
                        </div>
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center border-2 border-indigo-100 shadow-inner">
                            <span className="text-xl font-black text-indigo-600">{currentStep}</span>
                        </div>
                    </div>
                </div>
            )}

            {showWelcomeBack && (
                <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-xs animate-in slide-in-from-top duration-500">
                    <div className="bg-slate-900/90 backdrop-blur-xl text-white px-6 py-4 rounded-3xl shadow-2xl border border-white/20 flex items-center gap-4">
                        <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-500/30">✨</div>
                        <div>
                            <p className="text-xs font-black uppercase tracking-widest text-indigo-300 mb-0.5">Welcome Back</p>
                            <p className="text-sm font-bold text-slate-100 leading-tight">Your draft has been restored!</p>
                        </div>
                    </div>
                </div>
            )}

            <main className="max-w-xl mx-auto px-4">
                {effectiveReadOnly ? (
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

                            <div className="bg-white rounded-[2.5rem] p-8 shadow-2xl border-4 border-indigo-100/50 mb-8">
                                <div className="space-y-6">
                                    {/* Math */}
                                    <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 mb-6">
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
                                    <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 mb-6">
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
                                    <div className="bg-slate-50 rounded-3xl p-6 border-2 border-slate-100 mb-4">
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
                                </div>
                            </div>
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
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </>
        )}
    </main>

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message="Smart Enrollment Sync Saved! Your learner counts are locked in." redirectUrl="/modular-dashboard" />

            {/* Sticky Navigation Footer */}
            {!effectiveReadOnly && (
                <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
                    <div className="max-w-md mx-auto flex gap-3">
                        {currentStep === 1 ? (
                            <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all">
                                <FiSave className="w-6 h-6" />
                            </button>
                        ) : (
                            <>
                                <button onClick={handleBack} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 transition-all">
                                    <FiArrowLeft className="w-6 h-6" />
                                </button>
                                <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center text-blue-500 hover:text-blue-700 active:scale-95 transition-all">
                                    <FiSave className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        <button 
                            onClick={currentStep === 7 ? handleSave : handleNext}
                            disabled={!canContinue || (currentStep === 7 && isSaving)}
                            className={`flex-1 h-16 rounded-[2rem] ${currentStep === 7 ? 'bg-emerald-600 shadow-emerald-200' : 'bg-blue-600 shadow-blue-200'} text-white font-black text-[15px] shadow-xl active:scale-98 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:bg-slate-700 disabled:shadow-none uppercase tracking-widest`}
                        >
                            {currentStep === 7 ? (
                                isSaving ? (
                                    <>
                                        <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                        Saving Profile...
                                    </>
                                ) : (
                                    <><FiSave className="w-5 h-5" /> Save School Profile</>
                                )
                            ) : (
                                <>Continue <FiArrowRight className="w-5 h-5" /></>
                            )}
                        </button>
                    </div>
                </div>
            )}

            <AnimatePresence>
                {showDraftModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end justify-center">
                        <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full rounded-t-[3rem] p-10 pb-12 shadow-2xl relative">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                            <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto flex items-center justify-center text-3xl shadow-2xl shadow-blue-200 mb-6 font-bold text-white">
                                <FiSave />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 text-center leading-tight">Save Progress?</h2>
                            <p className="text-gray-500 text-center font-medium mt-3 px-4">Would you like to save your progress and go back to the modules overview?</p>
                            
                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <button onClick={() => setShowDraftModal(false)}
                                    className="py-5 rounded-[2rem] bg-gray-100 text-gray-900 font-black text-lg active:scale-95 transition-all">
                                    Continue
                                </button>
                                <button onClick={handleSaveDraftAndExit}
                                    className="py-5 rounded-[2rem] bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all">
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

export default Unit2Learners;
