import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiChevronRight, FiArrowLeft } from 'react-icons/fi';
import { LuClipboardList, LuActivity, LuCircleCheck, LuBuilding } from 'react-icons/lu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const STATUS_COLORS = {
    'Ongoing': '#3b82f6',
    'Completed': '#10b981',
    'Not Yet Started': '#94a3b8',
    'For Final Inspection': '#8b5cf6',
    'Under procurement': '#f59e0b',
    'Suspended': '#f97316',
    'Terminated': '#ef4444',
};

const formatPeso = (v) => `₱${(Number(v) || 0).toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const DivisionCard = ({ division, stats, onClick }) => {
    const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;
    return (
        <div
            onClick={onClick}
            className="bg-white rounded-3xl shadow-xl shadow-slate-200/40 border border-slate-100 hover:border-[#004A99] transition-all duration-300 overflow-hidden cursor-pointer active:scale-[0.98] group"
        >
            <div className="bg-gradient-to-r from-[#004A99] to-[#0063cc] p-5">
                <div className="flex justify-between items-start">
                    <div>
                        <p className="text-[10px] font-black text-white/60 uppercase tracking-widest mb-1">Division</p>
                        <h3 className="text-base font-black text-white leading-tight">{division}</h3>
                    </div>
                    <FiChevronRight className="text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all mt-1" size={20} />
                </div>
            </div>

            <div className="p-5">
                <div className="grid grid-cols-3 gap-3 mb-4">
                    <div className="text-center">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total</p>
                        <p className="text-xl font-black text-slate-800">{stats.total}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-blue-400 uppercase tracking-widest">Ongoing</p>
                        <p className="text-xl font-black text-blue-600">{stats.ongoing}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[9px] font-black text-emerald-400 uppercase tracking-widest">Done</p>
                        <p className="text-xl font-black text-emerald-600">{stats.completed}</p>
                    </div>
                </div>

                <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-emerald-500 transition-all duration-1000 ease-out"
                        style={{ width: `${completionRate}%` }}
                    />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right mt-1">{completionRate}% Completion Rate</p>

                <div className="mt-3 pt-3 border-t border-slate-50">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Allocation</p>
                    <p className="text-sm font-black text-[#004A99]">{formatPeso(stats.allocation)}</p>
                </div>
            </div>
        </div>
    );
};

const ProjectListView = ({ division, projects, onBack, onViewProject }) => {
    const [search, setSearch] = useState('');
    const filtered = useMemo(() => {
        const q = search.toLowerCase();
        return projects.filter(p =>
            !q ||
            p.projectName?.toLowerCase().includes(q) ||
            p.schoolName?.toLowerCase().includes(q) ||
            p.schoolId?.toString().includes(q)
        );
    }, [projects, search]);

    return (
        <div className="min-h-screen bg-slate-50 pb-24">
            <div className="bg-[#004A99] p-6 pt-12 rounded-b-3xl shadow-lg sticky top-0 z-10">
                <button onClick={onBack} className="text-white mb-3 flex items-center gap-2 text-sm hover:text-blue-200 transition-colors">
                    <FiArrowLeft size={16} /> Back to Divisions
                </button>
                <h2 className="text-2xl font-black text-white">{division}</h2>
                <p className="text-blue-200 text-xs mt-1">{projects.length} projects in this division</p>
                <div className="mt-4 relative">
                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Search projects..."
                        className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-xs px-10 py-3 rounded-2xl outline-none"
                    />
                </div>
            </div>

            <div className="px-5 mt-6 space-y-4">
                {filtered.map(p => (
                    <div
                        key={p.id}
                        onClick={() => onViewProject(p)}
                        className="bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-[#004A99] transition-all p-4 cursor-pointer group active:scale-[0.98]"
                    >
                        <div className="flex justify-between items-start mb-2">
                            <div className="flex-1 min-w-0 mr-3">
                                <p className="text-xs font-black text-slate-800 leading-tight line-clamp-2">{p.projectName}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">{p.schoolName}</p>
                            </div>
                            <span
                                className="shrink-0 text-[9px] font-black px-2 py-1 rounded-xl border uppercase tracking-tight"
                                style={{
                                    backgroundColor: `${STATUS_COLORS[p.status] || '#94a3b8'}15`,
                                    color: STATUS_COLORS[p.status] || '#94a3b8',
                                    borderColor: `${STATUS_COLORS[p.status] || '#94a3b8'}30`
                                }}
                            >
                                {p.status}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[9px] font-bold text-slate-400">{p.accomplishmentPercentage || 0}% accomplished</span>
                            <span className="text-[9px] font-black text-[#004A99]">{formatPeso(p.projectAllocation)}</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full mt-2 overflow-hidden">
                            <div className="h-full bg-emerald-500" style={{ width: `${p.accomplishmentPercentage || 0}%` }} />
                        </div>
                    </div>
                ))}
                {filtered.length === 0 && (
                    <div className="text-center py-20 text-slate-400">
                        <LuClipboardList size={40} className="mx-auto mb-3 opacity-30" />
                        <p className="text-sm font-bold">No projects found</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const RegionalEngineerDashboard = () => {
    const { user, token } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedDivision, setSelectedDivision] = useState(null);

    useEffect(() => {
        const fetchAll = async () => {
            try {
                const uid = user?.uid || localStorage.getItem('uid');
                const res = await fetch(`/api/projects?engineer_id=${uid}`, {
                    headers: token ? { Authorization: `Bearer ${token}` } : {}
                });
                const data = await res.json();
                setProjects(Array.isArray(data) ? data : (data.data || []));
            } catch (err) {
                console.error("RegionalEngineerDashboard fetch error:", err);
            } finally {
                setLoading(false);
            }
        };
        if (user) fetchAll();
    }, [user, token]);

    const divisionStats = useMemo(() => {
        const map = {};
        projects.forEach(p => {
            const div = p.division || 'Unknown';
            if (!map[div]) map[div] = { total: 0, ongoing: 0, completed: 0, pending: 0, allocation: 0, projects: [] };
            map[div].total++;
            map[div].allocation += Number(p.projectAllocation || 0);
            map[div].projects.push(p);
            if (p.status === 'Ongoing' || p.status === 'For Final Inspection') map[div].ongoing++;
            else if (p.status === 'Completed') map[div].completed++;
            else if (p.status === 'Not Yet Started' || p.status === 'Under procurement') map[div].pending++;
        });
        return map;
    }, [projects]);

    const filteredDivisions = useMemo(() => {
        const q = search.toLowerCase();
        return Object.entries(divisionStats).filter(([div]) => !q || div.toLowerCase().includes(q));
    }, [divisionStats, search]);

    const chartData = useMemo(() =>
        Object.entries(divisionStats).map(([div, s]) => ({
            name: div.length > 14 ? div.slice(0, 14) + '…' : div,
            Ongoing: s.ongoing,
            Completed: s.completed,
            Pending: s.pending,
        })).slice(0, 10),
        [divisionStats]
    );

    const overallStats = useMemo(() => ({
        total: projects.length,
        ongoing: projects.filter(p => p.status === 'Ongoing').length,
        completed: projects.filter(p => p.status === 'Completed').length,
        divisions: Object.keys(divisionStats).length,
    }), [projects, divisionStats]);

    if (selectedDivision) {
        return (
            <PageTransition>
                <ProjectListView
                    division={selectedDivision}
                    projects={divisionStats[selectedDivision]?.projects || []}
                    onBack={() => setSelectedDivision(null)}
                    onViewProject={(p) => navigate(`/project-details/${p.id}`)}
                />
                <BottomNav userRole={user?.role || 'Division Engineer'} />
            </PageTransition>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 pb-24">
                {/* Header */}
                <div className="bg-gradient-to-br from-[#004A99] via-[#003366] to-[#001D3D] p-6 pt-12 rounded-b-[3.5rem] shadow-2xl relative overflow-hidden">
                    <div className="absolute top-[-10%] right-[-10%] w-64 h-64 bg-white/5 rounded-full blur-3xl" />
                    <div className="relative z-10">
                        <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Regional Overview</p>
                        <h1 className="text-3xl font-black text-white tracking-tight">Project Monitor</h1>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-4 gap-3 mt-6">
                            {[
                                { label: 'Divisions', value: overallStats.divisions, icon: <LuBuilding size={14} /> },
                                { label: 'Total', value: overallStats.total, icon: <LuClipboardList size={14} /> },
                                { label: 'Ongoing', value: overallStats.ongoing, icon: <LuActivity size={14} /> },
                                { label: 'Done', value: overallStats.completed, icon: <LuCircleCheck size={14} /> },
                            ].map(stat => (
                                <div key={stat.label} className="bg-white/10 rounded-2xl p-3 text-center border border-white/10">
                                    <div className="flex justify-center text-white/60 mb-1">{stat.icon}</div>
                                    <p className="text-xl font-black text-white">{stat.value}</p>
                                    <p className="text-[8px] font-black text-white/50 uppercase tracking-widest">{stat.label}</p>
                                </div>
                            ))}
                        </div>

                        {/* Search */}
                        <div className="mt-4 relative">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" />
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search divisions..."
                                className="w-full bg-white/10 border border-white/20 text-white placeholder:text-white/30 text-xs px-10 py-3 rounded-2xl outline-none focus:bg-white/15 transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-5 mt-6 space-y-6">
                    {/* Bar Chart */}
                    {chartData.length > 0 && (
                        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Projects by Division</p>
                            <ResponsiveContainer width="100%" height={180}>
                                <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                    <XAxis dataKey="name" tick={{ fontSize: 8, fontWeight: 700, fill: '#94a3b8' }} />
                                    <YAxis tick={{ fontSize: 8, fill: '#94a3b8' }} />
                                    <Tooltip contentStyle={{ borderRadius: 12, fontSize: 11 }} />
                                    <Bar dataKey="Ongoing" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                                    <Bar dataKey="Pending" fill="#cbd5e1" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}

                    {/* Division Cards */}
                    {loading ? (
                        <div className="grid grid-cols-1 gap-4">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-3xl h-40 animate-pulse border border-slate-100" />
                            ))}
                        </div>
                    ) : filteredDivisions.length === 0 ? (
                        <div className="text-center py-20 text-slate-400">
                            <LuBuilding size={40} className="mx-auto mb-3 opacity-30" />
                            <p className="text-sm font-bold">No divisions found</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {filteredDivisions.map(([division, stats]) => (
                                <DivisionCard
                                    key={division}
                                    division={division}
                                    stats={stats}
                                    onClick={() => setSelectedDivision(division)}
                                />
                            ))}
                        </div>
                    )}
                </div>

                <BottomNav userRole={user?.role || 'Division Engineer'} />
            </div>
        </PageTransition>
    );
};

export default RegionalEngineerDashboard;
