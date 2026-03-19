import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    FiArrowLeft, 
    FiUploadCloud, 
    FiLink, 
    FiCheckCircle, 
    FiAlertCircle, 
    FiFileText,
    FiLoader,
    FiSearch,
    FiMonitor
} from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import * as XLSX from 'xlsx';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import loadingLogo from "../assets/loading.gif";

const SubmissionLoader = ({ message }) => (
    <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white/80 backdrop-blur-md"
    >
        <div className="flex flex-col items-center gap-6 text-center px-6">
            <div className="w-32 h-32 flex items-center justify-center">
                <img src={loadingLogo} className="w-full h-full object-contain drop-shadow-xl" alt="InsightEd Loading" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-black text-slate-800 italic uppercase tracking-tighter">{message}</h3>
                <div className="flex items-center justify-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-bounce"></span>
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-4">Connecting to InsightEd Secure Cloud</p>
            </div>
        </div>
    </motion.div>
);

const ESF7Draft = () => {
    const navigate = useNavigate();
    const { user } = useAuth();
    const fileInputRef = useRef(null);
    
    const [uploadMode, setUploadMode] = useState('link'); // Default to link
    const [isParsing, setIsParsing] = useState(false);
    const [error, setError] = useState(null);
    const [parsedRecords, setParsedRecords] = useState([]);
    const [parsedData, setParsedData] = useState(null);
    const [driveLink, setDriveLink] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitSuccess, setSubmitSuccess] = useState(false);

    // New State for reflection
    const [existingStatus, setExistingStatus] = useState(null);
    const [existingCount, setExistingCount] = useState(0);
    const [isLoadingStatus, setIsLoadingStatus] = useState(true);
    const [showResubmitInput, setShowResubmitInput] = useState(false);
    const [showConfirmChallenge, setShowConfirmChallenge] = useState(false);
    const [confirmInput, setConfirmInput] = useState('');

    React.useEffect(() => {
        if (user?.school_id) fetchExistingStatus();
    }, [user?.school_id]);

    const fetchExistingStatus = async () => {
        setIsLoadingStatus(true);
        try {
            const res = await fetch(`/api/esf7/records/${user.school_id}`);
            const data = await res.json();
            if (data.success && data.data.length > 0) {
                setExistingStatus(data.data[0].status);
                setExistingCount(data.data.length);
            }
        } catch (err) {
            console.error("Fetch Status Error:", err);
        } finally {
            setIsLoadingStatus(false);
        }
    };

    const handleLinkSubmit = async () => {
        if (!driveLink.includes('drive.google.com')) {
            setError("Please provide a valid Google Drive link.");
            return;
        }
        setIsParsing(true);
        setError(null);

        try {
            const res = await fetch('/api/esf7/extract-preview', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ driveLink })
            });

            const result = await res.json();
            if (!res.ok) throw new Error(result.error || "Failed to extract data from link.");

            const { records, headers, totalRows, sample } = result.data;

            setParsedRecords(records);
            setParsedData({
                totalRows,
                sample,
                headers
            });

        } catch (err) {
            console.error("Extraction Error:", err);
            setError(err.message || "An error occurred during extraction.");
        } finally {
            setIsParsing(false);
        }
    };

    const handleSubmit = async () => {
        if (!parsedRecords.length || !user?.school_id) return;

        setIsSubmitting(true);
        try {
            const res = await fetch('/api/esf7/stage', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    school_id: user.school_id,
                    records: parsedRecords
                })
            });

            if (res.ok) {
                setSubmitSuccess(true);
                setTimeout(() => navigate('/nexus-dashboard'), 2000);
            } else {
                const data = await res.json();
                throw new Error(data.error || "Failed to stage data.");
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <PageTransition>
            <AnimatePresence>
                {(isParsing || isLoadingStatus) && <SubmissionLoader message={isParsing ? "Extracting from Cloud..." : "Syncing with InsightEd Cloud..."} />}
                {isSubmitting && <SubmissionLoader message="Staging your records..." />}
            </AnimatePresence>
            <div className="min-h-screen bg-slate-50 font-sans pb-24">
                {/* --- HEADER --- */}
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
                    <div className="flex items-center gap-4">
                        <button onClick={() => navigate('/nexus-dashboard')} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                            <FiArrowLeft className="w-6 h-6 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase italic">ESF7 Hub</h1>
                            <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Implementation & Monitoring</p>
                        </div>
                    </div>
                </header>

                <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
                    {/* --- STATUS DASHBOARD (Reflection) --- */}
                    {existingStatus && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-white border-2 border-blue-50 rounded-[2.5rem] p-8 shadow-sm space-y-4"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Current Database Status</h3>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-3 h-3 rounded-full animate-pulse ${existingStatus === 'VERIFIED' ? 'bg-emerald-500' : existingStatus === 'REJECTED' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                                        <span className={`text-xl font-black uppercase italic tracking-tighter ${existingStatus === 'VERIFIED' ? 'text-emerald-600' : existingStatus === 'REJECTED' ? 'text-rose-600' : 'text-amber-600'}`}>
                                            {existingStatus.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Records Staged</p>
                                    <p className="text-2xl font-black text-slate-800 tracking-tighter">{existingCount}</p>
                                </div>
                            </div>
                            
                            <div className="pt-4 border-t border-slate-50 flex flex-col gap-4">
                                <p className="text-[10px] font-bold text-slate-400 uppercase leading-relaxed text-center">
                                    {existingStatus === 'VERIFIED' 
                                        ? "Your ESF7 data is officially verified and committed to the master database." 
                                        : existingStatus === 'REJECTED'
                                        ? "This submission was returned by the SDO for corrections. Please re-upload the corrected file."
                                        : "Your data is current pending SDO review."}
                                </p>
                                
                                {(!showResubmitInput && !parsedData && (existingStatus !== 'VERIFIED' || showConfirmChallenge)) && (
                                    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                                        {!showConfirmChallenge ? (
                                            <button 
                                                onClick={() => setShowConfirmChallenge(true)}
                                                className="w-full py-4 bg-slate-900 text-white text-xs font-black rounded-2xl shadow-lg active:scale-95 transition-all uppercase italic tracking-widest flex items-center justify-center gap-3"
                                            >
                                                <FiFileText size={18} className="text-blue-400" />
                                                <span>RESUBMIT DATA</span>
                                            </button>
                                        ) : (
                                            <div className="space-y-4">
                                                {/* --- CLOUD POLICY ADVISORY --- */}
                                                <div className="bg-amber-50 border-2 border-amber-100/50 rounded-2xl p-5 flex items-start gap-4">
                                                    <FiMonitor className="text-amber-500 shrink-0 w-5 h-5 mt-1" />
                                                    <div className="space-y-1">
                                                        <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-tighter italic">Cloud-Only Policy</h4>
                                                        <p className="text-[9px] font-bold text-amber-700/70 leading-relaxed uppercase">
                                                            InsightEd strictly uses cloud links. Ensure your ESF7 file is on <span className="text-blue-600 underline">Google Drive</span> with permissions enabled.
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-xl p-3">
                                                    <input 
                                                        type="text" 
                                                        placeholder="Type 'CONFIRM' to unlock"
                                                        className="bg-transparent border-none outline-none flex-1 text-[10px] font-black text-slate-700 placeholder:text-slate-200 uppercase italic"
                                                        value={confirmInput}
                                                        onChange={(e) => setConfirmInput(e.target.value.toUpperCase())}
                                                    />
                                                    <button 
                                                        onClick={() => {
                                                            if (confirmInput === 'CONFIRM') {
                                                                setShowResubmitInput(true);
                                                                setConfirmInput('');
                                                            }
                                                        }}
                                                        disabled={confirmInput !== 'CONFIRM'}
                                                        className="px-4 py-2 bg-blue-600 text-white text-[10px] font-black rounded-lg disabled:opacity-30 transition-all uppercase italic"
                                                    >
                                                        Unlock
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {/* --- PHASE 1: UPLOAD --- */}
                    {(!existingStatus || showResubmitInput) && !parsedData && (
                        <div className="space-y-6">
                            <div className="text-center space-y-2">
                                <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">
                                    {existingStatus ? 'Phase 1: Update Connection' : 'Phase 1: Cloud Connection'}
                                </h2>
                                <p className="text-sm font-medium text-slate-500">
                                    {existingStatus 
                                        ? "Resubmission Unlocked. Paste the new Google Drive link below." 
                                        : "Paste your ESF7 Google Drive link to start the automated extraction."}
                                </p>
                            </div>

                            <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-white border-2 border-slate-100 rounded-[2.5rem] p-10 shadow-xl shadow-slate-200/50 space-y-6"
                            >
                                <div className="flex items-center gap-4 bg-slate-50 border border-slate-200 rounded-2xl p-5 hover:border-blue-300 transition-colors">
                                    <FiLink className="text-blue-500 w-6 h-6" />
                                    <input 
                                        type="text" 
                                        placeholder="Paste Google Drive Link"
                                        className="bg-transparent border-none outline-none flex-1 text-sm font-bold text-slate-700 placeholder:text-slate-300"
                                        value={driveLink}
                                        onChange={(e) => setDriveLink(e.target.value)}
                                        disabled={isParsing}
                                    />
                                </div>
                                <button 
                                    onClick={handleLinkSubmit}
                                    disabled={isParsing || !driveLink}
                                    className="w-full py-5 bg-[#004A99] text-white font-black rounded-2xl shadow-lg shadow-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 italic"
                                >
                                    {isParsing ? (
                                        <>
                                            <FiLoader className="animate-spin" />
                                            <span>CONNECTING TO DRIVE...</span>
                                        </>
                                    ) : (
                                        <>
                                            <FiUploadCloud />
                                            <span>EXTRACT FROM CLOUD</span>
                                        </>
                                    )}
                                </button>
                            </motion.div>

                            {error && (
                                <motion.div 
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="bg-rose-50 border border-rose-100 p-4 rounded-2xl flex items-center gap-3 text-rose-700 text-xs font-bold"
                                >
                                    <FiAlertCircle className="shrink-0" />
                                    <p>{error}</p>
                                </motion.div>
                            )}
                        </div>
                    )}

                    {/* --- PHASE 2: PREVIEW & STAGING --- */}
                    {parsedData && (
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="space-y-8"
                        >
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase italic">Phase 2: X-Ray Preview</h2>
                                    <div className="flex items-center gap-2">
                                        <FiCheckCircle className="text-emerald-500" />
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest underline decoration-emerald-200 underline-offset-4 decoration-2">Successfully Mapped {parsedData.totalRows} Personnel</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setParsedData(null)}
                                    className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest border border-slate-200 px-3 py-1.5 rounded-full transition-colors font-sans"
                                >
                                    Reset
                                </button>
                            </div>

                            {/* Preview Grid */}
                            <div className="bg-white border border-slate-100 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-slate-200/50">
                                <div className="bg-slate-900 px-6 py-4 flex items-center justify-between">
                                    <span className="text-[10px] font-black text-blue-400 uppercase tracking-widest">Staging Database Preview (Draft)</span>
                                    <FiSearch className="text-slate-500" />
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50 border-b border-slate-100">
                                                {parsedData.headers.slice(0, 5).map((h, i) => (
                                                    <th key={i} className="px-6 py-4 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">{h || '-'}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-50">
                                            {parsedData.sample.map((row, i) => (
                                                <tr key={i} className="hover:bg-blue-50/30 transition-colors">
                                                    {row.slice(0, 5).map((cell, ci) => (
                                                        <td key={ci} className="px-6 py-4 text-xs font-bold text-slate-700 truncate max-w-[120px]">
                                                            {cell || '-'}
                                                        </td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                                    <p className="text-[10px] font-bold text-slate-400 italic">Showing 5 of {parsedData.totalRows} records extracted from cloud link.</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <button 
                                    onClick={handleSubmit}
                                    disabled={isSubmitting || submitSuccess}
                                    className={`w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-black rounded-[2rem] shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-3 uppercase italic tracking-tight ${isSubmitting || submitSuccess ? 'opacity-70 cursor-not-allowed' : ''}`}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <FiLoader className="animate-spin" />
                                            <span>Staging Data...</span>
                                        </>
                                    ) : submitSuccess ? (
                                        <>
                                            <FiCheckCircle />
                                            <span>Successfully Staged!</span>
                                        </>
                                    ) : (
                                        <>
                                            <span>Submit for SDO Review</span>
                                            <FiCheckCircle size={20} />
                                        </>
                                    )}
                                </button>
                                <p className="text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                                    {submitSuccess ? 'Redirecting to Nexus...' : 'Data will be staged as PENDING_SDO'}
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* --- HELP CARD / RESUBMIT --- */}
                    {existingStatus === 'VERIFIED' ? (
                        <div className="bg-emerald-50 border-2 border-emerald-100 rounded-[2.5rem] p-10 flex items-start gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/30 rounded-full blur-2xl"></div>
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-emerald-50 shrink-0">
                                <FiCheckCircle className="text-emerald-500 w-8 h-8" />
                            </div>
                            <div className="space-y-3 flex-1">
                                <div className="space-y-1">
                                    <h4 className="text-sm font-black text-emerald-700 uppercase tracking-tighter">Officially Verified</h4>
                                    <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                        Your ESF7 data has been committed to the master database by the SDO. No further action is required.
                                    </p>
                                </div>
                                <button
                                    onClick={() => { setShowConfirmChallenge(true); setShowResubmitInput(false); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className="text-[10px] font-black text-emerald-700 border border-emerald-200 bg-white px-4 py-2 rounded-full uppercase tracking-widest hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all"
                                >
                                    Request Resubmission
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-[#004A99]/5 border-2 border-blue-100 rounded-[2.5rem] p-10 flex items-start gap-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-100/30 rounded-full blur-2xl"></div>
                            <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center shadow-lg border border-blue-50 shrink-0">
                                <FiMonitor className="text-blue-500 w-8 h-8" />
                            </div>
                            <div className="space-y-1">
                                <h4 className="text-sm font-black text-[#004A99] uppercase tracking-tighter">Cloud-Only Policy</h4>
                                <p className="text-xs font-medium text-slate-500 leading-relaxed">
                                    InsightEd now strictly uses cloud links for data integrity. Please ensure your ESF7 file is hosted on <span className="text-blue-600 font-bold">Google Drive</span> with viewing permissions enabled.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageTransition>
    );
};

export default ESF7Draft;
