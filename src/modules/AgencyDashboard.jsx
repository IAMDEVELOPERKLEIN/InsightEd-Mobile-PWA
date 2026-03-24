import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiTrendingUp, FiCheckCircle, FiClock, FiFileText, FiMapPin, 
    FiArrowLeft, FiMenu, FiBell, FiSearch, FiFilter, FiAlertCircle, 
    FiX, FiBarChart2, FiRefreshCw, FiChevronDown, FiChevronUp, FiDollarSign, FiPieChart, FiEye, FiUserPlus, FiCheck
} from 'react-icons/fi';
import { TbTrophy, TbBuilding, TbChartBar, TbFileDownload, TbClipboardList, TbHomeEdit } from 'react-icons/tb';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
    ResponsiveContainer, Cell, PieChart, Pie 
} from 'recharts';
import PageTransition from '../components/PageTransition';
import BottomNav from './BottomNav';

const AgencyDashboard = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState(location.state?.activeTab || 'home');

    useEffect(() => {
        if (location.state?.activeTab) {
            setActiveTab(location.state.activeTab);
        }
    }, [location.state?.activeTab]);

    useEffect(() => {
        const fetchEngineers = async () => {
            try {
                const res = await fetch('/api/engineers?role=Non-DepEd Engineer');
                if (res.ok) {
                    const data = await res.json();
                    setEngineers(data);
                }
            } catch (err) {
                console.error("Error fetching engineers:", err);
            }
        };
        fetchEngineers();
    }, []);

    const [projects, setProjects] = useState([]);
    const [allProjects, setAllProjects] = useState([]);
    const [aggregates, setAggregates] = useState({
        totalActiveAgencies: 0,
        totalMoaProjects: 0,
        totalTranche1Value: 0,
        pendingMoaTasks: 0
    });
    const [loading, setLoading] = useState(true);
    const [engineers, setEngineers] = useState([]);
    const [selectedProjectForAssignment, setSelectedProjectForAssignment] = useState(null);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    // Context / Role State
    const userRole = localStorage.getItem('userRole');
    const userAgency = localStorage.getItem('userDivision'); 
    const userRegion = localStorage.getItem('userRegion');
    const userProvince = localStorage.getItem('userProvince');
    const userCity = localStorage.getItem('userCity');
    const isAgencyUser = ['Implementing Agency', 'PGO', 'CGO', 'MGO', 'DPWH', 'CSO'].includes(userRole);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgency, setSelectedAgency] = useState(isAgencyUser ? userAgency : 'All');

    // List of agencies that are valid for filtering
    const validAgencies = useMemo(() => {
        const ags = new Set();
        allProjects.forEach(p => {
            if (p.implementing_agency) ags.add(p.implementing_agency);
        });
        return Array.from(ags).sort();
    }, [allProjects]);

    const handleAssign = async () => {
        if (!selectedProjectForAssignment || !selectedEngineer) return;

        setIsAssigning(true);
        setMessage({ text: '', type: '' });

        const engineer = engineers.find(e => e.uid === selectedEngineer);
        const engineerName = `${engineer.firstName} ${engineer.lastName}`;

        try {
            const response = await fetch('/api/assign-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProjectForAssignment.project_id,
                    engineerId: selectedEngineer,
                    engineerName: engineerName
                })
            });

            if (response.ok) {
                setMessage({ text: `Project assigned to ${engineerName} successfully!`, type: 'success' });
                // Update local state
                setAllProjects(prev => prev.map(p => 
                    p.project_id === selectedProjectForAssignment.project_id ? { ...p, assigned_engineer_name: engineerName } : p
                ));
                setSelectedProjectForAssignment(null);
                setSelectedEngineer('');
                
                // Also update filtered projects if applicable
                setProjects(prev => prev.map(p => 
                    p.project_id === selectedProjectForAssignment.project_id ? { ...p, assigned_engineer_name: engineerName } : p
                ));
            } else {
                const err = await response.json();
                setMessage({ text: err.message || "Failed to assign project", type: 'error' });
            }
        } catch (error) {
            setMessage({ text: "Network error", type: 'error' });
        } finally {
            setIsAssigning(false);
            setTimeout(() => setMessage({ text: '', type: '' }), 3000);
        }
    };

    // Liquidation Modal State
    const [selectedProjectForLiquidation, setSelectedProjectForLiquidation] = useState(null);

    useEffect(() => {
        fetchAgencyData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAgency, userProvince, userCity]);

    const fetchAgencyData = async () => {
        try {
            setLoading(true);
            
            // If agency user, we strictly filter by their agency and region in the API
            const params = new URLSearchParams();
            if (isAgencyUser) {
                params.append('agency', userAgency);
                if (userRegion && userRegion !== 'null') params.append('region', userRegion);
                if (userProvince && userProvince !== 'null') params.append('province', userProvince);
                if (userCity && userCity !== 'null') params.append('city', userCity);
            } else if (selectedAgency !== 'All' && selectedAgency !== 'null') {
                params.append('agency', selectedAgency);
            }

            const res = await fetch(`/api/agency-dashboard/projects?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch agency dashboard data');
            const data = await res.json();

            setAggregates(data.aggregates || {
                totalActiveAgencies: 0, totalMoaProjects: 0, totalTrancheValue: 0, pendingMoaTasks: 0
            });
            setProjects(data.projects || []);
            setAllProjects(data.allProjects || []);
            
            // Auto-expand if only one agency
            if (data.projects && data.projects.length > 0) {
                const uniqueAgencies = new Set(data.projects.map(p => p.implementing_agency));
                if (uniqueAgencies.size === 1) {
                    setExpandedAgencies({ [Array.from(uniqueAgencies)[0]]: true });
                }
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // MOA Tracking State
    const [motherMoas, setMotherMoas] = useState([]);
    const [selectedMotherMoa, setSelectedMotherMoa] = useState(null);
    const [supplementalMoas, setSupplementalMoas] = useState([]);
    const [loadingMoa, setLoadingMoa] = useState(false);
    const [loadingSupp, setLoadingSupp] = useState(false);

    useEffect(() => {
        const fetchMotherMoas = async () => {
            try {
                setLoadingMoa(true);
                const params = new URLSearchParams();
                if (isAgencyUser) {
                    if (userAgency && userAgency !== 'null') params.append('agency', userAgency);
                    if (userRegion && userRegion !== 'null') params.append('region', userRegion);
                    if (userProvince && userProvince !== 'null') params.append('province', userProvince);
                    if (userCity && userCity !== 'null') params.append('city', userCity);
                } else if (selectedAgency && selectedAgency !== 'All' && selectedAgency !== 'null') {
                    params.append('agency', selectedAgency);
                }

                const res = await fetch(`/api/agency-dashboard/mother-moas?${params.toString()}`);
                if (res.ok) {
                    const data = await res.json();
                    setMotherMoas(data.motherMoas || []);
                    // Auto-select first if none selected
                    if (data.motherMoas?.length > 0 && !selectedMotherMoa) {
                        setSelectedMotherMoa(data.motherMoas[0]);
                    }
                }
            } catch (err) {
                console.error("Error fetching mother MOAs:", err);
            } finally {
                setLoadingMoa(false);
            }
        };
        fetchMotherMoas();
    }, [isAgencyUser, userAgency, userRegion, userProvince, userCity, selectedAgency]);

    useEffect(() => {
        const fetchSupplementalMoas = async () => {
            if (!selectedMotherMoa) {
                setSupplementalMoas([]);
                return;
            }
            try {
                setLoadingSupp(true);
                const res = await fetch(`/api/engineer-supplemental-moas/${selectedMotherMoa.moa_id}`);
                if (res.ok) {
                    const data = await res.json();
                    setSupplementalMoas(data || []);
                }
            } catch (err) {
                console.error("Error fetching supplemental MOAs:", err);
            } finally {
                setLoadingSupp(false);
            }
        };
        fetchSupplementalMoas();
    }, [selectedMotherMoa]);


    // Derived Data for Filters (Only for non-agency secondary filtering if needed)
    const agenciesList = useMemo(() => {
        const agencies = new Set(projects.map(p => p.implementing_agency).filter(Boolean));
        return ['All', ...Array.from(agencies).sort()];
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const matchesSearch =
                (project.project_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.moa || '').toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSearch;
        });
    }, [projects, searchQuery]);

    const groupedProjects = useMemo(() => {
        const groups = {};
        filteredProjects.forEach(project => {
            const agency = project.implementing_agency || project.implementing_agency_specific || 'Unknown Agency';
            if (!groups[agency]) {
                groups[agency] = [];
            }
            groups[agency].push(project);
        });
        return groups;
    }, [filteredProjects]);

    // Chart Data
    const statusChartData = useMemo(() => {
        const stats = {};
        projects.forEach(p => {
            const s = p.status || 'Not Started';
            stats[s] = (stats[s] || 0) + 1;
        });
        return Object.entries(stats).map(([name, value]) => ({ name, value }));
    }, [projects]);

    const trancheChartData = useMemo(() => {
        // Group by agency for comparison
        const agencyFunds = {};
        projects.forEach(p => {
            const agency = p.implementing_agency || 'Other';
            if (!agencyFunds[agency]) agencyFunds[agency] = { name: agency, allocated: 0, liquidated: 0 };
            agencyFunds[agency].allocated += (parseFloat(p.tranche_1 || 0) + parseFloat(p.tranche_2 || 0) + parseFloat(p.tranche_3 || 0));
            agencyFunds[agency].liquidated += (parseFloat(p.liquidated_tranche_1 || 0) + parseFloat(p.liquidated_tranche_2 || 0) + parseFloat(p.liquidated_tranche_3 || 0));
        });
        return Object.values(agencyFunds).sort((a, b) => b.allocated - a.allocated).slice(0, 5);
    }, [projects]);

    const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const formatCurrency = (amount) => {
        if (amount == null) return '₱0.00';
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };



    const toggleGroup = (agency) => {
        setExpandedAgencies(prev => ({
            ...prev,
            [agency]: !prev[agency]
        }));
    };

    if (loading && projects.length === 0) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-slate-900">
                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-blue-600"></div>
                    <p className="mt-4 text-lg font-bold text-slate-700 dark:text-slate-300 animate-pulse uppercase tracking-widest">Initialising Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#F8FAFC] dark:bg-slate-900 pb-24 font-sans selection:bg-blue-100">
                
                {/* PREMIUM FIXED STICKY HEADER */}
                <div className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-100 dark:border-slate-800 px-6 py-4">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
                        <div>
                            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-[#004A99] bg-clip-text text-transparent tracking-tight">
                                {isAgencyUser ? userAgency : 'Implementing Agency Dashboard'}
                            </h1>
                            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-0.5">
                                {isAgencyUser ? `Welcome, monitor your agency's projects` : 'Centralized external partner dashboard'}
                            </p>
                        </div>
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            {!isAgencyUser && (
                                <div className="relative flex-1 md:w-64">
                                    <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <select
                                        className="w-full pl-10 pr-10 py-2.5 bg-slate-100 dark:bg-slate-800 border-none rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-100 transition-all outline-none appearance-none cursor-pointer"
                                        value={selectedAgency}
                                        onChange={(e) => setSelectedAgency(e.target.value)}
                                    >
                                        <option value="All">All Agencies</option>
                                        {agenciesList.filter(a => a !== 'All').map(agency => (
                                            <option key={agency} value={agency}>{agency}</option>
                                        ))}
                                    </select>
                                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                            )}

                            <button 
                                onClick={fetchAgencyData}
                                className="w-10 h-10 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 hover:dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300 transition-transform active:scale-95"
                                title="Refresh Data"
                            >
                                <FiRefreshCw className={loading ? "animate-spin" : ""} size={18} />
                            </button>
                            
                            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-500 to-[#004A99] flex items-center justify-center text-white shadow-lg shadow-blue-200/50 hidden sm:flex">
                                <TbBuilding size={20} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* MAIN DASHBOARD WRAPPER */}
                <div className="max-w-7xl mx-auto px-6 pt-8 relative z-20">
                    
                    {/* DASHBOARD OVERVIEW - FINANCE STYLE */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
                        {/* Huge Hero Card */}
                        <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-[#4F46E5] to-[#7C3AED] rounded-[2.5rem] p-8 text-white shadow-2xl hover:shadow-indigo-500/20 transition-all duration-500">
                            <div className="relative z-10 flex flex-col h-full justify-between gap-8">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <p className="text-indigo-100 text-sm font-medium opacity-80 uppercase tracking-widest">Total Financial Value</p>
                                        <h2 className="text-4xl sm:text-5xl font-black mt-1 tracking-tight">
                                            {formatCurrency(aggregates.totalTrancheValue)}
                                        </h2>
                                    </div>
                                    <div className="bg-white/20 backdrop-blur-md p-3 rounded-2xl">
                                        <FiTrendingUp size={24} />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/10 flex flex-col justify-center transition-all hover:bg-white/20 text-center sm:text-left">
                                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1"><TbClipboardList /> Total Projects</p>
                                        <p className="text-2xl font-black">{aggregates.totalMoaProjects}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/10 flex flex-col justify-center transition-all hover:bg-white/20 text-center sm:text-left">
                                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1"><TbBuilding /> Active Agencies</p>
                                        <p className="text-2xl font-black">{aggregates.totalActiveAgencies}</p>
                                    </div>
                                    <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-5 border border-white/10 flex flex-col justify-center transition-all hover:bg-white/20 text-center sm:text-left">
                                        <p className="text-[10px] text-indigo-100 font-bold uppercase tracking-widest mb-1 flex items-center justify-center sm:justify-start gap-1"><FiClock /> Pending Tasks</p>
                                        <p className="text-2xl font-black">{aggregates.pendingMoaTasks}</p>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Visual Background Elements */}
                            <div className="absolute top-[-20%] right-[-10%] w-64 h-64 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                            <div className="absolute bottom-[-10%] left-[-10%] w-48 h-48 bg-purple-400/20 rounded-full blur-2xl pointer-events-none"></div>
                        </div>

                        {/* KPI SIDE CARDS */}
                        <div className="space-y-4 flex flex-col">
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-50 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all flex-1 flex flex-col justify-center group relative overflow-hidden">
                                <div className="flex items-center justify-between relative z-10 w-full">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Avg Fund/Project</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-emerald-500 transition-colors">
                                            {aggregates.totalMoaProjects > 0 ? formatCurrency(aggregates.totalTrancheValue / aggregates.totalMoaProjects) : '₱0.00'}
                                        </p>
                                    </div>
                                    <div className="w-14 h-14 shrink-0 bg-emerald-50 dark:bg-emerald-900/30 rounded-2xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 transition-transform group-hover:scale-110">
                                        <FiDollarSign size={24} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.02] text-slate-800 pointer-events-none"><FiDollarSign size={100} /></div>
                            </div>
                            
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-6 border border-slate-50 dark:border-slate-700 shadow-xl hover:shadow-2xl transition-all flex-1 flex flex-col justify-center group relative overflow-hidden">
                                <div className="flex items-center justify-between relative z-10 w-full">
                                    <div className="flex-1">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-1">Completed / Total</p>
                                        <p className="text-2xl font-black text-slate-800 dark:text-white group-hover:text-blue-500 transition-colors">
                                            {projects.filter(p => p.status === 'Completed').length} <span className="text-slate-300 dark:text-slate-600 font-medium">/ {projects.length}</span>
                                        </p>
                                    </div>
                                    <div className="w-14 h-14 shrink-0 bg-blue-50 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400 transition-transform group-hover:scale-110">
                                        <FiCheckCircle size={24} />
                                    </div>
                                </div>
                                <div className="absolute -right-4 -bottom-4 opacity-[0.02] text-slate-800 pointer-events-none"><FiCheckCircle size={100} /></div>
                            </div>
                        </div>
                    </div>

                {/* ACTIVE TAB CONTENT */}
                {activeTab === 'home' && (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        
                        {/* PREMIUM CHARTS SECTION */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pb-4">
                            {/* Project Status Donut Chart */}
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl border border-slate-50 dark:border-slate-700 hover:shadow-purple-500/10 transition-all duration-500">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                    <FiPieChart className="text-purple-500" /> Project Status Distribution
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                    Status Breakdown of {projects.length} Total Projects
                                </p>
                                <div className="h-64 w-full">
                                    {projects.length > 0 ? (
                                        <ResponsiveContainer>
                                            <PieChart>
                                                <Pie
                                                    data={statusChartData}
                                                    innerRadius={70}
                                                    outerRadius={100}
                                                    paddingAngle={6}
                                                    dataKey="value"
                                                    stroke="none"
                                                >
                                                    {statusChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity cursor-pointer" />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px 20px' }}
                                                    itemStyle={{ color: '#1e293b', fontWeight: '900', fontSize: '14px' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', color: '#64748B' }} />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">
                                            Not Enough Data
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Financial Utilization Bar Chart */}
                            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] p-8 shadow-2xl border border-slate-50 dark:border-slate-700 hover:shadow-emerald-500/10 transition-all duration-500">
                                <h3 className="text-xl font-black text-slate-800 dark:text-white mb-2 flex items-center gap-2">
                                    <FiBarChart2 className="text-emerald-500" /> Financial Utilization Top 5
                                </h3>
                                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-100 dark:border-slate-700 pb-4">
                                    Total Allocated vs. Liquidated Tranches
                                </p>
                                <div className="h-64 w-full">
                                    {trancheChartData.length > 0 ? (
                                        <ResponsiveContainer>
                                            <BarChart data={trancheChartData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }} barGap={8}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: '900', fill: '#94A3B8' }} tickMargin={12} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: '900', fill: '#94A3B8' }} tickFormatter={(value) => `₱${(value / 1000000).toFixed(1)}M`} width={60} />
                                                <Tooltip 
                                                    formatter={(value) => [formatCurrency(value), '']}
                                                    cursor={{ fill: 'rgba(59, 130, 246, 0.05)' }}
                                                    contentStyle={{ borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)', padding: '12px 20px' }}
                                                    itemStyle={{ color: '#1e293b', fontWeight: '900', fontSize: '12px' }}
                                                />
                                                <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', fontWeight: '900', color: '#64748B' }} />
                                                <Bar dataKey="allocated" name="Allocated" fill="#3B82F6" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                                <Bar dataKey="liquidated" name="Liquidated" fill="#10B981" radius={[6, 6, 0, 0]} maxBarSize={40} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center text-slate-300 dark:text-slate-600 font-bold uppercase tracking-widest text-xs">
                                            Not Enough Data
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        
                        {/* PROJECT TABLE SECTION - Updated to Modern Progress List */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-slate-50/50 dark:bg-slate-800/50">
                                <div>
                                    <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Project Portfolio Tracking</h2>
                                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                                        Monitoring {filteredProjects.length} Active Projects under {isAgencyUser ? userAgency : selectedAgency}
                                    </p>
                                </div>

                                <div className="relative w-full sm:w-80 group">
                                    <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                                    <input
                                        type="text"
                                        placeholder="Search Project Name or ID..."
                                        className="pl-12 pr-4 py-3 w-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-2xl text-sm outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-sm"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="p-6">
                                <div className="space-y-4">
                                    {filteredProjects.map((project, pIdx) => {
                                        // Calculate total allocated and total liquidated
                                        const allocated = parseFloat(project.tranche_1 || 0) + parseFloat(project.tranche_2 || 0) + parseFloat(project.tranche_3 || 0);
                                        const liquidated = parseFloat(project.liquidated_tranche_1 || 0) + parseFloat(project.liquidated_tranche_2 || 0) + parseFloat(project.liquidated_tranche_3 || 0);
                                        
                                        // Calculate completion percentage based on financial liquidation
                                        const rawPercentage = allocated > 0 ? (liquidated / allocated) * 100 : 0;
                                        const percentage = Math.min(rawPercentage, 100).toFixed(1);
                                        const isCompleted = percentage >= 100 || project.status === 'Completed';

                                        return (
                                            <motion.div
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: pIdx * 0.05 }}
                                                key={project.project_id}
                                                className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-[1.5rem] border border-slate-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-lg hover:bg-white dark:hover:bg-slate-800 transition-all group flex flex-col sm:flex-row gap-6 items-center"
                                            >
                                                {/* Left: Project Details */}
                                                <div className="flex-1 w-full space-y-3">
                                                    <div className="flex items-start justify-between sm:justify-start gap-4">
                                                        <div>
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <h4 className="font-black text-lg text-slate-800 dark:text-white group-hover:text-blue-600 transition-colors leading-tight">
                                                                    {project.project_name || 'Unnamed Project'}
                                                                </h4>
                                                                {isCompleted && <FiCheckCircle className="text-emerald-500 shrink-0" size={18} />}
                                                            </div>
                                                            <div className="flex flex-wrap items-center gap-2 text-[10px] font-bold uppercase tracking-wider">
                                                                <span className="text-slate-400 bg-slate-200 dark:bg-slate-700 px-2 py-1 rounded-md">
                                                                    ID: {project.project_id}
                                                                </span>
                                                                <span className={`px-2 py-1 rounded-md shadow-sm ${
                                                                    project.status === 'Completed' 
                                                                        ? 'bg-emerald-500 text-white shadow-emerald-200' 
                                                                        : 'bg-blue-500 text-white shadow-blue-200'
                                                                }`}>
                                                                    {project.status || 'Ongoing'}
                                                                </span>
                                                                <span className="text-blue-600 bg-blue-100 dark:bg-blue-900/50 dark:text-blue-300 px-2 py-1 rounded-md">
                                                                    {project.implementing_agency}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Progress Bar (Financial Liquidation) */}
                                                    <div className="space-y-1.5 pt-2">
                                                        <div className="flex justify-between items-end">
                                                            <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                                <FiBarChart2 className="text-emerald-500"/> Financial Liquidation
                                                            </span>
                                                            <span className={`text-xl font-black ${isCompleted ? 'text-emerald-500' : 'text-blue-600 dark:text-blue-400'}`}>
                                                                {percentage}%
                                                            </span>
                                                        </div>
                                                        <div className="w-full bg-slate-200 dark:bg-slate-700 h-3 rounded-full overflow-hidden shadow-inner">
                                                            <div
                                                                className={`h-full rounded-full transition-all duration-1000 ${
                                                                    isCompleted ? 'bg-emerald-500' : percentage > 0 ? 'bg-blue-500' : 'bg-slate-400'
                                                                }`}
                                                                style={{ width: `${percentage}%` }}
                                                            ></div>
                                                        </div>
                                                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">
                                                            <span>Liqui: {formatCurrency(liquidated)}</span>
                                                            <span>Alloc: {formatCurrency(allocated)}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Right: Actions & Badges */}
                                                <div className="shrink-0 flex flex-row sm:flex-col gap-3 items-center sm:items-end w-full sm:w-auto mt-4 sm:mt-0 pt-4 sm:pt-0 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 sm:pl-6">
                                                    <div className="flex gap-2">
                                                        <div className={`text-[9px] font-black px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm ${project.has_moa ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700'}`}>
                                                            {project.has_moa ? <FiCheckCircle size={10} /> : <FiAlertCircle size={10} />} MOA
                                                        </div>
                                                        <div className={`text-[9px] font-black px-2.5 py-1 rounded-md flex items-center gap-1 shadow-sm ${project.has_rta ? 'bg-emerald-100/80 text-emerald-700 border border-emerald-200' : 'bg-rose-100 text-rose-700'}`}>
                                                            {project.has_rta ? <FiCheckCircle size={10} /> : <FiAlertCircle size={10} />} RTA
                                                        </div>
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <button 
                                                            onClick={() => navigate(`/project-details/${project.project_id}`)}
                                                            className="px-4 py-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-2 border-transparent hover:border-blue-500 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-black uppercase"
                                                            title="View Details"
                                                        >
                                                            <FiEye size={16} /> View
                                                        </button>
                                                        <button 
                                                            onClick={() => setSelectedProjectForLiquidation(project)}
                                                            className="px-4 py-2.5 bg-white dark:bg-slate-800 border-2 border-slate-100 dark:border-slate-600 hover:border-blue-500 hover:text-blue-600 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 text-xs font-black uppercase text-slate-600 dark:text-slate-300"
                                                            title="Update Liquidation"
                                                        >
                                                            <TbChartBar size={16} /> Update
                                                        </button>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        );
                                    })}

                                    {filteredProjects.length === 0 && (
                                        <div className="text-center py-16 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700">
                                            <FiAlertCircle className="mx-auto text-slate-300 dark:text-slate-600 mb-3" size={48} />
                                            <p className="text-slate-500 font-bold uppercase tracking-widest">No Projects Found</p>
                                            <p className="text-slate-400 text-sm mt-1">Adjust search or ensure projects have MOA, RTA, and Tranche 1 allocation.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* MOA TRACKING MASTERLIST SECTION */}
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">MOA Tracking Masterlist</h2>
                                <p className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 italic">
                                    Linking Mother Memoranda to Supplemental Project Allocations
                                </p>
                            </div>

                            <div className="p-8">
                                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
                                    {/* TABLE 1: MOTHER MOAs (Left 5 Columns) */}
                                    <div className="lg:col-span-5 space-y-6">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 shadow-sm">
                                                <FiFileText size={20} />
                                            </div>
                                            <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Mother MOA Records</h3>
                                        </div>

                                        <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Region</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Province</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Agency</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">View</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">MOA ID</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {loadingMoa ? (
                                                        <tr>
                                                            <td colSpan="3" className="px-5 py-12 text-center">
                                                                <div className="h-6 w-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                            </td>
                                                        </tr>
                                                    ) : motherMoas.length > 0 ? (
                                                        motherMoas.map(moa => (
                                                            <tr 
                                                                key={moa.moa_id} 
                                                                onClick={() => setSelectedMotherMoa(moa)}
                                                                className={`cursor-pointer transition-all ${selectedMotherMoa?.moa_id === moa.moa_id ? 'bg-blue-50 dark:bg-blue-900/40 border-l-4 border-l-blue-600' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50'}`}
                                                            >
                                                                <td className="px-5 py-5">
                                                                    <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase">{moa.region}</span>
                                                                </td>
                                                                <td className="px-5 py-5">
                                                                    <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">{moa.province}</span>
                                                                </td>
                                                                <td className="px-5 py-5">
                                                                    <span className="text-[11px] font-black text-slate-600 dark:text-slate-300 uppercase leading-tight">{moa.implementing_agency}</span>
                                                                </td>
                                                                <td className="px-5 py-5">
                                                                    <a 
                                                                        href={moa.moa_link} 
                                                                        target="_blank" 
                                                                        rel="noopener noreferrer"
                                                                        className="p-2 bg-white dark:bg-slate-800 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition-all shadow-sm border border-slate-100 flex items-center justify-center"
                                                                        onClick={(e) => e.stopPropagation()}
                                                                    >
                                                                        <FiEye size={14} />
                                                                    </a>
                                                                </td>
                                                                <td className="px-5 py-5">
                                                                    <span className="text-[10px] font-mono font-bold text-slate-400">#{moa.moa_id}</span>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="3" className="px-5 py-10 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">No Records Found</td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>

                                    {/* TABLE 2: SUPPLEMENTAL MOAs (Right 7 Columns) */}
                                    <div className="lg:col-span-7 space-y-6">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center text-emerald-600 shadow-sm">
                                                    <FiTrendingUp size={20} />
                                                </div>
                                                <h3 className="text-sm font-black text-slate-400 uppercase tracking-wider">Supplemental Details</h3>
                                            </div>
                                            {selectedMotherMoa && (
                                                <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 rounded-lg text-blue-600 border border-blue-100 dark:border-blue-800">
                                                    <FiMapPin size={12} />
                                                    <span className="text-[10px] font-black uppercase tracking-tight">{selectedMotherMoa.province} Archive</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="overflow-hidden rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm min-h-[400px]">
                                            <table className="w-full text-left">
                                                <thead className="bg-slate-50 dark:bg-slate-800/50">
                                                    <tr>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Mother MOA</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplemental Link</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Supplemental ID</th>
                                                        <th className="px-5 py-4 text-[9px] font-black text-slate-400 uppercase tracking-widest">Associated IPCs</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                                    {loadingSupp ? (
                                                        <tr>
                                                            <td colSpan="3" className="px-5 py-12 text-center">
                                                                <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                                                            </td>
                                                        </tr>
                                                    ) : supplementalMoas.length > 0 ? (
                                                        supplementalMoas.map(supp => (
                                                            <tr key={supp.supplamental_moa_id || 'unassigned'} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                                                                <td className="px-5 py-6">
                                                                    <span className="text-[10px] font-mono font-bold text-slate-400">#{supp.mother_moa_id}</span>
                                                                </td>
                                                                <td className="px-5 py-6">
                                                                    {supp.moa_pdf ? (
                                                                        <a 
                                                                            href={supp.moa_pdf} 
                                                                            target="_blank" 
                                                                            rel="noopener noreferrer"
                                                                            className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-600 rounded-lg font-black text-[10px] uppercase tracking-wider hover:bg-emerald-600 hover:text-white transition-all shadow-sm"
                                                                        >
                                                                            <FiFileText size={12} /> View
                                                                        </a>
                                                                    ) : (
                                                                        <span className="text-[9px] font-black text-slate-300 dark:text-slate-600 uppercase italic">Refer to Mother</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-5 py-6">
                                                                    <span className="text-[11px] font-black text-slate-700 dark:text-slate-200 uppercase">{supp.supplamental_moa_id ? `SUP-#${supp.supplamental_moa_id}` : 'DIRECT'}</span>
                                                                </td>
                                                                <td className="px-5 py-6">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {supp.ipcs && supp.ipcs.length > 0 ? (
                                                                            supp.ipcs.map((item, idx) => (
                                                                                <div key={idx} className="group relative">
                                                                                    <div className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-tighter border border-blue-100 dark:border-blue-800 shadow-sm cursor-help hover:bg-blue-600 hover:text-white transition-all">
                                                                                        {item.ipc}
                                                                                    </div>
                                                                                    {/* TOOLTIP DICTIONARY */}
                                                                                    <div className="absolute bottom-full mb-3 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] p-3 rounded-2xl shadow-2xl whitespace-nowrap z-50 animate-in fade-in zoom-in-95 duration-200 border border-white/10">
                                                                                        <div className="flex flex-col gap-1">
                                                                                            <span className="text-blue-300 font-black uppercase tracking-widest text-[8px]">Project Detail</span>
                                                                                            <span className="font-bold text-[11px]">{item.project_name}</span>
                                                                                            <span className="text-[9px] text-slate-400">IPC Reference Code</span>
                                                                                        </div>
                                                                                        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 rotate-45 border-r border-b border-white/10"></div>
                                                                                    </div>
                                                                                </div>
                                                                            ))
                                                                        ) : (
                                                                            <span className="text-[10px] font-bold text-slate-300 dark:text-slate-600 uppercase italic">No Projects assigned</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    ) : (
                                                        <tr>
                                                            <td colSpan="3" className="px-5 py-10 text-center">
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                                                        <FiAlertCircle size={32} />
                                                                    </div>
                                                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">Select a Mother MOA to view linked allocations</p>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        </div>
                )}
                
                {activeTab === 'deployment' && (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl border border-slate-50 dark:border-slate-700 overflow-hidden">
                            <div className="p-8 border-b border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
                                <h2 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">Deployment Pipeline</h2>
                                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mt-1">
                                    Tracking {allProjects.length} Total Assigned Projects
                                </p>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="bg-slate-50 dark:bg-slate-800/50">
                                            <th className="px-8 py-5 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Documents</th>
                                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Construction</th>
                                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Engineer</th>
                                            <th className="px-8 py-5 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Last Update</th>
                                            <th className="px-6 py-5 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                        {allProjects.map((proj) => (
                                            <tr key={proj.project_id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors">
                                                <td className="px-8 py-6">
                                                    <h4 className="font-bold text-slate-800 dark:text-white leading-tight">{proj.project_name}</h4>
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">ID: {proj.project_id}</p>
                                                    {proj.implementing_agency_specific && (
                                                        <p className="text-[9px] text-slate-500 font-bold">{proj.implementing_agency_specific}</p>
                                                    )}
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${proj.has_moa ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>MOA</span>
                                                    <span className={`px-2 py-0.5 rounded text-[9px] font-black ${proj.has_rta ? 'bg-emerald-100 text-emerald-600' : 'bg-slate-100 text-slate-400'}`}>RTA</span>
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                        proj.status === 'Completed' ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white'
                                                    }`}>
                                                        {proj.status || 'Ongoing'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-6 text-center overflow-hidden max-w-[120px]">
                                                    <span className={`text-[10px] font-bold truncate ${!proj.engineer_name ? 'text-orange-600' : 'text-slate-600 dark:text-slate-400'}`}>
                                                        {proj.engineer_name || 'Unassigned'}
                                                    </span>
                                                </td>
                                                <td className="px-8 py-6 text-right text-xs font-bold text-slate-500">
                                                    {proj.date_assigned ? new Date(proj.date_assigned).toLocaleDateString() : 'N/A'}
                                                </td>
                                                <td className="px-6 py-6 text-center">
                                                    <button 
                                                        onClick={() => setSelectedProjectForAssignment(proj)}
                                                        className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                                        title="Assign Engineer"
                                                    >
                                                        <FiUserPlus size={18} />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                )}
                {/* MODAL */}
                <AnimatePresence>
                    {selectedProjectForLiquidation && (
                        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-md">
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                                animate={{ scale: 1, opacity: 1, y: 0 }}
                                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                                className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden border border-white/20"
                            >
                                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white relative">
                                    <div className="absolute top-8 right-8 cursor-pointer hover:rotate-90 transition-transform" onClick={() => setSelectedProjectForLiquidation(null)}>
                                        <FiX size={24} />
                                    </div>
                                    <h3 className="text-2xl font-black tracking-tight mb-2">Fund Liquidation</h3>
                                    <p className="text-blue-100 font-bold text-sm uppercase tracking-widest opacity-80 truncate">
                                        {selectedProjectForLiquidation.project_name}
                                    </p>
                                </div>

                                <div className="p-10 space-y-6">
                                    <LiquidationEntry
                                        label="Tranche 1"
                                        initialValue={selectedProjectForLiquidation.liquidated_tranche_1}
                                        onUpdate={(val) => selectedProjectForLiquidation.liquidated_tranche_1 = val}
                                    />
                                    <LiquidationEntry
                                        label="Tranche 2"
                                        initialValue={selectedProjectForLiquidation.liquidated_tranche_2}
                                        onUpdate={(val) => selectedProjectForLiquidation.liquidated_tranche_2 = val}
                                    />
                                    <LiquidationEntry
                                        label="Tranche 3"
                                        initialValue={selectedProjectForLiquidation.liquidated_tranche_3}
                                        onUpdate={(val) => selectedProjectForLiquidation.liquidated_tranche_3 = val}
                                    />

                                    <div className="pt-6 flex gap-4">
                                        <button 
                                            onClick={() => setSelectedProjectForLiquidation(null)}
                                            className="flex-1 py-4 text-slate-400 font-black uppercase tracking-widest hover:text-slate-600 transition-colors"
                                        >
                                            Discard
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                try {
                                                    const res = await fetch(`/api/agency-dashboard/projects/${selectedProjectForLiquidation.project_id}/liquidation`, {
                                                        method: 'PATCH',
                                                        headers: { 'Content-Type': 'application/json' },
                                                        body: JSON.stringify({
                                                            liquidated_tranche_1: selectedProjectForLiquidation.liquidated_tranche_1,
                                                            liquidated_tranche_2: selectedProjectForLiquidation.liquidated_tranche_2,
                                                            liquidated_tranche_3: selectedProjectForLiquidation.liquidated_tranche_3
                                                        })
                                                    });
                                                    if (res.ok) {
                                                        fetchAgencyData();
                                                        setSelectedProjectForLiquidation(null);
                                                    }
                                                } catch (e) { console.error(e); }
                                            }}
                                            className="flex-1 py-4 bg-blue-600 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-200 hover:bg-blue-700 transition-all transform hover:scale-105 active:scale-95"
                                        >
                                            Update
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </AnimatePresence>

                {/* Assignment Modal */}
                {selectedProjectForAssignment && createPortal(
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 px-4">
                        <div className="bg-white dark:bg-slate-800 w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col relative px-4 sm:px-8">
                            <button 
                                onClick={() => setSelectedProjectForAssignment(null)}
                                className="absolute top-6 right-6 p-2 bg-slate-50 dark:bg-slate-700 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                            
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-slate-800 dark:text-white">Assign Engineer</h2>
                                <p className="text-xs text-slate-400 font-medium">Assignment for: <span className="text-blue-600 font-bold">{selectedProjectForAssignment.project_name}</span></p>
                            </div>

                            <div className="space-y-4 mb-8 overflow-y-auto pr-2 custom-scrollbar flex-1">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Registered Engineer (Including Non-DepEd)</label>
                                <div className="grid grid-cols-1 gap-2">
                                    {engineers.map((eng) => (
                                        <button
                                            key={eng.uid}
                                            onClick={() => setSelectedEngineer(eng.uid)}
                                            className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${selectedEngineer === eng.uid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 dark:bg-slate-700/50 border-transparent text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedEngineer === eng.uid ? 'bg-white/20' : 'bg-white dark:bg-slate-600'}`}>
                                                    {eng.firstName[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold">{eng.firstName} {eng.lastName}</p>
                                                    <p className={`text-[10px] ${selectedEngineer === eng.uid ? 'text-blue-100' : 'text-slate-400'}`}>
                                                        {eng.division || 'No Division'} • {eng.position || 'Engineer'}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedEngineer === eng.uid && <FiCheck size={20} />}
                                        </button>
                                    ))}
                                    {engineers.length === 0 && (
                                        <p className="text-center py-8 text-slate-400 font-bold uppercase text-xs">No Engineers Registered</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                <button 
                                    onClick={() => setSelectedProjectForAssignment(null)}
                                    className="w-full py-4 rounded-2xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-200 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
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

                </div> {/* MAIN DASHBOARD WRAPPER */}

                {/* Notification */}
                {message.text && (
                    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[3000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {message.type === 'success' ? <FiCheckCircle size={20} /> : <FiAlertCircle size={20} />}
                        <p className="text-sm font-bold">{message.text}</p>
                        <button onClick={() => setMessage({ text: '', type: '' })} className="ml-2 hover:opacity-70"><FiX /></button>
                    </div>
                )}
                {/* BOTTOM NAVIGATION */}
                <BottomNav userRole={userRole} />
            </div>
        </PageTransition>
    );
};

const LiquidationEntry = ({ label, initialValue, onUpdate }) => {
    const [val, setVal] = useState(initialValue || 0);

    return (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label} Liquidated</label>
            <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 font-bold transition-colors">₱</span>
                <input
                    type="number"
                    value={val}
                    onChange={(e) => {
                        const n = parseFloat(e.target.value) || 0;
                        setVal(n);
                        onUpdate(n);
                    }}
                    className="w-full pl-10 pr-4 py-4 bg-slate-50 dark:bg-slate-700/50 border border-slate-100 dark:border-slate-700 rounded-2xl font-black text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all"
                />
            </div>
        </div>
    );
};

export default AgencyDashboard;
