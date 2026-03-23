import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FiLayers, FiMap, FiUser, FiTv, FiSettings, 
    FiCheckCircle, FiLoader, FiPieChart, FiBarChart2, 
    FiTrendingUp, FiDollarSign, FiTarget, FiAlertTriangle 
} from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

const API_BASE = "";
const STOREY_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#14B8A6', '#F97316', '#6366F1'];

const StatCard = ({ icon: Icon, label, value, sub, color, bgColor }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`${bgColor || 'bg-white'} rounded-2xl p-5 shadow-sm border border-slate-100 flex items-start gap-4 h-full`}
    >
        <div className={`p-3 rounded-xl ${color} bg-opacity-20 shrink-0`}>
            <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
        </div>
        <div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-2xl font-black text-slate-800 mt-1">{value}</p>
            {sub && <p className="text-[10px] text-slate-400 mt-1 font-bold">{sub}</p>}
        </div>
    </motion.div>
);

const PSIPMiniDashboard = ({ onStoreyClick, activeStorey }) => {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState(null);
    const [partnerships, setPartnerships] = useState(null);
    const [storeyBreakdown, setStoreyBreakdown] = useState([]);
    const [storeyOption, setStoreyOption] = useState(null);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sumRes, breakRes, partRes] = await Promise.all([
                    fetch(`${API_BASE}/api/masterlist/summary`),
                    fetch(`${API_BASE}/api/masterlist/storey-breakdown`),
                    fetch(`${API_BASE}/api/masterlist/partnerships`)
                ]);

                if (sumRes.ok) setSummary(await sumRes.json());
                
                const breakdownData = breakRes.ok ? await breakRes.json() : [];
                setStoreyBreakdown(breakdownData);
                
                if (breakdownData.length > 0) {
                    const uniqueStoreys = [...new Set(breakdownData.map(i => i.storey))].sort((a, b) => Number(a) - Number(b));
                    if (uniqueStoreys.length > 0) setStoreyOption(uniqueStoreys[0]);
                }

                if (partRes.ok) setPartnerships(await partRes.json());
            } catch (err) {
                console.error('PSIP Mini Dashboard Fetch Error:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const formatCost = (v) => {
        const num = Number(v);
        if (num >= 1e9) return `₱${(num / 1e9).toFixed(1)}B`;
        if (num >= 1e6) return `₱${(num / 1e6).toFixed(1)}M`;
        return `₱${num.toLocaleString()}`;
    };

    const partnershipDistributionData = partnerships ? [
        { name: 'MGO', value: Number(partnerships.totals.mayor_muni_count) || 0, color: '#3B82F6' },
        { name: 'CGO', value: Number(partnerships.totals.mayor_city_count) || 0, color: '#8B5CF6' },
        { name: 'PGO', value: Number(partnerships.totals.governor_count) || 0, color: '#10B981' },
        { name: 'DPWH', value: Number(partnerships.totals.dpwh_count) || 0, color: '#F59E0B' },
        { name: 'DepEd', value: Number(partnerships.totals.deped_count) || 0, color: '#10B981' },
        { name: 'CSO', value: Number(partnerships.totals.cso_count) || 0, color: '#EF4444' },
    ].filter(d => d.value > 0) : [];

    const uniqueStoreys = [...new Set(storeyBreakdown.map(item => item.storey))].sort((a, b) => a - b);

    if (loading) return (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <FiLoader className="w-12 h-12 animate-spin text-blue-500 mb-4" />
            <p className="font-bold uppercase tracking-widest text-xs">Loading Strategic Data...</p>
        </div>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard 
                    icon={FiTarget} 
                    label="Schools Covered" 
                    value={summary?.total_schools?.toLocaleString() || '0'} 
                    sub={`${summary?.total_regions || 0} Regions Targeted`}
                    color="bg-blue-500" 
                />
                <StatCard 
                    icon={FiAlertTriangle} 
                    label="Estimated Shortage" 
                    value={summary?.total_shortage?.toLocaleString() || '0'} 
                    sub="Classroom Gaps Identified"
                    color="bg-amber-500" 
                />
                <StatCard 
                    icon={FiCheckCircle} 
                    label="Proposed Classrooms" 
                    value={summary?.total_classrooms?.toLocaleString() || '0'} 
                    sub="Total Construction Goal"
                    color="bg-emerald-500" 
                />
                <StatCard 
                    icon={FiDollarSign} 
                    label="Total Est. Cost" 
                    value={formatCost(summary?.total_cost || 0)} 
                    sub={`${summary?.total_projects || 0} Strategic Projects`}
                    color="bg-indigo-500" 
                />
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Left: Partnership Distribution */}
                <div className="xl:col-span-1 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col">
                    <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
                        <FiPieChart className="text-blue-500" /> Partnership Roles
                    </h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-6">Implementing Agency Roles</p>
                    
                    <div className="flex-1 flex flex-col items-center justify-center min-h-[300px]">
                        <ResponsiveContainer width="100%" height={250}>
                            <PieChart>
                                <Pie
                                    data={partnershipDistributionData}
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={5}
                                    dataKey="value"
                                    strokeWidth={0}
                                >
                                    {partnershipDistributionData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>
                                <Tooltip 
                                    contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '10px', fontWeight: 'bold' }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        <div className="grid grid-cols-3 gap-4 w-full mt-4">
                            {partnershipDistributionData.map((d, i) => (
                                <div key={i} className="flex flex-col items-center">
                                    <div className="flex items-center gap-1.5 mb-1">
                                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }}></div>
                                        <span className="text-[9px] font-black text-slate-400 uppercase">{d.name}</span>
                                    </div>
                                    <span className="text-xs font-black text-slate-700">{d.value.toLocaleString()}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: Standard Building Configurations */}
                <div className="xl:col-span-2 bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-sm font-black text-slate-800 mb-1 flex items-center gap-2">
                                <FiLayers className="text-indigo-500" /> Building Standards
                            </h3>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Standard Building Prototypes</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Storey:</span>
                            <select
                                value={storeyOption || ''}
                                onChange={(e) => setStoreyOption(Number(e.target.value))}
                                className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none transition-all cursor-pointer"
                            >
                                {uniqueStoreys.map(s => (
                                    <option key={s} value={s}>{s} Storey</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {storeyBreakdown
                            .filter(item => item.storey === storeyOption)
                            .map((item, idx) => (
                                <div 
                                    key={idx} 
                                    onClick={() => onStoreyClick?.(storeyOption, item.classrooms)}
                                    className={`bg-slate-50/50 border p-4 rounded-2xl flex items-center justify-between group hover:border-blue-200 hover:bg-blue-50/30 transition-all cursor-pointer ${
                                        activeStorey?.storeys === storeyOption && activeStorey?.classrooms === item.classrooms
                                            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-500/20' 
                                            : 'border-slate-100'
                                    }`}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center font-black text-blue-600 shadow-sm border border-slate-100 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                            {item.classrooms}
                                        </div>
                                        <div>
                                            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Prototype</div>
                                            <div className="text-sm font-black text-slate-800">{storeyOption}STY{item.classrooms}CL</div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-base font-black text-slate-800">{Number(item.count).toLocaleString()}</div>
                                        <div className="text-[9px] font-bold text-slate-400 uppercase">Projects</div>
                                    </div>
                                </div>
                            ))}
                    </div>

                    {uniqueStoreys.length === 0 && (
                        <div className="py-20 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                            <FiLayers className="w-12 h-12 text-slate-200 mx-auto mb-3" />
                            <p className="text-sm text-slate-400 font-bold">No prototype data available</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Footer Insights */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="relative z-10 flex items-center gap-6">
                    <div className="p-4 bg-white/20 rounded-2xl backdrop-blur-md">
                        <FiTrendingUp size={24} />
                    </div>
                    <div>
                        <h4 className="text-lg font-black tracking-tight">2026-2030 Strategic Roadmap</h4>
                        <p className="text-xs text-blue-100 font-medium max-w-2xl mt-1">
                            The data above reflects the current masterlist for the next five-year infrastructure plan. 
                            Active project monitoring on the primary tab should align with these strategic priorities to ensure targets are met across all regions.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PSIPMiniDashboard;
