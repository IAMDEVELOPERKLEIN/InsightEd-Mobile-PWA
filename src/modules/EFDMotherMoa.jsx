import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFileText, FiChevronDown, FiPlus, FiSearch, FiX, FiCheck, FiDownload, FiTrash2, FiAlertCircle, FiList, FiSettings } from 'react-icons/fi';
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
    const [region, setRegion] = useState('');
    const [province, setProvince] = useState(''); // This acts as the LGU Name base
    const [municipalityCity, setMunicipalityCity] = useState('');
    const [lguType, setLguType] = useState('');
    
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);
    const [moas, setMoas] = useState([]);
    const [loading, setLoading] = useState(true);
    const [locations, setLocations] = useState([]); // Master list of locations
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

    // Derived Options for Dropdowns
    const regionOptions = [...new Set(locations.map(l => l.region))].sort();
    
    const provinceOptions = useMemo(() => {
        if (!region) return [];
        return [...new Set(locations.filter(l => l.region === region).map(l => l.province))].filter(Boolean).sort();
    }, [region, locations]);

    const muniCityOptions = useMemo(() => {
        if (!province) return [];
        const filtered = locations.filter(l => l.province === province);
        return [...new Set(filtered.map(l => l.municipality || l.city))].filter(Boolean).sort();
    }, [province, locations]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== 'application/pdf') {
                alert("Please upload a PDF file.");
                return;
            }
            setSelectedFile(file);
        }
    };

    const convertToBase64 = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    };

    const handleUpload = async () => {
        if (!region || !province || !lguType || !selectedFile) {
            alert("Please complete the required fields (Region, Province, LGU Type and File).");
            return;
        }

        if ((lguType === 'CGO' || lguType === 'MGO') && !municipalityCity) {
            alert(`Please select a Municipality/City for ${lguType} selection.`);
            return;
        }

        setIsUploading(true);
        try {
            const base64 = await convertToBase64(selectedFile);
            const res = await fetch('/api/upload-engineer-mother-moa', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    region,
                    province,
                    municipality_city: municipalityCity,
                    lgu_type: lguType,
                    lgu_name: lguType === 'PGO' ? province : municipalityCity, // The actual entity name
                    moa_pdf: base64,
                    uid: user.uid
                })
            });

            if (res.ok) {
                alert("Successfully uploaded Mother MOA!");
                // Refresh list
                const refreshedRes = await fetch('/api/engineer-mother-moas');
                if (refreshedRes.ok) {
                    const data = await refreshedRes.json();
                    setMoas(data);
                }
                // Reset form (except region maybe?)
                setProvince('');
                setMunicipalityCity('');
                setLguType('');
                setSelectedFile(null);
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
                        <div className="flex items-center gap-3 mb-8">
                            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
                                <FiPlus size={20} />
                            </div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">New MOA Upload</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-end">
                            {/* Region */}
                            <SearchableSelect 
                                label="Region"
                                options={regionOptions}
                                selected={region}
                                onSelect={(val) => { setRegion(val); setProvince(''); setMunicipalityCity(''); }}
                                icon={TbMapPin}
                                placeholder="Search regions..."
                            />

                            {/* Province (LGU Name) */}
                            <SearchableSelect 
                                label="Province"
                                options={provinceOptions}
                                selected={province}
                                onSelect={(val) => { setProvince(val); setMunicipalityCity(''); }}
                                icon={TbBuildingCommunity}
                                placeholder="Select province..."
                            />

                            {/* LGU Type */}
                            <SearchableSelect 
                                label="LGU Type"
                                options={LGU_TYPES}
                                selected={lguType}
                                onSelect={setLguType}
                                icon={FiSettings}
                                placeholder="Filter types..."
                            />

                            {/* Municipality/City (Conditional) */}
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
                                    <div className="w-full h-[52px] bg-slate-50 border border-slate-100 rounded-2xl"></div>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            {/* File Input */}
                            <div className="flex-1 max-w-sm">
                                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5 ml-1">
                                    Documents (PDF only)
                                </label>
                                <div className="relative group">
                                    <input 
                                        type="file" 
                                        accept=".pdf"
                                        onChange={handleFileChange}
                                        className="hidden"
                                        id="moa-upload"
                                    />
                                    <label 
                                        htmlFor="moa-upload"
                                        className={`w-full flex items-center justify-between px-4 py-3 bg-slate-50 border-2 border-dashed rounded-2xl cursor-pointer transition-all ${selectedFile ? 'border-blue-400 bg-blue-50' : 'border-slate-200 hover:border-blue-300'}`}
                                    >
                                        <div className="flex items-center gap-3 truncate">
                                            {selectedFile ? (
                                                <FiFileText className="text-blue-500 shrink-0" size={18} />
                                            ) : (
                                                <FiUpload className="text-slate-400" size={18} />
                                            )}
                                            <span className={`text-[13px] font-semibold truncate ${selectedFile ? 'text-blue-700' : 'text-slate-500'}`}>
                                                {selectedFile ? selectedFile.name : 'Choose PDF File'}
                                            </span>
                                        </div>
                                        {selectedFile && (
                                            <button 
                                                onClick={(e) => { e.preventDefault(); setSelectedFile(null); }}
                                                className="p-1.5 hover:bg-blue-100 rounded-lg text-blue-600 transition-colors"
                                            >
                                                <FiX size={14} />
                                            </button>
                                        )}
                                    </label>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={isUploading || !selectedFile || !region || !province || !lguType}
                                className={`flex items-center gap-2 px-8 py-4 rounded-2xl font-black text-[13px] uppercase tracking-wider shadow-lg transition-all ${isUploading || !selectedFile || !region || !province || !lguType ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' : 'bg-[#004A99] text-white hover:bg-blue-700 hover:-translate-y-1 active:scale-95 shadow-blue-900/20'}`}
                            >
                                {isUploading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                                        Uploading...
                                    </>
                                ) : (
                                    <>
                                        <FiUpload size={16} />
                                        Upload Mother MOA
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
                                            <tr key={moa.id} className="hover:bg-slate-50/80 transition-colors group">
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
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <a 
                                                            href={moa.moa_pdf}
                                                            download={`Mother_MOA_${moa.lgu_name}.pdf`}
                                                            className="p-2.5 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                            title="Download PDF"
                                                        >
                                                            <FiDownload size={16} />
                                                        </a>
                                                        <button 
                                                            className="p-2.5 bg-slate-50 text-slate-400 rounded-xl hover:bg-red-50 hover:text-red-500 transition-all shadow-sm"
                                                            title="Delete"
                                                            onClick={() => alert("Delete functionality pending super-admin approval.")}
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
                                                        <p className="text-[12px] text-slate-500 font-medium mt-1">Start by uploading your first Mother MOA above.</p>
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
                        <p className="text-[13px] font-black uppercase tracking-widest whitespace-nowrap">Securely processing upload...</p>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default EFDMotherMoa;
