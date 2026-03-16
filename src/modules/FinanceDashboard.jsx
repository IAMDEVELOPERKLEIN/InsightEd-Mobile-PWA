import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiDollarSign, FiFileText, FiTrendingUp, FiCheckCircle, FiX, FiEye, FiSearch, FiChevronUp, FiChevronDown, FiUsers, FiLayers, FiArrowUpRight, FiFilter, FiList, FiGrid } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import PageTransition from '../components/PageTransition';
import BottomNav from './BottomNav';

const FinanceDashboard = () => {
    const [aggregates, setAggregates] = useState({
        totalProjects: 0,
        totalTranche1: 0,
        totalTranche2: 0,
        totalTranche3: 0
    });
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [formData, setFormData] = useState({ tranche_1: '', tranche_2: '', tranche_3: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });
    const [viewType, setViewType] = useState('grid');
    const [filterStatus, setFilterStatus] = useState('all');
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [sortConfig, setSortConfig] = useState({ key: 'project_id', direction: 'asc' });
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const handleSort = (key) => {
        let direction = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/finance-dashboard/projects');
            if (!res.ok) throw new Error('Failed to fetch finance projects');
            const data = await res.json();
            setAggregates(data.aggregates);
            setProjects(data.projects);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (project) => {
        setSelectedProject(project);
        setFormData({
            tranche_1: project.tranche_1 || '',
            tranche_2: project.tranche_2 || '',
            tranche_3: project.tranche_3 || ''
        });
        setSaveMessage({ text: '', type: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedProject(null);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;

        setIsSaving(true);
        setSaveMessage({ text: '', type: '' });

        try {
            const payload = {
                tranche_1: formData.tranche_1 ? Number(formData.tranche_1) : null,
                tranche_2: formData.tranche_2 ? Number(formData.tranche_2) : null,
                tranche_3: formData.tranche_3 ? Number(formData.tranche_3) : null,
            };

            const res = await fetch(`/api/finance-dashboard/projects/${selectedProject.project_id}/tranches`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to update tranches');

            const data = await res.json();

            // Update local state
            setProjects(prev => prev.map(p =>
                p.project_id === selectedProject.project_id
                    ? { ...p, tranche_1: data.project.tranche_1, tranche_2: data.project.tranche_2, tranche_3: data.project.tranche_3 }
                    : p
            ));

            setSaveMessage({ text: 'Tranches updated successfully!', type: 'success' });
            // Re-fetch data to update aggregates
            fetchData();

            setTimeout(() => {
                closeModal();
            }, 1500);

        } catch (err) {
            console.error(err);
            setSaveMessage({ text: err.message || 'Error updating tranches', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    // Get chart data for tranche distribution
    const getTrancheChartData = () => {
        return [
            { name: 'Tranche 1', value: aggregates.totalTranche1, color: '#FF6B6B' },
            { name: 'Tranche 2', value: aggregates.totalTranche2, color: '#4F46E5' },
            { name: 'Tranche 3', value: aggregates.totalTranche3, color: '#10B981' }
        ].filter(item => item.value > 0);
    };

    // Get top projects for bar chart
    const getTopProjectsData = () => {
        return projects
            .slice(0, 5)
            .map(p => ({
                name: p.project_name?.slice(0, 15) + (p.project_name?.length > 15 ? '...' : ''),
                total: (p.tranche_1 || 0) + (p.tranche_2 || 0) + (p.tranche_3 || 0)
            }))
            .sort((a, b) => b.total - a.total);
    };

    // Calculate health status based on progress
    const getProjectHealth = (project) => {
        const completed = [project.tranche_1, project.tranche_2, project.tranche_3].filter(Boolean).length;
        if (completed === 0) return { status: 'Not Started', color: 'bg-slate-100 text-slate-600' };
        if (completed === 1) return { status: 'In Progress', color: 'bg-amber-100 text-amber-600' };
        if (completed === 2) return { status: 'Nearly Complete', color: 'bg-blue-100 text-blue-600' };
        return { status: 'Complete', color: 'bg-emerald-100 text-emerald-600' };
    };

    // Calculate key metrics
    const calculateMetrics = () => {
        const total = aggregates.totalTranche1 + aggregates.totalTranche2 + aggregates.totalTranche3;
        const completedProjects = projects.filter(p => p.status === 'Completed').length;
        const avgFundPerProject = projects.length > 0 ? total / projects.length : 0;
        const utilizationRate = projects.length > 0 ? (completedProjects / projects.length) * 100 : 0;
        return { total, completedProjects, avgFundPerProject, utilizationRate };
    };

    const formatCurrency = (amount) => {
        if (amount == null) return 'Not set';
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    if (loading && projects.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#F8FAFC] pb-24 font-inter relative">
                {/* Fixed Header */}
                <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-slate-100 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                                Finance Dashboard
                            </h1>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">InsightEd Analytics</p>
                        </div>

                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="relative group flex-1 md:w-80">
                                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400 group-focus-within:text-indigo-500 transition-colors">
                                    <FiSearch size={18} />
                                </div>
                                <input
                                    type="text"
                                    placeholder="Search project or ID..."
                                    className="block w-full pl-11 pr-4 py-2.5 bg-slate-100/50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-indigo-100 focus:bg-white transition-all outline-none"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>

                            <button onClick={() => setShowAdvancedFilters(!showAdvancedFilters)} className="p-2.5 bg-slate-100 hover:bg-slate-200 rounded-2xl text-slate-600 transition-colors">
                                <FiFilter size={20} />
                            </button>

                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                                <FiUsers size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto px-6 pt-8">
                    {error && (
                        <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-2xl mb-8 flex items-center">
                            <FiX className="mr-2" /> {error}
                        </div>
                    )}

                    {/* Advanced Filters */}
                    {showAdvancedFilters && (
                        <div className="mb-8 p-6 bg-white rounded-2xl border border-slate-100 shadow-lg">
                            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider">Filter Options</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Project Status</label>
                                    <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                                        <option value="all">All Projects</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Ongoing">Ongoing</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Fund Status</label>
                                    <select className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                                        <option value="all">All Funds</option>
                                        <option value="partial">Partially Funded</option>
                                        <option value="full">Fully Funded</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block">Sort By</label>
                                    <select className="w-full px-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-200 outline-none">
                                        <option>Total Funds (High to Low)</option>
                                        <option>Total Funds (Low to High)</option>
                                        <option>Project Name (A-Z)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dashboard Overview */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                        {/* Hero Card */}
                        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[2.5rem] p-8 text-white shadow-2xl">
                            <div className="relative z-10 flex flex-col h-full justify-between">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-wider">Total Financial Commitment</p>
                                        <h2 className="text-4xl font-bold mt-1 tracking-tight">
                                            {formatCurrency(aggregates.totalTranche1 + aggregates.totalTranche2 + aggregates.totalTranche3)}
                                        </h2>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                                        <FiTrendingUp size={24} />
                                    </div>
                                </div>

                                <div className="mt-12 grid grid-cols-3 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/10 text-center">
                                        <p className="text-[10px] text-white/60 font-medium uppercase">Projects</p>
                                        <p className="text-xl font-bold">{aggregates.totalProjects}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/10 text-center">
                                        <p className="text-[10px] text-white/60 font-medium uppercase">Ongoing</p>
                                        <p className="text-xl font-bold">{projects.filter(p => p.status !== 'Completed').length}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-4 border border-white/10 text-center">
                                        <p className="text-[10px] text-white/60 font-medium uppercase">% Utilization</p>
                                        <p className="text-xl font-bold">{Math.round(calculateMetrics().utilizationRate)}%</p>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-purple-400/20 rounded-full blur-2xl"></div>
                        </div>

                        {/* KPI Cards */}
                        <div className="space-y-4">
                            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Avg Fund/Project</p>
                                        <p className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(calculateMetrics().avgFundPerProject)}</p>
                                    </div>
                                    <div className="p-3 bg-emerald-100 rounded-xl text-emerald-600">
                                        <FiDollarSign size={20} />
                                    </div>
                                </div>
                            </div>
                            <div className="bg-white rounded-[2rem] p-5 border border-slate-100 shadow-lg hover:shadow-xl transition-shadow">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Completed Projects</p>
                                        <p className="text-lg font-bold text-slate-800 mt-1">{calculateMetrics().completedProjects}/{aggregates.totalProjects}</p>
                                    </div>
                                    <div className="p-3 bg-indigo-100 rounded-xl text-indigo-600">
                                        <FiCheckCircle size={20} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-10">
                        {/* Tranche Distribution */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Tranche Distribution</h3>
                            {getTrancheChartData().length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <PieChart>
                                        <Pie data={getTrancheChartData()} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
                                            {getTrancheChartData().map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip formatter={(value) => formatCurrency(value)} />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
                            )}
                        </div>

                        {/* Top Projects by Funds */}
                        <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-xl">
                            <h3 className="text-lg font-bold text-slate-800 mb-6">Top Projects by Funding</h3>
                            {getTopProjectsData().length > 0 ? (
                                <ResponsiveContainer width="100%" height={250}>
                                    <BarChart data={getTopProjectsData()}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                        <XAxis dataKey="name" stroke="#94a3b8" />
                                        <YAxis stroke="#94a3b8" />
                                        <Tooltip formatter={(value) => formatCurrency(value)} cursor={{ fill: 'rgba(79, 70, 229, 0.1)' }} />
                                        <Bar dataKey="total" fill="#4F46E5" radius={[8, 8, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-400">No data available</div>
                            )}
                        </div>
                    </div>

                    {/* Project List Header with View Toggle */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 px-2 gap-4">
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-bold text-slate-800">Project Masterlist</h3>
                            <span className="bg-slate-200 text-slate-600 text-[10px] font-black px-2 py-0.5 rounded-md">
                                {projects.length} RECORDS
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <div className="bg-white rounded-2xl p-1 border border-slate-100 flex gap-1">
                                <button onClick={() => setViewType('grid')} className={`p-2 rounded-lg transition-all ${viewType === 'grid' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                                    <FiGrid size={18} />
                                </button>
                                <button onClick={() => setViewType('table')} className={`p-2 rounded-lg transition-all ${viewType === 'table' ? 'bg-indigo-600 text-white' : 'text-slate-400'}`}>
                                    <FiList size={18} />
                                </button>
                            </div>
                            <button onClick={() => handleSort('project_id')} className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${sortConfig.key === 'project_id' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>
                                ID {sortConfig.key === 'project_id' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </button>
                            <button onClick={() => handleSort('project_name')} className={`px-4 py-2 rounded-2xl text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm ${sortConfig.key === 'project_name' ? 'bg-indigo-600 text-white' : 'bg-white text-slate-500'}`}>
                                NAME {sortConfig.key === 'project_name' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                            </button>
                        </div>
                    </div>

                    {/* Project List Container - Grid/Table View */}
                    {viewType === 'grid' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                            {projects.filter(p => {
                                const q = searchQuery.toLowerCase();
                                return p.project_name?.toLowerCase().includes(q) || String(p.project_id).includes(q) || p.school_name?.toLowerCase().includes(q);
                            }).sort((a, b) => {
                                const valA = a[sortConfig.key];
                                const valB = b[sortConfig.key];
                                const comparison = typeof valA === 'number' ? valA - valB : String(valA || '').localeCompare(String(valB || ''));
                                return sortConfig.direction === 'asc' ? comparison : -comparison;
                            }).map((project) => {
                                const completed = [project.tranche_1, project.tranche_2, project.tranche_3].filter(Boolean).length;
                                const progress = (completed / 3) * 100;
                                const health = getProjectHealth(project);

                                return (
                                    <div key={project.project_id} className="bg-white rounded-[2.5rem] p-7 shadow-xl shadow-slate-100/50 border border-slate-50 hover:shadow-2xl hover:shadow-indigo-100 transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all duration-300">
                                                <FiLayers size={24} />
                                            </div>
                                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${health.color}`}>
                                                {health.status}
                                            </div>
                                        </div>
                                        <div className="mb-6">
                                            <div className="flex justify-between items-center mb-1.5">
                                                <p className="text-xs font-black text-slate-300 uppercase tracking-widest">#{project.project_id}</p>
                                                <p className="text-xs font-black text-indigo-400 bg-indigo-50 px-2.5 py-1 rounded-md uppercase tracking-tighter">IPC: {project.ipc || 'N/A'}</p>
                                            </div>
                                            <h4 className="text-2xl font-black text-slate-800 leading-tight line-clamp-2 h-16 mb-2">
                                                {project.project_name || 'Project'}
                                            </h4>
                                            <p className="text-sm font-bold text-slate-500 flex items-center gap-2">
                                                <FiUsers size={14} /> {project.school_name || 'N/A'}
                                            </p>
                                        </div>

                                        <div className="mb-8">
                                            <div className="flex justify-between mb-2">
                                                <span className="text-[11px] font-black text-slate-400 uppercase tracking-wider">Progress</span>
                                                <span className="text-sm font-black text-indigo-600">{completed}/3</span>
                                            </div>
                                            <div className="h-3 w-full bg-slate-100 rounded-full overflow-hidden p-0.5">
                                                <div className="h-full rounded-full bg-indigo-500 transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                                            </div>
                                        </div>

                                        {/* Detailed Tranche Breakdown */}
                                        <div className="grid grid-cols-3 gap-2 mb-8 bg-slate-50/80 backdrop-blur-sm rounded-3xl p-4 border border-slate-100">
                                            {[1, 2, 3].map(i => (
                                                <div key={i} className="text-center">
                                                    <p className={`text-[10px] font-black uppercase tracking-tighter mb-1 ${project[`tranche_${i}`] ? 'text-indigo-600' : 'text-slate-300'}`}>Tranche {i}</p>
                                                    <p className={`text-xs font-black truncate tracking-tighter ${project[`tranche_${i}`] ? 'text-slate-700' : 'text-slate-300 italic'}`}>
                                                        {project[`tranche_${i}`] ? formatCurrency(project[`tranche_${i}`]) : '—'}
                                                    </p>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="flex gap-3">
                                            <button
                                                onClick={() => navigate(`/project-details/${project.project_id}`)}
                                                className="flex-1 bg-white border border-slate-100 hover:bg-slate-50 text-slate-600 font-black text-[11px] uppercase py-3 rounded-2xl transition-all shadow-sm"
                                            >
                                                Details
                                            </button>
                                            <button
                                                onClick={() => openModal(project)}
                                                className="w-12 h-12 bg-indigo-600 text-white flex items-center justify-center rounded-2xl shadow-lg transition-transform hover:scale-105 active:scale-95"
                                            >
                                                <FiArrowUpRight size={20} />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        /* TABLE VIEW */
                        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
                                            <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">ID</th>
                                            <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">Project Name</th>
                                            <th className="px-6 py-4 text-left text-xs font-black text-slate-600 uppercase tracking-wider">School</th>
                                            <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase tracking-wider">Status</th>
                                            <th className="px-6 py-4 text-right text-xs font-black text-slate-600 uppercase tracking-wider">Total Fund</th>
                                            <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase tracking-wider">Progress</th>
                                            <th className="px-6 py-4 text-center text-xs font-black text-slate-600 uppercase tracking-wider">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {projects.filter(p => {
                                            const q = searchQuery.toLowerCase();
                                            return p.project_name?.toLowerCase().includes(q) || String(p.project_id).includes(q) || p.school_name?.toLowerCase().includes(q);
                                        }).sort((a, b) => {
                                            const valA = a[sortConfig.key];
                                            const valB = b[sortConfig.key];
                                            const comparison = typeof valA === 'number' ? valA - valB : String(valA || '').localeCompare(String(valB || ''));
                                            return sortConfig.direction === 'asc' ? comparison : -comparison;
                                        }).map((project) => {
                                            const completed = [project.tranche_1, project.tranche_2, project.tranche_3].filter(Boolean).length;
                                            const progress = (completed / 3) * 100;
                                            const health = getProjectHealth(project);
                                            const totalFund = (project.tranche_1 || 0) + (project.tranche_2 || 0) + (project.tranche_3 || 0);

                                            return (
                                                <tr key={project.project_id} className="hover:bg-indigo-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-600">#{project.project_id}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-slate-800 max-w-xs truncate">{project.project_name}</td>
                                                    <td className="px-6 py-4 text-sm text-slate-600">{project.school_name || 'N/A'}</td>
                                                    <td className="px-6 py-4 text-center"><span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${health.color}`}>{health.status}</span></td>
                                                    <td className="px-6 py-4 text-right text-sm font-bold text-slate-800">{formatCurrency(totalFund)}</td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="w-16 h-2 bg-slate-100 rounded-full overflow-hidden mx-auto">
                                                            <div className="h-full bg-indigo-500 transition-all" style={{ width: `${progress}%` }}></div>
                                                        </div>
                                                        <p className="text-[10px] text-slate-500 mt-1">{completed}/3</p>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <button
                                                            onClick={() => openModal(project)}
                                                            className="inline-flex items-center justify-center w-8 h-8 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                                                        >
                                                            <FiArrowUpRight size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>

                <BottomNav userRole="Finance" />

                {/* Update Modal */}
                {isModalOpen && selectedProject && createPortal(
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">

                            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    Update Tranches
                                </h3>
                                <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                                    <FiX size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6">
                                <div className="mb-6">
                                    <p className="text-sm font-medium text-slate-500 mb-1">Project ID: #{selectedProject.project_id}</p>
                                    <p className="text-base font-semibold text-slate-800 line-clamp-2">{selectedProject.project_name || 'N/A'}</p>
                                </div>

                                {saveMessage.text && (
                                    <div className={`mb-5 px-4 py-3 rounded-xl border flex items-center gap-2 text-sm ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                        {saveMessage.type === 'success' ? <FiCheckCircle /> : <FiX />}
                                        {saveMessage.text}
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-1.5 text-sm font-medium text-slate-700">Tranche 1 (PHP)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-500 sm:text-sm">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="tranche_1"
                                                value={formData.tranche_1}
                                                onChange={handleChange}
                                                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-3 transition-colors"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-sm font-medium text-slate-700">Tranche 2 (PHP)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-500 sm:text-sm">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="tranche_2"
                                                value={formData.tranche_2}
                                                onChange={handleChange}
                                                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-3 transition-colors"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block mb-1.5 text-sm font-medium text-slate-700">Tranche 3 (PHP)</label>
                                        <div className="relative">
                                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                                <span className="text-slate-500 sm:text-sm">₱</span>
                                            </div>
                                            <input
                                                type="number"
                                                step="0.01"
                                                name="tranche_3"
                                                value={formData.tranche_3}
                                                onChange={handleChange}
                                                className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-3 transition-colors"
                                                placeholder="0.00"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-8 flex justify-end gap-3">
                                    <button
                                        type="button"
                                        onClick={closeModal}
                                        className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors focus:ring-4 focus:ring-slate-100 outline-none"
                                        disabled={isSaving}
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="px-5 py-2.5 flex justify-center items-center min-w-[100px] text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 outline-none disabled:opacity-70"
                                    >
                                        {isSaving ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            'Save Changes'
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>,
                    document.body
                )}
            </div>
        </PageTransition>
    );
};

export default FinanceDashboard;
