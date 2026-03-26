import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { LuX, LuHistory, LuUser, LuCalendar } from "react-icons/lu";
import { FiActivity, FiCheckCircle, FiEdit2, FiMessageSquare } from 'react-icons/fi';

const ProjectLogModal = ({ isOpen, onClose, project }) => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isOpen) {
            // Lock body scroll
            document.body.style.overflow = 'hidden';
            if (project?.ipc) {
                fetchHistory();
            }
        }
        
        return () => {
            // Restore body scroll
            document.body.style.overflow = 'unset';
            if (!isOpen) {
                setHistory([]);
                setError(null);
            }
        };
    }, [isOpen, project]);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/project-history/${encodeURIComponent(project.ipc)}`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setHistory(data);
        } catch (err) {
            console.error("Error fetching history:", err);
            setError("Could not load project history.");
        } finally {
            setLoading(false);
        }
    };

    const generateSentences = (rows) => {
        if (!rows.length) return [];
        
        // Rows come from API DESC (newest first). 
        // We need them oldest first to compare prev vs curr correctly.
        const chronologicalRows = [...rows].reverse();
        const logs = [];

        // First row = project creation
        const first = chronologicalRows[0];
        logs.push({
            text: `Project was created${first.engineerName ? ` by Engr. ${first.engineerName}` : ''}.`,
            date: first.statusAsOfDate || first.created_at,
            user: first.engineerName,
            type: 'create',
        });

        // Compare consecutive rows for changes
        for (let i = 1; i < chronologicalRows.length; i++) {
            const prev = chronologicalRows[i - 1];
            const curr = chronologicalRows[i];
            const engr = curr.engineerName ? `Engr. ${curr.engineerName}` : 'Someone';
            const date = curr.statusAsOfDate || curr.created_at;

            // Percentage change
            const getPct = (row) => {
                const val = row.accomplishmentPercentage ?? row.accomplishment_percentage ?? 0;
                return parseInt(val) || 0;
            };
            const prevPct = getPct(prev);
            const currPct = getPct(curr);

            if (currPct !== prevPct) {
                logs.push({
                    text: `${engr} updated the percentage of completion from ${prevPct}% to ${currPct}%.`,
                    date,
                    user: curr.engineerName,
                    type: 'update',
                });
            }

            // Procurement Status change
            const prevProc = prev.procurement_status || 'Not Yet Procured';
            const currProc = curr.procurement_status || 'Not Yet Procured';
            if (currProc !== prevProc) {
                logs.push({
                    text: `${engr} updated the procurement status from "${prevProc}" to "${currProc}".`,
                    date,
                    user: curr.engineerName,
                    type: 'update',
                });
            }

            // Construction Status change
            const prevStat = prev.status || 'Not Yet Started';
            const currStat = curr.status || 'Not Yet Started';
            if (currStat !== prevStat) {
                logs.push({
                    text: `${engr} updated the construction status from "${prevStat}" to "${currStat}".`,
                    date,
                    user: curr.engineerName,
                    type: 'update',
                });
            }

            // Remarks change
            if (curr.remarks && curr.remarks !== prev.remarks) {
                logs.push({
                    text: `${engr} updated remarks: "${curr.remarks}"`,
                    date,
                    user: curr.engineerName,
                    type: 'remark',
                });
            }
        }

        return logs.reverse(); // Newest first
    };

    if (!isOpen) return null;

    const logs = generateSentences(history);

    const iconForType = (type) => {
        if (type === 'create') return <FiCheckCircle size={10} className="text-white" />;
        if (type === 'remark') return <FiMessageSquare size={10} className="text-white" />;
        return <FiEdit2 size={10} className="text-white" />;
    };

    const colorForType = (type) => {
        if (type === 'create') return 'bg-emerald-500';
        if (type === 'remark') return 'bg-amber-500';
        return 'bg-blue-500';
    };

    const modalContent = (
        <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 h-screen h-[100dvh]">
            <div 
                className="bg-white w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] max-h-[85dvh] animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-blue-600">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center text-white backdrop-blur-md">
                            <LuHistory size={20} />
                        </div>
                        <div>
                            <h2 className="text-sm font-black text-white uppercase tracking-widest">Project Log</h2>
                            <p className="text-[10px] text-blue-100 font-bold uppercase truncate max-w-[220px] sm:max-w-xs">{project?.projectName}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-10 h-10 flex items-center justify-center bg-white/10 text-white rounded-2xl hover:bg-white/20 transition-all border border-white/10"
                    >
                        <LuX size={18} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-blue-50 border-t-blue-600 rounded-full animate-spin"></div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retrieving Logs...</p>
                        </div>
                    ) : error ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <p className="text-[10px] font-black text-red-400 uppercase tracking-widest">{error}</p>
                        </div>
                    ) : logs.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center text-slate-200">
                                <FiActivity size={32} />
                            </div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No activity logged yet</p>
                            <p className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">IPC: {project?.ipc}</p>
                        </div>
                    ) : (
                        <div className="relative pl-6 space-y-6 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-100">
                            {logs.map((log, idx) => (
                                <div key={idx} className="relative group">
                                    {/* Timeline Node */}
                                    <div className={`absolute -left-[30px] w-[22px] h-[22px] rounded-full border-4 border-white shadow-md z-10 flex items-center justify-center ${colorForType(log.type)}`}>
                                        {iconForType(log.type)}
                                    </div>
                                    {/* Log Entry */}
                                    <div className="bg-slate-50/50 p-4 rounded-[1.5rem] border border-slate-100 group-hover:border-blue-100 group-hover:bg-white transition-all">
                                        <div className="flex justify-between items-center mb-2">
                                            <div className="flex items-center gap-2">
                                                <div className="w-5 h-5 rounded-lg bg-blue-100 flex items-center justify-center text-blue-600">
                                                    <LuUser size={10} />
                                                </div>
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-tight">{log.user || 'System'}</span>
                                            </div>
                                            {log.date && (
                                                <div className="flex items-center gap-1.5 text-slate-400">
                                                    <LuCalendar size={10} />
                                                    <span className="text-[9px] font-bold">{log.date}</span>
                                                </div>
                                            )}
                                        </div>
                                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed">
                                            {log.text}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-center pb-safe-bottom">
                    <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">End of Project Activity Log</p>
                </div>
            </div>
        </div>
    );

    return createPortal(modalContent, document.body);
};

export default ProjectLogModal;
