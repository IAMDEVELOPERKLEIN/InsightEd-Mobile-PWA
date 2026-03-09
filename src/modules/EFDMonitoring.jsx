import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { FiSearch, FiUserPlus, FiCheck, FiX, FiAlertCircle, FiInfo, FiMapPin, FiFilter, FiChevronDown } from 'react-icons/fi';
import { auth } from '../firebase';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const EFDMonitoring = () => {
    const navigate = useNavigate();
    const [projects, setProjects] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [efdLocations, setEfdLocations] = useState([]);
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [selectedFundingYear, setSelectedFundingYear] = useState('');
    const [selectedDonated, setSelectedDonated] = useState('All'); // 'All', 'Donated', 'Non-Donated'
    const [fundingYears, setFundingYears] = useState([]);

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

    const normalize = (val) => val?.toString().trim().toUpperCase() || 'UNASSIGNED';
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });
    const [showUnassignedOnly, setShowUnassignedOnly] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projRes, engRes, fyRes, locRes] = await Promise.all([
                    fetch('/api/projects'),
                    fetch('/api/engineers'),
                    fetch('/api/reference/funding-years'),
                    fetch('/api/reference/efd-locations')
                ]);

                if (projRes.ok) setProjects(await projRes.json());
                if (engRes.ok) setEngineers(await engRes.json());
                if (fyRes.ok) setFundingYears(await fyRes.json());
                if (locRes.ok) setEfdLocations(await locRes.json());
            } catch (error) {
                console.error("Error fetching monitoring data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const regionalData = useMemo(() => {
        const counts = {};
        projects.forEach(p => {
            const reg = normalize(p.region);
            counts[reg] = (counts[reg] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects]);

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
        if (!selectedRegion) return [];
        const counts = {};
        projects.filter(p => normalize(p.region) === normalize(selectedRegion)).forEach(p => {
            const div = normalize(p.division);
            counts[div] = (counts[div] || 0) + 1;
        });
        return Object.entries(counts).map(([name, count]) => ({ name, value: count }))
            .sort((a, b) => b.value - a.value);
    }, [projects, selectedRegion]);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => {
            const matchesRegion = !selectedRegion || normalize(p.region) === normalize(selectedRegion);
            const matchesDivision = !selectedDivision || normalize(p.division) === normalize(selectedDivision);
            const matchesCategory = !selectedCategory || p.projectCategory === selectedCategory;
            const matchesFundingYear = !selectedFundingYear || p.fundingYear?.toString() === selectedFundingYear.toString();
            const matchesDonated = selectedDonated === 'All' || 
                (selectedDonated === 'Donated' && (!!p.isDonated || !!p.is_donated)) ||
                (selectedDonated === 'Non-Donated' && (!p.isDonated && !p.is_donated));
            const isUnassignedOnly = !showUnassignedOnly || !p.engineerName;
            
            const matchesSearch = !searchTerm || 
                p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                p.schoolId?.toString().includes(searchTerm) ||
                p.engineerName?.toLowerCase().includes(searchTerm.toLowerCase());
                
            return matchesRegion && matchesDivision && matchesCategory && matchesFundingYear && matchesDonated && isUnassignedOnly && matchesSearch;
        });
    }, [projects, searchTerm, showUnassignedOnly, selectedRegion, selectedDivision, selectedCategory, selectedFundingYear, selectedDonated]);

    const handleAssign = async () => {
        if (!selectedProject || !selectedEngineer) return;

        setIsAssigning(true);
        setMessage({ text: '', type: '' });

        const engineer = engineers.find(e => e.uid === selectedEngineer);
        const engineerName = `${engineer.firstName} ${engineer.lastName}`;

        try {
            const response = await fetch('/api/assign-project', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    projectId: selectedProject.id,
                    engineerId: selectedEngineer,
                    engineerName: engineerName
                })
            });

            if (response.ok) {
                setMessage({ text: `Project assigned to ${engineerName} successfully!`, type: 'success' });
                // Update local state
                setProjects(prev => prev.map(p => 
                    p.id === selectedProject.id ? { ...p, engineerName: engineerName } : p
                ));
                setSelectedProject(null);
                setSelectedEngineer('');
            } else {
                const err = await response.json();
                setMessage({ text: err.message || "Failed to assign project", type: 'error' });
            }
        } catch (error) {
            setMessage({ text: "Network error", type: 'error' });
        } finally {
            setIsAssigning(false);
        }
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
                {/* Header Section */}
                <div className="bg-[#004A99] text-white pt-8 pb-10 px-6 rounded-b-[3rem] shadow-xl mb-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400/10 rounded-full blur-3xl -mr-20 -mt-20"></div>
                    <div className="relative z-10">
                        <h1 className="text-2xl font-black tracking-tight leading-none">Deployment</h1>
                        <p className="text-blue-200 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">
                            Engineer Resource Allocation • System Monitoring
                        </p>
                    </div>
                </div>

                {/* Search & Filters Container */}
                <div className="px-5 mb-8 space-y-4">
                    {/* Search Panel */}
                    <div className="relative group">
                        <input 
                            type="text"
                            placeholder="Find project or search by engineer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 shadow-[0_4px_20px_rgb(0,0,0,0.03)] transition-all placeholder:text-slate-300"
                        />
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 transition-colors group-focus-within:text-blue-500" size={20} />
                    </div>

                    {/* Filter Panel */}
                    <div className="bg-white p-5 rounded-[2.5rem] shadow-sm border border-slate-100 space-y-4 max-w-7xl mx-auto w-full">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-1 gap-4 px-1">
                            <div className="flex items-center gap-2">
                                <FiFilter className="text-blue-500" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Filters</span>
                            </div>
                            <button 
                                onClick={() => setShowUnassignedOnly(!showUnassignedOnly)}
                                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-wider transition-all border shrink-0 ${showUnassignedOnly ? 'bg-orange-500 border-orange-500 text-white' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}
                            >
                                {showUnassignedOnly ? 'Showing Unassigned' : 'Filter Unassigned'}
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                            <div className="relative">
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
                            <div className="relative">
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
                            <div className="relative sm:col-span-2 lg:col-span-1">
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
                            <div className="relative">
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
                            <div className="relative">
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
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="px-5 mb-6">
                    <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 items-start">
                        <FiInfo className="text-blue-500 mt-0.5" />
                        <p className="text-[10px] font-bold text-blue-700 leading-relaxed">
                            Select a project to change its assigned engineer. This will update who is responsible for the project's monitoring and updates.
                        </p>
                    </div>
                </div>

                {/* Projects List */}
                <div className="px-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-24 max-w-7xl mx-auto w-full">
                    {filteredProjects.map((p) => {
                        const isUnassigned = !p.engineerName;
                        return (
                            <div 
                                key={p.id}
                                onClick={() => navigate(`/project-details/${p.id}`)}
                                className={`bg-white p-5 rounded-3xl border transition-all cursor-pointer hover:shadow-xl hover:border-blue-300 flex flex-col h-full ${selectedProject?.id === p.id ? 'border-blue-500 ring-4 ring-blue-500/10' : isUnassigned ? 'border-orange-200 bg-orange-50/30' : 'border-slate-100'}`}
                            >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex-1 min-w-0 pr-2">
                                    <h4 className="text-sm font-black text-slate-800 tracking-tight truncate overflow-hidden" title={p.projectName}>{p.projectName}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase truncate">{p.schoolName}</p>
                                </div>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedProject(p);
                                    }}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shrink-0"
                                >
                                    <FiUserPlus size={18} />
                                </button>
                            </div>

                            <div className="mt-auto flex items-center justify-between border-t border-slate-50 pt-4">
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500 shrink-0">
                                        {p.engineerName?.[0] || '?'}
                                    </div>
                                    <span className={`text-[10px] font-bold truncate ${isUnassigned ? 'text-orange-600' : 'text-slate-600 italic'}`}>
                                        {isUnassigned ? 'Unassigned' : `Engr. ${p.engineerName}`}
                                    </span>
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-md shrink-0 ml-2">
                                    ID: {p.id}
                                </span>
                            </div>
                        </div>
                    );})}
                </div>

                {/* Assignment Modal/Overlay */}
                {selectedProject && createPortal(
                    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-md animate-in fade-in duration-300 px-4">
                        <div className="bg-white w-full max-w-xl rounded-[2.5rem] p-8 shadow-2xl animate-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col relative px-4 sm:px-8">
                            <button 
                                onClick={() => setSelectedProject(null)}
                                className="absolute top-6 right-6 p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                            >
                                <FiX size={20} />
                            </button>
                            
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-slate-800">Assign Engineer</h2>
                                <p className="text-xs text-slate-400 font-medium">Deployment for project: <span className="text-blue-600 font-bold">{selectedProject.projectName}</span></p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Active Engineer</label>
                                <div className="grid grid-cols-1 gap-2 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar flex-1">
                                    {engineers.map((eng) => (
                                        <button
                                            key={eng.uid}
                                            onClick={() => setSelectedEngineer(eng.uid)}
                                            className={`flex items-center justify-between p-4 rounded-2xl transition-all border-2 ${selectedEngineer === eng.uid ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-transparent text-slate-700 hover:bg-slate-100'}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${selectedEngineer === eng.uid ? 'bg-white/20' : 'bg-white'}`}>
                                                    {eng.firstName[0]}
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-sm font-bold">{eng.firstName} {eng.lastName}</p>
                                                    <p className={`text-[10px] ${selectedEngineer === eng.uid ? 'text-blue-100' : 'text-slate-400'}`}>
                                                        {eng.division} • {eng.position || 'Engineer'}
                                                    </p>
                                                </div>
                                            </div>
                                            {selectedEngineer === eng.uid && <FiCheck size={20} />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
                                <button 
                                    onClick={() => setSelectedProject(null)}
                                    className="w-full py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAssign}
                                    disabled={!selectedEngineer || isAssigning}
                                    className="w-full py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isAssigning ? 'Updating...' : 'Confirm Deployment'}
                                </button>
                            </div>
                        </div>
                    </div>,
                    document.body
                )}

                {/* Notification */}
                {message.text && (
                    <div className={`fixed top-6 left-1/2 -translate-x-1/2 z-[3000] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 duration-300 ${message.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                        {message.type === 'success' ? <FiCheck size={20} /> : <FiAlertCircle size={20} />}
                        <p className="text-sm font-bold">{message.text}</p>
                        <button onClick={() => setMessage({ text: '', type: '' })} className="ml-2 hover:opacity-70"><FiX /></button>
                    </div>
                )}

                <BottomNav userRole="EFD" />
            </div>
        </PageTransition>
    );
};

export default EFDMonitoring;
