import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { getCachedProjects, cacheGallery, getCachedGallery } from '../db';
import LocationPickerMap from '../components/LocationPickerMap';
import { TbPhoto } from "react-icons/tb";
import { auth } from '../firebase';
import EditProjectModal from '../components/EditProjectModal';
import { compressImage } from '../utils/imageCompression';
import { LuHistory, LuUser, LuCalendar } from "react-icons/lu";

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
        { key: 'vo_requested_by', label: 'Requested By' }
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
    const { id } = useParams();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const type = searchParams.get('type'); // 'LGU' or null
    const [project, setProject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // History State
    const [history, setHistory] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(true);

    // New State for Images
    const [projectImages, setProjectImages] = useState([]);
    const [imageLoading, setImageLoading] = useState(true);

    // --- EDIT MODAL STATE ---
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [internalFiles, setInternalFiles] = useState([]);
    const [internalPreviews, setInternalPreviews] = useState([]);
    const [externalFiles, setExternalFiles] = useState([]);
    const [externalPreviews, setExternalPreviews] = useState([]);
    const [activeCategory, setActiveCategory] = useState('Internal');

    // Refs
    const fileInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);

    const API_BASE = ""; // Or import from config

    useEffect(() => {
        const fetchProjectDetails = async () => {
            // Stale-While-Revalidate Strategy

            // 1. Immediate Cache Load
            try {
                const cachedProjects = await getCachedProjects();
                const foundProject = cachedProjects.find(p => String(p.id) === String(id));
                if (foundProject) {
                    setProject(foundProject);
                    setIsLoading(false); // Render fast
                }
            } catch (err) {
                console.warn("Cache read failed", err);
            }

            // 2. Network Request (Background Sync)
            try {
                const response = await fetch(`/api/projects/${id}?_t=${Date.now()}`);
                if (!response.ok) throw new Error("Project not found");
                const data = await response.json();
                setProject(data);

                // TODO: Update cache with new details if needed (currently we only cache list)
                // For a robust app, we might want to update the single item in the `projects_cache` array here.

            } catch (err) {
                if (type === 'LGU') {
                    // LGU Fetch
                    try {
                        const response = await fetch(`/api/lgu/project/${id}`);
                        if (!response.ok) throw new Error("LGU Project not found");
                        const data = await response.json();

                        // MAP LGU Data to Component State Format
                        const mappedProject = {
                            id: data.project_id,
                            schoolId: data.school_id,
                            schoolName: data.school_name,
                            projectName: data.project_name,
                            projectCategory: 'LGU Project', // Or derive
                            ipc: data.ipc,
                            status: data.status,
                            accomplishmentPercentage: data.accomplishment_percentage,
                            otherRemarks: data.other_remarks,

                            // Dates (API already formatted these in the specific endpoint)
                            noticeToProceed: data.noticeToProceed,
                            constructionStartDate: data.construction_start_date,
                            targetCompletionDate: data.targetCompletionDate,
                            actualCompletionDate: data.actualCompletionDate,
                            statusAsOfDate: data.statusAsOfDate,

                            // Financial
                            contractorName: data.contractor_name,
                            scopeOfWork: data.scope_of_works || data.scope_of_work, // LGU uses plural in some places?
                            projectAllocation: data.project_allocation, // or contract_amount?
                            batchOfFunds: data.batch_of_funds || data.fund_source, // Map fund source here or separate?
                            fundsUtilized: data.funds_utilized,

                            // Specs
                            numberOfClassrooms: null, // LGU might not have this
                            numberOfStoreys: null,
                            numberOfSites: null,

                            region: data.region,
                            division: data.division,

                            // Docs
                            pow_pdf: data.pow_pdf,
                            dupa_pdf: data.dupa_pdf,
                            contract_pdf: data.contract_pdf,

                            // Loc
                            latitude: data.latitude,
                            longitude: data.longitude,
                            // Extra LGU Fields
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
                            // IMAGES (LGU endpoint returns them included)
                            images: data.images || []
                        };

                        setProject(mappedProject);

                        // Perform direct image set since LGU endpoint returns them
                        if (data.images) {
                            setProjectImages(data.images);
                            setImageLoading(false);
                        }

                    } catch (lguErr) {
                        console.error("LGU Fetch Failed:", lguErr);
                        // Logic: If NO project in state (cache failed/empty) AND network failed -> Show Error
                        // ... (existing error logic)
                        alert("Could not load LGU project details.");
                        navigate('/lgu-projects');
                    }
                    return; // Exit main try/catch flow
                }

                console.warn("Network fetch failed:", err);
                // If we have cached data, we are fine.
                // If we didn't have cache, we might want to show error or navigate away
                if (!project) {
                    // Logic: If NO project in state (cache failed/empty) AND network failed -> Show Error
                    const cachedProjects = await getCachedProjects();
                    const foundProject = cachedProjects.find(p => String(p.id) === String(id));
                    if (!foundProject) {
                        alert("Could not load project details (Offline & Not Cached).");
                        navigate('/engineer-dashboard');
                    }
                }
            } finally {
                // Ensure loading state is off eventually
                setIsLoading(false);
            }
        };

        const fetchImages = async () => {
            if (type === 'LGU') return; // LGU images handled in main fetch

            setImageLoading(true);
            try {
                // Network First
                const res = await fetch(`/api/project-images/${id}`);
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
        if (project?.ipc) {
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
            fetchHistory();
        }
    }, [project?.ipc]);

    // --- HANDLERS ---

    const handleFileUpload = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        // Limit removed
        const validFiles = files.filter(file => file.size <= 5 * 1024 * 1024);
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

    const handleSaveProject = async (updatedProject) => {
        const user = auth.currentUser;
        if (!user) return;

        // CHECK: Mandatory Location
        // CHECK: Mandatory Location REMOVED per user request
        // if (!updatedProject.latitude || !updatedProject.longitude) {
        //     alert("⚠️ LOCATION REQUIRED\n\nPlease capture the project coordinates (Latitude/Longitude) before saving.");
        //     return;
        // }

        setIsUploading(true);
        try {
            // 1. Update Project Details
            const body = { ...updatedProject, uid: user.uid, modifiedBy: "Engineer" }; // Simplify userName for now or fetch it

            const response = await fetch(`${API_BASE}/api/update-project/${updatedProject.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error("Update failed");

            // 2. Upload Images
            const allFiles = [
                ...internalFiles.map(f => ({ file: f, category: 'Internal' })),
                ...externalFiles.map(f => ({ file: f, category: 'External' }))
            ];

            if (allFiles.length > 0) {
                for (const item of allFiles) {
                    try {
                        const base64Image = await compressImage(item.file);
                        await fetch(`${API_BASE}/api/upload-image`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ projectId: updatedProject.id, imageData: base64Image, uploadedBy: user.uid, category: item.category }),
                        });
                    } catch (err) {
                        console.error("Compression failed for file:", item.file.name, err);
                    }
                }
            }

            // 3. Refresh Data
            setProject(updatedProject);
            alert("Success: Project details updated!");
            setInternalFiles([]);
            setExternalFiles([]);
            setEditModalOpen(false);

            // Trigger refresh of images (optional, or just append locally)
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

    // Helper for display fields
    const DetailItem = ({ label, value, isMoney }) => (
        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">{label}</p>
            <p className="text-sm font-semibold text-slate-800">
                {isMoney && value ? `₱${(Number(value)).toLocaleString()}` : (value || 'N/A')}
            </p>
        </div>
    );

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 pb-10">
                {/* Header */}
                <div className="bg-[#004A99] px-6 pt-8 pb-16 rounded-b-[2.5rem] shadow-lg relative">
                    <button onClick={() => navigate(-1)} className="absolute top-8 left-6 text-blue-200 hover:text-white text-sm font-bold flex items-center gap-1">
                        ← Back
                    </button>

                    {/* EDIT BUTTON REMOVED PER USER REQUEST */}

                    <div className="mt-8 text-center relative z-10">
                        {/* Premium ID Badges */}
                        <div className="flex flex-wrap justify-center items-center gap-3 mb-4">
                            {/* School ID Pill */}
                            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 shadow-lg group hover:bg-white/15 transition-all">
                                <span className="text-[9px] text-blue-200 uppercase font-black tracking-widest group-hover:text-blue-100 transition-colors">School ID</span>
                                <div className="h-3 w-[1px] bg-white/20"></div>
                                <span className="text-sm text-white font-mono font-bold tracking-wider shadow-black drop-shadow-sm">{project.schoolId}</span>
                            </div>

                             {/* IPC Pill */}
                             {project.ipc && (
                                 <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/20 backdrop-blur-md rounded-xl border border-emerald-400/30 shadow-lg shadow-emerald-900/20 group hover:bg-emerald-500/30 transition-all">
                                     <span className="text-[9px] text-emerald-200 uppercase font-black tracking-widest group-hover:text-emerald-100 transition-colors">InsightEd Project Code</span>
                                     <div className="h-3 w-[1px] bg-emerald-400/30"></div>
                                     <span className="text-sm text-emerald-50 font-mono font-bold tracking-wider shadow-black drop-shadow-sm">{project.ipc}</span>
                                 </div>
                             )}

                             {/* VO Badge */}
                             {project.hasVariationOrder && (
                                 <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/20 backdrop-blur-md rounded-xl border border-amber-400/30 shadow-lg shadow-amber-900/20 animate-pulse">
                                     <span className="text-[9px] text-amber-200 uppercase font-black tracking-widest">Variation Order</span>
                                     <div className="h-3 w-[1px] bg-amber-400/30"></div>
                                     <span className="text-sm text-amber-50 font-black tracking-wider">ACTIVE</span>
                                 </div>
                             )}

                             {/* Realignment Badge */}
                             {project.isRealigned && (
                                 <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/20 backdrop-blur-md rounded-xl border border-purple-400/30 shadow-lg shadow-purple-900/20">
                                     <span className="text-[9px] text-purple-200 uppercase font-black tracking-widest">Realignment</span>
                                     <div className="h-3 w-[1px] bg-purple-400/30"></div>
                                     <span className="text-sm text-purple-50 font-black tracking-wider uppercase">{project.updateType?.replace('Realignment (', '').replace(')', '') || 'ACTIVE'}</span>
                                 </div>
                             )}
                         </div>

                        <h1 className="text-2xl sm:text-3xl font-black text-white leading-tight tracking-tight drop-shadow-md">{project.schoolName}</h1>
                        <div className="mt-2 inline-block px-4 py-1.5 rounded-full border border-blue-400/30 bg-blue-900/30 backdrop-blur-sm">
                            <p className="text-[10px] uppercase font-black tracking-widest text-blue-200 mb-0.5">{project.projectCategory || 'Infrastructure Project'}</p>
                            <p className="text-blue-50 text-xs sm:text-sm font-bold leading-relaxed">
                                {project.projectName}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="px-5 -mt-8 relative z-10 space-y-4">

                    {/* Status Card */}
                    <div className="bg-white p-5 rounded-2xl shadow-md border-l-4 border-blue-500 mb-4">
                        <div className="flex justify-between items-center mb-4 pb-4 border-b border-slate-100">
                            <div>
                                <p className="text-xs text-slate-500 font-bold uppercase">Status of Construction Phase</p>
                                <p className="text-lg font-bold text-[#004A99]">{project.status_of_construction_phase || project.status}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-3xl font-bold text-slate-200">{project.accomplishmentPercentage}%</p>
                                <p className="text-[10px] text-slate-400">Completion</p>
                            </div>
                        </div>
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">Status Design Phase</p>
                                <p className="text-sm font-semibold text-slate-700">{project.status_design_phase || project.statusDesignPhase || 'N/A'}</p>
                            </div>
                        </div>
                    </div>

                    {/* Timeline Section */}
                    <div>
                        <h3 className="text-slate-700 font-bold text-sm mb-2 ml-1">Timeline</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <DetailItem label="Notice to Proceed" value={project.noticeToProceed} />
                            <DetailItem label="Start of Construction" value={project.constructionStartDate} />
                            <DetailItem label="Target Completion" value={project.targetCompletionDate} />

                            {/* Actual Completion with Late Logic */}
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden">
                                <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Actual Completion</p>
                                <p className={`text-sm font-semibold ${project.actualCompletionDate && project.targetCompletionDate && new Date(project.actualCompletionDate) > new Date(project.targetCompletionDate)
                                    ? "text-red-600"
                                    : "text-slate-800"
                                    }`}>
                                    {project.actualCompletionDate || 'N/A'}
                                </p>
                                {project.actualCompletionDate && project.targetCompletionDate && new Date(project.actualCompletionDate) > new Date(project.targetCompletionDate) && (
                                    <div className="absolute top-0 right-0 bg-red-100 text-red-600 text-[9px] font-bold px-2 py-1 rounded-bl-lg">
                                        LATE
                                    </div>
                                )}
                            </div>

                            <DetailItem label="Status As Of" value={project.statusAsOfDate} />
                        </div>
                    </div>

                    {/* Financial & Contractor Section */}
                    <div>
                        <h3 className="text-slate-700 font-bold text-sm mb-2 ml-1">Project Details</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem label="Contractor" value={project.contractorName} />
                                <DetailItem label="Contract ID" value={project.contract_id || project.contractId} />
                            </div>
                            <DetailItem label="Scope of Work" value={project.scopeOfWork} />
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem 
                                    label="Approved Budget for Contract (ABC)" 
                                    value={history.length > 0 ? (history[history.length - 1].approved_budget_for_contract || history[history.length - 1].projectAllocation || history[history.length - 1].project_allocation) : (project.projectAllocation || project.approved_budget_for_contract || 0)} 
                                    isMoney 
                                />
                                <DetailItem label="Contract Amount" value={project.contractAmount || project.contract_amount} isMoney />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem label="Savings" value={project.savings !== undefined && project.savings !== null ? project.savings : (Number(history.length > 0 ? (history[history.length - 1].approved_budget_for_contract || history[history.length - 1].projectAllocation || history[history.length - 1].project_allocation) : (project.projectAllocation || project.approved_budget_for_contract || 0)) - Number(project.contractAmount || project.contract_amount || 0))} isMoney />
                                <DetailItem label="Batch of Funds" value={project.batchOfFunds} />
                            </div>
                            <DetailItem label="Remarks" value={project.otherRemarks} />

                    {/* Procurement Milestones Section */}
                    <div className="mt-6 mb-6">
                        <h3 className="text-slate-700 font-bold text-sm mb-2 ml-1 flex items-center gap-2"><span>⚖️</span> Procurement Milestones</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Issuance of Invitation to Bid</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.issuance_of_invitation_to_bid || project.issuanceOfInvitationToBid || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Pre-Bid Conference</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.pre_bid_conference || project.preBidConference || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Opening of Tech. Proposal</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.opening_of_technical_proposal || project.openingOfTechnicalProposal || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Opening of Fin. Proposal</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.opening_of_financial_proposal || project.openingOfFinancialProposal || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Request for Quotation</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.request_for_quotation || project.requestForQuotation || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Negotiation</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.negotiation || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Opening of Quotation</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.opening_of_quotation || project.openingOfQuotation || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] uppercase font-bold text-slate-400 mb-0.5">Notice of Award</p>
                                    <p className="text-xs font-semibold text-slate-700">{project.date_notice_of_award || project.dateNoticeOfAward || 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                            {/* --- VARIATION ORDER DISPLAY --- */}
                            {project.hasVariationOrder && (
                                <div className="bg-amber-50/50 p-4 rounded-xl border border-amber-200 shadow-sm space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 bg-amber-100 rounded flex items-center justify-center text-amber-600 text-[10px]">⚖️</div>
                                        <h4 className="text-[10px] font-black text-amber-800 uppercase tracking-widest">Variation Order (VO)</h4>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-amber-600 mb-0.5">VO Number</p>
                                            <p className="text-sm font-bold text-amber-900">{project.vo_number || project.variation_order_no || 'N/A'}</p>
                                        </div>
                                        <div>
                                            <p className="text-[9px] uppercase font-bold text-amber-600 mb-0.5">Requested Date</p>
                                            <p className="text-sm font-bold text-amber-900">{project.vo_requested_date || project.vo_approval_date || project.variation_order_date || 'N/A'}</p>
                                        </div>
                                    </div>
                                    {(() => {
                                        const originalABC = Number(history.length > 0 ? (history[history.length - 1].approved_budget_for_contract || history[history.length - 1].projectAllocation || history[history.length - 1].project_allocation) : project.approved_budget_for_contract || project.projectAllocation || 0);
                                        const revisedABC = Number(project.approved_budget_for_contract || project.projectAllocation || 0);
                                        const voAdded = revisedABC - originalABC;

                                        return (
                                            <>
                                                <div className="grid grid-cols-2 gap-3">
                                                    <div className="bg-white/50 p-2 rounded-lg border border-amber-100">
                                                        <p className="text-[9px] uppercase font-black text-amber-600 mb-0.5">VO Amount (Added to ABC)</p>
                                                        <p className="text-sm font-black text-amber-900">
                                                            ₱{voAdded.toLocaleString()}
                                                        </p>
                                                    </div>
                                                    <div className="bg-amber-500 p-2 rounded-lg shadow-inner">
                                                        <p className="text-[9px] uppercase font-black text-white/80 mb-0.5">Revised ABC</p>
                                                        <p className="text-sm font-black text-white drop-shadow-sm">
                                                            ₱{revisedABC.toLocaleString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-[9px] text-amber-600 italic font-medium mt-1">
                                                    Original ABC: ₱{originalABC.toLocaleString()}
                                                </div>
                                            </>
                                        );
                                    })()}
                                    {project.vo_requested_by && (
                                        <div className="bg-white/40 p-2 rounded-lg border border-amber-100/50">
                                            <p className="text-[9px] uppercase font-black text-amber-600 mb-0.5">Requested By</p>
                                            <p className="text-[11px] font-bold text-amber-900 uppercase">{project.vo_requested_by}</p>
                                        </div>
                                    )}
                                    {project.otherRemarks && (
                                        <div className="pt-2 border-t border-amber-100">
                                            <p className="text-[9px] uppercase font-bold text-amber-600 mb-0.5">VO Remarks / Justification</p>
                                            <p className="text-[11px] font-medium text-amber-800 italic leading-relaxed">"{project.otherRemarks}"</p>
                                        </div>
                                    )}

                                    {/* --- VO SIDE-BY-SIDE COMPARISON --- */}
                                    <VOComparison 
                                        current={project} 
                                        // History is ordered DESC, current project ID is the latest (idx 0).
                                        // Previous version is idx 1.
                                        previous={history.length > 1 ? history[1] : null}
                                    />
                                    {project.variationOrderPdf && (
                                        <div className="pt-2">
                                            <a 
                                                href={project.variationOrderPdf?.startsWith('data:') ? project.variationOrderPdf : `data:application/pdf;base64,${project.variationOrderPdf}`} 
                                                download={`${project.schoolName}_Signed_VO.pdf`}
                                                className="w-full flex items-center justify-center gap-2 py-2 bg-amber-500 text-white rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-amber-600 transition-all shadow-sm"
                                            >
                                                <span>📄</span> View signed VO Document
                                            </a>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* --- REALIGNMENT DISPLAY --- */}
                            {project.isRealigned && (
                                <div className="bg-purple-50/50 p-4 rounded-xl border border-purple-200 shadow-sm space-y-3">
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className="w-6 h-6 bg-purple-100 rounded flex items-center justify-center text-purple-600 text-[10px]">🔄</div>
                                        <h4 className="text-[10px] font-black text-purple-800 uppercase tracking-widest">Project Realignment</h4>
                                    </div>
                                    <div className="bg-white/50 p-3 rounded-lg border border-purple-100">
                                        <p className="text-[9px] uppercase font-black text-purple-600 mb-1">Type of Adjustment</p>
                                        <div className="flex items-center gap-2">
                                            <div className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                                project.updateType?.includes('Source') 
                                                ? 'bg-red-100 text-red-700 border border-red-200' 
                                                : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                                            }`}>
                                                {project.updateType === 'Realignment (Source)' ? 'FUNDS TRANSFERRED OUT' : 'FUNDS RECEIVED'}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    {project.otherRemarks && (
                                        <div className="bg-purple-900/5 p-3 rounded-lg border border-purple-100/50 italic">
                                            <p className="text-[9px] uppercase font-black text-purple-600/70 mb-1 not-italic tracking-tighter">Realignment Details</p>
                                            <p className="text-sm font-medium text-purple-900 leading-relaxed">
                                                "{project.otherRemarks}"
                                            </p>
                                        </div>
                                    )}

                                        <div className="text-[9px] text-purple-500 font-medium px-1 flex items-center gap-1">
                                            <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                                            This project's technical specifications and allocation were updated via a complete Project Transfer.
                                        </div>

                                        {/* --- REALIGNMENT SIDE-BY-SIDE COMPARISON --- */}
                                        <RealignmentComparison 
                                            current={project}
                                            remarks={project.otherRemarks}
                                            // The previous state is the record before the realignment happened
                                            previous={history.length > 1 ? history[1] : null}
                                        />
                                </div>
                            )}

                            {/* Physical Specs */}
                            <div className="grid grid-cols-3 gap-3">
                                <DetailItem label="Classrooms" value={project.numberOfClassrooms} />
                                <DetailItem label="Storeys" value={project.numberOfStoreys} />
                                <DetailItem label="Sites" value={project.numberOfSites} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem label="Region" value={project.region} />
                                <DetailItem label="Division" value={project.division} />
                            </div>
                        </div>
                    </div>

                    {/* LGU SPECIFIC DETAILS SECTION */}
                    {project.lguData && (
                        <div>
                            <h3 className="text-slate-700 font-bold text-sm mb-2 ml-1">LGU Procurement & Agreement</h3>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailItem label="Source Agency" value={project.lguData.sourceAgency} />
                                    <DetailItem label="Mode of Procurement" value={project.lguData.modeOfProcurement} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailItem label="LSB Res. No." value={project.lguData.lsbResolutionNo} />
                                    <DetailItem label="MOA Ref No." value={project.lguData.moaRefNo} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailItem label="Validity Period" value={project.lguData.validityPeriod} />
                                    <DetailItem label="Contract Duration" value={project.lguData.contractDuration} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailItem label="PhilGEPS Ref" value={project.lguData.philgepsRefNo} />
                                    <DetailItem label="PCAB License" value={project.lguData.pcabLicenseNo} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <DetailItem label="Bid Amount" value={project.lguData.bidAmount} isMoney />
                                    <DetailItem label="Contract Signing" value={project.lguData.dateContractSigning} />
                                </div>
                                {project.lguData.natureOfDelay && (
                                    <div className="text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">
                                        <p className="text-[10px] uppercase font-bold opacity-70 mb-1">Nature of Delay</p>
                                        <p className="text-sm font-semibold">{project.lguData.natureOfDelay}</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}



                    {/* Documents Section */}
                    <div>
                        <h3 className="text-slate-700 font-bold text-sm mb-2 ml-1">Project Documents</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-2">
                            {['pow_pdf', 'dupa_pdf', 'contract_pdf'].map(docKey => {
                                const docValue = project[docKey];
                                let label = docKey.replace('_pdf', '').toUpperCase();
                                return (
                                    <div key={docKey} className="flex justify-between items-center p-2 border-b border-slate-50 last:border-0">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 bg-red-50 text-red-500 rounded-lg">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" /><polyline points="14 2 14 8 20 8" /><path d="M10 13l-2.5 2.5 2.5 2.5" /><path d="M13 13l2.5 2.5-2.5 2.5" /></svg>
                                            </div>
                                            <span className="text-xs font-bold text-slate-700">{label}</span>
                                        </div>
                                        {docValue ? (
                                            <a
                                                href={docValue?.startsWith('data:') ? docValue : `data:application/pdf;base64,${docValue}`}
                                                download={`${project.schoolName}_${label}.pdf`}
                                                className="text-[10px] font-bold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full hover:bg-blue-100 transition-colors"
                                            >
                                                Download PDF
                                            </a>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
                                                Not Available
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Location Section */}
                    <div>
                        <h3 className="text-slate-700 font-bold text-sm mb-2 ml-1">Project Location</h3>
                        <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Latitude</p>
                                    <p className="text-sm font-mono font-semibold text-slate-800">{project.latitude || "N/A"}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] uppercase font-bold text-slate-400 mb-1">Longitude</p>
                                    <p className="text-sm font-mono font-semibold text-slate-800">{project.longitude || "N/A"}</p>
                                </div>
                            </div>

                            {/* Map Preview */}
                            {(project.latitude && project.longitude) && (
                                <div className="rounded-xl overflow-hidden shadow-inner border border-slate-200 mt-2 h-48 relative z-0">
                                    <LocationPickerMap
                                        latitude={project.latitude}
                                        longitude={project.longitude}
                                        disabled={true} // Read Only Mode
                                    />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Photos Section */}
                    <div className="space-y-6 pt-4 border-t border-slate-200">
                        <div className="flex items-center justify-between px-1">
                            <h3 className="text-slate-700 font-bold text-sm flex items-center gap-2">
                                <TbPhoto /> Project Documentation
                            </h3>
                            <span className="bg-slate-200 text-[10px] font-bold text-slate-500 px-2 py-0.5 rounded-full">
                                {projectImages.length} Total
                            </span>
                        </div>

                        {imageLoading ? (
                            <div className="bg-white rounded-2xl p-8 border border-slate-100 flex justify-center">
                                <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-600 rounded-full animate-spin"></div>
                            </div>
                        ) : (
                            <>
                                {/* EXTERNAL (First) */}
                                {projectImages.filter(img => img.category && img.category.toLowerCase() === 'external' && img.image_data !== '').length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 ml-1">External Photos</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {projectImages.filter(img => img.category && img.category.toLowerCase() === 'external' && img.image_data !== '').map((img, idx) => {
                                                const getImageSrc = (imageItem) => {
                                                    if (imageItem.image_url) return imageItem.image_url;
                                                    if (imageItem.image_data) {
                                                        let base64 = imageItem.image_data;
                                                        if (typeof base64 === 'string' && base64.trim().startsWith('{')) {
                                                            try {
                                                                const parsed = JSON.parse(base64);
                                                                base64 = parsed.image_data || parsed;
                                                            } catch (e) {
                                                                // keep as is
                                                            }
                                                        }
                                                        // Ensure prefix
                                                        if (typeof base64 === 'string' && !base64.startsWith("http") && !base64.startsWith("data:")) {
                                                            return `data:image/jpeg;base64,${base64}`;
                                                        }
                                                        return base64;
                                                    }
                                                    return null;
                                                };
                                                const imgSrc = getImageSrc(img);

                                                return (
                                                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200 shadow-sm border border-white group">
                                                        <img
                                                            src={imgSrc}
                                                            alt={`External ${idx}`}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            onError={(e) => { e.target.style.display = 'none' }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                                                            <p className="text-white text-[10px] font-medium truncate w-full">By: {img.uploaded_by}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}

                                {/* INTERNAL (Second) */}
                                {projectImages.filter(img => (!img.category || img.category.toLowerCase() !== 'external') && img.category?.toLowerCase() !== 'default' && img.image_data !== '').length > 0 && (
                                    <div>
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 px-1 ml-1">Internal Photos</h4>
                                        <div className="grid grid-cols-2 gap-3">
                                            {projectImages.filter(img => (!img.category || img.category.toLowerCase() !== 'external') && img.category?.toLowerCase() !== 'default' && img.image_data !== '').map((img, idx) => {
                                                const getImageSrc = (imageItem) => {
                                                    if (imageItem.image_url) return imageItem.image_url;
                                                    if (imageItem.image_data) {
                                                        let base64 = imageItem.image_data;
                                                        if (typeof base64 === 'string' && base64.trim().startsWith('{')) {
                                                            try {
                                                                const parsed = JSON.parse(base64);
                                                                base64 = parsed.image_data || parsed;
                                                            } catch (e) {
                                                                // keep as is
                                                            }
                                                        }
                                                        if (typeof base64 === 'string' && !base64.startsWith("http") && !base64.startsWith("data:")) {
                                                            return `data:image/jpeg;base64,${base64}`;
                                                        }
                                                        return base64;
                                                    }
                                                    return null;
                                                };
                                                const imgSrc = getImageSrc(img);

                                                return (
                                                    <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden bg-slate-200 shadow-sm border border-white group">
                                                        <img
                                                            src={imgSrc}
                                                            alt={`Internal ${idx}`}
                                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                            onError={(e) => { e.target.style.display = 'none' }}
                                                        />
                                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent flex items-end p-3">
                                                            <p className="text-white text-[10px] font-medium truncate w-full">By: {img.uploaded_by}</p>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Project Update Log (Combined Remarks & History) */}
                    <div className="pt-2">
                        <RemarksHistory 
                            history={history} 
                            loading={historyLoading} 
                            currentRemarks={project.otherRemarks}
                        />
                    </div>

                </div>

                {/* --- HIDDEN INPUTS & MODALS --- */}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <input type="file" ref={cameraInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />

                <EditProjectModal
                    project={project}
                    isOpen={editModalOpen}
                    mode="full"
                    onClose={() => setEditModalOpen(false)}
                    onSave={handleSaveProject}
                    onCameraClick={(category) => {
                        setActiveCategory(category);
                        cameraInputRef.current?.click();
                    }}
                    onGalleryClick={(category) => {
                        setActiveCategory(category);
                        fileInputRef.current?.click();
                    }}
                    internalPreviews={internalPreviews}
                    externalPreviews={externalPreviews}
                    onRemoveFile={removeFile}
                    isUploading={isUploading}
                />
            </div>
        </PageTransition>
    );
};

export default DetailedProjInfo;