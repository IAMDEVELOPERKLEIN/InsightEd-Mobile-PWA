import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
    FiChevronRight, FiAlertCircle, FiInfo, FiSearch, 
    FiList, FiDatabase, FiLoader, FiActivity, FiX, FiLayers,
    FiTrendingUp, FiCheckCircle, FiTarget, FiDollarSign, FiAlertTriangle, FiArrowLeft
} from 'react-icons/fi';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList 
} from 'recharts';
import BottomNav from './BottomNav';
import { LuActivity } from "react-icons/lu";

const API_BASE = "";

const EFDNewconMonitoring = () => {
    const [activeTab, setActiveTab] = useState('info'); // 'info' | 'details'
    const [showModal, setShowModal] = useState(false);
    const [modalSearch, setModalSearch] = useState('');
    const [currentPage, setCurrentPage] = useState(1);
    const [recordsPerPage, setRecordsPerPage] = useState(10);
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [importMsg, setImportMsg] = useState('');
    const [selectedVersion, setSelectedVersion] = useState('2026');
    const [dataMode, setDataMode] = useState('masterlist'); // 'masterlist' | '2026'
    const [region, setRegion] = useState(''); // Added missing state or placeholder
    const [division, setDivision] = useState(''); // Added missing state or placeholder
    const [userRole, setUserRole] = useState(() => {
        const saved = localStorage.getItem('userRole');
        if (saved === 'hrodi_engineer') return 'HRODI Engineer';
        return saved || '';
    });

    // Load data on mount
    useEffect(() => {
        loadData();
    }, [selectedVersion, dataMode]);

    const loadData = async (filterSty = null, filterCl = null) => {
        setLoading(true);
        try {
            let url = '';
            if (filterSty !== null && filterCl !== null) {
                if (dataMode === 'masterlist') {
                    url = `/api/masterlist/prototype-schools?sty=${filterSty}&cl=${filterCl}&version=${selectedVersion}`;
                } else {
                    url = `/api/projects?sty=${filterSty}&cl=${filterCl}`;
                }
            } else if (filterSty !== null) {
                if (dataMode === 'masterlist') {
                    url = `/api/deped-infrariorities?version=${selectedVersion}&sty=${filterSty}`;
                } else {
                    url = `/api/projects?sty=${filterSty}`;
                }
            } else {
                if (dataMode === 'masterlist') {
                    url = `/api/deped-infrariorities?version=${selectedVersion}`;
                } else {
                    url = `/api/projects`;
                }
            }

            const separator = url.includes('?') ? '&' : '?';
            const params = [];
            if (region) params.push(`region=${encodeURIComponent(region)}`);
            if (division) params.push(`division=${encodeURIComponent(division)}`);
            
            if (params.length > 0) {
                url += `${separator}${params.join('&')}`;
            }

            const res = await fetch(url);
            if (res.ok) {
                const data = await res.json();
                setRows(Array.isArray(data) ? data : []);
            }
        } catch (err) {
            console.error("Load Data Error:", err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };



    const handleAssign = async (id, agency) => {
        try {
            const res = await fetch(`${API_BASE}/api/deped-infrariorities/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, assigned_to: agency, version: selectedVersion })
            });
            if (res.ok) {
                loadData();
            }
        } catch (err) {
            console.error("Assignment error:", err);
        }
    };

    const handleImport = async () => {
        try {
            setLoading(true);
            const res = await fetch(`${API_BASE}/api/deped-infrariorities/import`, { method: 'POST' });
            const data = await res.json();
            setImportMsg(data.message);
            loadData();
        } catch (err) {
            console.error("Import error:", err);
            setImportMsg("Import failed");
        } finally {
            setLoading(false);
        }
    };



    const filteredRows = rows.filter(r => {
        if (!search) return true;
        const q = search.toLowerCase();
        return (
            (r.school_id || '').toString().toLowerCase().includes(q) ||
            (r.school_name || '').toLowerCase().includes(q) ||
            (r.project_name || '').toLowerCase().includes(q) ||
            (r.region || '').toLowerCase().includes(q) ||
            (r.legislative_district || '').toLowerCase().includes(q) ||
            (r.division || '').toLowerCase().includes(q)
        );
    });
    
    const finalFilteredRows = filteredRows;

    const totalAmount = rows.reduce((s, r) => s + (Number(r.amount) || 0), 0);
    const filteredAmount = finalFilteredRows.reduce((s, r) => s + (Number(r.amount) || 0), 0);

    const indexOfLastRow = currentPage * recordsPerPage;
    const indexOfFirstRow = indexOfLastRow - recordsPerPage;
    const currentRows = finalFilteredRows.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(finalFilteredRows.length / recordsPerPage);

    return (
        <div className="min-h-screen bg-slate-50/50 font-sans text-slate-900 pb-32">
            <main className="container mx-auto px-4 md:px-8 lg:px-16 pt-10 max-w-7xl">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="w-full flex flex-col"
                >
                    <div className="mb-4">
                        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Newcon Priorities</h1>
                        <p className="text-slate-500 mt-1 font-medium italic">Congressional Initiatives & Infrastructure Planning</p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden flex flex-col flex-1 mb-10">
                        <div className="bg-gradient-to-r from-amber-500 to-yellow-500 px-6 sm:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-6">
                            <div className="flex items-center gap-4 w-full sm:w-auto">
                                <div className="p-3 bg-white/20 rounded-2xl text-white shrink-0">
                                    <FiAlertCircle size={24} />
                                </div>
                                <div className="min-w-0">
                                    <div className="flex bg-white/20 p-1 rounded-xl mb-1 mt-1 w-max">
                                        <button 
                                            onClick={() => setDataMode('masterlist')}
                                            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${dataMode === 'masterlist' ? 'bg-white text-amber-600 shadow-sm' : 'text-white hover:bg-white/50'}`}
                                        >
                                            Masterlist
                                        </button>
                                        <button 
                                            onClick={() => setDataMode('2026')}
                                            className={`px-3 py-1 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${dataMode === '2026' ? 'bg-white text-amber-600 shadow-sm' : 'text-white hover:bg-white/50'}`}
                                        >
                                            2026
                                        </button>
                                    </div>
                                    <p className="text-amber-100 text-[10px] font-black uppercase tracking-widest truncate">{finalFilteredRows.length} Projects in View</p>
                                </div>
                            </div>
                            <div className="flex bg-white/20 rounded-2xl p-1.5 gap-1.5 backdrop-blur-sm shadow-xl w-full sm:w-auto">
                                <button onClick={() => setActiveTab('info')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'info' ? 'bg-white text-amber-600 shadow-lg' : 'text-white hover:bg-white/20'}`}>
                                    <FiInfo size={16} /> Summary
                                </button>
                                <button onClick={() => setActiveTab('details')} className={`flex-1 sm:flex-none px-4 sm:px-6 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all flex items-center justify-center gap-2 ${activeTab === 'details' ? 'bg-white text-amber-600 shadow-lg' : 'text-white hover:bg-white/20'}`}>
                                    <FiList size={16} /> Details
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-8 bg-white">
                            {activeTab === 'info' ? (
                                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {rows.length === 0 && !loading ? (
                                        <div className="text-center py-24 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                                            <FiDatabase className="mx-auto w-16 h-16 mb-6 opacity-20 text-slate-400" />
                                            <h4 className="text-xl font-bold text-slate-800">No initiatives data found</h4>
                                            <p className="text-slate-500 mt-2 mb-8">Please import the latest data to begin tracking.</p>
                                            <button onClick={handleImport} className="bg-amber-500 text-white font-black px-10 py-4 rounded-2xl hover:bg-amber-600 shadow-lg shadow-amber-200 transition-all active:scale-95">Import Masterlist Data</button>
                                        </div>
                                    ) : (
                                        <>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                                                <div className="bg-gradient-to-br from-amber-50 to-white border border-amber-100 rounded-3xl p-6 sm:p-8 shadow-sm group hover:shadow-md transition-all">
                                                    <p className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-2 group-hover:text-amber-500">Total Readily Implementable Projects</p>
                                                    <p className="text-4xl sm:text-5xl font-black text-amber-700">{finalFilteredRows.length.toLocaleString()}</p>
                                                </div>
                                                <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-100 rounded-3xl p-6 sm:p-8 shadow-sm group hover:shadow-md transition-all">
                                                    <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-2 group-hover:text-emerald-500">Total Budget</p>
                                                    <p className="text-4xl sm:text-5xl font-black text-emerald-700">₱{(totalAmount / 1_000_000_000).toFixed(2)}B</p>
                                                </div>
                                            </div>
                                            
                                            <div className="bg-slate-50 rounded-3xl p-8 border border-slate-100 flex items-start gap-4">
                                                <FiInfo className="text-amber-500 shrink-0 mt-1" size={20} />
                                                <div className="text-slate-600 leading-relaxed">
                                                    <p className="font-bold text-slate-800 mb-1">About Masterlist</p>
                                                    <p className="text-sm italic">Newcon Priorities represent high-priority school infrastructure projects identified for strategic implementation. These projects are specifically allocated and can be assigned to various implementing agencies for streamlined monitoring and progression. Accurate tracking here ensures that critical infrastructure gaps are addressed efficiently through our partnership network.</p>
                                                </div>
                                            </div>
                                            <p className="text-[10px] font-bold text-slate-400 mt-4 uppercase tracking-widest text-right italic">Current View: {selectedVersion} Priorities</p>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <div className="flex flex-col md:flex-row items-center gap-4 mb-8">
                                        <div className="relative flex-1 w-full max-w-none md:max-w-md">
                                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search by ID, name, region, or district…"
                                                value={search}
                                                onChange={e => setSearch(e.target.value)}
                                                className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-amber-100 focus:border-amber-400 outline-none transition-all"
                                            />
                                        </div>
                                        {importMsg && <span className="text-[10px] font-black text-amber-600 bg-amber-100/50 px-4 py-2 rounded-full whitespace-nowrap">{importMsg}</span>}
                                    </div>

                                    <div className="flex-1 overflow-auto rounded-3xl border border-slate-100 shadow-inner bg-slate-50/30">
                                        <table className="w-full text-xs border-separate border-spacing-0">
                                            <thead>
                                                <tr className="bg-slate-100/80 backdrop-blur-md sticky top-0 z-20">
                                                    {['School ID', 'School Name', 'Project Name', 'Amount', 'Status', dataMode === '2026' ? 'Progress' : null, 'Region', 'Division', 'Leg. District'].filter(Boolean).map(h => (
                                                        <th key={h} className="px-6 py-5 text-left font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                                                    ))}
                                                    <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap sticky right-[160px] bg-slate-100/80 z-20">Implementing Office</th>
                                                    <th className="px-6 py-5 text-left font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap sticky right-0 bg-slate-100/80 z-20">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {currentRows.map((r, i) => (
                                                    <tr key={i} className={`group hover:bg-white transition-colors ${i % 2 === 0 ? 'bg-white/40' : 'bg-slate-50/40'}`}>
                                                        <td className="px-6 py-4 font-mono font-bold text-slate-600 border-b border-white">{r.school_id || '—'}</td>
                                                        <td className="px-6 py-4 font-black text-slate-800 max-w-[250px] truncate border-b border-white" title={r.school_name}>{r.school_name || '—'}</td>
                                                        <td className="px-6 py-4 font-medium text-slate-600 max-w-[250px] truncate border-b border-white" title={r.project_name}>{r.project_name || '—'}</td>
                                                        <td className="px-6 py-4 font-black text-emerald-700 whitespace-nowrap border-b border-white">₱{(Number(r.amount)/1_000_000).toFixed(1)}M</td>
                                                        <td className="px-6 py-4 border-b border-white">
                                                            <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                                                r.masterlist_status?.toLowerCase().includes('completed') ? 'bg-emerald-100 text-emerald-700' :
                                                                r.masterlist_status?.toLowerCase().includes('on-going') ? 'bg-blue-100 text-blue-700' :
                                                                'bg-slate-100 text-slate-600'
                                                            }`}>{r.masterlist_status || '—'}</span>
                                                        </td>
                                                        {dataMode === '2026' && (
                                                            <td className="px-6 py-4 font-black border-b border-white">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden min-w-[60px]">
                                                                        <div 
                                                                            className="h-full bg-emerald-500 transition-all duration-500" 
                                                                            style={{ width: `${r.accomplishment_percentage || 0}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="text-emerald-700">{r.accomplishment_percentage || 0}%</span>
                                                                </div>
                                                            </td>
                                                        )}
                                                        <td className="px-6 py-4 text-slate-500 font-bold border-b border-white whitespace-nowrap">{r.region || '—'}</td>
                                                        <td className="px-6 py-4 text-slate-500 font-bold border-b border-white whitespace-nowrap">{r.division || '—'}</td>
                                                        <td className="px-6 py-4 text-slate-500 font-bold border-b border-white whitespace-nowrap">{r.legislative_district || '—'}</td>
                                                        <td className="px-6 py-4 border-b border-white sticky right-[160px] bg-blue-50/80 group-hover:bg-blue-50 transition-colors z-10 backdrop-blur-sm text-center">
                                                            {r.assigned_to ? (
                                                                <span className="bg-indigo-600 text-white px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider shadow-sm">{r.assigned_to}</span>
                                                            ) : (
                                                                <span className="text-slate-300 italic font-medium">Not Assigned</span>
                                                            )}
                                                        </td>
                                                        <td className="px-6 py-4 border-b border-white sticky right-0 bg-blue-50/80 group-hover:bg-blue-50 transition-colors z-10 backdrop-blur-sm min-w-[160px]">
                                                            <select 
                                                                className="bg-white border-2 border-slate-100 rounded-xl px-2 py-1.5 text-[10px] font-black uppercase tracking-wider outline-none focus:ring-2 focus:ring-amber-400 transition-all cursor-pointer hover:border-amber-200 w-full"
                                                                value={r.assigned_to || ''}
                                                                onChange={(e) => handleAssign(r.id, e.target.value)}
                                                            >
                                                                <option value="">Implementing Office</option>
                                                                <option value="PGO">PGO</option>
                                                                <option value="MGO">MGO</option>
                                                                <option value="CGO">CGO</option>
                                                                <option value="DPWH">DPWH</option>
                                                                <option value="DEPED">DepEd</option>
                                                                <option value="CSO">CSO</option>
                                                            </select>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                    <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4 px-2">
                                        <div className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex flex-wrap items-center gap-6">
                                            <span>Showing {indexOfFirstRow + 1}-{Math.min(indexOfLastRow, finalFilteredRows.length)} of {finalFilteredRows.length} filtered</span>
                                            <span className="h-1 w-1 bg-slate-200 rounded-full" />
                                            <span>Filtered Budget: <span className="text-emerald-600">₱{(filteredAmount / 1_000_000_000).toFixed(2)}B</span></span>
                                        </div>
                                        
                                        <div className="flex items-center gap-2">
                                            <button 
                                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                                disabled={currentPage === 1}
                                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                                            >
                                                <FiChevronRight className="rotate-180" />
                                            </button>
                                            <span className="text-[10px] font-black text-slate-500 bg-slate-100 px-4 py-2 rounded-xl">Page {currentPage} of {totalPages}</span>
                                            <button 
                                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-400 hover:text-blue-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-all"
                                            >
                                                <FiChevronRight />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>


                </motion.div>
            </main>
            <BottomNav userRole={userRole} />
        </div>
    );
};

export default EFDNewconMonitoring;
