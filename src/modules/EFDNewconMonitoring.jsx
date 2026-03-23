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
    const [drillDownLevel, setDrillDownLevel] = useState('storey'); // 'storey' | 'prototype'
    const [selectedStorey, setSelectedStorey] = useState(null);
    const [selectedStoreyType, setSelectedStoreyType] = useState(null);
    const [storeyBreakdown, setStoreyBreakdown] = useState([]);
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
    }, [selectedVersion]);

    useEffect(() => {
        loadBreakdown();
    }, [dataMode]);

    const loadBreakdown = async () => {
        try {
            const endpoint = dataMode === 'masterlist' 
                ? '/api/masterlist/storey-breakdown' 
                : '/api/monitoring/engineer-storey-breakdown';
            const res = await fetch(`${API_BASE}${endpoint}`);
            if (res.ok) {
                const data = await res.json();
                setStoreyBreakdown(data);
            }
        } catch (err) {
            console.error("Load Breakdown Error:", err);
        }
    };

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

    useEffect(() => {
        if (selectedStoreyType) {
            loadData(selectedStoreyType.storeys, selectedStoreyType.classrooms);
        } else if (selectedStorey) {
            loadData(selectedStorey, null);
        } else {
            loadData();
        }
    }, [selectedStoreyType, selectedStorey, dataMode, selectedVersion]);

    const handleAssign = async (id, agency) => {
        try {
            const res = await fetch(`${API_BASE}/api/deped-infrariorities/assign`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, assigned_to: agency, version: selectedVersion })
            });
            if (res.ok) {
                if (selectedStoreyType) {
                    loadData(selectedStoreyType.storeys, selectedStoreyType.classrooms);
                } else {
                    loadData();
                }
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

    const storeyAggregated = React.useMemo(() => {
        const counts = {};
        storeyBreakdown.forEach(item => {
            const s = Number(item.storey);
            counts[s] = (counts[s] || 0) + Number(item.count);
        });
        return Object.entries(counts).map(([s, count]) => ({
            name: `${s}sty`,
            count,
            storey: Number(s)
        })).sort((a, b) => a.storey - b.storey);
    }, [storeyBreakdown]);

    const prototypeAggregated = React.useMemo(() => {
        if (!selectedStorey) return [];
        return storeyBreakdown
            .filter(item => Number(item.storey) === selectedStorey)
            .map(item => ({
                name: `${item.storey}sty ${item.classrooms}cl`,
                count: Number(item.count),
                storey: item.storey,
                classrooms: item.classrooms
            })).sort((a, b) => a.classrooms - b.classrooms);
    }, [storeyBreakdown, selectedStorey]);

    const activeChartData = drillDownLevel === 'storey' ? storeyAggregated : prototypeAggregated;

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
                                    <h3 className="text-white font-black text-xl sm:text-2xl truncate">{dataMode === 'masterlist' ? 'Masterlist' : '2026'}</h3>
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

                    {selectedStoreyType && (
                        <motion.div 
                            initial={{ opacity: 0, y: -10 }} 
                            animate={{ opacity: 1, y: 0 }}
                            className="mb-10 flex items-center justify-between bg-indigo-600 p-4 rounded-3xl shadow-xl shadow-indigo-200 text-white"
                        >
                            <div className="flex items-center gap-4">
                                <div className="p-2 bg-white/20 rounded-xl">
                                    <FiLayers size={20} />
                                </div>
                                <div>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Active Drill-down</p>
                                    <h4 className="text-lg font-black uppercase tracking-tight">{selectedStoreyType.storeys} Storey - {selectedStoreyType.classrooms} Classrooms</h4>
                                </div>
                            </div>
                            <button 
                                onClick={() => { setSelectedStoreyType(null); setShowModal(false); }}
                                className="px-6 py-2 bg-white text-indigo-600 rounded-xl text-xs font-black shadow-lg hover:bg-slate-50 transition-all flex items-center gap-2"
                            >
                                <FiArrowLeft /> Back to Overview
                            </button>
                        </motion.div>
                    )}

                    <div className="mb-10 bg-white p-8 rounded-[3rem] shadow-xl shadow-blue-900/5 border border-slate-100">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-6 mb-8">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                                    <FiLayers size={24} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                                        Building Standards 
                                    </h3>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                                        {drillDownLevel === 'storey' ? 'Select storey level to explore classrooms' : `Classroom prototypes for ${selectedStorey} Storey buildings`}
                                    </p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-3">
                                <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
                                    <button 
                                        onClick={() => { setDataMode('masterlist'); setDrillDownLevel('storey'); setSelectedStorey(null); setSelectedStoreyType(null); }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataMode === 'masterlist' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        Masterlist
                                    </button>
                                    <button 
                                        onClick={() => { setDataMode('2026'); setDrillDownLevel('storey'); setSelectedStorey(null); setSelectedStoreyType(null); }}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${dataMode === '2026' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                                    >
                                        2026
                                    </button>
                                </div>

                                <select 
                                    className="bg-white border-2 border-slate-100 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-400 transition-all cursor-pointer hover:border-indigo-200 shadow-sm"
                                    value={selectedStorey || ''}
                                    onChange={(e) => {
                                        const val = e.target.value ? Number(e.target.value) : null;
                                        setSelectedStorey(val);
                                        setDrillDownLevel(val ? 'prototype' : 'storey');
                                        setSelectedStoreyType(null);
                                    }}
                                >
                                    <option value="">All Storeys</option>
                                    {storeyAggregated.map(s => <option key={s.storey} value={s.storey}>{s.storey} Storey</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="h-[400px] w-full mt-4">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    layout="vertical"
                                    data={activeChartData}
                                    margin={{ top: 5, right: 60, left: 100, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        dataKey="name" 
                                        type="category" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fill: '#475569', fontSize: 10, fontWeight: 900 }} 
                                        width={90}
                                    />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }}
                                        labelStyle={{ fontWeight: 900, color: '#1e293b', marginBottom: '4px' }}
                                    />
                                    <Bar 
                                        dataKey="count" 
                                        radius={[0, 8, 8, 0]} 
                                        barSize={32} 
                                        className="cursor-pointer"
                                        onClick={(payload) => {
                                            if (payload) {
                                                if (drillDownLevel === 'storey') {
                                                    setSelectedStorey(payload.storey);
                                                    setDrillDownLevel('prototype');
                                                } else {
                                                    setSelectedStoreyType({ storeys: payload.storey, classrooms: payload.classrooms });
                                                    setShowModal(true);
                                                }
                                            }
                                        }}
                                    >
                                        {activeChartData.map((entry, index) => (
                                            <Cell 
                                                key={`cell-${index}`} 
                                                fill={
                                                    drillDownLevel === 'storey' 
                                                        ? '#818cf8' 
                                                        : (selectedStoreyType?.classrooms === entry.classrooms ? '#4f46e5' : '#c7d2fe')
                                                } 
                                                className="transition-all duration-300 hover:opacity-80"
                                            />
                                        ))}
                                        <LabelList dataKey="count" position="right" offset={10} style={{ fill: '#6366f1', fontSize: 11, fontWeight: 900 }} />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {showModal && selectedStoreyType && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                            <motion.div 
                                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                className="bg-white w-full max-w-6xl max-h-[90vh] rounded-[2.5rem] shadow-2xl shadow-blue-900/40 overflow-hidden flex flex-col"
                            >
                                <div className="bg-gradient-to-r from-indigo-600 to-blue-600 p-8 flex items-center justify-between shrink-0">
                                    <div className="flex items-center gap-5">
                                        <div className="p-4 bg-white/20 rounded-2xl text-white">
                                            <FiLayers size={28} />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">
                                                {selectedStoreyType.storeys} Storey - {selectedStoreyType.classrooms} Classrooms
                                            </h2>
                                            <p className="text-blue-100 text-[10px] font-black uppercase tracking-widest mt-1">
                                                Found {rows.length} projects in this category
                                            </p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={() => setShowModal(false)}
                                        className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
                                    >
                                        <FiX size={24} />
                                    </button>
                                </div>

                                <div className="flex-1 p-8 overflow-hidden flex flex-col">
                                    <div className="mb-6 relative max-w-md">
                                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            type="text"
                                            placeholder="Search within this list..."
                                            value={modalSearch}
                                            onChange={e => setModalSearch(e.target.value)}
                                            className="w-full pl-12 pr-4 py-4 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-blue-100 focus:border-blue-400 outline-none transition-all"
                                        />
                                    </div>

                                    <div className="flex-1 overflow-auto rounded-3xl border border-slate-100 shadow-inner bg-slate-50/50">
                                        <table className="w-full text-xs border-separate border-spacing-0">
                                            <thead>
                                                <tr className="bg-slate-100/80 backdrop-blur-md sticky top-0 z-20">
                                                    {(dataMode === 'masterlist' 
                                                        ? ['School ID', 'School Name', 'Project Name', 'Amount', 'Shortage'] 
                                                        : ['School ID', 'School Name', 'Project Name', 'Amount', 'Status', 'Progress', 'Region', 'Division']
                                                    ).map(h => (
                                                        <th key={h} className="px-6 py-5 text-left font-black uppercase tracking-widest text-slate-500 border-b border-slate-200 whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {rows
                                                    .filter(r => !modalSearch || 
                                                        (r.school_name?.toLowerCase().includes(modalSearch.toLowerCase()) || 
                                                          r.project_name?.toLowerCase().includes(modalSearch.toLowerCase()) || 
                                                          r.school_id?.toString().includes(modalSearch)))
                                                    .map((r, i) => (
                                                        <tr key={i} className="group hover:bg-white transition-colors bg-white/40">
                                                            <td className="px-6 py-4 font-mono font-bold text-slate-600">{r.school_id || '—'}</td>
                                                            <td className="px-6 py-4 font-black text-slate-800" title={r.school_name}>{r.school_name || '—'}</td>
                                                            <td className="px-6 py-4 font-medium text-slate-600" title={r.project_name}>{r.project_name || '—'}</td>
                                                            <td className="px-6 py-4 font-black text-emerald-700 whitespace-nowrap">₱{(Number(r.amount)/1_000_000).toFixed(1)}M</td>
                                                            
                                                            {dataMode === 'masterlist' ? (
                                                                <td className="px-6 py-4">
                                                                    <span className="px-3 py-1 bg-amber-100 text-amber-700 rounded-full font-black text-[10px] uppercase tracking-wider">
                                                                        {r.shortage || 0} CL Shortage
                                                                    </span>
                                                                </td>
                                                            ) : (
                                                                <>
                                                                    <td className="px-6 py-4">
                                                                        <span className={`px-3 py-1 rounded-full font-black text-[9px] uppercase tracking-wider ${
                                                                            r.status?.toLowerCase().includes('completed') ? 'bg-emerald-100 text-emerald-700' :
                                                                            r.status?.toLowerCase().includes('on-going') ? 'bg-blue-100 text-blue-700' :
                                                                            'bg-slate-100 text-slate-600'
                                                                        }`}>{r.status || '—'}</span>
                                                                    </td>
                                                                    <td className="px-6 py-4">
                                                                        <div className="flex items-center gap-2">
                                                                            <div className="flex-1 h-1.5 bg-emerald-100 rounded-full overflow-hidden min-w-[60px]">
                                                                                <div 
                                                                                    className="h-full bg-emerald-500 transition-all duration-500" 
                                                                                    style={{ width: `${r.accomplishment_percentage || 0}%` }}
                                                                                />
                                                                            </div>
                                                                            <span className="text-emerald-700 font-bold">{r.accomplishment_percentage || 0}%</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">{r.region || '—'}</td>
                                                                    <td className="px-6 py-4 text-slate-500 font-bold whitespace-nowrap">{r.division || '—'}</td>
                                                                </>
                                                            )}
                                                        </tr>
                                                    ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </motion.div>
            </main>
            <BottomNav userRole={userRole} />
        </div>
    );
};

export default EFDNewconMonitoring;
