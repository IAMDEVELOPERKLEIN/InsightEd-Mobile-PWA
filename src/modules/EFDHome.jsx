import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiLayers, FiList, FiTrendingUp, FiMapPin, FiChevronRight, FiAlertCircle, FiChevronDown, FiCheckSquare } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const EFDHome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('granular'); // 'granular' or 'list'
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]); // Array for multiselect
    const [selectedFundingYear, setSelectedFundingYear] = useState('');
    const [selectedDonated, setSelectedDonated] = useState('All'); 
    const [selectedDocStatus, setSelectedDocStatus] = useState('All'); 
    const [fundingYears, setFundingYears] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [efdLocations, setEfdLocations] = useState([]);
    const [isBeffMode, setIsBeffMode] = useState(() => window.location.pathname.toLowerCase().includes('beff'));
    const [chartMetric, setChartMetric] = useState('count'); // 'count' or 'abc'
    const [userRole, setUserRole] = useState(() => {
        let role = user?.role || localStorage.getItem('userRole') || "EFD Engineer";
        if (role === 'hrodi_engineer' || role === 'HRODI Engineer' || role === 'EFD' || role === 'HRODI') return 'EFD Engineer';
        if (role === 'deped_engineer' || role === 'DepEd Engineer') return 'Division Engineer';
        return role;
    });
 
    useEffect(() => {
        const syncUser = () => {
            const currentRole = user?.account_category || user?.role || localStorage.getItem('userRole');
            if (currentRole) {
                let normalized = currentRole;
                if (normalized === 'hrodi_engineer' || normalized === 'HRODI Engineer' || normalized === 'EFD' || normalized === 'HRODI') normalized = 'EFD Engineer';
                if (normalized === 'deped_engineer' || normalized === 'DepEd Engineer') normalized = 'Division Engineer';
                setUserRole(normalized);
            }
            if (user) {
                setUserData(user);
            }
        };
        syncUser();
    }, [user, user?.uid]);

    const handleClearFilters = () => {
        setSelectedRegion('');
        setSelectedDivision('');
        setSelectedCategories([]);
        setSelectedFundingYear('');
        setSelectedDonated('All');
        setSelectedDocStatus('All');
        setSearchTerm('');
    };

    const categories = [
        "New Construction",
        "Repair and Rehab",
        "Last Mile Schools",
        "Health facilities",
        "Gabaldon Restoration",
        "Library Hub",
        "SpEd Inclusive Learning Resource Centers (ILRC)",
        "Alternative Learning System - Community Based Learning Centers (ALS-CLC)",
        "Midrise School Building"
    ];

    const categoryColors = {
        "New Construction": "#3b82f6",
        "Repair and Rehab": "#10b981",
        "Last Mile Schools": "#f59e0b",
        "Health facilities": "#ec4899",
        "Gabaldon Restoration": "#8b5cf6",
        "Library Hub": "#06b6d4",
        "SpEd Inclusive Learning Resource Centers (ILRC)": "#6366f1",
        "Alternative Learning System - Community Based Learning Centers (ALS-CLC)": "#f43f5e",
        "Midrise School Building": "#fbbf24",
        "Uncategorized": "#94a3b8"
    };

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (!user) {
                    setLoading(false);
                    return;
                }
                setUserData(user);
                if (user.region) setSelectedRegion(user.region);
                if (user.division) setSelectedDivision(user.division);

                // Concurrent fetch for project and reference data
                const [pRes, fyRes, locRes] = await Promise.all([
                    fetch('/api/projects'),
                    fetch('/api/reference/funding-years'),
                    fetch('/api/reference/efd-locations')
                ]);

                const [pData, fyData, locData] = await Promise.all([
                    pRes.ok ? pRes.json() : [],
                    fyRes.ok ? fyRes.json() : [],
                    locRes.ok ? locRes.json() : []
                ]);

                setProjects(pData);
                setFundingYears(fyData);
                setEfdLocations(locData);

            } catch (error) {
                console.error("Error fetching EFD data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const normalize = (val) => val?.toString().trim().toUpperCase() || 'UNASSIGNED';

    const regionalData = useMemo(() => {
        const stats = {};
        const baseProjects = projects.filter(p => {
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.projectCategory);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch;
        });

        baseProjects.forEach(p => {
            const reg = normalize(p.region);
            const cat = p.projectCategory || 'Uncategorized';
            if (!stats[reg]) stats[reg] = { name: reg, totalValue: 0 };
            
            const field = chartMetric === 'count' ? cat : `${cat}_abc`;
            const val = chartMetric === 'count' ? 1 : (parseFloat(p.projectAllocation) || 0);
            
            stats[reg][cat] = (stats[reg][cat] || 0) + val;
            stats[reg].totalValue += val;
        });

        return Object.values(stats).sort((a, b) => b.totalValue - a.totalValue);
    }, [projects, selectedCategories, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus, chartMetric]);

    const allRegions = useMemo(() => {
        const regions = new Set();
        efdLocations.forEach(loc => {
            if (loc.region) regions.add(loc.region.trim().toUpperCase());
        });
        return Array.from(regions).sort();
    }, [efdLocations]);

    const allDivisions = useMemo(() => {
        if (!selectedRegion) return [];
        const divisions = new Set();
        efdLocations
            .filter(loc => loc.region?.trim().toUpperCase() === selectedRegion.toUpperCase())
            .forEach(loc => {
                if (loc.division) divisions.add(loc.division.trim().toUpperCase());
            });
        return Array.from(divisions).sort();
    }, [efdLocations, selectedRegion]);

    const divisionData = useMemo(() => {
        const stats = {};
        const baseProjects = projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.projectCategory);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch;
        });

        baseProjects.forEach(p => {
            const div = normalize(p.division);
            const cat = p.projectCategory || 'Uncategorized';
            if (!stats[div]) stats[div] = { name: div, totalValue: 0 };
            
            const field = chartMetric === 'count' ? cat : `${cat}_abc`;
            const val = chartMetric === 'count' ? 1 : (parseFloat(p.projectAllocation) || 0);

            stats[div][cat] = (stats[div][cat] || 0) + val;
            stats[div].totalValue += val;
        });

        return Object.values(stats).sort((a, b) => b.totalValue - a.totalValue);
    }, [projects, selectedRegion, selectedCategories, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus, chartMetric]);

    const categoryData = useMemo(() => {
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesDivision && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch;
        });

        baseProjects.forEach(p => {
            const cat = p.projectCategory || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedRegion, selectedDivision, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus]);

    const yearData = useMemo(() => {
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.projectCategory);
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesDivision && matchesCategory && matchesDonated && matchesDocStatus && matchesSearch;
        });

        baseProjects.forEach(p => {
            const year = p.fundingYear?.toString() || 'N/A';
            counts[year] = (counts[year] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name: `FY ${name}`, value }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [projects, selectedRegion, selectedDivision, selectedCategories, searchTerm, selectedDonated, selectedDocStatus]);



    const newlyCreatedCount = useMemo(() => {
        return projects.length;
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(p.projectCategory);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesBeff = !isBeffMode || (!!p.implementingAgency || !!p.implementing_agency);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolId?.toString().includes(searchTerm);
            return matchesRegion && matchesDivision && matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && matchesBeff && matchesSearch;
        });
    }, [projects, selectedRegion, selectedDivision, selectedCategories, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus, isBeffMode]);

    const totalABC = useMemo(() => {
        return filteredProjects.reduce((sum, p) => sum + (parseFloat(p.projectAllocation) || 0), 0);
    }, [filteredProjects]);

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
                <div className="bg-[#004A99] text-white pt-8 pb-10 px-6 rounded-b-[3rem] shadow-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight leading-none">EFD Engineer Dashboard</h1>
                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                                    {userData?.region || 'Central Office'} • Infrastructure Monitoring
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                                <FiTrendingUp size={20} className="text-blue-200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 sm:col-span-1">
                                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1.5 opacity-80">Total Projects</p>
                                <h2 className="text-2xl lg:text-3xl font-black">{projects.length.toLocaleString()}</h2>
                            </div>
                            <div className="bg-blue-400/20 backdrop-blur-sm p-4 rounded-2xl border border-white/10 sm:col-span-1">
                                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1.5 opacity-80">Filtered Results</p>
                                <h2 className="text-2xl lg:text-3xl font-black">{filteredProjects.length.toLocaleString()}</h2>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/10 sm:col-span-2">
                                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1.5 opacity-80">Total ABC Allocation</p>
                                <h2 className="text-2xl lg:text-3xl font-black">₱{(totalABC / 1000000).toFixed(2)}M</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 mb-8 space-y-4">
                    <div className="bg-slate-200/50 p-1.5 rounded-2xl flex border border-slate-200 gap-1.5">
                        <button
                            onClick={() => setActiveTab('granular')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'granular' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FiLayers size={14} /> Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'list' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FiList size={14} /> Details
                        </button>
                    </div>


                    {activeTab === 'list' && (
                        <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4 max-w-7xl mx-auto w-full">
                            <div className="flex items-center justify-between mb-1 px-1">
                                <div className="flex items-center gap-2">
                                    <FiSearch className="text-blue-500" />
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Search Projects</span>
                                </div>
                                {(searchTerm || selectedRegion || selectedDivision || selectedFundingYear || selectedDocStatus !== 'All') && (
                                    <button
                                        onClick={handleClearFilters}
                                        className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full transition-all active:scale-95"
                                    >
                                        Clear Search/Filters
                                    </button>
                                )}
                            </div>
                            <div className="relative animate-in slide-in-from-top-2 duration-300">
                                <input
                                    type="text"
                                    placeholder="Search Project, School, or ID..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full bg-blue-50 border-none rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-blue-300 transition-all"
                                />
                                <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                            </div>
                            
                            {/* Nested filters only in list view */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                <div className="relative">
                                    <select
                                        value={selectedRegion}
                                        onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDivision(''); }}
                                        className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-[9px] font-bold text-slate-600 focus:ring-1 focus:ring-blue-500/20 outline-none appearance-none transition-all"
                                    >
                                        <option value="">All Regions</option>
                                        {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
                                    </select>
                                    <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                                </div>
                                <div className="relative">
                                    <select
                                        value={selectedDivision}
                                        onChange={(e) => setSelectedDivision(e.target.value)}
                                        disabled={!selectedRegion}
                                        className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-[9px] font-bold text-slate-600 focus:ring-1 focus:ring-blue-500/20 outline-none appearance-none transition-all disabled:opacity-40"
                                    >
                                        <option value="">All Divisions</option>
                                        {allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                                    </select>
                                    <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                                </div>
                                <div className="relative">
                                    <select
                                        value={selectedFundingYear}
                                        onChange={(e) => setSelectedFundingYear(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-[9px] font-bold text-slate-600 focus:ring-1 focus:ring-blue-500/20 outline-none appearance-none transition-all"
                                    >
                                        <option value="">All Years</option>
                                        {fundingYears.map(year => (
                                            <option key={year} value={year}>{year}</option>
                                        ))}
                                    </select>
                                    <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                                </div>
                                <div className="relative">
                                    <select
                                        value={selectedDocStatus}
                                        onChange={(e) => setSelectedDocStatus(e.target.value)}
                                        className="w-full bg-slate-50 border-none rounded-lg px-3 py-2 text-[9px] font-bold text-slate-600 focus:ring-1 focus:ring-blue-500/20 outline-none appearance-none transition-all"
                                    >
                                        <option value="All">All Docs</option>
                                        <option value="Complete">Complete</option>
                                        <option value="Missing RTA">Missing RTA</option>
                                        <option value="Missing MOA">Missing MOA</option>
                                        <option value="Missing Both">Missing Both</option>
                                    </select>
                                    <FiChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                                </div>
                            </div>
                        </div>
                    )}
            </div>

            <div className="px-5">
                    {activeTab === 'granular' ? (
                        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
                            {/* Category Menu & Drilldown Layout */}
                            <div className="flex flex-col lg:flex-row gap-6 max-w-7xl mx-auto w-full px-0">
                                {/* Vertical Category Select (Top-Left or Sidebar Style) */}
                                <div className="w-full lg:w-72 shrink-0 space-y-4">
                                    <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
                                        <div className="px-5 py-4 bg-[#004A99] text-white flex items-center justify-between">
                                            <h3 className="font-black text-[11px] uppercase tracking-[0.1em]">All Categories</h3>
                                            <div className="w-1.5 h-1.5 bg-blue-300 rounded-full"></div>
                                        </div>
                                        <div className="bg-white max-h-[400px] overflow-y-auto">
                                            {categories.map(cat => {
                                                const isSelected = selectedCategories.includes(cat);
                                                return (
                                                    <button 
                                                        key={cat}
                                                        onClick={() => {
                                                            setSelectedCategories(prev => 
                                                                prev.includes(cat) 
                                                                ? prev.filter(c => c !== cat) 
                                                                : [...prev, cat]
                                                            );
                                                        }}
                                                        className={`w-full text-left px-5 py-3 text-[9px] font-black uppercase tracking-wider transition-all border-b border-slate-50 hover:bg-slate-50 flex items-center justify-between group ${
                                                            isSelected ? 'text-blue-600 bg-blue-50/50' : 'text-slate-500'
                                                        }`}
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className={`w-3.5 h-3.5 rounded border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'border-slate-300 group-hover:border-blue-300'}`}>
                                                                {isSelected && <div className="w-1.5 h-1.5 bg-white rounded-sm"></div>}
                                                            </div>
                                                            <span>{cat}</span>
                                                        </div>
                                                        <div 
                                                            className="w-2.5 h-2.5 rounded-full" 
                                                            style={{ backgroundColor: categoryColors[cat] || '#94a3b8' }}
                                                        ></div>
                                                    </button>
                                                );
                                            })}
                                            {selectedCategories.length > 0 && (
                                                <button 
                                                    onClick={() => setSelectedCategories([])}
                                                    className="w-full text-center py-3 text-[8px] font-black text-blue-600 uppercase tracking-[0.2em] bg-slate-50 hover:bg-slate-100 transition-all border-t border-slate-100"
                                                >
                                                    Reset Categories
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Pie Chart (Mini version) */}
                                    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 h-[280px] flex flex-col hidden lg:flex">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full"></span>
                                            Category Split
                                        </h3>
                                        <div className="flex-1 w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <PieChart>
                                                    <Pie
                                                        data={categoryData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={40}
                                                        outerRadius={60}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        label={({ name, value }) => `${name}: ${value}`}
                                                    >
                                                        {categoryData.map((entry, index) => (
                                                            <Cell key={`cell-${index}`} fill={categoryColors[entry.name] || '#94a3b8'} />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                                                        formatter={(value, name) => [`${value} Projects`, name]}
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Area: Consolidated Drilldown Chart */}
                                <div className="flex-1 space-y-6">
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                                            <div>
                                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                                    <FiMapPin className="text-blue-600" />
                                                    {selectedRegion ? `Division Analysis for ${selectedRegion}` : 'Regional Analysis'}
                                                </h3>
                                                <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                                                    {selectedRegion ? 'Viewing breakdown per division' : 'Global overview by region'}
                                                </p>
                                            </div>
                                            
                                            {/* Integrated Metric Toggles (Tabs Style inside chart) */}
                                            <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto self-end">
                                                <button
                                                    onClick={() => setChartMetric('count')}
                                                    className={`flex-1 sm:px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMetric === 'count' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    Project Count
                                                </button>
                                                <button
                                                    onClick={() => setChartMetric('abc')}
                                                    className={`flex-1 sm:px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMetric === 'abc' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                >
                                                    ABC Allocation
                                                </button>
                                            </div>
                                        </div>

                                        {selectedRegion && (
                                            <button 
                                                onClick={() => {setSelectedRegion(''); setSelectedDivision('');}}
                                                className="mb-6 self-start flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2.5 rounded-2xl hover:bg-blue-100 transition-all group active:scale-95"
                                            >
                                                <FiChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                                                <span>Back to Regions</span>
                                            </button>
                                        )}

                                        <div className="h-[450px] w-full animate-in fade-in slide-in-from-right-4 duration-500" key={selectedRegion + chartMetric}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart
                                                    data={selectedRegion ? divisionData.slice(0, 50) : regionalData.slice(0, 30)}
                                                    layout="vertical"
                                                    margin={{ right: 90, left: 10, top: 10, bottom: 10 }}
                                                    onClick={(data) => {
                                                        if (data && data.activeLabel) {
                                                            if (!selectedRegion) {
                                                                setSelectedRegion(data.activeLabel);
                                                                setSelectedDivision('');
                                                            } else {
                                                                setSelectedDivision(data.activeLabel);
                                                                setActiveTab('list');
                                                            }
                                                        }
                                                    }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                    <XAxis type="number" hide />
                                                    <YAxis
                                                        dataKey="name"
                                                        type="category"
                                                        tick={{ fontSize: 9, fontWeight: 800, fill: '#64748b' }}
                                                        width={selectedRegion ? 120 : 80}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <Tooltip
                                                        cursor={{ fill: '#f8fafc' }}
                                                        formatter={(val, name) => {
                                                            const formattedVal = chartMetric === 'abc' ? `₱${(val / 1000000).toFixed(2)}M` : `${val} Projects`;
                                                            return [formattedVal, name];
                                                        }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                                    />
                                                    {/* Stacked Bars per Category */}
                                                    {(selectedCategories.length > 0 ? selectedCategories : categories).map((cat) => (
                                                        <Bar 
                                                            key={cat}
                                                            dataKey={cat} 
                                                            stackId="a" 
                                                            fill={categoryColors[cat] || '#94a3b8'} 
                                                            barSize={24}
                                                            className="hover:opacity-80 transition-opacity cursor-pointer"
                                                        />
                                                    ))}
                                                    {/* Total Value Label at the end of the stack */}
                                                    <Bar dataKey="totalValue" stackId="a" hide>
                                                        <LabelList 
                                                            dataKey="totalValue" 
                                                            position="right" 
                                                            offset={10}
                                                            formatter={(val) => chartMetric === 'abc' ? `₱${(val / 1000000).toFixed(1)}M` : val}
                                                            style={{ fontSize: '10px', fontWeight: 'black', fill: '#475569' }} 
                                                        />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                        <p className="text-[10px] text-center text-slate-400 mt-4 font-black uppercase tracking-widest opacity-60">
                                            {selectedRegion ? 'Click a division for specific details' : 'Click a region bar to drill down'}
                                        </p>
                                    </div>

                                    {/* Funding Year Histogram (Now alongside the main chart for better space usage) */}
                                    <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                                            Projects Timeline (Funding Year)
                                        </h3>
                                        <div className="h-[200px] w-full">
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart 
                                                    data={yearData}
                                                    margin={{ top: 30, right: 30, left: 20, bottom: 5 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis 
                                                        dataKey="name" 
                                                        tick={{ fontSize: 10, fontWeight: 800, fill: '#64748b' }}
                                                        axisLine={false}
                                                        tickLine={false}
                                                    />
                                                    <YAxis hide domain={[0, computation => (computation * 1.2)]} />
                                                    <Tooltip 
                                                        cursor={{ fill: '#f8fafc' }}
                                                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    />
                                                    <Bar dataKey="value" fill="#f97316" radius={[6, 6, 0, 0]} barSize={40}>
                                                        <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fontWeight: 'black', fill: '#64748b' }} />
                                                    </Bar>
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Centered Navigation Button */}
                            <div className="max-w-7xl mx-auto w-full mt-6">
                                <button
                                    onClick={() => setActiveTab('list')}
                                    className="w-full bg-white shadow-sm border border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-600 py-5 rounded-[2rem] text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] active:scale-[0.98]"
                                >
                                    Browse Detailed Project Records <FiChevronRight />
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-7xl mx-auto w-full">
                            {filteredProjects.length === 0 ? (
                                <div className="col-span-full text-center py-20 bg-white rounded-3xl border border-dashed border-slate-200">
                                    <FiAlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No projects found</p>
                                </div>
                            ) : (
                                filteredProjects.map((p) => (
                                    <div
                                        key={p.id}
                                        onClick={() => navigate(`/project-details/${p.id}`)}
                                        className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 active:scale-[0.98] transition-all hover:border-blue-200 hover:shadow-md cursor-pointer h-full"
                                    >
                                        <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600 font-black text-xs shrink-0">
                                            {p.id}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-bold text-slate-800 truncate">{p.projectName}</h4>
                                            <p className="text-[10px] text-slate-500 font-medium truncate">{p.schoolName} ({p.schoolId})</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${p.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                    p.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                    }`}>
                                                    {p.status}
                                                </span>
                                                <span className="text-[8px] font-bold text-slate-400">{p.division}</span>
                                                {p.engineerName && (
                                                    <>
                                                        <div className="w-1 h-1 bg-slate-200 rounded-full"></div>
                                                        <span className="text-[8px] font-black text-blue-500 uppercase tracking-tight">Engr. {p.engineerName}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="text-right shrink-0">
                                            <div className="mb-2">
                                                {!p.hasMoa && !p.hasRta ? (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-red-100 text-red-600 border border-red-200">Missing MOA/RTA</span>
                                                ) : p.hasMoa && p.hasRta ? (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-200">Docs Complete</span>
                                                ) : !p.hasMoa ? (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">Missing MOA</span>
                                                ) : (
                                                    <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">Missing RTA</span>
                                                )}
                                            </div>
                                            <p className="text-xs font-black text-slate-800">{p.accomplishmentPercentage}%</p>
                                            <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden ml-auto">
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

                <BottomNav userRole={userRole} />
            </div>
        </PageTransition>
    );
};

export default EFDHome;
