import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiX, FiCheckCircle, FiPlus, FiSearch, FiEdit2, 
  FiTrash2, FiUser, FiBriefcase, FiAlertTriangle, 
  FiChevronRight, FiChevronLeft, FiPlusCircle, FiArrowLeft,
  FiChevronsLeft, FiChevronsRight, FiUsers, FiSave
} from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";

// ── Constants & Definitions ──────────────────────────────────────────────────

const UNIT_ID = 6;
const PREV_UNIT_ID = 5;
const NEXT_UNIT_PATH = "/modular/unit-7";
const ITEMS_PER_PAGE = 10;

const GRADE_LEVELS = [
  "Kindergarten", "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12", "Multigrade"
];

const DESIGNATION_OPTIONS = [
  "School Coordinator",
  "Trainer/Adviser",
  "Chairmanship",
  "Assistant School Head Designate",
  "Department Head"
];

const MATATAG_SUBJECTS = {
  "Kindergarten": [
    { name: "Kindergarten Block", code: "K-BLOCK" }
  ],
  "Grade 1": [
    { name: "Language", code: "Lang1" },
    { name: "Reading and Literacy", code: "Read1" },
    { name: "Mathematics", code: "Math1" },
    { name: "Makabansa", code: "Maka1" },
    { name: "GMRC", code: "GMRC1" }
  ],
  "Grade 2": [
    { name: "Language", code: "Lang2" },
    { name: "Reading and Literacy", code: "Read2" },
    { name: "Mathematics", code: "Math2" },
    { name: "Makabansa", code: "Maka2" },
    { name: "GMRC", code: "GMRC2" },
    { name: "English", code: "Eng2" },
    { name: "Filipino", code: "Fil2" }
  ],
  "Grade 3": [
    { name: "Language", code: "Lang3" },
    { name: "Reading and Literacy", code: "Read3" },
    { name: "Mathematics", code: "Math3" },
    { name: "Makabansa", code: "Maka3" },
    { name: "GMRC", code: "GMRC3" },
    { name: "English", code: "Eng3" },
    { name: "Filipino", code: "Fil3" }
  ],
  "Grade 4": [
    { name: "Filipino", code: "Fil4" },
    { name: "English", code: "Eng4" },
    { name: "Mathematics", code: "Math4" },
    { name: "Science", code: "Sci4" },
    { name: "Araling Panlipunan", code: "AP4" },
    { name: "MAPEH", code: "MAPEH4" },
    { name: "EPP", code: "EPP4" },
    { name: "GMRC", code: "GMRC4" }
  ],
  "Grade 5": [
    { name: "Filipino", code: "Fil5" },
    { name: "English", code: "Eng5" },
    { name: "Mathematics", code: "Math5" },
    { name: "Science", code: "Sci5" },
    { name: "Araling Panlipunan", code: "AP5" },
    { name: "MAPEH", code: "MAPEH5" },
    { name: "EPP", code: "EPP5" },
    { name: "GMRC", code: "GMRC5" }
  ],
  "Grade 6": [
    { name: "Filipino", code: "Fil6" },
    { name: "English", code: "Eng6" },
    { name: "Mathematics", code: "Math6" },
    { name: "Science", code: "Sci6" },
    { name: "Araling Panlipunan", code: "AP6" },
    { name: "MAPEH", code: "MAPEH6" },
    { name: "EPP", code: "EPP6" },
    { name: "GMRC", code: "GMRC6" }
  ],
  "Secondary": [
    { name: "Filipino", code: "Fil" },
    { name: "English", code: "Eng" },
    { name: "Mathematics", code: "Math" },
    { name: "Science", code: "Sci" },
    { name: "Araling Panlipunan", code: "AP" },
    { name: "MAPEH", code: "MAPEH" },
    { name: "TLE", code: "TLE" },
    { name: "ESP", code: "ESP" }
  ],
  "SHS": [
    { name: "Core Subject", code: "CORE" },
    { name: "Applied Subject", code: "APPLIED" },
    { name: "Specialized Subject", code: "SPEC" }
  ]
};

const getSubjectsForGrade = (grade) => {
  if (grade === "Kindergarten") return MATATAG_SUBJECTS["Kindergarten"];
  if (grade === "Grade 1") return MATATAG_SUBJECTS["Grade 1"];
  if (grade === "Grade 2") return MATATAG_SUBJECTS["Grade 2"];
  if (grade === "Grade 3") return MATATAG_SUBJECTS["Grade 3"];
  if (grade === "Grade 4") return MATATAG_SUBJECTS["Grade 4"];
  if (grade === "Grade 5") return MATATAG_SUBJECTS["Grade 5"];
  if (grade === "Grade 6") return MATATAG_SUBJECTS["Grade 6"];
  if (grade && grade.includes("Grade") && parseInt(grade.replace(/\D/g, "")) >= 7 && parseInt(grade.replace(/\D/g, "")) <= 10) {
    return MATATAG_SUBJECTS["Secondary"];
  }
  if (grade && grade.includes("Grade") && parseInt(grade.replace(/\D/g, "")) >= 11) {
    return MATATAG_SUBJECTS["SHS"];
  }
  return MATATAG_SUBJECTS["Secondary"]; // Fallback
};

// ── Styles ───────────────────────────────────────────────────────────────────

const cardBase = "bg-white rounded-3xl p-6 shadow-sm border border-slate-100 transition-all";
const labelStyle = "text-[10px] font-black uppercase text-slate-400 tracking-widest mb-2 block";
const inputStyle = "w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl text-slate-700 font-bold focus:outline-none focus:border-blue-500 transition-all";

// ── Main Component ───────────────────────────────────────────────────────────

const TeachingPersonnelUnit = ({ targetSchoolId, isReadOnly: propReadOnly }) => {
    const navigate = useNavigate();
    const [schoolId, setSchoolId] = useState("");
    const [teachers, setTeachers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [baselineTeachers, setBaselineTeachers] = useState(0);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    
    // UI States
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [newTeacherFirst, setNewTeacherFirst] = useState("");
    const [newTeacherLast, setNewTeacherLast] = useState("");
    const [newTeacherPosition, setNewTeacherPosition] = useState("Teacher I");
    const [newTeacherRole, setNewTeacherRole] = useState("Non-Advisory");
    const [newTeacherDesignations, setNewTeacherDesignations] = useState([]);

    // Pagination & Filter State
    const [currentPage, setCurrentPage] = useState(1);
    const [rosterSearch, setRosterSearch] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    
    // Data States
    const [specializationOptions, setSpecializationOptions] = useState([]);
    const [subjectsMaster, setSubjectsMaster] = useState([]); // All database subjects
    
    // UI Local States
    const [customSpecialization, setCustomSpecialization] = useState("");
    const [isOtherSpec, setIsOtherSpec] = useState(false);
    
    // Form States
    const [activeTeacher, setActiveTeacher] = useState(null);

    const handleFinalize = async () => {
        // Detection: Check if any teacher has zero teaching load
        const teachersWithZeroLoad = teachers.filter(t => {
            const totalLoad = (t.monday_mins || 0) + (t.tuesday_mins || 0) + 
                              (t.wednesday_mins || 0) + (t.thursday_mins || 0) + 
                              (t.friday_mins || 0);
            return totalLoad === 0;
        });

        const isFullyComplete = teachersWithZeroLoad.length === 0;

        if (!isFullyComplete) {
            const proceed = window.confirm(
                `Warning: Some teachers have 0 total teaching load. \n\nYou can proceed to Unit 7, but Unit 6 will be marked as "Incomplete" until all personnel have assigned workloads. \n\nDo you want to proceed?`
            );
            if (!proceed) return;
        }

        setIsFinalizing(true);
        try {
            const res = await fetch(`/api/ph_schools/unit6/${schoolId}`, { 
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                partial: !isFullyComplete,
                total_teachers_registered: teachers.length
            })
            });
            const json = await res.json();
            if (json.success) {
                // Update Local Progress
                const stored = localStorage.getItem('quest_progress');
                if (stored) {
                    const progress = JSON.parse(stored);
                    if (!progress.incompleteUnits) progress.incompleteUnits = [];
                    
                    if (isFullyComplete) {
                        // Mark as done
                        if (!progress.completedUnits.includes(UNIT_ID)) {
                            progress.completedUnits.push(UNIT_ID);
                            progress.xp += 100;
                        }
                        // Remove from incomplete if it was there
                        progress.incompleteUnits = progress.incompleteUnits.filter(id => id !== UNIT_ID);
                    } else {
                        // Mark as incomplete
                        if (!progress.incompleteUnits.includes(UNIT_ID)) {
                            progress.incompleteUnits.push(UNIT_ID);
                        }
                        // Ensure it's not in completed
                        progress.completedUnits = progress.completedUnits.filter(id => id !== UNIT_ID);
                    }
                    localStorage.setItem('quest_progress', JSON.stringify(progress));
                }

                // Sync progress to dashboard
                try {
                    await fetch('/api/user/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ unitId: UNIT_ID, schoolId, partial: !isFullyComplete })
                    });
                } catch (e) { console.warn("Progress sync failed", e); }

                // Clear Draft on Finalize
                await clearUnitDraft(6, schoolId);

                navigate("/modular-dashboard");
            }
        } catch (err) { alert("Finalization failed."); }
        setIsFinalizing(false);
    };

    const handleSaveDraftAndExit = async () => {
        if (!schoolId) return;
        const draftData = {
            currentPage,
            rosterSearch
        };
        await saveUnitDraft(6, schoolId, draftData);
        navigate("/modular-dashboard");
    };

    // Initial Load
    useEffect(() => {
        const init = async () => {
            const storedId = targetSchoolId || localStorage.getItem("schoolId");
            if (!storedId) {
                navigate("/login");
                return;
            }
            setSchoolId(storedId);

            try {
                // Check for Draft First
                const draft = await getUnitDraft(6, storedId);
                if (draft) {
                    setCurrentPage(draft.currentPage || 1);
                    setRosterSearch(draft.rosterSearch || "");
                    setShowWelcomeBack(true);
                    setTimeout(() => setShowWelcomeBack(false), 3000);
                }

                // Fetch Core Data
                fetchRoster(storedId);
                fetchBaseline(storedId);

                // Fetch Specs & Subjects
                const [specRes, subRes] = await Promise.all([
                    fetch("/api/specializations"),
                    fetch("/api/subjects")
                ]);
                const specData = await specRes.json();
                const subData = await subRes.json();
                
                if (specData.success) setSpecializationOptions(specData.data);
                if (subData.success) setSubjectsMaster(subData.data);
            } catch (err) {
                console.error("Initialization error:", err);
            }
        };
        init();
    }, []);

    // Detect if current teacher specialization is custom
    useEffect(() => {
        if (activeTeacher && activeTeacher.specialization) {
            const isKnown = specializationOptions.includes(activeTeacher.specialization);
            setIsOtherSpec(!isKnown && activeTeacher.specialization.length > 0);
        } else {
            setIsOtherSpec(false);
        }
    }, [activeTeacher?.id, specializationOptions]);

    const fetchRoster = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/ph_schools/${id}/teachers`);
            const json = await res.json();
            if (json.success) setTeachers(json.data);
        } catch (err) { console.error("Roster Fetch Err:", err); }
        setLoading(false);
    };

    const fetchBaseline = async (id) => {
        try {
            const res = await fetch(`/api/ph_schools/${id}`);
            const json = await res.json();
            if (json.exists && json.data) setBaselineTeachers(json.data.total_teachers_registered || 0);
        } catch (err) { console.error("Baseline Fetch Err:", err); }
    };

    // ── Search & Import Logic ────────────────────────────────────────────────

    useEffect(() => {
        if (searchQuery.length < 2) {
            setSearchResults([]);
            return;
        }
        const delay = setTimeout(async () => {
            setSearching(true);
            try {
                const res = await fetch(`/api/master-teachers/search?name=${searchQuery}`);
                const json = await res.json();
                if (json.success) setSearchResults(json.data);
            } catch (err) { console.error("Search error:", err); }
            setSearching(false);
        }, 500);
        return () => clearTimeout(delay);
    }, [searchQuery]);

    const handleManualAdd = async () => {
        if (!newTeacherFirst || !newTeacherLast) {
            alert("Please enter both first and last name.");
            return;
        }

        const newTeacher = {
            id: 'temp-' + Date.now(),
            school_id: schoolId,
            first_name: newTeacherFirst,
            last_name: newTeacherLast,
            position: newTeacherPosition,
            specialization: "",
            sex: "Male",
            experience_bracket: "0-1",
            funding_source: "DepEd Nationally Funded",
            role_designation: newTeacherRole,
            designations: newTeacherDesignations.join(","),
            monday_hrs: 0, monday_mins_remain: 0,
            tuesday_hrs: 0, tuesday_mins_remain: 0,
            wednesday_hrs: 0, wednesday_mins_remain: 0,
            thursday_hrs: 0, thursday_mins_remain: 0,
            friday_hrs: 0, friday_mins_remain: 0,
            workloads: []
        };

        try {
            const res = await fetch(`/api/ph_schools/${schoolId}/teachers`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(newTeacher)
            });
            const json = await res.json();
            if (json.success) {
                setTeachers(prev => [json.data, ...prev]);
                setIsSearchOpen(false);
                setNewTeacherFirst("");
                setNewTeacherLast("");
                setNewTeacherPosition("Teacher I");
                setNewTeacherRole("Non-Advisory");
                setNewTeacherDesignations([]);
                handleEdit(json.data); // Open edit modal for the newly added teacher
            }
        } catch (err) {
            console.error("Manual Add Err:", err);
            alert("Failed to add teacher.");
        }
    };


    // ── CRUD Logic ──────────────────────────────────────────────────────────

    const handleEdit = (teacher) => {
        // Map minutes back to hours/minutes for the UI
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const capacityFields = {};
        days.forEach(day => {
            const totalMins = teacher[`${day}_mins`] || 0;
            capacityFields[`${day}_hrs`] = Math.floor(totalMins / 60) || "";
            capacityFields[`${day}_mins_remain`] = (totalMins % 60) || "";
        });

        setActiveTeacher({
            ...teacher,
            ...capacityFields,
            workloads: teacher.workloads || [],
            designationList: (teacher.designations || "").split(",").filter(Boolean)
        });
        setIsEditOpen(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this teacher?")) return;
        try {
            const res = await fetch(`/api/teachers/${id}`, { method: "DELETE" });
            if (res.ok) setTeachers(prev => prev.filter(t => t.id !== id));
        } catch (err) { alert("Delete failed."); }
    };

    const handleSaveTeacher = async () => {
        if (!activeTeacher) return;
        const tid = activeTeacher.id;

        // Convert UI hrs/mins back to raw minutes for the DB
        const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        const dailyMins = {};
        days.forEach(day => {
            dailyMins[`${day}_mins`] = (parseInt(activeTeacher[`${day}_hrs`]) || 0) * 60 + (parseInt(activeTeacher[`${day}_mins_remain`]) || 0);
        });

        try {
            const payload = {
                ...activeTeacher,
                ...dailyMins,
                designations: (activeTeacher.designationList || []).join(",")
            };
            
            const res = await fetch(`/api/teachers/${tid}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                fetchRoster(schoolId); // Refresh
                setIsEditOpen(false);
                setActiveTeacher(null);
            }
        } catch (err) { alert("Save failed."); }
    };

    // ── Workload Helpers ─────────────────────────────────────────────────────

    const updateWorkload = (index, field, value) => {
        setActiveTeacher(prev => {
            const nextWorkloads = [...prev.workloads];
            const updated = { ...nextWorkloads[index], [field]: value };
            
            // Cascading Reset Logic
            if (field === 'grade_level') {
                updated.category = ""; // Reset category for SHS check
                updated.subject_name = ""; 
            }
            if (field === 'category') {
                updated.subject_name = "";
            }

            nextWorkloads[index] = updated;
            return { ...prev, workloads: nextWorkloads };
        });
    };

    const removeWorkload = (index) => {
        setActiveTeacher(p => ({ 
            ...p, 
            workloads: p.workloads.filter((_, i) => i !== index) 
        }));
    };

    const addWorkload = () => {
        if (!activeTeacher) return;
        const newW = {
            grade_level: "Grade 1",
            category: "", // For SHS
            subject_name: "",
            duration_minutes: 0,
            hours: 0,
            minutes: 0
        };
        setActiveTeacher(p => ({ ...p, workloads: [...p.workloads, newW] }));
    };
    const totalWorkloadMins = useMemo(() => {
        if (!activeTeacher) return 0;
        return activeTeacher.workloads.reduce((sum, w) => {
            const total = (parseInt(w.hours) || 0) * 60 + (parseInt(w.minutes) || 0);
            return sum + total;
        }, 0);
    }, [activeTeacher?.workloads]);

    const isOverLimit = totalWorkloadMins > 360;

    // Helper: Filter subjects for a specific workload row
    const getFilteredSubjects = (gradeLevel, category) => {
        if (!gradeLevel) return [];
        const isSHS = ["Grade 11", "Grade 12"].includes(gradeLevel);
        
        if (isSHS) {
            if (!category) return [];
            const catMap = { 'Core': 'SHS_CORE', 'Applied': 'SHS_APPLIED', 'Specialized': 'SHS_SPECIALIZED' };
            return subjectsMaster.filter(s => s.category === catMap[category]);
        } else {
            const num = parseInt(gradeLevel.split(" ")[1]);
            if (num >= 1 && num <= 6) return subjectsMaster.filter(s => s.category === 'ELEMENTARY');
            if (num >= 7 && num <= 10) return subjectsMaster.filter(s => s.category === 'JHS');
            return subjectsMaster.filter(s => s.category === 'ELEMENTARY'); // Fallback for Kinder/etc
        }
    };

    // ── Pagination & Filter Logic ────────────────────────────────────────────
    const actualTeachers = useMemo(() => {
        return teachers.filter(t => {
            const pos = (t.position || "").toLowerCase();
            return !pos.includes("principal") && !pos.includes("head teacher");
        });
    }, [teachers]);

    const filteredTeachers = useMemo(() => {
        if (!rosterSearch) return actualTeachers;
        const low = rosterSearch.toLowerCase();
        return actualTeachers.filter(t => 
            (t.first_name || "").toLowerCase().includes(low) || 
            (t.last_name || "").toLowerCase().includes(low) ||
            (t.position || "").toLowerCase().includes(low)
        );
    }, [actualTeachers, rosterSearch]);

    const totalPages = Math.ceil(filteredTeachers.length / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const currentTeachers = filteredTeachers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

    // Reset to page 1 when searching
    useEffect(() => {
        setCurrentPage(1);
    }, [teachers, rosterSearch]);

    const isReadOnly = propReadOnly;

    // Auto-adjust page if we delete the last item on a page
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [filteredTeachers.length, currentPage, totalPages]);

    // ── Render Helpers ────────────────────────────────────────────────────────

    const TeacherCard = ({ teacher }) => {
        const mins = (parseInt(teacher.monday_mins) || 0) + 
                     (parseInt(teacher.tuesday_mins) || 0) + 
                     (parseInt(teacher.wednesday_mins) || 0) + 
                     (parseInt(teacher.thursday_mins) || 0) + 
                     (parseInt(teacher.friday_mins) || 0);
        const hours = Math.floor(mins / 60);
        const rem = mins % 60;
        const overLimit = mins > 1800; // Weekly total over 30 hours (6h * 5)

        return (
            <motion.div layout className={cardBase}>
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600">
                            <FiUser size={24} />
                        </div>
                        <div>
                            <h3 className="font-black text-slate-800 text-lg leading-tight uppercase">
                                {teacher.last_name}, {teacher.first_name}
                            </h3>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1">
                                {teacher.position || 'Teacher I'}
                            </p>
                        </div>
                    </div>
                     {!isReadOnly && (
                        <div className="flex gap-2">
                            <button onClick={() => handleEdit(teacher)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-blue-50 hover:text-blue-600 transition-all">
                                <FiEdit2 size={18} />
                            </button>
                            <button onClick={() => handleDelete(teacher.id)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:bg-rose-50 hover:text-rose-600 transition-all">
                                <FiTrash2 size={18} />
                            </button>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-4 mt-6">
                    <div className="flex-1 bg-slate-50 rounded-2xl p-3">
                        <span className={labelStyle}>Workload</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-lg font-black ${overLimit ? 'text-orange-600' : 'text-slate-700'}`}>
                                {hours}h {rem}m
                            </span>
                            {overLimit && <FiAlertTriangle className="text-orange-500 animate-pulse" />}
                        </div>
                    </div>
                    <div className="flex-1 bg-slate-50 rounded-2xl p-3 overflow-hidden">
                        <span className={labelStyle}>Funding Source</span>
                        <span className="text-sm font-black text-slate-700 truncate block">
                            {teacher.funding_source || 'DepEd National'}
                        </span>
                    </div>
                </div>
            </motion.div>
        );
    };

    // ── Summary Component ──────────────────────────────────────────────────
    const Unit6Summary = () => {
        const totalStaff = teachers.length;
        const totalMins = teachers.reduce((sum, t) => {
            return sum + (t.monday_mins || 0) + (t.tuesday_mins || 0) + 
                   (t.wednesday_mins || 0) + (t.thursday_mins || 0) + 
                   (t.friday_mins || 0);
        }, 0);
        
        const avgWeeklyMins = totalStaff > 0 ? (totalMins / totalStaff) : 0;
        const avgDailyMins = avgWeeklyMins / 5;

        // Position breakdown
        const positions = {};
        teachers.forEach(t => {
            const p = t.position || "Teacher I";
            positions[p] = (positions[p] || 0) + 1;
        });

        // Funding breakdown
        const funding = {};
        teachers.forEach(t => {
            const f = t.funding_source || "DepEd National";
            funding[f] = (funding[f] || 0) + 1;
        });

        return (
            <div className="min-h-screen bg-slate-50/50 font-sans">
                {/* Exit Header */}
                {!propReadOnly && (
                    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                        <div className="max-w-md mx-auto flex items-center gap-3">
                            <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                                <FiArrowLeft className="w-6 h-6" />
                            </button>
                            <div className="flex-1 text-center">
                                <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Unit 6</div>
                                <h1 className="text-sm font-black text-gray-800">Teaching Personnel</h1>
                            </div>
                            <div className="w-10" />
                        </div>
                    </header>
                )}

                <div className="max-w-md mx-auto pb-32 mt-4 px-4 space-y-8">
                    {/* Header */}
                    <div className="text-center mb-10">
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-blue-100"
                        >
                            <FiUsers className="w-10 h-10 text-white" />
                        </motion.div>
                        <span className="inline-block px-4 py-1.5 rounded-full bg-blue-50 text-blue-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-blue-100">
                            Unit 6 • Human Resources
                        </span>
                        <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight">Personnel Roster</h1>
                        <p className="text-slate-500 font-medium mt-2 italic">"Instructional staff and workload report"</p>
                    </div>

                    {/* High Level Metrics */}
                    <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-2xl shadow-blue-100 relative overflow-hidden group border border-white/10">
                        <div className="absolute -bottom-10 -right-10 text-9xl opacity-10 group-hover:scale-110 transition-transform duration-700 pointer-events-none">🎓</div>
                        <div className="relative z-10 text-center">
                            <p className="text-blue-300 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Staffing Overview</p>
                            <div className="flex items-center justify-around py-4 border-y border-white/10 mt-4">
                                <div className="text-center">
                                    <p className="text-4xl font-black leading-none">{totalStaff}</p>
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mt-2 tracking-widest">Registered</p>
                                </div>
                                <div className="w-px h-12 bg-white/10" />
                                <div className="text-center">
                                    <p className="text-4xl font-black leading-none">{totalStaff}</p>
                                    <p className="text-[10px] font-bold text-blue-400 uppercase mt-2 tracking-widest">Baseline</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Analytics Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-6 bg-blue-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Workload Analytics</h3>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Daily Load</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-800">{Math.floor(avgDailyMins / 60)}h</span>
                                    <span className="text-sm font-bold text-slate-400">{Math.round(avgDailyMins % 60)}m</span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-50 rounded-full mt-3 overflow-hidden">
                                    <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, (avgDailyMins / 360) * 100)}%` }} />
                                </div>
                            </div>
                            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Weekly Commitment</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-2xl font-black text-slate-800">{Math.floor(avgWeeklyMins / 60)}h</span>
                                    <span className="text-sm font-bold text-slate-400">{Math.round(avgWeeklyMins % 60)}m</span>
                                </div>
                                <p className="text-[8px] font-bold text-slate-300 uppercase mt-2 italic">Standard is 30h/week</p>
                            </div>
                        </div>
                    </section>

                    {/* Position Distribution */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Positions Distribution</h3>
                        </div>
                        <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm space-y-3">
                            {Object.entries(positions).map(([pos, count]) => (
                                <div key={pos} className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-slate-600 uppercase tracking-tight">{pos}</span>
                                    <div className="flex items-center gap-3 flex-1 px-4">
                                        <div className="h-1.5 flex-1 bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-400" style={{ width: `${(count/totalStaff)*100}%` }} />
                                        </div>
                                        <span className="text-xs font-black text-indigo-600 w-4">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* Personnel List (Mini Roster) */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2 px-2">
                            <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Detailed Roster</h3>
                        </div>
                        <div className="space-y-3">
                            {teachers.slice(0, 5).map(t => {
                                const mins = (t.monday_mins||0) + (t.tuesday_mins||0) + (t.wednesday_mins||0) + (t.thursday_mins||0) + (t.friday_mins||0);
                                return (
                                    <div key={t.id} className="bg-white rounded-2xl p-4 border border-slate-50 shadow-sm flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-500">
                                                <FiUser />
                                            </div>
                                            <div>
                                                <h4 className="font-black text-slate-800 text-sm uppercase">{t.last_name}, {t.first_name}</h4>
                                                <p className="text-[9px] font-bold text-slate-400 uppercase">{t.position}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-black text-blue-600">{Math.floor(mins/60)}h {mins%60}m</p>
                                            <p className="text-[8px] font-bold text-slate-300 uppercase tracking-widest">Weekly</p>
                                        </div>
                                    </div>
                                );
                            })}
                            {teachers.length > 5 && (
                                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pt-2">
                                    + {teachers.length - 5} more personnel in database
                                </p>
                            )}
                        </div>
                    </section>

                    {!propReadOnly && (
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-12"
                        >
                            <button 
                                onClick={() => navigate("/modular/unit-6")}
                                className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-blue-100 text-blue-700 font-black text-lg shadow-xl shadow-blue-100/50 hover:border-blue-200 hover:bg-blue-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-blue-500/5 to-blue-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FiEdit2 className="w-5 h-5 text-blue-700" />
                                </div>
                                <span>Modify Staff Roster</span>
                            </button>
                        </motion.div>
                    )}
                </div>
            </div>
        );
    };

    if (isReadOnly) {
        return <Unit6Summary />;
    }

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="min-h-screen bg-gray-50 pb-32"
        >
            <AnimatePresence>
                {showSuccess && (
                    <SuccessModal 
                        isOpen={showSuccess} 
                        message="Roster & Workloads updated." 
                        onClose={() => setShowSuccess(false)}
                        redirectUrl={NEXT_UNIT_PATH} 
                    />
                )}
            </AnimatePresence>

            {/* Header */}
            {!isReadOnly && (
                <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-sm">
                    <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between relative">
                        <div className="flex items-center gap-3 z-10">
                            <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-50 transition-colors">
                                <FiArrowLeft className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="absolute left-0 right-0 text-center pointer-events-none">
                            <div className="text-[10px] font-black tracking-widest text-blue-400 uppercase">Unit 6</div>
                            <h1 className="text-sm font-black text-slate-800">Teaching Personnel</h1>
                        </div>
                        <div className="w-10 z-10 text-right">
                            <button onClick={() => setIsSearchOpen(true)} className="p-2 -mr-2 text-blue-600 hover:text-blue-800 rounded-full hover:bg-blue-50 transition-colors">
                                <FiPlusCircle className="w-6 h-6" />
                            </button>
                        </div>
                    </div>
                </header>
            )}

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

            <main className="max-w-md mx-auto p-5">
                {/* Baseline Badge */}
                <div className="mb-8 p-4 bg-white border-2 border-slate-100 rounded-[2rem] flex items-center justify-between shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                            <FiBriefcase />
                        </div>
                        <div>
                            <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest leading-none mb-1">Unit 5 Baseline</p>
                            <p className="text-xs font-bold text-slate-600 italic">Total Registered Teachers</p>
                        </div>
                    </div>
                    <div className="text-2xl font-black text-indigo-600">{actualTeachers.length}</div>
                </div>

                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Loading Roster...</p>
                    </div>
                ) : actualTeachers.length === 0 ? (
                    <div className="text-center py-20 px-8">
                        <div className="w-20 h-20 bg-slate-100 rounded-[2.5rem] mx-auto mb-6 flex items-center justify-center text-slate-300">
                            <FiUsers size={40} />
                        </div>
                        <h2 className="text-2xl font-black text-slate-400 mb-2">Empty Roster</h2>
                        <p className="text-slate-400 text-sm mb-10">Search the master directory to import your teachers and assign their workloads.</p>
                        <button onClick={() => setIsSearchOpen(true)} className="w-full py-4 bg-white border-4 border-dashed border-slate-200 text-slate-400 font-black rounded-3xl hover:border-blue-400 hover:text-blue-500 transition-all">
                            + Import First Teacher
                        </button>
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="flex flex-col gap-4 mb-6">
                            <div className="flex items-center justify-between px-2">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">Active Roster • {filteredTeachers.length} Found</span>
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">{isOverLimit ? '⚠️ Limit Check' : '✅ Healthy Load'}</span>
                            </div>

                            {/* Local Roster Search */}
                            <div className="relative group">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-blue-500 transition-colors" />
                                <input 
                                    type="text"
                                    placeholder="Search your roster..."
                                    value={rosterSearch}
                                    onChange={(e) => setRosterSearch(e.target.value)}
                                    className="w-full pl-12 pr-4 py-3 bg-white border border-slate-100 rounded-2xl text-sm font-bold placeholder:text-slate-300 focus:outline-none focus:border-blue-500 transition-all shadow-sm"
                                />
                                {rosterSearch && (
                                    <button onClick={() => setRosterSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                                        <FiX size={14} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {currentTeachers.map(t => <TeacherCard key={t.id} teacher={t} />)}

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2 mt-8 pb-4">
                                <button 
                                    onClick={() => setCurrentPage(1)}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                                    title="First Page"
                                >
                                    <FiChevronsLeft size={20} />
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                                >
                                    <FiChevronLeft size={20} />
                                </button>
                                
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-50 rounded-2xl">
                                    <span className="text-sm font-black text-slate-700">{currentPage}</span>
                                    <span className="text-sm font-bold text-slate-300">/</span>
                                    <span className="text-sm font-bold text-slate-400">{totalPages}</span>
                                </div>
                                
                                <button 
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                                >
                                    <FiChevronRight size={20} />
                                </button>
                                <button 
                                    onClick={() => setCurrentPage(totalPages)}
                                    disabled={currentPage === totalPages}
                                    className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 disabled:opacity-30 disabled:grayscale transition-all shadow-sm"
                                    title="Last Page"
                                >
                                    <FiChevronsRight size={20} />
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* ── Add New Teacher Modal ── */}
            <AnimatePresence>
                {isSearchOpen && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-900/40 backdrop-blur-sm flex items-end justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }} className="bg-white w-full max-w-md rounded-t-[3rem] p-8 pb-12 shadow-2xl relative">
                            <button onClick={() => setIsSearchOpen(false)} className="absolute top-6 right-6 p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                <FiX size={24} />
                            </button>
                            
                            <h2 className="text-3xl font-black text-slate-800 mb-2 uppercase tracking-tighter">Add Personnel</h2>
                            <p className="text-slate-400 text-sm font-medium mb-8 italic">Add newly hired or existing teacher to your school roster.</p>
                            
                            <div className="space-y-6">
                                <div>
                                    <label className={labelStyle}>First Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter first name" 
                                        value={newTeacherFirst}
                                        onChange={(e) => setNewTeacherFirst(e.target.value)}
                                        className={inputStyle}
                                        autoFocus
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Last Name</label>
                                    <input 
                                        type="text" 
                                        placeholder="Enter last name" 
                                        value={newTeacherLast}
                                        onChange={(e) => setNewTeacherLast(e.target.value)}
                                        className={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label className={labelStyle}>Position</label>
                                    <select 
                                        value={newTeacherPosition}
                                        onChange={(e) => setNewTeacherPosition(e.target.value)}
                                        className={inputStyle}
                                    >
                                        <option value="Teacher I">Teacher I</option>
                                        <option value="Teacher II">Teacher II</option>
                                        <option value="Teacher III">Teacher III</option>
                                        <option value="Master Teacher I">Master Teacher I</option>
                                        <option value="Master Teacher II">Master Teacher II</option>
                                        <option value="SPET I">SPET I</option>
                                        <option value="Head Teacher I">Head Teacher I</option>
                                        <option value="Administrative Assistant">Administrative Assistant</option>
                                        <option value="Others">Others</option>
                                    </select>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className={labelStyle}>Advisorship</label>
                                        <select 
                                            value={newTeacherRole}
                                            onChange={(e) => setNewTeacherRole(e.target.value)}
                                            className={inputStyle}
                                        >
                                            <option value="Non-Advisory">Non-Advisory</option>
                                            <option value="Advisory">Advisory</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className={labelStyle}>Sex</label>
                                        <select className={inputStyle} defaultValue="Male">
                                            <option value="Male">Male</option>
                                            <option value="Female">Female</option>
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className={labelStyle}>Designations</label>
                                    <div className="flex flex-wrap gap-2">
                                        {DESIGNATION_OPTIONS.map(opt => {
                                            const isSelected = newTeacherDesignations.includes(opt);
                                            return (
                                                <button 
                                                    key={opt}
                                                    onClick={() => setNewTeacherDesignations(prev => 
                                                        isSelected ? prev.filter(p => p !== opt) : [...prev, opt]
                                                    )}
                                                    className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-tight transition-all border-2 ${
                                                        isSelected 
                                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                                                            : 'bg-white border-slate-100 text-slate-400 hover:border-blue-200'
                                                    }`}
                                                >
                                                    {opt}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>

                                <button 
                                    onClick={handleManualAdd}
                                    className="w-full py-4 bg-blue-600 text-white font-black rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95 mt-4"
                                >
                                    Add to Roster
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── Edit Profile & Workload Modal ── */}
            <AnimatePresence>
                {isEditOpen && activeTeacher && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[60] bg-slate-900/60 backdrop-blur-md flex items-end justify-center">
                        <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} className="bg-white w-full max-w-lg h-[90vh] rounded-t-[3rem] overflow-hidden flex flex-col shadow-2xl">
                            <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-white shrink-0">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Teacher Profile</h2>
                                    <p className="text-xs font-black text-blue-500 uppercase tracking-widest opacity-60">ID: {activeTeacher.id}</p>
                                </div>
                                <button onClick={() => setIsEditOpen(false)} className="p-2 text-slate-300 hover:text-slate-600 transition-colors">
                                    <FiX size={28} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-10 custom-scrollbar pb-32">
                                {/* Demographics Section */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Demographics</h3>
                                    </div>
                                    <div className="grid gap-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelStyle}>First Name</label>
                                                <input type="text" value={activeTeacher.first_name || ""} onChange={(e) => setActiveTeacher(p => ({ ...p, first_name: e.target.value }))} className={inputStyle} />
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Last Name</label>
                                                <input type="text" value={activeTeacher.last_name || ""} onChange={(e) => setActiveTeacher(p => ({ ...p, last_name: e.target.value }))} className={inputStyle} />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelStyle}>Sex</label>
                                                <select value={activeTeacher.sex || ""} onChange={(e) => setActiveTeacher(p => ({ ...p, sex: e.target.value }))} className={inputStyle}>
                                                    <option value="">Select Sex</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Funding Source</label>
                                                <select value={activeTeacher.funding_source || ""} onChange={(e) => setActiveTeacher(p => ({ ...p, funding_source: e.target.value }))} className={inputStyle}>
                                                    <option value="DepEd Nationally Funded">DepEd Nationally Funded</option>
                                                    <option value="LGU Funded">LGU Funded</option>
                                                    <option value="Others/Private">Others/Private</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className={labelStyle}>Experience (Years)</label>
                                                <select value={activeTeacher.experience_bracket || ""} onChange={(e) => setActiveTeacher(p => ({ ...p, experience_bracket: e.target.value }))} className={inputStyle}>
                                                    <option value="">Select Experience</option>
                                                    <option value="0-1">0-1</option>
                                                    <option value="2-5">2-5</option>
                                                    <option value="6-10">6-10</option>
                                                    <option value="11-15">11-15</option>
                                                    <option value="16-20">16-20</option>
                                                    <option value="21-25">21-25</option>
                                                    <option value="26-30">26-30</option>
                                                    <option value="31-35">31-35</option>
                                                    <option value="36-40">36-40</option>
                                                    <option value="41+">41+</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className={labelStyle}>Advisorship</label>
                                                <select value={activeTeacher.role_designation || ""} onChange={(e) => setActiveTeacher(p => ({ ...p, role_designation: e.target.value }))} className={inputStyle}>
                                                    <option value="Non-Advisory">Non-Advisory</option>
                                                    <option value="Advisory">Advisory</option>
                                                </select>
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Designations</label>
                                            <div className="grid grid-cols-1 gap-2 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                {DESIGNATION_OPTIONS.map(opt => {
                                                    const isSelected = (activeTeacher.designationList || []).includes(opt);
                                                    return (
                                                        <label key={opt} className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-100 cursor-pointer hover:bg-blue-50 transition-colors">
                                                            <span className="text-xs font-bold text-slate-600 uppercase">{opt}</span>
                                                            <input 
                                                                type="checkbox" 
                                                                checked={isSelected}
                                                                onChange={() => {
                                                                    const current = activeTeacher.designationList || [];
                                                                    const next = isSelected 
                                                                        ? current.filter(c => c !== opt)
                                                                        : [...current, opt];
                                                                    setActiveTeacher(p => ({ ...p, designationList: next }));
                                                                }}
                                                                className="w-5 h-5 rounded-lg border-2 border-slate-200 text-blue-500 focus:ring-blue-500"
                                                            />
                                                        </label>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        <div>
                                            <label className={labelStyle}>Specialization (Major)</label>
                                            <div className="space-y-3">
                                                <select 
                                                    value={isOtherSpec ? "Other" : (activeTeacher.specialization || "")} 
                                                    onChange={(e) => {
                                                        const val = e.target.value;
                                                        if (val === "Other") {
                                                            setIsOtherSpec(true);
                                                            setActiveTeacher(p => ({ ...p, specialization: "" }));
                                                        } else {
                                                            setIsOtherSpec(false);
                                                            setActiveTeacher(p => ({ ...p, specialization: val }));
                                                        }
                                                    }} 
                                                    className={inputStyle}
                                                >
                                                    <option value="">Select Specialization</option>
                                                    {specializationOptions.map(spec => (
                                                        <option key={spec} value={spec}>{spec}</option>
                                                    ))}
                                                    <option value="Other">Others (Please specify)</option>
                                                </select>

                                                {isOtherSpec && (
                                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
                                                        <input 
                                                            type="text" 
                                                            placeholder="Enter your specialization..." 
                                                            value={activeTeacher.specialization || ""} 
                                                            onChange={(e) => setActiveTeacher(p => ({ ...p, specialization: e.target.value }))} 
                                                            className={inputStyle}
                                                            autoFocus
                                                        />
                                                    </motion.div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Daily Teaching Load Tracking (Active) */}
                                <section>
                                    <div className="flex items-center gap-2 mb-6">
                                        <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Daily Teaching Load</h3>
                                    </div>

                                    <div className="space-y-6">
                                        {/* Mon-Fri Inputs */}
                                        <div className="grid gap-4">
                                            {['monday', 'tuesday', 'wednesday', 'thursday', 'friday'].map(day => (
                                                <div key={day} className="flex items-center gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                                                    <div className="w-24 text-[10px] font-black uppercase text-slate-500">{day}</div>
                                                    <div className="flex-1 grid grid-cols-2 gap-3">
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                placeholder="Hrs" 
                                                                value={activeTeacher[`${day}_hrs`] ?? ""}
                                                                onChange={(e) => setActiveTeacher(p => ({ ...p, [`${day}_hrs`]: e.target.value }))}
                                                                className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all text-sm font-bold" 
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-[10px] font-black text-slate-300 uppercase">H</span>
                                                        </div>
                                                        <div className="relative">
                                                            <input 
                                                                type="number" 
                                                                min="0" 
                                                                max="59"
                                                                placeholder="Min" 
                                                                value={activeTeacher[`${day}_mins_remain`] ?? ""}
                                                                onChange={(e) => setActiveTeacher(p => ({ ...p, [`${day}_mins_remain`]: e.target.value }))}
                                                                className="w-full pl-3 pr-8 py-2 bg-white rounded-xl border-2 border-slate-100 focus:border-blue-500 transition-all text-sm font-bold" 
                                                            />
                                                            <span className="absolute right-3 top-2.5 text-[10px] font-black text-slate-300 uppercase">M</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Auto-Calculated Summary */}
                                        {(() => {
                                            const mondayMins = (parseInt(activeTeacher.monday_hrs) || 0) * 60 + (parseInt(activeTeacher.monday_mins_remain) || 0);
                                            const tuesdayMins = (parseInt(activeTeacher.tuesday_hrs) || 0) * 60 + (parseInt(activeTeacher.tuesday_mins_remain) || 0);
                                            const wednesdayMins = (parseInt(activeTeacher.wednesday_hrs) || 0) * 60 + (parseInt(activeTeacher.wednesday_mins_remain) || 0);
                                            const thursdayMins = (parseInt(activeTeacher.thursday_hrs) || 0) * 60 + (parseInt(activeTeacher.thursday_mins_remain) || 0);
                                            const fridayMins = (parseInt(activeTeacher.friday_hrs) || 0) * 60 + (parseInt(activeTeacher.friday_mins_remain) || 0);
                                            
                                            const weeklyTotalMins = mondayMins + tuesdayMins + wednesdayMins + thursdayMins + fridayMins;
                                            const dailyAverageMins = weeklyTotalMins / 5;
                                            const isOver = dailyAverageMins > 360; // 6 hours

                                            return (
                                                <div className="space-y-4">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div className={`p-6 rounded-3xl border-2 transition-colors ${isOver ? 'bg-orange-50 border-orange-100' : 'bg-green-50 border-green-100'}`}>
                                                            <div className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isOver ? 'text-orange-400' : 'text-green-400'}`}>Average Teaching Load</div>
                                                            <div className={`text-2xl font-black ${isOver ? 'text-orange-600' : 'text-green-600'}`}>
                                                                {Math.floor(dailyAverageMins / 60)}h {Math.floor(dailyAverageMins % 60)}m
                                                            </div>
                                                        </div>
                                                        <div className="bg-blue-50 p-6 rounded-3xl border-2 border-blue-100 opacity-80">
                                                            <div className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Cumulative Weekly Load</div>
                                                            <div className="text-2xl font-black text-blue-600">
                                                                {Math.floor(weeklyTotalMins / 60)}h {weeklyTotalMins % 60}m
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {isOver && (
                                                        <motion.div 
                                                            initial={{ opacity: 0, scale: 0.95 }}
                                                            animate={{ opacity: 1, scale: 1 }}
                                                            className="p-4 bg-orange-100 border-2 border-orange-200 rounded-2xl flex items-center gap-3 text-orange-700"
                                                        >
                                                            <FiAlertTriangle className="shrink-0" size={20} />
                                                            <p className="text-[10px] font-black uppercase tracking-tight">Warning: Exceeds 6-hour daily teaching limit.</p>
                                                        </motion.div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </section>

                                {/* Legacy Column: MATATAG Subject Workloads (Commented Out) */}
                                {/* 
                                <section>
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-2">
                                            <div className="w-1 h-4 bg-orange-500 rounded-full" />
                                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">MATATAG Workloads</h3>
                                        </div>
                                        <button onClick={addWorkload} className="flex items-center gap-2 text-xs font-black text-blue-600 uppercase tracking-widest px-4 py-2 bg-blue-50 rounded-xl hover:bg-blue-100 transition-all">
                                            <FiPlus size={14} /> Add Load
                                        </button>
                                    </div>

                                    {isOverLimit && (
                                        <div className="mb-6 p-4 bg-orange-50 border-2 border-orange-100 rounded-2xl flex items-center gap-4 text-orange-700 animate-pulse">
                                            <FiAlertTriangle size={24} />
                                            <div>
                                                <p className="text-xs font-black uppercase">Standard Limit Exceeded</p>
                                                <p className="text-[10px] font-bold opacity-80 italic">Current load is {totalWorkloadMins} mins. Standard MATATAG limit is 360 mins (6 hrs).</p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="space-y-4">
                                        {activeTeacher.workloads.map((w, i) => (
                                            <div key={i} className="p-6 bg-slate-50 rounded-3xl border-2 border-slate-100 relative group">
                                                <button onClick={() => removeWorkload(i)} className="absolute top-4 right-4 text-slate-300 hover:text-rose-500 opacity-0 group-hover:opacity-100 transition-all">
                                                    <FiTrash2 size={16} />
                                                </button>
                                                <div className="grid gap-6">
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                        <div>
                                                            <label className={labelStyle}>Grade Level</label>
                                                            <select value={w.grade_level} onChange={(e) => updateWorkload(i, 'grade_level', e.target.value)} className={inputStyle}>
                                                                {GRADE_LEVELS.map(g => <option key={g} value={g}>{g}</option>)}
                                                            </select>
                                                        </div>

                                                        {["Grade 11", "Grade 12"].includes(w.grade_level) && (
                                                            <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                                                                <label className={labelStyle}>Category</label>
                                                                <select value={w.category || ""} onChange={(e) => updateWorkload(i, 'category', e.target.value)} className={inputStyle}>
                                                                    <option value="">Select Category</option>
                                                                    <option value="Core">Core Subjects</option>
                                                                    <option value="Applied">Applied Subjects</option>
                                                                    <option value="Specialized">Specialized Subjects</option>
                                                                </select>
                                                            </motion.div>
                                                        )}

                                                        <div>
                                                            <label className={labelStyle}>Subject Name</label>
                                                            <select 
                                                                value={w.subject_name || ""} 
                                                                onChange={(e) => updateWorkload(i, 'subject_name', e.target.value)} 
                                                                className={inputStyle}
                                                                disabled={["Grade 11", "Grade 12"].includes(w.grade_level) && !w.category}
                                                            >
                                                                <option value="">Select Subject</option>
                                                                {getFilteredSubjects(w.grade_level, w.category).map(s => (
                                                                    <option key={s.id} value={s.subject_name}>{s.subject_name}</option>
                                                                ))}
                                                            </select>
                                                        </div>

                                                        <div className="lg:col-span-3 grid grid-cols-2 gap-4">
                                                            <div>
                                                                <label className={labelStyle}>Duration (Hours)</label>
                                                                <input type="number" min="0" value={w.hours || 0} onChange={(e) => updateWorkload(i, 'hours', e.target.value)} className={inputStyle} />
                                                            </div>
                                                            <div>
                                                                <label className={labelStyle}>Duration (Minutes)</label>
                                                                <input type="number" min="0" max="59" value={w.minutes || 0} onChange={(e) => updateWorkload(i, 'minutes', e.target.value)} className={inputStyle} />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {activeTeacher.workloads.length === 0 && (
                                            <div className="p-10 border-4 border-dashed border-slate-100 rounded-[2.5rem] text-center text-slate-300 font-bold italic">
                                                No workloads assigned yet.
                                            </div>
                                        )}
                                    </div>
                                </section>
                                */}
                            </div>

                            <div className="p-8 border-t border-slate-100 bg-white shadow-[0_-10px_30px_rgba(0,0,0,0.03)] flex gap-4 shrink-0">
                                 <button onClick={handleSaveTeacher} className="w-full py-5 bg-blue-600 text-white font-black rounded-3xl shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                                     Update Profile & Workload
                                 </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Finalize Button */}
            {/* Finalize Button */}
            {!isReadOnly && (
                <footer className="fixed bottom-0 left-0 w-full p-6 pb-10 bg-white/80 backdrop-blur-md border-t border-slate-100 flex justify-center z-30 pointer-events-none">
                    <div className="w-full max-w-sm flex gap-3 pointer-events-auto">
                        <button onClick={() => setShowDraftModal(true)} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-900 active:scale-95 transition-all outline-none">
                            <FiSave className="w-6 h-6" />
                        </button>
                        <button 
                            onClick={handleFinalize}
                            disabled={actualTeachers.length === 0 || isFinalizing}
                            className="flex-1 py-5 bg-slate-900 text-white font-black rounded-3xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-black active:scale-95 disabled:opacity-50 disabled:grayscale"
                        >
                            {isFinalizing ? (
                                <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <>Finalize & Submit Unit 6 {actualTeachers.length > 0 && `(${actualTeachers.length})`} <FiChevronRight size={20} /></>
                            )}
                        </button>
                    </div>
                </footer>
            )}

            <AnimatePresence>
                {showDraftModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end justify-center pointer-events-auto">
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

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
            `}</style>
        </motion.div>
    );
};

export default TeachingPersonnelUnit;
