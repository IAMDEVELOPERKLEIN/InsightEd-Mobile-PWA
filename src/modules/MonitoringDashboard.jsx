import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FiSearch,
  FiArrowRight,
  FiArrowLeft,
  FiZap,
  FiChevronRight,
  FiActivity,
  FiMapPin,
  FiLayers,
  FiGrid,
  FiCheckCircle,
  FiClock,
  FiAlertCircle,
  FiFileText,
  FiRefreshCw
} from 'react-icons/fi';
import { TbSchool } from 'react-icons/tb';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';

// --- Helper: progress color ---
const progressColor = (pct) => {
  if (pct >= 80) return 'bg-emerald-500';
  if (pct >= 50) return 'bg-amber-400';
  if (pct >= 20) return 'bg-blue-500';
  return 'bg-rose-400';
};

const progressTextColor = (pct) => {
  if (pct >= 80) return 'text-emerald-600 dark:text-emerald-400';
  if (pct >= 50) return 'text-amber-600 dark:text-amber-400';
  if (pct >= 20) return 'text-blue-600 dark:text-blue-400';
  return 'text-rose-500 dark:text-rose-400';
};

// --- Stat mini badge ---
const StatBadge = ({ label, value, color = 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300' }) => (
  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${color}`}>
    {value} <span className="font-medium normal-case opacity-70">{label}</span>
  </span>
);

// --- Progress Bar ---
const ProgressBar = ({ pct, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, pct)}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${progressColor(pct)}`}
      />
    </div>
    <span className={`text-xs font-black w-10 text-right ${progressTextColor(pct)}`}>{Math.round(pct)}%</span>
  </div>
);

// --- Card slide animation variants ---
const slideVariants = {
  enter: (dir) => ({ x: dir > 0 ? '60%' : '-60%', opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (dir) => ({ x: dir > 0 ? '-60%' : '60%', opacity: 0 }),
};

// --- Stat Card Component ---
const TopStatCard = ({ title, value, icon: Icon, color, subtext, secondaryValue }) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-slate-900 p-4 sm:p-6 rounded-[1.5rem] sm:rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between"
    >
        <div className="flex justify-between items-start mb-4 sm:mb-6">
            <div className={`p-2 sm:p-4 rounded-xl sm:rounded-2xl ${color} bg-opacity-10 dark:bg-opacity-20 text-current`}>
                <Icon size={20} className={`${color.replace('bg-', 'text-')} sm:w-[28px] sm:h-[28px]`} />
            </div>
            {subtext && <span className="text-[8px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-md">{subtext}</span>}
        </div>
        <div>
            <div className="flex items-baseline gap-1">
                <h3 className="text-xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">{value}</h3>
                {secondaryValue && <span className="text-xs sm:text-lg font-bold text-slate-400 dark:text-slate-600">/ {secondaryValue}</span>}
            </div>
            <p className="text-[9px] sm:text-xs font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">{title}</p>
        </div>
    </motion.div>
);

// =================== MAIN COMPONENT ===================
const MonitoringDashboard = () => {
  const { user } = useAuth();

  // --- User context ---
  const userRole = user?.role || localStorage.getItem('userRole') || '';
  const userRegion = user?.region || localStorage.getItem('userRegion') || '';
  const userDivision = user?.division || localStorage.getItem('userDivision') || '';

  // --- Data state ---
  const [schools, setSchools] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalResults, setTotalResults] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  // --- Filtering & Sorting state ---
  const [sortBy, setSortBy] = useState('completion'); // 'completion', 'name', 'school_id'
  const [completionFilter, setCompletionFilter] = useState('all'); // 'all', '100', 'incomplete', 'not_started'

  // --- Drill-down navigation state ---
  // level: 'division' | 'district' | 'schools'
  const [level, setLevel] = useState('division');
  const [selectedDivision, setSelectedDivision] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [navDir, setNavDir] = useState(1); // 1 = drilling down, -1 = going back

  // Fetch ALL schools once (with RBAC filter) — we group on the client
  const fetchAllSchools = async () => {
    setLoading(true);
    setRefreshing(true);
    try {
      const params = new URLSearchParams({ limit: 5000 });

      if (userRole === 'Regional Office' && userRegion) {
        params.append('region', userRegion);
      } else if (userRole === 'School Division Office') {
        if (userRegion) params.append('region', userRegion);
        if (userDivision) params.append('division', userDivision);
      }

      const res = await fetch(`/api/monitoring/schools?${params.toString()}`);
      if (res.ok) {
        const result = await res.json();
        setSchools(result.data || []);
        setTotalResults(result.total || 0);
      }
    } catch (e) {
      console.error('Failed to fetch schools:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAllSchools();
  }, [userRole, userRegion, userDivision]);

  // --- Aggregated Stats for Cards ---
  const stats = useMemo(() => {
    let filteredSchools = schools;
    if (level === 'district' && selectedDivision) {
      filteredSchools = schools.filter(s => (s.division || 'Unknown Division') === selectedDivision);
    } else if (level === 'schools' && selectedDistrict) {
      filteredSchools = schools.filter(s => (s.division || 'Unknown Division') === selectedDivision && (s.district || 'Unknown District') === selectedDistrict);
    }

    const total = filteredSchools.length;
    const registered = filteredSchools.filter(s => s.is_registered).length;
    const completed = filteredSchools.filter(s => parseFloat(s.completion_percentage) >= 100).length;
    const inProgress = filteredSchools.filter(s => {
      const p = parseFloat(s.completion_percentage);
      return p > 0 && p < 100;
    }).length;
    const avgProgress = registered > 0 
      ? filteredSchools.reduce((sum, s) => sum + parseFloat(s.completion_percentage || 0), 0) / registered 
      : 0;
    
    const esf7Submissions = filteredSchools.filter(s => s.esf7_status === 'VERIFIED' || s.esf7_status === 'PENDING_SDO').length;

    return { total, registered, completed, inProgress, avgProgress, esf7Submissions };
  }, [schools, level, selectedDivision, selectedDistrict]);

  // --- Grouping logic ---
  const groupedByDivision = useMemo(() => {
    return schools.reduce((acc, s) => {
      const div = s.division || 'Unknown Division';
      if (!acc[div]) acc[div] = [];
      acc[div].push(s);
      return acc;
    }, {});
  }, [schools]);

  const divisionList = useMemo(() => {
    return Object.entries(groupedByDivision).map(([name, list]) => {
      const avgPct = list.reduce((sum, s) => sum + parseFloat(s.completion_percentage || 0), 0) / (list.length || 1);
      const completed = list.filter(s => parseFloat(s.completion_percentage) >= 100).length;
      return { name, count: list.length, avgPct, completed, schools: list };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [groupedByDivision]);

  const leadingDivision = useMemo(() => {
    if (divisionList.length === 0) return null;
    return [...divisionList].sort((a, b) => b.avgPct - a.avgPct)[0];
  }, [divisionList]);

  const districtList = useMemo(() => {
    if (!selectedDivision) return [];
    const divSchools = groupedByDivision[selectedDivision] || [];
    const byDistrict = divSchools.reduce((acc, s) => {
      const dist = s.district || 'Unknown District';
      if (!acc[dist]) acc[dist] = [];
      acc[dist].push(s);
      return acc;
    }, {});
    return Object.entries(byDistrict).map(([name, list]) => {
      const avgPct = list.reduce((sum, s) => sum + parseFloat(s.completion_percentage || 0), 0) / (list.length || 1);
      const completed = list.filter(s => parseFloat(s.completion_percentage) >= 100).length;
      return { name, count: list.length, avgPct, completed, schools: list };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [selectedDivision, groupedByDivision]);

  const leadingDistrict = useMemo(() => {
    if (districtList.length === 0) return null;
    return [...districtList].sort((a, b) => b.avgPct - a.avgPct)[0];
  }, [districtList]);

  const schoolList = useMemo(() => {
    if (!selectedDistrict || !selectedDivision) return [];
    const divSchools = groupedByDivision[selectedDivision] || [];
    let list = divSchools.filter(s => (s.district || 'Unknown District') === selectedDistrict);
    
    // 1. Text Search Filter
    if (searchTerm) {
      const q = searchTerm.toLowerCase();
      list = list.filter(s => 
        s.school_name?.toLowerCase().includes(q) || 
        s.school_id?.toLowerCase().includes(q)
      );
    }

    // 2. Completion Status Filter
    if (completionFilter !== 'all') {
      list = list.filter(s => {
        const pct = parseFloat(s.completion_percentage || 0);
        if (completionFilter === '100') return pct >= 100;
        if (completionFilter === 'incomplete') return pct > 0 && pct < 100;
        if (completionFilter === 'not_started') return pct <= 0;
        return true;
      });
    }

    // 3. Sorting Logic
    return [...list].sort((a, b) => {
      const pctA = parseFloat(a.completion_percentage || 0);
      const pctB = parseFloat(b.completion_percentage || 0);

      // ALWAYS Prioritize 100% if sortBy is 'completion' or by default
      if (sortBy === 'completion') {
        if (pctA >= 100 && pctB < 100) return -1;
        if (pctA < 100 && pctB >= 100) return 1;
        return pctB - pctA; // Then sort by highest pct
      }

      if (sortBy === 'name') {
        // Even when sorting by name, keep 100% schools at top if desired (or just true A-Z)
        // Let's do true A-Z/ID but keep the 100% at very top if they are the primary focus
        // Actually, user said "make 100% schools on top" + "also add filters".
        // I'll make 100% always at top regardless of sort choice for maximum visibility.
        if (pctA >= 100 && pctB < 100) return -1;
        if (pctA < 100 && pctB >= 100) return 1;
        return (a.school_name || '').localeCompare(b.school_name || '');
      }

      if (sortBy === 'school_id') {
        if (pctA >= 100 && pctB < 100) return -1;
        if (pctA < 100 && pctB >= 100) return 1;
        return (a.school_id || '').localeCompare(b.school_id || '');
      }

      return 0;
    });
  }, [selectedDistrict, selectedDivision, groupedByDivision, searchTerm, sortBy, completionFilter]);

  // --- Navigation helpers ---
  const drillToDivision = (name) => {
    setNavDir(1);
    setSelectedDivision(name);
    setLevel('district');
    setSearchTerm('');
  };

  const drillToDistrict = (name) => {
    setNavDir(1);
    setSelectedDistrict(name);
    setLevel('schools');
    setSearchTerm('');
  };

  const goBack = () => {
    setNavDir(-1);
    if (level === 'schools') {
      setLevel('district');
      setSelectedDistrict(null);
    } else if (level === 'district') {
      setLevel('division');
      setSelectedDivision(null);
    }
    setSearchTerm('');
  };

  // --- Scope text for header ---
  let scopeText = 'All Regions';
  if (userRole === 'Regional Office' && userRegion) scopeText = userRegion;
  else if (userRole === 'School Division Office' && userDivision) scopeText = `${userDivision}`;

  // --- Breadcrumb ---
  const breadcrumbs = [
    { label: scopeText, onClick: level !== 'division' ? () => { setNavDir(-1); setLevel('division'); setSelectedDivision(null); setSelectedDistrict(null); } : null },
    ...(selectedDivision ? [{ label: selectedDivision, onClick: level === 'schools' ? () => { setNavDir(-1); setLevel('district'); setSelectedDistrict(null); } : null }] : []),
    ...(selectedDistrict ? [{ label: selectedDistrict, onClick: null }] : []),
  ];

  return (
    <PageTransition>
      <div className="min-h-screen bg-[#F1F5F9] dark:bg-[#020617] pb-28">

        {/* ===== TOP HEADER ===== */}
        <div className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-100 dark:border-slate-800 px-6 py-4 md:px-8">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              {level !== 'division' && (
                <motion.button
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  onClick={goBack}
                  className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-90 flex-shrink-0"
                >
                  <FiArrowLeft size={18} />
                </motion.button>
              )}
              <div>
                <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  Monitoring <span className="text-blue-600 dark:text-blue-400">Dashboard</span>
                </h1>
                {/* Breadcrumb */}
                <div className="flex items-center gap-1 mt-1 flex-wrap">
                  {breadcrumbs.map((crumb, i) => (
                    <React.Fragment key={i}>
                      {i > 0 && <FiChevronRight size={10} className="text-slate-300 dark:text-slate-600 flex-shrink-0" />}
                      <button
                        onClick={crumb.onClick || undefined}
                        disabled={!crumb.onClick}
                        className={`text-[11px] font-bold transition-colors leading-none ${crumb.onClick ? 'text-blue-500 hover:text-blue-700 cursor-pointer' : 'text-slate-500 dark:text-slate-400 cursor-default'}`}
                      >
                        {crumb.label}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 ml-auto">
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={fetchAllSchools}
                disabled={refreshing}
                className={`p-2.5 rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm flex items-center justify-center ${refreshing ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
              >
                <FiRefreshCw size={18} className={refreshing ? 'animate-spin' : ''} />
              </motion.button>
              <div className="hidden sm:flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-4 py-2 rounded-2xl border border-slate-100 dark:border-slate-700">
                <FiZap size={14} className="text-blue-500" />
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{totalResults.toLocaleString()} Schools</span>
              </div>
            </div>
          </div>

          {/* Search & Filters — only visible at schools level */}
          <AnimatePresence>
            {level === 'schools' && (
              <motion.div
                initial={{ height: 0, opacity: 0 }} 
                animate={{ height: 'auto', opacity: 1 }} 
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="flex flex-col gap-3 py-3 mt-1">
                  {/* Search Bar */}
                  <div className="relative group">
                    <FiSearch size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                    <input
                      type="text"
                      placeholder="Find school name or ID..."
                      value={searchTerm}
                      onChange={e => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-slate-700 dark:text-slate-200"
                    />
                  </div>

                  {/* Filter Chips Container */}
                  <div className="flex flex-col gap-2.5">
                    {/* Completion Status Filters */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Filter:</span>
                      {[
                        { id: 'all', label: 'All Schools', icon: FiGrid },
                        { id: '100', label: '100% Done', icon: FiCheckCircle },
                        { id: 'incomplete', label: 'In Progress', icon: FiClock },
                        { id: 'not_started', label: 'Zero %', icon: FiAlertCircle }
                      ].map(f => (
                        <button
                          key={f.id}
                          onClick={() => setCompletionFilter(f.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                            completionFilter === f.id 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <f.icon size={12} />
                          {f.label}
                        </button>
                      ))}
                    </div>

                    {/* Sort Options */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-1">Sort:</span>
                      {[
                        { id: 'completion', label: 'Progress', icon: FiActivity },
                        { id: 'name', label: 'Alphabetical', icon: FiLayers },
                        { id: 'school_id', label: 'School ID', icon: FiFileText }
                      ].map(s => (
                        <button
                          key={s.id}
                          onClick={() => setSortBy(s.id)}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap transition-all ${
                            sortBy === s.id 
                            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-md' 
                            : 'bg-white dark:bg-slate-800 text-slate-500 border border-slate-100 dark:border-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <s.icon size={12} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* ===== STAT CARDS ===== */}
        <div className="px-4 sm:px-8 grid grid-cols-2 gap-3 sm:gap-6 mb-10">
            <TopStatCard 
                title="Registration Participation" 
                value={stats.registered.toLocaleString()} 
                secondaryValue={stats.total.toLocaleString()}
                icon={FiCheckCircle} 
                color="bg-blue-600" 
                subtext="Registered Schools"
            />
            <TopStatCard 
                title="Completion Status" 
                value={stats.completed.toLocaleString()} 
                icon={TbSchool} 
                color="bg-emerald-600" 
                subtext="100% Completed"
            />
            <TopStatCard 
                title="ESF7 Submissions" 
                value={stats.esf7Submissions.toLocaleString()} 
                icon={FiFileText} 
                color="bg-indigo-600" 
                subtext="Staged / Verified"
            />
            <TopStatCard 
                title="Leading District" 
                value={leadingDistrict ? leadingDistrict.name : 'N/A'} 
                secondaryValue={leadingDistrict ? `${Math.round(leadingDistrict.avgPct)}%` : ''}
                icon={FiZap} 
                color="bg-amber-500" 
                subtext="Rank 1 Completion"
            />
        </div>

        {/* ===== LEVEL LABEL ===== */}
        <div className="px-6 md:px-8 py-5">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
            {level === 'division' && <><FiLayers size={14} /> Viewing by Division</>}
            {level === 'district' && <><FiMapPin size={14} /> Viewing Districts — {selectedDivision}</>}
            {level === 'schools' && <><TbSchool size={14} /> Schools — {selectedDistrict}</>}
          </div>
        </div>

        {/* ===== LOADING STATE ===== */}
        {loading && (
          <div className="px-6 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-36 bg-white dark:bg-slate-800 rounded-3xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ===== DRILL-DOWN PANELS ===== */}
        {!loading && (
          <AnimatePresence mode="wait" custom={navDir}>
            {/* LEVEL 1: DIVISION CARDS */}
            {level === 'division' && (
              <motion.div
                key="division"
                custom={navDir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {divisionList.length === 0 ? (
                  <p className="col-span-3 text-center text-slate-400 py-20 font-medium">No data found for your jurisdiction.</p>
                ) : divisionList.map((div, i) => (
                  <motion.button
                    key={div.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => drillToDivision(div.name)}
                    className="group text-left bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-blue-500/10 hover:-translate-y-1 transition-all duration-300 active:scale-95"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                        <FiLayers size={20} />
                      </div>
                      <FiChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-blue-500 group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Division</p>
                    <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight mb-3 uppercase">{div.name}</h3>
                    <ProgressBar pct={div.avgPct} className="mb-4" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatBadge label="Schools" value={div.count} color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
                      <StatBadge label="Completed" value={div.completed} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* LEVEL 2: DISTRICT CARDS */}
            {level === 'district' && (
              <motion.div
                key="district"
                custom={navDir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 md:px-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
              >
                {districtList.length === 0 ? (
                  <p className="col-span-3 text-center text-slate-400 py-20 font-medium">No districts found.</p>
                ) : districtList.map((dist, i) => (
                  <motion.button
                    key={dist.name}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => drillToDistrict(dist.name)}
                    className="group text-left bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 active:scale-95"
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="p-2.5 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                        <FiMapPin size={20} />
                      </div>
                      <FiChevronRight size={18} className="text-slate-300 dark:text-slate-600 group-hover:text-indigo-500 group-hover:translate-x-1 transition-all mt-1" />
                    </div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">District</p>
                    <h3 className="font-black text-slate-900 dark:text-white text-base leading-tight mb-3 uppercase">{dist.name}</h3>
                    <ProgressBar pct={dist.avgPct} className="mb-4" />
                    <div className="flex items-center gap-2 flex-wrap">
                      <StatBadge label="Schools" value={dist.count} color="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" />
                      <StatBadge label="Completed" value={dist.completed} color="bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400" />
                    </div>
                  </motion.button>
                ))}
              </motion.div>
            )}

            {/* LEVEL 3: SCHOOLS LIST */}
            {level === 'schools' && (
              <motion.div
                key="schools"
                custom={navDir}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="px-6 md:px-8"
              >
                <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm overflow-hidden">
                  {/* Table header */}
                  <div className="grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px] gap-4 px-6 py-4 bg-slate-50/70 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-700">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">School</span>
                    <span className="hidden md:block text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Progress</span>
                  </div>

                  {schoolList.length === 0 ? (
                    <p className="text-center text-slate-400 py-20 font-medium text-sm">No schools found{searchTerm ? ' matching your search' : ''}.</p>
                  ) : schoolList.map((school, i) => (
                    <motion.div
                      key={school.school_id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="group grid grid-cols-[1fr_auto] md:grid-cols-[1fr_140px] gap-4 items-center px-6 py-5 border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-slate-900 dark:text-white text-sm group-hover:text-blue-600 transition-colors truncate">
                            {school.school_name}
                            <span className="md:hidden ml-1.5 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                              {Math.round(school.completion_percentage || 0)}%
                            </span>
                          </p>
                          {!school.is_registered && (
                            <span className="flex-shrink-0 bg-rose-50 dark:bg-rose-900/20 text-rose-500 text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter border border-rose-100 dark:border-rose-900/30 flex items-center gap-0.5">
                              <FiAlertCircle size={10} /> Unregistered
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                          <FiActivity size={9} />
                          {school.school_id} • {school.district || 'District N/A'}
                          {school.esf7_status && school.esf7_status !== 'NOT_STARTED' && (
                            <span className={`ml-2 px-1.5 py-0.5 rounded text-[8px] font-black tracking-tighter uppercase ${
                              school.esf7_status === 'VERIFIED' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 border border-emerald-100' :
                              school.esf7_status === 'REJECTED' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 border border-rose-100' :
                              'bg-amber-50 dark:bg-amber-900/20 text-amber-600 border border-amber-100'
                            }`}>
                              ESF7: {school.esf7_status.replace('_', ' ')}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="hidden md:block">
                        <ProgressBar pct={parseFloat(school.completion_percentage)} />
                      </div>
                    </motion.div>
                  ))}

                  {/* Footer count */}
                  <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800">
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                      Showing {schoolList.length} school{schoolList.length !== 1 ? 's' : ''} {searchTerm ? `for "${searchTerm}"` : `in ${selectedDistrict}`}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* Standard Project Bottom Navigation */}
        <BottomNav userRole={userRole} />
      </div>
    </PageTransition>
  );
};

export default MonitoringDashboard;
