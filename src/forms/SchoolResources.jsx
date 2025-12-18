// src/forms/SchoolResources.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import LoadingScreen from '../components/LoadingScreen';
import { addToOutbox } from '../db'; // 👈 Added Import

const SchoolResources = () => {
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

    // Init Data Structure
    const initialFields = {
        res_armchairs_good: 0, res_armchairs_repair: 0,
        res_teacher_tables_good: 0, res_teacher_tables_repair: 0,
        res_blackboards_good: 0, res_blackboards_defective: 0,
        res_desktops_instructional: 0, res_desktops_admin: 0,
        res_laptops_teachers: 0, res_tablets_learners: 0,
        res_printers_working: 0, res_projectors_working: 0,
        res_internet_type: '',
        res_toilets_male: 0, res_toilets_female: 0, res_toilets_pwd: 0,
        res_faucets: 0, res_water_source: '',
        res_sci_labs: 0, res_com_labs: 0, res_tvl_workshops: 0
    };

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                try {
                    const res = await fetch(`/api/school-resources/${user.uid}`);
                    const json = await res.json();
                    if (json.exists) {
                        setSchoolId(json.data.school_id);
                        const db = json.data;
                        
                        // Map DB columns to State
                        const loaded = {};
                        Object.keys(initialFields).forEach(key => loaded[key] = db[key] || (typeof initialFields[key] === 'string' ? '' : 0));
                        
                        setFormData(loaded);
                        setOriginalData(loaded);
                        
                        if (db.res_armchairs_good > 0 || db.res_toilets_male > 0) setIsLocked(true);
                    }
                } catch (e) { console.error(e); }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? (parseInt(value) || 0) : value }));
    };

    const confirmSave = async () => {
        setShowSaveModal(false);
        setIsSaving(true);
        const payload = { schoolId, ...formData };

        // 📴 OFFLINE CHECK
        if (!navigator.onLine) {
            try {
                await addToOutbox({
                    type: 'SCHOOL_RESOURCES',
                    label: 'School Resources',
                    url: '/api/save-school-resources',
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
            const res = await fetch('/api/save-school-resources', {
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

    // UI Helpers
    const Section = ({ title, emoji, children }) => (
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6">
            <h2 className="text-gray-800 font-bold text-lg mb-4 flex items-center gap-2">
                <span className="text-xl">{emoji}</span> {title}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">{children}</div>
        </div>
    );

    const NumberInput = ({ label, name, color = "blue" }) => (
        <div className="flex justify-between items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide w-1/2">{label}</label>
            <input 
                type="number" min="0" name={name} value={formData[name]} onChange={handleChange} disabled={isLocked}
                className={`w-20 text-center font-bold text-lg bg-white border border-gray-200 rounded-lg py-1 focus:ring-2 focus:ring-${color}-500 outline-none`}
            />
        </div>
    );

    const Dropdown = ({ label, name, options }) => (
        <div className="md:col-span-2 bg-gray-50 p-3 rounded-xl border border-gray-100 flex items-center justify-between">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
            <select name={name} value={formData[name]} onChange={handleChange} disabled={isLocked} className="bg-white border border-gray-200 rounded-lg py-2 px-4 text-sm font-bold text-gray-700 outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">None / Select</option>
                {options.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
        </div>
    );

    if (loading) return <LoadingScreen message="Loading Resources..." />;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 relative">
            <div className="bg-[#004A99] px-6 pt-12 pb-24 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={goBack} className="text-white/80 hover:text-white text-2xl transition">←</button>
                    <div><h1 className="text-2xl font-bold text-white">School Resources</h1><p className="text-blue-200 text-xs mt-1">Inventory of assets and facilities</p></div>
                </div>
            </div>

            <div className="px-5 -mt-12 relative z-20 max-w-4xl mx-auto">
                <form onSubmit={e => e.preventDefault()}>
                    <Section title="Furniture" emoji="🪑">
                        <NumberInput label="Armchairs (Good)" name="res_armchairs_good" />
                        <NumberInput label="Armchairs (Repair)" name="res_armchairs_repair" color="amber" />
                        <NumberInput label="Teacher Tables (Good)" name="res_teacher_tables_good" />
                        <NumberInput label="Teacher Tables (Repair)" name="res_teacher_tables_repair" color="amber" />
                        <NumberInput label="Blackboards (Good)" name="res_blackboards_good" />
                        <NumberInput label="Blackboards (Defective)" name="res_blackboards_defective" color="red" />
                    </Section>

                    <Section title="ICT Equipment" emoji="💻">
                        <NumberInput label="Desktop PCs (Instructional)" name="res_desktops_instructional" />
                        <NumberInput label="Desktop PCs (Admin)" name="res_desktops_admin" />
                        <NumberInput label="Teacher Laptops (Gov't)" name="res_laptops_teachers" />
                        <NumberInput label="Learner Tablets" name="res_tablets_learners" />
                        <NumberInput label="Functional Printers" name="res_printers_working" />
                        <NumberInput label="Projectors / TVs" name="res_projectors_working" />
                        <Dropdown label="Internet Connection" name="res_internet_type" options={["Fiber", "DSL", "Mobile Data", "Satellite", "None"]} />
                    </Section>

                    <Section title="WASH Facilities" emoji="🚰">
                        <NumberInput label="Male Toilets" name="res_toilets_male" />
                        <NumberInput label="Female Toilets" name="res_toilets_female" />
                        <NumberInput label="PWD Restrooms" name="res_toilets_pwd" />
                        <NumberInput label="Handwashing Faucets" name="res_faucets" />
                        <Dropdown label="Water Source" name="res_water_source" options={["Local Piped", "Deep Well", "Rainwater Collector", "Truck Delivery", "None"]} />
                    </Section>

                    <Section title="Learning Spaces" emoji="🏫">
                        <NumberInput label="Science Laboratories" name="res_sci_labs" />
                        <NumberInput label="Computer Labs (E-Class)" name="res_com_labs" />
                        <NumberInput label="TVL Workshops" name="res_tvl_workshops" />
                    </Section>
                </form>
            </div>

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

            {showEditModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="font-bold text-lg">Unlock Form?</h3><div className="mt-4 flex gap-2"><button onClick={() => setShowEditModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button><button onClick={() => { setIsLocked(false); setShowEditModal(false); }} className="flex-1 py-3 bg-amber-500 text-white rounded-xl font-bold">Unlock</button></div></div></div>}
            {showSaveModal && <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6 backdrop-blur-sm"><div className="bg-white p-6 rounded-2xl w-full max-w-sm"><h3 className="font-bold text-lg">Save Changes?</h3><div className="mt-4 flex gap-2"><button onClick={() => setShowSaveModal(false)} className="flex-1 py-3 border rounded-xl">Cancel</button><button onClick={confirmSave} className="flex-1 py-3 bg-[#CC0000] text-white rounded-xl font-bold">Confirm</button></div></div></div>}
        </div>
    );
};

export default SchoolResources;