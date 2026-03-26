import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiCamera, FiImage, FiX, FiCheck, FiChevronRight } from 'react-icons/fi';

const ProjectStatus = {
    UnderProcurement: "Under Procurement",
    NotYetStarted: "Not Yet Started",
    Ongoing: "Ongoing",
    ForFinalInspection: "For Final Inspection",
    Completed: "Completed",
    Suspended: "Suspended",
    Terminated: "Terminated",
};

const STATUS_OPTIONS = [
    { value: ProjectStatus.NotYetStarted, label: "Not Yet Started", color: "slate", icon: "⏸️" },
    { value: ProjectStatus.UnderProcurement, label: "Under Procurement", color: "amber", icon: "📋" },
    { value: ProjectStatus.Ongoing, label: "Ongoing", color: "blue", icon: "🔧" },
    { value: ProjectStatus.ForFinalInspection, label: "For Final Inspection", color: "purple", icon: "🔍" },
    { value: ProjectStatus.Completed, label: "Completed", color: "emerald", icon: "✅" },
    { value: ProjectStatus.Suspended, label: "Suspended", color: "orange", icon: "⏸" },
    { value: ProjectStatus.Terminated, label: "Terminated", color: "red", icon: "🚫" },
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
    { id: 3, label: "Confirm", icon: "✅" },
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

const UpdateProjectWizard = ({ project, isOpen, onClose, onSave, isUploading }) => {
    const isProcurementMode = (project?.statusDesignPhase !== "Completed");
    const STEPS = isProcurementMode ? STEPS_PROCUREMENT : STEPS_CONSTRUCTION;

    const [step, setStep] = useState(1);
    const [internalFiles, setInternalFiles] = useState([]);
    const [internalPreviews, setInternalPreviews] = useState([]);
    const [externalFiles, setExternalFiles] = useState([]);
    const [externalPreviews, setExternalPreviews] = useState([]);
    const [activePhotoCategory, setActivePhotoCategory] = useState('Internal');
    const [status, setStatus] = useState(project?.status || ProjectStatus.NotYetStarted);
    const [percentage, setPercentage] = useState(Number(project?.accomplishmentPercentage || 0));
    const [remarks, setRemarks] = useState('');
    const [statusAsOfDate, setStatusAsOfDate] = useState(new Date().toISOString().split('T')[0]);
    const [actualCompletionDate, setActualCompletionDate] = useState(project?.actualCompletionDate || '');

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
            setStatus(project.status || ProjectStatus.NotYetStarted);
            setPercentage(Number(project.accomplishmentPercentage || 0));
            setRemarks('');
            setStatusAsOfDate(new Date().toISOString().split('T')[0]);
            setActualCompletionDate(project.actualCompletionDate || '');
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

    const handleStatusChange = (newStatus) => {
        setStatus(newStatus);
        if ([ProjectStatus.NotYetStarted, ProjectStatus.UnderProcurement].includes(newStatus)) {
            setPercentage(0);
        } else if ([ProjectStatus.Completed, ProjectStatus.ForFinalInspection].includes(newStatus)) {
            setPercentage(100);
        }
        // Suspended & Terminated: percentage is preserved (no change to percentage state)
    };

    const handlePercentageChange = (val) => {
        const minPct = Number(project?.accomplishmentPercentage || 0);
        const num = Math.min(100, Math.max(minPct, Number(val)));
        setPercentage(num);
        if (num === 0) setStatus(ProjectStatus.NotYetStarted);
        else if (num === 100 && status !== ProjectStatus.Completed) setStatus(ProjectStatus.ForFinalInspection);
        else if (num > 0 && num < 100 && [ProjectStatus.Completed, ProjectStatus.ForFinalInspection].includes(status)) {
            setStatus(ProjectStatus.Ongoing);
        }
    };

    const canProceedNext = () => {
        if (isProcurementMode) {
            return { ok: true };
        }
        const progressive = [ProjectStatus.Ongoing, ProjectStatus.ForFinalInspection, ProjectStatus.Completed];
        if (step === 2 && progressive.includes(status) && internalFiles.length === 0 && externalFiles.length === 0) {
            return { ok: false, reason: `You must attach at least one site photo for "${status}" status (COA requirement).` };
        }
        if (step === 2 && status === ProjectStatus.Completed && !actualCompletionDate) {
            return { ok: false, reason: "Please enter the Actual Completion Date to mark this project as Completed." };
        }
        return { ok: true };
    };

    const handleNextStep = () => {
        const check = canProceedNext();
        if (!check.ok) { alert(`⚠️ ${check.reason}`); return; }
        setStep(s => s + 1);
    };

    const handleSubmit = () => {
        onSave(
            {
                ...project,
                status,
                accomplishmentPercentage: percentage,
                otherRemarks: remarks || project.otherRemarks,
                statusAsOfDate: isProcurementMode ? new Date().toISOString().split('T')[0] : statusAsOfDate,
                actualCompletionDate: status === ProjectStatus.Completed ? actualCompletionDate : project.actualCompletionDate,
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

    const originalStatus = project.status;
    const originalPercentage = Number(project.accomplishmentPercentage || 0);
    const statusChanged = status !== originalStatus;
    const percentageChanged = percentage !== originalPercentage;
    const currentOpt = STATUS_OPTIONS.find(s => s.value === status);
    const cols = colorMap[currentOpt?.color || 'slate'];

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
                                    <PhotoCard />
                                    <input ref={internalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoSelect(e, 'Internal')} />
                                    <input ref={internalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoSelect(e, 'Internal')} />
                                    <input ref={externalInputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handlePhotoSelect(e, 'External')} />
                                    <input ref={externalCameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={e => handlePhotoSelect(e, 'External')} />
                                </div>
                            )}

                            {/* STEP 2: STATUS */}
                            {step === 2 && (
                                <div className="space-y-4">
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 text-center mb-4">
                                        <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest leading-none">Status Update Mode</p>
                                        <p className="text-[9px] text-slate-400 font-bold mt-1">Updating accomplishment for {status}</p>
                                    </div>

                                    {/* Status Selection (Bug 2 & 3) */}
                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Change Status</label>
                                        <select
                                            value={status || ""}
                                            onChange={(e) => handleStatusChange(e.target.value)}
                                            className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/10 transition-all cursor-pointer"
                                        >
                                            <option value="" disabled>— Please select —</option>
                                            {STATUS_OPTIONS.map(opt => (
                                                <option key={opt.value} value={opt.value}>{opt.icon} {opt.label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    {/* Warning Banner for Terminal Statuses */}
                                    {[ProjectStatus.Suspended, ProjectStatus.Terminated].includes(status) && (
                                        <div className={`p-4 rounded-2xl border ${cols.bg} ${cols.border} flex items-start gap-3`}>
                                            <span className="text-xl">{currentOpt.icon}</span>
                                            <div>
                                                <p className={`text-[10px] font-black uppercase tracking-widest ${cols.text}`}>Project {status}</p>
                                                <p className="text-[9px] text-slate-500 font-bold mt-1 leading-relaxed">
                                                    Progress is locked at <b>{percentage}%</b>. To resume updates, change status back to <b>Ongoing</b>.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {![ProjectStatus.NotYetStarted, ProjectStatus.UnderProcurement].includes(status) && (
                                        <div className={`p-4 rounded-2xl border ${cols.bg} ${cols.border}`}>
                                            <div className="flex items-center justify-between mb-3">
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${cols.text}`}>Accomplishment %</label>
                                                <span className={`text-xl font-black tabular-nums ${cols.text}`}>{percentage}%</span>
                                            </div>
                                            <input 
                                                type="range" 
                                                min={Number(project?.accomplishmentPercentage || 0)} 
                                                max="100" 
                                                value={percentage} 
                                                onChange={e => handlePercentageChange(e.target.value)}
                                                disabled={[ProjectStatus.Completed, ProjectStatus.ForFinalInspection, ProjectStatus.Suspended, ProjectStatus.Terminated].includes(status)} 
                                                className="w-full accent-blue-600 cursor-pointer disabled:cursor-not-allowed" 
                                            />
                                            {Number(project?.accomplishmentPercentage || 0) > 0 && ![ProjectStatus.Suspended, ProjectStatus.Terminated].includes(status) && (
                                                <p className="text-[9px] text-slate-400 font-bold mt-2 text-center">
                                                    ⚠️ Cannot go below saved progress ({project.accomplishmentPercentage}%)
                                                </p>
                                            )}
                                        </div>
                                    )}
                                    {status === ProjectStatus.Completed && (
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
                                        <textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Add any notes..."
                                            className="w-full p-3 rounded-2xl border border-slate-200 text-xs font-medium outline-none resize-none" />
                                    </div>
                                </div>
                            )}

                            {/* REMOVAL OF STEP 3 DETAILS PER USER REQUEST */}

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

                    {/* STEP 3: CONFIRM (Unified) */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <div className="bg-slate-50 rounded-2xl border border-slate-100 p-4">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Project</p>
                                <p className="text-sm font-black text-slate-800 leading-snug">{project.projectName}</p>
                            </div>

                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Changes Summary</p>

                            {!isProcurementMode ? (
                                <>
                                    <div className={`p-3 rounded-2xl border ${statusChanged ? `${cols.bg} ${cols.border}` : 'bg-slate-50 border-slate-100'}`}>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Construction Status</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 line-through">{originalStatus}</span>
                                            <span className="text-slate-300">→</span>
                                            <span className={`text-[11px] font-black ${cols.text}`}>{status}</span>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-2xl border ${percentageChanged ? `${cols.bg} ${cols.border}` : 'bg-slate-50 border-slate-100'}`}>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Accomplishment %</p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-bold text-slate-500 line-through">{originalPercentage}%</span>
                                            <span className="text-slate-300">→</span>
                                            <span className={`text-[11px] font-black ${cols.text}`}>{percentage}%</span>
                                        </div>
                                    </div>
                                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Technical Details</p>
                                        <div className="flex flex-wrap gap-2 mt-1">
                                            {details.projectCategory && <span className="bg-white px-2 py-0.5 rounded text-[9px] font-bold border border-slate-100">{details.projectCategory}</span>}
                                            {details.scopeOfWork && <span className="bg-white px-2 py-0.5 rounded text-[9px] font-bold border border-slate-100">{details.scopeOfWork}</span>}
                                            <span className="bg-white px-2 py-0.5 rounded text-[9px] font-bold border border-slate-100">
                                                {details.numberOfClassrooms} CL • {details.numberOfStoreys} St
                                            </span>
                                        </div>
                                    </div>
                                    <div className={`p-3 rounded-2xl border ${(internalFiles.length + externalFiles.length) > 0 ? 'bg-blue-50 border-blue-200' : 'bg-slate-50 border-slate-100'}`}>
                                        <p className="text-[8px] font-black uppercase tracking-widest text-slate-400 mb-1.5">Site Photos</p>
                                        <span className="text-[11px] font-black text-blue-600">
                                            {internalFiles.length + externalFiles.length > 0 ? `${internalFiles.length + externalFiles.length} New Photos Attached` : "No new photos"}
                                        </span>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                                        <p className="text-[8px] font-black text-blue-600 uppercase tracking-widest mb-3">Procurement Updates</p>
                                        <div className="grid grid-cols-2 gap-3">
                                            {BIDDING_MILESTONES.map(m => (
                                                <div key={m.key} className="flex flex-col">
                                                    <span className="text-[8px] text-slate-400 font-bold uppercase">{m.label}</span>
                                                    <span className="text-[10px] font-black text-slate-700">{biddingDates[m.key] || '---'}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-100">
                                        <p className="text-[8px] font-black text-amber-600 uppercase tracking-widest mb-3">Contract Update</p>
                                        <div className="space-y-2">
                                            <div><span className="text-[8px] text-slate-400 font-bold uppercase mr-2">ID:</span> <span className="text-[10px] font-black text-slate-700">{contractAward.contractId || '---'}</span></div>
                                            <div><span className="text-[8px] text-slate-400 font-bold uppercase mr-2">Contractor:</span> <span className="text-[10px] font-black text-slate-700">{contractAward.contractorName || '---'}</span></div>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
                    <button onClick={step === 1 ? handleClose : () => setStep(s => s - 1)}
                        className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold">
                        {step === 1 ? "Cancel" : "← Back"}
                    </button>

                    <button onClick={step < (isProcurementMode ? 3 : 3) ? handleNextStep : handleSubmit} disabled={isUploading}
                        className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isUploading ? 'bg-slate-200 text-slate-400' : 'bg-blue-600 text-white shadow-lg shadow-blue-500/25 hover:-translate-y-0.5 active:scale-95'}`}>
                        {isUploading ? "Saving..." : step < (isProcurementMode ? 3 : 3) ? "Next" : "Submit Update"}
                    </button>
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default UpdateProjectWizard;
