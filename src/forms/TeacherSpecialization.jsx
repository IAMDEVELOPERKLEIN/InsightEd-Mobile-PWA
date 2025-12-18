// src/forms/TeacherSpecialization.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import LoadingScreen from '../components/LoadingScreen';
import { addToOutbox } from '../db'; // 👈 Added Import

const TeacherSpecialization = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isLocked, setIsLocked] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showSaveModal, setShowSaveModal] = useState(false);
    
    const [schoolId, setSchoolId] = useState(null);
    const [formData, setFormData] = useState({});
    const [originalData, setOriginalData] = useState(null);

    const goBack = () => navigate('/school-forms');

    // Init Data
    const subjects = ['english', 'filipino', 'math', 'science', 'ap', 'mapeh', 'esp', 'tle'];
    const ancillary = ['guidance', 'librarian', 'ict_coord', 'drrm_coord'];
    
    const initialFields = {};
    subjects.forEach(s => { initialFields[`spec_${s}_major`] = 0; initialFields[`spec_${s}_teaching`] = 0; });
    ancillary.forEach(a => { initialFields[`spec_${a}`] = 0; });

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const res = await fetch(`/api/teacher-specialization/${user.uid}`);
                    const json = await res.json();
                    if (json.exists) {
                        setSchoolId(json.data.school_id);
                        const db = json.data;
                        const loaded = {};
                        Object.keys(initialFields).forEach(key => loaded[key] = db[key] || 0);
                        
                        setFormData(loaded);
                        setOriginalData(loaded);
                        if (db.spec_math_major > 0 || db.spec_guidance > 0) setIsLocked(true);
                    }
                } catch (e) { console.error(e); }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: parseInt(value) || 0 }));
    };

    const confirmSave = async () => {
        setShowSaveModal(false);
        setIsSaving(true);
        const payload = { schoolId, ...formData };

        // 📴 OFFLINE CHECK
        if (!navigator.onLine) {
            try {
                await addToOutbox({
                    type: 'TEACHER_SPECIALIZATION',
                    label: 'Teacher Specialization',
                    url: '/api/save-teacher-specialization',
                    payload: payload
                });
                alert("📴 You are offline. \n\nData saved to Outbox! Sync when you have internet.");
                setOriginalData({...formData});
                setIsLocked(true);
            } catch (e) { alert("Failed to save offline."); } 
            finally { setIsSaving(false); }
            return;
        }

        // 🌐 ONLINE SAVE
        try {
            const res = await fetch('/api/save-teacher-specialization', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                alert('Saved successfully!');
                setOriginalData({...formData});
                setIsLocked(true);
            } else alert('Failed to save.');
        } catch (e) { alert('Network error.'); } finally { setIsSaving(false); }
    };

    // Components
    const SubjectRow = ({ label, id }) => {
        const major = formData[`spec_${id}_major`];
        const teaching = formData[`spec_${id}_teaching`];
        const mismatch = teaching > major; 

        return (
            <div className="grid grid-cols-5 gap-2 items-center border-b border-gray-100 py-3 last:border-0">
                <div className="col-span-3">
                    <span className="font-bold text-gray-700 text-sm block">{label}</span>
                    {mismatch && <span className="text-[10px] text-orange-500 font-bold flex items-center gap-1">⚠️ Possible mismatch</span>}
                </div>
                <div className="col-span-1 text-center">
                    <input type="number" min="0" name={`spec_${id}_major`} value={major} onChange={handleChange} disabled={isLocked} className="w-12 text-center border rounded-lg py-1 bg-blue-50 text-blue-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Major" />
                </div>
                <div className="col-span-1 text-center">
                    <input type="number" min="0" name={`spec_${id}_teaching`} value={teaching} onChange={handleChange} disabled={isLocked} className="w-12 text-center border rounded-lg py-1 bg-green-50 text-green-900 font-bold focus:ring-2 focus:ring-green-500 outline-none" placeholder="Teach" />
                </div>
            </div>
        );
    };

    if (loading) return <LoadingScreen message="Loading Data..." />;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 relative">
            <div className="bg-[#004A99] px-6 pt-12 pb-24 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={goBack} className="text-white/80 hover:text-white text-2xl transition">←</button>
                    <div><h1 className="text-2xl font-bold text-white">Teacher Specialization</h1><p className="text-blue-200 text-xs mt-1">Subject majors vs. teaching loads</p></div>
                </div>
            </div>

            <div className="px-5 -mt-12 relative z-20 max-w-4xl mx-auto space-y-6">
                
                {/* 1. ANCILLARY SERVICES */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <h2 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2"><span className="text-xl">🛠️</span> Ancillary Services</h2>
                    <div className="grid grid-cols-2 gap-4">
                        {[
                            { l: 'Guidance', k: 'spec_guidance' }, { l: 'Librarian', k: 'spec_librarian' },
                            { l: 'ICT Coord', k: 'spec_ict_coord' }, { l: 'DRRM Coord', k: 'spec_drrm_coord' }
                        ].map((item) => (
                            <div key={item.k} className="bg-gray-50 p-3 rounded-xl flex justify-between items-center border border-gray-100">
                                <span className="text-xs font-bold text-gray-500 uppercase">{item.l}</span>
                                <input type="number" min="0" name={item.k} value={formData[item.k]} onChange={handleChange} disabled={isLocked} className="w-12 text-center bg-white border rounded-lg font-bold" />
                            </div>
                        ))}
                    </div>
                </div>

                {/* 2. CORE SUBJECTS TABLE */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                    <div className="flex justify-between items-end mb-4 border-b pb-2">
                        <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2"><span className="text-xl">📚</span> Core Subjects</h2>
                        <div className="flex gap-4 text-[10px] uppercase font-bold text-gray-400">
                            <span className="text-blue-600">Major</span>
                            <span className="text-green-600">Teaching</span>
                        </div>
                    </div>
                    
                    <SubjectRow label="English" id="english" />
                    <SubjectRow label="Filipino" id="filipino" />
                    <SubjectRow label="Mathematics" id="math" />
                    <SubjectRow label="Science" id="science" />
                    <SubjectRow label="Araling Panlipunan" id="ap" />
                    <SubjectRow label="MAPEH" id="mapeh" />
                    <SubjectRow label="Edukasyon sa Pagpapakatao" id="esp" />
                    <SubjectRow label="TLE / TVL" id="tle" />
                </div>
            </div>

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 pb-8 z-50 flex gap-3 shadow-lg">
                {isLocked ? (
                    <button onClick={() => setShowEditModal(true)} className="w-full bg-amber-500 text-white font-bold py-4 rounded-xl shadow-lg">✏️ Unlock to Edit</button>
                ) : (
                    <>
                        {originalData && <button onClick={() => { setFormData(originalData); setIsLocked(true); }} className="flex-1 bg-gray-100 text-gray-600 font-bold py-4 rounded-xl">Cancel</button>}
                        <button onClick={() => setShowSaveModal(true)} disabled={isSaving} className="flex-[2] bg-[#CC0000] text-white font-bold py-4 rounded-xl shadow-lg">{isSaving ? "Saving..." : "Save Changes"}</button>
                    </>
                )}
            </div>

            {/* Modals */}
            {showEditModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="font-bold text-lg">Unlock Form?</h3><div className="mt-4 flex gap-2"><button onClick={() => setShowEditModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button><button onClick={() => { setIsLocked(false); setShowEditModal(false); }} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold">Unlock</button></div></div></div>}
            {showSaveModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="font-bold text-lg">Save Changes?</h3><div className="mt-4 flex gap-2"><button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button><button onClick={confirmSave} className="flex-1 py-3 bg-[#CC0000] text-white rounded-xl font-bold">Confirm</button></div></div></div>}
        </div>
    );
};

export default TeacherSpecialization;