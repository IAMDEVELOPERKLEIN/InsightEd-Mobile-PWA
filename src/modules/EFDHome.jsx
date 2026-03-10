import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiLayers, FiList, FiTrendingUp, FiMapPin, FiChevronRight, FiAlertCircle, FiChevronDown } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList } from 'recharts';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const EFDHome = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('granular'); // 'granular' or 'list'
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedFundingYear, setSelectedFundingYear] = useState('');
    const [selectedDonated, setSelectedDonated] = useState('All'); // 'All', 'Donated', 'Non-Donated'
    const [fundingYears, setFundingYears] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [efdLocations, setEfdLocations] = useState([]);

    const handleClearFilters = () => {
        setSelectedRegion('');
        setSelectedDivision('');
        setSelectedCategory('');
        setSelectedFundingYear('');
        setSelectedDonated('All');
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

    useEffect(() => {
        const fetchData = async () => {
            try {
                const user = auth.currentUser;
                if (!user) return;

                const userDoc = await getDoc(doc(db, 'users', user.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserData(data);
                    setSelectedRegion(data.region || '');
                    if (data.division) setSelectedDivision(data.division);
                }

                const response = await fetch('/api/projects');
                if (response.ok) {
                    const data = await response.json();
                    setProjects(data);
                }

                const fyResponse = await fetch('/api/reference/funding-years');
                if (fyResponse.ok) {
                    const fyData = await fyResponse.json();
                    setFundingYears(fyData);
                }

                const locResponse = await fetch('/api/reference/efd-locations');
                if (locResponse.ok) {
                    const locData = await locResponse.json();
                    setEfdLocations(locData);
                }
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
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesCategory = !selectedCategory || p.projectCategory === selectedCategory;
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' || 
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesSearch = !searchTerm || 
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesCategory && matchesFundingYear && matchesDonated && matchesSearch;
        });

        baseProjects.forEach(p => {
            const reg = normalize(p.region);
            counts[reg] = (counts[reg] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedCategory, selectedFundingYear, searchTerm, selectedDonated]);

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
            const matchesCategory = !selectedCategory || p.projectCategory === selectedCategory;
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' || 
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesSearch = !searchTerm || 
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase());
            return matchesRegion && matchesCategory && matchesFundingYear && matchesDonated && matchesSearch;
        });

        baseProjects.forEach(p => {
            const div = normalize(p.division);
            counts[div] = (counts[div] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedRegion, selectedCategory, selectedFundingYear, searchTerm, selectedDonated]);

    const newlyCreatedCount = useMemo(() => {
        return projects.length;
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = !selectedCategory || p.projectCategory === selectedCategory;
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' || 
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const matchesSearch = !searchTerm || 
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolId?.toString().includes(searchTerm);
            return matchesRegion && matchesDivision && matchesCategory && matchesFundingYear && matchesDonated && matchesSearch;
        });
    }, [projects, selectedRegion, selectedDivision, selectedCategory, selectedFundingYear, searchTerm, selectedDonated]);

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
                                <h1 className="text-2xl font-black tracking-tight leading-none">EFD Dashboard</h1>
                                <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                                    {userData?.region || 'Central Office'} • Infrastructure Monitoring
                                </p>
                            </div>
                            <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                                <FiTrendingUp size={20} className="text-blue-200" />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white/5 backdrop-blur-sm p-4 rounded-2xl border border-white/10 lg:col-span-2">
                                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest mb-1.5 opacity-80">Total Projects</p>
                                <h2 className="text-3xl lg:text-4xl font-black">{projects.length.toLocaleString()}</h2>
                            </div>
                            <div className="bg-blue-400/20 backdrop-blur-sm p-4 rounded-2xl border border-white/10 lg:col-span-2">
                                <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest mb-1.5 opacity-80">Filtered Results</p>
                                <h2 className="text-3xl lg:text-4xl font-black">{filteredProjects.length.toLocaleString()}</h2>
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

                    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4 max-w-7xl mx-auto w-full">
                        <div className="flex items-center justify-between mb-1 px-1">
                            <div className="flex items-center gap-2">
                                <FiFilter className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Advanced Filters</span>
                            </div>
                            {(selectedRegion || selectedDivision || selectedCategory || selectedFundingYear || selectedDonated !== 'All' || searchTerm) && (
                                <button 
                                    onClick={handleClearFilters}
                                    className="text-[10px] font-black text-blue-600 hover:text-blue-700 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full transition-all active:scale-95"
                                >
                                    Clear Filters
                                </button>
                            )}
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <div className="relative md:col-span-1">
                                <select 
                                    value={selectedRegion}
                                    onChange={(e) => { setSelectedRegion(e.target.value); setSelectedDivision(''); }}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="">All Regions</option>
                                    {allRegions.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative md:col-span-1">
                                <select 
                                    value={selectedDivision}
                                    onChange={(e) => setSelectedDivision(e.target.value)}
                                    disabled={!selectedRegion}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all disabled:opacity-40"
                                >
                                    <option value="">All Divisions</option>
                                    {allDivisions.map(d => <option key={d} value={d}>{d}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative col-span-2 md:col-span-1">
                                <select 
                                    value={selectedCategory}
                                    onChange={(e) => setSelectedCategory(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="">All Project Categories</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative col-span-1">
                                <select 
                                    value={selectedFundingYear}
                                    onChange={(e) => setSelectedFundingYear(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="">All Funding Years</option>
                                    {fundingYears.map(year => (
                                        <option key={year} value={year}>{year}</option>
                                    ))}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>
                            <div className="relative col-span-1">
                                <select 
                                    value={selectedDonated}
                                    onChange={(e) => setSelectedDonated(e.target.value)}
                                    className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none transition-all"
                                >
                                    <option value="All">All Projects</option>
                                    <option value="Donated">Donated Projects</option>
                                    <option value="Non-Donated">Not Donated Projects</option>
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={14} />
                            </div>

                            {activeTab === 'list' ? (
                                <div className="relative animate-in slide-in-from-top-2 duration-300 col-span-2 md:col-span-1">
                                    <input 
                                        type="text"
                                        placeholder="Search Project, School, or ID..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full bg-blue-50 border-none rounded-xl pl-10 pr-4 py-3 text-[11px] font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20 placeholder:text-blue-300 transition-all"
                                    />
                                    <FiSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400" size={14} />
                                </div>
                            ) : (
                                <div className="hidden md:block md:col-span-1"></div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="px-5">
                    {activeTab === 'granular' ? (
                        <div className="space-y-6 animate-in fade-in duration-700">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-7xl mx-auto w-full">
                                {/* Regional Breakdown Chart */}
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 h-full flex flex-col">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                                        Regional Breakdown of Projects
                                    </h3>
                                    <div className="flex-1 min-h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={regionalData.slice(0, 30)} 
                                                layout="vertical"
                                                margin={{ right: 60, left: 10, top: 10, bottom: 10 }}
                                                onClick={(data) => {
                                                    if (data && data.activeLabel) {
                                                        setSelectedRegion(data.activeLabel);
                                                        setSelectedDivision('');
                                                        setActiveTab('list');
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} 
                                                    width={80}
                                                />
                                                <Tooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                                />
                                                <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                                                    {regionalData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={selectedRegion === entry.name ? '#2563eb' : '#93c5fd'} />
                                                    ))}
                                                    <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <p className="text-[10px] text-center text-slate-400 mt-2 font-medium italic">Click a bar to drill down into divisions</p>
                                </div>

                                {/* Divisional Breakdown Chart */}
                                <div className="bg-white p-5 rounded-3xl shadow-sm border border-slate-100 animate-in slide-in-from-bottom-4 duration-500 h-full flex flex-col">
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight mb-4 flex items-center gap-2">
                                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                                        {selectedRegion ? `Division Breakdown for ${selectedRegion}` : 'Division Breakdown of Projects'}
                                    </h3>
                                    <div className="flex-1 min-h-[300px] w-full">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart 
                                                data={divisionData.slice(0, 30)}
                                                layout="vertical"
                                                margin={{ right: 60, left: 10, top: 10, bottom: 10 }}
                                                onClick={(data) => {
                                                    if (data && data.activeLabel) {
                                                        setSelectedDivision(data.activeLabel);
                                                        setActiveTab('list');
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                                                <XAxis type="number" hide />
                                                <YAxis 
                                                    dataKey="name" 
                                                    type="category" 
                                                    tick={{fontSize: 10, fontWeight: 700, fill: '#64748b'}} 
                                                    width={100}
                                                />
                                                <Tooltip 
                                                    cursor={{fill: '#f8fafc'}}
                                                    contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                                                />
                                                <Bar dataKey="value" fill="#fbbf24" radius={[0, 4, 4, 0]}>
                                                    <LabelList dataKey="value" position="right" style={{ fontSize: '10px', fontWeight: 'bold', fill: '#64748b' }} />
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* Centered Navigation Button */}
                            <div className="max-w-7xl mx-auto w-full mt-6">
                                <button 
                                    onClick={() => setActiveTab('list')}
                                    className="w-full bg-white shadow-sm border border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-600 py-4 rounded-3xl text-sm font-black transition-all flex items-center justify-center gap-2 uppercase tracking-widest active:scale-[0.98]"
                                >
                                    See {selectedRegion || 'All'} Project Details <FiChevronRight />
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
                                                <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${
                                                    p.status === 'Completed' ? 'bg-green-100 text-green-700' : 
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
                                            <p className="text-xs font-black text-slate-800">{p.accomplishmentPercentage}%</p>
                                            <div className="w-16 bg-slate-100 h-1 rounded-full mt-1 overflow-hidden">
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

                <BottomNav userRole="EFD" />
            </div>
        </PageTransition>
    );
};

export default EFDHome;
