import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import SchoolLocation from '../../forms/SchoolLocation';
import BottomNav from '../../modules/BottomNav';
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";

const Unit9SchoolLocation = () => {
    const navigate = useNavigate();
    const formRef = React.useRef();
    const [initialDraft, setInitialDraft] = React.useState(null);
    const [showWelcomeBack, setShowWelcomeBack] = React.useState(false);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem('schoolId');
            if (!storedId) {
                setLoading(false);
                return;
            }

            try {
                // Check for Draft First
                const draft = await getUnitDraft(9, storedId);
                if (draft) {
                    setInitialDraft(draft);
                    setShowWelcomeBack(true);
                    setTimeout(() => setShowWelcomeBack(false), 3000);
                }
                
                // Note: SchoolLocation internal useEffect fetches db record if no draft values provided
            } catch (err) {
                console.error("Initialization error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleBack = () => {
        navigate('/modular-dashboard');
    };

    const handleSaveDraftAndExit = async () => {
        const storedId = localStorage.getItem('schoolId');
        if (!storedId || !formRef.current) return;

        const draftData = {
            formData: formRef.current.getFormData(),
            currentStep: formRef.current.getCurrentStep()
        };
        await saveUnitDraft(9, storedId, draftData);
        navigate('/modular-dashboard');
    };

    const handleSaveSuccess = async () => {
        const storedId = localStorage.getItem('schoolId');
        // Update localStorage so ModularDashboard immediately reflects completion
        const stored = localStorage.getItem('quest_progress');
        let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
        if (!progress.completedUnits.includes(9)) {
            progress.completedUnits.push(9);
            progress.xp = (progress.xp || 0) + 500;
        }
        localStorage.setItem('quest_progress', JSON.stringify(progress));
        if (storedId) await clearUnitDraft(9, storedId);
        navigate('/modular-dashboard');
    };

    return (
        <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            className="min-h-screen bg-slate-50 font-sans pb-32"
        >
            <header className="sticky top-0 z-50 w-full bg-white/95 backdrop-blur-md rounded-b-[2rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border-b border-slate-100 px-4 py-4 sm:px-6">
                <div className="max-w-md mx-auto relative flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleBack}
                            className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-slate-100 text-slate-500 transition-colors"
                            aria-label="Go back"
                        >
                            <FiArrowLeft className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="flex flex-col items-center absolute left-1/2 -translate-x-1/2 pointer-events-none">
                        <h1 className="text-lg font-black text-[#004A99] tracking-tight text-center">
                            Unit 9: <span className="text-[#FDB913]">SHA Hub</span>
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5 whitespace-nowrap">Special Hardship Allowance</p>
                    </div>

                    <div className="w-10" />
                </div>
            </header>

            {/* Welcome Back Toast */}
            <AnimatePresence>
                {showWelcomeBack && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed top-20 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-2xl text-[13px] font-bold flex items-center gap-2 z-[60]">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping" />
                        Recovered your draft!
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="max-w-md mx-auto px-4 pt-6">
                {!loading && (
                    <SchoolLocation 
                        ref={formRef}
                        schoolId={localStorage.getItem('schoolId')} 
                        onSaveSuccess={handleSaveSuccess}
                        onSaveDraft={handleSaveDraftAndExit}
                        initialValues={initialDraft}
                    />
                )}
            </main>

            <BottomNav userRole="School Head" />
        </motion.div>
    );
};

export default Unit9SchoolLocation;
