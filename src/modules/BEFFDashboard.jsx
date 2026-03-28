import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiLayers, FiList, FiTrendingUp, FiMapPin, FiChevronRight, FiAlertCircle, FiChevronDown } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList, PieChart, Pie, Legend } from 'recharts';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const BEFFDashboard = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('granular'); // 'granular' or 'list'
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedAgency, setSelectedAgency] = useState('');
    const [selectedFundingYear, setSelectedFundingYear] = useState('');
    const [selectedDonated, setSelectedDonated] = useState('All'); 
    const [selectedDocStatus, setSelectedDocStatus] = useState('All'); 
    const [fundingYears, setFundingYears] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [efdLocations, setEfdLocations] = useState([]);
    const [userRole, setUserRole] = useState(() => {
        const saved = localStorage.getItem('userRole');
        if (saved === 'hrodi_engineer') return 'HRODI Engineer';
        return saved || '';
    });

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [chartMetric, setChartMetric] = useState('count'); // 'count' or 'abc'

    const handleClearFilters = () => {
        setSelectedRegion('');
        setSelectedDivision('');
        setSelectedAgency('');
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
        "Midrise School Building",
        "QRF",
        "Electrification"
    ];

    const COLORS = ['#8B5CF6', '#EC4899', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#6366F1', '#84CC16', '#06B6D4'];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const uid = localStorage.getItem('uid');
                if (!uid) {
                    setLoading(false);
                    return;
                }

                try {
                    const response = await fetch(`/api/users/${uid}`);
                    if (response.ok) {
                        const data = await response.json();
                        setUserData(data);
                        if (data.region) setSelectedRegion(data.region);
                        if (data.division) setSelectedDivision(data.division);
                    }
                } catch (err) {
                    console.error("Error fetching user data:", err);
                }

                // Concurrent fetch for project and reference data
                // Added beff=true filter to projects endpoint
                const [pRes, fyRes, locRes] = await Promise.all([
                    fetch('/api/projects?beff=true'),
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
                console.error("Error fetching BEFF data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const normalize = (val) => val?.toString().trim().toUpperCase() || 'UNASSIGNED';

    const totalABC = useMemo(() => {
        return projects.reduce((sum, p) => sum + (parseFloat(p.projectAllocation) || 0), 0);
    }, [projects]);

    const regionalData = useMemo(() => {
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesAgency = !selectedAgency || normalize(p.implementingAgency) === normalize(selectedAgency);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesAgency && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch;
        });

        baseProjects.forEach(p => {
            const reg = normalize(p.region);
            if (!counts[reg]) counts[reg] = { count: 0, abc: 0 };
            counts[reg].count += 1;
            counts[reg].abc += (parseFloat(p.projectAllocation) || 0);
        });

        return Object.entries(counts).map(([name, data]) => ({ 
            name, 
            value: chartMetric === 'count' ? data.count : data.abc 
        })).sort((a, b) => b.value - a.value);
    }, [projects, selectedAgency, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus, chartMetric]);

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
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesAgency = !selectedAgency || normalize(p.implementingAgency) === normalize(selectedAgency);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesAgency && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch;
        });

        baseProjects.forEach(p => {
            const div = normalize(p.division);
            if (!counts[div]) counts[div] = { count: 0, abc: 0 };
            counts[div].count += 1;
            counts[div].abc += (parseFloat(p.projectAllocation) || 0);
        });

        return Object.entries(counts).map(([name, data]) => ({ 
            name, 
            value: chartMetric === 'count' ? data.count : data.abc 
        })).sort((a, b) => b.value - a.value);
    }, [projects, selectedRegion, selectedAgency, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus, chartMetric]);

    const agencySummaryData = useMemo(() => {
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesDivision && matchesFundingYear && matchesSearch;
        });

        baseProjects.forEach(p => {
            const agency = p.implementingAgency || 'Unassigned';
            counts[agency] = (counts[agency] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedRegion, selectedDivision, selectedFundingYear, searchTerm]);

    const fundingYearSummaryData = useMemo(() => {
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesAgency = !selectedAgency || normalize(p.implementingAgency) === normalize(selectedAgency);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesDivision && matchesAgency && matchesSearch;
        });

        baseProjects.forEach(p => {
            const year = p.funding_year || p.fundingYear || 'N/A';
            counts[year] = (counts[year] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => a.name.toString().localeCompare(b.name.toString()));
    }, [projects, selectedRegion, selectedDivision, selectedAgency, searchTerm]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesAgency = !selectedAgency || normalize(p.implementingAgency) === normalize(selectedAgency);
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchTerm ||
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolId?.toString().includes(searchTerm);
            return matchesRegion && matchesDivision && matchesAgency && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch;
        });
    }, [projects, selectedRegion, selectedDivision, selectedAgency, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus]);

    // Paginated Projects
    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProjects, currentPage, itemsPerPage]);

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

    useEffect(() => {
        setCurrentPage(1); // Reset to page 1 on filter change
    }, [selectedRegion, selectedDivision, selectedAgency, selectedFundingYear, searchTerm, selectedDonated, selectedDocStatus]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(val);
    };

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
                <div className="bg-[#5B21B6] text-white pt-8 pb-10 px-6 rounded-b-[3rem] shadow-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-purple-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>

                    <div className="relative z-10">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h1 className="text-2xl font-black tracking-tight leading-none">BEFF Dashboard</h1>
                                <p className="text-purple-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                                    {userData?.region || 'Central Office'} • Implementing Agency Tracker
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                                <FiTrendingUp size={20} className="text-purple-200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <div className="bg-white/5 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black text-purple-300 uppercase tracking-widest mb-2 opacity-80">Total BEFF Projects</p>
                                <h2 className="text-2xl lg:text-3xl font-black">{projects.length.toLocaleString()}</h2>
                            </div>
                            <div className="bg-purple-400/20 backdrop-blur-sm p-5 rounded-2xl border border-white/10">
                                <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-2 opacity-80">Total ABC Allocation</p>
                                <h2 className="text-2xl lg:text-3xl font-black">{formatCurrency(totalABC)}</h2>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-5 rounded-2xl border border-white/10 sm:col-span-2 lg:col-span-1">
                                <p className="text-[10px] font-black text-purple-100 uppercase tracking-widest mb-2 opacity-80">Filtered Results</p>
                                <h2 className="text-2xl lg:text-3xl font-black">{filteredProjects.length.toLocaleString()}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="px-5 mb-8 space-y-4">
                    <div className="bg-slate-200/50 p-1.5 rounded-2xl flex border border-slate-200 gap-1.5">
                        <button
                            onClick={() => setActiveTab('granular')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'granular' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FiLayers size={14} /> Analytics
                        </button>
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all duration-300 ${activeTab === 'list' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            <FiList size={14} /> Details
                        </button>
                    </div>

                    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col lg:flex-row items-center gap-4 max-w-7xl mx-auto w-full mb-4">
                        <div className="flex-1 w-full relative">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search project name, school ID, or school name..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-slate-50 border-none rounded-2xl pl-12 pr-4 py-3.5 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-purple-500/20 transition-all placeholder:text-slate-400"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row w-full lg:w-auto gap-3">
                            <button
                                onClick={() => setSelectedFundingYear('2026')}
                                className={`flex-1 lg:flex-none text-[10px] font-black uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all active:scale-95 whitespace-nowrap ${selectedFundingYear === '2026' ? 'bg-purple-600 text-white shadow-lg shadow-purple-200' : 'bg-purple-50 text-purple-600 hover:bg-purple-100'}`}
                            >
                                2026 Projects
                            </button>
                            {(selectedRegion || selectedDivision || selectedAgency || selectedFundingYear || selectedDonated !== 'All' || selectedDocStatus !== 'All') && (
                                <button
                                    onClick={handleClearFilters}
                                    className="flex-1 lg:flex-none text-[10px] font-black text-purple-600 hover:text-purple-700 uppercase tracking-widest bg-purple-50 px-6 py-3.5 rounded-2xl transition-all active:scale-95 whitespace-nowrap"
                                >
                                    Reset All
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-5">
                    {activeTab === 'granular' ? (
                        <div className="space-y-6 animate-in fade-in duration-700">
                            <div className="max-w-7xl mx-auto w-full">
                                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 h-full flex flex-col min-h-[450px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                            <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                                            {selectedRegion ? `Division Distribution: ${selectedRegion}` : 'Regional Distribution'}
                                        </h3>
                                        <div className="flex bg-slate-100 p-1 rounded-xl gap-1">
                                            <button 
                                                onClick={() => setChartMetric('count')}
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${chartMetric === 'count' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                Project Count
                                            </button>
                                            <button 
                                                onClick={() => setChartMetric('abc')}
                                                className={`px-4 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all ${chartMetric === 'abc' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                            >
                                                ABC Allocation
                                            </button>
                                        </div>
                                        {selectedRegion && (
                                            <button 
                                                onClick={() => { setSelectedRegion(''); setSelectedDivision(''); }}
                                                className="text-[10px] font-black text-purple-600 uppercase tracking-widest bg-purple-50 px-4 py-1.5 rounded-full hover:bg-purple-100 transition-all"
                                            >
                                                Back to Regions
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full">
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart
                                                data={(selectedRegion ? divisionData : regionalData).slice(0, 30)}
                                                layout="vertical"
                                                margin={{ right: 60, left: 10, top: 10, bottom: 10 }}
                                                onClick={(data) => {
                                                    if (!selectedRegion && data && data.activeLabel) {
                                                        setSelectedRegion(data.activeLabel);
                                                        setSelectedDivision('');
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis
                                                    dataKey="name"
                                                    type="category"
                                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                                    width={selectedRegion ? 120 : 80}
                                                />
                                                <Tooltip
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                    formatter={(value) => chartMetric === 'abc' ? formatCurrency(value) : value}
                                                />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                    {(selectedRegion ? divisionData : regionalData).slice(0, 30).map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={selectedRegion ? '#818CF8' : '#7c3aed'} />
                                                    ))}
                                                    <LabelList 
                                                        dataKey="value" 
                                                        position="right" 
                                                        style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} 
                                                        formatter={(val) => chartMetric === 'abc' ? `₱${(val/1000000).toFixed(1)}M` : val}
                                                    />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    {!selectedRegion && (
                                        <p className="text-[10px] text-center text-slate-400 mt-4 font-bold italic uppercase tracking-wider">Click a region to drill down into its divisions</p>
                                    )}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-7xl mx-auto w-full">
                                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[400px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                            <span className="w-2 h-2 bg-pink-500 rounded-full"></span>
                                            Implementing Agency Distribution
                                        </h3>
                                        {selectedAgency && (
                                            <button 
                                                onClick={() => setSelectedAgency('')}
                                                className="text-[10px] font-black text-pink-600 uppercase tracking-widest bg-pink-50 px-4 py-1.5 rounded-full hover:bg-pink-100 transition-all"
                                            >
                                                Show All
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full relative">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie
                                                    data={agencySummaryData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={80}
                                                    paddingAngle={5}
                                                    dataKey="value"
                                                    onClick={(data) => setSelectedAgency(data.name)}
                                                    className="cursor-pointer outline-none"
                                                    label={({ name, value }) => `${name}: ${value}`}
                                                    labelLine={false}
                                                >
                                                    {agencySummaryData.map((entry, index) => (
                                                        <Cell 
                                                            key={`cell-${index}`} 
                                                            fill={COLORS[index % COLORS.length]} 
                                                            strokeWidth={selectedAgency === entry.name ? 4 : 0}
                                                            stroke="#fff"
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip 
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Legend 
                                                    verticalAlign="bottom" 
                                                    height={36} 
                                                    wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col h-[400px]">
                                    <div className="flex items-center justify-between mb-6">
                                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2">
                                            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                                            Funding Year Distribution
                                        </h3>
                                        {selectedFundingYear && (
                                            <button 
                                                onClick={() => setSelectedFundingYear('')}
                                                className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-1.5 rounded-full hover:bg-blue-100 transition-all"
                                            >
                                                Show All
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex-1 w-full text-slate-500">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart
                                                data={fundingYearSummaryData}
                                                margin={{ top: 10, right: 10, left: 0, bottom: 20 }}
                                                onClick={(data) => data && data.activeLabel && setSelectedFundingYear(data.activeLabel)}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                <XAxis 
                                                    dataKey="name" 
                                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <YAxis 
                                                    tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                                                    axisLine={false}
                                                    tickLine={false}
                                                />
                                                <Tooltip 
                                                    cursor={{ fill: '#f8fafc' }}
                                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                />
                                                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                                                    {fundingYearSummaryData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={selectedFundingYear === entry.name.toString() ? '#3B82F6' : '#BFDBFE'} />
                                                    ))}
                                                    <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fontWeight: 'black', fill: '#64748b' }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-7xl mx-auto w-full space-y-4">
                            <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-bottom border-slate-100">
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ID</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Name</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">School</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">ABC Allocation</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Progress</th>
                                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {paginatedProjects.length === 0 ? (
                                                <tr>
                                                    <td colSpan="6" className="px-6 py-20 text-center">
                                                        <FiAlertCircle size={40} className="mx-auto text-slate-200 mb-3" />
                                                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px]">No BEFF projects found</p>
                                                    </td>
                                                </tr>
                                            ) : (
                                                paginatedProjects.map((p) => (
                                                    <tr 
                                                        key={p.id} 
                                                        onClick={() => navigate(`/project-details/${p.id}`)}
                                                        className="hover:bg-purple-50/30 transition-colors cursor-pointer"
                                                    >
                                                        <td className="px-6 py-4 text-[11px] font-bold text-purple-600">#{p.id}</td>
                                                        <td className="px-6 py-4 min-w-[200px]">
                                                            <div className="text-[11px] font-black text-slate-800 uppercase tracking-tight line-clamp-1">{p.projectName}</div>
                                                            <div className="text-[9px] text-slate-500 font-bold">{p.division}</div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="text-[11px] font-bold text-slate-700">{p.schoolName}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[11px] font-black text-slate-800">
                                                            {formatCurrency(p.projectAllocation || 0)}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex flex-col items-center gap-1.5">
                                                                <span className="text-[10px] font-black text-slate-800">{p.accomplishmentPercentage}%</span>
                                                                <div className="w-16 bg-slate-100 h-1 rounded-full overflow-hidden">
                                                                    <div className="h-full bg-purple-500" style={{ width: `${p.accomplishmentPercentage}%` }}></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                                                                p.status === 'Completed' ? 'bg-emerald-100 text-emerald-700' :
                                                                p.status === 'Ongoing' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="bg-white p-4 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between">
                                    <div className="hidden sm:block text-[10px] font-black text-slate-400 uppercase tracking-widest px-4">
                                        Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length}
                                    </div>
                                    <div className="flex items-center gap-2 mx-auto sm:mx-0 pr-4">
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(1)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-purple-50 rounded-xl transition-all"
                                        >
                                            First
                                        </button>
                                        <button 
                                            disabled={currentPage === 1}
                                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-purple-50 rounded-xl transition-all"
                                        >
                                            Prev
                                        </button>
                                        <div className="w-20 text-center text-[11px] font-black text-slate-700 uppercase tracking-tighter">
                                            Page {currentPage} / {totalPages}
                                        </div>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-purple-50 rounded-xl transition-all"
                                        >
                                            Next
                                        </button>
                                        <button 
                                            disabled={currentPage === totalPages}
                                            onClick={() => setCurrentPage(totalPages)}
                                            className="px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-purple-600 disabled:opacity-30 disabled:pointer-events-none hover:bg-purple-50 rounded-xl transition-all"
                                        >
                                            Last
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <BottomNav userRole={userRole} />
            </div>
        </PageTransition>
    );
};

export default BEFFDashboard;
