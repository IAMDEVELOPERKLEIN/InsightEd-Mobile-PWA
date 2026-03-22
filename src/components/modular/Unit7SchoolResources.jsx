import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiChevronRight, FiCheck, FiArrowLeft, FiTrash2, FiPlus, FiUnlock, FiMonitor, FiDroplet, FiSave } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";

// ── Shared styles ─────────────────────────────────────────────────────────────
const chunkyInput = "w-full p-4 mt-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-black text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 transition-colors shadow-sm text-center";
const chunkySelect = "w-full p-4 mt-2 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-black text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 transition-colors shadow-sm appearance-none flex-1 text-center";
const toggleBtnBase = "flex-1 py-4 px-6 rounded-2xl font-black text-base border-2 transition-all flex items-center justify-center gap-2 shadow-sm";
const toggleBtnActive = "bg-indigo-100 border-indigo-500 text-indigo-700 shadow-indigo-100";
const toggleBtnInactive = "bg-white border-gray-200 text-gray-400 hover:bg-gray-50";

// ── Framer Motion variants ────────────────────────────────────────────────────
const slideVariants = {
    enter: { opacity: 0, x: 60, scale: 0.97 },
    center: { opacity: 1, x: 0, scale: 1 },
    exit: { opacity: 0, x: -60, scale: 0.97 },
};

const expandVariants = {
    hidden: { opacity: 0, height: 0, marginTop: 0 },
    visible: { opacity: 1, height: "auto", marginTop: 8 },
};

const GRADE_LOOP = [
    { label: "Kinder", key: "kinder", emoji: "🌱" },
    { label: "Grade 1", key: "g1", emoji: "1️⃣" },
    { label: "Grade 2", key: "g2", emoji: "2️⃣" },
    { label: "Grade 3", key: "g3", emoji: "3️⃣" },
    { label: "Grade 4", key: "g4", emoji: "4️⃣" },
    { label: "Grade 5", key: "g5", emoji: "5️⃣" },
    { label: "Grade 6", key: "g6", emoji: "6️⃣" },
];

const ICT_CATEGORIES = [
    { key: "laptops", label: "Laptops", emoji: "💻" },
    { key: "tablets", label: "Tablets", emoji: "📱" },
    { key: "desktops", label: "Desktops", emoji: "🖥️" },
    { key: "smart_tvs", label: "Smart TVs", emoji: "📺" },
    { key: "projectors", label: "Projectors", emoji: "📽️" },
    { key: "printers", label: "Printers", emoji: "🖨️" },
];

const ECART_FUNDING_SOURCES = [
    "DepEd (DCP)", "LGU / SEF", "Private Donor / NGO", "Other"
];

const WASH_CATEGORIES = [
    { key: "male_seats", label: "Male Toilet Seats", emoji: "🚹" },
    { key: "male_urinals", label: "Male Urinals", emoji: "🚻" },
    { key: "female_seats", label: "Female Toilet Seats", emoji: "🚺" },
    { key: "common_seats", label: "Common / Kinder Seats", emoji: "🚻" },
    { key: "pwd_seats", label: "PWD Toilet Seats", emoji: "♿" },
    { key: "faucets", label: "Handwashing Faucets", emoji: "🚰" },
];

const WATER_SOURCES = [
    "Piped line from local service provider",
    "Natural resources (Deep well, Spring, Rainwater)",
    "No water source"
];

const Unit7SchoolResources = () => {
    const navigate = useNavigate();

    const [loading, setLoading] = useState(true);
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);

    // Core Workflow State
    const [currentPhase, setCurrentPhase] = useState(1); 

    // PHASE 1 State
    const [gradesData, setGradesData] = useState([]);
    const [selectedGradeId, setSelectedGradeId] = useState(null);
    const [generalRoomsData, setGeneralRoomsData] = useState({
        has_general_rooms: null,
        general_rooms_count: "",
        armchairs_func: "", armchairs_broken: "",
        tables_func: "", tables_broken: "",
        desks_func: "", desks_broken: "",
        has_teacher_desk: null,
    });
    
    // Phase 1 Modal State
    const [showGradeModal, setShowGradeModal] = useState(false);
    
    const initialGradeForm = {
        armchairs_func: "", armchairs_broken: "",
        tables_func: "", tables_broken: "",
        desks_func: "", desks_broken: "",
    };
    const [currentGradeForm, setCurrentGradeForm] = useState(initialGradeForm);

    // PHASE 2 State
    const [ictData, setIctData] = useState({
        laptops_total: "", laptops_func: "",
        tablets_total: "", tablets_func: "",
        desktops_total: "", desktops_func: "",
        smart_tvs_total: "", smart_tvs_func: "",
        projectors_total: "", projectors_func: "",
        printers_total: "", printers_func: "",
    });

    // PHASE 3 State (eCart)
    const [hasEcart, setHasEcart] = useState(null);
    const [eCarts, setECarts] = useState([]);
    const [showEcartModal, setShowEcartModal] = useState(false);
    
    const initialEcartForm = {
        batches_name: "", year_received: "", sources_fund: "",
        ecart_laptops: "", ecart_tablets: "", ecart_tv: "",
        charging_condition: "", remarks: "",
    };
    const [ecartForm, setEcartForm] = useState(initialEcartForm);

    // PHASE 4 State (WASH)
    const [washData, setWashData] = useState({
        male_seats_total: "", male_seats_func: "",
        male_urinals_total: "", male_urinals_func: "",
        female_seats_total: "", female_seats_func: "",
        common_seats_total: "", common_seats_func: "",
        pwd_seats_total: "", pwd_seats_func: "",
        faucets_total: "", faucets_func: "",
        water_source: "",
        attached_cr_classrooms: "",
        attached_cr_seats: "",
        attached_cr_included_in_main: false,
    });

    // PHASE 5 State (Utilities & Hardship)
    const [utilitiesData, setUtilitiesData] = useState({
        utility_electricity: "",
        has_solar_or_gen: false,
        utility_internet_yesno: null,
        utility_internet_funder: "",
        sha_category: "",
    });
    const [hasMultigradeContext, setHasMultigradeContext] = useState(false);

    // ── Data Fetching ───────────────────────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem("schoolId");
            if (!storedId) {
                setLoading(false);
                return;
            }

            try {
                const draft = await getUnitDraft(7, storedId);
                const res = await fetch(`/api/ph_schools/${storedId}?t=${Date.now()}`);
                
                if (res.ok) {
                    const saved = await res.json();
                    let d = (saved.exists && saved.data) ? saved.data : {};

                    // MASTER PRECEDENCE: Draft > Database
                    if (draft) {
                        setCurrentPhase(draft.currentPhase || 1);
                        setGradesData(draft.gradesData || []);
                        setGeneralRoomsData(draft.generalRoomsData || {});
                        setIctData(draft.ictData || {});
                        setHasEcart(draft.hasEcart);
                        setECarts(draft.eCarts || []);
                        setWashData(draft.washData || {});
                        setUtilitiesData(draft.utilitiesData || {});
                        setIsReviewMode(false); // Force edit mode for drafts
                        setShowWelcomeBack(true);
                        setTimeout(() => setShowWelcomeBack(false), 3000);
                    } else if (saved.exists && saved.data) {
                        const d = saved.data;
                        
                        // Check SPED/ALS
                        let speedAlsCountTotal = 0;
                        if (d.als_community_centers_count > 0 || d.sped_learners_count > 0) {
                             speedAlsCountTotal = parseInt(d.sped_learners_count || 0);
                        }

                        // Pre-calculate expected grades based on Unit 1 Curricular Offering
                        const expectedGrades = [];
                        
                        const co = (d.curricular_offering || "").toLowerCase();
                        let hasKinder = co.includes("elementary") || co.includes("k to 10") || co.includes("k to 12") || co.includes("kinder");
                        let hasElem = co.includes("elementary") || co.includes("k to 10") || co.includes("k to 12") || co.includes("k-10") || co.includes("k-12");
                        let hasJHS = co.includes("junior high") || co.includes("jhs") || co.includes("k to 10") || co.includes("k to 12") || co.includes("k-10") || co.includes("k-12");
                        let hasSHS = co.includes("senior high") || co.includes("shs") || co.includes("k to 12") || co.includes("k-12");

                        // Parse Unit 3 to get section counts
                        let parsedSections = [];
                        if (d.unit3_simplified_counts) {
                            try {
                                parsedSections = typeof d.unit3_simplified_counts === 'string' ? JSON.parse(d.unit3_simplified_counts) : d.unit3_simplified_counts;
                            } catch (e) {}
                        }
                        const getCountForGrade = (gradeId) => {
                            const found = parsedSections.find(sec => sec.grade_level === gradeId);
                            return found ? parseInt(found.total_sections || 0) : 0;
                        };

                        // MASTER SYNC: Parse Unit 2 to define which grades are explicitly active
                        let u2Raw = [];
                        if (d.unit2_simplified_enrollment) {
                            try {
                                u2Raw = typeof d.unit2_simplified_enrollment === 'string'
                                    ? JSON.parse(d.unit2_simplified_enrollment)
                                    : d.unit2_simplified_enrollment;
                            } catch (e) {}
                        }
                        const u2Parsed = Array.isArray(u2Raw) ? u2Raw : (u2Raw.array || []);
                        const isGradeActive = (gradeId) => {
                            if (!u2Parsed.length) return true; // fallback
                            const found = u2Parsed.find(x => x.grade_level === gradeId);
                            return found ? found.is_active !== false : true;
                        };

                        // Fallback: If curricular offering is empty (e.g. legacy test data), infer from actual enrollment data
                        if (!co) {
                            if (getCountForGrade("kinder") > 0 || parseInt(d.kinder_sections || 0) > 0) hasKinder = true;
                            if (['1','2','3','4','5','6'].some(lvl => getCountForGrade(`g${lvl}`) > 0 || parseInt(d[`sections_g${lvl}`] || 0) > 0)) hasElem = true;
                            if (['7','8','9','10'].some(lvl => getCountForGrade(`g${lvl}`) > 0 || parseInt(d[`sections_g${lvl}`] || 0) > 0)) hasJHS = true;
                            if (['11','12'].some(lvl => getCountForGrade(`g${lvl}`) > 0 || parseInt(d[`sections_g${lvl}`] || 0) > 0)) hasSHS = true;
                        }

                        if (hasKinder && isGradeActive("kinder")) {
                            expectedGrades.push({
                                id: "kinder", grade_level: "Kinder",
                                enrolled: parseInt(d.enroll_kinder || 0),
                                sections: getCountForGrade("kinder") || parseInt(d.sections_kinder || 0), isVerified: false,
                            });
                        }

                        if (hasElem) {
                            ['1','2','3','4','5','6'].forEach(lvl => {
                                if (isGradeActive(`g${lvl}`)) {
                                    expectedGrades.push({
                                        id: `g${lvl}`, grade_level: `Grade ${lvl}`,
                                        enrolled: parseInt(d[`enroll_g${lvl}`] || 0),
                                        sections: getCountForGrade(`g${lvl}`) || parseInt(d[`sections_g${lvl}`] || 0), isVerified: false,
                                    });
                                }
                            });
                        }

                        if (hasJHS) {
                            ['7','8','9','10'].forEach(lvl => {
                                if (isGradeActive(`g${lvl}`)) {
                                    expectedGrades.push({
                                        id: `g${lvl}`, grade_level: `Grade ${lvl}`,
                                        enrolled: parseInt(d[`enroll_g${lvl}`] || 0),
                                        sections: getCountForGrade(`g${lvl}`) || parseInt(d[`sections_g${lvl}`] || 0), isVerified: false,
                                    });
                                }
                            });
                        }

                        if (hasSHS) {
                            ['11','12'].forEach(lvl => {
                                if (isGradeActive(`g${lvl}`)) {
                                    expectedGrades.push({
                                        id: `g${lvl}`, grade_level: `Grade ${lvl}`,
                                        enrolled: parseInt(d[`enroll_g${lvl}`] || 0),
                                        sections: getCountForGrade(`g${lvl}`) || parseInt(d[`sections_g${lvl}`] || 0), isVerified: false,
                                    });
                                }
                            });
                        }

                        if (speedAlsCountTotal > 0 || d.als_community_centers_count > 0) {
                            expectedGrades.push({
                                id: "sped_als", grade_level: "SPED/ALS",
                                enrolled: speedAlsCountTotal,
                                sections: Math.max(1, parseInt(d.als_community_centers_count || 0)), isVerified: false,
                            });
                        }

                        // Load Phase 1
                        if (d.unit7_furniture) {
                            try {
                                const parsed = typeof d.unit7_furniture === 'string' ? JSON.parse(d.unit7_furniture) : d.unit7_furniture;
                                
                                // Merge saved furniture data into expected grades
                                if (parsed.grades) {
                                    parsed.grades.forEach(savedGrade => {
                                        const expectedIdx = expectedGrades.findIndex(eg => eg.id === savedGrade.id);
                                        if (expectedIdx >= 0) {
                                            expectedGrades[expectedIdx] = { ...expectedGrades[expectedIdx], ...savedGrade, isVerified: true };
                                        } else {
                                            // Handle edge case where section existed before but was removed
                                            expectedGrades.push({ ...savedGrade, isVerified: true });
                                        }
                                    });
                                }
                                setGradesData(expectedGrades);
                                if (parsed.general) setGeneralRoomsData(parsed.general);
                            } catch (e) {
                                console.warn(e);
                                setGradesData(expectedGrades);
                            }
                        } else {
                            setGradesData(expectedGrades);
                        }

                        // Load Phase 2
                        if (d.unit7_ict) {
                            try {
                                const parsed = typeof d.unit7_ict === 'string' ? JSON.parse(d.unit7_ict) : d.unit7_ict;
                                setIctData(prev => ({ ...prev, ...parsed }));
                            } catch (e) { console.warn(e); }
                        }

                        // Load Phase 3
                        if (d.unit7_has_ecart !== undefined) setHasEcart(d.unit7_has_ecart);
                        if (d.unit7_ecarts) {
                            try {
                                const parsed = typeof d.unit7_ecarts === 'string' ? JSON.parse(d.unit7_ecarts) : d.unit7_ecarts;
                                setECarts(Array.isArray(parsed) ? parsed : []);
                            } catch (e) { console.warn(e); }
                        }

                        // Load Phase 4
                        if (d.unit7_wash) {
                            try {
                                const parsed = typeof d.unit7_wash === 'string' ? JSON.parse(d.unit7_wash) : d.unit7_wash;
                                setWashData(prev => ({ ...prev, ...parsed }));
                            } catch (e) { console.warn(e); }
                        }

                        // Load Phase 5
                        if (d.unit7_utilities) {
                            try {
                                const parsed = typeof d.unit7_utilities === 'string' ? JSON.parse(d.unit7_utilities) : d.unit7_utilities;
                                setUtilitiesData(prev => ({ ...prev, ...parsed }));
                            } catch (e) { console.warn(e); }
                        }

                        if (d.has_multigrade) {
                            setHasMultigradeContext(true);
                        }

                        if (d.unit7_completed) {
                            setIsReviewMode(true);
                        }

                        setLoading(false);
                    }
                }
            } catch (e) {
                console.warn("Could not fetch data for Unit 9", e);
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleGradeFormChange = (e) => {
        const { name, value } = e.target;
        setCurrentGradeForm(prev => ({ ...prev, [name]: value }));
    };

    const handleGeneralChange = (e) => {
        const { name, value } = e.target;
        setGeneralRoomsData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveGradeLevel = () => {

        setGradesData(prev => prev.map(grade => {
            if (grade.id === selectedGradeId) {
                return {
                    ...grade,
                    ...currentGradeForm,
                    isVerified: true
                };
            }
            return grade;
        }));

        setShowGradeModal(false);
        setSelectedGradeId(null);
        setCurrentGradeForm(initialGradeForm);
    };

    const openGradeModal = (grade) => {
        setSelectedGradeId(grade.id);
        setCurrentGradeForm({
            armchairs_func: grade.armchairs_func || "",
            armchairs_broken: grade.armchairs_broken || "",
            tables_func: grade.tables_func || "",
            tables_broken: grade.tables_broken || "",
            desks_func: grade.desks_func || "",
            desks_broken: grade.desks_broken || "",
        });
        setShowGradeModal(true);
    };

    const gradeStats = useMemo(() => {
        const af = parseInt(currentGradeForm.armchairs_func) || 0;
        const tf = parseInt(currentGradeForm.tables_func) || 0;
        const df = parseInt(currentGradeForm.desks_func) || 0;
        const totalCapacity = af + (tf * 2) + (df * 2);
        
        const activeGrade = gradesData.find(g => g.id === selectedGradeId);
        const enrolled = activeGrade ? parseInt(activeGrade.enrolled) : 0;
        
        return { capacity: totalCapacity, diff: totalCapacity - enrolled, isOk: totalCapacity >= enrolled };
    }, [currentGradeForm, gradesData, selectedGradeId]);

    // Validation to proceed
    const isPhase1Valid = useMemo(() => {
        if (gradesData.length === 0) return true; // If no sections mapped at all, auto pass
        if (!gradesData.every(g => g.isVerified)) return false;
        
        if (generalRoomsData.has_general_rooms === true) {
            if (!generalRoomsData.general_rooms_count || generalRoomsData.has_teacher_desk === null) return false;
        }
        return true;
    }, [gradesData, generalRoomsData]);

    const handleMainProceed = () => { setCurrentPhase(2); window.scrollTo({ top: 0, behavior: "smooth" }); };

    // ── Phase 2 Handlers ────────────────────────────────────────────────────────
    const handleIctChange = (e) => {
        const { name, value } = e.target;
        setIctData(prev => ({ ...prev, [name]: value }));
    };

    const ictStats = useMemo(() => {
        let isValid = true; const errors = {}; const broken = {};
        ICT_CATEGORIES.forEach(cat => {
            const total = parseInt(ictData[`${cat.key}_total`]) || 0;
            const func = parseInt(ictData[`${cat.key}_func`]) || 0;
            const tStr = ictData[`${cat.key}_total`];
            const fStr = ictData[`${cat.key}_func`];

            if (fStr !== "" && func > total) { isValid = false; errors[cat.key] = true; } 
            else { errors[cat.key] = false; }

            const unserviceable = total - func;
            if (unserviceable > 0 && tStr !== "" && fStr !== "") { broken[cat.key] = unserviceable; } 
            else { broken[cat.key] = 0; }

            if ((tStr !== "" && fStr === "") || (tStr === "" && fStr !== "")) isValid = false;
        });
        return { isValid, errors, broken };
    }, [ictData]);

    const handlePhase2Proceed = () => { setCurrentPhase(3); window.scrollTo({ top: 0, behavior: "smooth" }); };

    // ── Phase 3 Handlers (eCart) ────────────────────────────────────────────────
    const handleEcartFormChange = (e) => {
        const { name, value } = e.target;
        setEcartForm(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveEcart = () => {
        if (!ecartForm.batches_name || !ecartForm.year_received || !ecartForm.sources_fund || !ecartForm.charging_condition) {
            alert("Please complete required package details and the charging condition toggle.");
            return;
        }
        setECarts(prev => [...prev, { ...ecartForm, id: Date.now().toString() }]);
        setShowEcartModal(false);
        setEcartForm(initialEcartForm);
    };

    const isPhase3Valid = useMemo(() => (hasEcart === false) || (hasEcart === true && eCarts.length > 0), [hasEcart, eCarts]);
    const handlePhase3Proceed = () => { setCurrentPhase(4); window.scrollTo({ top: 0, behavior: "smooth" }); };

    // ── Phase 4 Handlers (WASH) ─────────────────────────────────────────────────
    const handleWashChange = (e) => {
        const { name, value, type, checked } = e.target;
        setWashData(prev => ({ 
            ...prev, 
            [name]: type === 'checkbox' ? checked : value 
        }));
    };

    const washStats = useMemo(() => {
        let isValid = true; const errors = {};
        
        WASH_CATEGORIES.forEach(cat => {
            const total = parseInt(washData[`${cat.key}_total`]) || 0;
            const func = parseInt(washData[`${cat.key}_func`]) || 0;
            const tStr = washData[`${cat.key}_total`];
            const fStr = washData[`${cat.key}_func`];

            if (fStr !== "" && func > total) { isValid = false; errors[cat.key] = true; } 
            else { errors[cat.key] = false; }

            if ((tStr !== "" && fStr === "") || (tStr === "" && fStr !== "")) isValid = false;
        });

        // Water source is required
        if (!washData.water_source) isValid = false;

        return { isValid, errors };
    }, [washData]);

    const handlePhase4Proceed = () => { setCurrentPhase(5); window.scrollTo({ top: 0, behavior: "smooth" }); };

    // ── Phase 5 Handlers (Utilities & Hardship) ─────────────────────────────────
    const handleUtilitiesChange = (e) => {
        const { name, value, type, checked } = e.target;
        setUtilitiesData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const isPhase5Valid = useMemo(() => {
        if (!utilitiesData.utility_electricity) return false;
        if (utilitiesData.utility_internet_yesno === null) return false;
        if (utilitiesData.utility_internet_yesno === true && !utilitiesData.utility_internet_funder) return false;
        if (!utilitiesData.sha_category) return false;
        return true;
    }, [utilitiesData]);

    const handleSaveDraftAndExit = async () => {
        const storedId = localStorage.getItem("schoolId");
        if (!storedId) return;

        const draftData = {
            currentPhase,
            gradesData,
            generalRoomsData,
            ictData,
            hasEcart,
            eCarts,
            washData,
            utilitiesData
        };
        await saveUnitDraft(7, storedId, draftData);
        navigate("/modular-dashboard");
    };

    const handleFinalSubmit = async () => {
        // STRICT VALIDATION: Check if any grade levels have been audited
        const auditedCount = gradesData.filter(g => g.isVerified).length;
        if (auditedCount === 0 && gradesData.length > 0) {
            alert("Warning: You must audit at least one Grade Level in Phase 1 before marking this unit as accomplished.");
            setCurrentPhase(1);
            return;
        }

        setLoading(true);
        const storedId = localStorage.getItem("schoolId");
        
        try {
            // Compile payload — includes unit7_completed flag so backend marks it done
            const payload = {
                unit7_furniture: JSON.stringify({ grades: gradesData.filter(g => g.isVerified), general: generalRoomsData }),
                unit7_ict: JSON.stringify(ictData),
                unit7_has_ecart: hasEcart,
                unit7_ecarts: JSON.stringify(eCarts), // kept for backwards compatibility
                unit7_wash: JSON.stringify(washData),
                unit7_utilities: JSON.stringify(utilitiesData),
                unit7_completed: true
            };

            const res = await fetch(`/api/ph_schools/${storedId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                await clearUnitDraft(7, storedId);
                try {
                    await fetch(`/api/ph_schools/unit9/${storedId}/ecarts`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ ecarts: eCarts })
                    });
                } catch (e) { console.warn("Relational eCart sync failed", e); }

                // Update local quest progress to unlock Unit 10
                try {
                    const stored = localStorage.getItem('quest_progress');
                    let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
                    if (!progress.completedUnits.includes(7)) {
                        progress.completedUnits.push(7);
                        progress.xp += 500;
                        localStorage.setItem('quest_progress', JSON.stringify(progress));
                    }
                } catch (e) { console.warn("Local progress update failed", e); }

                // Sync progress to dashboard
                try {
                    await fetch('/api/user/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ unitId: 7, schoolId: storedId })
                    });
                } catch (e) { console.warn("Progress sync failed", e); }

                alert("School Resources module completed and saved successfully!");
                navigate("/modular/unit-8");
            } else {
                alert("Failed to save. Please check your connection.");
                setLoading(false);
            }
        } catch (e) {
            console.error(e);
            alert("Error saving resources.");
            setLoading(false);
        }
    };

    // ── Header Progress Logic ───────────────────────────────────────────────────
    const progressWidth = useMemo(() => {
        if (currentPhase === 1) return `20%`;
        if (currentPhase === 2) return `40%`;
        if (currentPhase === 3) return `60%`;
        if (currentPhase === 4) return `80%`;
        return `100%`;
    }, [currentPhase]);


    // ── Render ──────────────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <p className="text-gray-400 font-bold">Loading classrooms...</p>
            </div>
        );
    }

    if (isReviewMode) {
        const totalUnitsICT = ICT_CATEGORIES.reduce((acc, cat) => acc + (parseInt(ictData[`${cat.key}_total`]) || 0), 0);
        const totalWASH = WASH_CATEGORIES.reduce((acc, cat) => acc + (parseInt(washData[`${cat.key}_total`]) || 0), 0);
        
        return (
            <div className="min-h-screen bg-slate-50/50 font-sans">
                {/* Exit Header */}
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                    <div className="max-w-md mx-auto flex items-center gap-3">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <FiArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 text-center">
                            <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Unit 7</div>
                            <h1 className="text-sm font-black text-gray-800">School Resources</h1>
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
                        <span className="text-4xl text-white">🎒</span>
                    </motion.div>
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-indigo-200">
                        Unit 7 • School Resources
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 leading-tight">Summary</h1>
                    <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                            <FiMonitor className="text-indigo-600 w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total ICT Devices</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{totalUnitsICT}</span>
                    </div>
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                            <FiDroplet className="text-emerald-500 w-6 h-6" />
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">WASH Fixtures</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{totalWASH}</span>
                    </div>
                </div>

                {/* Subsections */}
                <div className="space-y-6">
                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Key Utilities</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-amber-500 tracking-widest block mb-1">Energy</span>
                                <span className="text-base font-black text-slate-800 text-center leading-tight">
                                    {utilitiesData.utility_electricity || "N/A"}
                                </span>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm flex flex-col items-center">
                                <span className="text-[10px] font-black uppercase text-indigo-500 tracking-widest block mb-1">Internet</span>
                                <span className="text-base font-black text-slate-800 text-center leading-tight">
                                    {utilitiesData.utility_internet_yesno ? "Active" : "None"}
                                </span>
                            </div>
                        </div>
                    </section>
                    
                    {hasEcart && eCarts.length > 0 && (
                        <section>
                            <div className="flex items-center gap-2 mb-4 ml-2">
                                <div className="w-1 h-4 bg-rose-500 rounded-full" />
                                <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Mobile Labs</h3>
                            </div>
                            <div className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm">
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-slate-700">eCart Packages</span>
                                    <span className="bg-rose-100 text-rose-700 font-black px-3 py-1 rounded-xl">{eCarts.length} Active</span>
                                </div>
                            </div>
                        </section>
                    )}
                    
                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-emerald-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">School Classification</h3>
                        </div>
                        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 text-center">
                            <span className="font-black text-emerald-800 text-sm">{utilitiesData.sha_category || "Standardized"}</span>
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
                        onClick={() => { setIsReviewMode(false); setCurrentPhase(1); }}
                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiUnlock className="w-5 h-5 text-indigo-700" />
                        </div>
                        <span>Unlock to Edit Resources</span>
                    </button>
                    <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                        Note: Unlocking will require re-saving data.
                    </p>
                </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">
            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3 pb-4">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => {
                        if (currentPhase > 1) {
                            setCurrentPhase(p => p - 1);
                        } else {
                            navigate("/modular-dashboard");
                        }
                    }} className="p-2 -ml-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        <FiArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="mx-4 h-4 bg-gray-200 rounded-full overflow-hidden flex-1">
                        <motion.div
                            className="h-full bg-indigo-500 rounded-full"
                            animate={{ width: progressWidth }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                        />
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

            <main className="flex-1 overflow-x-hidden pb-32">
                <div className="max-w-md w-full mx-auto relative px-6 mt-8">
                    <AnimatePresence mode="wait">
                        
                        {/* ══════════════════════════════════════════════════════
                            PHASE 1: GRADE LEVEL DASHBOARD & GENERAL ROOMS
                            ══════════════════════════════════════════════════════ */}
                        {currentPhase === 1 && (
                            <motion.div key="p1-dashboard" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">🪑</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Phase 1</p>
                                        <h2 className="text-2xl font-black text-gray-800 leading-tight">Grade Level Inventory</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 mb-8">Catalog your physical facilities grouped by Grade Level, plus any general shared rooms.</p>

                                <div className="flex items-center justify-between mb-4 mt-2">
                                    <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">Mapped Grade Levels</h3>
                                    <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">{gradesData.filter(g => g.isVerified).length} / {gradesData.length} Audited</span>
                                </div>

                                {gradesData.length === 0 ? (
                                    <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-6 text-center mb-4">
                                        <p className="text-indigo-400 font-bold mb-1">No learners tracked yet.</p>
                                        <p className="text-xs text-indigo-300">Once you add sections in Units 2/3, they will appear here automatically.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3 mb-4">
                                        {gradesData.map((item) => (
                                            <motion.div 
                                                key={item.id} 
                                                onClick={() => openGradeModal(item)}
                                                initial={{ opacity: 0, y: 10 }} 
                                                animate={{ opacity: 1, y: 0 }} 
                                                className={`bg-white border-2 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer transition-all active:scale-95 ${item.isVerified ? 'border-emerald-200' : 'border-amber-200 hover:border-amber-300'}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${item.isVerified ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-500'}`}>
                                                        {item.isVerified ? <FiCheckCircle className="w-6 h-6" /> : "⚠️"}
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-gray-800 text-base leading-tight">{item.grade_level}</p>
                                                        <p className="text-xs font-medium text-gray-400 mt-0.5">{item.enrolled} Enrolled · {item.sections} Sections</p>
                                                    </div>
                                                </div>
                                                <div className={`px-3 py-1 mr-2 rounded-lg text-xs font-black uppercase tracking-wider ${item.isVerified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                    {item.isVerified ? "Verified" : "Audit"}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}

                                {/* GENERAL ROOM GATEKEEPER */}
                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm mt-8 mb-6">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">General Classrooms</h3>
                                    <p className="text-sm font-bold text-gray-700 mb-4">Are there any General Classrooms in this school? (Shared rooms with no specific advisory, e.g. Labs, Library)</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setGeneralRoomsData(p => ({...p, has_general_rooms: true}))} className={`${toggleBtnBase} ${generalRoomsData.has_general_rooms === true ? toggleBtnActive : toggleBtnInactive}`}><span>👍</span> Yes</button>
                                        <button onClick={() => setGeneralRoomsData(p => ({...p, has_general_rooms: false}))} className={`${toggleBtnBase} ${generalRoomsData.has_general_rooms === false ? toggleBtnActive : toggleBtnInactive}`}><span>👎</span> No</button>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {generalRoomsData.has_general_rooms === true && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden pt-4 mt-4 border-t border-gray-100 space-y-5">
                                                <div>
                                                    <p className="text-xs font-bold text-gray-500 mb-1 ml-1">Total General Rooms</p>
                                                    <input type="number" name="general_rooms_count" value={generalRoomsData.general_rooms_count} onChange={handleGeneralChange} min="1" placeholder="0" className={`${chunkyInput} !mt-0 !text-left !px-5`} />
                                                </div>

                                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest border-b border-gray-50 pb-2">Shared Seating Capacity (Total across all {generalRoomsData.general_rooms_count || '...'} rooms)</h3>
                                                
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 mb-2">Individual Armchairs 🪑</p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><p className="text-[10px] font-black text-emerald-500 uppercase text-center mb-1">Functional</p><input type="number" name="armchairs_func" value={generalRoomsData.armchairs_func} onChange={handleGeneralChange} min="0" placeholder="0" className={`${chunkyInput} !bg-emerald-50 text-emerald-700 focus:!border-emerald-400 !mt-0`} /></div>
                                                        <div><p className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Broken</p><input type="number" name="armchairs_broken" value={generalRoomsData.armchairs_broken} onChange={handleGeneralChange} min="0" placeholder="0" className={`${chunkyInput} !bg-red-50 text-red-700 focus:!border-red-400 !mt-0`} /></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 mb-2">Table &amp; Chair Sets <span className="text-xs text-indigo-400 font-normal">(2-seaters)</span></p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><p className="text-[10px] font-black text-emerald-500 uppercase text-center mb-1">Functional</p><input type="number" name="tables_func" value={generalRoomsData.tables_func} onChange={handleGeneralChange} min="0" placeholder="0" className={`${chunkyInput} !bg-emerald-50 text-emerald-700 focus:!border-emerald-400 !mt-0`} /></div>
                                                        <div><p className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Broken</p><input type="number" name="tables_broken" value={generalRoomsData.tables_broken} onChange={handleGeneralChange} min="0" placeholder="0" className={`${chunkyInput} !bg-red-50 text-red-700 focus:!border-red-400 !mt-0`} /></div>
                                                    </div>
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-700 mb-2">Student Desks <span className="text-xs text-indigo-400 font-normal">(2-seaters)</span></p>
                                                    <div className="grid grid-cols-2 gap-3">
                                                        <div><p className="text-[10px] font-black text-emerald-500 uppercase text-center mb-1">Functional</p><input type="number" name="desks_func" value={generalRoomsData.desks_func} onChange={handleGeneralChange} min="0" placeholder="0" className={`${chunkyInput} !bg-emerald-50 text-emerald-700 focus:!border-emerald-400 !mt-0`} /></div>
                                                        <div><p className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Broken</p><input type="number" name="desks_broken" value={generalRoomsData.desks_broken} onChange={handleGeneralChange} min="0" placeholder="0" className={`${chunkyInput} !bg-red-50 text-red-700 focus:!border-red-400 !mt-0`} /></div>
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-2">
                                                    <p className="text-sm font-bold text-gray-700 mb-4">Do ALL these general rooms have functional Teacher Stations?</p>
                                                    <div className="flex gap-3">
                                                        <button onClick={() => setGeneralRoomsData(p => ({...p, has_teacher_desk: true}))} className={`${toggleBtnBase} ${generalRoomsData.has_teacher_desk === true ? toggleBtnActive : toggleBtnInactive}`}><span>👍</span> Yes, all have</button>
                                                        <button onClick={() => setGeneralRoomsData(p => ({...p, has_teacher_desk: false}))} className={`${toggleBtnBase} ${generalRoomsData.has_teacher_desk === false ? toggleBtnActive : toggleBtnInactive}`}><span>👎</span> No / Some missing</button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </motion.div>
                        )}


                        {/* ══════════════════════════════════════════════════════
                            PHASE 2: ICT EQUIPMENT
                            ══════════════════════════════════════════════════════ */}
                        {currentPhase === 2 && (
                            <motion.div key="p2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">🔌</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Phase 2</p>
                                        <h2 className="text-2xl font-black text-gray-800 leading-tight">School-Wide ICT</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 mb-8">Count your campus-wide technology assets. Include all devices, regardless of location.</p>

                                <div className="space-y-4">
                                    {ICT_CATEGORIES.map(cat => {
                                        const hasError = ictStats.errors[cat.key];
                                        const unserviceable = ictStats.broken[cat.key];
                                        return (
                                            <div key={cat.key} className={`bg-white border-2 rounded-3xl p-5 transition-all shadow-sm ${hasError ? "border-red-300" : "border-gray-100"}`}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-2xl">{cat.emoji}</span>
                                                    <h3 className="text-lg font-black text-gray-800">{cat.label}</h3>
                                                </div>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase text-center mb-1">Total Units</p>
                                                        <input type="number" name={`${cat.key}_total`} value={ictData[`${cat.key}_total`]} onChange={handleIctChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0 !bg-gray-50 text-gray-800 focus:!border-gray-400 focus:!bg-white`} />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase text-center mb-1 ${hasError ? "text-red-500" : "text-emerald-500"}`}>Functional</p>
                                                        <input type="number" name={`${cat.key}_func`} value={ictData[`${cat.key}_func`]} onChange={handleIctChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0 ${hasError ? "!bg-red-50 !border-red-400 text-red-700" : "!bg-emerald-50 text-emerald-700 focus:!border-emerald-400"}`} />
                                                    </div>
                                                </div>
                                                <AnimatePresence>
                                                    {hasError && (
                                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
                                                                <FiX className="w-4 h-4 flex-shrink-0" />
                                                                Functional cannot exceed Total Units!
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                    {!hasError && unserviceable > 0 && (
                                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                            <div className="bg-amber-50 text-amber-700 text-xs font-bold p-3 rounded-xl border border-amber-200 flex items-center gap-2">
                                                                <span>⚠️</span>
                                                                {unserviceable} unit{unserviceable !== 1 ? "s" : ""} unserviceable/need repair
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>
                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════════════════
                            PHASE 3: ECART / MOBILE LAB 
                            ══════════════════════════════════════════════════════ */}
                        {currentPhase === 3 && (
                            <motion.div key="p3-registry" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">🛒</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Phase 3</p>
                                        <h2 className="text-2xl font-black text-gray-800 leading-tight">eCart &amp; Mobile Lab</h2>
                                    </div>
                                </div>
                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm mt-8 mb-6">
                                    <p className="text-sm font-bold text-gray-700 mb-4">Does your school have any eCarts or Mobile Computer Laboratories?</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setHasEcart(true)} className={`${toggleBtnBase} ${hasEcart === true ? toggleBtnActive : toggleBtnInactive}`}><span>👍</span> Yes</button>
                                        <button onClick={() => setHasEcart(false)} className={`${toggleBtnBase} ${hasEcart === false ? toggleBtnActive : toggleBtnInactive}`}><span>👎</span> No</button>
                                    </div>
                                </div>
                                <AnimatePresence>
                                    {hasEcart === true && (
                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                            <div className="flex items-center justify-between mb-4 mt-2">
                                                <h3 className="text-xs font-black uppercase tracking-widest text-gray-400">eCart Packages</h3>
                                                <span className="text-xs font-bold text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-lg">{eCarts.length} added</span>
                                            </div>
                                            {eCarts.length === 0 ? (
                                                <div className="bg-indigo-50 border-2 border-dashed border-indigo-200 rounded-3xl p-6 text-center mb-4">
                                                    <p className="text-indigo-400 font-bold mb-1">No eCarts added yet.</p>
                                                    <p className="text-xs text-indigo-300">Tap below to register a package.</p>
                                                </div>
                                            ) : (
                                                <div className="space-y-3 mb-4">
                                                    {eCarts.map((item, idx) => (
                                                        <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white border-2 border-gray-100 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                                                            <div className="flex items-center gap-3">
                                                                <div className="w-10 h-10 bg-indigo-100 text-indigo-600 rounded-xl flex items-center justify-center font-black">#{idx + 1}</div>
                                                                <div>
                                                                    <p className="font-bold text-gray-800 text-base">{item.batches_name}</p>
                                                                    <p className="text-xs font-medium text-gray-400 mt-0.5">{item.year_received} · {item.sources_fund} · {item.charging_condition}</p>
                                                                </div>
                                                            </div>
                                                            <button onClick={() => deleteEcart(item.id)} className="p-3 bg-red-50 text-red-500 rounded-xl hover:bg-red-100 transition-colors"><FiTrash2 className="w-5 h-5" /></button>
                                                        </motion.div>
                                                    ))}
                                                </div>
                                            )}
                                            <button onClick={() => setShowEcartModal(true)} className="w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-indigo-600 bg-white border-2 border-dashed border-indigo-300 hover:bg-indigo-50 transition-colors">
                                                <FiPlus className="w-5 h-5" /> Add New eCart Package
                                            </button>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        )}


                        {/* ══════════════════════════════════════════════════════
                            PHASE 4: WASH & SANITATION UI
                            ══════════════════════════════════════════════════════ */}
                        {currentPhase === 4 && (
                            <motion.div key="p4-wash" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">💧</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Phase 4</p>
                                        <h2 className="text-2xl font-black text-gray-800 leading-tight">WASH &amp; Sanitation</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 mb-8">Count all school water and sanitation facilities. We will isolate classroom-attached CRs below.</p>

                                {/* Water Source Gatekeeper */}
                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm mb-6">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">🚰</span>
                                        <h3 className="text-lg font-black text-gray-800">Primary Water Source</h3>
                                    </div>
                                    <select name="water_source" value={washData.water_source} onChange={handleWashChange} className={`${chunkySelect} w-full`}>
                                        <option value="" disabled>Tap to select...</option>
                                        {WATER_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                                    </select>
                                </div>

                                {/* Main Sanitation Audit List */}
                                <div className="space-y-4 mb-6">
                                    {WASH_CATEGORIES.map(cat => {
                                        const hasError = washStats.errors[cat.key];
                                        return (
                                            <div key={cat.key} className={`bg-white border-2 rounded-3xl p-5 transition-all shadow-sm ${hasError ? "border-red-300" : "border-gray-100"}`}>
                                                <div className="flex items-center gap-2 mb-3">
                                                    <span className="text-2xl">{cat.emoji}</span>
                                                    <h3 className="text-lg font-black text-gray-800">{cat.label}</h3>
                                                </div>

                                                <div className="grid grid-cols-2 gap-3">
                                                    <div>
                                                        <p className="text-[10px] font-black text-gray-400 uppercase text-center mb-1">Total Count</p>
                                                        <input 
                                                            type="number" 
                                                            name={`${cat.key}_total`} 
                                                            value={washData[`${cat.key}_total`]} 
                                                            onChange={handleWashChange} 
                                                            min="0" 
                                                            placeholder="0" 
                                                            className={`${chunkyInput} !mt-0 !bg-gray-50 text-gray-800 focus:!border-gray-400 focus:!bg-white`} 
                                                        />
                                                    </div>
                                                    <div>
                                                        <p className={`text-[10px] font-black uppercase text-center mb-1 ${hasError ? "text-red-500" : "text-emerald-500"}`}>Functional</p>
                                                        <input 
                                                            type="number" 
                                                            name={`${cat.key}_func`} 
                                                            value={washData[`${cat.key}_func`]} 
                                                            onChange={handleWashChange} 
                                                            min="0" 
                                                            placeholder="0" 
                                                            className={`${chunkyInput} !mt-0 ${hasError ? "!bg-red-50 !border-red-400 text-red-700" : "!bg-emerald-50 text-emerald-700 focus:!border-emerald-400"}`} 
                                                        />
                                                    </div>
                                                </div>

                                                <AnimatePresence>
                                                    {hasError && (
                                                        <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                            <div className="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-xl border border-red-100 flex items-center gap-2">
                                                                <FiX className="w-4 h-4 flex-shrink-0" />
                                                                Functional cannot exceed Total items!
                                                            </div>
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Attached CR Breakdown */}
                                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-5 shadow-sm">
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-2xl">🏫</span>
                                        <h3 className="text-lg font-black text-indigo-900">Classroom Toilets <span className="text-sm font-bold text-indigo-500">(Attached CRs)</span></h3>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-xs font-bold text-indigo-800 mb-1 leading-tight">Classrooms with CR</p>
                                            <input type="number" name="attached_cr_classrooms" value={washData.attached_cr_classrooms} onChange={handleWashChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0 !bg-white focus:!border-indigo-400`} />
                                        </div>
                                        <div>
                                            <p className="text-xs font-bold text-indigo-800 mb-1 leading-tight">Total Attached Seats</p>
                                            <input type="number" name="attached_cr_seats" value={washData.attached_cr_seats} onChange={handleWashChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0 !bg-white focus:!border-indigo-400`} />
                                        </div>
                                    </div>

                                    {/* Double Count Checkbox - WASH specific */}
                                    <div 
                                        onClick={() => setWashData(p => ({...p, attached_cr_included_in_main: !p.attached_cr_included_in_main}))}
                                        className={`mt-5 rounded-2xl p-4 border-2 flex items-start gap-3 cursor-pointer transition-colors ${washData.attached_cr_included_in_main ? "bg-amber-50 border-amber-300" : "bg-white border-indigo-200"}`}
                                    >
                                        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${washData.attached_cr_included_in_main ? "bg-amber-500 border-amber-500" : "bg-gray-100 border-gray-300"}`}>
                                            {washData.attached_cr_included_in_main && <FiCheck className="text-white w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-bold ${washData.attached_cr_included_in_main ? "text-amber-800" : "text-gray-600"}`}>Double-Count Notice</p>
                                            <p className={`text-xs mt-1 ${washData.attached_cr_included_in_main ? "text-amber-700" : "text-gray-400"}`}>Check here if these attached toilet seats were ALREADY included in the Main Sanitation Audit above.</p>
                                        </div>
                                    </div>

                                </div>

                            </motion.div>
                        )}

                        {/* ══════════════════════════════════════════════════════
                            PHASE 5: UTILITIES & HARDSHIP
                            ══════════════════════════════════════════════════════ */}
                        {currentPhase === 5 && (
                            <motion.div key="p5-utilities" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-2xl flex items-center justify-center text-xl">⚡</div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Phase 5</p>
                                        <h2 className="text-2xl font-black text-gray-800 leading-tight">Utilities &amp; Hardship</h2>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-400 mb-8">Finalizing power supply, connectivity, and administrative categories.</p>

                                {/* Electricity Section */}
                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm mb-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Power Supply</h3>
                                    <select name="utility_electricity" value={utilitiesData.utility_electricity} onChange={handleUtilitiesChange} className={`${chunkySelect} w-full !mt-0`}>
                                        <option value="" disabled>Tap to select...</option>
                                        <option value="Grid & Off-grid supply">Grid &amp; Off-grid supply</option>
                                        <option value="Grid supply">Grid supply</option>
                                        <option value="Off-grid supply">Off-grid supply</option>
                                        <option value="No electricity">No electricity</option>
                                    </select>
                                    
                                    <AnimatePresence>
                                        {(utilitiesData.utility_electricity === "Grid & Off-grid supply" || utilitiesData.utility_electricity === "Off-grid supply") && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden">
                                                <div 
                                                    onClick={() => setUtilitiesData(p => ({...p, has_solar_or_gen: !p.has_solar_or_gen}))}
                                                    className={`mt-4 rounded-2xl p-4 border-2 flex items-center gap-3 cursor-pointer transition-colors ${utilitiesData.has_solar_or_gen ? "bg-amber-50 border-amber-300" : "bg-gray-50 border-gray-200"}`}
                                                >
                                                    <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${utilitiesData.has_solar_or_gen ? "bg-amber-500 border-amber-500" : "bg-white border-gray-300"}`}>
                                                        {utilitiesData.has_solar_or_gen && <FiCheck className="text-white w-4 h-4" />}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold ${utilitiesData.has_solar_or_gen ? "text-amber-800" : "text-gray-600"}`}>Off-grid Source Confirmed</p>
                                                        <p className={`text-xs mt-1 ${utilitiesData.has_solar_or_gen ? "text-amber-700" : "text-gray-400"}`}>Check here if the off-grid power is supplied by Solar Panels or a Generator.</p>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Internet Section */}
                                <div className="bg-white border-2 border-gray-100 rounded-3xl p-5 shadow-sm mb-4">
                                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Internet Access</h3>
                                    <p className="text-sm font-bold text-gray-700 mb-4">Does the school have a functional internet connection?</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setUtilitiesData(p => ({...p, utility_internet_yesno: true}))} className={`${toggleBtnBase} ${utilitiesData.utility_internet_yesno === true ? toggleBtnActive : toggleBtnInactive}`}><span>👍</span> Yes</button>
                                        <button onClick={() => setUtilitiesData(p => ({...p, utility_internet_yesno: false}))} className={`${toggleBtnBase} ${utilitiesData.utility_internet_yesno === false ? toggleBtnActive : toggleBtnInactive}`}><span>👎</span> No</button>
                                    </div>
                                    
                                    <AnimatePresence>
                                        {utilitiesData.utility_internet_yesno === true && (
                                            <motion.div variants={expandVariants} initial="hidden" animate="visible" exit="hidden" className="overflow-hidden pt-4 border-t border-gray-100 mt-4">
                                                <p className="text-xs font-bold text-gray-500 mb-1 ml-1">Primary Funding Source for Internet</p>
                                                <select name="utility_internet_funder" value={utilitiesData.utility_internet_funder} onChange={handleUtilitiesChange} className={`${chunkySelect} w-full`}>
                                                    <option value="" disabled>Select funder...</option>
                                                    <option value="DepEd Funded (DCP)">DepEd Funded (DCP)</option>
                                                    <option value="School MOOE">School MOOE</option>
                                                    <option value="LGU/Barangay Funded">LGU/Barangay Funded</option>
                                                    <option value="Teachers' Personal Expense">Teachers' Personal Expense</option>
                                                </select>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                {/* Verified Water Source Card (Read-Only) */}
                                <div className="bg-emerald-50 border-2 border-emerald-100 rounded-3xl p-5 shadow-sm mb-4 flex items-center justify-between opacity-80 cursor-not-allowed">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center text-xl">🔒</div>
                                        <div>
                                            <p className="text-xs font-bold uppercase tracking-widest text-emerald-500 mb-0.5">Primary Water Source</p>
                                            <h3 className="text-sm font-black text-emerald-800">{washData.water_source || "Not provided"}</h3>
                                        </div>
                                    </div>
                                    <FiCheckCircle className="w-6 h-6 text-emerald-400" />
                                </div>

                                {/* SHA Classification */}
                                <div className="bg-indigo-50 border-2 border-indigo-100 rounded-3xl p-5 shadow-sm mb-6 relative overflow-hidden">
                                    <h3 className="text-sm font-bold text-indigo-400 uppercase tracking-widest mb-3">School Classification (SHA)</h3>
                                    <select name="sha_category" value={utilitiesData.sha_category} onChange={handleUtilitiesChange} className={`${chunkySelect} w-full !bg-white focus:!border-indigo-400`}>
                                        <option value="" disabled>Select category...</option>
                                        <option value="Not included">Not included</option>
                                        <option value="Hardship post">Hardship post</option>
                                        <option value="Pure multigrade">Pure multigrade</option>
                                        <option value="Hardship post & pure multigrade">Hardship post &amp; pure multigrade</option>
                                    </select>

                                    {hasMultigradeContext && (
                                        <div className="mt-4 bg-white/60 p-3 rounded-xl border border-indigo-100 flex items-start gap-2">
                                            <span className="text-indigo-500">💡</span>
                                            <p className="text-xs font-bold text-indigo-700 mt-0.5">Note: You reported having multi-grade classes in Unit 6.</p>
                                        </div>
                                    )}
                                </div>

                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </main>

            <div className="fixed bottom-0 left-0 w-full p-5 bg-white border-t border-gray-100 flex justify-center z-40 shadow-[0_-2px_12px_rgba(0,0,0,0.02)]">
                <div className="w-full max-w-md flex items-center gap-3">
                    <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all outline-none">
                         <FiSave className="w-6 h-6" />
                    </button>
                    {currentPhase === 1 ? (
                        <button disabled={!isPhase1Valid} onClick={handleMainProceed} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-emerald-500 border-b-[5px] border-emerald-700 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                            Continue to Phase 2 <FiChevronRight className="w-5 h-5" />
                        </button>
                    ) : currentPhase === 2 ? (
                        <button disabled={!ictStats.isValid} onClick={handlePhase2Proceed} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-blue-500 border-b-[5px] border-blue-700 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                            Continue to Mobile Labs (eCart) <FiChevronRight className="w-5 h-5" />
                        </button>
                    ) : currentPhase === 3 ? (
                        <button disabled={!isPhase3Valid} onClick={handlePhase3Proceed} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-emerald-500 border-b-[5px] border-emerald-700 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                            Continue to Phase 4 (WASH) <FiChevronRight className="w-5 h-5" />
                        </button>
                    ) : currentPhase === 4 ? (
                        <button disabled={!washStats.isValid} onClick={handlePhase4Proceed} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-indigo-500 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                            Continue to Phase 5 (Utilities) <FiChevronRight className="w-5 h-5" />
                        </button>
                    ) : (
                        <button disabled={!isPhase5Valid || loading} onClick={handleFinalSubmit} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-emerald-500 border-b-[5px] border-emerald-700 active:border-b-0 active:translate-y-[5px] transition-all disabled:opacity-50 shadow-lg flex items-center justify-center gap-2">
                            {loading ? "Submitting..." : "Submit School Resources"} <FiCheckCircle className="w-5 h-5" />
                        </button>
                    )}
                </div>
            </div>

            {/* ── Add eCart Modal ── */}
            <AnimatePresence>
                {showEcartModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100">
                                <div><h3 className="text-xl font-black text-gray-800">Add eCart Package</h3><p className="text-xs text-gray-400 mt-1">Register mobile lab details.</p></div>
                                <button onClick={() => setShowEcartModal(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200"><FiX className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Package Details</h4>
                                    <div className="space-y-3">
                                        <div><p className="text-xs font-bold text-gray-500 mb-1 ml-1">Batch / Package Name</p><input type="text" name="batches_name" value={ecartForm.batches_name} onChange={handleEcartFormChange} placeholder="e.g. Batch 44" className={`${chunkyInput} !mt-0 !text-left !px-5`} /></div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div><p className="text-xs font-bold text-gray-500 mb-1 ml-1">Year Received</p><input type="number" name="year_received" value={ecartForm.year_received} onChange={handleEcartFormChange} placeholder="e.g. 2021" min="1990" max="2050" className={`${chunkyInput} !mt-0`} /></div>
                                            <div>
                                                <p className="text-xs font-bold text-gray-500 mb-1 ml-1">Funding Source</p>
                                                <select name="sources_fund" value={ecartForm.sources_fund} onChange={handleEcartFormChange} className={`${chunkySelect} !mt-0 text-base py-4.5`}>
                                                    <option value="" disabled>Select...</option>
                                                    {ECART_FUNDING_SOURCES.map(src => <option key={src} value={src}>{src}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Included Devices</h4>
                                    <div className="grid grid-cols-3 gap-3 mb-2">
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase text-center mb-1">💻 Laptops</p><input type="number" name="ecart_laptops" value={ecartForm.ecart_laptops} onChange={handleEcartFormChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0`} /></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase text-center mb-1">📱 Tablets</p><input type="number" name="ecart_tablets" value={ecartForm.ecart_tablets} onChange={handleEcartFormChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0`} /></div>
                                        <div><p className="text-[10px] font-bold text-gray-400 uppercase text-center mb-1">📺 Smart TVs</p><input type="number" name="ecart_tv" value={ecartForm.ecart_tv} onChange={handleEcartFormChange} min="0" placeholder="0" className={`${chunkyInput} !mt-0`} /></div>
                                    </div>
                                </div>

                                <div className="pt-2">
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3">Infrastructure &amp; Extras</h4>
                                    <p className="text-sm font-bold text-gray-700 mb-2">Charging Station / Base</p>
                                    <div className="flex gap-3 mb-4">
                                        <button onClick={() => setEcartForm(p => ({...p, charging_condition: 'Functional'}))} className={`${toggleBtnBase} !text-sm !py-3 ${ecartForm.charging_condition === 'Functional' ? toggleBtnActive : toggleBtnInactive}`}>Functional</button>
                                        <button onClick={() => setEcartForm(p => ({...p, charging_condition: 'Non-Functional'}))} className={`${toggleBtnBase} !text-sm !py-3 ${ecartForm.charging_condition === 'Non-Functional' ? toggleBtnActive : toggleBtnInactive}`}>Missing/Broken</button>
                                    </div>
                                    <p className="text-xs font-bold text-gray-500 mb-1 ml-1">Remarks / Other Equipment <span className="font-normal">(Optional)</span></p>
                                    <textarea name="remarks" value={ecartForm.remarks} onChange={handleEcartFormChange} placeholder="e.g. Routers, Headphones, Adapters..." className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm font-medium text-gray-700 focus:outline-none focus:border-indigo-500 focus:bg-indigo-50 transition-colors min-h-[100px] resize-none" />
                                </div>
                            </div>
                            <div className="p-5 border-t border-gray-100 flex gap-3">
                                <button onClick={handleSaveEcart} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-indigo-500 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all">Save eCart</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Add Grade Level Modal ── */}
            <AnimatePresence>
                {showGradeModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-gray-900/60 backdrop-blur-sm flex items-end justify-center sm:items-center sm:p-4">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", bounce: 0.2, duration: 0.5 }} className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl max-h-[90vh] flex flex-col shadow-2xl">
                            <div className="flex items-center justify-between p-5 border-b border-gray-100 sticky top-0 bg-white z-10 rounded-t-3xl">
                                <div><h3 className="text-xl font-black text-gray-800">Grade Level Audit</h3><p className="text-xs text-gray-400 mt-1">Aggregate seating for this level.</p></div>
                                <button onClick={() => setShowGradeModal(false)} className="p-2 bg-gray-100 text-gray-500 rounded-full hover:bg-gray-200"><FiX className="w-5 h-5" /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-5 pb-8 space-y-6">
                                {selectedGradeId && (
                                    <div className="bg-indigo-50 border-2 border-indigo-100 p-4 rounded-2xl mb-4 text-center">
                                        <h4 className="text-lg font-black text-indigo-900 leading-tight">
                                            {gradesData.find(g => g.id === selectedGradeId)?.grade_level}
                                        </h4>
                                        <p className="text-sm font-bold text-indigo-600 mt-1">
                                            Target: {gradesData.find(g => g.id === selectedGradeId)?.enrolled} Learners across {gradesData.find(g => g.id === selectedGradeId)?.sections} Sections
                                        </p>
                                    </div>
                                )}

                                <div>
                                    <h4 className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-3 pb-2 border-b border-gray-100">Learner Seating (Aggregated Totals)</h4>
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 mb-2">Individual Armchairs 🪑</p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div><p className="text-[10px] font-black text-emerald-500 uppercase text-center mb-1">Functional</p><input type="number" name="armchairs_func" value={currentGradeForm.armchairs_func} onChange={handleGradeFormChange} min="0" placeholder="0" className={`${chunkyInput} !bg-emerald-50 text-emerald-700 focus:!border-emerald-400 !mt-0`} /></div>
                                            <div><p className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Broken</p><input type="number" name="armchairs_broken" value={currentGradeForm.armchairs_broken} onChange={handleGradeFormChange} min="0" placeholder="0" className={`${chunkyInput} !bg-red-50 text-red-700 focus:!border-red-400 !mt-0`} /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 mb-2">Table &amp; Chair Sets <span className="text-xs text-indigo-400 font-normal">(2-seaters)</span></p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div><p className="text-[10px] font-black text-emerald-500 uppercase text-center mb-1">Functional</p><input type="number" name="tables_func" value={currentGradeForm.tables_func} onChange={handleGradeFormChange} min="0" placeholder="0" className={`${chunkyInput} !bg-emerald-50 text-emerald-700 focus:!border-emerald-400 !mt-0`} /></div>
                                            <div><p className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Broken</p><input type="number" name="tables_broken" value={currentGradeForm.tables_broken} onChange={handleGradeFormChange} min="0" placeholder="0" className={`${chunkyInput} !bg-red-50 text-red-700 focus:!border-red-400 !mt-0`} /></div>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-gray-700 mb-2">Student Desks <span className="text-xs text-indigo-400 font-normal">(2-seaters)</span></p>
                                        <div className="grid grid-cols-2 gap-3 mb-4">
                                            <div><p className="text-[10px] font-black text-emerald-500 uppercase text-center mb-1">Functional</p><input type="number" name="desks_func" value={currentGradeForm.desks_func} onChange={handleGradeFormChange} min="0" placeholder="0" className={`${chunkyInput} !bg-emerald-50 text-emerald-700 focus:!border-emerald-400 !mt-0`} /></div>
                                            <div><p className="text-[10px] font-black text-red-500 uppercase text-center mb-1">Broken</p><input type="number" name="desks_broken" value={currentGradeForm.desks_broken} onChange={handleGradeFormChange} min="0" placeholder="0" className={`${chunkyInput} !bg-red-50 text-red-700 focus:!border-red-400 !mt-0`} /></div>
                                        </div>
                                    </div>
                                </div>

                                {/* Magic Math Validation Banner */}
                                <AnimatePresence>
                                    {(currentGradeForm.armchairs_func !== "" || currentGradeForm.tables_func !== "" || currentGradeForm.desks_func !== "") && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`rounded-3xl p-5 border-2 mt-6 ${gradeStats.isOk ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
                                            <div className="flex items-center justify-between mb-3 border-b-2 border-white/40 pb-3">
                                                <span className={`text-xs font-black uppercase tracking-widest ${gradeStats.isOk ? "text-emerald-600" : "text-red-500"}`}>Combined Capacity</span>
                                                <span className={`text-2xl font-black ${gradeStats.isOk ? "text-emerald-600" : "text-red-600"}`}>{gradeStats.capacity}</span>
                                            </div>
                                            {gradeStats.isOk ? (
                                                <div className="flex items-start gap-2 text-emerald-700">
                                                    <span className="text-lg">✅</span>
                                                    <p className="text-sm font-bold pt-0.5">Every learner is accommodated! ({gradeStats.diff} extra)</p>
                                                </div>
                                            ) : (
                                                <div className="flex items-start gap-2 text-red-700">
                                                    <span className="text-lg">⚠️</span>
                                                    <p className="text-sm font-bold pt-0.5">Shortage of <span className="text-red-600 text-lg font-black">{Math.abs(gradeStats.diff)}</span> seats flagged for this grade level.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                            <div className="p-5 border-t border-gray-100 flex gap-3 bg-white rounded-b-3xl">
                                <button onClick={handleSaveGradeLevel} className="flex-1 py-4 rounded-2xl text-white font-black text-lg text-center bg-indigo-500 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all">Save &amp; Verify Grade</button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDraftModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end justify-center pointer-events-auto">
                        <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-md rounded-t-[3rem] p-10 pb-12 shadow-2xl relative text-left">
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

export default Unit7SchoolResources;
