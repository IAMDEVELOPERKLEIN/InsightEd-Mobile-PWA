import React, { useState, useEffect } from 'react';
import { FiDollarSign, FiFileText, FiTrendingUp, FiCheckCircle, FiX, FiEye } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import BottomNav from './BottomNav';

const FinanceDashboard = () => {
    const [aggregates, setAggregates] = useState({
        totalProjects: 0,
        totalTranche1: 0,
        totalTranche2: 0,
        totalTranche3: 0
    });
    const [projects, setProjects] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    // Modal State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedProject, setSelectedProject] = useState(null);
    const [formData, setFormData] = useState({ tranche_1: '', tranche_2: '', tranche_3: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [saveMessage, setSaveMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            setError(null);
            const res = await fetch('/api/finance-dashboard/projects');
            if (!res.ok) throw new Error('Failed to fetch finance projects');
            const data = await res.json();
            setAggregates(data.aggregates);
            setProjects(data.projects);
        } catch (err) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const openModal = (project) => {
        setSelectedProject(project);
        setFormData({
            tranche_1: project.tranche_1 || '',
            tranche_2: project.tranche_2 || '',
            tranche_3: project.tranche_3 || ''
        });
        setSaveMessage({ text: '', type: '' });
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedProject(null);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSave = async (e) => {
        e.preventDefault();
        if (!selectedProject) return;

        setIsSaving(true);
        setSaveMessage({ text: '', type: '' });

        try {
            const payload = {
                tranche_1: formData.tranche_1 ? Number(formData.tranche_1) : null,
                tranche_2: formData.tranche_2 ? Number(formData.tranche_2) : null,
                tranche_3: formData.tranche_3 ? Number(formData.tranche_3) : null,
            };

            const res = await fetch(`/api/finance-dashboard/projects/${selectedProject.project_id}/tranches`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error('Failed to update tranches');

            const data = await res.json();

            // Update local state
            setProjects(prev => prev.map(p =>
                p.project_id === selectedProject.project_id
                    ? { ...p, tranche_1: data.project.tranche_1, tranche_2: data.project.tranche_2, tranche_3: data.project.tranche_3 }
                    : p
            ));

            setSaveMessage({ text: 'Tranches updated successfully!', type: 'success' });
            // Re-fetch data to update aggregates
            fetchData();

            setTimeout(() => {
                closeModal();
            }, 1500);

        } catch (err) {
            console.error(err);
            setSaveMessage({ text: err.message || 'Error updating tranches', type: 'error' });
        } finally {
            setIsSaving(false);
        }
    };

    const formatCurrency = (amount) => {
        if (amount == null) return 'Not set';
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    if (loading && projects.length === 0) {
        return (
            <div className="flex justify-center items-center h-screen bg-slate-50">
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-inter">

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-slate-800">Finance Dashboard</h1>
                    <p className="text-slate-500 mt-1">Manage project tranches and view financial aggregates.</p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-xl mb-6 flex items-center shadow-sm">
                        <FiX className="mr-2" /> {error}
                    </div>
                )}

                {/* Aggregate Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center transition-all hover:shadow-md">
                        <div className="bg-blue-100 p-4 rounded-xl text-blue-600 mr-5">
                            <FiFileText size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Projects</p>
                            <h3 className="text-2xl font-bold text-slate-800">{aggregates.totalProjects}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center transition-all hover:shadow-md">
                        <div className="bg-emerald-100 p-4 rounded-xl text-emerald-600 mr-5">
                            <FiDollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Tranche 1</p>
                            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(aggregates.totalTranche1)}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center transition-all hover:shadow-md">
                        <div className="bg-indigo-100 p-4 rounded-xl text-indigo-600 mr-5">
                            <FiTrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Tranche 2</p>
                            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(aggregates.totalTranche2)}</h3>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex items-center transition-all hover:shadow-md">
                        <div className="bg-purple-100 p-4 rounded-xl text-purple-600 mr-5">
                            <FiCheckCircle size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-slate-500">Total Tranche 3</p>
                            <h3 className="text-2xl font-bold text-slate-800">{formatCurrency(aggregates.totalTranche3)}</h3>
                        </div>
                    </div>
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
                    <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                        <h2 className="text-lg font-semibold text-slate-800">MOA Projects</h2>
                        <span className="bg-blue-100 text-blue-700 text-xs font-medium px-2.5 py-1 rounded-full">
                            {projects.length} Records
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-slate-500 bg-slate-50 uppercase border-b border-slate-100">
                                <tr>
                                    <th className="px-6 py-4 font-medium tracking-wider">Project ID</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">IPC</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Project Name</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">School Name</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Status</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Tranche 1</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Tranche 2</th>
                                    <th className="px-6 py-4 font-medium tracking-wider">Tranche 3</th>
                                    <th className="px-6 py-4 font-medium tracking-wider text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {projects.length === 0 ? (
                                    <tr>
                                        <td colSpan="10" className="px-6 py-8 text-center text-slate-500">
                                            No MOA projects found.
                                        </td>
                                    </tr>
                                ) : (
                                    projects.map((project) => (
                                        <tr key={project.project_id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
                                            <td className="px-6 py-4 font-medium text-slate-800">#{project.project_id}</td>
                                            <td className="px-6 py-4 font-medium text-blue-600 font-mono text-xs">{project.ipc || 'N/A'}</td>
                                            <td className="px-6 py-4">
                                                <div className="font-medium text-slate-800 line-clamp-2 text-xs" title={project.project_name || 'N/A'}>
                                                    {project.project_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-slate-500 line-clamp-2 text-[10px] font-medium" title={project.school_name || 'N/A'}>
                                                    {project.school_name || 'N/A'}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 uppercase tracking-tighter">
                                                    {project.status || 'Pending'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-[10px]">{formatCurrency(project.tranche_1)}</td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-[10px]">{formatCurrency(project.tranche_2)}</td>
                                            <td className="px-6 py-4 text-slate-600 font-mono text-[10px]">{formatCurrency(project.tranche_3)}</td>
                                            <td className="px-6 py-4 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => navigate(`/project-details/${project.project_id}`)}
                                                        className="inline-flex items-center justify-center px-3 py-2 text-sm font-medium text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
                                                        title="View Details"
                                                    >
                                                        <FiEye className="mr-1" /> View
                                                    </button>
                                                    <button
                                                        onClick={() => openModal(project)}
                                                        className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100 hover:text-blue-700 transition-colors focus:ring-4 focus:ring-blue-100 outline-none"
                                                    >
                                                        Update Tranches
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Spacer for BottomNav */}
                <div className="h-24"></div>
            </div>

            <BottomNav userRole="Finance" />

            {/* Update Modal */}
            {isModalOpen && selectedProject && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden transform transition-all">

                        <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100">
                            <h3 className="text-lg font-semibold text-slate-800">
                                Update Tranches
                            </h3>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-full hover:bg-slate-100">
                                <FiX size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-6">
                            <div className="mb-6">
                                <p className="text-sm font-medium text-slate-500 mb-1">Project ID: #{selectedProject.project_id}</p>
                                <p className="text-base font-semibold text-slate-800 line-clamp-2">{selectedProject.project_name || 'N/A'}</p>
                            </div>

                            {saveMessage.text && (
                                <div className={`mb-5 px-4 py-3 rounded-xl border flex items-center gap-2 text-sm ${saveMessage.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-red-50 border-red-200 text-red-700'}`}>
                                    {saveMessage.type === 'success' ? <FiCheckCircle /> : <FiX />}
                                    {saveMessage.text}
                                </div>
                            )}

                            <div className="space-y-4">
                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-slate-700">Tranche 1 (PHP)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-500 sm:text-sm">₱</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="tranche_1"
                                            value={formData.tranche_1}
                                            onChange={handleChange}
                                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-3 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-slate-700">Tranche 2 (PHP)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-500 sm:text-sm">₱</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="tranche_2"
                                            value={formData.tranche_2}
                                            onChange={handleChange}
                                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-3 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block mb-1.5 text-sm font-medium text-slate-700">Tranche 3 (PHP)</label>
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <span className="text-slate-500 sm:text-sm">₱</span>
                                        </div>
                                        <input
                                            type="number"
                                            step="0.01"
                                            name="tranche_3"
                                            value={formData.tranche_3}
                                            onChange={handleChange}
                                            className="bg-slate-50 border border-slate-200 text-slate-900 text-sm rounded-xl focus:ring-blue-500 focus:border-blue-500 block w-full pl-8 p-3 transition-colors"
                                            placeholder="0.00"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="mt-8 flex justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="px-5 py-2.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 hover:text-slate-900 transition-colors focus:ring-4 focus:ring-slate-100 outline-none"
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="px-5 py-2.5 flex justify-center items-center min-w-[100px] text-sm font-medium text-white bg-blue-600 rounded-xl hover:bg-blue-700 transition-colors focus:ring-4 focus:ring-blue-200 outline-none disabled:opacity-70"
                                >
                                    {isSaving ? (
                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </PageTransition>
    );
};

export default FinanceDashboard;
