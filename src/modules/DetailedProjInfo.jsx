import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { getCachedProjects, cacheGallery, getCachedGallery } from '../db';
import LocationPickerMap from '../components/LocationPickerMap';
import { TbPhoto } from "react-icons/tb";
import { useAuth } from '../context/AuthContext';
import EditProjectModal from '../components/EditProjectModal';
import ProjectEditModal from '../components/ProjectEditModal';
import { LuHistory, LuUser, LuCalendar, LuX, LuInfo, LuMapPin, LuShoppingBag, LuDollarSign, LuFileText, LuImages } from "react-icons/lu";
import { FiSettings, FiImage, FiFileText } from 'react-icons/fi';

// --- SUB-COMPONENT: REMARKS HISTORY ---
const RemarksHistory = ({ history, loading, currentRemarks }) => {
    if (loading) return (
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex justify-center items-center gap-3">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading History...</p>
        </div>
    );

    // Combine history with current if not already present
    // The history endpoint normally returns everything, but this ensures robustness
    const displayHistory = [...history];
    if (currentRemarks && currentRemarks.trim() !== "" && !history.some(h => h.remarks === currentRemarks)) {
        // Only if it's truly "newer" or missing - actually history DESC should have it.
        // But let's trust the history API for the most part.
    }

    const validHistory = displayHistory.filter(h => 
        (h.remarks && h.remarks.trim() !== "") || 
        h.update_type === 'Newly Created' || 
        h.update_type === 'Variation Order' ||
        h.update_type === 'Realignment'
    );

    return (
        <div className="space-y-3">
            <h3 className="text-slate-700 font-bold text-sm flex items-center gap-2 ml-1">
                <LuHistory className="text-blue-500" /> Project Update Log
            </h3>
            {validHistory.length === 0 ? (
                <div className="bg-white p-6 rounded-2xl border border-dashed border-slate-200 flex flex-col items-center justify-center text-center">
                    <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.2em]">No Remarks Logged Yet</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {validHistory.map((entry, idx) => (
                        <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-blue-200 transition-all">
                            <div className="absolute top-0 left-0 w-1 h-full bg-slate-100 group-hover:bg-blue-400 transition-colors"></div>
                            <div className="flex justify-between items-start mb-2 pl-2">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400">
                                        <LuUser size={12} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-600 uppercase tracking-tight">{entry.engineerName}</span>
                                </div>
                                <div className="flex items-center gap-1.5 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
                                    <LuCalendar size={10} className="text-slate-400" />
                                    <span className="text-[9px] font-bold text-slate-500">{entry.statusAsOfDate}</span>
                                </div>
                            </div>
                            <p className="text-xs text-slate-700 font-medium leading-relaxed italic border-l-2 border-slate-100 pl-3">
                                {entry.remarks ? `"${entry.remarks}"` : <span className="text-slate-400 not-italic">No additional remarks provided for this update.</span>}
                            </p>

                            {/* DELAY TRACKING IN HISTORY (REFINED) */}
                            {entry.delay_reason && (
                                <div className="mt-3 p-3 bg-red-50 rounded-xl border border-red-100 border-l-4 border-l-red-500">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-xs">⏳</span>
                                        <span className="text-[10px] font-black text-red-700 uppercase tracking-widest">Timeline Delay Log</span>
                                    </div>
                                    <p className="text-xs text-red-800 font-bold mb-2">Reason: {entry.delay_reason}</p>
                                    <div className="flex flex-wrap gap-2">
                                        <div className="bg-white/50 px-2.5 py-1 rounded-lg border border-red-100 bg-red-50/50">
                                            <span className="text-[8px] font-black text-red-400 uppercase block tracking-tighter">Days Lapsed</span>
                                            <span className="text-[10px] font-black text-red-600">{entry.time_lapsed_days || entry.time_lapsed || entry.days_lapsed || 0} Days</span>
                                        </div>
                                        <div className="bg-white/50 px-2.5 py-1 rounded-lg border border-emerald-100 bg-emerald-50/50">
                                            <span className="text-[8px] font-black text-emerald-400 uppercase block tracking-tighter">Accomplishment</span>
                                            <span className="text-[10px] font-black text-emerald-600">{entry.time_lapsed_percentage || 0}%</span>
                                        </div>
                                        {entry.revised_target_completion_date && (
                                            <div className="bg-white/50 px-2.5 py-1 rounded-lg border border-blue-100 bg-blue-50/50">
                                                <span className="text-[8px] font-black text-blue-400 uppercase block tracking-tighter">Revised Target</span>
                                                <span className="text-[10px] font-black text-blue-600">{new Date(entry.revised_target_completion_date).toLocaleDateString()}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div className="mt-2 flex items-center gap-1.5 pl-2">
                                <span className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Update Type:</span>
                                <span className="text-[9px] font-bold text-blue-500 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">{entry.update_type || 'Status Update'}</span>
                                <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                <span className="text-[9px] font-bold text-slate-400">{entry.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// --- SUB-COMPONENT: VO COMPARISON ---
const VOComparison = ({ current, previous }) => {
    if (!previous) return null;

    const fieldsToCompare = [
        { key: 'projectName', label: 'Project Name' },
        { key: 'projectCategory', label: 'Category' },
        { key: 'scopeOfWork', label: 'Scope of Work' },
        { key: 'approved_budget_for_contract', label: 'Approved Budget for Contract (ABC)', isMoney: true },
        { key: 'contract_amount', label: 'Contract Amount', isMoney: true },
        { key: 'batchOfFunds', label: 'Batch' },
        { key: 'contractorName', label: 'Contractor' },
        { key: 'numberOfClassrooms', label: 'Classrooms' },
        { key: 'numberOfStoreys', label: 'Storeys' },
        { key: 'numberOfSites', label: 'Sites' },
        { key: 'targetCompletionDate', label: 'Target Completion' },
        { key: 'noticeToProceed', label: 'Notice to Proceed' },
        { key: 'constructionStartDate', label: 'Construction Start' },
        { key: 'fundsUtilized', label: 'Funds Utilized', isMoney: true },
        { key: 'latitude', label: 'Latitude' },
        { key: 'longitude', label: 'Longitude' },
        { key: 'vo_number', label: 'VO Number' },
        { key: 'vo_requested_date', label: 'Requested Date' },
        { key: 'vo_requested_by', label: 'Requested By' },
        { key: 'funding_year', label: 'Funding Year' }
    ];

    const changes = fieldsToCompare.filter(field => {
        let val1 = current[field.key];
        let val2 = previous[field.key];
        
        // Normalize for comparison
        if (field.isMoney) {
            val1 = Number(val1 || 0);
            val2 = Number(val2 || 0);
        } else {
            val1 = String(val1 || '').trim();
            val2 = String(val2 || '').trim();
        }
        
        return val1 !== val2;
    });

    if (changes.length === 0) return (
        <div className="bg-emerald-50/30 border border-emerald-100 p-3 rounded-xl">
            <p className="text-[10px] text-emerald-600 font-bold text-center italic">VO Snapshot: Specification values matched previous record.</p>
        </div>
    );

    return (
        <div className="space-y-2 mt-4">
            <h4 className="text-[9px] font-black text-amber-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse"></span>
                Variation Changes (Old vs New)
            </h4>
            <div className="grid grid-cols-1 gap-2">
                {changes.map(field => (
                    <div key={field.key} className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-amber-100 shadow-sm overflow-hidden group hover:border-amber-300 transition-all">
                        <p className="text-[9px] font-black text-amber-600 uppercase mb-2 tracking-wider">{field.label}</p>
                        <div className="flex items-center gap-2">
                            {/* Old */}
                            <div className="flex-1 min-w-0">
                                <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Previous</div>
                                <div className="text-xs font-bold text-slate-500 line-through decoration-slate-300 truncate">
                                    {field.isMoney ? `₱${Number(previous[field.key] || 0).toLocaleString()}` : (previous[field.key] || 'N/A')}
                                </div>
                            </div>
                            
                            {/* Arrow */}
                            <div className="flex-none text-amber-400 font-black text-lg group-hover:translate-x-1 transition-transform">→</div>
                            
                            {/* New */}
                            <div className="flex-1 min-w-0">
                                <div className="text-[8px] font-bold text-amber-700 uppercase mb-0.5">Updated</div>
                                <div className="text-xs font-black text-amber-900 truncate">
                                    {field.isMoney ? `₱${Number(current[field.key] || 0).toLocaleString()}` : (current[field.key] || 'N/A')}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: VO HISTORY LIST ---
const VOHistoryList = ({ voHistory, loading }) => {
    if (loading) return (
        <div className="bg-amber-50/50 p-6 rounded-2xl border border-amber-100 flex justify-center items-center gap-3">
            <div className="w-4 h-4 border-2 border-slate-200 border-t-amber-500 rounded-full animate-spin"></div>
            <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest">Loading VO Details...</p>
        </div>
    );

    if (!voHistory || voHistory.length === 0) return null;

    return (
        <div className="space-y-4 mb-8">
            <div className="flex items-center justify-between ml-1 mb-2">
                <h3 className="text-amber-700 font-bold text-sm flex items-center gap-2">
                    <span className="text-lg">⚖️</span> Variation Order History
                </h3>
                <span className="text-[10px] font-black bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full border border-amber-200 uppercase tracking-tighter">EFD Records</span>
            </div>
            
            <div className="space-y-4">
                {voHistory.map((vo, idx) => {
                   const netVal = parseFloat(vo.net_vo_amount || 0);
                   const isAdditive = netVal >= 0;
                   return (
                    <div key={idx} className={`bg-white rounded-[2rem] border overflow-hidden shadow-sm transition-all hover:shadow-md ${isAdditive ? 'border-emerald-100 hover:border-emerald-300' : 'border-red-100 hover:border-red-300'}`}>
                        {/* Header Section */}
                        <div className={`p-4 flex flex-wrap items-center justify-between gap-3 ${isAdditive ? 'bg-emerald-50/30' : 'bg-red-50/30'}`}>
                           <div className="flex items-center gap-3">
                               <div className={`w-10 h-10 rounded-2xl flex items-center justify-center text-lg shadow-sm border ${isAdditive ? 'bg-white text-emerald-600 border-emerald-100' : 'bg-white text-red-600 border-red-100'}`}>
                                   {isAdditive ? '➕' : '➖'}
                               </div>
                               <div>
                                   <div className="flex items-center gap-2">
                                       <span className="text-xs font-black text-slate-800 tracking-tight">VO #{vo.vo_sequence_no || vo.vo_number || idx + 1}</span>
                                       <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${isAdditive ? 'bg-emerald-100 text-emerald-700 border-emerald-200' : 'bg-red-100 text-red-700 border-red-200'}`}>
                                           {vo.vo_type || 'Variation Order'}
                                       </span>
                                   </div>
                                   <div className="flex items-center gap-1.5 mt-0.5">
                                       <LuCalendar size={10} className="text-slate-400" />
                                       <span className="text-[10px] font-bold text-slate-500">{vo.requested_date ? new Date(vo.requested_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A'}</span>
                                   </div>
                               </div>
                           </div>
                           <div className="text-right">
                               <span className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-0.5">Net Variation</span>
                               <span className={`text-sm font-black ${isAdditive ? 'text-emerald-600' : 'text-red-600'}`}>
                                   {isAdditive ? '+' : ''}₱{Number(Math.abs(netVal)).toLocaleString()}
                               </span>
                           </div>
                        </div>

                        {/* Details Grid */}
                        <div className="p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-slate-50">
                            <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Contract Amount</span>
                                <span className="text-[11px] font-bold text-slate-600 underline decoration-slate-200 decoration-dotted underline-offset-4">₱{Number(vo.revised_contract_amount || 0).toLocaleString()}</span>
                            </div>
                            <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Time Extension</span>
                                <span className="text-[11px] font-bold text-blue-600 tracking-tight">{vo.time_extension_days || 0} Days</span>
                            </div>
                            <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">Expiry Date</span>
                                <span className="text-[11px] font-bold text-slate-600">{vo.revised_expiry_date ? new Date(vo.revised_expiry_date).toLocaleDateString() : 'N/A'}</span>
                            </div>
                            <div>
                                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest block mb-1">CAF Reference</span>
                                <span className="text-[11px] font-bold text-slate-500 italic truncate block">{vo.caf_reference || 'NONE'}</span>
                            </div>
                        </div>

                        {/* Documents Section */}
                        {(vo.revised_pow_pdf || vo.revised_dupa_pdf || vo.revised_contract_pdf) && (
                            <div className="px-5 pb-5 flex flex-wrap gap-2">
                                <span className="w-full text-[8px] font-black text-slate-300 uppercase tracking-widest mb-1 flex items-center gap-2">
                                    <div className="h-[1px] flex-1 bg-slate-50"></div>
                                    Supporting Documents
                                    <div className="h-[1px] flex-1 bg-slate-50"></div>
                                </span>
                                {vo.revised_pow_pdf && (
                                    <a href={vo.revised_pow_pdf.startsWith('data:') || vo.revised_pow_pdf.startsWith('/uploads/') ? vo.revised_pow_pdf : `data:application/pdf;base64,${vo.revised_pow_pdf}`} download={`Revised_POW_${vo.ipc}_VO${vo.vo_sequence_no}.pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-blue-600 rounded-lg border border-slate-100 text-[10px] font-bold hover:bg-blue-50 transition-colors">
                                        📄 POW
                                    </a>
                                )}
                                {vo.revised_dupa_pdf && (
                                    <a href={vo.revised_dupa_pdf.startsWith('data:') || vo.revised_dupa_pdf.startsWith('/uploads/') ? vo.revised_dupa_pdf : `data:application/pdf;base64,${vo.revised_dupa_pdf}`} download={`Revised_DUPA_${vo.ipc}_VO${vo.vo_sequence_no}.pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-blue-600 rounded-lg border border-slate-100 text-[10px] font-bold hover:bg-blue-50 transition-colors">
                                        📄 DUPA
                                    </a>
                                )}
                                {vo.revised_contract_pdf && (
                                    <a href={vo.revised_contract_pdf.startsWith('data:') || vo.revised_contract_pdf.startsWith('/uploads/') ? vo.revised_contract_pdf : `data:application/pdf;base64,${vo.revised_contract_pdf}`} download={`Revised_Contract_${vo.ipc}_VO${vo.vo_sequence_no}.pdf`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 text-blue-600 rounded-lg border border-slate-100 text-[10px] font-bold hover:bg-blue-50 transition-colors">
                                        📄 CONTRACT
                                    </a>
                                )}
                            </div>
                        )}

                        {/* Justification Footer */}
                        {(vo.justification || vo.justification_details) && (
                            <div className="px-5 py-3 bg-slate-50/50 border-t border-slate-50 space-y-1">
                                {vo.justification_category && (
                                    <span className="text-[8px] font-black bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                        {vo.justification_category}
                                    </span>
                                )}
                                <p className="text-[10px] text-slate-500 leading-relaxed font-medium">
                                    <span className="font-black text-slate-400 uppercase tracking-tighter mr-2">Reason:</span>
                                    {vo.justification_details || vo.justification}
                                </p>
                            </div>
                        )}
                    </div>
                   )
                })}
            </div>
        </div>
    );
};

// --- SUB-COMPONENT: REALIGNMENT COMPARISON ---
const RealignmentComparison = ({ current, previous, remarks }) => {
    if (!previous) return null;

    // Try to extract source school name from remarks
    let sourceSchool = 'School B';
    if (remarks) {
        const match = remarks.match(/from (.*?) \(Full/);
        if (match && match[1]) sourceSchool = match[1];
        else {
            const sourceMatch = remarks.match(/transferred to (.*)\./);
            if (sourceMatch && sourceMatch[1]) sourceSchool = sourceMatch[1];
        }
    }

    const fieldsToCompare = [
        { key: 'projectName', label: 'Project Name' },
        { key: 'projectCategory', label: 'Category' },
        { key: 'scopeOfWork', label: 'Scope of Work' },
        { key: 'approved_budget_for_contract', label: 'Approved Budget for Contract (ABC)', isMoney: true },
        { key: 'contract_amount', label: 'Contract Amount', isMoney: true },
        { key: 'numberOfClassrooms', label: 'Classrooms' },
        { key: 'numberOfStoreys', label: 'Storeys' },
        { key: 'numberOfSites', label: 'Sites' },
        { key: 'contractorName', label: 'Contractor' },
        { key: 'batchOfFunds', label: 'Batch' },
        { key: 'targetCompletionDate', label: 'Target Completion' },
        { key: 'noticeToProceed', label: 'Notice to Proceed' },
        { key: 'constructionStartDate', label: 'Construction Start' }
    ];

    const changes = fieldsToCompare.filter(field => {
        let val1 = current[field.key];
        let val2 = previous[field.key];
        
        if (field.isMoney) {
            val1 = Number(val1 || 0);
            val2 = Number(val2 || 0);
        } else {
            val1 = String(val1 || '').trim();
            val2 = String(val2 || '').trim();
        }
        
        return val1 !== val2;
    });

    if (changes.length === 0) return (
        <div className="bg-purple-50/30 border border-purple-100 p-3 rounded-xl">
            <p className="text-[10px] text-purple-600 font-bold text-center italic uppercase tracking-tighter">Inherited technical specifications matched previous record.</p>
        </div>
    );

    const isSource = remarks?.includes('transferred to');

    return (
        <div className="space-y-2 mt-4">
            <h4 className="text-[9px] font-black text-purple-700 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse"></span>
                {isSource ? 'Out-migration Details (Allocation Transfer)' : 'In-migration Details (Project Transfer)'}
            </h4>
            <div className="grid grid-cols-1 gap-2">
                {changes.map(field => (
                    <div key={field.key} className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-purple-100 shadow-sm overflow-hidden group hover:border-purple-300 transition-all">
                        <p className="text-[9px] font-black text-purple-600 uppercase mb-2 tracking-wider">{field.label}</p>
                        <div className="flex items-center gap-2">
                            {/* Old (Original) */}
                            <div className="flex-1 min-w-0">
                                <div className="text-[8px] font-bold text-slate-400 uppercase mb-0.5">Original ({current.schoolName})</div>
                                <div className="text-xs font-bold text-slate-500 line-through decoration-slate-300 truncate">
                                    {field.isMoney ? `₱${Number(previous[field.key] || 0).toLocaleString()}` : (previous[field.key] || 'N/A')}
                                </div>
                            </div>
                            
                            {/* Arrow */}
                            <div className="flex-none text-purple-400 font-black text-lg group-hover:translate-x-1 transition-transform">→</div>
                            
                            {/* New (Inherited) */}
                            <div className="flex-1 min-w-0">
                                <div className="text-[8px] font-bold text-purple-700 uppercase mb-0.5">
                                    {isSource ? 'Revised Value' : `Inherited (${sourceSchool})`}
                                </div>
                                <div className="text-xs font-black text-purple-900 truncate">
                                    {field.isMoney ? `₱${Number(current[field.key] || 0).toLocaleString()}` : (current[field.key] || 'N/A')}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const DetailedProjInfo = () => {
    const { user } = useAuth();
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type'); // 'LGU' or null
    const [project, setProject] = useState(null);
    const [formData, setFormData] = useState({});
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState(0);
    const [isEditMode, setIsEditMode] = useState(false);

    // History State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);
    const [voHistory, setVoHistory] = useState([]);
    const [voHistoryLoading, setVoHistoryLoading] = useState(false);

    // New State for Images
    const [projectImages, setProjectImages] = useState([]);
    const [imageLoading, setImageLoading] = useState(true);

    // --- FORM/EDIT STATE ---
    const [internalFiles, setInternalFiles] = useState([]);
    const [internalPreviews, setInternalPreviews] = useState([]);
    const [externalFiles, setExternalFiles] = useState([]);
    const [externalPreviews, setExternalPreviews] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [selectedZoomImage, setSelectedZoomImage] = useState(null);
    const [activeCategory, setActiveCategory] = useState('Internal');
    const [userRole, setUserRole] = useState(null);
    const [accountCategory, setAccountCategory] = useState(null);
    
    // Edit Modal State (single modal with 3 tabs)
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [detailsModalOpen, setDetailsModalOpen] = useState(false);
    const [voModalOpen, setVoModalOpen] = useState(false);
    const [realignModalOpen, setRealignModalOpen] = useState(false);

    const TABS = [
        { id: 0, label: 'Overview', icon: <LuInfo size={16} /> },
        { id: 1, label: 'Location', icon: <LuMapPin size={16} /> },
        { id: 2, label: 'Procurement', icon: <LuShoppingBag size={16} /> },
        { id: 3, label: 'Finance', icon: <LuDollarSign size={16} /> },
        { id: 4, label: 'Progress', icon: <LuImages size={16} /> },
        { id: 5, label: 'Documents', icon: <LuFileText size={16} /> }
    ];


    // Helper to extract image source correctly
    const getImageSrc = (imageItem) => {
        if (!imageItem) return null;
        if (imageItem.image_url) return imageItem.image_url;
        
        // Handle image_data specifically
        let data = imageItem.image_data;
        if (!data) return null;

        // 1. If it's an object, extract the actual string
        if (typeof data === 'object' && data !== null) {
            data = data.image_data || data.base64 || data.url || JSON.stringify(data);
        }

        // 2. If it's a JSON string, parse it
        if (typeof data === 'string' && data.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(data);
                data = parsed.image_data || parsed.base64 || parsed.url || data;
            } catch (e) {
                console.warn("Failed to parse image JSON", e);
            }
        }

        // 3. Ensure we have a string for the final checks
        if (typeof data !== 'string') return null;

        // 4. Handle standard data URI, URL, or file path
        if (data.startsWith('data:') || data.startsWith('http') || data.startsWith('/uploads/')) {
            return data;
        }

        // 5. Otherwise assume it's raw base64 and wrap it
        return `data:image/jpeg;base64,${data}`;
    };

    // Helper to get consistently filtered images for gallery
    const getFilteredImages = (category) => {
        return projectImages.filter(img => {
            const cat = (img.category || 'Internal').toLowerCase();
            const hasData = (img.image_url || (img.image_data && img.image_data !== ''));
            if (!hasData) return false;
            
            if (category.toLowerCase() === 'external') {
                return cat === 'external';
            } else {
                return cat !== 'external' && cat !== 'default';
            }
        }).sort((a, b) => new Date(b.uploaded_at || b.created_at || 0) - new Date(a.uploaded_at || a.created_at || 0));
    };


    // Refs
    const fileInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);

    const API_BASE = ""; // Or import from config

    useEffect(() => {
        const fetchProjectDetails = async () => {
            console.log("DEBUG: fetchProjectDetails started with ID:", id);
            if (!id || id === 'undefined' || id === 'null') {
                console.error("DEBUG: Invalid project ID detected:", id);
                setIsLoading(false);
                return;
            }

            // Stale-While-Revalidate Strategy
            try {
                // 1. Immediate Cache Load
                console.log("DEBUG: Attempting cache load...");
                try {
                    const cachedProjects = await getCachedProjects();
                    console.log("DEBUG: Cached projects retrieved, count:", cachedProjects?.length);
                    const foundProject = cachedProjects.find(p => String(p.id) === String(id));
                    if (foundProject) {
                        console.log("DEBUG: Project found in cache:", foundProject.schoolName);
                        setProject(foundProject);
                    } else {
                        console.log("DEBUG: Project not found in cache for ID:", id);
                    }
                } catch (err) {
                    console.warn("DEBUG: Cache read failed", err);
                }

                // 2. Network Request (Background Sync)
                console.log("DEBUG: Starting network fetch for ID:", id);
                try {
                    const response = await fetch(`/api/projects/${id}?_t=${Date.now()}`);
                    console.log("DEBUG: Network response status:", response.status);
                    if (!response.ok) throw new Error("Project not found");
                    const data = await response.json();
                    console.log("DEBUG: Network data received for:", data.schoolName);
                    setProject(data);
                    setFormData(data); // Sync form data
                } catch (err) {
                    console.warn("DEBUG: Network fetch failed, attempting LGU fallback:", err);
                    if (type === 'LGU') {
                        console.log("DEBUG: Fetching LGU project...");
                        // LGU Fetch
                        const response = await fetch(`/api/lgu/project/${id}`);
                        console.log("DEBUG: LGU response status:", response.status);
                        if (!response.ok) throw new Error("LGU Project not found");
                        const data = await response.json();
                        console.log("DEBUG: LGU data received");
                        
                        // MAP LGU Data ... (logic remains same)
                        const mappedProject = {
                            id: data.project_id,
                            schoolId: data.school_id,
                            schoolName: data.school_name,
                            projectName: data.project_name,
                            projectCategory: 'LGU Project',
                            ipc: data.ipc,
                            status: data.status,
                            accomplishmentPercentage: data.accomplishment_percentage,
                            otherRemarks: data.other_remarks,
                            noticeToProceed: data.noticeToProceed,
                            constructionStartDate: data.construction_start_date,
                            targetCompletionDate: data.targetCompletionDate,
                            actualCompletionDate: data.actualCompletionDate,
                            statusAsOfDate: data.statusAsOfDate,
                            contractorName: data.contractor_name,
                            scopeOfWork: data.scope_of_works || data.scope_of_work,
                            projectAllocation: data.project_allocation,
                            batchOfFunds: data.batch_of_funds || data.fund_source,
                            fundsUtilized: data.funds_utilized,
                            numberOfClassrooms: null,
                            numberOfStoreys: null,
                            numberOfSites: null,
                            region: data.region,
                            division: data.division,
                            pow_pdf: data.pow_pdf,
                            dupa_pdf: data.dupa_pdf,
                            contract_pdf: data.contract_pdf,
                            latitude: data.latitude,
                            longitude: data.longitude,
                            lguData: {
                                sourceAgency: data.source_agency,
                                lsbResolutionNo: data.lsb_resolution_no,
                                moaRefNo: data.moa_ref_no,
                                validityPeriod: data.validity_period,
                                contractDuration: data.contract_duration,
                                modeOfProcurement: data.mode_of_procurement,
                                philgepsRefNo: data.philgeps_ref_no,
                                pcabLicenseNo: data.pcab_license_no,
                                dateContractSigning: data.date_contract_signing,
                                bidAmount: data.bid_amount,
                                natureOfDelay: data.nature_of_delay
                            },
                            isDonated: data.is_donated || false,
                            program_type: data.is_donated ? 'Donated' : 'BEFF',
                            images: data.images || []
                        };

                        setProject(mappedProject);
                        setFormData(mappedProject); // Sync form data

                        if (data.images) {
                            setProjectImages(data.images);
                            setImageLoading(false);
                        }
                    } else {
                        console.log("DEBUG: Not LGU mode, evaluating offline fallback");
                        if (!project) {
                            const cachedProjects = await getCachedProjects();
                            const foundProject = cachedProjects.find(p => String(p.id) === String(id));
                            if (!foundProject) {
                                console.log("DEBUG: Final fallback - project not found anywhere");
                                alert("Could not load project details (Offline & Not Cached).");
                                navigate('/engineer-dashboard');
                            }
                        }
                    }
                }
            } catch (finalErr) {
                console.error("DEBUG: Critical Fetch Error:", finalErr);
                if (!project) {
                    alert("Unable to load project details.");
                    navigate(-1);
                }
            } finally {
                console.log("DEBUG: Setting isLoading to false");
                setIsLoading(false);
            }
        };

        if (user) {
            setUserRole(user.role);
            setAccountCategory(user.account_category);
        }
        fetchProjectDetails();
        const fetchImages = async () => {
            if (type === 'LGU') return; // LGU images handled in main fetch

            setImageLoading(true);
            try {
                // Network First
                const res = await fetch(`/api/project-images/${id}?t=${Date.now()}`);
                const data = await res.json();

                if (Array.isArray(data)) {
                    setProjectImages(data);
                    // Update Gallery Cache
                    await cacheGallery(id, data);
                } else {
                    console.warn("API did not return an array for images:", data);
                    setProjectImages([]);
                }
            } catch (error) {
                console.warn("Online gallery load failed, checking cache:", error);

                // Cache Fallback
                try {
                    const cachedImages = await getCachedGallery(id);
                    if (cachedImages && cachedImages.length > 0) {
                        setProjectImages(cachedImages);
                    }
                } catch (cacheErr) {
                    console.error("Cache retrieval failed", cacheErr);
                }
            } finally {
                setImageLoading(false);
            }
        };

        const fetchHistory = async (ipc) => {
            setHistoryLoading(true);
            try {
                const res = await fetch(`/api/project-history/${ipc}`);
                if (!res.ok) throw new Error("Failed to fetch history");
                const data = await res.json();
                setHistory(data);
            } catch (err) {
                console.error("History fetch error:", err);
            } finally {
                setHistoryLoading(false);
            }
        };

        fetchProjectDetails();
        fetchImages();
        // Since project details fetch might update IPC, we handle history fetch there or when project is set
    }, [id, navigate]);

    useEffect(() => {
        if (selectedZoomImage !== null) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [selectedZoomImage]);

    useEffect(() => {
        if (!project?.ipc) return;

        const fetchHistory = async () => {
            setHistoryLoading(true);
            try {
                const res = await fetch(`/api/project-history/${project.ipc}`);
                if (!res.ok) throw new Error("Failed to fetch history");
                const data = await res.json();
                setHistory(data);
            } catch (err) {
                console.error("History fetch error:", err);
            } finally {
                setHistoryLoading(false);
            }
        };

        const fetchVOHistory = async () => {
            setVoHistoryLoading(true);
            try {
                const res = await fetch(`/api/projects/variation-orders/${project.ipc}`);
                if (res.ok) {
                    const data = await res.json();
                    setVoHistory(data);
                }
            } catch (err) {
                console.error("VO History Fetch Err:", err);
            } finally {
                setVoHistoryLoading(false);
            }
        };

        fetchHistory();
        fetchVOHistory();
    }, [project?.ipc]);

    // --- HANDLERS ---

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Limit to 100MB
        const validFiles = files.filter(file => file.size <= 100 * 1024 * 1024);
        const newPreviews = validFiles.map(file => URL.createObjectURL(file));

        if (activeCategory === 'Internal') {
            setInternalFiles(prev => [...prev, ...validFiles]);
            setInternalPreviews(prev => [...prev, ...newPreviews]);
        } else {
            setExternalFiles(prev => [...prev, ...validFiles]);
            setExternalPreviews(prev => [...prev, ...newPreviews]);
        }

        e.target.value = null;
    };

    const removeFile = (index, category) => {
        if (category === 'Internal') {
            setInternalFiles(prev => prev.filter((_, i) => i !== index));
            setInternalPreviews(prev => prev.filter((_, i) => i !== index));
        } else {
            setExternalFiles(prev => prev.filter((_, i) => i !== index));
            setExternalPreviews(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleChange = (e) => {
        let { name, value } = e.target;
        // Numeric constraint for School ID
        if (name === 'schoolId') {
            value = value.replace(/\D/g, '');
            if (value.length > 6) value = value.slice(0, 6);
        }
        // Force Uppercase
        if (['contractorName', 'projectName', 'scopeOfWork', 'batchOfFunds'].includes(name)) {
            value = value.toUpperCase();
        }

        // Auto-comma
        if (['approved_budget_for_contract', 'contract_amount', 'fundsUtilized'].includes(name)) {
            const raw = value.replace(/,/g, '').replace(/[^0-9.]/g, '');
            if (!raw) {
                value = '';
            } else {
                const parts = raw.split('.');
                parts[0] = Number(parts[0]).toLocaleString('en-US');
                value = parts.join('.');
            }
        }

        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSaveProject = async () => {
        const uid = user ? user.uid : localStorage.getItem('uid');
        if (!uid) return;

        setIsUploading(true);
        try {
            // APPEND LOGIC: We use POST to create a NEW row instead of PUT to update existing
            // The backend handles this as a newest version if unique constraints allow or if we just insert
            
            const payload = { 
                ...formData, 
                uid: uid, 
                engineer_id: uid,
                modifiedBy: user?.first_name || "Engineer",
                update_type: 'Details Update'
            };

            const response = await fetch(`${API_BASE}/api/projects`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });
            
            if (!response.ok) throw new Error("Failed to append new project version");
            const resData = await response.json();

            // Handle images if any new ones were added
            const allFiles = [
                ...internalFiles.map(f => ({ file: f, category: 'Internal' })),
                ...externalFiles.map(f => ({ file: f, category: 'External' }))
            ];

            if (allFiles.length > 0) {
                for (const item of allFiles) {
                    try {
                        const formData = new FormData();
                        formData.append('image', item.file);
                        formData.append('projectId', resData.id);
                        formData.append('uploadedBy', uid);
                        formData.append('category', item.category);
                        await fetch(`${API_BASE}/api/upload-image`, { method: "POST", body: formData });
                    } catch (err) {
                        console.error("Image upload failed", err);
                    }
                }
            }

            alert("✅ SUCCESS\n\nNew project version has been appended to history.");
            setIsEditMode(false);
            setInternalFiles([]);
            setExternalFiles([]);
            // For now simplest is to reload page or re-fetch images? 
            // Let's just append locally for immediate feedback if we had the image data, but we sent base64.
            // Re-fetching images is safer.
            const res = await fetch(`/api/project-images/${id}`);
            const data = await res.json();
            if (Array.isArray(data)) setProjectImages(data);

        } catch (err) {
            console.error("Save Error:", err);
            alert("Sync error. Try again later.");
        } finally {
            setIsUploading(false);
        }
    };


    if (isLoading) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading details...</div>;
    if (!project) return null;

    // --- RENDER HELPERS ---
    const SectionHeader = ({ title }) => (
        <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4 border-b border-slate-100 pb-2 mt-6 first:mt-0">
            {title}
        </h2>
    );

    const Field = ({ label, name, value, type = 'text', options = [] }) => {
        if (!isEditMode) {
            const isMoney = type === 'money';
            const displayValue = isMoney ? `₱${Number(value || 0).toLocaleString()}` : (value || '---');
            return (
                <div className="mb-4 group">
                    <p className="text-[9px] uppercase font-black text-slate-400 mb-0.5 tracking-tighter opacity-70">{label}</p>
                    <p className="text-[13px] font-bold text-slate-800 leading-tight">
                        {displayValue}
                    </p>
                </div>
            );
        }

        const inputClass = "w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all";
        
        if (type === 'select') {
            return (
                <div className="mb-4">
                    <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">{label}</label>
                    <select name={name} value={formData[name] || ''} onChange={handleChange} className={inputClass}>
                        <option value="">Select {label}</option>
                        {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                </div>
            );
        }

        return (
            <div className="mb-4">
                <label className="text-[10px] uppercase font-black text-slate-400 mb-1 block">{label}</label>
                <input
                    type={type === 'date' ? 'date' : 'text'}
                    name={name}
                    value={formData[name] || ''}
                    onChange={handleChange}
                    className={inputClass}
                    placeholder={`Enter ${label}`}
                />
            </div>
        );
    };

    const renderOverview = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-1 mt-2">
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-0">Construction Status</h2>
                <button 
                  onClick={() => setEditModalOpen(true)}
                  className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-blue-100 active:scale-95 transition-all"
                >
                  Update Status
                </button>
            </div>
            <div className="bg-[#004A99] p-6 rounded-3xl shadow-xl mb-6 text-white overflow-hidden relative">
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-white/10 rounded-full blur-2xl"></div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60 mb-1">Overall Accomplishment</p>
                <div className="flex items-end gap-2">
                    <span className="text-5xl font-black">{isEditMode ? formData.accomplishmentPercentage : project.accomplishmentPercentage}%</span>
                    <span className="text-xs font-bold mb-2 opacity-60 uppercase">Complete</span>
                </div>
                {isEditMode && (
                   <input 
                      type="range" 
                      name="accomplishmentPercentage" 
                      min="0" max="100" 
                      value={formData.accomplishmentPercentage || 0} 
                      onChange={handleChange}
                      className="w-full mt-4 accent-white"
                   />
                )}
            </div>

            <div className="grid grid-cols-2 gap-4">
                <Field label="Current Status" name="status" value={project.status} type="select" options={['Not Yet Started', 'Ongoing', 'For Final Inspection', 'Completed']} />
                <Field label="Status As Of" name="statusAsOfDate" value={project.statusAsOfDate} type="date" />
            </div>

            <SectionHeader title="Project Identity" />
            <Field label="Project Name" name="projectName" value={project.projectName} />
            <Field label="School ID" name="schoolId" value={project.schoolId} />
            <Field label="School Name" name="schoolName" value={project.schoolName} />
            
            <SectionHeader title="Classification" />
            <div className="grid grid-cols-2 gap-4">
                <Field label="Category" name="projectCategory" value={project.projectCategory} />
                <Field label="Program Type" name="program_type" value={project.program_type} />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <Field label="Funding Year" name="funding_year" value={project.funding_year} />
                <Field label="Batch of Funds" name="batchOfFunds" value={project.batchOfFunds} />
            </div>

            <SectionHeader title="Physical Progress" />
            <div className="grid grid-cols-3 gap-4">
                <Field label="Classrooms" name="numberOfClassrooms" value={project.numberOfClassrooms} />
                <Field label="Storeys" name="numberOfStoreys" value={project.numberOfStoreys} />
                <Field label="Sites" name="numberOfSites" value={project.numberOfSites} />
            </div>
        </div>
    );

    const renderLocation = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Geographic Coordinates" />
            <div className="grid grid-cols-2 gap-4 mb-6">
                <Field label="Latitude" name="latitude" value={project.latitude} />
                <Field label="Longitude" name="longitude" value={project.longitude} />
            </div>
            
            {(project.latitude && project.longitude) && (
                <div className="rounded-3xl overflow-hidden shadow-2xl border border-slate-200 h-80 relative z-0">
                    <LocationPickerMap
                        latitude={isEditMode ? formData.latitude : project.latitude}
                        longitude={isEditMode ? formData.longitude : project.longitude}
                        disabled={!isEditMode}
                        onLocationSelect={(lat, lon) => {
                            setFormData(prev => ({ ...prev, latitude: lat, longitude: lon }));
                        }}
                    />
                </div>
            )}
        </div>
    );

    const renderProcurement = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Bidding Milestones" />
            <div className="grid grid-cols-1 gap-1">
                <Field label="Invitation to Bid" name="issuance_of_invitation_to_bid" value={project.issuance_of_invitation_to_bid} type="date" />
                <Field label="Pre-Bid Conference" name="pre_bid_conference" value={project.pre_bid_conference} type="date" />
                <Field label="Opening of Tech. Proposal" name="opening_of_technical_proposal" value={project.opening_of_technical_proposal} type="date" />
                <Field label="Opening of Fin. Proposal" name="opening_of_financial_proposal" value={project.opening_of_financial_proposal} type="date" />
            </div>
            
            <SectionHeader title="Contract Award" />
            <div className="grid grid-cols-1 gap-1">
                <Field label="Notice of Award (NOA)" name="date_notice_of_award" value={project.date_notice_of_award} type="date" />
                <Field label="Contract ID" name="contractId" value={project.contractId} />
                <Field label="Notice to Proceed (NTP)" name="noticeToProceed" value={project.noticeToProceed} type="date" />
            </div>
        </div>
    );


    const renderFinance = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            <SectionHeader title="Financial Records" />
            <Field label="Approved Budget (ABC)" name="projectAllocation" value={project.projectAllocation} type="money" />
            <Field label="Contract Amount" name="contractAmount" value={project.contractAmount} type="money" />
            <Field label="Funds Utilized" name="fundsUtilized" value={project.fundsUtilized} type="money" />
            
            <SectionHeader title="Entity Details" />
            <Field label="Contractor Name" name="contractorName" value={project.contractorName} />
            <Field label="Implementing Agency" name="implementing_agency" value={project.implementing_agency} />
        </div>
    );

    const renderMedia = () => {
        const sortedImages = [...projectImages].sort((a, b) => new Date(b.uploaded_at || b.created_at || 0) - new Date(a.uploaded_at || a.created_at || 0));
        const featured = sortedImages[0];
        const others = sortedImages.slice(1);

        return (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
                <SectionHeader title="Progress Documentation" />
                
                {sortedImages.length === 0 ? (
                    <div className="bg-slate-50 rounded-3xl p-12 flex flex-col items-center justify-center text-center border-2 border-dashed border-slate-200">
                        <LuImages size={48} className="text-slate-300 mb-4" />
                        <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">No documentation photos yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Featured Recent Photo */}
                        {featured && (
                            <div 
                                onClick={() => setSelectedZoomImage({ ...featured, src: getImageSrc(featured) })}
                                className="relative aspect-[16/10] rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white group cursor-pointer active:scale-[0.98] transition-all"
                            >
                                <img 
                                    src={getImageSrc(featured)} 
                                    alt="Most Recent Update" 
                                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute top-6 right-6 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                                    <span className="w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    Most Recent Update
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black/80 via-black/20 to-transparent">
                                    <p className="text-[10px] font-black text-white/70 uppercase tracking-[0.2em] mb-1">Captured Date</p>
                                    <p className="text-lg font-bold text-white">
                                        {new Date(featured.uploaded_at || featured.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Previous Photos Grid */}
                        {others.length > 0 && (
                            <div className="grid grid-cols-2 gap-3 mt-4">
                                {others.map((img, idx) => (
                                    <div 
                                        key={idx}
                                        onClick={() => setSelectedZoomImage({ ...img, src: getImageSrc(img) })}
                                        className="relative aspect-square rounded-[2rem] overflow-hidden shadow-lg border-2 border-white group cursor-pointer active:scale-95 transition-all"
                                    >
                                        <img 
                                            src={getImageSrc(img)} 
                                            alt={`Update ${idx + 2}`} 
                                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                                        />
                                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                        <div className="absolute bottom-3 left-3 bg-white/20 backdrop-blur-md px-2 py-0.5 rounded-full border border-white/20">
                                             <p className="text-[7px] font-black text-white uppercase tracking-widest">
                                                 {img.date_captured ? new Date(img.date_captured).toLocaleDateString() : 'Previous'}
                                             </p>
                                        </div>
                                    </div>
                                ))}
                                
                                <div 
                                    onClick={() => navigate(`/project-gallery/${id}`)}
                                    className="aspect-square bg-blue-600 rounded-[2rem] flex flex-col items-center justify-center border-2 border-white shadow-lg active:scale-95 transition-all cursor-pointer group overflow-hidden relative"
                                >
                                    <TbPhoto size={32} className="text-white mb-2" />
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest text-center px-2">Total {sortedImages.length} Documentation Photos</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
                
                {isEditMode && (
                    <div onClick={() => cameraInputRef.current?.click()} className="w-full bg-blue-50 p-4 rounded-2xl flex items-center justify-center gap-2 border-2 border-dashed border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer group">
                        <LuImages size={20} className="text-blue-400" />
                        <span className="text-[10px] font-black text-blue-500 uppercase">Add Progress Photo</span>
                    </div>
                )}
            </div>
        );
    };

    const renderDocuments = () => (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <SectionHeader title="Essential Documents" />
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl overflow-hidden divide-y divide-slate-50">
                {['pow_pdf', 'dupa_pdf', 'contract_pdf'].map(docKey => (
                    <div key={docKey} className="flex justify-between items-center p-5 group">
                        <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-blue-50 text-blue-500 rounded-xl flex items-center justify-center">
                                <LuFileText size={20} />
                            </div>
                            <div>
                                <p className="text-[11px] font-black text-slate-700 uppercase tracking-widest">{docKey.replace('_pdf', '').toUpperCase()}</p>
                            </div>
                        </div>
                        {project[docKey] ? (
                            <a href={project[docKey].startsWith('data:') || project[docKey].startsWith('/uploads/') ? project[docKey] : `data:application/pdf;base64,${project[docKey]}`} download={`${project.schoolName}_${docKey}.pdf`} className="bg-blue-600 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all active:scale-95">Download</a>
                        ) : (
                            <span className="text-[10px] font-black text-slate-300 uppercase italic px-4">Missing</span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    return (
        <>
        <PageTransition>
            <div className="min-h-screen bg-slate-50 pb-24">
                {/* --- PREMIUM HEADER --- */}
                <div className="bg-[#004A99] px-6 pt-10 pb-20 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl"></div>
                    
                    <div className="flex justify-between items-start relative z-10">
                        <button onClick={() => navigate(-1)} className="p-2 -ml-2 bg-white/10 rounded-xl text-white hover:bg-white/20 transition-all">
                            <LuX size={20} />
                        </button>
                        
                        <div className="flex gap-2">
                             {isEditMode && (
                                <button 
                                    onClick={() => setIsEditMode(false)}
                                    className="px-4 py-2 bg-red-500 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-red-900/40 active:scale-95 transition-all"
                                >
                                    Cancel
                                </button>
                             )}
                        </div>
                    </div>

                    <div className="mt-6 relative z-10">
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></div>
                            <span className="text-[9px] font-black text-white/50 uppercase tracking-[0.2em]">{project.projectCategory}</span>
                        </div>
                        <h1 className="text-2xl font-black text-white leading-tight tracking-tight mb-4">{project.schoolName}</h1>
                        
                        {/* Tab Stepper */}
                        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex-none flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                        activeTab === tab.id 
                                        ? 'bg-white text-[#004A99] shadow-lg scale-105' 
                                        : 'bg-white/10 text-white/60 hover:bg-white/20'
                                    }`}
                                >
                                    {tab.icon}
                                    <span className="hidden sm:inline">{tab.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- CONTENT AREA --- */}
                <div className="px-5 -mt-10 relative z-20">
                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 min-h-[400px]">
                        {activeTab === 0 && renderOverview()}
                        {activeTab === 1 && renderLocation()}
                        {activeTab === 2 && renderProcurement()}
                        {activeTab === 3 && renderFinance()}
                        {activeTab === 4 && renderMedia()}
                        {activeTab === 5 && renderDocuments()}
                    </div>
                </div>

                {/* --- STICKY FOOTER NAVIGATION / SAVE --- */}
                {isEditMode ? (
                    <div className="fixed bottom-0 left-0 right-0 p-5 bg-white/80 backdrop-blur-xl border-t border-slate-100 z-[100] animate-in slide-in-from-bottom-full duration-500">
                        <button
                            onClick={handleSaveProject}
                            disabled={isUploading}
                            className="w-full bg-[#004A99] text-white py-4 rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-blue-900/40 active:scale-95 transition-all flex items-center justify-center gap-2"
                        >
                            {isUploading ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                    Saving...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </button>
                        <p className="text-center text-[8px] font-bold text-slate-400 mt-2 uppercase tracking-tighter">
                            Saving will create a new historical record in the database.
                        </p>
                    </div>
                ) : (
                    <div className="fixed bottom-0 left-0 right-0 p-5 z-[50]">
                         <div className="max-w-xs mx-auto bg-white/90 backdrop-blur-md px-6 py-4 rounded-3xl shadow-2xl border border-white flex justify-between items-center">
                             <button 
                                onClick={() => setActiveTab(prev => Math.max(0, prev - 1))}
                                disabled={activeTab === 0}
                                className={`p-2 rounded-xl transition-all ${activeTab === 0 ? 'text-slate-200' : 'text-[#004A99] bg-blue-50'}`}
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                             </button>
                             
                             <div className="flex gap-1.5">
                                 {TABS.map(t => (
                                     <div key={t.id} className={`h-1.5 rounded-full transition-all ${activeTab === t.id ? 'w-6 bg-[#004A99]' : 'w-1.5 bg-slate-200'}`}></div>
                                 ))}
                             </div>

                             <button 
                                onClick={() => setActiveTab(prev => Math.min(TABS.length - 1, prev + 1))}
                                disabled={activeTab === TABS.length - 1}
                                className={`p-2 rounded-xl transition-all ${activeTab === TABS.length - 1 ? 'text-slate-200' : 'text-[#004A99] bg-blue-50'}`}
                             >
                                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
                             </button>
                         </div>
                    </div>
                )}


                {/* --- ZOOM MODAL (PORTALLED) --- */}
                {selectedZoomImage && createPortal(
                    <div 
                        className="fixed inset-0 bg-black/95 z-[9999] flex flex-col items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-300"
                        onClick={() => setSelectedZoomImage(null)}
                    >
                        <button 
                            onClick={() => setSelectedZoomImage(null)}
                            className="absolute top-10 right-6 w-12 h-12 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all z-[10000] border border-white/10 shadow-xl"
                        >
                            <LuX size={24} />
                        </button>

                        <div className="w-full max-w-4xl h-[70vh] flex items-center justify-center relative" onClick={e => e.stopPropagation()}>
                            {/* Loading state for the high-res image */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white/20 -z-10">
                                <div className="w-10 h-10 border-2 border-white/5 border-t-white/40 rounded-full animate-spin mb-2"></div>
                                <span className="text-[10px] font-bold uppercase tracking-widest">Loading Photo</span>
                            </div>

                            <img 
                                src={selectedZoomImage.src || getImageSrc(selectedZoomImage)} 
                                alt="preview" 
                                className="max-w-full max-h-full object-contain rounded-xl shadow-2xl ring-1 ring-white/10 animate-in zoom-in-95 duration-500" 
                                style={{ transform: 'translateZ(0)' }} // Hardware acceleration
                                onLoad={(e) => {
                                    e.target.style.opacity = '1';
                                }}
                                onError={(e) => {
                                    console.error("Zoom image failed to load");
                                    const fallback = getImageSrc(selectedZoomImage);
                                    if (fallback && e.target.src !== fallback) {
                                        e.target.src = fallback;
                                    } else {
                                        e.target.parentElement.innerHTML = '<div class="text-white/50 text-center flex flex-col items-center gap-3"><span class="text-4xl">📷</span><p class="text-[10px] font-bold uppercase tracking-widest">Image Unavailable</p></div>';
                                    }
                                }}
                            />
                        </div>

                        {/* Metadata Footer */}
                        <div className="mt-8 text-center text-white max-w-lg animate-in slide-in-from-bottom-6 duration-500" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <span className="bg-blue-600/30 text-blue-400 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-500/20">
                                    {selectedZoomImage.category || 'Documentation'}
                                </span>
                            </div>
                            <h3 className="text-lg font-bold mb-1 px-4">{project.schoolName || 'Project Photo'}</h3>
                            <p className="text-xs text-slate-400">
                                Captured on {new Date(selectedZoomImage.uploaded_at || selectedZoomImage.created_at || Date.now()).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </p>
                            <p className="text-[10px] text-slate-500 mt-2 uppercase tracking-tighter opacity-40">Secure Site Proof</p>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </PageTransition>

        <ProjectEditModal
            project={project}
            isOpen={editModalOpen}
            onClose={() => setEditModalOpen(false)}
            onSaveDetails={async (payload, siteImages = []) => {
                try {
                    const isFormData = payload instanceof FormData;
                    const projectId = isFormData ? payload.get('id') : payload.id;
                    const res = await fetch(`/api/update-project/${projectId}`, {
                        method: 'PUT',
                        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
                        body: isFormData ? payload : JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error('Update failed');
                    const resData = await res.json();

                    // Orchestrate Site Image Uploads if any
                    if (siteImages.length > 0) {
                        // Small delay to ensure snapshot is ready for linking
                        await new Promise(resolve => setTimeout(resolve, 800));

                        for (const item of siteImages) {
                            try {
                                const base64Image = await compressImage(item.file);
                                await fetch(`/api/upload-image`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({
                                        projectId: resData.project.project_id, // Link to the NEW snapshot ID
                                        imageData: base64Image,
                                        uploadedBy: user?.uid,
                                        category: item.category
                                    }),
                                });
                            } catch (err) {
                                console.error("Image upload failed:", err);
                            }
                        }
                    }

                    alert('✅ SUCCESS\n\nProject details and site photos have been saved.');
                    setEditModalOpen(false);
                    window.location.reload();
                } catch (err) { 
                    console.error("Save Error:", err);
                    alert('Error: ' + err.message); 
                }
            }}
            onSaveVO={async (payload) => {
                try {
                    const isFormData = payload instanceof FormData;
                    const projectId = isFormData ? payload.get('id') : payload.id;
                    const res = await fetch(`/api/update-project/${projectId}`, {
                        method: 'PUT',
                        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
                        body: isFormData ? payload : JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error('Update failed');
                    alert('✅ Variation Order recorded!');
                    setEditModalOpen(false);
                    window.location.reload();
                } catch (err) { alert('Error: ' + err.message); }
            }}
            onSaveRealign={async (payload) => {
                try {
                    const isFormData = payload instanceof FormData;
                    const projectId = isFormData ? payload.get('id') : payload.id;
                    const res = await fetch(`/api/update-project/${projectId}`, {
                        method: 'PUT',
                        headers: isFormData ? {} : { 'Content-Type': 'application/json' },
                        body: isFormData ? payload : JSON.stringify(payload),
                    });
                    if (!res.ok) throw new Error('Update failed');
                    alert('✅ Realignment submitted!');
                    setEditModalOpen(false);
                    window.location.reload();
                } catch (err) { alert('Error: ' + err.message); }
            }}
        />
        </>
    );
};

export default DetailedProjInfo;