import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { FiCamera, FiImage, FiX, FiCheck, FiChevronRight } from 'react-icons/fi';
import { getChecklist, calcTriangulatedPercentage } from '../constants/progressChecklists';

const ProcurementStatus = {
    NotYetProcured: "Not yet procured",
    UnderProcurement: "Under procurement",
    ProcurementComplete: "Completed",
};

const ConstructionStatus = {
    NotYetStarted: "Not Yet Started",
    Ongoing: "Ongoing",
    ForFinalInspection: "For Final Inspection",
    Completed: "Completed",
    Suspended: "Suspended",
    Terminated: "Terminated",
};

const STATUS_OPTIONS = [
    { value: ConstructionStatus.NotYetStarted, label: "Not Yet Started", color: "slate", icon: "⏸️" },
    { value: ConstructionStatus.Ongoing, label: "Ongoing", color: "blue", icon: "🔧" },
    { value: ConstructionStatus.ForFinalInspection, label: "For Final Inspection", color: "purple", icon: "🔍" },
    { value: ConstructionStatus.Completed, label: "Completed", color: "emerald", icon: "✅" },
    { value: ConstructionStatus.Suspended, label: "Suspended", color: "orange", icon: "⏸" },
    { value: ConstructionStatus.Terminated, label: "Terminated", color: "red", icon: "🚫" },
];

const PROCUREMENT_OPTIONS = [
    { value: ProcurementStatus.NotYetProcured, label: "Not Yet Procured", color: "red", icon: "🔴" },
    { value: ProcurementStatus.UnderProcurement, label: "Under Procurement", color: "amber", icon: "📋" },
    { value: ProcurementStatus.ProcurementComplete, label: "Completed", color: "emerald", icon: "✅" },
];

const CONSTRUCTION_OPTIONS = [
    { value: ConstructionStatus.NotYetStarted, label: "Not Yet Started", color: "slate", icon: "⏸️" },
    { value: ConstructionStatus.Ongoing, label: "Ongoing", color: "blue", icon: "🔧" },
    { value: ConstructionStatus.ForFinalInspection, label: "For Final Inspection", color: "purple", icon: "🔍" },
    { value: ConstructionStatus.Completed, label: "Completed", color: "emerald", icon: "✅" },
    { value: ConstructionStatus.Suspended, label: "Suspended", color: "orange", icon: "⏸" },
    { value: ConstructionStatus.Terminated, label: "Terminated", color: "red", icon: "🚫" },
];

const colorMap = {
    slate: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700" },
    orange: { bg: "bg-orange-50", border: "border-orange-500", text: "text-orange-700" },
    red: { bg: "bg-red-50", border: "border-red-500", text: "text-red-700" },
};

const STEPS_CONSTRUCTION = [
    { id: 1, label: "Media", icon: "📸" },
    { id: 2, label: "Status", icon: "📊" },
    { id: 3, label: "Validate", icon: "📋" },
    { id: 4, label: "Confirm", icon: "✅" },
];

const STEPS_PROCUREMENT = [
    { id: 1, label: "Bidding", icon: "⚖️" },
    { id: 2, label: "Contract", icon: "📜" },
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

const BIDDING_MILESTONES = [
    { key: 'issuanceOfInvitationToBid', label: 'Issuance of Invitation to Bid' },
    { key: 'preBidConference', label: 'Pre-Bid Conference' },
    { key: 'openingOfTechnicalProposal', label: 'Opening of Technical Proposal' },
    { key: 'openingOfFinancialProposal', label: 'Opening of Financial Proposal' },
    { key: 'dateNoticeOfAward', label: 'Notice of Award' },
];

const PhotoCard = ({ categoryColor, photoDB, activePreviews, activePhotoCategory, removePhoto, internalCameraRef, externalCameraRef, internalInputRef, externalInputRef }) => (
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

const UpdateProjectWizard = ({ project, isOpen, onClose, onSave, isUploading }) => {
    const isProcurementMode = (project?.statusDesignPhase !== "Completed");
    const STEPS = isProcurementMode ? STEPS_PROCUREMENT : STEPS_CONSTRUCTION;

    const [step, setStep] = useState(1);
    const [internalFiles, setInternalFiles] = useState([]);
    const [internalPreviews, setInternalPreviews] = useState([]);
    const [externalFiles, setExternalFiles] = useState([]);
    const [externalPreviews, setExternalPreviews] = useState([]);
    const [activePhotoCategory, setActivePhotoCategory] = useState('Internal');
    const [procurementStatus, setProcurementStatus] = useState(project?.procurement_status || "");
    const [constructionStatus, setConstructionStatus] = useState((project?.status === ConstructionStatus.NotYetStarted || !project?.status) ? "" : project.status); // Force placeholder if not yet started
    const [percentage, setPercentage] = useState(Number(project?.accomplishmentPercentage || 0));
    const [remarks, setRemarks] = useState('');
    const [statusAsOf, setStatusAsOf] = useState(new Date().toISOString());
    const [actualCompletionDate, setActualCompletionDate] = useState(project?.actualCompletionDate || '');

    // Triangulation checklist state
    const checklist = useMemo(() => getChecklist(project?.numberOfStoreys), [project?.numberOfStoreys]);
    const [checkedState, setCheckedState] = useState(() => {
        const saved = project?.checklist;
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) return saved;
        return {};
    });
    const triangulatedPercentage = useMemo(() => calcTriangulatedPercentage(checklist, checkedState), [checkedState, checklist]);

    // Detailed Project Fields (Construction Mode)
    const [details, setDetails] = useState({
        projectCategory: project?.projectCategory || '',
        scopeOfWork: project?.scopeOfWork || '',
        numberOfClassrooms: project?.numberOfClassrooms || 0,
        numberOfStoreys: project?.numberOfStoreys || 0,
        numberOfSites: project?.numberOfSites || 1,
        fundsUtilized: project?.fundsUtilized || 0,
        projectAllocation: project?.projectAllocation || project?.amount || 0,
        contractAmount: project?.contractAmount || project?.contract_amount || 0,
        batchOfFunds: project?.batchOfFunds || '',
    });

    // Procurement Fields
    const [biddingDates, setBiddingDates] = useState({
        issuanceOfInvitationToBid: project?.issuanceOfInvitationToBid || '',
        preBidConference: project?.preBidConference || '',
        openingOfTechnicalProposal: project?.openingOfTechnicalProposal || '',
        openingOfFinancialProposal: project?.openingOfFinancialProposal || '',
        dateNoticeOfAward: project?.dateNoticeOfAward || '',
    });

    const [contractAward, setContractAward] = useState({
        contractId: project?.contractId || '',
        noticeToProceed: project?.noticeToProceed || '',
        constructionStartDate: project?.constructionStartDate || '',
        targetCompletionDate: project?.targetCompletionDate || '',
        contractorName: project?.contractorName || '',
    });

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
            setProcurementStatus(project.procurement_status || "");
            setConstructionStatus((project.status === ConstructionStatus.NotYetStarted || !project.status) ? "" : project.status); // Force placeholder if not yet started
            setPercentage(Number(project.accomplishmentPercentage || 0));
            setRemarks('');
            setStatusAsOf(new Date().toISOString());
            setActualCompletionDate(project.actualCompletionDate || '');
            const saved = project.checklist;
            setCheckedState((saved && typeof saved === 'object' && !Array.isArray(saved)) ? saved : {});
            setInternalFiles([]);
            setInternalPreviews([]);
            setExternalFiles([]);
            setExternalPreviews([]);

            setBiddingDates({
                issuanceOfInvitationToBid: project.issuanceOfInvitationToBid || '',
                preBidConference: project.preBidConference || '',
                openingOfTechnicalProposal: project.openingOfTechnicalProposal || '',
                openingOfFinancialProposal: project.openingOfFinancialProposal || '',
                dateNoticeOfAward: project.dateNoticeOfAward || '',
            });

            setContractAward({
                contractId: project.contractId || '',
                noticeToProceed: project.noticeToProceed || '',
                constructionStartDate: project.constructionStartDate || '',
                targetCompletionDate: project.targetCompletionDate || '',
                contractorName: project.contractorName || '',
            });

            setDetails({
                projectCategory: project.projectCategory || '',
                scopeOfWork: project.scopeOfWork || '',
                numberOfClassrooms: project.numberOfClassrooms || 0,
                numberOfStoreys: project.numberOfStoreys || 0,
                numberOfSites: project.numberOfSites || 1,
                fundsUtilized: project.fundsUtilized || 0,
                projectAllocation: project.projectAllocation || project.amount || 0,
                contractAmount: project.contractAmount || project.contract_amount || 0,
                batchOfFunds: project.batchOfFunds || '',
            });
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
        // Suspended & Terminated: percentage is preserved (no change to percentage state)
    };

    const handlePercentageChange = (val) => {
        const minPct = Number(project?.accomplishmentPercentage || 0);
        const num = Math.min(100, Math.max(minPct, Number(val)));
        setPercentage(num);

        // Skip auto-status logic when in procurement mode
        if (isProcurementMode) return;
        
        // Only auto-set status if one is already selected (don't override placeholder)
        // Auto-set status only if moving from 0% and a status is ALREADY selected (not placeholder)
        if (num === 0 && constructionStatus && constructionStatus !== ConstructionStatus.NotYetStarted) {
            setConstructionStatus(ConstructionStatus.NotYetStarted);
        }
        else if (num === 100 && constructionStatus !== ConstructionStatus.Completed) setConstructionStatus(ConstructionStatus.ForFinalInspection);
        else if (num > 0 && num < 100 && [ConstructionStatus.Completed, ConstructionStatus.ForFinalInspection].includes(constructionStatus)) {
            setConstructionStatus(ConstructionStatus.Ongoing);
        }
    };

    const canProceedNext = () => {
        if (isProcurementMode) {
            return { ok: true };
        }
        if (step === 2 && !constructionStatus) {
            return { ok: false, reason: "Please select a construction status." };
        }
        const progressive = [ConstructionStatus.Ongoing, ConstructionStatus.ForFinalInspection, ConstructionStatus.Completed];
        if (step === 2 && progressive.includes(constructionStatus) && internalFiles.length === 0 && externalFiles.length === 0) {
            return { ok: false, reason: `You must attach at least one site photo for "${constructionStatus}" status (COA requirement).` };
        }
        if (step === 2 && constructionStatus === ConstructionStatus.Completed && !actualCompletionDate) {
            return { ok: false, reason: "Please enter the Actual Completion Date." };
        }
        return { ok: true };
    };

    const handleNextStep = () => {
        const check = canProceedNext();
        if (!check.ok) { alert(`⚠️ ${check.reason}`); return; }
        setStep(s => s + 1);
    };

    const handleSubmit = () => {
        const check = canProceedNext();
        if (!check.ok) { alert(`⚠️ ${check.reason}`); return; }
        onSave(
            {
                ...project,
                procurement_status: procurementStatus,
                statusDesignPhase: procurementStatus,
                status: constructionStatus,
                accomplishmentPercentage: percentage,
                previousPercentage: project.accomplishmentPercentage,
                otherRemarks: remarks || project.otherRemarks,
                statusAsOf: isProcurementMode ? new Date().toISOString() : statusAsOf,
                actualCompletionDate: constructionStatus === ConstructionStatus.Completed ? actualCompletionDate : project.actualCompletionDate,
                checklist: checkedState,
                triangulated_percentage: triangulatedPercentage,
                ...biddingDates,
                ...contractAward,
                ...details,
                update_type: 'Details Update'
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

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 pb-6 px-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-800 leading-tight">
                                {isProcurementMode ? "Procurement Progress" : "Update Construction"}
                            </h2>
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

                    {!isProcurementMode ? (
                        <>
                            {/* CONSTRUCTION FLOW */}
                            {/* STEP 1: PHOTOS */}
                            {step === 1 && (
                                <div className="space-y-4">
                                    <p className="text-[11px] text-slate-500 font-medium leading-relaxed px-1">
                                        Attach internal and external site photos. Required for <span className="font-black text-blue-600">Ongoing, For Final Inspection, and Completed</span> statuses.
                                    </p>
                                    <div className="flex p-1 bg-slate-100 rounded-2xl gap-1">
                                        {['Internal', 'External'].map(cat => {
                                            const count = cat === 'Internal' ? internalFiles.length : externalFiles.length;
                                            return (
                                                <button key={cat} onClick={() => setActivePhotoCategory(cat)}
                                                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${activePhotoCategory === cat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-white/50'}`}>
                                                    {cat === 'Internal' ? '🏗️' : '🌳'} {cat}
                                                    {count > 0 && <span className="bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full text-[9px] font-black">{count}</span>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                    <PhotoCard
                                        categoryColor={categoryColor}
                                        photoDB={photoDB}
                                        activePreviews={activePreviews}
                                        activePhotoCategory={activePhotoCategory}
                                        removePhoto={removePhoto}
                                        internalCameraRef={internalCameraRef}
                                        externalCameraRef={externalCameraRef}
                                        internalInputRef={internalInputRef}
                                        externalInputRef={externalInputRef}
                                    />
                                    <input ref={internalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoSelect(e, 'Internal')} />
                                    <input ref={internalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoSelect(e, 'Internal')} />
                                    <input ref={externalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoSelect(e, 'External')} />
                                    <input ref={externalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoSelect(e, 'External')} />
                                </div>
                            )}

                            {/* STEP 2: STATUS */}
                            {step === 2 && (
                                <div className="space-y-6">

                                    {/* Construction Selector (Appears only if Procurement is Complete) */}
                                    {procurementStatus === ProcurementStatus.ProcurementComplete && (
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Construction Status</label>
                                            <select
                                                value={constructionStatus || ""}
                                                onChange={(e) => handleConstructionChange(e.target.value)}
                                                className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                                            >
                                                <option value="" disabled>— Please select —</option>
                                                {CONSTRUCTION_OPTIONS.map(opt => (
                                                    <option 
                                                        key={opt.value} 
                                                        value={opt.value}
                                                        disabled={
                                                            (opt.value === ConstructionStatus.NotYetStarted && [ConstructionStatus.Ongoing, ConstructionStatus.ForFinalInspection, ConstructionStatus.Completed, ConstructionStatus.Suspended, ConstructionStatus.Terminated].includes(project.status)) ||
                                                            (opt.value === ConstructionStatus.Ongoing && [ConstructionStatus.ForFinalInspection, ConstructionStatus.Completed, ConstructionStatus.Terminated].includes(project.status))
                                                        }
                                                    >
                                                        {opt.icon} {opt.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}

                                    {/* Accomplishment Slider */}
                                    {procurementStatus === ProcurementStatus.ProcurementComplete && (
                                        <div className={`p-4 rounded-2xl border ${constCols.bg} ${constCols.border} animate-in fade-in zoom-in-95 duration-300`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${constCols.text}`}>Accomplishment %</label>
                                                <span className={`text-xl font-black tabular-nums ${constCols.text}`}>{percentage}%</span>
                                            </div>
                                            <input
                                                type="range" min="0" max="100" value={percentage}
                                                onChange={e => handlePercentageChange(e.target.value)}
                                                disabled={[ConstructionStatus.Completed, ConstructionStatus.ForFinalInspection, ConstructionStatus.Suspended, ConstructionStatus.Terminated].includes(constructionStatus)}
                                                className="w-full accent-blue-600"
                                            />
                                            <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                                                {['0%', '25%', '50%', '75%', '100%'].map(l => <span key={l}>{l}</span>)}
                                            </div>
                                        </div>
                                    )}

                                    {/* Date and Remarks */}
                                    <div className="space-y-4">
                                        {constructionStatus === ConstructionStatus.Completed && (
                                            <div>
                                                <label className="block text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">Actual Completion Date *</label>
                                                <input type="date" value={actualCompletionDate} onChange={e => setActualCompletionDate(e.target.value)}
                                                    className="w-full p-3 rounded-2xl border-2 border-emerald-200 bg-emerald-50/30 text-sm font-bold text-slate-700 outline-none" />
                                            </div>
                                        )}
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Status As Of Date</label>
                                            <input
                                                type="date"
                                                value={statusAsOf ? statusAsOf.split('T')[0] : ''}
                                                onChange={e => {
                                                    const datePart = e.target.value;
                                                    const timePart = new Date().toISOString().split('T')[1];
                                                    setStatusAsOf(`${datePart}T${timePart}`);
                                                }}
                                                className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 outline-none"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Remarks (Optional)</label>
                                            <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add any notes..."
                                                className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium outline-none resize-none" />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : (
                        <>
                            {/* PROCUREMENT FLOW */}
                            {/* STEP 1: BIDDING MILESTONES */}
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                        <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] mb-4 text-center">Bidding Milestones</h4>
                                        <div className="relative space-y-8">
                                            {/* Progress Vertical Line */}
                                            <div className="absolute left-[15px] top-2 bottom-2 w-0.5 bg-blue-200 z-0"></div>
                                            
                                            {BIDDING_MILESTONES.map((m, i) => {
                                                const hasDate = !!biddingDates[m.key];
                                                return (
                                                    <div key={m.key} className="relative z-10 flex flex-col gap-2">
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${hasDate ? 'bg-blue-600 border-blue-600 text-white shadow-md' : 'bg-white border-slate-200 text-slate-300'}`}>
                                                                {hasDate ? <FiCheck size={14} /> : <span className="text-[10px] font-black">{i + 1}</span>}
                                                            </div>
                                                            <label className={`text-[11px] font-black uppercase tracking-tight ${hasDate ? 'text-slate-800' : 'text-slate-400'}`}>
                                                                {m.label}
                                                            </label>
                                                        </div>
                                                        <div className="pl-12">
                                                            <input
                                                                type="date"
                                                                value={biddingDates[m.key]}
                                                                onChange={(e) => setBiddingDates(prev => ({ ...prev, [m.key]: e.target.value }))}
                                                                className={`w-full p-2.5 rounded-xl border text-xs font-bold outline-none transition-all ${hasDate ? 'border-blue-200 bg-white text-slate-800 shadow-sm' : 'border-slate-100 bg-slate-50/50 text-slate-400'}`}
                                                            />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-slate-400 text-center italic font-medium">Record the dates for each bidding stage to track procurement timeline.</p>
                                </div>
                            )}

                            {/* STEP 2: CONTRACT AWARD */}
                            {step === 2 && (
                                <div className="space-y-5">
                                    <div className="bg-amber-50/50 p-5 rounded-3xl border border-amber-100/50">
                                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-[0.2em] mb-5">Contract Award & Financials</h4>
                                        
                                        <div className="space-y-4">
                                            {[
                                                { key: 'contractId', label: 'Contract-ID', placeholder: 'Enter Contract Ref ID', section: 'contract' },
                                                { key: 'noticeToProceed', label: 'Notice to Proceed', type: 'date', section: 'contract' },
                                                { key: 'constructionStartDate', label: 'Construction Start', type: 'date', section: 'contract' },
                                                { key: 'targetCompletionDate', label: 'Target Completion Date', type: 'date', section: 'contract' },
                                                { key: 'contractorName', label: 'Contractor Name', placeholder: 'Enter Contractor Name', section: 'contract' },
                                                { key: 'projectAllocation', label: 'Approved Budget (ABC)', placeholder: 'Enter ABC', section: 'details' },
                                                { key: 'contractAmount', label: 'Contract Amount', placeholder: 'Enter Contract Amount', section: 'details' },
                                                { key: 'batchOfFunds', label: 'Batch of Funds', placeholder: 'Enter Batch', section: 'details' },
                                            ].map(field => (
                                                <div key={field.key} className="flex flex-col gap-1.5">
                                                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.label}</label>
                                                    <input
                                                        type={field.type || 'text'}
                                                        value={field.section === 'contract' ? contractAward[field.key] : details[field.key]}
                                                        placeholder={field.placeholder}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (field.section === 'contract') setContractAward(p => ({ ...p, [field.key]: val }));
                                                            else setDetails(p => ({ ...p, [field.key]: val }));
                                                        }}
                                                        className="w-full p-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-amber-500/10 transition-all"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}

                    {/* STEP 3: VALIDATION (Construction only) */}
                    {!isProcurementMode && step === 3 && (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                            <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                <div className="flex items-center justify-between mb-1">
                                    <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest">
                                        Checklist Calculation
                                    </p>
                                    <span className="text-xl font-black text-blue-700">{triangulatedPercentage}%</span>
                                </div>
                                <p className="text-[9px] text-blue-400 font-bold mb-3">
                                    {project?.numberOfStoreys || 1}-Storey building · {checklist.length} tasks
                                </p>
                                <div className="w-full bg-blue-100 rounded-full h-2 mb-3">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${triangulatedPercentage}%` }}
                                    />
                                </div>
                                <div className="flex items-center justify-between text-[9px] font-bold">
                                    <span className="text-slate-500">Manual Progress: <span className="text-slate-700">{percentage}%</span></span>
                                    {Math.abs(triangulatedPercentage - percentage) > 10 && (
                                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                            ⚠ {Math.abs(triangulatedPercentage - percentage)}% variance
                                        </span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-2">
                                {checklist.map(task => (
                                    <button
                                        key={task.id}
                                        onClick={() => setCheckedState(prev => ({ ...prev, [task.id]: !prev[task.id] }))}
                                        className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-all ${checkedState[task.id] ? 'bg-emerald-50 border-emerald-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center shrink-0 transition-all ${checkedState[task.id] ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'}`}>
                                            {checkedState[task.id] && <FiCheck size={11} className="text-white" />}
                                        </div>
                                        <span className={`text-[11px] font-bold flex-1 leading-tight ${checkedState[task.id] ? 'text-emerald-700' : 'text-slate-600'}`}>
                                            {task.task}
                                        </span>
                                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${checkedState[task.id] ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                                            {task.weight}%
                                        </span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* STEP 4: CONFIRM (Unified) */}
                    {step === STEPS.length && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project</p>
                                <p className="text-sm font-black text-slate-800 leading-snug">{project.projectName}</p>
                            </div>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Changes Summary</p>

                            <div className="space-y-3">
                                {/* Procurement Status Summary */}
                                <div className={`p-3 rounded-2xl border ${procChanged ? `${procCols.bg} ${procCols.border}` : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Procurement Status</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 line-through">{originalProcurement}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className={`text-[11px] font-black ${procCols.text}`}>{procurementStatus}</span>
                                        {procChanged && <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded-full border bg-white border-current uppercase ${procCols.text}`}>Changed</span>}
                                    </div>
                                </div>

                                {/* Construction Status Summary */}
                                <div className={`p-3 rounded-2xl border ${constChanged ? `${constCols.bg} ${constCols.border}` : 'bg-slate-50 border-slate-100'}`}>
                                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Construction Status</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-slate-500 line-through">{originalConstruction || 'N/A'}</span>
                                        <span className="text-slate-300">→</span>
                                        <span className={`text-[11px] font-black ${constCols.text}`}>{constructionStatus || 'NO CHANGE'}</span>
                                        {constChanged && <span className={`ml-auto text-[8px] font-black px-2 py-0.5 rounded-full border bg-white border-current uppercase ${constCols.text}`}>Changed</span>}
                                    </div>
                                </div>

                                {/* Progress Summary (Only if construction changed or started) */}
                                {constructionStatus && (
                                    <div className="p-3 rounded-2xl border bg-slate-50 border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Accomplishment</p>
                                        <div className="flex items-center gap-3">
                                            <span className="text-[11px] font-black text-slate-700">{percentage}% manual</span>
                                            {!isProcurementMode && (
                                                <span className={`text-[11px] font-black ${Math.abs(triangulatedPercentage - percentage) > 10 ? 'text-amber-600' : 'text-emerald-600'}`}>
                                                    · {triangulatedPercentage}% checklist
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Photos Summary */}
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
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    <button onClick={step === 1 ? handleClose : () => setStep(s => s - 1)}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold">
                        {step === 1 ? "Cancel" : "← Back"}
                    </button>

                    <button onClick={step < STEPS.length ? handleNextStep : handleSubmit} disabled={isUploading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:scale-95'}`}>
                        {isUploading ? "Saving..." : step < STEPS.length ? "Next" : "Submit Update"}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default UpdateProjectWizard;
