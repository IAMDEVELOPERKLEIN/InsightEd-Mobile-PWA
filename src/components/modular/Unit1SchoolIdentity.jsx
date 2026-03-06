import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2, FiArrowLeft, FiUnlock } from "react-icons/fi";
import { saveUnit1Draft, getUnit1Draft, clearUnit1Draft } from "../../db";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import LocationPickerMap from "../LocationPickerMap";
import locationData from "../../locations.json";

const TOTAL_STEPS = 5;

const chunkyInput = "w-full p-4 mt-2 bg-white border-2 border-gray-100 rounded-3xl text-lg font-semibold text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm placeholder:text-gray-300";
const chunkySelect = "w-full p-4 mt-2 bg-white border-2 border-gray-100 rounded-3xl text-lg font-semibold text-gray-800 focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-50 transition-all shadow-sm appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20width%3D%2220%22%20height%3D%2220%22%20viewBox%3D%220%200%2020%2020%22%20fill%3D%22none%22%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%3E%3Cpath%20d%3D%22M5%207L10%2012L15%207%22%20stroke%3D%22%236B7280%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22/%3E%3C/svg%3E')] bg-[length:24px] bg-[right_1rem_center] bg-no-repeat disabled:opacity-50 disabled:bg-gray-50";

// ── Skeleton Loaders ─────────────────────────────────────────────────────────
const Pulse = ({ className }) => <div className={`animate-pulse bg-slate-200 rounded-3xl ${className}`} />;

const SkeletonWizard = () => (
    <div className="min-h-screen bg-white flex flex-col font-sans">
        <header className="px-6 py-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-gray-100" />
            <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full w-1/5 bg-gray-200 animate-pulse" />
            </div>
        </header>
        <main className="flex-1 p-6 space-y-8">
            <div className="space-y-3">
                <Pulse className="h-10 w-3/4" />
                <Pulse className="h-6 w-1/2" />
            </div>
            <div className="space-y-4 pt-4">
                <Pulse className="h-20 w-full" />
                <Pulse className="h-20 w-full" />
            </div>
        </main>
        <footer className="p-6">
            <Pulse className="h-16 w-full" />
        </footer>
    </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const Unit1SchoolIdentity = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [showIernModal, setShowIernModal] = useState(false);
    const [fetchedIern, setFetchedIern] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [isModeLoading, setIsModeLoading] = useState(true);

    const [formData, setFormData] = useState({
        school_id: "",
        school_name: "",
        region: "",
        province: "",
        municipality: "",
        barangay: "",
        division: "",
        district: "",
        leg_district: "",
        curricular_offering: "",
        latitude: "",
        longitude: "",
        iern: "",
        school_head: "",
        contact_number: "",
    });

    const [provinceOptions, setProvinceOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [barangayOptions, setBarangayOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [legDistrictOptions, setLegDistrictOptions] = useState([]);

    // ── PARALLEL data-fetch on mount ────────────────────────────────────────
    useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem("schoolId");
            if (!storedId) {
                const draft = await getUnit1Draft("draft_unit_1");
                if (draft) {
                    setFormData(prev => ({ ...prev, ...draft.formData }));
                    setCurrentStep(Math.min(draft.step, TOTAL_STEPS - 1));
                    setShowWelcomeBack(true);
                    setTimeout(() => setShowWelcomeBack(false), 3000);
                }
                setIsModeLoading(false);
                return;
            }

            // Kick off both fetches simultaneously
            const [savedRes, iernRes] = await Promise.all([
                fetch(`/api/ph_schools/${storedId}`).catch(() => null),
                fetch(`/api/schools_iern/${storedId}`).catch(() => null),
            ]);

            let d = null;
            let iernRow = null;

            if (savedRes?.ok) {
                const txt = await savedRes.text();
                if (txt) {
                    try {
                        const parsed = JSON.parse(txt);
                        if (parsed.exists && parsed.data) d = parsed.data;
                    } catch(e) {}
                }
            }
            if (iernRes?.ok) {
                const j = await iernRes.json();
                if (j.exists && j.data) iernRow = j.data;
            }

            if (d && d.unit1_completed) {
                // Merge saved + iern data
                const merged = {
                    school_id:           d.school_id || storedId,
                    school_name:         d.school_name || iernRow?.School_Name || "",
                    iern:                d.iern || iernRow?.iern || "",
                    region:              d.region || iernRow?.Region || "",
                    province:            d.province || iernRow?.Province || "",
                    municipality:        d.municipality || iernRow?.Municipality || iernRow?.City || "",
                    barangay:            d.barangay || iernRow?.Barangay || "",
                    division:            d.division || iernRow?.Division || "",
                    district:            d.district || iernRow?.District || "",
                    leg_district:        d.leg_district || iernRow?.Legislative_District || "",
                    curricular_offering: d.curricular_offering || iernRow?.Curricular_Offering || "",
                    latitude:            d.latitude || iernRow?.Latitude || "",
                    longitude:           d.longitude || iernRow?.Longitude || "",
                    school_head:         d.school_head || "",
                    contact_number:      d.contact_number || "",
                };
                setFormData(merged);

                // Pre-populate location dropdowns
                if (merged.region && locationData?.[merged.region]) {
                    setProvinceOptions(Object.keys(locationData[merged.region]).sort());
                    if (merged.province && locationData[merged.region][merged.province]) {
                        setCityOptions(Object.keys(locationData[merged.region][merged.province]).sort());
                        if (merged.municipality && locationData[merged.region][merged.province][merged.municipality]) {
                            setBarangayOptions(locationData[merged.region][merged.province][merged.municipality].sort());
                        }
                    }
                }
                if (merged.region) {
                    const [divRes, legRes] = await Promise.all([
                        fetch(`/api/locations/divisions?region=${encodeURIComponent(merged.region)}`).catch(() => null),
                        fetch(`/api/locations/leg-districts?region=${encodeURIComponent(merged.region)}`).catch(() => null),
                    ]);
                    if (divRes?.ok) setDivisionOptions(await divRes.json());
                    if (legRes?.ok) setLegDistrictOptions(await legRes.json());
                    if (merged.division) {
                        const distRes = await fetch(`/api/locations/districts?region=${encodeURIComponent(merged.region)}&division=${encodeURIComponent(merged.division)}`).catch(() => null);
                        if (distRes?.ok) setDistrictOptions(await distRes.json());
                    }
                }
                setIsReviewMode(true);
                setIsModeLoading(false);
                return;
            }

            // Not yet completed — check draft or auto-fill
            const draft = await getUnit1Draft("draft_unit_1");
            if (draft) {
                setFormData(prev => ({ ...prev, ...draft.formData }));
                setCurrentStep(Math.min(draft.step, TOTAL_STEPS - 1));
                setShowWelcomeBack(true);
                setTimeout(() => setShowWelcomeBack(false), 3000);
            } else {
                setFormData(prev => ({ ...prev, school_id: storedId }));
                if (iernRow) {
                    setFormData(prev => ({
                        ...prev,
                        school_id:           storedId,
                        school_name:         iernRow.School_Name || prev.school_name,
                        region:              iernRow.Region || prev.region,
                        province:            iernRow.Province || prev.province,
                        municipality:        iernRow.Municipality || iernRow.City || prev.municipality,
                        barangay:            iernRow.Barangay || prev.barangay,
                        division:            iernRow.Division || prev.division,
                        district:            iernRow.District || prev.district,
                        leg_district:        iernRow.Legislative_District || prev.leg_district,
                        curricular_offering: iernRow.Curricular_Offering || prev.curricular_offering,
                        latitude:            iernRow.Latitude || prev.latitude,
                        longitude:           iernRow.Longitude || prev.longitude,
                        iern:                iernRow.iern || prev.iern,
                    }));
                    setFetchedIern(iernRow.iern || "");
                    if (iernRow.iern) setShowIernModal(true);
                }
            }
            setIsModeLoading(false);
        };
        init();
    }, []);

    // ── Logic sync ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!formData.region || !locationData?.[formData.region]) return;
        setProvinceOptions(Object.keys(locationData[formData.region]).sort());
    }, [formData.region]);

    useEffect(() => {
        if (!formData.region || !formData.province) return;
        const opts = locationData?.[formData.region]?.[formData.province];
        if (opts) setCityOptions(Object.keys(opts).sort());
    }, [formData.region, formData.province]);

    useEffect(() => {
        if (!formData.region || !formData.province || !formData.municipality) return;
        const opts = locationData?.[formData.region]?.[formData.province]?.[formData.municipality];
        if (opts) setBarangayOptions(opts.sort());
    }, [formData.region, formData.province, formData.municipality]);

    useEffect(() => {
        if (!formData.region) { setDivisionOptions([]); setLegDistrictOptions([]); return; }
        Promise.all([
            fetch(`/api/locations/divisions?region=${encodeURIComponent(formData.region)}`).then(r => r.json()).catch(() => []),
            fetch(`/api/locations/leg-districts?region=${encodeURIComponent(formData.region)}`).then(r => r.json()).catch(() => []),
        ]).then(([divs, legs]) => { setDivisionOptions(divs); setLegDistrictOptions(legs); });
    }, [formData.region]);

    useEffect(() => {
        if (!formData.region || !formData.division) { setDistrictOptions([]); return; }
        fetch(`/api/locations/districts?region=${encodeURIComponent(formData.region)}&division=${encodeURIComponent(formData.division)}`)
            .then(r => r.json()).then(setDistrictOptions).catch(() => {});
    }, [formData.region, formData.division]);

    useEffect(() => {
        if (!isModeLoading) {
            saveUnit1Draft("draft_unit_1", { formData, step: currentStep });
        }
    }, [formData, currentStep, isModeLoading]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleRegionChange = (e) => setFormData(prev => ({ ...prev, region: e.target.value, province: "", municipality: "", barangay: "", division: "", district: "" }));
    const handleProvinceChange = (e) => setFormData(prev => ({ ...prev, province: e.target.value, municipality: "", barangay: "" }));
    const handleCityChange = (e) => setFormData(prev => ({ ...prev, municipality: e.target.value, barangay: "" }));
    const handleDivisionChange = (e) => setFormData(prev => ({ ...prev, division: e.target.value, district: "" }));

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
        else navigate("/modular-dashboard");
    };

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS - 1) setCurrentStep(s => s + 1);
        else handleSubmit();
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            let finalIern = formData.iern;
            if (!finalIern && formData.school_id) {
                const r = await fetch(`/api/schools_iern/${formData.school_id}`).catch(() => null);
                if (r?.ok) { const j = await r.json(); if (j.exists && j.data?.iern) finalIern = j.data.iern; }
            }
            const res = await fetch("/api/ph_schools/unit1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...formData, iern: finalIern || null }),
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            await clearUnit1Draft("draft_unit_1");
            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(1)) { progress.completedUnits.push(1); progress.xp += 150; localStorage.setItem("quest_progress", JSON.stringify(progress)); }
            localStorage.setItem("schoolId", formData.school_id);
            localStorage.setItem("schoolOffering", formData.curricular_offering);
            setShowSuccess(true);
        } catch (err) {
            console.error("Submit failed:", err);
            alert("Failed to sync. Progress saved locally.");
        } finally {
            setLoading(false);
        }
    };

    const progressPercentage = ((currentStep + 1) / TOTAL_STEPS) * 100;

    const stepInfo = [
        { q: "What's the school's ID?", sub: "Enter the 6-digit DepEd School ID to identify your school." },
        { q: "Confirm the school name", sub: "Is this the official name of the institution?" },
        { q: "Where is the school located?", sub: "Select the specific region, division, and district details." },
        { q: "What does the school offer?", sub: "Choose the curricular levels provided by the school." },
        { q: "Pin the school 📍", sub: "Confirm the coordinates to update the school's map registry." },
    ];

    const isStep0Valid = formData.school_id.length === 6 && /^\d+$/.test(formData.school_id);
    const isStep1Valid = formData.school_name.trim().length > 3;
    const isStep2Valid = formData.region && formData.province && formData.municipality && formData.barangay && formData.division && formData.district && formData.leg_district;
    const isStep3Valid = formData.curricular_offering !== "";
    const isStep4Valid = formData.latitude !== "" && formData.longitude !== "";
    const isCurrentStepValid = () => {
        if (currentStep === 0) return isStep0Valid;
        if (currentStep === 1) return isStep1Valid;
        if (currentStep === 2) return isStep2Valid;
        if (currentStep === 3) return isStep3Valid;
        if (currentStep === 4) return isStep4Valid;
        return false;
    };

    if (isModeLoading) return <SkeletonWizard />;

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 overflow-hidden">
            
            {/* Minimal Header */}
            <header className="px-6 py-5 flex items-center justify-between">
                <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
                    <FiArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex-1 max-w-[120px] mx-4 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div className="h-full bg-blue-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.8, ease: "circOut" }} />
                </div>
                <span className="text-xs font-black tracking-widest text-gray-300 uppercase">Step {currentStep + 1}/{TOTAL_STEPS}</span>
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

            <main className="flex-1 relative overflow-y-auto px-6 pt-4 pb-32">
                <AnimatePresence mode="wait">
                    {isReviewMode ? (
                        <motion.div key="review" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md mx-auto pb-32">
                            {/* Header */}
                            <div className="text-center mb-10">
                                <motion.div 
                                    initial={{ scale: 0 }} 
                                    animate={{ scale: 1 }} 
                                    className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200"
                                >
                                    <span className="text-4xl">🏢</span>
                                </motion.div>
                                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm">
                                    Unit 1 • School Identity
                                </span>
                                <h1 className="text-4xl font-black text-slate-800 leading-tight">Profile Summary</h1>
                                <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                            </div>

                            {/* Metric Cards Grid */}
                            <div className="grid grid-cols-2 gap-4 mb-8">
                                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                                        📄
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">School ID</span>
                                    <span className="text-2xl font-black text-slate-800 mt-1">{formData.school_id || "N/A"}</span>
                                </div>
                                <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 flex flex-col items-center text-center">
                                    <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center mb-3 shadow-inner text-xl">
                                        🏷️
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">IERN</span>
                                    <span className="text-2xl font-black text-slate-800 mt-1">{formData.iern || "N/A"}</span>
                                </div>
                            </div>

                            {/* Detailed Breakdown */}
                            <div className="space-y-6">
                                <section>
                                    <div className="flex items-center gap-2 mb-4 ml-2">
                                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Registry Details</h3>
                                    </div>
                                    <div className="grid gap-3">
                                        <div className="bg-white rounded-2xl p-4 border border-slate-50 flex items-center justify-between shadow-sm">
                                            <div className="flex flex-col max-w-[70%]">
                                                <span className="font-bold text-slate-700 text-lg line-clamp-1">{formData.school_name || "N/A"}</span>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase">Official Name</span>
                                            </div>
                                            <div className="bg-indigo-50 px-3 py-2 rounded-xl text-center">
                                                <span className="text-xl">🏫</span>
                                            </div>
                                        </div>
                                        <div className="bg-white rounded-2xl p-4 border border-slate-50 flex items-center justify-between shadow-sm">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-slate-700">{formData.division || "N/A"}</span>
                                                <span className="text-[10px] text-slate-400 font-medium uppercase">Division</span>
                                            </div>
                                            <div className="bg-purple-50 px-3 py-2 rounded-xl">
                                                <span className="font-black text-purple-700 text-sm">{formData.region || "Req"}</span>
                                            </div>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Unlock Action */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-12"
                            >
                                <button 
                                    onClick={() => { setIsReviewMode(false); setCurrentStep(0); }}
                                    className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <FiUnlock className="w-5 h-5 text-indigo-700" />
                                    </div>
                                    <span>Unlock to Edit Identity</span>
                                </button>
                                <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4">
                                    Note: Unlocking will allow you to update demographic targets.
                                </p>
                            </motion.div>
                        </motion.div>
                    ) : (
                        <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.4, ease: "circOut" }}
                            className="max-w-md mx-auto h-full flex flex-col">
                            
                            <div className="space-y-2 mb-8">
                                <h1 className="text-3xl font-black text-gray-900 leading-tight">{stepInfo[currentStep].q}</h1>
                                <p className="text-gray-500 font-medium leading-relaxed">{stepInfo[currentStep].sub}</p>
                            </div>

                            <div className="space-y-6">
                                {currentStep === 0 && (
                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">6-Digit School ID</label>
                                            <div className="relative">
                                                <input type="tel" name="school_id" value={formData.school_id} onChange={handleChange} maxLength={6} placeholder="e.g. 101010" className={chunkyInput} autoFocus />
                                                {isStep0Valid && <FiCheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />}
                                            </div>
                                        </div>
                                        {formData.iern && (
                                            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="p-5 bg-emerald-50 border-2 border-emerald-100 rounded-3xl flex items-center gap-4">
                                                <div className="w-10 h-10 bg-emerald-500 rounded-full flex items-center justify-center text-white font-bold">✓</div>
                                                <div>
                                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-0.5">IERN Verified</p>
                                                    <p className="text-lg font-black text-emerald-900 tracking-wider">{formData.iern}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                    </div>
                                )}

                                {currentStep === 1 && (
                                    <div>
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Full School Name</label>
                                        <input type="text" name="school_name" value={formData.school_name} onChange={handleChange} placeholder="Official Name" className={chunkyInput} autoFocus />
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Region</label>
                                                <select name="region" value={formData.region} onChange={handleRegionChange} className={chunkySelect}>
                                                    <option value="">Choose Region</option>
                                                    {Object.keys(locationData).sort().map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Province</label>
                                                    <select name="province" value={formData.province} onChange={handleProvinceChange} className={chunkySelect} disabled={!formData.region}>
                                                        <option value="">Select</option>
                                                        {provinceOptions.map(p => <option key={p}>{p}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Municipality</label>
                                                    <select name="municipality" value={formData.municipality} onChange={handleCityChange} className={chunkySelect} disabled={!formData.province}>
                                                        <option value="">Select</option>
                                                        {cityOptions.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Division</label>
                                                <select name="division" value={formData.division} onChange={handleDivisionChange} className={chunkySelect} disabled={!formData.region}>
                                                    <option value="">Select Division</option>
                                                    {divisionOptions.map(d => <option key={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">District</label>
                                                    <select name="district" value={formData.district} onChange={handleChange} className={chunkySelect} disabled={!formData.division}>
                                                        <option value="">Select</option>
                                                        {districtOptions.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Barangay</label>
                                                    <select name="barangay" value={formData.barangay} onChange={handleChange} className={chunkySelect} disabled={!formData.municipality}>
                                                        <option value="">Select</option>
                                                        {barangayOptions.map(b => <option key={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Legislative District</label>
                                                <select name="leg_district" value={formData.leg_district} onChange={handleChange} className={chunkySelect} disabled={!formData.region}>
                                                    <option value="">Select Leg. District</option>
                                                    {legDistrictOptions.map(l => <option key={l}>{l}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 3 && (
                                    <div className="space-y-6">
                                        <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Audit Category</label>
                                        <select name="curricular_offering" value={formData.curricular_offering} onChange={handleChange} className={chunkySelect}>
                                            <option value="">Select Category...</option>
                                            <option value="Purely Elementary">Purely Elementary</option>
                                            <option value="Elementary School and Junior High School (K-10)">ES and JHS (K to 10)</option>
                                            <option value="Junior High and Senior High">JHS with SHS</option>
                                            <option value="All Offering (K to 12)">All Offering (K to 12)</option>
                                            <option value="Purely Junior High School">Purely Junior High School</option>
                                            <option value="Purely Senior High School">Purely Senior High School</option>
                                        </select>
                                        <div className="p-5 bg-amber-50 border-2 border-amber-100 rounded-3xl flex gap-3">
                                            <span className="text-xl">⚠️</span>
                                            <p className="text-[13px] font-bold text-amber-800 leading-tight">This choice determines which grade levels are audited later. Choose carefully.</p>
                                        </div>
                                    </div>
                                )}

                                { currentStep === 4 && (
                                    <div className="space-y-4 pb-20">
                                        
                                        <div className="h-48 rounded-[2rem] overflow-hidden border-2 border-gray-100 shadow-inner relative mt-4">
                                            <LocationPickerMap
                                                latitude={formData.latitude}
                                                longitude={formData.longitude}
                                                onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                                                readOnly={false}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" value={formData.latitude} disabled placeholder="Lat" className={chunkyInput + " text-sm text-center !bg-gray-50"} />
                                            <input type="text" value={formData.longitude} disabled placeholder="Long" className={chunkyInput + " text-sm text-center !bg-gray-50"} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Navigation Footer */}
            {!isReviewMode && (
                <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
                    <div className="max-w-md mx-auto flex gap-3">
                        {currentStep > 0 && (
                            <button onClick={handleBack} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 transition-all">
                                <FiArrowLeft className="w-6 h-6" />
                            </button>
                        )}
                        <button onClick={handleNext} disabled={loading || !isCurrentStepValid()}
                            className={`flex-1 h-16 rounded-[2rem] text-white font-black text-lg transition-all shadow-xl active:scale-98 disabled:opacity-30 disabled:scale-100
                                ${currentStep === TOTAL_STEPS - 1 ? "bg-emerald-500 shadow-emerald-200" : "bg-blue-600 shadow-blue-200"}`}>
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Syncing...</span>
                                </div>
                            ) : currentStep === TOTAL_STEPS - 1 ? "💾 Save Profile" : "Continue"}
                        </button>
                    </div>
                </div>
            )}

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message="School identity profile has been successfully saved to our cloud registry! ✓" redirectUrl="/modular-dashboard" />

            <AnimatePresence>
                {showIernModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end justify-center">
                        <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full rounded-t-[3rem] p-10 pb-12 shadow-2xl relative">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                            <div className="w-20 h-20 bg-emerald-500 rounded-full mx-auto flex items-center justify-center text-3xl shadow-2xl shadow-emerald-200 mb-6">🏷️</div>
                            <h2 className="text-3xl font-black text-gray-900 text-center leading-tight">IERN Matched!</h2>
                            <p className="text-gray-500 text-center font-medium mt-3 px-4">We found your official Educational Registry Number.</p>
                            <div className="bg-gray-50 border-2 border-gray-100 rounded-[2rem] p-6 mt-8 text-center">
                                <span className="text-4xl font-black text-emerald-600 tracking-[0.2em]">{fetchedIern}</span>
                            </div>
                            <button onClick={() => setShowIernModal(false)}
                                className="w-full mt-10 py-5 rounded-[2rem] bg-gray-900 text-white font-black text-xl shadow-2xl active:scale-95 transition-all">
                                Confirm &amp; Proceed
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Unit1SchoolIdentity;
