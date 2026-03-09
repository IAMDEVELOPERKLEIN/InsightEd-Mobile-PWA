import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom'; // Added for navigation
import { 
    FiUsers, FiUserPlus, FiTrash2, FiEdit2, FiChevronRight, 
    FiChevronLeft, FiPlus, FiSave, FiCheckCircle, FiArrowLeft, FiUnlock
} from 'react-icons/fi';

const Unit8PersonnelRegistry = ({ onSave, initialData, isReviewMode }) => {
    const storedId = localStorage.getItem('schoolId');
    const [personnelList, setPersonnelList] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate(); // Initialize useNavigate

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [wizardStep, setWizardStep] = useState(1);
    const [isSaving, setIsSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    // Form State for new personnel
    const initialFormState = {
        control_num: '',
        tin: '',
        first_name: '',
        middle_name: '',
        last_name: '',
        position: '',
        position_group: 'Teaching',
        corrected_degree: '',
        workload_hrs: '',
        workload_mins: ''
    };
    const [formData, setFormData] = useState(initialFormState);

    // ── Fetch Data ────────────────────────────────────────────────────────────
    const [internalReviewMode, setInternalReviewMode] = useState(isReviewMode || false);

    useEffect(() => {
        const fetchPersonnel = async () => {
            if (!storedId) return;
            try {
                // Fetch personnel list
                const res = await fetch(`/api/personnel/${storedId}`);
                const result = await res.json();
                if (result.success && result.data) {
                    setPersonnelList(result.data);
                }

                // Check unit 8 completed status
                const schoolRes = await fetch(`/api/ph_schools/${storedId}`);
                if (schoolRes.ok) {
                    const saved = await schoolRes.json();
                    if (saved.exists && saved.data && saved.data.unit8_completed) {
                        setInternalReviewMode(true);
                    }
                }
            } catch (err) {
                console.error("Error fetching personnel:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchPersonnel();
    }, [storedId]);

    // ── Handlers ──────────────────────────────────────────────────────────────
    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleNextStep = () => {
        if (wizardStep < 3) setWizardStep(prev => prev + 1);
    };

    const handlePrevStep = () => {
        if (wizardStep > 1) setWizardStep(prev => prev - 1);
    };

    const handleEdit = (p) => {
        setEditingId(p.id);
        setFormData({
            control_num: p.control_num || '',
            tin: p.tin || '',
            first_name: p.first_name || '',
            middle_name: p.middle_name || '',
            last_name: p.last_name || '',
            position: p.position || '',
            position_group: p.position_group || 'Teaching',
            corrected_degree: p.corrected_degree || '',
            workload_hrs: p.instructional_hrs || '',
            workload_mins: p.instructional_mins || ''
        });
        setWizardStep(1);
        setShowModal(true);
    };

    const handleSavePersonnel = async () => {
        if (!storedId) return alert("School ID missing.");
        setIsSaving(true);
        try {
            const url = editingId ? `/api/personnel/${editingId}` : '/api/personnel';
            const method = editingId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ schoolId: storedId, data: formData })
            });
            const result = await res.json();
            
            if (result.success) {
                if (editingId) {
                    setPersonnelList(prev => prev.map(p => p.id === editingId ? result.data : p));
                } else {
                    setPersonnelList(prev => [result.data, ...prev]);
                }
                setShowModal(false);
                setWizardStep(1);
                setFormData(initialFormState);
                setEditingId(null);
            } else {
                alert(result.error || "Failed to save personnel.");
            }
        } catch (err) {
            console.error(err);
            alert("Network error.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleInlineWorkloadChange = (id, field, value) => {
        setPersonnelList(prev => prev.map(p => {
            if (p.id === id) {
                return { ...p, [field]: value };
            }
            return p;
        }));
    };

    const handleInlineWorkloadBlur = async (p) => {
        try {
            await fetch(`/api/personnel/${p.id}/workload`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    workload_hrs: p.workload_hrs,
                    workload_mins: p.workload_mins
                })
            });
            // Don't need to await JSON, we optimistically updated state during onChange
        } catch (err) {
            console.error("Failed to update workload", err);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to remove this record?")) return;
        
        try {
            const res = await fetch(`/api/personnel/${id}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                setPersonnelList(prev => prev.filter(p => p.id !== id));
            } else {
                alert(result.error || "Failed to delete.");
            }
        } catch (err) {
            console.error("Delete error:", err);
            alert("Network error while deleting.");
        }
    };

    // ── Submit Global Unit ────────────────────────────────────────────────────
    const submitUnit = async () => {
        if (personnelList.length === 0) {
            alert("Please add at least one personnel record to complete this unit.");
            return;
        }
        
        try {
            const res = await fetch(`/api/ph_schools/unit8/${storedId}`, {
                method: 'POST'
            });
            const result = await res.json();
            if (result.success) {
                // Determine if global user progress needs update
                const progRes = await fetch(`/api/user/progress`);
                if (progRes.ok) {
                    const progData = await progRes.json();
                    if (progData.progress && (!progData.progress.completed_units || !progData.progress.completed_units.includes(8))) {
                        await fetch(`/api/user/progress`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ unitId: 8 })
                        });
                    }
                }
                
                setShowSuccessModal(true);
                if (onSave) onSave({});
            } else {
                alert("Failed to finalize registry.");
            }
        } catch (error) {
            console.error(error);
            alert("Network error.");
        }
    };

    // ── Computed Values ───────────────────────────────────────────────────────
    const totalStaff = personnelList.length;
    const teachingCount = personnelList.filter(p => p.position_group === 'Teaching').length;
    const nonTeachingCount = personnelList.filter(p => p.position_group === 'Non-Teaching').length;
    
    const totalWorkloadMins = personnelList.reduce((acc, p) => {
        const hr = parseInt(p.workload_hrs) || 0;
        const min = parseInt(p.workload_mins) || 0;
        return acc + (hr * 60) + min;
    }, 0);
    const avgWorkloadMins = totalStaff > 0 ? totalWorkloadMins / totalStaff : 0;
    const avgHrs = Math.floor(avgWorkloadMins / 60);
    const avgMins = Math.round(avgWorkloadMins % 60);

    // Pagination Calculations
    const totalPages = Math.ceil(totalStaff / ITEMS_PER_PAGE);
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const currentPersonnels = personnelList.slice(startIndex, endIndex);

    // Auto-adjust page if we delete the last item on a page
    useEffect(() => {
        if (currentPage > totalPages && totalPages > 0) {
            setCurrentPage(totalPages);
        }
    }, [personnelList.length, currentPage, totalPages]);

    // ── Styles & Components ───────────────────────────────────────────────────
    const chunkyInput = "w-full bg-white border-2 border-slate-200 rounded-2xl px-5 py-4 text-lg font-bold text-slate-700 outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder-slate-300 shadow-sm";
    
    // Animation Variants
    const slideVariants = {
        enter: { x: 50, opacity: 0 },
        center: { x: 0, opacity: 1 },
        exit: { x: -50, opacity: 0 }
    };
    const listVariants = {
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 }
    };

    if (loading) return <div className="p-8 text-center text-gray-500 font-bold animate-pulse">Loading Registry...</div>;

    // --- Modal Renderer ---
    const renderModalStep = () => {
        switch (wizardStep) {
            case 1:
                return (
                    <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
                         <h3 className="text-xl font-bold text-slate-800 mb-4">Identity Details</h3>
                         <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-2">Control Number</label>
                            <input name="control_num" value={formData.control_num} onChange={handleInputChange} className={chunkyInput} placeholder="e.g. 123456" />
                         </div>
                         <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-2">TIN</label>
                            <input name="tin" value={formData.tin} onChange={handleInputChange} className={chunkyInput} placeholder="000-000-000" />
                         </div>
                         <div className="grid grid-cols-2 gap-3">
                             <div className="col-span-2">
                                <label className="text-xs font-bold uppercase text-slate-500 ml-2">First Name</label>
                                <input name="first_name" value={formData.first_name} onChange={handleInputChange} className={chunkyInput} placeholder="Juan" />
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase text-slate-500 ml-2">Middle Name</label>
                                <input name="middle_name" value={formData.middle_name} onChange={handleInputChange} className={chunkyInput} placeholder="Dela" />
                             </div>
                             <div>
                                <label className="text-xs font-bold uppercase text-slate-500 ml-2">Last Name</label>
                                <input name="last_name" value={formData.last_name} onChange={handleInputChange} className={chunkyInput} placeholder="Cruz" />
                             </div>
                         </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-4">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">Professional Info</h3>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-2">Position Title</label>
                            <input name="position" value={formData.position} onChange={handleInputChange} className={chunkyInput} placeholder="e.g. Teacher I, Principal" />
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-2">Position Group</label>
                            <select name="position_group" value={formData.position_group} onChange={handleInputChange} className={chunkyInput}>
                                <option value="Teaching">Teaching</option>
                                <option value="Non-Teaching">Non-Teaching</option>
                                <option value="Teaching-Related">Teaching-Related</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold uppercase text-slate-500 ml-2">Corrected Degree</label>
                            <input name="corrected_degree" value={formData.corrected_degree} onChange={handleInputChange} className={chunkyInput} placeholder="e.g. BSEd Math" />
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" className="space-y-4 text-center">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <FiUserPlus className="text-blue-600 w-8 h-8" />
                        </div>
                        <h3 className="text-2xl font-black text-slate-800">Review & Save</h3>
                        <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-2 mb-6">
                             <p className="font-bold text-lg text-slate-700 border-b pb-2">{formData.last_name}, {formData.first_name} {formData.middle_name}</p>
                             <p className="text-sm"><span className="font-bold text-slate-500">Position:</span> {formData.position}</p>
                             <p className="text-sm"><span className="font-bold text-slate-500">Control No:</span> {formData.control_num || 'N/A'}</p>
                             <p className="text-sm"><span className="font-bold text-slate-500">TIN:</span> {formData.tin || 'N/A'}</p>
                        </div>
                        <p className="text-sm text-slate-400 font-medium">Click Save to add this personnel to the registry.</p>
                    </motion.div>
                );
            default: return null;
        }
    };

    // ══════════════════════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════════════════════
    if (internalReviewMode) {
        return (
            <div className="min-h-screen bg-slate-50/50 font-sans">
                {/* Exit Header */}
                <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                    <div className="max-w-md mx-auto flex items-center gap-3">
                        <button onClick={() => navigate('/modular-dashboard')} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                            <FiArrowLeft className="w-6 h-6" />
                        </button>
                        <div className="flex-1 text-center">
                            <div className="text-[10px] font-black tracking-widest text-indigo-400 uppercase">Unit 8</div>
                            <h1 className="text-sm font-black text-gray-800">Personnel Registry</h1>
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
                    <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-indigo-200">
                        Unit 8 • Personnel Roster
                    </span>
                    <h1 className="text-4xl font-black text-slate-800 leading-tight">Summary</h1>
                    <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                </div>

                {/* Metric Cards Grid */}
                <div className="grid grid-cols-2 gap-4 mb-10">
                    <div className="col-span-2 bg-indigo-600 rounded-[2rem] p-6 text-white shadow-2xl shadow-indigo-200 flex items-center justify-between overflow-hidden relative">
                        <div className="relative z-10">
                            <p className="text-indigo-200 text-xs font-black uppercase tracking-widest mb-1">Total Staff</p>
                            <h2 className="text-5xl font-black leading-none">{totalStaff}</h2>
                        </div>
                        <div className="text-6xl opacity-20 relative z-10">👥</div>
                        <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
                    </div>

                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                            👨‍🏫
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Teaching</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{teachingCount}</span>
                    </div>
                    <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                            🏢
                        </div>
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Non-Teach</span>
                        <span className="text-3xl font-black text-slate-800 mt-1">{nonTeachingCount}</span>
                    </div>
                </div>

                {/* Subsections */}
                <div className="space-y-6">
                    <section>
                        <div className="flex items-center gap-2 mb-4 ml-2">
                            <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                            <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Workload Stats</h3>
                        </div>
                        <div className="bg-white border-2 border-slate-100 rounded-3xl p-5 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl">⚖️</span>
                                    <span className="font-black text-slate-700 text-sm">Average Load</span>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Overall Setup</span>
                                </div>
                                <div className="flex flex-col items-end">
                                    <span className="text-2xl font-black text-slate-800">{avgHrs}h {avgMins}m</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Note about list */}
                    <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 text-center text-xs font-medium text-indigo-700 shadow-sm">
                        The full personnel directory is securely saved. Unlock the registry to make individual additions or modifications.
                    </div>
                </div>

                {/* Unlock Action */}
                <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-12"
                >
                    <button 
                        onClick={() => { setInternalReviewMode(false); }}
                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                            <FiUnlock className="w-5 h-5 text-indigo-700" />
                        </div>
                        <span>Unlock to Edit Registry</span>
                    </button>
                    <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                        Note: Unlocking is needed to add or edit personnel.
                    </p>
                </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col font-sans mb-24 pb-20">
            {/* Header / Counters */}
            <div className="bg-white px-6 py-8 rounded-b-[40px] shadow-sm border-b border-slate-100 sticky top-0 z-10">
                <div className="flex items-start justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/modular-dashboard')}
                            className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all active:scale-95"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                        <div>
                            <h1 className="text-2xl font-black text-slate-800 tracking-tight">Personnel Registry</h1>
                            <p className="text-sm font-medium text-slate-400">Manage individual staff records.</p>
                        </div>
                    </div>
                    
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center shadow-inner">
                        <FiUsers className="w-6 h-6 text-indigo-600" />
                    </div>
                </div>

                {/* Dashboard Stats */}
                <div className="grid grid-cols-4 gap-3">
                    <div className="bg-slate-100 rounded-2xl p-3 flex flex-col items-center justify-center border border-slate-200">
                        <span className="text-xl font-black text-slate-700">{totalStaff}</span>
                        <span className="text-[9px] font-bold uppercase text-slate-500 tracking-wider">Total</span>
                    </div>
                    <div className="bg-indigo-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-indigo-100">
                        <span className="text-xl font-black text-indigo-700">{teachingCount}</span>
                        <span className="text-[9px] font-bold uppercase text-indigo-500 tracking-wider text-center leading-tight">Teaching</span>
                    </div>
                    <div className="bg-emerald-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-emerald-100">
                        <span className="text-xl font-black text-emerald-700">{nonTeachingCount}</span>
                        <span className="text-[9px] font-bold uppercase text-emerald-600 tracking-wider text-center leading-tight">Non-Teach</span>
                    </div>
                    <div className="bg-amber-50 rounded-2xl p-3 flex flex-col items-center justify-center border border-amber-100">
                        <span className="text-xl font-black text-amber-700">{avgHrs}h {avgMins}m</span>
                        <span className="text-[9px] font-bold uppercase text-amber-600 tracking-wider text-center leading-tight">Avg Load</span>
                    </div>
                </div>
            </div>

            {/* List Area */}
            <div className="flex-1 px-4 py-6">
                <AnimatePresence>
                    {personnelList.length === 0 ? (
                        <motion.div initial={{opacity:0}} animate={{opacity:1}} className="text-center py-12">
                            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <FiUsers className="text-slate-300 w-8 h-8" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-600">No Personnel Added</h3>
                            <p className="text-sm text-slate-400 mt-1">Tap the button below to add your first staff member.</p>
                        </motion.div>
                    ) : (
                        <div className="space-y-3">
                            {currentPersonnels.map((p) => (
                                <motion.div 
                                    key={p.id} 
                                    variants={listVariants} 
                                    initial="hidden" 
                                    animate="visible" 
                                    exit="hidden"
                                    layout
                                    className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 flex items-center justify-between"
                                >
                                    <div className="flex-1 min-w-0 pr-4">
                                        <h4 className="font-bold text-slate-800 text-lg truncate">
                                            {p.last_name}, {p.first_name} {p.middle_name?.charAt(0)}.
                                        </h4>
                                        <div className="flex flex-wrap items-center gap-2 mt-1">
                                            <span className="text-xs font-semibold bg-indigo-50 text-indigo-600 px-2 py-1 rounded-md">
                                                {p.position}
                                            </span>
                                            {p.tin && <span className="text-xs font-medium text-slate-400 truncate">TIN: {p.tin}</span>}
                                        </div>
                                    </div>
                                    {!isReviewMode && (
                                    <div className="flex flex-col items-end gap-3 shrink-0">
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => handleEdit(p)}
                                                className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500 active:scale-95 transition-transform"
                                            >
                                                <FiEdit2 className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => handleDelete(p.id)}
                                                className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center text-red-500 active:scale-95 transition-transform"
                                            >
                                                <FiTrash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                        {/* Inline Workload Input */}
                                        <div className="bg-indigo-50/80 p-1.5 rounded-xl border border-indigo-100 flex items-center gap-1 shadow-sm">
                                            <span className="text-[9px] font-bold uppercase text-indigo-400 ml-1">Workload</span>
                                            <input 
                                                type="number" 
                                                min="0"
                                                value={p.workload_hrs || ''} 
                                                onChange={(e) => handleInlineWorkloadChange(p.id, 'workload_hrs', e.target.value)}
                                                onBlur={() => handleInlineWorkloadBlur(p)}
                                                className="w-10 h-7 bg-white rounded-lg border-none text-center text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-300 outline-none" 
                                                placeholder="0h"
                                            />
                                            <span className="text-indigo-300 font-black">:</span>
                                            <input 
                                                type="number" 
                                                min="0" max="59"
                                                value={p.workload_mins || ''} 
                                                onChange={(e) => handleInlineWorkloadChange(p.id, 'workload_mins', e.target.value)}
                                                onBlur={() => handleInlineWorkloadBlur(p)}
                                                className="w-10 h-7 bg-white rounded-lg border-none text-center text-xs font-bold text-indigo-700 focus:ring-2 focus:ring-indigo-300 outline-none" 
                                                placeholder="0m"
                                            />
                                        </div>
                                    </div>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    )}
                </AnimatePresence>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                    <div className="flex justify-between items-center mt-6 mb-2">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors ${currentPage === 1 ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-indigo-600 shadow-sm border border-slate-200 active:bg-slate-50'}`}
                        >
                            <FiChevronLeft className="w-5 h-5"/> Prev
                        </button>
                        <span className="text-sm font-bold text-slate-500">Page {currentPage} of {totalPages}</span>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className={`px-4 py-2 rounded-xl font-bold flex items-center gap-1 transition-colors ${currentPage === totalPages ? 'bg-slate-100 text-slate-400 cursor-not-allowed' : 'bg-white text-indigo-600 shadow-sm border border-slate-200 active:bg-slate-50'}`}
                        >
                            Next <FiChevronRight className="w-5 h-5"/>
                        </button>
                    </div>
                )}
            </div>

            {/* Add Button & Save Unit Footer */}
             {!isReviewMode && (
                <div className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-slate-200 p-4 pb-8 flex flex-col gap-3 z-20">
                     <button
                        onClick={() => { setEditingId(null); setFormData(initialFormState); setWizardStep(1); setShowModal(true); }}
                        className="w-full bg-white border-2 border-slate-200 text-slate-700 font-black py-4 rounded-2xl shadow-sm active:bg-slate-50 transition-colors flex justify-center items-center gap-2"
                    >
                        <FiUserPlus className="w-5 h-5"/> Add Personnel
                    </button>
                    <button
                        onClick={submitUnit}
                        disabled={personnelList.length === 0}
                        className={`w-full py-4 rounded-2xl font-black text-lg transition-all flex justify-center gap-2 items-center text-white shadow-xl ${
                            personnelList.length > 0 
                                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 shadow-emerald-500/30 hover:shadow-emerald-500/50' 
                                : 'bg-slate-300 opacity-50 cursor-not-allowed'
                        }`}
                    >
                        {personnelList.length > 0 ? <><FiCheckCircle className="w-6 h-6"/> Finalize Personnel List</> : 'Add Personnel to Continue'}
                    </button>
                </div>
            )}


            {/* ── ADD WIZARD MODAL ── */}
            <AnimatePresence>
                {showModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
                            className="bg-white w-full max-w-md rounded-t-[40px] sm:rounded-[40px] p-6 pb-10 shadow-2xl relative max-h-[90vh] flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-center mb-6">
                                <h2 className="text-xl font-black text-slate-800">{editingId ? 'Edit Staff Details' : 'Add New Staff'}</h2>
                                <button onClick={() => setShowModal(false)} className="w-8 h-8 bg-slate-100 rounded-full flex items-center justify-center text-slate-500 font-bold active:scale-90 transition-transform">X</button>
                            </div>

                            {/* Progress Bar */}
                            <div className="flex gap-2 mb-6">
                                {[1,2,3].map(step => (
                                    <div key={step} className={`h-2 flex-1 rounded-full transition-colors ${step <= wizardStep ? 'bg-indigo-500' : 'bg-slate-100'}`} />
                                ))}
                            </div>

                            {/* Modal Body */}
                            <div className="flex-1 overflow-y-auto overflow-x-hidden p-1 pb-4">
                                <AnimatePresence mode="wait">
                                    {renderModalStep()}
                                </AnimatePresence>
                            </div>

                            {/* Modal Navigation */}
                            <div className="flex gap-3 mt-4 pt-4 border-t border-slate-100">
                                {wizardStep > 1 && (
                                    <button onClick={handlePrevStep} className="px-6 py-4 rounded-2xl font-bold bg-slate-100 text-slate-600 active:bg-slate-200 transition-colors">
                                        Back
                                    </button>
                                )}
                                
                                {wizardStep < 4 ? (
                                    <button onClick={handleNextStep} className="flex-1 py-4 rounded-2xl font-black bg-indigo-600 text-white shadow-lg active:scale-95 transition-all flex justify-center items-center gap-2">
                                        Next <FiChevronRight />
                                    </button>
                                ) : (
                                    <button onClick={handleSavePersonnel} disabled={isSaving} className="flex-1 py-4 rounded-2xl font-black bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 active:scale-95 transition-all flex justify-center items-center gap-2">
                                        {isSaving ? 'Saving...' : <><FiCheckCircle /> Save Personnel</>}
                                    </button>
                                )}
                            </div>

                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ── SUCCESS MODAL ── */}
            <AnimatePresence>
                {showSuccessModal && (
                    <motion.div 
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
                    >
                        <motion.div 
                            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-white rounded-[40px] p-8 max-w-sm w-full shadow-2xl text-center flex flex-col items-center"
                        >
                            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
                                <FiCheckCircle className="w-10 h-10 text-emerald-500" />
                            </div>
                            <h2 className="text-2xl font-black text-slate-800 mb-2">Registry Finalized!</h2>
                            <p className="text-slate-500 text-center mb-8">
                                You have successfully finalized the Unit 8 Personnel Registry for this school.
                            </p>
                            <button 
                                onClick={() => {
                                    setShowSuccessModal(false);
                                    navigate('/modular-dashboard');
                                }}
                                className="w-full py-4 rounded-2xl font-black bg-emerald-500 text-white shadow-lg active:scale-95 transition-transform"
                            >
                                Return to Dashboard
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

        </div>
    );
};

export default Unit8PersonnelRegistry;
