import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2 } from "react-icons/fi";
import { saveUnit1Draft, getUnit1Draft, clearUnit1Draft } from "../../db";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import LocationPickerMap from "../LocationPickerMap";
import locationData from "../../locations.json";

const TOTAL_STEPS = 4;

const chunkyInput = "w-full p-4 mt-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm";
const chunkySelect = "w-full p-4 mt-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm appearance-none bg-white disabled:opacity-50 disabled:bg-gray-100";

// ── Skeleton Loaders ─────────────────────────────────────────────────────────
const Pulse = ({ className }) => <div className={`animate-pulse bg-slate-200 rounded-2xl ${className}`} />;

const SkeletonWizard = () => (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">
        <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-sm px-4 py-3">
            <div className="max-w-md mx-auto flex items-center gap-3">
                <div className="p-2 rounded-full bg-gray-100 w-10 h-10" />
                <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden"><Pulse className="h-full w-1/2 rounded-full" /></div>
                <Pulse className="h-5 w-10" />
            </div>
        </header>
        <main className="flex-1 overflow-y-auto pb-28">
            <div className="max-w-md w-full mx-auto mt-12 px-6 space-y-5">
                <Pulse className="h-9 w-3/4" />
                <Pulse className="h-5 w-full" />
                <Pulse className="h-16 w-full mt-4" />
                <Pulse className="h-16 w-full" />
            </div>
        </main>
        <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-gray-100 z-50">
            <Pulse className="h-16 w-full max-w-md mx-auto" />
        </div>
    </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const Unit1SchoolIdentity = () => {
    const navigate = useNavigate();
    const [currentStep, setCurrentStep] = useState(1);
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
                if (draft && draft.step > 1) {
                    setFormData(draft.formData || {});
                    setCurrentStep(Math.min(draft.step, TOTAL_STEPS));
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
                    const parsed = JSON.parse(txt);
                    if (parsed.exists && parsed.data) d = parsed.data;
                }
            }
            if (iernRes?.ok) {
                const j = await iernRes.json();
                if (j.exists && j.data) iernRow = j.data;
            }

            if (d && d.unit1_completed) {
                // Merge saved + iern data to fill any gaps
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
                };
                setFormData(merged);

                // Pre-populate location dropdowns in parallel
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

            // Not yet completed — check for draft or auto-fill from IERN
            const draft = await getUnit1Draft("draft_unit_1");
            if (draft && draft.step > 1) {
                setFormData(draft.formData || {});
                setCurrentStep(Math.min(draft.step, TOTAL_STEPS));
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
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Location dropdown sync ───────────────────────────────────────────────
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

    // Auto-save draft
    useEffect(() => {
        if (formData.school_id || currentStep > 1) {
            saveUnit1Draft("draft_unit_1", { formData, step: currentStep });
        }
    }, [formData, currentStep]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleRegionChange = (e) => setFormData(prev => ({ ...prev, region: e.target.value, province: "", municipality: "", barangay: "", division: "", district: "" }));
    const handleProvinceChange = (e) => setFormData(prev => ({ ...prev, province: e.target.value, municipality: "", barangay: "" }));
    const handleCityChange = (e) => setFormData(prev => ({ ...prev, municipality: e.target.value, barangay: "" }));
    const handleDivisionChange = (e) => setFormData(prev => ({ ...prev, division: e.target.value, district: "" }));

    const handleBack = () => {
        if (currentStep > 1) setCurrentStep(s => s - 1);
        else navigate(-1);
    };

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS) setCurrentStep(s => s + 1);
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
            setShowSuccess(true);
        } catch (err) {
            console.error("Submit failed:", err);
            alert("Failed to sync. Progress saved locally.");
        } finally {
            setLoading(false);
        }
    };

    const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

    const stepQuestions = {
        1: "What's the school's name and ID?",
        2: "Where is the school located?",
        3: "What does the school offer?",
        4: "Pin the school on the map 📍",
    };
    const stepSubtitles = {
        1: "Enter the 6-digit DepEd School ID and verify the name.",
        2: "Select the region, division, and district details.",
        3: "Choose the curricular offering level.",
        4: "Set the exact coordinates using the map or manual input.",
    };
    const slideVariants = {
        enter: { opacity: 0, x: 60, scale: 0.97 },
        center: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -60, scale: 0.97 },
    };

    const isStep1Valid = formData.school_id.length === 6 && /^\d+$/.test(formData.school_id) && formData.school_name.trim() !== "";
    const isStep2Valid = formData.region && formData.province && formData.municipality && formData.barangay && formData.division && formData.district && formData.leg_district;
    const isStep3Valid = formData.curricular_offering !== "";
    const isStep4Valid = formData.latitude !== "" && formData.longitude !== "";
    const isCurrentStepValid = () => [isStep1Valid, isStep2Valid, isStep3Valid, isStep4Valid][currentStep - 1];

    // ── Skeleton while loading ───────────────────────────────────────────────
    if (isModeLoading) return <SkeletonWizard />;

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">

            {/* Header */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    <button onClick={() => navigate("/modular-dashboard")} className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600">
                        <FiX className="w-6 h-6" />
                    </button>
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-green-500 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.5, ease: "easeOut" }} />
                    </div>
                    <span className="text-sm font-bold text-gray-400 whitespace-nowrap">{currentStep}/{TOTAL_STEPS}</span>
                </div>
            </header>

            {/* Welcome Back Toast */}
            <AnimatePresence>
                {showWelcomeBack && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 z-[60]">
                        <FiCheckCircle className="text-green-400" /> Welcome back! Continuing from Step {currentStep}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto pb-28">
                <AnimatePresence mode="wait">

                    {/* ── REVIEW MODE ── */}
                    {isReviewMode ? (
                        <motion.div key="review-card"
                            initial={{ opacity: 0, y: 30, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }}
                            transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                            className="max-w-md w-full mx-auto mt-10 px-6">
                            <div className="text-center mb-6">
                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                                    className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200">
                                    <FiCheckCircle className="w-8 h-8 text-white" />
                                </motion.div>
                                <h2 className="text-2xl font-black text-gray-800">Unit 1 Complete!</h2>
                                <p className="text-sm text-gray-400 mt-1">School Identity has been verified and saved.</p>
                            </div>
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                                className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 overflow-hidden">
                                <div className="h-2 bg-emerald-400" />
                                <div className="px-6 py-5 space-y-4">
                                    {[
                                        { label: "School ID", value: formData.school_id, icon: "🏫" },
                                        { label: "School Name", value: formData.school_name, icon: "✏️" },
                                        { label: "IERN", value: formData.iern || "Not Assigned", icon: "🪪" },
                                        { label: "Region", value: formData.region, icon: "📍" },
                                        { label: "Division", value: formData.division, icon: "🗂️" },
                                        { label: "Curricular Offering", value: formData.curricular_offering || "Not Set", icon: "📚" },
                                    ].map((item, i) => (
                                        <motion.div key={item.label} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 + i * 0.06 }}
                                            className="flex items-start gap-3">
                                            <span className="text-lg mt-0.5">{item.icon}</span>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold uppercase tracking-wider text-gray-300">{item.label}</p>
                                                <p className="text-base font-semibold text-gray-800 truncate">{item.value || "—"}</p>
                                            </div>
                                        </motion.div>
                                    ))}
                                </div>
                                <div className="mx-6 border-t-2 border-dashed border-gray-100" />
                                <div className="px-6 py-4"><p className="text-xs text-center text-gray-300">Tap below to make corrections</p></div>
                            </motion.div>
                            <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
                                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => { setIsReviewMode(false); setCurrentStep(1); }}
                                className="mt-6 w-full py-5 rounded-2xl font-black text-lg tracking-wide bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3">
                                <FiEdit2 className="w-5 h-5" /> Unlock &amp; Edit Data
                            </motion.button>
                        </motion.div>
                    ) : (
                        /* ── WIZARD MODE ── */
                        <div className="flex-1 max-w-md w-full mx-auto mt-12 px-6">
                            <AnimatePresence mode="wait">

                                {/* STEP 1 */}
                                {currentStep === 1 && (
                                    <motion.div key="step1" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <h2 className="text-2xl font-bold text-gray-800">{stepQuestions[1]}</h2>
                                        <p className="mt-2 text-sm text-gray-400">{stepSubtitles[1]}</p>
                                        <div className="relative mt-6">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">School ID</label>
                                            <input type="text" name="school_id" value={formData.school_id} onChange={handleChange}
                                                placeholder="e.g. 101010" maxLength={6} className={chunkyInput} />
                                            {formData.school_id.length === 6 && /^\d+$/.test(formData.school_id) && (
                                                <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-4 top-10 bg-green-100 p-1.5 rounded-full">
                                                    <FiCheck className="text-green-600 w-5 h-5" />
                                                </motion.div>
                                            )}
                                        </div>
                                        <div className="mt-4">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">School Name</label>
                                            <input type="text" name="school_name" value={formData.school_name} onChange={handleChange}
                                                disabled={!!formData.iern} placeholder="e.g. San Isidro Elementary School" className={chunkyInput} />
                                        </div>
                                        {formData.iern && (
                                            <div className="mt-4">
                                                <label className="block text-xs font-bold uppercase tracking-wider text-green-500 mb-1">Official IERN</label>
                                                <input value={formData.iern} disabled className={chunkyInput + " !border-green-300 !bg-green-50"} />
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {/* STEP 2 */}
                                {currentStep === 2 && (
                                    <motion.div key="step2" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <h2 className="text-2xl font-bold text-gray-800">{stepQuestions[2]}</h2>
                                        <p className="mt-2 text-sm text-gray-400">{stepSubtitles[2]}</p>
                                        <div className="mt-6 space-y-3">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Region</label>
                                                <select name="region" value={formData.region} onChange={handleRegionChange} disabled={!!formData.iern} className={chunkySelect}>
                                                    <option value="">Select Region</option>
                                                    {Object.keys(locationData).sort().map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Province</label>
                                                    <select name="province" value={formData.province} onChange={handleProvinceChange} disabled={!formData.region} className={chunkySelect}>
                                                        <option value="">Select</option>
                                                        {provinceOptions.map(p => <option key={p}>{p}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Municipality</label>
                                                    <select name="municipality" value={formData.municipality} onChange={handleCityChange} disabled={!formData.province} className={chunkySelect}>
                                                        <option value="">Select</option>
                                                        {cityOptions.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Barangay</label>
                                                    <select name="barangay" value={formData.barangay} onChange={handleChange} disabled={!formData.municipality} className={chunkySelect}>
                                                        <option value="">Select</option>
                                                        {barangayOptions.map(b => <option key={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Division</label>
                                                    <select name="division" value={formData.division} onChange={handleDivisionChange} disabled={!formData.region} className={chunkySelect}>
                                                        <option value="">Select</option>
                                                        {divisionOptions.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">District</label>
                                                    <select name="district" value={formData.district} onChange={handleChange} disabled={!formData.division} className={chunkySelect}>
                                                        <option value="">Select</option>
                                                        {districtOptions.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Leg. District</label>
                                                    <select name="leg_district" value={formData.leg_district} onChange={handleChange} className={chunkySelect}>
                                                        <option value="">Select</option>
                                                        {legDistrictOptions.map(l => <option key={l}>{l}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 3 */}
                                {currentStep === 3 && (
                                    <motion.div key="step3" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <h2 className="text-2xl font-bold text-gray-800">{stepQuestions[3]}</h2>
                                        <p className="mt-2 text-sm text-gray-400">{stepSubtitles[3]}</p>
                                        <div className="mt-6">
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Curricular Offering</label>
                                            <select name="curricular_offering" value={formData.curricular_offering} onChange={handleChange} className={chunkySelect}>
                                                <option value="">Select Curricular Offering...</option>
                                                <option value="Purely Elementary">Purely Elementary</option>
                                                <option value="Elementary School and Junior High School (K-10)">ES and JHS (K to 10)</option>
                                                <option value="Junior High and Senior High">JHS with SHS</option>
                                                <option value="All Offering (K to 12)">All Offering (K to 12)</option>
                                                <option value="Purely Junior High School">Purely Junior High School</option>
                                                <option value="Purely Senior High School">Purely Senior High School</option>
                                            </select>
                                        </div>
                                        {formData.curricular_offering && (
                                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                                className="mt-6 bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3">
                                                <div className="bg-green-100 p-2 rounded-full"><FiCheck className="text-green-600 w-5 h-5" /></div>
                                                <div>
                                                    <p className="text-sm font-bold text-green-700">Selected</p>
                                                    <p className="text-xs text-green-600">{formData.curricular_offering}</p>
                                                </div>
                                            </motion.div>
                                        )}
                                        <div className="mt-6 bg-amber-50 border-2 border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-sm text-amber-700 font-medium">
                                            ⚠️ This selection determines which grade levels appear in the rest of your audit forms.
                                        </div>
                                    </motion.div>
                                )}

                                {/* STEP 4 */}
                                {currentStep === 4 && (
                                    <motion.div key="step4" variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.3 }}>
                                        <h2 className="text-2xl font-bold text-gray-800">{stepQuestions[4]}</h2>
                                        <p className="mt-2 text-sm text-gray-400">{stepSubtitles[4]}</p>
                                        <div className="mt-6 grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Latitude</label>
                                                <input type="number" step="any" name="latitude" value={formData.latitude} onChange={handleChange} className={chunkyInput} />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Longitude</label>
                                                <input type="number" step="any" name="longitude" value={formData.longitude} onChange={handleChange} className={chunkyInput} />
                                            </div>
                                        </div>
                                        <div className="mt-4 rounded-2xl overflow-hidden border-2 border-gray-200 shadow-sm">
                                            <LocationPickerMap
                                                latitude={formData.latitude}
                                                longitude={formData.longitude}
                                                onChange={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                                                readOnly={false}
                                            />
                                        </div>
                                        <div className="mt-6 bg-blue-50 border-2 border-blue-200 rounded-2xl p-4 flex items-start gap-3">
                                            <FiCheckCircle className="w-5 h-5 mt-0.5 flex-shrink-0 text-blue-600" />
                                            <p className="text-sm text-blue-700 font-medium">You are about to complete Unit 1. This will securely sync your school identity data.</p>
                                        </div>
                                    </motion.div>
                                )}

                            </AnimatePresence>
                        </div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Action Bar */}
            {!isReviewMode && (
                <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-gray-100 flex justify-center z-50">
                    <div className="w-full max-w-md flex gap-3">
                        {currentStep > 1 && (
                            <motion.button initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                                onClick={handleBack}
                                className="px-5 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 border-b-[4px] border-gray-200 active:border-b-0 active:translate-y-[4px] transition-all">
                                Back
                            </motion.button>
                        )}
                        <button onClick={handleNext} disabled={loading || !isCurrentStepValid()}
                            className={`flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center border-b-[6px] active:border-b-0 active:translate-y-[6px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg
                                ${currentStep === TOTAL_STEPS ? "bg-green-500 border-green-700" : "bg-blue-500 border-blue-700"}`}>
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    {currentStep === TOTAL_STEPS ? "Syncing..." : "Loading..."}
                                </span>
                            ) : currentStep === TOTAL_STEPS ? "Complete Level ⭐" : "Continue"}
                        </button>
                    </div>
                </div>
            )}

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message="School Identity profile setup is complete! ✓" redirectUrl="/modular-dashboard" />

            <AnimatePresence>
                {showIernModal && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.8, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 20 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-40 h-40 bg-green-100 rounded-full blur-3xl opacity-50" />
                            <motion.div initial={{ rotate: -180, scale: 0 }} animate={{ rotate: 0, scale: 1 }} transition={{ type: "spring", delay: 0.2 }}
                                className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-lg relative z-10">
                                <span className="text-4xl">🌟</span>
                            </motion.div>
                            <h2 className="text-3xl font-extrabold text-gray-800 mt-6 relative z-10">School Identified!</h2>
                            <p className="text-gray-500 mt-3 text-sm relative z-10">Your official InsightEd Educational Registry Number (IERN) is:</p>
                            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.4 }}
                                className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 mt-6 relative z-10">
                                <span className="text-4xl tracking-widest font-black text-green-600">{fetchedIern}</span>
                            </motion.div>
                            <button onClick={() => setShowIernModal(false)}
                                className="w-full mt-8 py-4 rounded-2xl text-white font-bold text-lg text-center bg-blue-500 border-b-[6px] border-blue-700 active:border-b-0 active:translate-y-[6px] transition-all relative z-10">
                                Start Verification
                            </button>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Unit1SchoolIdentity;
