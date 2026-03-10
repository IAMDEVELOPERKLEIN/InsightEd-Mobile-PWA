import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FaBuilding, FaProjectDiagram, FaMoneyBillWave, FaClock, FaSearch, FaFilter, FaChevronDown, FaChevronUp } from 'react-icons/fa';

const AgencyDashboard = () => {
    const [projects, setProjects] = useState([]);
    const [aggregates, setAggregates] = useState({
        totalActiveAgencies: 0,
        totalMoaProjects: 0,
        totalTranche1Value: 0,
        pendingMoaTasks: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filters & Search
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedAgency, setSelectedAgency] = useState('All');

    // Grouping
    const [expandedAgencies, setExpandedAgencies] = useState({});

    // Liquidation Modal State
    const [selectedProjectForLiquidation, setSelectedProjectForLiquidation] = useState(null);

    useEffect(() => {
        fetchAgencyData();
    }, []);

    const fetchAgencyData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/agency-dashboard/projects');
            if (!res.ok) throw new Error('Failed to fetch agency dashboard data');
            const data = await res.json();

            setAggregates(data.aggregates || {
                totalActiveAgencies: 0, totalMoaProjects: 0, totalTranche1Value: 0, pendingMoaTasks: 0
            });
            setProjects(data.projects || []);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Derived Data
    const agenciesList = useMemo(() => {
        const agencies = new Set(projects.map(p => p.implementing_agencies).filter(Boolean));
        return ['All', ...Array.from(agencies).sort()];
    }, [projects]);

    const filteredProjects = useMemo(() => {
        return projects.filter(project => {
            const matchesSearch =
                (project.project_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (project.moa || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesAgency = selectedAgency === 'All' || project.implementing_agencies === selectedAgency;
            return matchesSearch && matchesAgency;
        });
    }, [projects, searchQuery, selectedAgency]);

    const groupedProjects = useMemo(() => {
        const groups = {};
        filteredProjects.forEach(project => {
            const agency = project.implementing_agencies || 'Unknown Agency';
            if (!groups[agency]) {
                groups[agency] = [];
            }
            groups[agency].push(project);
        });
        return groups;
    }, [filteredProjects]);

    const toggleGroup = (agency) => {
        setExpandedAgencies(prev => ({
            ...prev,
            [agency]: !prev[agency]
        }));
    };

    const toggleAllGroups = (expand) => {
        const newExpandedState = {};
        Object.keys(groupedProjects).forEach(agency => {
            newExpandedState[agency] = expand;
        });
        setExpandedAgencies(newExpandedState);
    };

    const formatCurrency = (amount) => {
        if (amount == null) return '₱0.00';
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString();
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center">
                    <div className="h-16 w-16 animate-spin rounded-full border-t-4 border-b-4 border-indigo-600"></div>
                    <p className="mt-4 text-lg font-semibold text-gray-700 animate-pulse">Loading Agency Data...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center p-6 bg-gray-50">
                <div className="bg-red-50 p-6 rounded-lg shadow-md max-w-md w-full text-center">
                    <h2 className="text-2xl font-bold text-red-600 mb-2">Error</h2>
                    <p className="text-red-500">{error}</p>
                    <button
                        onClick={fetchAgencyData}
                        className="mt-4 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F3F4F6] p-4 sm:p-6 lg:p-8 font-sans pb-24">

            {/* Header */}
            <header className="mb-8">
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#111827] drop-shadow-sm flex items-center">
                    <FaBuilding className="mr-4 text-indigo-600" />
                    Implementing Agency Dashboard
                </h1>
                <p className="text-gray-600 mt-2 text-lg">High-level project distribution & external partner monitoring</p>
            </header>

            {/* Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <MetricCard
                    title="Active Agencies"
                    value={aggregates.totalActiveAgencies}
                    icon={<FaBuilding className="w-8 h-8 opacity-80" />}
                    bgColor="bg-gradient-to-br from-indigo-500 to-indigo-700"
                />
                <MetricCard
                    title="MOA Projects"
                    value={aggregates.totalMoaProjects}
                    icon={<FaProjectDiagram className="w-8 h-8 opacity-80" />}
                    bgColor="bg-gradient-to-br from-blue-500 to-blue-700"
                />
                <MetricCard
                    title="Tranche 1 Value"
                    value={formatCurrency(aggregates.totalTranche1Value)}
                    icon={<FaMoneyBillWave className="w-8 h-8 opacity-80" />}
                    bgColor="bg-gradient-to-br from-emerald-500 to-emerald-700"
                />
                <MetricCard
                    title="Pending MOA Tasks"
                    value={aggregates.pendingMoaTasks}
                    icon={<FaClock className="w-8 h-8 opacity-80" />}
                    bgColor="bg-gradient-to-br from-amber-500 to-amber-700"
                />
            </div>

            {/* Main Content Area */}
            <div className="bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden">

                {/* Interactions Bar */}
                <div className="p-5 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-800 self-start sm:self-center">Assigned Projects by Agency</h2>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaSearch className="text-gray-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search Name or MOA ID..."
                                className="pl-10 pr-4 py-2 w-full sm:w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>

                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <FaFilter className="text-gray-400" />
                            </div>
                            <select
                                className="pl-10 pr-8 py-2 w-full sm:w-48 appearance-none border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none bg-white transition"
                                value={selectedAgency}
                                onChange={(e) => setSelectedAgency(e.target.value)}
                            >
                                {agenciesList.map(agency => (
                                    <option key={agency} value={agency}>{agency}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                <FaChevronDown className="text-gray-400 text-sm" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Table Area */}
                <div className="p-5">
                    <div className="flex justify-end mb-4 gap-2">
                        <button onClick={() => toggleAllGroups(true)} className="text-sm text-indigo-600 font-medium hover:underline">Expand All</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => toggleAllGroups(false)} className="text-sm text-indigo-600 font-medium hover:underline">Collapse All</button>
                    </div>

                    <div className="overflow-x-auto rounded-lg border border-gray-200">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-[#1F2937] text-white">
                                <tr>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider w-12"></th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Project Name</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">Mode</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">MOA Ref</th>
                                    <th scope="col" className="px-6 py-4 text-left text-xs font-bold uppercase tracking-wider">RTA Ref</th>
                                    <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Tranche 1</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Liquidation</th>
                                    <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date Assigned</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {Object.keys(groupedProjects).length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-12 text-center text-gray-500">
                                            No projects found matching the criteria.
                                        </td>
                                    </tr>
                                ) : (
                                    Object.entries(groupedProjects).sort(([a], [b]) => a.localeCompare(b)).map(([agency, projList]) => (
                                        <React.Fragment key={agency}>
                                            {/* Agency Group Header */}
                                            <tr
                                                className="bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
                                                onClick={() => toggleGroup(agency)}
                                            >
                                                <td className="px-6 py-3 whitespace-nowrap text-sm text-gray-500">
                                                    {expandedAgencies[agency] ? <FaChevronUp /> : <FaChevronDown />}
                                                </td>
                                                <td colSpan="6" className="px-6 py-3 whitespace-nowrap text-sm font-bold text-gray-800">
                                                    {agency} <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">{projList.length}</span>
                                                </td>
                                            </tr>

                                            {/* Agency Projects */}
                                            <AnimatePresence>
                                                {expandedAgencies[agency] && projList.map((project) => (
                                                    <motion.tr
                                                        key={project.project_id}
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: 'auto' }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        className="hover:bg-gray-50"
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm border-l-4 border-indigo-500"></td>
                                                        <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs truncate" title={project.project_name}>
                                                            {project.project_name || 'Unnamed Project'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
                                                                MOA
                                                            </span>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono bg-gray-50">
                                                            {project.moa}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono bg-gray-50">
                                                            {project.rta}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold text-emerald-600">
                                                            {formatCurrency(project.tranche_1)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                                                            <div className="flex flex-col">
                                                                <span className="text-xs text-gray-400">Liquidated:</span>
                                                                <span className="font-bold text-indigo-600">
                                                                    {formatCurrency(parseFloat(project.liquidated_tranche_1 || 0) + parseFloat(project.liquidated_tranche_2 || 0) + parseFloat(project.liquidated_tranche_3 || 0))}
                                                                </span>
                                                                <button
                                                                    onClick={() => setSelectedProjectForLiquidation(project)}
                                                                    className="mt-1 text-[10px] text-indigo-500 hover:text-indigo-700 underline text-left"
                                                                >
                                                                    Manage Liquidation
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                            {formatDate(project.date_assigned || project.created_at)}
                                                        </td>
                                                    </motion.tr>
                                                ))}
                                            </AnimatePresence>
                                        </React.Fragment>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Liquidation Management Modal */}
                <AnimatePresence>
                    {selectedProjectForLiquidation && (
                        <LiquidationModal
                            project={selectedProjectForLiquidation}
                            onClose={() => setSelectedProjectForLiquidation(null)}
                            onUpdate={fetchAgencyData}
                        />
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

const LiquidationModal = ({ project, onClose, onUpdate }) => {
    const [values, setValues] = useState({
        liquidated_tranche_1: project.liquidated_tranche_1 || 0,
        liquidated_tranche_2: project.liquidated_tranche_2 || 0,
        liquidated_tranche_3: project.liquidated_tranche_3 || 0
    });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        try {
            setSaving(true);
            const res = await fetch(`/api/agency-dashboard/projects/${project.project_id}/liquidation`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(values)
            });
            if (!res.ok) throw new Error('Failed to update liquidation');
            onUpdate();
            onClose();
        } catch (err) {
            alert(err.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            >
                <div className="bg-indigo-600 p-4 text-white">
                    <h3 className="text-lg font-bold">Manage Liquidation</h3>
                    <p className="text-xs text-indigo-100 truncate">{project.project_name}</p>
                </div>

                <div className="p-6 space-y-4">
                    {[1, 2, 3].map(t => (
                        <div key={t}>
                            <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Tranche {t} Liquidated Amount</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₱</span>
                                <input
                                    type="number"
                                    value={values[`liquidated_tranche_${t}`]}
                                    onChange={(e) => setValues(prev => ({ ...prev, [`liquidated_tranche_${t}`]: e.target.value }))}
                                    className="w-full pl-8 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                />
                            </div>
                        </div>
                    ))}

                    <div className="pt-4 flex gap-3">
                        <button
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex-1 px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-lg shadow-indigo-200"
                        >
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

// Reusable Metric Card Component
const MetricCard = ({ title, value, icon, bgColor }) => (
    <motion.div
        whileHover={{ scale: 1.02 }}
        className={`${bgColor} rounded-xl shadow-lg p-6 text-white overflow-hidden relative`}
    >
        <div className="absolute right-0 top-0 mt-4 mr-4 opacity-30 transform scale-150">
            {icon}
        </div>
        <div className="relative z-10">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-1">{title}</h3>
            <div className="text-3xl font-extrabold">{value}</div>
        </div>
    </motion.div>
);

export default AgencyDashboard;
