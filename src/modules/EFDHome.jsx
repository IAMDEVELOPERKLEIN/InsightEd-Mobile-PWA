import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiFilter, FiSearch, FiLayers, FiList, FiTrendingUp, FiMapPin, FiChevronRight, FiAlertCircle, FiChevronDown, FiCheckSquare } from 'react-icons/fi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, LabelList, Legend } from 'recharts';
import { useAuth } from '../context/AuthContext';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const MultiSelectDropdown = ({ label, options, selected, onChange, icon: Icon }) => {
    const [isOpen, setIsOpen] = useState(false);
    
    return (
        <div className="relative group flex-1 min-w-[200px]">
            <button 
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-3 bg-white/60 backdrop-blur-md border border-white/40 rounded-2xl shadow-sm text-sm font-bold text-slate-700 hover:bg-white/80 transition-all text-left"
            >
                <div className="flex items-center gap-2 truncate">
                    {Icon && <Icon size={14} className="text-blue-500" />}
                    <span className="truncate">{selected.length > 0 ? `${label} (${selected.length})` : `Select ${label}`}</span>
                </div>
                <FiChevronDown className={`shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isOpen && (
                <>
                    <div className="fixed inset-0 z-[100]" onClick={() => setIsOpen(false)}></div>
                    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[101] py-2 max-h-[300px] overflow-y-auto custom-scrollbar animate-in zoom-in-95 duration-200">
                        <div 
                            onClick={() => onChange([])}
                            className="px-4 py-2 hover:bg-blue-50 text-[10px] font-black text-blue-600 uppercase tracking-widest cursor-pointer border-b border-slate-50 mb-1"
                        >
                            Reset {label}
                        </div>
                        {options.map(option => (
                            <div 
                                key={option}
                                onClick={() => {
                                    const next = selected.includes(option) 
                                        ? selected.filter(s => s !== option)
                                        : [...selected, option];
                                    onChange(next);
                                }}
                                className="px-4 py-2 hover:bg-slate-50 flex items-center justify-between cursor-pointer group/item"
                            >
                                <span className={`text-xs ${selected.includes(option) ? 'text-blue-600 font-bold' : 'text-slate-600 font-medium'}`}>
                                    {option}
                                </span>
                                {selected.includes(option) && <FiCheckSquare size={14} className="text-blue-500" />}
                            </div>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
};

const EFDHome = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userData, setUserData] = useState(null);
    const [activeTab, setActiveTab] = useState('granular'); // 'granular' or 'list'
    const [selectedRegions, setSelectedRegions] = useState([]);
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedCategories, setSelectedCategories] = useState([]);
    const [selectedYears, setSelectedYears] = useState([]);
    const [selectedSource, setSelectedSource] = useState('All'); // 'All', 'Donated', 'BEFF'
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedDonated, setSelectedDonated] = useState('All'); 
    const [selectedDocStatus, setSelectedDocStatus] = useState('All'); 
    const [fundingYears, setFundingYears] = useState([]);
    const [searchQuery, setSearchQuery] = useState('');
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
        setSelectedRegions([]);
        setSelectedDivision('');
        setSelectedCategories([]);
        setSelectedYears([]); // Use selectedYears for the new UI
        setSelectedSource('All'); // Clear source filter
        setSelectedDonated('All');
        setSelectedDocStatus('All');
        setSearchQuery(''); // Use searchQuery for the new UI
    };

    const allCategories = [
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

    // Colors for Pie Chart
    const COLORS = [
        '#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658', '#d0ed57', '#a4de6c', '#8dd1e1'
    ];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                if (!user) {
                    setLoading(false);
                    return;
                }
                setUserData(user);
                if (user.region) setSelectedRegions([user.region]);
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
            const matchesRegions = selectedRegions.length === 0 || 
                selectedRegions.some(reg => normalize(reg) === normalize(p.region));
            const matchesCategory = selectedCategories.length === 0 || 
                selectedCategories.some(cat => normalize(cat) === normalize(p.projectCategory));
            const matchesFundingYear = selectedYears.length === 0 || 
                selectedYears.some(year => year.toString() === p.fundingYear?.toString());
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchQuery ||
                p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSource = selectedSource === 'All' || 
                                (selectedSource === 'Donated' && p.program_type === 'Donated') ||
                                (selectedSource === 'BEFF' && p.program_type === 'BEFF');
            return matchesRegions && matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch && matchesSource;
        });

        baseProjects.forEach(p => {
            const reg = normalize(p.region);
            const cat = allCategories.find(c => normalize(c) === normalize(p.projectCategory)) || 'Uncategorized';
            if (!stats[reg]) stats[reg] = { name: reg, totalValue: 0 };
            
            const field = chartMetric === 'count' ? cat : `${cat}_abc`;
            const val = chartMetric === 'count' ? 1 : (parseFloat(p.projectAllocation) || 0);
            
            stats[reg][cat] = (stats[reg][cat] || 0) + val;
            stats[reg].totalValue += val;
        });

        return Object.values(stats).sort((a, b) => b.totalValue - a.totalValue);
    }, [projects, selectedRegions, selectedCategories, selectedYears, searchQuery, selectedDonated, selectedDocStatus, chartMetric, selectedSource]);

    const allRegions = useMemo(() => {
        const regions = new Set();
        efdLocations.forEach(loc => {
            if (loc.region) regions.add(loc.region.trim().toUpperCase());
        });
        return Array.from(regions).sort();
    }, [efdLocations]);

    const allDivisions = useMemo(() => {
        if (selectedRegions.length === 0) return [];
        const divisions = new Set();
        efdLocations
            .filter(loc => selectedRegions.some(reg => loc.region?.trim().toUpperCase() === reg.toUpperCase()))
            .forEach(loc => {
                if (loc.division) divisions.add(loc.division.trim().toUpperCase());
            });
        return Array.from(divisions).sort();
    }, [efdLocations, selectedRegions]);

    const allYears = useMemo(() => {
        return [...new Set(fundingYears)].sort((a, b) => b - a);
    }, [fundingYears]);

    const divisionData = useMemo(() => {
        const stats = {};
        const baseProjects = projects.filter(p => {
            const matchesRegions = selectedRegions.length === 0 || 
                selectedRegions.some(reg => normalize(reg) === normalize(p.region));
            const matchesCategory = selectedCategories.length === 0 || 
                selectedCategories.some(cat => normalize(cat) === normalize(p.projectCategory));
            const matchesFundingYear = selectedYears.length === 0 || 
                selectedYears.some(year => year.toString() === p.fundingYear?.toString());
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchQuery ||
                p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSource = selectedSource === 'All' || 
                                (selectedSource === 'Donated' && p.program_type === 'Donated') ||
                                (selectedSource === 'BEFF' && p.program_type === 'BEFF');
            return matchesRegions && matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch && matchesSource;
        });

        baseProjects.forEach(p => {
            const div = normalize(p.division);
            const cat = allCategories.find(c => normalize(c) === normalize(p.projectCategory)) || 'Uncategorized';
            if (!stats[div]) stats[div] = { name: div, totalValue: 0 };
            
            const field = chartMetric === 'count' ? cat : `${cat}_abc`;
            const val = chartMetric === 'count' ? 1 : (parseFloat(p.projectAllocation) || 0);

            stats[div][cat] = (stats[div][cat] || 0) + val;
            stats[div].totalValue += val;
        });

        return Object.values(stats).sort((a, b) => b.totalValue - a.totalValue);
    }, [projects, selectedRegions, selectedCategories, selectedYears, searchQuery, selectedDonated, selectedDocStatus, chartMetric, selectedSource]);

    const pieChartData = useMemo(() => {
        const counts = {};
        // Initialize with 0 for all categories to ensure they show up in the pie chart
        allCategories.forEach(cat => counts[cat] = 0);
        
        const baseProjects = projects.filter(p => {
            const matchesRegions = selectedRegions.length === 0 || 
                selectedRegions.some(reg => normalize(reg) === normalize(p.region));
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesFundingYear = selectedYears.length === 0 || 
                selectedYears.some(year => year.toString() === p.fundingYear?.toString());
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchQuery ||
                p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSource = selectedSource === 'All' || 
                                (selectedSource === 'Donated' && p.program_type === 'Donated') ||
                                (selectedSource === 'BEFF' && p.program_type === 'BEFF');
            return matchesRegions && matchesDivision && matchesFundingYear && matchesDonated && matchesDocStatus && matchesSearch && matchesSource;
        });

        baseProjects.forEach(p => {
            const cat = allCategories.find(c => normalize(c) === normalize(p.projectCategory)) || 'Uncategorized';
            counts[cat] = (counts[cat] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedRegions, selectedDivision, selectedYears, searchQuery, selectedDonated, selectedDocStatus, selectedSource]);

    const yearData = useMemo(() => {
        const counts = {};
        const baseProjects = projects.filter(p => {
            const matchesRegions = selectedRegions.length === 0 || 
                selectedRegions.some(reg => normalize(reg) === normalize(p.region));
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = selectedCategories.length === 0 || 
                selectedCategories.some(cat => normalize(cat) === normalize(p.projectCategory));
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesSearch = !searchQuery ||
                p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesSource = selectedSource === 'All' || 
                                (selectedSource === 'Donated' && p.program_type === 'Donated') ||
                                (selectedSource === 'BEFF' && p.program_type === 'BEFF');
            return matchesRegions && matchesDivision && matchesCategory && matchesDonated && matchesDocStatus && matchesSearch && matchesSource;
        });

        baseProjects.forEach(p => {
            const year = p.fundingYear?.toString() || 'N/A';
            counts[year] = (counts[year] || 0) + 1;
        });
        return Object.entries(counts).map(([name, value]) => ({ name: `FY ${name}`, value }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [projects, selectedRegions, selectedDivision, selectedCategories, searchQuery, selectedDonated, selectedDocStatus, selectedSource]);



    const newlyCreatedCount = useMemo(() => {
        return projects.length;
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegions = selectedRegions.length === 0 || 
                selectedRegions.some(reg => normalize(reg) === normalize(p.region));
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = selectedCategories.length === 0 || 
                selectedCategories.some(cat => normalize(cat) === normalize(p.projectCategory));
            const matchesFundingYear = selectedYears.length === 0 || 
                selectedYears.some(year => year.toString() === p.fundingYear?.toString());
            const matchesDonated = selectedDonated === 'All' ||
                (selectedDonated === 'Donated' && p.program_type === 'Donated') ||
                (selectedDonated === 'Non-Donated' && p.program_type === 'BEFF');
            const matchesDocStatus = selectedDocStatus === 'All' ||
                (selectedDocStatus === 'Complete' && p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing RTA' && p.hasMoa && !p.hasRta) ||
                (selectedDocStatus === 'Missing MOA' && !p.hasMoa && p.hasRta) ||
                (selectedDocStatus === 'Missing Both' && !p.hasMoa && !p.hasRta);
            const matchesBeff = !isBeffMode || (!!p.implementingAgency || !!p.implementing_agency);
            const matchesSearch = !searchQuery ||
                p.projectName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.schoolId?.toString().includes(searchQuery);
            const matchesSource = selectedSource === 'All' || 
                                (selectedSource === 'Donated' && p.program_type === 'Donated') ||
                                (selectedSource === 'BEFF' && p.program_type === 'BEFF');
            return matchesRegions && matchesDivision && matchesCategory && matchesFundingYear && matchesDonated && matchesDocStatus && matchesBeff && matchesSearch && matchesSource;
        });
    }, [projects, selectedRegions, selectedDivision, selectedCategories, selectedYears, searchQuery, selectedDonated, selectedDocStatus, isBeffMode, selectedSource]);

    // Pagination State
    const itemsPerPage = 15;
    
    useEffect(() => {
        setCurrentPage(1); // Reset to first page on search or filter change
    }, [searchQuery, selectedRegions, selectedDivision, selectedCategories, selectedYears, selectedDonated, selectedDocStatus, selectedSource]);

    const paginatedProjects = useMemo(() => {
        const startIndex = (currentPage - 1) * itemsPerPage;
        return filteredProjects.slice(startIndex, startIndex + itemsPerPage);
    }, [filteredProjects, currentPage]);

    const totalPages = Math.ceil(filteredProjects.length / itemsPerPage);

    const totalABC = useMemo(() => {
        return filteredProjects.reduce((sum, p) => sum + (parseFloat(p.projectAllocation) || 0), 0);
    }, [filteredProjects]);

    const renderCustomizedLabel = useCallback(({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }) => {
        const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
        const x = cx + radius * Math.cos(-midAngle * Math.PI / 180);
        const y = cy + radius * Math.sin(-midAngle * Math.PI / 180);
    
        if (value === 0 || percent < 0.03) return null; // Don't show if 0 or too small
    
        return (
            <text 
                x={x} 
                y={y} 
                fill="white" 
                textAnchor="middle" 
                dominantBaseline="central" 
                className="text-[12px] font-black drop-shadow-md"
            >
                {value}
            </text>
        );
    }, []);

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

                    {/* --- FILTER CONTROL PANEL --- */}
                    <div className="space-y-4">
                        {/* Search Bar */}
                        <div className="relative group">
                            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            <input 
                                type="text"
                                placeholder="Search by project name, school ID, or location..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-3xl shadow-sm text-sm font-medium focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all placeholder:text-slate-300"
                            />
                        </div>

                        {/* Multi-Select Group */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <MultiSelectDropdown 
                                label="Regions" 
                                options={allRegions} 
                                selected={selectedRegions} 
                                onChange={setSelectedRegions}
                                icon={FiMapPin}
                            />
                            <MultiSelectDropdown 
                                label="Categories" 
                                options={allCategories} 
                                selected={selectedCategories} 
                                onChange={setSelectedCategories}
                                icon={FiLayers}
                            />
                            <MultiSelectDropdown 
                                label="Funding Years" 
                                options={allYears} 
                                selected={selectedYears} 
                                onChange={setSelectedYears}
                                icon={FiList}
                            />
                        </div>

                        {/* Single-Select & Reset Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            <div className="relative group">
                                <FiMapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors z-10" size={12} />
                                <select 
                                    value={selectedDivision}
                                    onChange={(e) => setSelectedDivision(e.target.value)}
                                    disabled={selectedRegions.length !== 1}
                                    className="w-full pl-9 pr-8 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none shadow-sm disabled:opacity-40"
                                >
                                    <option value="">{selectedRegions.length === 1 ? 'All Divisions' : 'Select 1 Region'}</option>
                                    {allDivisions.map(div => <option key={div} value={div}>{div}</option>)}
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                            </div>

                            <div className="relative group">
                                <FiAlertCircle className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-blue-500 transition-colors z-10" size={12} />
                                <select 
                                    value={selectedDocStatus}
                                    onChange={(e) => setSelectedDocStatus(e.target.value)}
                                    className="w-full pl-9 pr-8 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none shadow-sm"
                                >
                                    <option value="All">All Doc Status</option>
                                    <option value="Complete">Complete docs</option>
                                    <option value="Missing RTA">Missing RTA</option>
                                    <option value="Missing MOA">Missing MOA</option>
                                    <option value="Missing Both">Missing Both</option>
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                            </div>

                            <div className="relative group">
                                <FiTrendingUp className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-amber-500 transition-colors z-10" size={12} />
                                <select 
                                    value={selectedSource}
                                    onChange={(e) => setSelectedSource(e.target.value)}
                                    className="w-full pl-9 pr-8 py-3 bg-white border border-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-tight text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/10 appearance-none shadow-sm"
                                >
                                    <option value="All">All Sources</option>
                                    <option value="Donated">Donated</option>
                                    <option value="BEFF">BEFF (Gov)</option>
                                </select>
                                <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={10} />
                            </div>

                            <button 
                                onClick={handleClearFilters}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                            >
                                <FiFilter size={12} /> Reset Filters
                            </button>
                        </div>
                    </div>
                </div>

                <div className="px-5">
                    {activeTab === 'granular' ? (
                        <div className="space-y-6 animate-in fade-in duration-700 pb-10">
                            {/* Analytics Drilldown Layout */}
                            <div className="max-w-7xl mx-auto w-full px-0 space-y-6">
                                <div className="flex flex-col lg:flex-row gap-6">
                                    {/* Pie Chart */}
                                    <div className="w-full lg:w-96 shrink-0 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 h-[500px] flex flex-col">
                                        <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                            <span className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></span>
                                            Global Category Distribution
                                        </h3>
                                        <div className="flex-1 w-full relative">
                                            <ResponsiveContainer width="100%" height={260}>
                                                <PieChart>
                                                    <Pie
                                                        data={pieChartData}
                                                        cx="50%"
                                                        cy="50%"
                                                        innerRadius={65}
                                                        outerRadius={95}
                                                        paddingAngle={5}
                                                        dataKey="value"
                                                        labelLine={false}
                                                        label={renderCustomizedLabel}
                                                        stroke="none"
                                                    >
                                                        {pieChartData.map((entry, index) => (
                                                            <Cell 
                                                                key={`cell-${index}`} 
                                                                fill={COLORS[index % COLORS.length]}
                                                                className="hover:opacity-80 transition-opacity cursor-pointer outline-none"
                                                            />
                                                        ))}
                                                    </Pie>
                                                    <Tooltip 
                                                        contentStyle={{ 
                                                            borderRadius: '16px', 
                                                            border: 'none', 
                                                            boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                                                            fontSize: '11px',
                                                            fontWeight: 'bold'
                                                        }} 
                                                    />
                                                </PieChart>
                                            </ResponsiveContainer>
                                            
                                            <div className="mt-6 space-y-2 max-h-[160px] overflow-y-auto pr-2 custom-scrollbar border-t border-slate-50 pt-4 px-1">
                                                {pieChartData.filter(e => e.value > 0).map((entry) => (
                                                    <div key={entry.name} className="flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-600 hover:bg-slate-50 p-1.5 rounded-lg transition-colors">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: categoryColors[entry.name] || '#94a3b8' }}></div>
                                                            <span className="truncate max-w-[180px]">{entry.name}</span>
                                                        </div>
                                                        <span className="text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md font-black min-w-[30px] text-center">{entry.value}</span>
                                                    </div>
                                                ))}
                                                {pieChartData.every(e => e.value === 0) && (
                                                    <div className="text-center py-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">No data available</div>
                                                )}
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
                                                        {selectedRegions.length === 1 ? `Division Analysis for ${selectedRegions[0]}` : 'Regional Analysis'}
                                                    </h3>
                                                    <p className="text-[9px] font-bold text-slate-400 mt-1.5 uppercase tracking-widest">
                                                        {selectedRegions.length === 1 ? 'Viewing breakdown per division' : 'Global overview by region'}
                                                    </p>
                                                </div>
                                                
                                                <div className="flex bg-slate-100 p-1.5 rounded-2xl w-full sm:w-auto self-end">
                                                    <button
                                                        onClick={() => setChartMetric('count')}
                                                        className={`flex-1 sm:px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMetric === 'count' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        Count
                                                    </button>
                                                    <button
                                                        onClick={() => setChartMetric('abc')}
                                                        className={`flex-1 sm:px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${chartMetric === 'abc' ? 'bg-white text-blue-600 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-700'}`}
                                                    >
                                                        Allocation
                                                    </button>
                                                </div>
                                            </div>

                                            {selectedRegions.length === 1 && (
                                                <button 
                                                    onClick={() => {setSelectedRegions([]); setSelectedDivision('');}}
                                                    className="mb-6 self-start flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-4 py-2.5 rounded-2xl hover:bg-blue-100 transition-all group active:scale-95"
                                                >
                                                    <FiChevronRight className="rotate-180 group-hover:-translate-x-1 transition-transform" /> 
                                                    <span>Back to Regions</span>
                                                </button>
                                            )}

                                            <div className="h-[450px] w-full animate-in fade-in slide-in-from-right-4 duration-500" key={selectedRegions.join(',') + chartMetric}>
                                                <ResponsiveContainer width="100%" height="100%">
                                                    <BarChart
                                                        data={selectedRegions.length === 1 ? divisionData.slice(0, 50) : regionalData.slice(0, 30)}
                                                        layout="vertical"
                                                        margin={{ right: 90, left: 10, top: 10, bottom: 10 }}
                                                        onClick={(data) => {
                                                            if (data && data.activeLabel) {
                                                                if (selectedRegions.length === 0) {
                                                                    setSelectedRegions([data.activeLabel]);
                                                                    setSelectedDivision('');
                                                                } else if (selectedRegions.length === 1) {
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
                                                            width={selectedRegions.length === 1 ? 120 : 80}
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
                                                        {allCategories.map((cat) => (
                                                            <Bar 
                                                                key={cat}
                                                                dataKey={cat} 
                                                                stackId="a" 
                                                                fill={categoryColors[cat] || '#94a3b8'} 
                                                                barSize={28}
                                                                className="hover:opacity-80 transition-opacity cursor-pointer"
                                                            >
                                                                <LabelList 
                                                                    dataKey={cat} 
                                                                    position="inside" 
                                                                    formatter={(val) => val > 0 ? (chartMetric === 'abc' ? `${(val / 1000000).toFixed(1)}M` : val) : ''}
                                                                    style={{ fontSize: '8px', fontWeight: 'black', fill: '#fff', pointerEvents: 'none' }} 
                                                                />
                                                            </Bar>
                                                        ))}
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
                                        </div>

                                        {/* Funding Year Histogram */}
                                        <div className="bg-white p-6 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                                                <span className="w-2 h-2 bg-blue-600 rounded-full shadow-[0_0_8px_rgba(37,99,235,0.4)]"></span>
                                                Funding Year Distribution
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
                                                        <YAxis hide domain={[0, 'auto']} />
                                                        <Tooltip 
                                                            cursor={{ fill: '#f8fafc' }}
                                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                                        />
                                                        <Bar dataKey="value" fill="#004A99" radius={[6, 6, 0, 0]} barSize={40}>
                                                            <LabelList dataKey="value" position="top" style={{ fontSize: '10px', fontWeight: 'black', fill: '#004A99' }} />
                                                        </Bar>
                                                    </BarChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Browse Detailed Button */}
                                <div className="mt-6">
                                    <button
                                        onClick={() => setActiveTab('list')}
                                        className="w-full bg-white shadow-sm border border-slate-100 hover:bg-slate-100 hover:border-slate-200 text-slate-600 py-5 rounded-[2rem] text-xs font-black transition-all flex items-center justify-center gap-2 uppercase tracking-[0.2em] active:scale-[0.98]"
                                    >
                                        Browse Detailed Project Records <FiChevronRight />
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden max-w-7xl mx-auto w-full">
                            {filteredProjects.length === 0 ? (
                                <div className="text-center py-20">
                                    <FiAlertCircle size={48} className="mx-auto text-slate-200 mb-4" />
                                    <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No projects found</p>
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 border-b border-slate-100">
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest w-20">ID</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Project Details</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Division</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Progress</th>
                                                    <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Documents</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-50">
                                                {paginatedProjects.map((p) => (
                                                    <tr 
                                                        key={p.id} 
                                                        onClick={() => navigate(`/project-details/${p.id}`)}
                                                        className="hover:bg-blue-50/30 transition-colors cursor-pointer group"
                                                    >
                                                        <td className="px-6 py-4">
                                                            <span className="text-xs font-black text-blue-600 bg-blue-50 px-2 py-1 rounded-lg">{p.id}</span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div>
                                                                <h4 className="text-sm font-bold text-slate-800 group-hover:text-blue-700 transition-colors">{p.projectName}</h4>
                                                                <p className="text-[10px] text-slate-500 font-medium">{p.schoolName} • {p.schoolId}</p>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-tight">
                                                            {p.division}
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <span className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-full ${
                                                                p.status === 'Completed' ? 'bg-green-100 text-green-700' :
                                                                p.status === 'Ongoing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-700'
                                                            }`}>
                                                                {p.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-3">
                                                                <span className="text-xs font-black text-slate-700 min-w-[30px]">{p.accomplishmentPercentage}%</span>
                                                                <div className="w-16 bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                                    <div 
                                                                        className="h-full bg-blue-500 transition-all" 
                                                                        style={{ width: `${p.accomplishmentPercentage}%` }}
                                                                    ></div>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <div className="flex justify-end gap-1">
                                                                {!p.hasMoa && !p.hasRta ? (
                                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-red-50 text-red-500 border border-red-100">None</span>
                                                                ) : p.hasMoa && p.hasRta ? (
                                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-600 border border-emerald-100">Full</span>
                                                                ) : !p.hasMoa ? (
                                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">RTA Only</span>
                                                                ) : (
                                                                    <span className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded bg-orange-50 text-orange-600 border border-orange-100">MOA Only</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>

                                    {/* Pagination Controls */}
                                    <div className="bg-slate-50/50 px-6 py-4 flex items-center justify-between border-t border-slate-100">
                                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                            Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredProjects.length)} of {filteredProjects.length} Records
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <button 
                                                onClick={() => setCurrentPage(1)}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm active:scale-95"
                                            >
                                                First
                                            </button>
                                            <button 
                                                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                                disabled={currentPage === 1}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm active:scale-90"
                                            >
                                                <FiChevronRight className="rotate-180" size={12} />
                                            </button>
                                            
                                            <div className="px-4 text-[10px] font-black text-blue-600 uppercase tracking-[0.2em] bg-blue-50 py-1.5 rounded-lg border border-blue-100">
                                                Page {currentPage} of {totalPages || 1}
                                            </div>

                                            <button 
                                                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm active:scale-90"
                                            >
                                                <FiChevronRight size={12} />
                                            </button>
                                            <button 
                                                onClick={() => setCurrentPage(totalPages)}
                                                disabled={currentPage === totalPages || totalPages === 0}
                                                className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-slate-600 uppercase tracking-widest hover:bg-slate-50 disabled:opacity-30 disabled:hover:bg-white transition-all shadow-sm active:scale-95"
                                            >
                                                Last
                                            </button>
                                        </div>
                                    </div>
                                </>
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
