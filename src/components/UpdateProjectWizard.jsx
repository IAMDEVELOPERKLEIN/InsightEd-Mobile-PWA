import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiCamera, FiImage, FiX, FiCheck, FiChevronRight } from 'react-icons/fi';

const ProcurementStatus = {
    NotYetProcured: "Not Yet Procured",
    UnderProcurement: "Under Procurement",
    ProcurementComplete: "Procurement Complete",
};

const ConstructionStatus = {
    NotYetStarted: "Not Yet Started",
    Ongoing: "Ongoing",
    ForFinalInspection: "For Final Inspection",
    Completed: "Completed",
};

const PROCUREMENT_OPTIONS = [
    { value: ProcurementStatus.NotYetProcured, label: "Not Yet Procured", color: "slate", icon: "📄" },
    { value: ProcurementStatus.UnderProcurement, label: "Under Procurement", color: "amber", icon: "📊" },
    { value: ProcurementStatus.ProcurementComplete, label: "Procurement Complete", color: "emerald", icon: "✅" },
];

const CONSTRUCTION_OPTIONS = [
    { value: ConstructionStatus.NotYetStarted, label: "Not Yet Started", color: "slate", icon: "⏸️" },
    { value: ConstructionStatus.Ongoing, label: "Ongoing", color: "blue", icon: "🔧" },
    { value: ConstructionStatus.ForFinalInspection, label: "For Final Inspection", color: "purple", icon: "🔍" },
    { value: ConstructionStatus.Completed, label: "Completed", color: "emerald", icon: "✅" },
];

const colorMap = {
    slate: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700" },
};

const STEPS = [
    { id: 1, label: "Photos", icon: "📸" },
    { id: 2, label: "Status", icon: "📊" },
    { id: 3, label: "Confirm", icon: "✅" },
];

const PHOTO_DESCRIPTIONS = {
    Internal: {
        emoji: "🏗️",
        label: "Internal Photos",
        color: "blue",
        guidelines: [
            "Classrooms: Longest wall, lighting, electrical outlets",
            "Camera at 1.4–1.6m height, facing the longest wall",
        ],
    },
    External: {
        emoji: "🌳",
        label: "External Photos",
        color: "emerald",
        guidelines: [
            "Front, Left, Right, Rear (wide shots required)",
            "Orthographic view at 20–30m height (optional)",
        ],
    },
};

const UpdateProjectWizard = ({ project, isOpen, onClose, onSave, isUploading }) => {
    const [step, setStep] = useState(1);
    const [internalFiles, setInternalFiles] = useState([]);
    const [internalPreviews, setInternalPreviews] = useState([]);
    const [externalFiles, setExternalFiles] = useState([]);
    const [externalPreviews, setExternalPreviews] = useState([]);
    const [activePhotoCategory, setActivePhotoCategory] = useState('Internal');
    const [procurementStatus, setProcurementStatus] = useState(project?.procurement_status || ProcurementStatus.NotYetProcured);
    const [constructionStatus, setConstructionStatus] = useState(project?.status || ConstructionStatus.NotYetStarted);
    const [percentage, setPercentage] = useState(Number(project?.accomplishmentPercentage || 0));
    const [remarks, setRemarks] = useState('');
    const [statusAsOfDate, setStatusAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [actualCompletionDate, setActualCompletionDate] = useState('');

    const bodyRef = useRef(null);
    const internalInputRef = useRef(null);
    const externalInputRef = useRef(null);
    const internalCameraRef = useRef(null);
    const externalCameraRef = useRef(null);

    // Scroll body to top whenever step changes
    useEffect(() => {
        bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }, [step]);

    // Reset state when opened for a different project
    useEffect(() => {
        if (isOpen && project) {
            setStep(1);
            setProcurementStatus(project.procurement_status || ProcurementStatus.NotYetProcured);
            setConstructionStatus(project.status || ConstructionStatus.NotYetStarted);
            setPercentage(Number(project.accomplishmentPercentage || 0));
            setRemarks('');
            setStatusAsOfDate(new Date().toISOString().split('T')[0]);
            setActualCompletionDate('');
            setInternalFiles([]);
            setInternalPreviews([]);
            setExternalFiles([]);
            setExternalPreviews([]);
        }
    }, [isOpen, project?.id]);

    if (!isOpen || !project) return null;

    const handlePhotoSelect = (e, category) => {
        const files = Array.from(e.target.files);
        if (!files.length) return;
        const valid = files.filter(f => f.size <= 100 * 1024 * 1024);
        const previews = valid.map(f => URL.createObjectURL(f));
        if (category === 'Internal') {
            setInternalFiles(p => [...p, ...valid]);
            setInternalPreviews(p => [...p, ...previews]);
        } else {
            setExternalFiles(p => [...p, ...valid]);
            setExternalPreviews(p => [...p, ...previews]);
        }
        e.target.value = null;
    };

    const removePhoto = (index, category) => {
        if (category === 'Internal') {
            setInternalFiles(p => p.filter((_, i) => i !== index));
            setInternalPreviews(p => p.filter((_, i) => i !== index));
        } else {
            setExternalFiles(p => p.filter((_, i) => i !== index));
            setExternalPreviews(p => p.filter((_, i) => i !== index));
        }
    };

    const handleConstructionChange = (newStatus) => {
        setConstructionStatus(newStatus);
        if (newStatus === ConstructionStatus.NotYetStarted) {
            setPercentage(0);
        } else if ([ConstructionStatus.Completed, ConstructionStatus.ForFinalInspection].includes(newStatus)) {
            setPercentage(100);
        }
    };

    const handlePercentageChange = (val) => {
        const num = Math.min(100, Math.max(0, Number(val)));
        setPercentage(num);
        if (num === 0) setConstructionStatus(ConstructionStatus.NotYetStarted);
        else if (num === 100 && constructionStatus !== ConstructionStatus.Completed) setConstructionStatus(ConstructionStatus.ForFinalInspection);
        else if (num > 0 && num < 100 && [ConstructionStatus.Completed, ConstructionStatus.ForFinalInspection].includes(constructionStatus)) {
            setConstructionStatus(ConstructionStatus.Ongoing);
        }
    };

    const canProceedStep2 = () => {
        const progressive = [ConstructionStatus.Ongoing, ConstructionStatus.ForFinalInspection, ConstructionStatus.Completed];
        if (progressive.includes(constructionStatus) && internalFiles.length === 0 && externalFiles.length === 0) {
            return { ok: false, reason: `You must attach at least one site photo for "${constructionStatus}" status (COA requirement).` };
        }
        if (constructionStatus === ConstructionStatus.Completed && !actualCompletionDate) {
            return { ok: false, reason: "Please enter the Actual Completion Date to mark this project as Completed." };
        }
        return { ok: true };
    };

    const handleNextStep = () => {
        if (step === 1) {
            setStep(2);
        } else if (step === 2) {
            const check = canProceedStep2();
            if (!check.ok) { alert(`⚠️ ${check.reason}`); return; }
            setStep(3);
        }
    };

    const handleSubmit = () => {
        onSave(
            {
                ...project,
                procurement_status: procurementStatus,
                status: constructionStatus,
                accomplishmentPercentage: percentage,
                otherRemarks: remarks || project.otherRemarks,
                statusAsOfDate,
                actualCompletionDate: constructionStatus === ConstructionStatus.Completed ? actualCompletionDate : project.actualCompletionDate,
            },
            internalFiles,
            externalFiles
        );
    };

    const handleClose = () => {
        setStep(1);
        setInternalFiles([]); setInternalPreviews([]);
        setExternalFiles([]); setExternalPreviews([]);
        onClose();
    };

    const originalConstruction = project.status;
    const originalProcurement = project.procurement_status || ProcurementStatus.NotYetProcured;
    const procChanged = procurementStatus !== originalProcurement;
    const constChanged = constructionStatus !== originalConstruction;
    
    const procOpt = PROCUREMENT_OPTIONS.find(s => s.value === procurementStatus);
    const constOpt = CONSTRUCTION_OPTIONS.find(s => s.value === constructionStatus);
    const constCols = colorMap[constOpt?.color || 'slate'];
    const procCols = colorMap[procOpt?.color || 'slate'];

    const activeFiles = activePhotoCategory === 'Internal' ? internalFiles : externalFiles;
    const activePreviews = activePhotoCategory === 'Internal' ? internalPreviews : externalPreviews;
    const photoDB = PHOTO_DESCRIPTIONS[activePhotoCategory];
    const categoryColor = activePhotoCategory === 'Internal' ? 'blue' : 'emerald';

    const PhotoCard = () => (
        <div className={`border-2 rounded-3xl overflow-hidden border-${categoryColor}-100`}>
            {/* Description Banner */}
            <div className={`bg-${categoryColor}-50 px-4 pt-4 pb-3 border-b border-${categoryColor}-100`}>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">{photoDB.emoji}</span>
                    <span className={`text-[10px] font-black uppercase tracking-widest text-${categoryColor}-600`}>{photoDB.label}</span>
                </div>
                <ul className="space-y-1">
                    {photoDB.guidelines.map((g, i) => (
                        <li key={i} className={`text-[9px] font-bold text-${categoryColor}-600 flex items-start gap-1.5`}>
                            <span className="mt-0.5 shrink-0">•</span>
                            <span>{g}</span>
                        </li>
                    ))}
                </ul>
            </div>

            {/* Photo Grid */}
            {activePreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 p-3">
                    {activePreviews.map((src, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 group">
                            <img src={src} alt="" className="w-full h-full object-cover" />
                            <button
                                onClick={() => removePhoto(i, activePhotoCategory)}
                                className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow"
                            >
                                <FiX size={10} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Buttons */}
            <div className="flex gap-2 p-3 pt-0">
                {activePreviews.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center gap-2 py-5 text-slate-300">
                        <span className="text-3xl">📷</span>
                        <span className="text-[9px] font-bold uppercase tracking-wider">No photos yet</span>
                    </div>
                )}
            </div>
            <div className="flex gap-2 p-3 pt-0">
                <button
                    onClick={() => activePhotoCategory === 'Internal' ? internalCameraRef.current?.click() : externalCameraRef.current?.click()}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-${categoryColor}-200 bg-${categoryColor}-50/30 text-${categoryColor}-500 text-[10px] font-black uppercase hover:bg-${categoryColor}-50 transition-all`}
                >
                    <FiCamera size={15} /> Camera
                </button>
                <button
                    onClick={() => activePhotoCategory === 'Internal' ? internalInputRef.current?.click() : externalInputRef.current?.click()}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-${categoryColor}-200 bg-${categoryColor}-50/30 text-${categoryColor}-500 text-[10px] font-black uppercase hover:bg-${categoryColor}-50 transition-all`}
                >
                    <FiImage size={15} /> Gallery
                </button>
            </div>
        </div>
    );

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 pb-6 px-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-tight">Update Project</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate max-w-[280px]">
                                {project.schoolName}
                            </p>
                        </div>
                        <button onClick={handleClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors">
                            <FiX size={20} />
                        </button>
                    </div>

                    {/* Step Indicator */}
                    <div className="flex items-center gap-1.5">
                        {STEPS.map((s, idx) => (
                            <React.Fragment key={s.id}>
                                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black transition-all ${step === s.id ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/25' : step > s.id ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                    <span>{step > s.id ? '✓' : s.icon}</span>
                                    <span>{s.label}</span>
                                </div>
                                {idx < STEPS.length - 1 && (
                                    <div className={`flex-1 h-0.5 rounded-full ${step > s.id ? 'bg-emerald-300' : 'bg-slate-100'}`} />
                                )}
                            </React.Fragment>
                        ))}
                    </div>
                </div>

                {/* Scrollable Body */}
                <div ref={bodyRef} className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* STEP 1: PHOTOS */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                                Attach internal and external site photos as proof of progress. Required for <span className="font-black text-blue-600">Ongoing, For Final Inspection, and Completed</span> statuses (COA requirement).
                            </p>

                            {/* Category Toggle */}
                            <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                                {['Internal', 'External'].map(cat => {
                                    const count = cat === 'Internal' ? internalFiles.length : externalFiles.length;
                                    return (
                                        <button
                                            key={cat}
                                            onClick={() => setActivePhotoCategory(cat)}
                                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activePhotoCategory === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}
                                        >
                                            {cat === 'Internal' ? '🏗️' : '🌳'} {cat}
                                            {count > 0 && (
                                                <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px] font-black">{count}</span>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>

                            <PhotoCard />

                            {/* Hidden Inputs */}
                            <input ref={internalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoSelect(e, 'Internal')} />
                            <input ref={internalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoSelect(e, 'Internal')} />
                            <input ref={externalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoSelect(e, 'External')} />
                            <input ref={externalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoSelect(e, 'External')} />

                            {/* Summary Bar */}
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                                {[
                                    { label: 'Internal', count: internalFiles.length },
                                    { label: 'External', count: externalFiles.length },
                                    { label: 'Total', count: internalFiles.length + externalFiles.length, highlight: true },
                                ].map((item, i, arr) => (
                                    <React.Fragment key={item.label}>
                                        <div className="text-center flex-1">
                                            <p className={`text-sm font-black ${item.highlight ? 'text-blue-600' : 'text-slate-800'}`}>{item.count}</p>
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{item.label}</p>
                                        </div>
                                        {i < arr.length - 1 && <div className="w-px h-8 bg-slate-200" />}
                                    </React.Fragment>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 2: STATUS */}
                    {step === 2 && (
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Procurement Status</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {PROCUREMENT_OPTIONS.map(opt => {
                                        const c = colorMap[opt.color];
                                        const sel = procurementStatus === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => setProcurementStatus(opt.value)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${sel ? `${c.bg} ${c.border}` : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <span className="text-lg">{opt.icon}</span>
                                                <span className={`flex-1 text-[11px] font-black ${sel ? c.text : 'text-slate-600'}`}>{opt.label}</span>
                                                {sel && <FiCheck size={16} className={c.text} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Construction Status</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {CONSTRUCTION_OPTIONS.map(opt => {
                                        const c = colorMap[opt.color];
                                        const sel = constructionStatus === opt.value;
                                        return (
                                            <button
                                                key={opt.value}
                                                onClick={() => handleConstructionChange(opt.value)}
                                                className={`flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${sel ? `${c.bg} ${c.border}` : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                            >
                                                <span className="text-lg">{opt.icon}</span>
                                                <span className={`flex-1 text-[11px] font-black ${sel ? c.text : 'text-slate-600'}`}>{opt.label}</span>
                                                {sel && <FiCheck size={16} className={c.text} />}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {![ConstructionStatus.NotYetStarted].includes(constructionStatus) && (
                                <div className={`p-4 rounded-2xl border ${constCols.bg} ${constCols.border}`}>
                                    <div className="flex items-center justify-between mb-3">
                                        <label className={`text-[10px] font-black uppercase tracking-widest ${constCols.text}`}>Accomplishment %</label>
                                        <span className={`text-xl font-black tabular-nums ${constCols.text}`}>{percentage}%</span>
                                    </div>
                                    <input
                                        type="range" min="0" max="100" value={percentage}
                                        onChange={e => handlePercentageChange(e.target.value)}
                                        disabled={[ConstructionStatus.Completed, ConstructionStatus.ForFinalInspection].includes(constructionStatus)}
                                        className="w-full accent-blue-600"
                                    />
                                    <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                                        {['0%', '25%', '50%', '75%', '100%'].map(l => <span key={l}>{l}</span>)}
                                    </div>
                                </div>
                            )}

                            {constructionStatus === ConstructionStatus.Completed && (
                                <div>
                                    <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Actual Completion Date *</label>
                                    <input type="date" value={actualCompletionDate} onChange={e => setActualCompletionDate(e.target.value)}
                                        className="w-full p-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 text-sm font-bold text-slate-700 outline-none" />
                                </div>
                            )}

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status As Of Date</label>
                                <input type="date" value={statusAsOfDate} onChange={e => setStatusAsOfDate(e.target.value)}
                                    className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none" />
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks (Optional)</label>
                                <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)}
                                    placeholder="Add any additional notes about the current status..."
                                    className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs font-medium text-slate-700 placeholder:text-slate-300 outline-none resize-none" />
                            </div>
                        </div>
                    )}

                    {/* STEP 3: CONFIRM */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project</p>
                                <p className="text-sm font-black text-slate-800 leading-snug">{project.projectName}</p>
                                <p className="text-[10px] text-slate-500 mt-0.5">{project.schoolName}</p>
                            </div>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Changes Summary</p>

                            {/* Procurement Status */}
                            <div className={`p-3 rounded-2xl border ${procChanged ? `${procCols.bg} ${procCols.border}` : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Procurement Status</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 line-through">{originalProcurement}</span>
                                    <span className="text-slate-300">→</span>
                                    <span className={`text-[11px] font-black ${procCols.text}`}>{procurementStatus}</span>
                                    {procChanged && <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded-full border bg-white border-current uppercase ${procCols.text}`}>Changed</span>}
                                </div>
                            </div>

                            {/* Construction Status */}
                            <div className={`p-3 rounded-2xl border ${constChanged ? `${constCols.bg} ${constCols.border}` : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Construction Status</p>
                                <div className="flex items-center gap-2">
                                    <span className="text-[10px] font-bold text-slate-500 line-through">{originalConstruction}</span>
                                    <span className="text-slate-300">→</span>
                                    <span className={`text-[11px] font-black ${constCols.text}`}>{constructionStatus}</span>
                                    {constChanged && <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded-full border bg-white border-current uppercase ${constCols.text}`}>Changed</span>}
                                </div>
                            </div>

                            {/* Photos */}
                            <div className={`p-3 rounded-2xl border ${(internalFiles.length + externalFiles.length) > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Site Photos</p>
                                <span className="text-[11px] font-black text-blue-600">
                                    {internalFiles.length > 0 && `${internalFiles.length} Internal`}
                                    {internalFiles.length > 0 && externalFiles.length > 0 && ', '}
                                    {externalFiles.length > 0 && `${externalFiles.length} External`}
                                    {internalFiles.length === 0 && externalFiles.length === 0 && <span className="text-slate-400 font-bold">No new photos</span>}
                                </span>
                            </div>

                            {remarks && (
                                <div className="p-3 rounded-2xl border bg-slate-50 border-slate-100">
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Remarks</p>
                                    <p className="text-[11px] font-medium text-slate-700 italic">"{remarks}"</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    {step > 1 ? (
                        <button onClick={() => setStep(s => s - 1)} disabled={isUploading}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all disabled:opacity-50">
                            ← Back
                        </button>
                    ) : (
                        <button onClick={handleClose}
                            className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all">
                            Cancel
                        </button>
                    )}

                    {step < 3 ? (
                        <button onClick={handleNextStep}
                            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 active:scale-95">
                            Next <FiChevronRight size={14} />
                        </button>
                    ) : (
                        <button onClick={handleSubmit} disabled={isUploading}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 active:scale-95'}`}>
                            {isUploading
                                ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</>
                                : <><FiCheck size={14} /> Submit Update</>
                            }
                        </button>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default UpdateProjectWizard;
