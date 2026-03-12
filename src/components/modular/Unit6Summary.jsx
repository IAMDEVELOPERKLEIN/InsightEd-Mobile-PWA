import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FiArrowLeft, FiCheckCircle, FiUsers, FiClock, 
  FiPieChart, FiMapPin, FiBriefcase, FiAward,
  FiChevronRight
} from "react-icons/fi";
import { motion } from "framer-motion";

const UNIT_ID = 6;
const NEXT_UNIT_PATH = "/modular/unit-7";

const Unit6Summary = () => {
    const navigate = useNavigate();
    const [schoolId, setSchoolId] = useState("");
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isFinalizing, setIsFinalizing] = useState(false);

    useEffect(() => {
        const storedId = localStorage.getItem("schoolId");
        if (!storedId) {
            navigate("/login");
            return;
        }
        setSchoolId(storedId);
        fetchSummary(storedId);
    }, []);

    const fetchSummary = async (id) => {
        setLoading(true);
        try {
            const res = await fetch(`/api/schools/${id}/workload-summary`);
            const json = await res.json();
            if (json.success) setSummary(json.data);
        } catch (err) { console.error("Summary Fetch Err:", err); }
        setLoading(false);
    };

    const handleFinalSubmit = async () => {
        setIsFinalizing(true);
        try {
            const res = await fetch(`/api/ph_schools/unit6/${schoolId}`, { method: "POST" });
            const json = await res.json();
            if (json.success) {
                // Update Local Progress
                const stored = localStorage.getItem('quest_progress');
                if (stored) {
                    const progress = JSON.parse(stored);
                    if (!progress.completedUnits.includes(UNIT_ID)) {
                        progress.completedUnits.push(UNIT_ID);
                        progress.xp += 100; // Final submit awards more XP
                        localStorage.setItem('quest_progress', JSON.stringify(progress));
                    }
                }

                // Sync progress to dashboard
                try {
                    await fetch('/api/user/progress', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ unitId: UNIT_ID, schoolId })
                    });
                } catch (e) { console.warn("Progress sync failed", e); }

                navigate(NEXT_UNIT_PATH);
            }
        } catch (err) { alert("Finalization failed."); }
        setIsFinalizing(false);
    };

    const formatTime = (totalMins) => {
        const hrs = Math.floor(totalMins / 60);
        const mins = totalMins % 60;
        let str = "";
        if (hrs > 0) str += `${hrs} Hour${hrs > 1 ? 's' : ''} `;
        if (mins > 0 || hrs === 0) str += `${mins} Minute${mins > 1 ? 's' : ''}`;
        return str;
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Generating Workload Report...</p>
        </div>
    );

    if (!summary) return <div>Failed to load summary.</div>;

    const { totalHeadcount, demographics, deployment, avgWorkloadMinutes } = summary;

    return (
        <div className="min-h-screen bg-gray-50 pb-32 font-sans">
            {/* Header */}
            <header className="bg-white border-b border-slate-100 sticky top-0 z-40 px-5 py-4">
                <div className="max-w-md mx-auto flex items-center justify-between">
                    <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors">
                        <FiArrowLeft className="w-6 h-6" />
                    </button>
                    <div className="text-center">
                        <div className="text-[10px] font-black tracking-widest text-blue-500 uppercase">Unit 6 Summary</div>
                        <h1 className="text-sm font-black text-slate-800 uppercase tracking-tighter">Workload Dashboard</h1>
                    </div>
                    <div className="w-10" />
                </div>
            </header>

            <main className="max-w-md mx-auto p-5 space-y-8">
                {/* Hero Metric: Average Workload */}
                <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-[2.5rem] p-8 shadow-xl shadow-blue-900/5 border border-slate-100 text-center relative overflow-hidden">
                    <div className="absolute top-0 right-0 -mr-10 -mt-10 w-40 h-40 bg-blue-50 rounded-full blur-3xl opacity-50" />
                    <div className="relative z-10">
                        <div className="w-16 h-16 bg-blue-600 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                            <FiClock size={32} />
                        </div>
                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 font-mono">Killer Metric</p>
                        <h2 className="text-3xl font-black text-slate-800 leading-tight mb-2">
                           Average Teacher Workload
                        </h2>
                        <div className="text-4xl font-black text-blue-600 tracking-tighter">
                            {formatTime(avgWorkloadMinutes)}
                        </div>
                        <p className="text-slate-400 text-xs font-bold mt-4 italic opacity-70">
                            Calculated across {totalHeadcount} active personnel.
                        </p>
                    </div>
                </motion.div>

                {/* Demographic Grid */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                <FiUsers size={16} />
                            </div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Headcount</span>
                        </div>
                        <div className="text-4xl font-black text-slate-800">{totalHeadcount}</div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase mt-1">Total Registered</p>
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                                <FiPieChart size={16} />
                            </div>
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Sex Dist.</span>
                        </div>
                        <div className="space-y-1">
                            {demographics.sex.map((s, i) => (
                                <div key={i} className="flex justify-between items-center text-xs font-bold">
                                    <span className="text-slate-500">{s.label || 'N/A'}</span>
                                    <span className="text-slate-800">{s.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Deployment & Efficiency Section */}
                <section className="bg-white rounded-[2rem] p-8 border border-slate-100 shadow-sm">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="w-10 h-10 rounded-2x bg-orange-50 flex items-center justify-center text-orange-600">
                            <FiMapPin size={20} />
                        </div>
                        <div>
                           <h3 className="text-base font-black text-slate-800 uppercase tracking-tighter leading-none">Deployment & Efficiency</h3>
                           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-1">Assignment Distribution</p>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b pb-2">By Grade Level</p>
                            <div className="grid gap-3">
                                {deployment.byGrade.map((g, i) => (
                                    <div key={i} className="flex items-center gap-4">
                                        <div className="w-20 text-[10px] font-black text-slate-500 uppercase">{g.label}</div>
                                        <div className="flex-1 h-2 bg-slate-50 rounded-full overflow-hidden">
                                            <motion.div 
                                                initial={{ width: 0 }} 
                                                animate={{ width: `${(g.value / totalHeadcount) * 100}%` }} 
                                                className="h-full bg-orange-400 rounded-full" 
                                            />
                                        </div>
                                        <div className="w-8 text-right text-xs font-black text-slate-700">{g.value}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-4 border-b pb-2">Top Subject Loads</p>
                            <div className="flex flex-wrap gap-2">
                                {deployment.bySubject.slice(0, 6).map((s, i) => (
                                    <div key={i} className="px-4 py-2 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-800">{s.label}</span>
                                        <span className="bg-white px-1.5 py-0.5 rounded-lg border border-slate-100 text-[9px] font-black text-blue-600">{s.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>

                {/* Additional Demographics */}
                <section className="space-y-4">
                    <div className="flex items-center gap-2 mb-2">
                        <FiBriefcase className="text-slate-400" />
                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">HR Breakdowns</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b block pb-2 mb-4">Funding Source</span>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {demographics.funding.map((f, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-500 truncate mr-2">{f.label || 'N/A'}</span>
                                        <span className="text-slate-800">{f.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                        
                        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b block pb-2 mb-4">Experience Brackets</span>
                            <div className="grid grid-cols-2 gap-x-8 gap-y-2">
                                {demographics.experience.map((e, i) => (
                                    <div key={i} className="flex justify-between items-center text-xs font-bold">
                                        <span className="text-slate-500">{e.label || 'N/A'}</span>
                                        <span className="text-slate-800">{e.value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </section>
            </main>

            {/* Final Action Button */}
            <footer className="fixed bottom-0 left-0 w-full p-6 pb-10 flex justify-center z-50 pointer-events-none">
                <button 
                  onClick={handleFinalSubmit}
                  disabled={isFinalizing}
                  className="w-full max-w-sm py-5 bg-blue-600 text-white font-black rounded-3xl shadow-2xl flex items-center justify-center gap-3 transition-all hover:bg-blue-700 active:scale-95 pointer-events-auto disabled:opacity-50 disabled:grayscale"
                >
                    {isFinalizing ? (
                        <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                        <>Finalize & Submit Unit 6 <FiChevronRight size={20} /></>
                    )}
                </button>
            </footer>
        </div>
    );
};

export default Unit6Summary;
