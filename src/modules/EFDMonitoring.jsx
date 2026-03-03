import React, { useState, useEffect, useMemo } from 'react';
import { FiSearch, FiUserPlus, FiCheck, FiX, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { auth } from '../firebase';
import BottomNav from './BottomNav';
import PageTransition from '../components/PageTransition';

const EFDMonitoring = () => {
    const [projects, setProjects] = useState([]);
    const [engineers, setEngineers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedProject, setSelectedProject] = useState(null);
    const [selectedEngineer, setSelectedEngineer] = useState('');
    const [isAssigning, setIsAssigning] = useState(false);
    const [message, setMessage] = useState({ text: '', type: '' });

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [projRes, engRes] = await Promise.all([
                    fetch('/api/projects'),
                    fetch('/api/engineers')
                ]);

                if (projRes.ok) setProjects(await projRes.json());
                if (engRes.ok) setEngineers(await engRes.json());
            } catch (error) {
                console.error("Error fetching monitoring data:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const filteredProjects = useMemo(() => {
        return projects.filter(p => 
            p.projectName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.schoolName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.schoolId?.toString().includes(searchTerm) ||
            p.engineerName?.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [projects, searchTerm]);

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
                {/* Header */}
                <div className="bg-[#004A99] text-white p-6 rounded-b-[2.5rem] shadow-lg mb-6">
                    <h1 className="text-2xl font-black">Deployment</h1>
                    <p className="text-blue-100 text-xs font-medium uppercase tracking-widest mt-1">
                        Deployment of engineers to infrastructure projects
                    </p>
                </div>

                {/* Search */}
                <div className="px-5 mb-6">
                    <div className="relative">
                        <input 
                            type="text"
                            placeholder="Find project or search by engineer..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full bg-white border border-slate-200 rounded-2xl pl-12 pr-4 py-4 text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                        />
                        <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 size={20}" />
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
                <div className="px-5 space-y-3">
                    {filteredProjects.map((p) => (
                        <div 
                            key={p.id}
                            className={`bg-white p-4 rounded-3xl border transition-all ${selectedProject?.id === p.id ? 'border-blue-500 ring-4 ring-blue-500/10' : 'border-slate-100'}`}
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <h4 className="text-sm font-black text-slate-800 tracking-tight">{p.projectName}</h4>
                                    <p className="text-[10px] text-slate-400 font-bold uppercase">{p.schoolName}</p>
                                </div>
                                <button 
                                    onClick={() => setSelectedProject(p)}
                                    className="p-2 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                                >
                                    <FiUserPlus size={18} />
                                </button>
                            </div>

                            <div className="flex items-center justify-between border-t border-slate-50 pt-3">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 bg-slate-100 rounded-full flex items-center justify-center text-[10px] font-black text-slate-500">
                                        {p.engineerName?.[0] || '?'}
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-600 italic">
                                        Deployment: {p.engineerName || 'Unassigned'}
                                    </span>
                                </div>
                                <span className="text-[8px] font-black text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-md">
                                    ID: {p.id}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Assignment Modal/Overlay */}
                {selectedProject && (
                    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white w-full max-w-xl rounded-t-[2.5rem] p-6 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
                            <div className="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>
                            
                            <div className="mb-6">
                                <h2 className="text-xl font-black text-slate-800">Assign Engineer</h2>
                                <p className="text-xs text-slate-400 font-medium">Deployment for project: <span className="text-blue-600 font-bold">{selectedProject.projectName}</span></p>
                            </div>

                            <div className="space-y-4 mb-8">
                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select Active Engineer</label>
                                <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
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

                            <div className="flex gap-3">
                                <button 
                                    onClick={() => setSelectedProject(null)}
                                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-600 font-bold text-sm hover:bg-slate-200 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    onClick={handleAssign}
                                    disabled={!selectedEngineer || isAssigning}
                                    className="flex-[2] py-4 rounded-2xl bg-blue-600 text-white font-bold text-sm shadow-xl shadow-blue-500/30 active:scale-[0.98] transition-all disabled:opacity-50"
                                >
                                    {isAssigning ? 'Updating...' : 'Confirm Deployment'}
                                </button>
                            </div>
                        </div>
                    </div>
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
