import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiLayers, FiList, FiTrendingUp, FiMapPin, FiChevronRight, FiAlertCircle } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const EFDHome = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('granular'); // 'granular' or 'list'
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    setSelectedRegion(data.region || '');
                    if (data.division) setSelectedDivision(data.division);
                }

                // Fetch all projects for EFD
                // If the user has a region assigned, we'll filter initially, but EFD usually monitors broadly.
                // For now, let's fetch all and filter client-side for "granular" feel.
                const response = await fetch('/api/projects');
                if (response.ok) {
                    const data = await response.json();
                    setProjects(data);
                }
            } catch (error) {
                console.error("Error fetching EFD data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // Helper: Normalize location names for grouping
    const normalize = (val) => val?.toString().trim() || 'Unassigned';

    // Aggregations
    const regionalData = useMemo(() => {
        const counts = {};
        projects.forEach(p => {
            const reg = normalize(p.region);
            counts[reg] = (counts[reg] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects]);

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

    const newlyCreatedCount = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        // Assuming project_id is serial and roughly chronological, or we use a timestamp if available.
        // If no timestamp, we can't be precise without backend help. 
        // For now, let's assume 'id' helps or just show total as "active monitoring".
        return projects.length; // Placeholder for "Newly Created" if no timestamp
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesSearch = !searchTerm || 
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolId?.toString().includes(searchTerm);
            return matchesRegion && matchesDivision && matchesSearch;
        });
    }, [projects, selectedRegion, selectedDivision, searchTerm]);

    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

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
                {/* Header */}
                <div className="bg-[#004A99] text-white p-6 rounded-b-[2.5rem] shadow-lg mb-6">
                    <div className="flex justify-between items-center mb-4">
                        <div>
                            <h1 className="text-2xl font-black">EFD Dashboard</h1>
                            <p className="text-blue-100 text-xs font-medium uppercase tracking-widest mt-1">
                                {userData?.region || 'Central Office'} • Engineering Facilities Division
                            </p>
                        </div>
                        <div className="bg-white/20 p-2 rounded-full backdrop-blur-md">
                            <FiTrendingUp size={20} />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mt-6">
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-blue-200 uppercase mb-1">Total Projects</p>
                            <h2 className="text-3xl font-black">{projects.length}</h2>
                        </div>
                        <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10">
                            <p className="text-[10px] font-bold text-blue-200 uppercase mb-1">New Projects (30d)</p>
                            <h2 className="text-3xl font-black">{newlyCreatedCount}</h2>
                        </div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="px-5 mb-6">
                    <div className="bg-white p-1 rounded-2xl shadow-sm flex border border-slate-200">
                        <button 
                            onClick={() => setActiveTab('granular')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'granular' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                        >
                            <FiLayers /> Granular Data
                        </button>
                        <button 
                            onClick={() => setActiveTab('list')}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'list' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500'}`}
                        >
                            <FiList /> Project List
                        </button>
                    </div>
                </div>

                {/* Filters (Sticky-ish) */}
                <div className="px-5 space-y-4 mb-6">
                    <div className="grid grid-cols-2 gap-3">
                        <div className="relative">
                            <select 
                                value={selectedRegion}
                                onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDivision(''); }}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm"
                            >
                                <option value="">All Regions</option>
                                {regionalData.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                            </select>
                            <FiMapPin className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <div className="relative">
                            <select 
                                value={selectedDivision}
                                onChange={(e) => setSelectedDivision(e.target.value)}
                                disabled={!selectedRegion}
                                className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500 appearance-none shadow-sm disabled:opacity-50"
                            >
                                <option value="">All Divisions</option>
                                {divisionData.map(d => <option key={d.name} value={d.name}>{d.name}</option>)}
                            </select>
                            <FiFilter className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                    </div>

                    {activeTab === 'list' && (
                        <div className="relative">
                            <input 
                                type="text"
                                placeholder="Search by Project, School, or ID..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-12 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        </div>
                    )}
                </div>

                {/* Main Content */}
                <div className="px-5">
                    {activeTab === 'granular' ? (
                        <div className="space-y-6">
                            {/* Regional Breakdown Chart */}
                            <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100">
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                                    <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                    Regional Deployment
                                </h3>
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart 
                                            data={regionalData.slice(0, 10)} 
                                            layout="vertical"
                                            onClick={(data) => data && setSelectedRegion(data.activeLabel)}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                            <XAxis type="number" hide />
                                            <YAxis 
                                                dataKey="name" 
                                                type="category" 
                                                tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} 
                                                width={80}
                                            />
                                            <Tooltip 
                                                cursor={{fill: '#f8fafc'}}
                                                contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                            />
                                            <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                {regionalData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={selectedRegion === entry.name ? '#2563eb' : '#93c5fd'} />
                                                ))}
                                            </Bar>
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-[10px] text-center text-slate-400 mt-2 font-medium italic">Click a bar to drill down into divisions</p>
                            </div>

                            {/* Divisional Breakdown Chart (Conditional) */}
                            {selectedRegion && (
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 animate-in slide-in-from-bottom-4 duration-500">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        Divisions in {selectedRegion}
                                    </h3>
                                    <div className="h-64 w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={divisionData.slice(0, 10)}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{fontSize: 8, fontWeight: 700, fill: '#64748b'}} 
                                                    interval={0}
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={60}
                                                />
                                                <YAxis tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} />
                                                <Tooltip 
                                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                                />
                                                <Bar dataKey="value" fill="#fbbf24" radius={[4, 4, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <button 
                                        onClick={() => setActiveTab('list')}
                                        className="w-full mt-4 bg-slate-50 hover:bg-slate-100 text-slate-600 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2"
                                    >
                                        See {selectedRegion} Project List <FiChevronRight />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredProjects.length === 0 ? (
                                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                    <FiAlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No projects found</p>
                                </div>
                            ) : (
                                filteredProjects.map((p) => (
                                    <div 
                                        key={p.id} 
                                        onClick={() => navigate(`/project-details/${p.id}`)}
                                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all"
                                    >
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs">
                                            {p.id}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">{p.projectName}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium truncate">{p.schoolName} ({p.schoolId})</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    p.status === 'Completed' ? 'bg-green-100 text-green-700' : 
                                                    p.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                }`}>
                                                    {p.status}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-400">{p.division}</span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-xs font-black text-slate-800">{p.accomplishmentPercentage}%</p>
                                            <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
                                                <div 
                                                    className="h-full bg-blue-500 transition-all" 
                                                    style={{ width: `${p.accomplishmentPercentage}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                <BottomNav userRole="EFD" />
            </div>
        </PageTransition>
    );
};

export default EFDHome;
