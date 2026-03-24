import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFileText, FiChevronDown, FiPlus, FiSearch, FiX, FiCheck, FiDownload, FiTrash2, FiAlertCircle, FiList, FiSettings, FiEye } from 'react-icons/fi';
import { TbFileCheck, TbBuildingCommunity, TbMapPin } from "react-icons/tb";
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

// Reusable Searchable Select Component
const SearchableSelect = ({ label, options, selected, onSelect, icon: Icon, placeholder = "Search..." }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [search, setSearch] = useState('');

    const filteredOptions = options.filter(opt => 
        opt.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div className="relative flex-1 min-w-[200px]">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                {label}
            </label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3.5 bg-white border border-slate-100 rounded-2xl text-[13px] font-semibold text-slate-700 hover:border-blue-200 transition-all shadow-sm"
            >
                <div className="flex items-center gap-3 truncate">
                    {Icon && <Icon size={18} className="text-blue-500 shrink-0" />}
                    <span className="truncate">{selected || `Select ${label}`}</span>
                </div>
                <FiChevronDown className={`shrink-0 transition-transform duration-300 text-slate-400 ${isOpen ? 'rotate-180' : ''}`} size={16} />
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[101] py-3 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="px-3 pb-2 mb-2 border-b border-slate-50">
                            <div className="relative">
                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    autoFocus
                                    type="text"
                                    placeholder={placeholder}
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border-none rounded-xl text-[12px] focus:ring-2 focus:ring-blue-100 transition-all"
                                />
                            </div>
                        </div>
                        <div className="max-h-[250px] overflow-y-auto custom-scrollbar">
                            {filteredOptions.length > 0 ? (
                                filteredOptions.map(option => (
                                    <div
                                        key={option}
                                        onClick={() => {
                                            onSelect(option);
                                            setIsOpen(false);
                                            setSearch('');
                                        }}
                                        className={`px-4 py-2.5 hover:bg-blue-50 flex items-center justify-between cursor-pointer transition-colors ${selected === option ? 'bg-blue-50/50' : ''}`}
                                    >
                                        <span className={`text-[12px] ${selected === option ? 'text-blue-600 font-bold' : 'text-slate-600 font-medium'}`}>
                                            {option}
                                        </span>
                                        {selected === option && <FiCheck size={14} className="text-blue-500" />}
                                    </div>
                                ))
                            ) : (
                                <div className="px-4 py-6 text-center text-slate-400 text-[11px] italic">
                                    No results found
                                </div>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

const EFDMotherMoa = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // State
    const [lguType, setLguType] = useState('');
    const [region, setRegion] = useState('');
    const [province, setProvince] = useState(''); 
    const [municipalityCity, setMunicipalityCity] = useState('');
    
    const [moaFile, setMoaFile] = useState(null);
    const [srFile, setSrFile] = useState(null);
    const [driveLinkValidating, setDriveLinkValidating] = useState(false);
    const [driveLinkError, setDriveLinkError] = useState('');
    
    // Supplemental MOA state
    const [isSupplementalModalOpen, setIsSupplementalModalOpen] = useState(false);
    const [selectedMotherMoa, setSelectedMotherMoa] = useState(null);
    const [supplementalFile, setSupplementalFile] = useState(null);
    const [isUploadingSupplemental, setIsUploadingSupplemental] = useState(false);
    const [supplementals, setSupplementals] = useState([]);
    const [availableProjects, setAvailableProjects] = useState([]);
    const [selectedIpcs, setSelectedIpcs] = useState([]);
    const [projectSearch, setProjectSearch] = useState('');
    
    // Preview state
    const [previewMoa, setPreviewMoa] = useState(null);

    // Utilities
    const validateDriveLinkAccess = async (url) => {
        try {
            const res = await fetch('/api/validate-drive-link', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url })
            });
            if (res.ok) return { valid: true };
            const err = await res.json();
            return { valid: false, error: err.error || "Failed to validate link access" };
        } catch (e) {
            return { valid: false, error: "Failed to validate link access" };
        }
    };

    const getPreviewUrl = (url) => {
        if (!url) return '';
        if (url.startsWith('data:application/pdf')) return url; // Support Base64 direct embedding
        if (/^[a-zA-Z0-9-_]{20,}$/.test(url)) return `https://drive.google.com/file/d/${url}/preview`;
        if (url.includes('drive.google.com')) {
            if (url.includes('/file/d/')) {
                const fileId = url.split('/file/d/')[1]?.split('/')[0];
                return `https://drive.google.com/file/d/${fileId}/preview`;
            }
            return url.replace(/\/view(\?.*)?$/, '/preview');
        }
        return url;
    };

    const fetchSupplementals = async (motherMoaId) => {
        try {
            const res = await fetch(`/api/engineer-supplemental-moas/${motherMoaId}`);
            if (res.ok) {
                const data = await res.json();
                setSupplementals(data || []);
            }
        } catch (err) {
            console.error("Fetch Supplementals Error:", err);
        }
    };

    const fetchProjectsForMoa = async (motherMoaId) => {
        try {
            const res = await fetch(`/api/projects-for-moa/${motherMoaId}`);
            if (res.ok) {
                const data = await res.json();
                setAvailableProjects(data || []);
            }
        } catch (err) {
            console.error("Fetch Projects for MOA Error:", err);
        }
    };

    // Fetch supplementals when previewing
    useEffect(() => {
        if (previewMoa) {
            fetchSupplementals(previewMoa.mother_moa_id);
        } else {
            setSupplementals([]);
        }
    }, [previewMoa]);

    // Fetch available projects when supplemental modal opens
    useEffect(() => {
        if (isSupplementalModalOpen && selectedMotherMoa) {
            fetchProjectsForMoa(selectedMotherMoa.mother_moa_id);
        } else {
            setAvailableProjects([]);
            setSelectedIpcs([]);
            setProjectSearch('');
        }
    }, [isSupplementalModalOpen, selectedMotherMoa]);

    const handleUploadSupplemental = async () => {
        if (!selectedMotherMoa || !supplementalFile) {
            alert("Please select a PDF file for the Supplemental MOA.");
            return;
        }

        setIsUploadingSupplemental(true);
        try {
            const formData = new FormData();
            formData.append('mother_moa_id', selectedMotherMoa.mother_moa_id);
            formData.append('moa_pdf', supplementalFile);
            formData.append('ipc_ids', JSON.stringify(selectedIpcs));
            formData.append('uid', user.uid);

            const res = await fetch('/api/upload-engineer-supplemental-moa', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                alert("Successfully uploaded Supplemental MOA!");
                setIsSupplementalModalOpen(false);
                setSupplementalFile(null);
                setSelectedMotherMoa(null);
                // Refresh list if desired
            } else {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setIsUploadingSupplemental(false);
        }
    };

    const [isUploading, setIsUploading] = useState(false);
    const [moas, setMoas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState([]); 
    const [searchQuery, setSearchQuery] = useState('');

    const LGU_TYPES = ['PGO', 'CGO', 'MGO'];

    // Fetch Reference Data & Existing MOAs
    useEffect(() => {
        const fetchData = async () => {
            try {
                // 1. Fetch Locations from engineer_form reference
                const locRes = await fetch('/api/reference/mother-moa-locations');
                if (locRes.ok) {
                    const data = await locRes.json();
                    setLocations(data || []);
                }

                // 2. Fetch Existing Mother MOAs
                const moaRes = await fetch('/api/engineer-mother-moas');
                if (moaRes.ok) {
                    const data = await moaRes.json();
                    setMoas(data || []);
                }
            } catch (err) {
                console.error("Fetch Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // NCR ProvGov Check
    const isNcrPgoError = lguType === 'PGO' && region === 'NCR';

    // Derived Options for Dropdowns
    const regionOptions = useMemo(() => {
        return [...new Set(locations.map(l => l.region))].sort();
    }, [locations]);
    
    const provinceOptions = useMemo(() => {
        if (!region) return [];
        return [...new Set(locations.filter(l => l.region?.trim().toUpperCase() === region.trim().toUpperCase()).map(l => l.province))].filter(Boolean).sort();
    }, [region, locations]);

    const muniCityOptions = useMemo(() => {
        if (!province) return [];
        const filtered = locations.filter(l => l.province === province);
        return [...new Set(filtered.map(l => l.municipality || l.city))].filter(Boolean).sort();
    }, [province, locations]);

    const handleUpload = async () => {
        if (!lguType || !region || !province || !moaFile) {
            alert("Please complete the required fields (LGU Type, Region, Province and Mother MOA PDF file).");
            return;
        }

        if (isNcrPgoError) {
            alert("NCR is not part of provincial government office. Select either MGO/CGO.");
            return;
        }

        if ((lguType === 'CGO' || lguType === 'MGO') && !municipalityCity) {
            alert(`Please select a Municipality/City for ${lguType} selection.`);
            return;
        }

        setIsUploading(true);
        
        try {
            const formData = new FormData();
            formData.append('region', region);
            formData.append('province', province);
            formData.append('municipality_city', municipalityCity);
            formData.append('lgu_type', lguType);
            formData.append('lgu_name', lguType === 'PGO' ? province : municipalityCity);
            formData.append('uid', user.uid);
            formData.append('moa_pdf', moaFile);
            
            if (srFile) {
                formData.append('sangguniang_resolution', srFile);
            }

            const res = await fetch('/api/upload-engineer-mother-moa', {
                method: 'POST',
                body: formData
            });

            if (res.ok) {
                alert("Successfully uploaded Mother MOA!");
                
                // Refresh list
                const refreshedRes = await fetch('/api/engineer-mother-moas');
                if (refreshedRes.ok) {
                    const data = await refreshedRes.json();
                    setMoas(data);
                }
                
                // Reset form
                setMoaFile(null);
                setSrFile(null);
                setLguType('');
                setRegion('');
                setProvince('');
                setMunicipalityCity('');
            } else {
                const err = await res.json();
                throw new Error(err.error || "Upload failed");
            }
        } catch (err) {
            alert("Error: " + err.message);
        } finally {
            setIsUploading(false);
        }
    };

    const filteredMoas = moas.filter(moa => 
        (moa.lgu_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (moa.province || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (moa.region || '').toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#F8FAFC] pb-32">
                {/* Header Section */}
                <div className="bg-[#004A99] pt-12 pb-24 px-6 rounded-b-[2.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-80 h-80 bg-blue-400/20 rounded-full blur-3xl"></div>
                    
                    <div className="relative z-10 max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-5">
                            <button 
                                onClick={() => navigate('/efd-dashboard')}
                                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all backdrop-blur-md border border-white/20"
                            >
                                <FiChevronDown className="rotate-90" size={20} />
                            </button>
                            <div>
                                <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                                    <TbFileCheck size={32} className="text-blue-200" />
                                    Engineer Mother MOA
                                </h1>
                                <p className="text-blue-100/80 text-sm font-medium mt-1">
                                    Archive Central Memorandums per Province/City (Source: Engineer Forms)
                                </p>
                            </div>
                        </div>

                        {user && (
                            <div className="flex items-center gap-3 bg-white/10 backdrop-blur-md p-2 pl-4 rounded-[1.25rem] border border-white/10 self-start md:self-center">
                                <div className="text-right hidden sm:block">
                                    <p className="text-[10px] font-bold text-blue-200 uppercase tracking-widest">Logged In As</p>
                                    <p className="text-xs font-black text-white">{user.displayName || 'EFD Engineer'}</p>
                                </div>
                                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center text-white font-bold border border-white/30">
                                    {user.displayName?.charAt(0) || 'E'}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-6xl mx-auto px-6 -mt-12 relative z-20">
                    {/* Upload Card */}
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 p-8 mb-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                    <FiPlus size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">New MOA Upload</h2>
                            </div>
                            
                            {isNcrPgoError && (
                                <div className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-xl border border-red-100 animate-bounce">
                                    <FiAlertCircle size={16} />
                                    <span className="text-[11px] font-black uppercase tracking-wider">NCR is not part of PGO. Select MGO/CGO.</span>
                                </div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            {/* 1. LGU Type (NOW FIRST) */}
                            <SearchableSelect 
                                label="LGU Type"
                                options={LGU_TYPES}
                                selected={lguType}
                                onSelect={(val) => {
                                    setLguType(val);
                                    if (val === 'PGO') setMunicipalityCity('');
                                }}
                                icon={FiSettings}
                                placeholder="Filter types..."
                            />

                            {/* 2. Region */}
                            <SearchableSelect 
                                label="Region"
                                options={regionOptions}
                                selected={region}
                                onSelect={(val) => { setRegion(val); setProvince(''); setMunicipalityCity(''); }}
                                icon={TbMapPin}
                                placeholder="Search regions..."
                            />

                            {/* 3. Province (LGU Name) */}
                            <SearchableSelect 
                                label="Province"
                                options={provinceOptions}
                                selected={province}
                                onSelect={(val) => { setProvince(val); setMunicipalityCity(''); }}
                                icon={TbBuildingCommunity}
                                placeholder="Select province..."
                            />

                            {/* 4. Municipality/City (Conditional) */}
                            {(lguType === 'CGO' || lguType === 'MGO') ? (
                                <SearchableSelect 
                                    label="Municipality/City"
                                    options={muniCityOptions}
                                    selected={municipalityCity}
                                    onSelect={setMunicipalityCity}
                                    icon={TbBuildingCommunity}
                                    placeholder="Search munis/cities..."
                                />
                            ) : (
                                <div className="flex-1 min-w-[200px] opacity-40 pointer-events-none">
                                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">Municipality/City</label>
                                    <div className="w-full h-[52px] bg-slate-50 border border-slate-100 rounded-2xl flex items-center px-4 text-slate-400 text-[12px]">
                                        Disabled for PGO
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            {/* MOA PDF File Input */}
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Mother MOA PDF File
                                </label>
                                <div className="relative group">
                                    <div className={`w-full flex items-center px-4 py-3 bg-slate-50 border-2 rounded-2xl transition-all ${moaFile ? 'border-blue-400 bg-blue-50/30' : 'border-slate-100 focus-within:border-blue-300 focus-within:bg-white'}`}>
                                        <FiUpload className={`${moaFile ? 'text-blue-500' : 'text-slate-400'} shrink-0`} size={18} />
                                        <input 
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => setMoaFile(e.target.files[0])}
                                            className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-semibold text-slate-700 ml-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                        />
                                        {moaFile && (
                                            <button 
                                                onClick={() => setMoaFile(null)}
                                                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* Sangguniang Resolution */}
                            <div className="flex-1">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Sangguniang Resolution PDF (Optional)
                                </label>
                                <div className="relative group">
                                    <div className={`w-full flex items-center px-4 py-3 bg-slate-50 border-2 rounded-2xl transition-all ${srFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-100 focus-within:border-emerald-300 focus-within:bg-white'}`}>
                                        <FiUpload className={`${srFile ? 'text-emerald-500' : 'text-slate-400'} shrink-0`} size={18} />
                                        <input 
                                            type="file"
                                            accept="application/pdf"
                                            onChange={(e) => setSrFile(e.target.files[0])}
                                            className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-semibold text-slate-700 ml-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                        />
                                        {srFile && (
                                            <button 
                                                onClick={() => setSrFile(null)}
                                                className="p-1.5 hover:bg-emerald-100 rounded-lg text-emerald-600 transition-colors"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !moaFile || !region || !province || !lguType || isNcrPgoError}
                                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[13px] uppercase tracking-wider shadow-lg transition-all ${isUploading || !moaFile || !region || !province || !lguType || isNcrPgoError ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-[#004A99] text-white hover:bg-blue-700 hover:-translate-y-1 active:scale-95 shadow-blue-900/20'}`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Syncing...
                                    </>
                                ) : (
                                    <>
                                        <FiUpload size={16} />
                                        Submit Archive Link
                                    </>
                                )}
                            </button>
                        </div>
                    </div>

                    {/* MOA List Table */}
                    <div className="bg-white rounded-[2rem] shadow-xl border border-slate-100 overflow-hidden">
                        <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-600">
                                    <FiList size={20} />
                                </div>
                                <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">Archive Explorer</h2>
                            </div>

                            <div className="relative max-w-xs w-full">
                                <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text" 
                                    placeholder="Search archive..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50/50">
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Region/Province</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">LGU Entity</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Uploaded By</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                        <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-12 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                                    <p className="text-sm font-bold text-slate-400 animate-pulse uppercase tracking-wider">Syncing Archive...</p>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredMoas.length > 0 ? (
                                        filteredMoas.map((moa) => (
                                            <tr key={moa.mother_moa_id} className="hover:bg-slate-50/80 transition-colors group">
                                                <td className="px-8 py-5">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-wider">{moa.region}</span>
                                                        <span className="text-[13px] font-bold text-slate-800">{moa.province}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-3">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-tighter ${
                                                            moa.lgu_type === 'PGO' ? 'bg-purple-50 text-purple-600' :
                                                            moa.lgu_type === 'CGO' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-emerald-50 text-emerald-600'
                                                        }`}>
                                                            {moa.lgu_type}
                                                        </span>
                                                        <span className="text-[13px] font-black text-slate-800">{moa.lgu_name}</span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-6 h-6 bg-slate-100 rounded-lg flex items-center justify-center text-[10px] font-bold text-slate-600">
                                                            {moa.first_name?.charAt(0) || 'U'}
                                                        </div>
                                                        <span className="text-[12px] font-bold text-slate-600">
                                                            {moa.first_name ? `${moa.first_name} ${moa.last_name || ''}` : 'Unknown'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-8 py-5">
                                                    <span className="text-[12px] font-bold text-slate-500">
                                                        {new Date(moa.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-5 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button 
                                                            onClick={() => {
                                                                setSelectedMotherMoa(moa);
                                                                setIsSupplementalModalOpen(true);
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-600 hover:text-white transition-all shadow-sm font-bold text-xs group/btn"
                                                            title="Add Supplemental MOA"
                                                        >
                                                            <FiPlus size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                            Add Supplemental
                                                        </button>
                                                        <button 
                                                            onClick={() => setPreviewMoa(moa)}
                                                            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm font-bold text-xs group/btn"
                                                            title="Preview/View Mother MOA"
                                                        >
                                                            <FiEye size={14} className="group-hover/btn:scale-110 transition-transform" />
                                                            Preview/View
                                                        </button>
                                                        <button 
                                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                                            title="Delete"
                                                            onClick={async () => {
                                                                if (window.confirm("Are you sure you want to delete this Mother MOA document mapping?")) {
                                                                    try {
                                                                        const res = await fetch(`/api/engineer-mother-moas/${moa.mother_moa_id}`, {
                                                                            method: 'DELETE'
                                                                        });
                                                                        if (res.ok) {
                                                                            setMoas(prev => prev.filter(m => m.mother_moa_id !== moa.mother_moa_id));
                                                                        } else {
                                                                            alert("Failed to delete Mother MOA.");
                                                                        }
                                                                    } catch (e) {
                                                                        alert("Error: " + e.message);
                                                                    }
                                                                }
                                                            }}
                                                        >
                                                            <FiTrash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="px-8 py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <div className="w-16 h-16 bg-slate-50 rounded-[2rem] flex items-center justify-center text-slate-200">
                                                        <FiFileText size={32} />
                                                    </div>
                                                    <div>
                                                        <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-[10px]">No Documents Found</p>
                                                        <p className="text-[12px] text-slate-500 font-medium mt-1">Start by adding your first Mother MOA link above.</p>
                                                    </div>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <BottomNav userRole="EFD Engineer" />

                {/* Status Toast */}
                {isUploading && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-md text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-4 z-[2000] border border-white/10 animate-in fade-in slide-in-from-bottom-5">
                        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                        <p className="text-[13px] font-black uppercase tracking-widest whitespace-nowrap">Securely processing archive...</p>
                    </div>
                )}

                {/* GDrive Preview Modal */}
                {previewMoa && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-8 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-6xl h-full max-h-[90vh] rounded-[2rem] shadow-2xl overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-300">
                            {/* Modal Header */}
                            <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-white z-10">
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 rounded-2xl bg-blue-50 flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                        <FiFileText size={24} />
                                    </div>
                                    <div>
                                        <h3 className="font-black text-slate-800 text-lg leading-tight">Mother MOA Preview</h3>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest mt-0.5">{previewMoa.lgu_name} • {previewMoa.lgu_type} MOA</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <a 
                                        href={previewMoa.moa_pdf}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="p-3 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-2xl transition-all border border-transparent hover:border-blue-100"
                                        title="Open in Google Drive"
                                    >
                                        <FiUpload size={20} className="rotate-45" /> 
                                    </a>
                                    <button 
                                        onClick={() => setPreviewMoa(null)}
                                        className="p-3 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all border border-transparent hover:border-red-100"
                                    >
                                        <FiX size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Content */}
                            <div className="flex-1 bg-slate-50 relative flex flex-col lg:flex-row overflow-hidden">
                                {/* Iframe Preview */}
                                <div className="flex-1 h-full">
                                    <iframe 
                                        src={getPreviewUrl(previewMoa.moa_pdf)}
                                        className="w-full h-full border-0"
                                        allow="autoplay"
                                        title="GDrive Preview"
                                    />
                                </div>

                                {/* Supplemental MOAs Sidebar */}
                                {supplementals.length > 0 && (
                                    <div className="lg:w-80 w-full bg-white border-l border-slate-100 overflow-y-auto p-6 hidden lg:block">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Supplemental Documents</h4>
                                        <div className="space-y-3">
                                            {supplementals.map((sup, idx) => (
                                                <div key={sup.supplamental_moa_id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 hover:border-emerald-200 transition-all group">
                                                    <div className="flex items-center gap-3 mb-2">
                                                        <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600">
                                                            <FiFileText size={16} />
                                                        </div>
                                                        <div className="flex-1">
                                                            <p className="text-[11px] font-bold text-slate-700">Supplemental #{idx + 1}</p>
                                                            <p className="text-[9px] text-slate-400">{new Date(sup.created_at).toLocaleDateString()}</p>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Assigned IPCs */}
                                                    {sup.ipc_ids && sup.ipc_ids.length > 0 && (
                                                        <div className="flex flex-wrap gap-1 mb-3">
                                                            {sup.ipc_ids.map((ipc, i) => (
                                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[8px] font-black uppercase tracking-tighter border border-blue-100">
                                                                    {ipc}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                    <a 
                                                        href={sup.moa_pdf}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="w-full flex items-center justify-center gap-2 py-2 bg-white text-emerald-600 border border-emerald-100 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                    >
                                                        <FiEye size={12} />
                                                        View File
                                                    </a>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Mobile Supplementals Section */}
                            {supplementals.length > 0 && (
                                <div className="lg:hidden p-4 bg-slate-50 border-t border-slate-100">
                                    <h4 className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-3">Supplemental Documents Available ({supplementals.length})</h4>
                                    <div className="flex gap-2 overflow-x-auto pb-2 custom-scrollbar">
                                        {supplementals.map((sup, idx) => (
                                            <a 
                                                key={idx}
                                                href={sup.moa_pdf}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="shrink-0 flex items-center gap-2 px-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold text-slate-600 whitespace-nowrap"
                                            >
                                                <FiFileText size={12} className="text-emerald-500" />
                                                <div className="flex flex-col items-start leading-none">
                                                    <span>Sup #{idx + 1}</span>
                                                    {sup.ipc_ids && sup.ipc_ids.length > 0 && (
                                                        <span className="text-[7px] text-blue-500 font-black uppercase mt-0.5">{sup.ipc_ids.length} IPCs</span>
                                                    )}
                                                </div>
                                            </a>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Modal Footer */}
                            <div className="px-8 py-4 bg-white border-t border-slate-100 flex items-center justify-between">
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                    Document Registry • ID: {previewMoa.mother_moa_id}
                                </p>
                                <p className="text-[10px] text-slate-300 font-medium italic">
                                    Secure Iframe Previewing Enabled
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Supplemental Upload Modal */}
                {isSupplementalModalOpen && selectedMotherMoa && (
                    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 shadow-sm">
                                            <FiPlus size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 tracking-tight">Add Supplemental</h3>
                                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-0.5">{selectedMotherMoa.lgu_name} Mother MOA</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setIsSupplementalModalOpen(false);
                                            setSupplementalLink('');
                                            setSelectedMotherMoa(null);
                                        }}
                                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                                    >
                                        <FiX size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                            Supplemental PDF File
                                        </label>
                                        <div className={`w-full flex items-center px-4 py-3 bg-slate-50 border-2 rounded-2xl transition-all ${supplementalFile ? 'border-emerald-400 bg-emerald-50/30' : 'border-slate-100 focus-within:border-emerald-300 focus-within:bg-white'}`}>
                                            <FiUpload className={`${supplementalFile ? 'text-emerald-500' : 'text-slate-400'} shrink-0`} size={18} />
                                            <input 
                                                type="file"
                                                accept="application/pdf"
                                                onChange={(e) => setSupplementalFile(e.target.files[0])}
                                                className="w-full bg-transparent border-none focus:ring-0 text-[13px] font-semibold text-slate-700 ml-3 file:mr-4 file:py-1 file:px-4 file:rounded-full file:border-0 file:text-[11px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                                            />
                                        </div>
                                    </div>
                                    
                                    {/* Project Assignment (IPC) */}
                                    <div>
                                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 ml-1">
                                            Assign to Projects (IPC)
                                        </label>
                                        <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 flex flex-col gap-3">
                                            {/* Project Search */}
                                            <div className="relative">
                                                <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                                <input 
                                                    type="text"
                                                    placeholder="Search projects..."
                                                    value={projectSearch}
                                                    onChange={(e) => setProjectSearch(e.target.value)}
                                                    className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-[12px] font-semibold text-slate-700 placeholder:text-slate-300 focus:ring-2 focus:ring-emerald-100 transition-all"
                                                />
                                            </div>

                                            <div className="max-h-48 overflow-y-auto custom-scrollbar space-y-2">
                                                {availableProjects.filter(p => 
                                                    p.project_name?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                                    p.ipc?.toLowerCase().includes(projectSearch.toLowerCase())
                                                ).length > 0 ? (
                                                    availableProjects
                                                        .filter(p => 
                                                            p.project_name?.toLowerCase().includes(projectSearch.toLowerCase()) || 
                                                            p.ipc?.toLowerCase().includes(projectSearch.toLowerCase())
                                                        )
                                                        .map((proj) => (
                                                            <label key={proj.project_id} className="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-xl cursor-pointer hover:border-emerald-200 hover:shadow-sm transition-all group">
                                                                <input 
                                                                    type="checkbox"
                                                                    checked={selectedIpcs.includes(proj.ipc)}
                                                                    onChange={(e) => {
                                                                        if (e.target.checked) {
                                                                            setSelectedIpcs([...selectedIpcs, proj.ipc]);
                                                                        } else {
                                                                            setSelectedIpcs(selectedIpcs.filter(id => id !== proj.ipc));
                                                                        }
                                                                    }}
                                                                    className="w-5 h-5 rounded-lg border-slate-300 text-emerald-600 focus:ring-emerald-500 transition-all"
                                                                />
                                                                <div className="flex flex-col min-w-0">
                                                                    <span className="text-[13px] font-black text-slate-800 leading-tight group-hover:text-emerald-700 transition-colors">
                                                                        {proj.project_name}
                                                                    </span>
                                                                    <div className="flex items-center gap-2 mt-1">
                                                                        <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded-md text-[9px] font-black uppercase tracking-tight border border-blue-100">
                                                                            {proj.ipc}
                                                                        </span>
                                                                        {proj.school_name && (
                                                                            <span className="text-[9px] text-slate-400 font-bold truncate">
                                                                                {proj.school_name}
                                                                            </span>
                                                                        )}
                                                                    </div>
                                                                </div>
                                                            </label>
                                                        ))
                                                ) : (
                                                    <div className="py-4 text-center">
                                                        <p className="text-[10px] text-slate-400 font-medium whitespace-normal">No projects found matching your search.</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <p className="mt-2 text-[9px] text-slate-400 font-medium ml-1">
                                            Selected: <span className="text-emerald-600 font-bold">{selectedIpcs.length} Projects</span>
                                        </p>
                                    </div>

                                    <button
                                        onClick={handleUploadSupplemental}
                                        disabled={isUploadingSupplemental || !supplementalLink}
                                        className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black text-[13px] uppercase tracking-wider shadow-lg transition-all ${isUploadingSupplemental || !supplementalLink ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-emerald-600 text-white hover:bg-emerald-700 hover:-translate-y-1 active:scale-95 shadow-emerald-900/20'}`}
                                    >
                                        {isUploadingSupplemental ? (
                                            <>
                                                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                                Syncing...
                                            </>
                                        ) : (
                                            <>
                                                <FiUpload size={18} />
                                                Submit Supplemental
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </PageTransition>
    );
};

export default EFDMotherMoa;
