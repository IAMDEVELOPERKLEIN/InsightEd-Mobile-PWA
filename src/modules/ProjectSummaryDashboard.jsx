import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { 
    FiTool, FiTrendingUp, FiCheckCircle, FiClock, 
    FiFileText, FiMapPin, FiBarChart2, FiBriefcase, FiDollarSign, FiActivity
} from 'react-icons/fi';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, Cell, 
    PieChart, Pie, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const ProjectSummaryDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const region = user?.region || localStorage.getItem('userRegion') || 'Region V';
                const division = user?.division || localStorage.getItem('userDivision') || '';
                
                let url = `/api/monitoring/engineer-stats?region=${encodeURIComponent(region)}`;
                if (division) url += `&division=${encodeURIComponent(division)}`;
                
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch project stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    const projectData = stats ? [
        { name: 'Completed', value: stats.completed, color: '#10B981' },
        { name: 'Ongoing', value: stats.ongoing, color: '#3B82F6' },
        { name: 'Procuring', value: stats.under_procurement, color: '#F59E0B' },
        { name: 'Not Started', value: stats.not_yet_started, color: '#64748B' },
        { name: 'Final Inspection', value: stats.for_final_inspection, color: '#EC4899' },
    ] : [];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading Project Data...</p>
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-900 pb-24 font-sans">
                {/* --- ENGINEERING THEMED HEADER --- */}
                <div className="bg-gradient-to-br from-[#0f172a] via-[#1e293b] to-[#334155] pt-8 pb-32 px-6 rounded-b-[3rem] shadow-2xl relative overflow-hidden">
                    {/* Animated Circuit Effect */}
                    <div className="absolute top-[-50%] right-[-10%] w-[500px] h-[500px] bg-blue-500/5 rounded-full blur-[100px] animate-blob"></div>
                    <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] bg-indigo-500/10 rounded-full blur-[80px] animate-blob animation-delay-4000"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-inner">
                                    <FiBriefcase className="text-indigo-400 text-2xl" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-white tracking-tight">Project Hub 2.0</h1>
                                    <p className="text-indigo-200/60 text-[10px] font-bold uppercase tracking-widest">Infrastructure & Financial Ops</p>
                                </div>
                            </div>
                            <div className="text-right text-white">
                                <p className="font-bold text-sm leading-tight">{user?.firstName || user?.first_name || 'Engineer'}</p>
                                <p className="text-indigo-400 text-[10px] font-medium uppercase">{user?.role || 'Division Engineer'}</p>
                            </div>
                        </div>

                        {/* Summary Ribbon */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-white/5 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 shadow-lg group hover:border-blue-500/50 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-wider">Active Projects</p>
                                </div>
                                <h3 className="text-3xl font-black text-white tracking-tighter">{(stats?.ongoing || 0) + (stats?.under_procurement || 0)}</h3>
                            </div>
                            <div className="bg-white/5 backdrop-blur-md p-5 rounded-[2rem] border border-white/10 shadow-lg group hover:border-emerald-500/50 transition-all">
                                <div className="flex items-center gap-2 mb-2">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                    <p className="text-white/40 text-[9px] font-black uppercase tracking-wider">Target Met</p>
                                </div>
                                <h3 className="text-3xl font-black text-emerald-400 tracking-tighter">{stats?.completed || 0}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="px-6 -mt-12 relative z-20 space-y-6">
                    {/* Status Stats Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { label: 'Ongoing', val: stats?.ongoing, color: 'border-blue-500/20 text-blue-500', bg: 'bg-blue-50' },
                            { label: 'Procurement', val: stats?.under_procurement, color: 'border-amber-500/20 text-amber-500', bg: 'bg-amber-50' },
                            { label: 'Inspection', val: stats?.for_final_inspection, color: 'border-pink-500/20 text-pink-500', bg: 'bg-pink-50' },
                            { label: 'Pending', val: stats?.not_yet_started, color: 'border-slate-500/20 text-slate-500', bg: 'bg-slate-100' }
                        ].map((stat, i) => (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: i * 0.1 }}
                                key={stat.label}
                                className={`p-5 rounded-[2rem] bg-white dark:bg-slate-800 border ${stat.color} shadow-sm flex items-center justify-between group overflow-hidden relative`}
                            >
                                <div className="relative z-10">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-slate-600 transition-all mb-1">{stat.label}</p>
                                    <h4 className="text-2xl font-black">{stat.val || 0}</h4>
                                </div>
                                <div className={`absolute bottom-[-20%] right-[-10%] opacity-10 group-hover:scale-125 transition-transform duration-500 ${stat.color}`}>
                                    <FiActivity size={80} />
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Chart Section */}
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white dark:bg-slate-800 p-8 rounded-[3rem] shadow-xl border border-slate-100 dark:border-slate-700"
                    >
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                                    Delivery Status <FiTrendingUp className="text-blue-600" />
                                </h2>
                                <p className="text-xs text-slate-400 font-medium">Project Lifecycle Distribution</p>
                            </div>
                            <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center">
                                <FiBarChart2 size={18} className="text-slate-400" />
                            </div>
                        </div>

                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart layout="vertical" data={projectData} margin={{ left: 20 }}>
                                    <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                                    <XAxis type="number" hide />
                                    <YAxis 
                                        type="category" 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }} 
                                    />
                                    <Tooltip 
                                        cursor={{ fill: 'rgba(241, 245, 249, 0.5)' }}
                                        contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}
                                    />
                                    <Bar dataKey="value" radius={[0, 10, 10, 0]} barSize={30}>
                                        {projectData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Quick Launch Section */}
                    <div className="space-y-3">
                        <p className="text-[10px] font-black uppercase text-slate-400 ml-4 tracking-[0.2em]">Administrative Controls</p>
                        <button 
                            onClick={() => navigate('/engineer-projects')}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 p-5 rounded-[2rem] text-white font-black text-sm shadow-xl shadow-indigo-200/50 dark:shadow-none transition-all flex items-center justify-between group"
                        >
                            <span>Project Management Center</span>
                            <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-all">
                                <FiTool />
                            </div>
                        </button>
                        
                        <div className="grid grid-cols-2 gap-3">
                            <button 
                                onClick={() => navigate('/finance-dashboard')}
                                className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-slate-800 dark:text-white font-black text-[11px] border border-slate-100 dark:border-slate-700 shadow-lg flex items-center gap-3 active:scale-95 transition-all"
                            >
                                <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-500">
                                    <FiDollarSign />
                                </div>
                                Finance
                            </button>
                            <button 
                                onClick={() => navigate('/chat')}
                                className="bg-white dark:bg-slate-800 p-5 rounded-[2rem] text-slate-800 dark:text-white font-black text-[11px] border border-slate-100 dark:border-slate-700 shadow-lg flex items-center gap-3 active:scale-95 transition-all"
                            >
                                <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-500">
                                    <FiFileText />
                                </div>
                                Reports
                            </button>
                        </div>
                    </div>
                </div>

                <BottomNav userRole={user?.role} />
            </div>
        </PageTransition>
    );
};

export default ProjectSummaryDashboard;
