import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';
import { 
    FiTrendingUp, FiCheckCircle, FiClock, FiFileText, 
    FiUsers, FiHome, FiBarChart2, FiActivity, FiMapPin
} from 'react-icons/fi';
import { 
    BarChart, Bar, XAxis, YAxis, CartesianGrid, 
    Tooltip, Legend, ResponsiveContainer, Cell, 
    PieChart, Pie, AreaChart, Area
} from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';

const EducationalDashboard = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('overview');

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const region = user?.region || localStorage.getItem('userRegion') || 'Region V';
                const division = user?.division || localStorage.getItem('userDivision') || '';
                const schoolId = user?.school_id || localStorage.getItem('schoolId') || '';
                
                let url = `/api/monitoring/stats?region=${encodeURIComponent(region)}`;
                if (division) url += `&division=${encodeURIComponent(division)}`;
                if (schoolId) url += `&school_id=${encodeURIComponent(schoolId)}`;
                
                const res = await fetch(url);
                if (res.ok) {
                    const data = await res.json();
                    setStats(data);
                }
            } catch (err) {
                console.error("Failed to fetch educational stats:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, [user]);

    const chartData = stats ? [
        { name: 'Profile', value: stats.profile },
        { name: 'Enrollment', value: stats.enrollment },
        { name: 'Classes', value: stats.organizedclasses },
        { name: 'Personnel', value: stats.personnel },
        { name: 'Resources', value: stats.resources },
        { name: 'Facilities', value: stats.facilities },
    ] : [];

    const pieData = stats ? [
        { name: 'Completed', value: stats.completed_schools_count, color: '#10B981' },
        { name: 'Pending', value: stats.total_schools - stats.completed_schools_count, color: '#6366F1' }
    ] : [];

    const COLORS = ['#6366F1', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6'];

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium animate-pulse">Building Dashboard...</p>
                </div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-[#f8fafc] dark:bg-slate-900 pb-24 font-sans">
                {/* --- PREMIUM GRADIENT HEADER --- */}
                <div className="bg-gradient-to-br from-[#1e40af] via-[#3b82f6] to-[#60a5fa] pt-8 pb-32 px-6 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                    {/* Animated Background Orbs */}
                    <div className="absolute top-[-10%] right-[-5%] w-64 h-64 bg-white/10 rounded-full blur-3xl animate-blob"></div>
                    <div className="absolute bottom-[-10%] left-[-5%] w-48 h-48 bg-blue-300/10 rounded-full blur-2xl animate-blob animation-delay-2000"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                                    <FiBarChart2 className="text-white text-2xl" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-black text-white tracking-tight">InsightED 2.0</h1>
                                    <p className="text-blue-100/80 text-[10px] font-bold uppercase tracking-widest">HROD & Educational Ops</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <p className="text-white font-bold text-sm">{user?.firstName || user?.first_name || 'Admin'}</p>
                                <p className="text-blue-200 text-[9px] font-medium">{user?.role || 'Regional Office'}</p>
                            </div>
                        </div>

                        {/* Summary Ribbon */}
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 shadow-lg">
                                <p className="text-white/60 text-[8px] font-black uppercase tracking-wider mb-1">Total Schools</p>
                                <h3 className="text-2xl font-black text-white">{stats?.total_schools || 0}</h3>
                            </div>
                            <div className="bg-emerald-500/20 backdrop-blur-md p-4 rounded-3xl border border-emerald-400/30 shadow-lg">
                                <p className="text-emerald-100/60 text-[8px] font-black uppercase tracking-wider mb-1">Completed</p>
                                <h3 className="text-2xl font-black text-emerald-400">{stats?.completed_schools_count || 0}</h3>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="px-6 -mt-12 relative z-20 space-y-6">
                    {/* KPI Quick Cards */}
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { label: 'Profile', val: stats?.profile, icon: FiHome, color: 'text-blue-500' },
                            { label: 'Enroll', val: stats?.enrollment, icon: FiUsers, color: 'text-purple-500' },
                            { label: 'Staff', val: stats?.personnel, icon: FiActivity, color: 'text-amber-500' },
                            { label: 'Infra', val: stats?.facilities, icon: FiMapPin, color: 'text-emerald-500' }
                        ].map((kpi, i) => (
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.1 }}
                                key={kpi.label} 
                                className="bg-white dark:bg-slate-800 p-3 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col items-center text-center"
                            >
                                <kpi.icon className={`${kpi.color} mb-1`} size={16} />
                                <span className="text-[14px] font-black text-slate-800 dark:text-white">{kpi.val || 0}</span>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{kpi.label}</span>
                            </motion.div>
                        ))}
                    </div>

                    {/* Completion Chart Card */}
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700"
                    >
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h2 className="text-lg font-black text-slate-800 dark:text-white flex items-center gap-2">
                                    Unit Progress <FiActivity className="text-blue-500" />
                                </h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Schools with completed modules</p>
                            </div>
                        </div>

                        <div className="h-[250px] w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis 
                                        dataKey="name" 
                                        axisLine={false} 
                                        tickLine={false} 
                                        tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} 
                                    />
                                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#94a3b8' }} />
                                    <Tooltip 
                                        cursor={{ fill: '#f8fafc' }}
                                        contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '12px' }}
                                    />
                                    <Bar dataKey="value" radius={[6, 6, 0, 0]} barSize={24}>
                                        {chartData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </motion.div>

                    {/* Overall Health (Pie & Details) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-white dark:bg-slate-800 p-6 rounded-[2.5rem] shadow-lg border border-slate-100 dark:border-slate-700">
                            <h3 className="text-sm font-black text-slate-800 dark:text-white mb-4 uppercase tracking-wider">Registration Status</h3>
                            <div className="h-[180px] flex items-center justify-center">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {pieData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <Tooltip />
                                    </PieChart>
                                </ResponsiveContainer>
                                <div className="absolute flex flex-col items-center">
                                    <span className="text-xl font-black text-slate-800 dark:text-white">
                                        {stats ? Math.round((stats.completed_schools_count / stats.total_schools) * 100) : 0}%
                                    </span>
                                    <span className="text-[8px] font-bold text-slate-400">SYNCED</span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-6 rounded-[2.5rem] shadow-lg text-white">
                            <div className="flex items-center gap-3 mb-4">
                                <FiTrendingUp size={24} />
                                <h3 className="font-black text-lg">System Insights</h3>
                            </div>
                            <div className="space-y-4">
                                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                                    <p className="text-xs text-indigo-100">Validated Schools</p>
                                    <h4 className="text-2xl font-black">{stats?.validated_schools_count || 0}</h4>
                                    <div className="w-full bg-white/20 h-1 rounded-full mt-2">
                                        <div 
                                            className="bg-white h-full rounded-full" 
                                            style={{ width: `${stats ? (stats.validated_schools_count / stats.total_schools) * 100 : 0}%` }}
                                        ></div>
                                    </div>
                                </div>
                                <div className="bg-white/10 p-4 rounded-3xl backdrop-blur-sm border border-white/10">
                                    <p className="text-xs text-indigo-100">Registered Accounts</p>
                                    <h4 className="text-2xl font-black">{stats?.registered_schools_count || 0}</h4>
                                </div>
                            </div>
                        </div>
                    </div>

                    <button 
                        onClick={() => navigate('/monitoring-dashboard')}
                        className="w-full bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 py-4 rounded-3xl text-slate-600 dark:text-slate-300 font-bold text-sm transition-all flex items-center justify-center gap-2 border border-slate-200 dark:border-slate-700"
                    >
                        Detailed Monitoring <FiActivity />
                    </button>
                </div>

                <BottomNav userRole={user?.role} />
            </div>
        </PageTransition>
    );
};

export default EducationalDashboard;
