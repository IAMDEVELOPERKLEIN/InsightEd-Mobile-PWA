import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft, FiTarget, FiBox, FiCheckCircle } from 'react-icons/fi';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';

const NSPPDraft = () => {
    const navigate = useNavigate();

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 font-sans pb-20">
                <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 sticky top-0 z-50">
                    <button onClick={() => navigate(-1)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <FiArrowLeft className="w-6 h-6 text-slate-600" />
                    </button>
                    <h1 className="text-xl font-black text-slate-800 tracking-tight">NSPP Assessment</h1>
                </header>

                <div className="px-6 pt-12 text-center max-w-md mx-auto space-y-8">
                    <div className="mx-auto w-24 h-24 bg-orange-100 rounded-full flex items-center justify-center text-orange-600 shadow-inner">
                        <FiTarget size={48} />
                    </div>

                    <div className="space-y-4">
                        <h2 className="text-3xl font-black text-slate-800 tracking-tighter uppercase leading-none">Drafting Module</h2>
                        <p className="text-sm font-medium text-slate-500 leading-relaxed">
                            The **National School Priority Programs** assessment is coming soon. 
                            This module will help align your school's strategic priorities with national goals.
                        </p>
                    </div>

                    <div className="bg-white p-6 rounded-[2.5rem] shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4 text-left">
                        <h3 className="text-xs font-black uppercase tracking-widest text-[#004A99] mb-4">Coming Features:</h3>
                        <ul className="space-y-3">
                            {['Priority Project Alignment', 'Impact Evaluation Tools', 'Community Partnership Logs', 'Resource Gap Analysis'].map((f, i) => (
                                <li key={i} className="flex items-center gap-3 text-sm font-bold text-slate-700">
                                    <FiCheckCircle className="text-orange-500" />
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div className="flex flex-col items-center gap-4 bg-orange-50 p-6 rounded-[2.5rem] border border-orange-100">
                         <div className="text-5xl grayscale opacity-60 select-none">🦁</div>
                         <p className="text-xs font-black text-orange-700 uppercase tracking-widest text-center">
                             "Aligning your vision with national impact! This will be worth the wait."
                         </p>
                    </div>

                    <button 
                        onClick={() => navigate('/nexus-dashboard')}
                        className="w-full py-4 bg-[#004A99] text-white font-black rounded-2xl shadow-lg shadow-blue-900/20 active:scale-95 transition-all"
                    >
                        RETURN TO NEXUS
                    </button>
                </div>
            </div>
        </PageTransition>
    );
};

export default NSPPDraft;
