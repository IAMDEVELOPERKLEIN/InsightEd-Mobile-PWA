import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiUserPlus, FiCheck, FiX, FiAlertCircle, FiInfo, FiMapPin, FiFilter, FiChevronDown, FiFileText, FiPlus, FiChevronRight, FiEdit2, FiImage } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { uploadFileInChunks } from '../utils/chunkedUploader';
import EditProjectModal from '../components/EditProjectModal';
import { LuClipboardList, LuCalendar, LuDollarSign, LuActivity } from "react-icons/lu";

const EFDMonitoring = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [efdLocations, setEfdLocations] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedFundingYear, setSelectedFundingYear] = useState('');
    const [selectedDonated, setSelectedDonated] = useState('All'); // 'All', 'Donated', 'Non-Donated'
    const [selectedDocStatus, setSelectedDocStatus] = useState('All'); // 'All', 'Complete', 'Missing RTA', 'Missing MOA', 'Missing Both'
    const [fundingYears, setFundingYears] = useState([]);
    
    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);

    const categories = [
        "New Construction",
        "Repair and Rehab",
        "Last Mile Schools",
        "Health facilities",
        "Gabaldon Restoration",
        "Library Hub",
        "SpEd Inclusive Learning Resource Centers (ILRC)",
        "Alternative Learning System - Community Based Learning Centers (ALS-CLC)",
        "Midrise School Building"
    ];

    const normalize = (val) => val?.toString().trim().toUpperCase() || 'UNASSIGNED';
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);
    const userRole = user?.role === 'hrodi_engineer' ? 'HRODI Engineer' : (user?.role || '');
    
    // New State for Document Uploads
    const [selectedProjectForDocs, setSelectedProjectForDocs] = useState(null);
    const [uploadDocs, setUploadDocs] = useState({ RTA: null, MOA: null });
    const [isUploadingDocs, setIsUploadingDocs] = useState(false);

    // Edit Modal State
    const [editModalOpen, setEditModalOpen] = useState(false);
    const [selectedProjectForEdit, setSelectedProjectForEdit] = useState(null);

    // Edit Modal Photo State
    const [internalFiles, setInternalFiles] = useState([]);
    const [internalPreviews, setInternalPreviews] = useState([]);
    const [externalFiles, setExternalFiles] = useState([]);
    const [externalPreviews, setExternalPreviews] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const [activeCategory, setActiveCategory] = useState('Internal');
    const [engineerSearchTerm, setEngineerSearchTerm] = useState('');

    // Refs for hidden file inputs
    const fileInputRef = React.useRef(null);
    const cameraInputRef = React.useRef(null);

    const handleClearFilters = () => {
        setSelectedRegion('');
        setSelectedDivision('');
        setSelectedCategory('');
        setSelectedFundingYear('');
        setSelectedDonated('All');
        setSelectedDocStatus('All');
        setSearchTerm('');
        setShowUnassignedOnly(false);
    };

    useEffect(() => {
        const fetchData = async () => {
            try {
                const projRes = await fetch('/api/projects');
                if (projRes.ok) setProjects(await projRes.json());

                const engRes = await fetch('/api/engineers');
                if (engRes.ok) setEngineers(await engRes.json());
                
                const fyRes = await fetch('/api/reference/funding-years');
                if (fyRes.ok) setFundingYears(await fyRes.json());
                
                const locRes = await fetch('/api/reference/efd-locations');
                if (locRes.ok) setEfdLocations(await locRes.json());
            } catch (error) {
                console.error("Error fetching monitoring data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const regionalData = useMemo(() => {
        const counts = {};
        projects.forEach(p => {
            const reg = normalize(p.region);
            counts[reg] = (counts[reg] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects]);

    const allRegions = useMemo(() => {
        const regions = new Set();
        efdLocations.forEach(loc => {
            if (loc.region) regions.add(loc.region.trim().toUpperCase());
        });
        return Array.from(regions).sort();
    }, [efdLocations]);

    const allDivisions = useMemo(() => {
        if (!selectedRegion) return [];
        const divisions = new Set();
        efdLocations
            .filter(loc => loc.region?.trim().toUpperCase() === selectedRegion.toUpperCase())
            .forEach(loc => {
                if (loc.division) divisions.add(loc.division.trim().toUpperCase());
            });
        return Array.from(divisions).sort();
    }, [efdLocations, selectedRegion]);

    const divisionData = useMemo(() => {
        if (!selectedRegion) return [];
        const counts = {};
        projects.filter(p => normalize(p.region) === normalize(selectedRegion)).forEach(p => {
            const div = normalize(p.division);
            counts[div] = (counts[div] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedRegion]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = !selectedCategory || p.projectCategory === selectedCategory;
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' || 
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            
            const isUnassignedOnly = !showUnassignedOnly || !p.engineerName;
            
            const matchesSearch = !searchTerm || 
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolId?.toString().includes(searchTerm) ||
                p.engineerName?.toLowerCase().includes(searchTerm.toLowerCase());
                
            return matchesRegion && matchesDivision && matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && isUnassignedOnly && matchesSearch;
        });
    }, [projects, searchTerm, showUnassignedOnly, selectedRegion, selectedDivision, selectedCategory, selectedFundingYear, selectedDonated, selectedDocStatus]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);
    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProjects, currentPage, itemsPerPage]);

    // Reset page on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedRegion, selectedDivision, selectedCategory, selectedFundingYear, selectedDonated, selectedDocStatus, showUnassignedOnly]);

    const handleAssign = async () => {
        if (!selectedProject || !selectedEngineer) return;

        setIsAssigning(true);
        setMessage({ text: '', type: '' });

        const engineer = engineers.find(e => e.uid === selectedEngineer);
        const engineerName = `${engineer.firstName} ${engineer.lastName}`;

        try {
            const response = await fetch('/api/assign-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProject.id,
                    engineerId: selectedEngineer,
                    engineerName: engineerName
                })
            });

            if (response.ok) {
                setMessage({ text: `Project assigned to ${engineerName} successfully!`, type: 'success' });
                // Update local state
                setProjects(prev => prev.map(p => 
                    p.id === selectedProject.id ? { ...p, engineerName: engineerName } : p
                ));
                setSelectedProject(null);
                setSelectedEngineer('');
                setEngineerSearchTerm('');
            } else {
                const err = await response.json();
                setMessage({ text: err.message || "Failed to assign project", type: 'error' });
            }
        } catch (error) {
            setMessage({ text: "Network error", type: 'error' });
        } finally {
            setIsAssigning(false);
        }
    };
    const convertFullFileToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result); // Resolve full data URL
            reader.onerror = (error) => reject(error);
        });
    };

    const handleUploadDocuments = async () => {
        if (!selectedProjectForDocs) return;
        if (!uploadDocs.RTA && !uploadDocs.MOA) {
            setMessage({ text: "Please select at least one document to upload", type: 'error' });
            return;
        }

        console.log(`🚀 Starting bulk upload for project: ${selectedProjectForDocs.id}`);
        setIsUploadingDocs(true);
        try {
            const documents = {};
            
            if (uploadDocs.RTA) {
                console.log(`   - Uploading RTA via chunks...`);
                documents.RTA = await uploadFileInChunks(uploadDocs.RTA);
            }
            if (uploadDocs.MOA) {
                console.log(`   - Uploading MOA via chunks...`);
                documents.MOA = await uploadFileInChunks(uploadDocs.MOA);
            }

            console.log(`   - Sending document URLs to API...`);
            const response = await fetch('/api/bulk-upload-project-documents', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProjectForDocs.id,
                    documents: documents,
                    uid: user.uid
                })
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || "Failed to upload documents");
            }
            
            console.log(`   - ✅ Bulk upload successful.`);

            // Update local state so UI reflects the new documents immediately
            setProjects(prevProjects => prevProjects.map(p => {
                if (p.id === selectedProjectForDocs.id) {
                    return {
                        ...p,
                        hasMoa: documents.MOA ? true : p.hasMoa,
                        hasRta: documents.RTA ? true : p.hasRta,
                    };
                }
                return p;
            }));

            setMessage({ text: "Documents uploaded successfully!", type: 'success' });
            setSelectedProjectForDocs(null);
            setUploadDocs({ RTA: null, MOA: null });
        } catch (error) {
            console.error("❌ Upload error:", error);
            setMessage({ text: error.message || "Failed to upload documents", type: 'error' });
        } finally {
            setIsUploadingDocs(false);
        }
    };

    const handleCameraClick = (category) => {
        setActiveCategory(category);
        cameraInputRef.current?.click();
    };

    const handleGalleryClick = (category) => {
        setActiveCategory(category);
        fileInputRef.current?.click();
    };

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

    const handleEditProject = (project) => {
        setSelectedProjectForEdit(project);
        setEditModalOpen(true);
    };

    const handleSaveProject = async (updatedProject) => {
        const uid = localStorage.getItem('uid');
        if (!uid) return;

        setIsUploading(true);
        try {
            // 1. Update Project Details
            const response = await fetch(`/api/update-project/${updatedProject.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    ...updatedProject,
                    uid: uid,
                    modifiedBy: userRole || 'EFD Engineer'
                }),
            });

            if (!response.ok) throw new Error('Failed to update project');

            // 2. Upload Images if any
            const { compressImage } = await import('../utils/imageCompression');
            const allFiles = [
                ...internalFiles.map(f => ({ file: f, category: 'Internal' })),
                ...externalFiles.map(f => ({ file: f, category: 'External' }))
            ];

            if (allFiles.length > 0) {
                for (const item of allFiles) {
                    try {
                        const base64Image = await compressImage(item.file);
                        await fetch('/api/upload-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                projectId: updatedProject.id,
                                imageData: base64Image,
                                uploadedBy: uid,
                                category: item.category
                            }),
                        });
                    } catch (err) {
                        console.error("Compression/Upload failed for file:", item.file.name, err);
                    }
                }
            }

            // 3. Cleanup & Success
            setMessage({ text: 'Project updated successfully!', type: 'success' });
            setEditModalOpen(false);
            setInternalFiles([]);
            setInternalPreviews([]);
            setExternalFiles([]);
            setExternalPreviews([]);
            
            // Refresh projects list
            const projRes = await fetch('/api/projects');
            if (projRes.ok) setProjects(await projRes.json());

        } catch (error) {
            console.error('Save Error:', error);
            setMessage({ text: error.message || 'Failed to update project', type: 'error' });
        } finally {
            setIsUploading(false);
        }
    };

    const formatAllocation = (value) => {
        const num = Number(value) || 0;
        return `₱${num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    };

    const formatDateShort = (dateString) => {
        if (!dateString) return "TBD";
        const date = new Date(dateString);
        return date.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "2-digit",
        });
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 pb-24">
                {/* Header Section */}
                <div className="bg-[#004A99] text-white pt-8 pb-10 px-6 rounded-b-[3rem] shadow-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight leading-none">Projects</h1>
                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                                    Engineer Resource Allocation • System Monitoring
                                </p>
                            </div>
                            {(userRole === 'HRODI Engineer' || userRole === 'EFD Engineer') && (
                                <button
                                    onClick={() => navigate('/new-project')}
                                    className="group bg-white text-[#004A99] px-5 py-3 rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
                                >
                                    <FiPlus size={16} className="group-hover:rotate-90 transition-transform" />
                                    New Project
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Search & Filters Container */}
                <div className="px-5 mb-8 space-y-4">
                    {/* Search Panel */}
                    <div className="relative group">
                        <input 
                            type="text"
                            placeholder="Find project or search by engineer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all placeholder:text-slate-300"
                        />
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={20} />
                    </div>

                    {/* Filter Panel */}
                    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4 max-w-7xl mx-auto w-full">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 gap-4 px-1">
                            <div className="flex items-center gap-2">
                                <FiFilter className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Filters</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <button 
                                    onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                                    className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 ${showUnassignedOnly ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                                >
                                    {showUnassignedOnly ? 'Showing Unassigned' : 'Filter Unassigned'}
                                </button>
                                {(selectedRegion || selectedDivision || selectedCategory || selectedFundingYear || selectedDonated !== 'All' || selectedDocStatus !== 'All' || searchTerm || showUnassignedOnly) && (
                                    <button 
                                        onClick={handleClearFilters}
                                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full transition-all active:scale-95"
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="relative">
                                <select 
                                    value={selectedRegion}
                                    onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDivision(''); }}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="">All Regions</option>
                                    {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative">
                                <select 
                                    value={selectedDivision}
                                    onChange={(e) => setSelectedDivision(e.target.value)}
                                    disabled={!selectedRegion}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all disabled:opacity-40"
                                >
                                    <option value="">All Divisions</option>
                                    {allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative sm:col-span-2 lg:col-span-1">
                                <select 
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="">All Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative">
                                <select 
                                    value={selectedFundingYear}
                                    onChange={(e) => setSelectedFundingYear(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="">All Years</option>
                                    {fundingYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative">
                                <select 
                                    value={selectedDonated}
                                    onChange={(e) => setSelectedDonated(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="All">All Donated/Non</option>
                                    <option value="Donated">Donated</option>
                                    <option value="Non-Donated">Non-Donated</option>
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative">
                                <select 
                                    value={selectedDocStatus}
                                    onChange={(e) => setSelectedDocStatus(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="All">All Doc Status</option>
                                    <option value="Complete">Complete (MOA/RTA)</option>
                                    <option value="Missing RTA">Missing RTA</option>
                                    <option value="Missing MOA">Missing MOA</option>
                                    <option value="Missing Both">Missing Both</option>
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="px-5 mb-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
                        <FiInfo className="text-blue-500 mt-0.5" />
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                            Select a project to change its assigned engineer. This will update who is responsible for the project's monitoring and updates.
                        </p>
                    </div>
                </div>

                {/* Projects List - Table Format */}
                <div className="px-5 max-w-7xl mx-auto w-full pb-24">
                    <div className="bg-white rounded-[2.5rem] shadow-xl shadow-blue-900/5 border border-slate-100 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse min-w-[1000px]">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] pl-8">Project Details</th>
                                        <th className="hidden lg:table-cell p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Status & Progress</th>
                                        <th className="hidden md:table-cell p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Financials</th>
                                        <th className="hidden sm:table-cell p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em]">Assignment</th>
                                        <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] text-center pr-8">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {paginatedProjects.map((p) => {
                                        const isUnassigned = !p.engineerName;
                                        const progress = parseInt(p.accomplishmentPercentage || 0);
                                        
                                        return (
                                            <tr 
                                                key={p.id}
                                                className={`group hover:bg-blue-50/30 transition-all duration-300 ${selectedProject?.id === p.id ? 'bg-blue-50/50' : ''}`}
                                            >
                                                <td className="p-6 pl-8">
                                                    <div className="flex flex-col gap-1">
                                                        <h4 className="text-sm font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">
                                                            {p.projectName}
                                                        </h4>
                                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                                                            {p.schoolName}
                                                        </p>
                                                        <div className="flex gap-2 mt-2">
                                                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">
                                                                ID: {p.id}
                                                            </span>
                                                            {p.projectCategory && (
                                                                <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                                                    {p.projectCategory}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-2">
                                                        <div className="flex items-center gap-2">
                                                            <div className={`w-2 h-2 rounded-full animate-pulse ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                                                            <span className="text-[10px] font-black text-slate-700 uppercase">{p.status || 'Ongoing'}</span>
                                                        </div>
                                                        <div className="w-48 space-y-1.5">
                                                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-400">
                                                                <span>PROGRESS</span>
                                                                <span className={progress === 100 ? "text-emerald-500" : "text-blue-600"}>{progress}%</span>
                                                            </div>
                                                            <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-50">
                                                                <div 
                                                                    className={`h-full rounded-full transition-all duration-1000 ${progress === 100 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                                                    style={{ width: `${progress}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex flex-col">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Allocation</span>
                                                            <span className="text-[11px] font-mono font-bold text-slate-700">{formatAllocation(p.projectAllocation)}</span>
                                                        </div>
                                                        <div className="flex flex-col mt-1">
                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Tranches Total</span>
                                                            <span className="text-[11px] font-mono font-bold text-emerald-600">
                                                                {formatAllocation((Number(p.tranche_1)||0) + (Number(p.tranche_2)||0) + (Number(p.tranche_3)||0))}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black shadow-sm ${isUnassigned ? 'bg-orange-100 text-orange-600' : 'bg-blue-100 text-blue-600'}`}>
                                                            {p.engineerName?.[0] || '?'}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className={`text-[10px] font-black ${isUnassigned ? 'text-orange-600 italic' : 'text-slate-700'}`}>
                                                                {isUnassigned ? 'Unassigned' : `Engr. ${p.engineerName}`}
                                                            </span>
                                                            <span className="text-[9px] text-slate-400 font-bold uppercase">{p.division || 'Unknown Division'}</span>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="p-6 pr-8">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/project-details/${p.id}`); }}
                                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-white hover:text-blue-600 hover:shadow-lg transition-all border border-transparent hover:border-blue-100"
                                                            title="View Details"
                                                        >
                                                            <FiChevronRight size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); navigate(`/project-gallery/${p.id}`); }}
                                                            className="p-2.5 bg-purple-50 text-purple-600 rounded-xl hover:bg-purple-600 hover:text-white hover:shadow-lg transition-all"
                                                            title="Project Gallery"
                                                        >
                                                            <FiImage size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); handleEditProject(p); }}
                                                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white hover:shadow-lg transition-all"
                                                            title="Update Project"
                                                        >
                                                            <FiEdit2 size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                setSelectedProjectForDocs(p);
                                                                try {
                                                                    const res = await fetch(`/api/projects/${p.id}`);
                                                                    if (res.ok) {
                                                                        const fullData = await res.json();
                                                                        setSelectedProjectForDocs(prev => prev && prev.id === p.id ? { ...prev, ...fullData } : prev);
                                                                    }
                                                                } catch (err) { console.warn("Background fetch failed:", err); }
                                                            }}
                                                            className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white hover:shadow-lg transition-all"
                                                            title="Upload RTA/MOA"
                                                        >
                                                            <FiFileText size={18} />
                                                        </button>
                                                        <button 
                                                            onClick={(e) => { e.stopPropagation(); setSelectedProject(p); }}
                                                            className="p-2.5 bg-orange-50 text-orange-600 rounded-xl hover:bg-orange-600 hover:text-white hover:shadow-lg transition-all"
                                                            title="Assign Engineer"
                                                        >
                                                            <FiUserPlus size={18} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalPages > 1 && (
                            <div className="bg-slate-50/30 border-t border-slate-100 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">
                                    Showing <span className="text-slate-700">{Math.min(filteredProjects.length, (currentPage - 1) * itemsPerPage + 1)}</span> to <span className="text-slate-700">{Math.min(filteredProjects.length, currentPage * itemsPerPage)}</span> of <span className="text-slate-700">{filteredProjects.length}</span> projects
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                                    >
                                        <FiChevronDown size={18} className="rotate-90" />
                                    </button>
                                    
                                    <div className="flex items-center gap-1">
                                        {[...Array(totalPages)].map((_, i) => {
                                            const page = i + 1;
                                            if (totalPages > 5) {
                                                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                                                    return (
                                                        <button 
                                                            key={page}
                                                            onClick={() => setCurrentPage(page)}
                                                            className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400'}`}
                                                        >
                                                            {page}
                                                        </button>
                                                    );
                                                } else if (page === currentPage - 2 || page === currentPage + 2) {
                                                    return <span key={page} className="text-slate-400 text-[10px]">...</span>;
                                                }
                                                return null;
                                            }
                                            return (
                                                <button 
                                                    key={page}
                                                    onClick={() => setCurrentPage(page)}
                                                    className={`w-8 h-8 rounded-xl text-[10px] font-black transition-all ${currentPage === page ? 'bg-blue-600 text-white shadow-lg' : 'bg-white border border-slate-200 text-slate-500 hover:border-blue-400'}`}
                                                >
                                                    {page}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    <button
                                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="p-2 bg-white border border-slate-200 text-slate-400 rounded-xl hover:text-blue-600 disabled:opacity-30 transition-all shadow-sm"
                                    >
                                        <FiChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Assignment Modal/Overlay */}
                {selectedProject && createPortal(
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 px-4">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col relative px-4 sm:px-8">
                            <button 
                                onClick={() => {
                                    setSelectedProject(null);
                                    setEngineerSearchTerm('');
                                }}
                                className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                            
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-slate-800">Assign Engineer</h2>
                                <p className="text-xs text-slate-400 font-medium">Assignment for project: <span className="text-blue-600 font-bold">{selectedProject.projectName}</span></p>
                            </div>

                            <div className="space-y-4 mb-8 h-full flex flex-col min-h-0">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Active Engineer</label>
                                
                                {/* Engineer Search Bar */}
                                <div className="relative group mb-2">
                                    <input 
                                        type="text"
                                        placeholder="Search engineer name or division..."
                                        value={engineerSearchTerm}
                                        onChange={(e) => setEngineerSearchTerm(e.target.value)}
                                        className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 transition-all placeholder:text-slate-300"
                                    />
                                    <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={16} />
                                </div>

                                <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-2 custom-scrollbar flex-1 min-h-0">
                                    {engineers.filter(eng => {
                                        const search = engineerSearchTerm.toLowerCase();
                                        return eng.firstName?.toLowerCase().includes(search) || 
                                               eng.lastName?.toLowerCase().includes(search) || 
                                               eng.division?.toLowerCase().includes(search);
                                    }).map((eng) => (
                                        <button
                                            key={eng.uid}
                                            onClick={() => setSelectedEngineer(eng.uid)}
                                            className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${selectedEngineer === eng.uid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedEngineer === eng.uid ? 'bg-white/20' : 'bg-white'}`}>
                                                    {eng.firstName[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold">{eng.firstName} {eng.lastName}</p>
                                                    <p className={`text-[10px] ${selectedEngineer === eng.uid ? 'text-blue-100' : 'text-slate-400'}`}>
                                                        {eng.division} • {eng.position || 'Engineer'}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedEngineer === eng.uid && <FiCheck size={20} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                <button 
                                    onClick={() => {
                                        setSelectedProject(null);
                                        setEngineerSearchTerm('');
                                    }}
                                    className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAssign}
                                    disabled={!selectedEngineer || isAssigning}
                                    className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isAssigning ? 'Updating...' : 'Confirm Assignment'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Document Upload Modal */}
                {selectedProjectForDocs && createPortal(
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 px-4">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col relative px-4 sm:px-8">
                            <button 
                                onClick={() => setSelectedProjectForDocs(null)}
                                className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                            
                            <div className="mb-6 pr-10">
                                <h2 className="text-xl font-black text-slate-800">Project Documents</h2>
                                <p className="text-xs text-slate-400 font-medium truncate">Upload for: <span className="text-blue-600 font-bold">{selectedProjectForDocs.projectName}</span></p>
                            </div>

                            <div className="space-y-6 mb-8 overflow-y-auto pr-2 custom-scrollbar">
                                {/* RTA Upload */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Resolution to Award (RTA)</label>
                                    <div className={`p-4 rounded-2xl border-2 border-dashed transition-all ${uploadDocs.RTA ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                                        <input 
                                            type="file" 
                                            accept="application/pdf"
                                            onChange={(e) => setUploadDocs(prev => ({ ...prev, RTA: e.target.files[0] }))}
                                            className="hidden" 
                                            id="rta-upload"
                                        />
                                        <label htmlFor="rta-upload" className="flex flex-col items-center justify-center cursor-pointer">
                                            {uploadDocs.RTA ? (
                                                <div className="flex items-center gap-2 text-emerald-600">
                                                    <FiCheck size={20} />
                                                    <span className="text-xs font-bold truncate max-w-[200px]">{uploadDocs.RTA.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <FiFileText size={24} />
                                                    <span className="text-[10px] font-bold uppercase">Select RTA PDF</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    {selectedProjectForDocs.rta_pdf && !uploadDocs.RTA && (
                                        <p className="text-[9px] text-blue-500 font-bold ml-1 italic">✓ Existing RTA File Available</p>
                                    )}
                                </div>

                                {/* MOA Upload */}
                                <div className="space-y-2">
                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Memorandum of Agreement (MOA)</label>
                                    <div className={`p-4 rounded-2xl border-2 border-dashed transition-all ${uploadDocs.MOA ? 'bg-emerald-50 border-emerald-300' : 'bg-slate-50 border-slate-200'}`}>
                                        <input 
                                            type="file" 
                                            accept="application/pdf"
                                            onChange={(e) => setUploadDocs(prev => ({ ...prev, MOA: e.target.files[0] }))}
                                            className="hidden" 
                                            id="moa-upload"
                                        />
                                        <label htmlFor="moa-upload" className="flex flex-col items-center justify-center cursor-pointer">
                                            {uploadDocs.MOA ? (
                                                <div className="flex items-center gap-2 text-emerald-600">
                                                    <FiCheck size={20} />
                                                    <span className="text-xs font-bold truncate max-w-[200px]">{uploadDocs.MOA.name}</span>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center gap-2 text-slate-400">
                                                    <FiFileText size={24} />
                                                    <span className="text-[10px] font-bold uppercase">Select MOA PDF</span>
                                                </div>
                                            )}
                                        </label>
                                    </div>
                                    {selectedProjectForDocs.moa_pdf && !uploadDocs.MOA && (
                                        <p className="text-[9px] text-blue-500 font-bold ml-1 italic">✓ Existing MOA File Available</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                <button 
                                    onClick={() => setSelectedProjectForDocs(null)}
                                    className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleUploadDocuments}
                                    disabled={(!uploadDocs.RTA && !uploadDocs.MOA) || isUploadingDocs}
                                    className="w-full py-4 rounded-2xl bg-emerald-600 text-white font-bold text-sm shadow-xl shadow-emerald-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isUploadingDocs ? 'Uploading...' : 'Save Documents'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Edit Modal */}
                {/* Hidden Inputs for Photos */}
                <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept="image/*" className="hidden" />
                <input type="file" ref={cameraInputRef} onChange={handleFileUpload} accept="image/*" capture="environment" className="hidden" />

                {editModalOpen && createPortal(
                    <EditProjectModal 
                        isOpen={editModalOpen}
                        onClose={() => setEditModalOpen(false)}
                        project={selectedProjectForEdit}
                        onSave={handleSaveProject}
                        userRole={userRole}
                        mode="full"
                        onCameraClick={handleCameraClick}
                        onGalleryClick={handleGalleryClick}
                        internalPreviews={internalPreviews}
                        externalPreviews={externalPreviews}
                        onRemoveFile={removeFile}
                        isUploading={isUploading}
                    />,
                    document.body
                )}

                {/* Notification */}
                {message.text && (
                    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[3000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {message.type === 'success' ? <FiCheck size={20} /> : <FiAlertCircle size={20} />}
                        <p className="text-sm font-bold">{message.text}</p>
                        <button onClick={() => setMessage({ text: '', type: '' })} className="ml-2 hover:opacity-70"><FiX /></button>
                    </div>
                )}


                <BottomNav userRole={userRole} />
            </div>
        </PageTransition>
    );
};

export default EFDMonitoring;
