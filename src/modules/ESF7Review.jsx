import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FiArrowLeft, 
    FiCheckCircle, 
    FiXCircle, 
    FiDownload, 
    FiEye,
    FiLoader,
    FiAlertCircle,
    FiSearch,
    FiGrid,
    FiArchive,
    FiAlertTriangle,
    FiFileText,
    FiActivity
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';

const ESF7Review = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [allSchools, setAllSchools] = useState([]);
    const [stats, setStats] = useState({ 
        total_registered: 0, 
        pending_sdo: 0, 
        verified: 0, 
        rejected: 0, 
        missing_esf7: 0 
    });
    const [selectedSchool, setSelectedSchool] = useState(null);
    const [records, setRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(false);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('queue'); // queue, verified, missing, all
    const [searchTerm, setSearchTerm] = useState('');
    const [hasDownloaded, setHasDownloaded] = useState(false);

    useEffect(() => {
        if (user) {
            const effectiveRole = (user.role === 'Super User' && sessionStorage.getItem('impersonatedRole'))
                ? sessionStorage.getItem('impersonatedRole')
                : user.role;

            if (effectiveRole !== 'School Division Office') {
                navigate('/monitoring-dashboard');
                return;
            }
            fetchAllData();
        }
    }, [user]);

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const region = user?.region || '';
            const division = user?.division || '';
            const query = `region=${encodeURIComponent(region)}&division=${encodeURIComponent(division)}`;
            
            const [statsRes, schoolsRes] = await Promise.all([
                fetch(`/api/esf7/stats?${query}`),
                fetch(`/api/esf7/all-schools?${query}`)
            ]);

            const statsData = await statsRes.json();
            const schoolsData = await schoolsRes.json();

            if (statsData.success) setStats(statsData.data);
            if (schoolsData.success) setAllSchools(schoolsData.data);
        } catch (err) {
            setError("Failed to fetch dashboard data.");
        } finally {
            setLoading(false);
        }
    };

    const handleViewRecords = async (schoolId) => {
        setLoading(true);
        setSelectedSchool(schoolId);
        setHasDownloaded(false);
        try {
            const res = await fetch(`/api/esf7/records/${schoolId}`);
            const data = await res.json();
            if (data.success) setRecords(data.data);
            else throw new Error(data.error);
        } catch (err) {
            setError("Failed to fetch records for this school.");
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async () => {
        if (!selectedSchool) return;
        setActionLoading(true);
        try {
            const res = await fetch('/api/esf7/approve', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school_id: selectedSchool })
            });
            if (res.ok) {
                alert("Submission approved and verified!");
                setSelectedSchool(null);
                fetchAllData();
            }
        } catch (err) {
            setError("Failed to approve submission.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleDownloadClean = () => {
        if (!records.length) return;
        const ws = XLSX.utils.json_to_sheet(records);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "DB_USER_CLEAN");
        XLSX.writeFile(wb, `ESF7_Clean_${selectedSchool}.xlsx`);
        setHasDownloaded(true);
    };

    const handleReturn = async () => {
        if (!selectedSchool) return;
        if (!window.confirm("Return this submission for correction? The School Head will be notified to resubmit.")) return;
        
        setActionLoading(true);
        try {
            const res = await fetch('/api/esf7/return', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ school_id: selectedSchool })
            });
            if (res.ok) {
                alert("Submission returned for correction.");
                setSelectedSchool(null);
                fetchAllData();
            }
        } catch (err) {
            setError("Failed to return submission.");
        } finally {
            setActionLoading(false);
        }
    };

    const filteredSchools = allSchools.filter(s => {
        const matchesSearch = s.school_name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             s.school_id.toLowerCase().includes(searchTerm.toLowerCase());
        
        if (activeTab === 'queue') return matchesSearch && (s.status === 'PENDING_SDO' || s.status === 'REJECTED');
        if (activeTab === 'verified') return matchesSearch && s.status === 'VERIFIED';
        if (activeTab === 'missing') return matchesSearch && s.status === 'NOT_STARTED';
        if (activeTab === 'all') return matchesSearch;
        return matchesSearch;
    });

    if (loading && !selectedSchool) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <FiLoader className="w-8 h-8 text-blue-600 animate-spin" />
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 font-sans pb-20">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => selectedSchool ? setSelectedSchool(null) : navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <FiArrowLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase italic">Review Center</h1>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">{user?.division || 'SDO'} Dashboard</p>
                        </div>
                    </div>
                </header>

                <div className="max-w-6xl mx-auto px-6 py-8 space-y-8">
                    {!selectedSchool ? (
                        <>
                            {/* --- STATS CARDS --- */}
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                <StatCard 
                                    label="Pending Review" 
                                    value={stats.pending_sdo} 
                                    icon={<FiActivity size={20} />} 
                                    color="bg-amber-500" 
                                    onClick={() => setActiveTab('queue')}
                                    isActive={activeTab === 'queue'}
                                />
                                <StatCard 
                                    label="Verified" 
                                    value={stats.verified} 
                                    icon={<FiCheckCircle size={20} />} 
                                    color="bg-emerald-500" 
                                    onClick={() => setActiveTab('verified')}
                                    isActive={activeTab === 'verified'}
                                />
                                <StatCard 
                                    label="Returned" 
                                    value={stats.rejected} 
                                    icon={<FiXCircle size={20} />} 
                                    color="bg-rose-500" 
                                    onClick={() => setActiveTab('queue')}
                                />
                                <StatCard 
                                    label="No Submission" 
                                    value={stats.missing_esf7} 
                                    icon={<FiAlertTriangle size={20} />} 
                                    color="bg-slate-400" 
                                    onClick={() => setActiveTab('missing')}
                                    isActive={activeTab === 'missing'}
                                />
                            </div>

                            {/* --- CONTROLS & TABS --- */}
                            <div className="space-y-6">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-2xl shadow-sm self-start">
                                        <TabButton active={activeTab === 'queue'} onClick={() => setActiveTab('queue')} label="Queue" />
                                        <TabButton active={activeTab === 'verified'} onClick={() => setActiveTab('verified')} label="Verified" />
                                        <TabButton active={activeTab === 'missing'} onClick={() => setActiveTab('missing')} label="Missing" />
                                        <TabButton active={activeTab === 'all'} onClick={() => setActiveTab('all')} label="All Schools" />
                                    </div>
                                    <div className="relative">
                                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input 
                                            type="text" 
                                            placeholder="Search school name or ID..." 
                                            value={searchTerm}
                                            onChange={(e) => setSearchTerm(e.target.value)}
                                            className="pl-11 pr-6 py-3 bg-white border border-slate-200 rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all w-full md:w-64 tracking-tight"
                                        />
                                    </div>
                                </div>

                                {/* --- SCHOOL LIST --- */}
                                <div className="grid gap-3">
                                    <AnimatePresence mode="popLayout">
                                        {filteredSchools.map((school) => (
                                            <motion.div 
                                                key={school.school_id}
                                                layout
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, scale: 0.95 }}
                                                onClick={() => school.status !== 'NOT_STARTED' && handleViewRecords(school.school_id)}
                                                className={`bg-white border border-slate-200 p-5 rounded-3xl flex items-center justify-between transition-all group ${school.status !== 'NOT_STARTED' ? 'cursor-pointer hover:border-blue-200 hover:shadow-lg hover:shadow-blue-500/5' : 'opacity-60 grayscale'}`}
                                            >
                                                <div className="flex items-center gap-5">
                                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${school.status === 'VERIFIED' ? 'bg-emerald-50 text-emerald-500' : school.status === 'PENDING_SDO' ? 'bg-amber-50 text-amber-500' : school.status === 'REJECTED' ? 'bg-rose-50 text-rose-500' : 'bg-slate-100 text-slate-400'}`}>
                                                        {school.status === 'VERIFIED' ? <FiCheckCircle size={24} /> : school.status === 'PENDING_SDO' ? <FiEye size={24} /> : school.status === 'REJECTED' ? <FiXCircle size={24} /> : <FiFileText size={24} />}
                                                    </div>
                                                    <div className="space-y-1">
                                                        <h3 className="font-black text-slate-800 uppercase tracking-tight leading-none group-hover:text-blue-600 transition-colors whitespace-nowrap overflow-hidden text-ellipsis max-w-[200px] md:max-w-sm">
                                                            {school.school_name}
                                                        </h3>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">ID: {school.school_id}</span>
                                                            <span className="w-1 h-1 bg-slate-200 rounded-full" />
                                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Last Sync: {new Date(school.updated_at).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-right hidden sm:block">
                                                        <p className={`text-[10px] font-black uppercase tracking-widest ${school.status === 'VERIFIED' ? 'text-emerald-500' : school.status === 'PENDING_SDO' ? 'text-amber-500' : school.status === 'REJECTED' ? 'text-rose-500' : 'text-slate-300'}`}>
                                                            {school.status.replace('_', ' ')}
                                                        </p>
                                                    </div>
                                                    {school.status !== 'NOT_STARTED' && <FiArrowLeft className="rotate-180 text-slate-200 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />}
                                                </div>
                                            </motion.div>
                                        ))}
                                    </AnimatePresence>
                                    
                                    {filteredSchools.length === 0 && (
                                        <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-100">
                                            <FiArchive className="mx-auto text-slate-200 mb-4" size={48} />
                                            <p className="text-slate-400 font-black uppercase tracking-widest text-[10px]">No schools found in this category.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50/50 rounded-full blur-3xl -mr-32 -mt-32"></div>
                                <div className="space-y-4 relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-200">
                                            <FiEye size={20} />
                                        </div>
                                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase italic">Reviewing Records</h2>
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-black text-slate-500 uppercase tracking-tighter max-w-md">
                                            {allSchools.find(s => s.school_id === selectedSchool)?.school_name || `School ID: ${selectedSchool}`}
                                        </h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="text-[10px] font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">Master List Preview</span>
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {records.length} Records</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex gap-3 relative z-10">
                                    <button 
                                        onClick={handleDownloadClean}
                                        className="flex items-center gap-2 px-6 py-4 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-slate-900/10"
                                    >
                                        <FiDownload /> Download Clean XLSX
                                    </button>
                                </div>
                            </div>

                            {/* Data Table */}
                            <div className="bg-white border-2 border-slate-50 rounded-[3rem] overflow-hidden shadow-2xl shadow-slate-200/50">
                                <div className="overflow-x-auto max-h-[500px]">
                                    <table className="w-full text-left border-collapse sticky">
                                        <thead className="sticky top-0 z-10">
                                            <tr className="bg-slate-900 text-white">
                                                {records.length > 0 && Object.keys(records[0]).slice(0, 10).map((key, i) => (
                                                    <th key={i} className="px-6 py-5 text-[9px] font-black uppercase tracking-[0.2em] whitespace-nowrap">{key}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {records.map((row, i) => (
                                                <tr key={i} className="hover:bg-blue-50/40 transition-colors">
                                                    {Object.values(row).slice(0, 10).map((cell, ci) => (
                                                        <td key={ci} className="px-6 py-4 text-[11px] font-bold text-slate-700 truncate max-w-[150px]">
                                                            {cell || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Action Bar */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                <button 
                                    onClick={() => setSelectedSchool(null)}
                                    className="flex-1 py-5 bg-white border-2 border-slate-100 text-slate-500 font-black rounded-[2.5rem] hover:bg-slate-50 transition-all uppercase italic tracking-tight"
                                >
                                    Go Back
                                </button>
                                <button 
                                    onClick={handleApprove}
                                    disabled={actionLoading || !hasDownloaded}
                                    className={`flex-[2] py-5 font-black rounded-[2.5rem] flex items-center justify-center gap-3 uppercase italic tracking-tight transition-all ${
                                        !hasDownloaded 
                                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed border-2 border-slate-200' 
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-700 text-white shadow-xl shadow-blue-500/20 active:scale-95'
                                    }`}
                                >
                                    {actionLoading ? <FiLoader className="animate-spin" /> : <FiCheckCircle size={20} />}
                                    <span>{!hasDownloaded ? "Download to Enable Verification" : "Verify & Commit to Cloud"}</span>
                                </button>
                                <button 
                                    onClick={handleReturn}
                                    disabled={actionLoading}
                                    className="flex-1 py-5 bg-rose-50 text-rose-600 border-2 border-rose-100 font-black rounded-[2.5rem] hover:bg-rose-100 transition-all flex items-center justify-center gap-3 uppercase italic tracking-tight disabled:opacity-50"
                                >
                                    {actionLoading ? <FiLoader className="animate-spin" /> : <FiXCircle size={20} />}
                                    <span>Return</span>
                                </button>
                            </div>
                        </div>
                    )}

                    {error && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-rose-50 border-2 border-rose-100 p-6 rounded-[2rem] flex items-center gap-4 text-rose-700"
                        >
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm">
                                <FiAlertCircle size={20} />
                            </div>
                            <p className="text-xs font-black uppercase tracking-tight">{error}</p>
                        </motion.div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

const StatCard = ({ label, value, icon, color, onClick, isActive }) => (
    <motion.div 
        whileHover={{ y: -4 }}
        onClick={onClick}
        className={`bg-white border-2 p-6 rounded-[2.5rem] flex items-center gap-5 cursor-pointer transition-all ${isActive ? 'border-blue-500 shadow-lg shadow-blue-500/10' : 'border-slate-50 shadow-sm hover:border-slate-200'}`}
    >
        <div className={`w-14 h-14 ${color} rounded-[1.5rem] flex items-center justify-center text-white shadow-lg`}>
            {icon}
        </div>
        <div className="space-y-1">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{label}</h4>
            <p className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{value}</p>
        </div>
    </motion.div>
);

const TabButton = ({ active, onClick, label }) => (
    <button 
        onClick={onClick}
        className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${active ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
    >
        {label}
    </button>
);

export default ESF7Review;
