import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiCheck, FiChevronRight } from 'react-icons/fi';

/**
 * ProjectEditModal
 * ----------------
 * A single modal with 3 tabs: Details (multi-step form), VO, Realign.
 * Opened from DetailedProjInfo via one "Edit" button.
 */

const DETAILS_STEPS = [
    { id: 1, label: "Info", icon: "🏫", desc: "Project name, school & classification" },
    { id: 2, label: "Status", icon: "📊", desc: "Construction phase & accomplishment" },
    { id: 3, label: "Contract", icon: "📋", desc: "Bidding milestones & contract" },
    { id: 4, label: "Finance", icon: "💰", desc: "Costs & contractor details" },
    { id: 5, label: "Location", icon: "📍", desc: "Coordinates & address" },
    { id: 6, label: "Docs", icon: "📂", desc: "Upload POW, DUPA & Contract PDF" },
];

const STATUS_OPTIONS = [
    { value: "Not Yet Started", label: "Not Yet Started", icon: "⏸️", color: "slate" },
    { value: "Under Procurement", label: "Under Procurement", icon: "📋", color: "amber" },
    { value: "Ongoing", label: "Ongoing", icon: "🔧", color: "blue" },
    { value: "For Final Inspection", label: "For Final Inspection", icon: "🔍", color: "purple" },
    { value: "Completed", label: "Completed", icon: "✅", color: "emerald" },
];

const PROJECT_CATEGORIES = [
    "New Construction", "Repair and Rehab", "Last Mile Schools", "Health facilities",
    "Gabaldon Restoration", "Library Hub",
    "SpEd Inclusive Learning Resource Centers (ILRC)",
    "Alternative Learning System - Community Based Learning Centers (ALS-CLC)",
    "Midrise School Building",
];

const colorMap = {
    slate: { bg: "bg-slate-50", border: "border-slate-300", text: "text-slate-700" },
    amber: { bg: "bg-amber-50", border: "border-amber-400", text: "text-amber-700" },
    blue: { bg: "bg-blue-50", border: "border-blue-500", text: "text-blue-700" },
    purple: { bg: "bg-purple-50", border: "border-purple-500", text: "text-purple-700" },
    emerald: { bg: "bg-emerald-50", border: "border-emerald-500", text: "text-emerald-700" },
};

// ---- Shared Input style ----
const inputCls = "w-full p-3 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 focus:ring-2 focus:ring-blue-100 outline-none transition-all";
const labelCls = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

const Field = ({ label, children }) => (
    <div>
        <label className={labelCls}>{label}</label>
        {children}
    </div>
);

// ---- Main Modal ----
const ProjectEditModal = ({ project, isOpen, onClose, onSaveDetails, onSaveVO, onSaveRealign }) => {
    const [activeTab, setActiveTab] = useState('details'); // 'details' | 'vo' | 'realign'
    const [detailsStep, setDetailsStep] = useState(1);
    const [formData, setFormData] = useState({});
    const [voForm, setVoForm] = useState({});
    const [realignForm, setRealignForm] = useState({});
    const [realignCandidates, setRealignCandidates] = useState([]);
    const [isFetchingCandidates, setIsFetchingCandidates] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [documentFiles, setDocumentFiles] = useState({ POW: null, DUPA: null, CONTRACT: null });
    const bodyRef = useRef(null);

    useEffect(() => {
        if (isOpen && project) {
            setActiveTab('details');
            setDetailsStep(1);
            setDocumentFiles({ POW: null, DUPA: null, CONTRACT: null });
            setFormData({
                status: project.status || 'Not Yet Started',
                accomplishmentPercentage: Number(project.accomplishmentPercentage || 0),
                statusAsOfDate: project.statusAsOfDate || new Date().toISOString().split('T')[0],
                actualCompletionDate: project.actualCompletionDate || '',
                otherRemarks: project.otherRemarks || '',
                // Project Info
                projectName: project.projectName || '',
                schoolId: project.schoolId || '',
                schoolName: project.schoolName || '',
                projectCategory: project.projectCategory || '',
                program_type: project.program_type || '',
                funding_year: project.funding_year || project.fundingYear || '',
                batchOfFunds: project.batchOfFunds || '',
                numberOfClassrooms: project.numberOfClassrooms || '',
                numberOfStoreys: project.numberOfStoreys || '',
                numberOfSites: project.numberOfSites || '',
                scopeOfWork: project.scopeOfWork || '',
                // Contract
                contractId: project.contractId || project.contract_id || '',
                contractorName: project.contractorName || '',
                noticeToProceed: project.noticeToProceed || '',
                constructionStartDate: project.constructionStartDate || '',
                targetCompletionDate: project.targetCompletionDate || '',
                issuance_of_invitation_to_bid: project.issuance_of_invitation_to_bid || '',
                pre_bid_conference: project.pre_bid_conference || '',
                opening_of_technical_proposal: project.opening_of_technical_proposal || '',
                opening_of_financial_proposal: project.opening_of_financial_proposal || '',
                date_notice_of_award: project.date_notice_of_award || '',
                // Finance
                projectAllocation: project.projectAllocation || '',
                contractAmount: project.contractAmount || project.contract_amount || '',
                fundsUtilized: project.fundsUtilized || '',
                implementing_agency: project.implementing_agency || '',
                // Location
                latitude: project.latitude || '',
                longitude: project.longitude || '',
                province: project.province || '',
                municipality: project.municipality || '',
                legislative_district: project.legislative_district || '',
            });
            setVoForm({
                vo_type: 'Combined',
                vo_number: '',
                additive_amount: '',
                deductive_amount: '',
                time_extension_days: '',
                vo_requested_date: new Date().toISOString().split('T')[0],
                justification_details: '',
            });
            setRealignForm({ targetIpc: '', justification: '' });
            setRealignCandidates([]);
        }
    }, [isOpen, project?.id]);

    // Scroll body to top on tab or step change
    useEffect(() => { bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }); }, [activeTab, detailsStep]);

    // Fetch realignment candidates when Realign tab is opened
    useEffect(() => {
        if (activeTab === 'realign' && project && realignCandidates.length === 0) {
            setIsFetchingCandidates(true);
            fetch(`/api/projects?category=${encodeURIComponent(project.projectCategory || '')}&district=${encodeURIComponent(project.legislative_district || project.division || '')}`)
                .then(r => r.json())
                .then(data => setRealignCandidates(Array.isArray(data) ? data.filter(p => p.id !== project.id) : []))
                .catch(() => setRealignCandidates([]))
                .finally(() => setIsFetchingCandidates(false));
        }
    }, [activeTab]);

    if (!isOpen || !project) return null;

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(p => ({ ...p, [name]: value }));
    };

    const currentStatusOpt = STATUS_OPTIONS.find(s => s.value === formData.status) || STATUS_OPTIONS[0];
    const statusColors = colorMap[currentStatusOpt.color];

    const handleSaveDetails = async () => {
        setIsSaving(true);
        try {
            const formDataToSubmit = new FormData();
            
            // Append all JSON data fields
            Object.keys(formData).forEach(key => {
                if (formData[key] !== null && formData[key] !== undefined) {
                    formDataToSubmit.append(key, formData[key]);
                }
            });

            // Append ID and identification fields explicitly for clarity
            formDataToSubmit.append('id', project.id);
            formDataToSubmit.append('ipc', project.ipc);
            formDataToSubmit.append('uid', localStorage.getItem('uid') || '');
            formDataToSubmit.append('update_type', 'Details Update');

            // Append Document Files (POW, DUPA, Contract)
            if (documentFiles.POW) formDataToSubmit.append('pow_pdf', documentFiles.POW);
            if (documentFiles.DUPA) formDataToSubmit.append('dupa_pdf', documentFiles.DUPA);
            if (documentFiles.CONTRACT) formDataToSubmit.append('contract_pdf', documentFiles.CONTRACT);

            await onSaveDetails(formDataToSubmit);
        } catch (err) {
            console.error("Save Error:", err);
            alert("Failed to save details. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveVO = async () => {
        setIsSaving(true);
        try {
            await onSaveVO({ ...project, ...voForm, update_type: 'VO' });
        } finally {
            setIsSaving(false);
        }
    };

    const handleSaveRealign = async () => {
        if (!realignForm.targetIpc) { alert('Please select a target project.'); return; }
        setIsSaving(true);
        try {
            await onSaveRealign({ ...project, ...realignForm, update_type: 'Realignment' });
        } finally {
            setIsSaving(false);
        }
    };

    // ---- Details Steps renderer ----
    const renderDetailsStep = () => {
        switch (detailsStep) {
            // STEP 1: PROJECT INFO
            case 1:
                return (
                    <div className="space-y-4">
                        <Field label="Project Name">
                            <input name="projectName" value={formData.projectName} onChange={handleChange} className={inputCls} placeholder="Project name" />
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="School ID">
                                <input name="schoolId" value={formData.schoolId} onChange={handleChange} className={inputCls} />
                            </Field>
                            <Field label="School Name">
                                <input name="schoolName" value={formData.schoolName} onChange={handleChange} className={inputCls} />
                            </Field>
                        </div>
                        <Field label="Category">
                            <select name="projectCategory" value={formData.projectCategory} onChange={handleChange} className={inputCls}>
                                <option value="">Select Category...</option>
                                {PROJECT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </Field>
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Program Type">
                                <select name="program_type" value={formData.program_type} onChange={handleChange} className={inputCls}>
                                    <option value="">Select...</option>
                                    <option>BEFF</option><option>GAA</option><option>Donated</option><option>LGU</option>
                                </select>
                            </Field>
                            <Field label="Funding Year">
                                <input name="funding_year" value={formData.funding_year} onChange={handleChange} className={inputCls} />
                            </Field>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <Field label="Classrooms">
                                <input type="number" name="numberOfClassrooms" value={formData.numberOfClassrooms} onChange={handleChange} className={inputCls} />
                            </Field>
                            <Field label="Storeys">
                                <input type="number" name="numberOfStoreys" value={formData.numberOfStoreys} onChange={handleChange} className={inputCls} />
                            </Field>
                            <Field label="Sites">
                                <input type="number" name="numberOfSites" value={formData.numberOfSites} onChange={handleChange} className={inputCls} />
                            </Field>
                        </div>
                        <Field label="Scope of Work">
                            <textarea name="scopeOfWork" rows={3} value={formData.scopeOfWork} onChange={handleChange} className={inputCls + " resize-none"} placeholder="Brief scope description..." />
                        </Field>
                    </div>
                );

            // STEP 2: STATUS
            case 2:
                return (
                    <div className="space-y-4">
                        <div>
                            <p className={labelCls}>Construction Phase Status</p>
                            <div className="space-y-2">
                                {STATUS_OPTIONS.map(opt => {
                                    const c = colorMap[opt.color];
                                    const sel = formData.status === opt.value;
                                    return (
                                        <button key={opt.value}
                                            onClick={() => {
                                                const updates = { status: opt.value };
                                                if (['Not Yet Started', 'Under Procurement'].includes(opt.value)) updates.accomplishmentPercentage = 0;
                                                else if (['For Final Inspection', 'Completed'].includes(opt.value)) updates.accomplishmentPercentage = 100;
                                                setFormData(p => ({ ...p, ...updates }));
                                            }}
                                            className={`w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all ${sel ? `${c.bg} ${c.border}` : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                        >
                                            <span className="text-lg">{opt.icon}</span>
                                            <span className={`flex-1 text-xs font-black ${sel ? c.text : 'text-slate-600'}`}>{opt.label}</span>
                                            {sel && <FiCheck size={16} className={c.text} />}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {!['Not Yet Started', 'Under Procurement'].includes(formData.status) && (
                            <div className={`p-4 rounded-2xl border ${statusColors.bg} ${statusColors.border}`}>
                                <div className="flex items-center justify-between mb-3">
                                    <p className={`text-[10px] font-black uppercase tracking-widest ${statusColors.text}`}>Accomplishment %</p>
                                    <span className={`text-2xl font-black tabular-nums ${statusColors.text}`}>{formData.accomplishmentPercentage}%</span>
                                </div>
                                <input type="range" min="0" max="100"
                                    value={formData.accomplishmentPercentage}
                                    onChange={e => setFormData(p => ({ ...p, accomplishmentPercentage: Number(e.target.value) }))}
                                    disabled={['Completed', 'For Final Inspection'].includes(formData.status)}
                                    className="w-full accent-blue-600"
                                />
                                <div className="flex justify-between text-[9px] text-slate-400 font-bold mt-1">
                                    {['0%', '25%', '50%', '75%', '100%'].map(l => <span key={l}>{l}</span>)}
                                </div>
                            </div>
                        )}

                        {formData.status === 'Completed' && (
                            <Field label="Actual Completion Date *">
                                <input type="date" name="actualCompletionDate" value={formData.actualCompletionDate} onChange={handleChange}
                                    className={inputCls + " border-emerald-200 bg-emerald-50/40 focus:ring-emerald-100"} />
                            </Field>
                        )}

                        <Field label="Status As Of Date">
                            <input type="date" name="statusAsOfDate" value={formData.statusAsOfDate} onChange={handleChange} className={inputCls} />
                        </Field>

                        <Field label="Remarks (Optional)">
                            <textarea name="otherRemarks" rows={3} value={formData.otherRemarks} onChange={handleChange}
                                placeholder="Any additional notes about the current status..."
                                className={inputCls + " resize-none"} />
                        </Field>
                    </div>
                );

            // STEP 3: CONTRACT
            case 3:
                return (
                    <div className="space-y-4">
                        <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 space-y-3">
                            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">Bidding Milestones</p>
                            <div className="grid grid-cols-1 gap-3">
                                {[
                                    { label: "Invitation to Bid", name: "issuance_of_invitation_to_bid" },
                                    { label: "Pre-Bid Conference", name: "pre_bid_conference" },
                                    { label: "Opening of Tech. Proposal", name: "opening_of_technical_proposal" },
                                    { label: "Opening of Fin. Proposal", name: "opening_of_financial_proposal" },
                                    { label: "Notice of Award (NOA)", name: "date_notice_of_award" },
                                ].map(f => (
                                    <Field key={f.name} label={f.label}>
                                        <input type="date" name={f.name} value={formData[f.name]} onChange={handleChange} className={inputCls} />
                                    </Field>
                                ))}
                            </div>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contract Award</p>
                            <Field label="Contract ID">
                                <input name="contractId" value={formData.contractId} onChange={handleChange} className={inputCls} placeholder="Contract reference number" />
                            </Field>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Notice to Proceed (NTP)">
                                    <input type="date" name="noticeToProceed" value={formData.noticeToProceed} onChange={handleChange} className={inputCls} />
                                </Field>
                                <Field label="Construction Start">
                                    <input type="date" name="constructionStartDate" value={formData.constructionStartDate} onChange={handleChange} className={inputCls} />
                                </Field>
                            </div>
                            <Field label="Target Completion Date">
                                <input type="date" name="targetCompletionDate" value={formData.targetCompletionDate} onChange={handleChange} className={inputCls} />
                            </Field>
                            <Field label="Contractor Name">
                                <input name="contractorName" value={formData.contractorName} onChange={handleChange} className={inputCls} placeholder="Contractor or supplier name" />
                            </Field>
                        </div>
                    </div>
                );

            // STEP 4: FINANCE
            case 4:
                return (
                    <div className="space-y-4">
                        <div className="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100 space-y-3">
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Financial Records</p>
                            {[
                                { label: "Approved Budget (ABC)", name: "projectAllocation", ph: "0.00" },
                                { label: "Contract Amount", name: "contractAmount", ph: "0.00" },
                                { label: "Funds Utilized", name: "fundsUtilized", ph: "0.00" },
                            ].map(f => (
                                <Field key={f.name} label={f.label}>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-sm">₱</span>
                                        <input type="text" name={f.name} value={formData[f.name]} onChange={handleChange}
                                            className={inputCls + " pl-7"} placeholder={f.ph} />
                                    </div>
                                </Field>
                            ))}
                        </div>
                        <Field label="Implementing Agency">
                            <input name="implementing_agency" value={formData.implementing_agency} onChange={handleChange} className={inputCls} />
                        </Field>
                    </div>
                );

            // STEP 5: LOCATION
            case 5:
                return (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3">
                            <Field label="Latitude">
                                <input type="text" name="latitude" value={formData.latitude} onChange={handleChange} className={inputCls + " font-mono"} placeholder="e.g. 14.5995" />
                            </Field>
                            <Field label="Longitude">
                                <input type="text" name="longitude" value={formData.longitude} onChange={handleChange} className={inputCls + " font-mono"} placeholder="e.g. 120.9842" />
                            </Field>
                        </div>
                        <Field label="Province">
                            <input name="province" value={formData.province} onChange={handleChange} className={inputCls} />
                        </Field>
                        <Field label="Municipality / City">
                            <input name="municipality" value={formData.municipality} onChange={handleChange} className={inputCls} />
                        </Field>
                        <Field label="Legislative District">
                            <input name="legislative_district" value={formData.legislative_district} onChange={handleChange} className={inputCls} />
                        </Field>
                    </div>
                );

            // STEP 6: DOCUMENTATION
            case 6: {
                const DOCS = [
                    { key: 'POW', label: 'Program of Works / POW', icon: '📐', desc: 'Upload the Program of Works or Progress of Work PDF', hasExisting: project.hasPow || project.pow_pdf },
                    { key: 'DUPA', label: 'DUPA', icon: '📊', desc: 'Detailed Unit Price Analysis document', hasExisting: project.hasDupa || project.dupa_pdf },
                    { key: 'CONTRACT', label: 'Signed Contract', icon: '✍️', desc: 'Signed Contract Agreement / Agreement Document', hasExisting: project.hasContract || project.contract_pdf },
                ];
                return (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                            <span className="text-2xl">📂</span>
                            <div>
                                <p className="text-xs font-black text-slate-700">Project Documents</p>
                                <p className="text-[10px] text-slate-500 mt-0.5 leading-tight">Upload or replace the POW, DUPA, and Signed Contract PDFs for this project.</p>
                            </div>
                        </div>
                        {DOCS.map(doc => (
                            <div key={doc.key} className={`p-4 rounded-2xl border-2 transition-all ${ documentFiles[doc.key] ? 'border-blue-300 bg-blue-50/40' : 'border-slate-100 bg-white hover:border-slate-200' }`}>
                                <div className="flex items-center gap-3 mb-2">
                                    <span className="text-xl">{doc.icon}</span>
                                    <div className="flex-1">
                                        <p className="text-xs font-black text-slate-800">{doc.label}</p>
                                        <p className="text-[9px] text-slate-400 leading-tight">{doc.desc}</p>
                                    </div>
                                    {doc.hasExisting && !documentFiles[doc.key] && (
                                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full text-[8px] font-black uppercase tracking-wide">✓ On File</span>
                                    )}
                                    {documentFiles[doc.key] && (
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-200 rounded-full text-[8px] font-black uppercase tracking-wide">New File</span>
                                    )}
                                </div>
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border bg-white ${ documentFiles[doc.key] ? 'border-blue-200' : 'border-slate-100' }`}>
                                    <span className="text-slate-300 text-xs">📄</span>
                                    <input
                                        type="file"
                                        accept="application/pdf"
                                        onChange={e => setDocumentFiles(p => ({ ...p, [doc.key]: e.target.files[0] || null }))}
                                        className="flex-1 text-[11px] font-medium text-slate-600 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-[10px] file:font-black file:bg-blue-50 file:text-blue-600 hover:file:bg-blue-100 cursor-pointer"
                                    />
                                    {documentFiles[doc.key] && (
                                        <button onClick={() => setDocumentFiles(p => ({ ...p, [doc.key]: null }))} className="text-red-400 hover:text-red-600 text-xs font-black">✕</button>
                                    )}
                                </div>
                                {documentFiles[doc.key] && (
                                    <p className="text-[9px] text-blue-500 font-bold mt-1.5 ml-1">📎 {documentFiles[doc.key].name}</p>
                                )}
                            </div>
                        ))}
                    </div>
                );
            }

            default: return null;
        }
    };

    const progressPct = ((detailsStep - 1) / (DETAILS_STEPS.length - 1)) * 100;

    const modal = (
        <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-6 pb-6 px-4 bg-slate-900/70 backdrop-blur-sm">
            <div className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[calc(100vh-3rem)]">

                {/* Header */}
                <div className="px-6 pt-6 pb-4 border-b border-slate-100 shrink-0">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-lg font-black text-slate-800">Edit Project</h2>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest truncate max-w-[280px]">{project.schoolName}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl text-slate-400"><FiX size={20} /></button>
                    </div>

                    {/* 3 Tabs */}
                    <div className="flex gap-1 p-1 bg-slate-100 rounded-2xl">
                        {[
                            { id: 'details', label: '🔧 Details', color: 'blue' },
                            { id: 'vo', label: '⚖️ V.O.', color: 'amber' },
                            { id: 'realign', label: '🔄 Realign', color: 'purple' },
                        ].map(tab => (
                            <button key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex-1 py-2 rounded-xl text-[11px] font-black transition-all ${activeTab === tab.id ? 'bg-white shadow-sm text-' + tab.color + '-600' : 'text-slate-500 hover:bg-white/50'}`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    {/* Details: Progress Bar */}
                    {activeTab === 'details' && (
                        <div className="mt-4">
                            {/* Step Labels */}
                            <div className="flex justify-between mb-2">
                                {DETAILS_STEPS.map(s => (
                                    <button key={s.id} onClick={() => setDetailsStep(s.id)}
                                        className={`flex flex-col items-center gap-0.5 group transition-all ${detailsStep === s.id ? 'scale-105' : 'opacity-50 hover:opacity-70'}`}
                                    >
                                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-sm border-2 transition-all ${detailsStep === s.id ? 'bg-blue-600 border-blue-600 text-white' : detailsStep > s.id ? 'bg-emerald-100 border-emerald-400 text-emerald-700' : 'bg-white border-slate-200 text-slate-400'}`}>
                                            {detailsStep > s.id ? '✓' : s.icon}
                                        </div>
                                        <span className={`text-[8px] font-black uppercase tracking-widest hidden sm:block ${detailsStep === s.id ? 'text-blue-600' : 'text-slate-400'}`}>{s.label}</span>
                                    </button>
                                ))}
                            </div>
                            {/* Progress bar */}
                            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                            </div>
                            {/* Current step desc */}
                            <p className="text-[9px] text-slate-400 font-bold mt-1.5 text-center uppercase tracking-wider">
                                Step {detailsStep} / {DETAILS_STEPS.length} — {DETAILS_STEPS[detailsStep - 1].desc}
                            </p>
                        </div>
                    )}
                </div>

                {/* Scrollable Body */}
                <div ref={bodyRef} className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* ----- DETAILS TAB ----- */}
                    {activeTab === 'details' && renderDetailsStep()}

                    {/* ----- VO TAB ----- */}
                    {activeTab === 'vo' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-amber-50 rounded-2xl border border-amber-200">
                                <span className="text-2xl">⚖️</span>
                                <div>
                                    <p className="text-xs font-black text-amber-900">Variation Order</p>
                                    <p className="text-[10px] text-amber-700 mt-0.5 leading-tight">Record a change to the scope, cost, or timeline of this project.</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <Field label="VO Number">
                                    <input name="vo_number" value={voForm.vo_number || ''} onChange={e => setVoForm(p => ({ ...p, vo_number: e.target.value }))} className={inputCls} placeholder="e.g. VO-01" />
                                </Field>
                                <Field label="VO Type">
                                    <select value={voForm.vo_type} onChange={e => setVoForm(p => ({ ...p, vo_type: e.target.value }))} className={inputCls}>
                                        <option>Additive</option>
                                        <option>Deductive</option>
                                        <option>Combined</option>
                                    </select>
                                </Field>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <Field label="Additive Amount (₱)">
                                    <input type="number" value={voForm.additive_amount || ''} onChange={e => setVoForm(p => ({ ...p, additive_amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                                </Field>
                                <Field label="Deductive Amount (₱)">
                                    <input type="number" value={voForm.deductive_amount || ''} onChange={e => setVoForm(p => ({ ...p, deductive_amount: e.target.value }))} className={inputCls} placeholder="0.00" />
                                </Field>
                            </div>
                            <Field label="Time Extension (Days)">
                                <input type="number" value={voForm.time_extension_days || ''} onChange={e => setVoForm(p => ({ ...p, time_extension_days: e.target.value }))} className={inputCls} placeholder="0" />
                            </Field>
                            <Field label="VO Date">
                                <input type="date" value={voForm.vo_requested_date || ''} onChange={e => setVoForm(p => ({ ...p, vo_requested_date: e.target.value }))} className={inputCls} />
                            </Field>
                            <Field label="Justification / Reason">
                                <textarea rows={4} value={voForm.justification_details || ''} onChange={e => setVoForm(p => ({ ...p, justification_details: e.target.value }))}
                                    placeholder="Describe the reason for the variation order..."
                                    className={inputCls + " resize-none"} />
                            </Field>
                        </div>
                    )}

                    {/* ----- REALIGNMENT TAB ----- */}
                    {activeTab === 'realign' && (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3 p-4 bg-purple-50 rounded-2xl border border-purple-200">
                                <span className="text-2xl">🔄</span>
                                <div>
                                    <p className="text-xs font-black text-purple-900">Project Realignment</p>
                                    <p className="text-[10px] text-purple-700 mt-0.5 leading-tight">Transfer budget to another project within the same category and district.</p>
                                </div>
                            </div>

                            <Field label="Target Project">
                                {isFetchingCandidates ? (
                                    <div className="flex items-center gap-2 p-3 text-[11px] text-slate-400 font-medium">
                                        <div className="w-4 h-4 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> Searching eligible projects...
                                    </div>
                                ) : realignCandidates.length > 0 ? (
                                    <select value={realignForm.targetIpc} onChange={e => setRealignForm(p => ({ ...p, targetIpc: e.target.value }))} className={inputCls}>
                                        <option value="">Select target project...</option>
                                        {realignCandidates.map(c => (
                                            <option key={c.id} value={c.ipc || c.id}>{c.schoolName} – {c.projectName}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <div className="p-3 bg-red-50 border border-red-100 rounded-2xl text-xs text-red-500 font-medium">
                                        ⚠️ No eligible projects found in the same category and district.
                                    </div>
                                )}
                            </Field>
                            <Field label="Justification">
                                <textarea rows={4} value={realignForm.justification || ''} onChange={e => setRealignForm(p => ({ ...p, justification: e.target.value }))}
                                    placeholder="Explain the reason for realignment..."
                                    className={inputCls + " resize-none"} />
                            </Field>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 shrink-0 flex items-center gap-3">
                    {activeTab === 'details' ? (
                        <>
                            {detailsStep > 1 ? (
                                <button onClick={() => setDetailsStep(s => s - 1)} className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all">
                                    ← Back
                                </button>
                            ) : (
                                <button onClick={onClose} className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all">
                                    Cancel
                                </button>
                            )}
                            <div className="flex-1" />
                            {detailsStep < DETAILS_STEPS.length ? (
                                <button onClick={() => setDetailsStep(s => s + 1)}
                                    className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-wider hover:bg-blue-700 shadow-lg shadow-blue-500/25 transition-all hover:-translate-y-0.5 active:scale-95">
                                    Next <FiChevronRight size={14} />
                                </button>
                            ) : (
                                <button onClick={handleSaveDetails} disabled={isSaving}
                                    className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isSaving ? 'bg-slate-200 text-slate-400' : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-lg shadow-emerald-500/25 hover:-translate-y-0.5 active:scale-95'}`}>
                                    {isSaving ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiCheck size={14} /> Save Details</>}
                                </button>
                            )}
                        </>
                    ) : activeTab === 'vo' ? (
                        <>
                            <button onClick={onClose} className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all">Cancel</button>
                            <div className="flex-1" />
                            <button onClick={handleSaveVO} disabled={isSaving}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isSaving ? 'bg-slate-200 text-slate-400' : 'bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-500/25 hover:-translate-y-0.5 active:scale-95'}`}>
                                {isSaving ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiCheck size={14} /> Submit V.O.</>}
                            </button>
                        </>
                    ) : (
                        <>
                            <button onClick={onClose} className="flex items-center gap-2 px-5 py-3 bg-slate-100 text-slate-600 rounded-2xl text-xs font-bold hover:bg-slate-200 transition-all">Cancel</button>
                            <div className="flex-1" />
                            <button onClick={handleSaveRealign} disabled={isSaving || !realignForm.targetIpc}
                                className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-wider ${isSaving || !realignForm.targetIpc ? 'bg-slate-200 text-slate-400' : 'bg-purple-600 text-white hover:bg-purple-700 shadow-lg shadow-purple-500/25 hover:-translate-y-0.5 active:scale-95'}`}>
                                {isSaving ? <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Saving...</> : <><FiCheck size={14} /> Submit Realignment</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    return createPortal(modal, document.body);
};

export default ProjectEditModal;
