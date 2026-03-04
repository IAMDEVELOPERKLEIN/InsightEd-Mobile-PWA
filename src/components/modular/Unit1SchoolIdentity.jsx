import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiLock, FiUnlock, FiEdit2 } from "react-icons/fi";
import { saveUnit1Draft, getUnit1Draft, clearUnit1Draft } from "../../db";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import LocationPickerMap from "../LocationPickerMap";
import locationData from '../../locations.json';

const TOTAL_STEPS = 4;

// Shared chunky input class
const chunkyInput = "w-full p-4 mt-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm";
const chunkySelect = "w-full p-4 mt-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-lg font-medium text-gray-700 focus:outline-none focus:border-blue-500 focus:bg-blue-50 transition-colors shadow-sm appearance-none bg-white disabled:opacity-50 disabled:bg-gray-100";

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

    // Form State
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

    // Load draft or check for completed data on mount
    useEffect(() => {
        const init = async () => {
            const storedSchoolId = localStorage.getItem('schoolId');

            // 1. Check if this unit is already completed (fetch from backend)
            if (storedSchoolId) {
                try {
                    const savedRes = await fetch(`/api/ph_schools/${storedSchoolId}`);
                    if (savedRes.ok) {
                        const savedText = await savedRes.text();
                        if (!savedText) {
                             console.warn("ph_schools fetch returned empty body");
                             setIsModeLoading(false);
                             return;
                        }
                        let savedData;
                        try {
                            savedData = JSON.parse(savedText);
                        } catch(e) {
                            console.error("Failed to parse ph_schools JSON:", savedText.substring(0, 100));
                            setIsModeLoading(false);
                            return;
                        }
                        if (savedData.exists && savedData.data?.school_name) {
                            // Pre-fill form with existing data
                            const d = savedData.data;

                            // Failsafe: if iern is null in ph_schools, look it up from schools_IERN
                            let resolvedIern = d.iern || "";
                            if (!resolvedIern) {
                                try {
                                    const iernFix = await fetch(`/api/schools_iern/${storedSchoolId}`);
                                    if (iernFix.ok) {
                                        const iernFixData = await iernFix.json();
                                        if (iernFixData.exists && iernFixData.data?.iern) {
                                            resolvedIern = iernFixData.data.iern;
                                            // Silently patch ph_schools.iern so it's correct for next time
                                            fetch('/api/ph_schools/unit1', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    school_id: d.school_id || storedSchoolId,
                                                    iern: resolvedIern,
                                                    school_name: d.school_name,
                                                    region: d.region,
                                                    division: d.division,
                                                    district: d.district,
                                                    curricular_offering: d.curricular_offering,
                                                })
                                            }).catch(() => {});
                                        }
                                    }
                                } catch(e) {}
                            }

                            // --- BACKFILL missing location fields from legacy records ---
                            // (For records saved before the province/municipality/barangay columns existed)
                            let resolvedProvince = d.province || "";
                            let resolvedMunicipality = d.municipality || "";
                            let resolvedBarangay = d.barangay || "";
                            let resolvedLegDistrict = d.leg_district || "";

                            if (!resolvedProvince && d.school_id) {
                                try {
                                    // Try school-profile for province + municipality
                                    const profileRes = await fetch(`/api/school-profile/${d.school_id || storedSchoolId}`);
                                    if (profileRes.ok) {
                                        const profileData = await profileRes.json();
                                        resolvedProvince = profileData.province || resolvedProvince;
                                        resolvedMunicipality = profileData.municipality || profileData.city || resolvedMunicipality;
                                        resolvedBarangay = profileData.barangay || resolvedBarangay;
                                        resolvedLegDistrict = profileData.leg_district || profileData.legislativeDistrict || resolvedLegDistrict;
                                    }
                                } catch(e) {}

                                // Also try schools_IERN for barangay if still missing
                                if (!resolvedBarangay) {
                                    try {
                                        const iernB = await fetch(`/api/schools_iern/${d.school_id || storedSchoolId}`);
                                        if (iernB.ok) {
                                            const iernBData = await iernB.json();
                                            if (iernBData.exists && iernBData.data?.Barangay) {
                                                resolvedBarangay = iernBData.data.Barangay;
                                            }
                                        }
                                    } catch(e) {}
                                }

                                // Silently patch DB so future edits don't need backfill
                                if (resolvedProvince || resolvedMunicipality || resolvedBarangay) {
                                    fetch('/api/ph_schools/unit1', {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify({
                                            school_id: d.school_id || storedSchoolId,
                                            iern: resolvedIern || d.iern,
                                            school_name: d.school_name,
                                            region: d.region,
                                            province: resolvedProvince,
                                            municipality: resolvedMunicipality,
                                            barangay: resolvedBarangay,
                                            division: d.division,
                                            district: d.district,
                                            leg_district: resolvedLegDistrict,
                                            curricular_offering: d.curricular_offering,
                                            latitude: d.latitude,
                                            longitude: d.longitude,
                                        })
                                    }).catch(() => {});
                                }
                            }

                            // --- NEW: FORCE BACKFILL FROM SCHOOLS_IERN FOR ALL MISSING FIELDS ---
                            // If any critical field is missing, query schools_IERN directly
                            if (!resolvedBarangay || !resolvedLegDistrict || !d.latitude || !d.longitude || !d.curricular_offering) {
                                try {
                                    const iernC = await fetch(`/api/schools_iern/${d.school_id || storedSchoolId}`);
                                    if (iernC.ok) {
                                        const iernCData = await iernC.json();
                                        if (iernCData.exists && iernCData.data) {
                                            resolvedIern = resolvedIern || iernCData.data.iern;
                                            resolvedBarangay = resolvedBarangay || iernCData.data.Barangay || iernCData.data.school_barangay;
                                            resolvedLegDistrict = resolvedLegDistrict || iernCData.data.leg_district || iernCData.data.Legislative_District;
                                            resolvedProvince = resolvedProvince || iernCData.data.province || iernCData.data.Province;
                                            resolvedMunicipality = resolvedMunicipality || iernCData.data.municipality || iernCData.data.Municipality;
                                            d.curricular_offering = d.curricular_offering || iernCData.data.Curricular_Offering || iernCData.data.CurricularOffering;
                                            d.latitude = d.latitude || iernCData.data.Latitude || iernCData.data.school_latitude;
                                            d.longitude = d.longitude || iernCData.data.Longitude || iernCData.data.school_longitude;
                                            
                                            // Silently sync local improvements back to db
                                            fetch('/api/ph_schools/unit1', {
                                                method: 'POST',
                                                headers: { 'Content-Type': 'application/json' },
                                                body: JSON.stringify({
                                                    school_id: d.school_id || storedSchoolId,
                                                    iern: resolvedIern,
                                                    school_name: d.school_name,
                                                    region: d.region,
                                                    province: resolvedProvince,
                                                    municipality: resolvedMunicipality,
                                                    barangay: resolvedBarangay,
                                                    division: d.division,
                                                    district: d.district,
                                                    leg_district: resolvedLegDistrict,
                                                    curricular_offering: d.curricular_offering,
                                                    latitude: d.latitude,
                                                    longitude: d.longitude,
                                                })
                                            }).catch(() => {});
                                        }
                                    }
                                } catch(e) {}
                            }

                            setFormData(prev => ({
                                ...prev,
                                school_id: d.school_id || storedSchoolId,
                                school_name: d.school_name || "",
                                iern: resolvedIern,
                                region: d.region || "",
                                province: resolvedProvince,
                                municipality: resolvedMunicipality,
                                barangay: resolvedBarangay,
                                division: d.division || "",
                                district: d.district || "",
                                leg_district: resolvedLegDistrict,
                                curricular_offering: d.curricular_offering || "",
                                latitude: d.latitude || "",
                                longitude: d.longitude || "",
                            }));

                            // Pre-populate dropdown options so they display correctly in edit mode
                            if (d.region) {
                                // Province options from JSON
                                if (locationData && locationData[d.region]) {
                                    setProvinceOptions(Object.keys(locationData[d.region]).sort());
                                    if (resolvedProvince && locationData[d.region][resolvedProvince]) {
                                        setCityOptions(Object.keys(locationData[d.region][resolvedProvince]).sort());
                                        if (resolvedMunicipality && locationData[d.region][resolvedProvince][resolvedMunicipality]) {
                                            setBarangayOptions(locationData[d.region][resolvedProvince][resolvedMunicipality].sort());
                                        }
                                    }
                                }
                                // Division / District / Leg District options from API
                                try {
                                    const divRes = await fetch(`/api/locations/divisions?region=${encodeURIComponent(d.region)}`);
                                    if (divRes.ok) setDivisionOptions(await divRes.json());
                                } catch(e) {}
                                try {
                                    const distRes = await fetch(`/api/locations/districts?region=${encodeURIComponent(d.region)}&division=${encodeURIComponent(d.division || '')}`);
                                    if (distRes.ok) setDistrictOptions(await distRes.json());
                                } catch(e) {}
                                try {
                                    const legRes = await fetch(`/api/locations/leg-districts?region=${encodeURIComponent(d.region)}`);
                                    if (legRes.ok) setLegDistrictOptions(await legRes.json());
                                } catch(e) {}
                            }
                            setIsReviewMode(true);
                            setIsModeLoading(false);
                            return;

                        }
                    }
                } catch (e) {
                    console.warn("Could not fetch saved Unit 1 data", e);
                }
            }

            // 2. Otherwise load draft
            const draft = await getUnit1Draft('draft_unit_1');
            if (draft && draft.step > 1) {
                setFormData(draft.formData || {});
                const savedStep = draft.step || 1;
                setCurrentStep(savedStep <= TOTAL_STEPS ? savedStep : 1);
                setShowWelcomeBack(true);
                setTimeout(() => setShowWelcomeBack(false), 3000);
            } else if (storedSchoolId) {
                // Instantly inject the ID into the UI form state so the user doesn't have to type it
                setFormData(prev => ({ ...prev, school_id: storedSchoolId }));
                // Fetch the rest of the metadata to flesh out the fields automatically
                handleFetchData(storedSchoolId);
            }
            setIsModeLoading(false);
        };
        init();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Sync JSON Dropdowns Options (Region -> Province -> Muni -> Brgy)
    useEffect(() => {
        if (!formData.region) return;

        if (locationData && locationData[formData.region]) {
            setProvinceOptions(Object.keys(locationData[formData.region]).sort());
            if (formData.province && locationData[formData.region][formData.province]) {
                setCityOptions(Object.keys(locationData[formData.region][formData.province]).sort());
                if (formData.municipality && locationData[formData.region][formData.province][formData.municipality]) {
                    setBarangayOptions(locationData[formData.region][formData.province][formData.municipality].sort());
                }
            }
        }
    }, [formData.region, formData.province, formData.municipality]);

    // Sync API Dropdowns (Region -> Division -> District & Leg District)
    useEffect(() => {
        if (!formData.region) {
            setDivisionOptions([]);
            setLegDistrictOptions([]);
            return;
        }

        fetch(`/api/locations/divisions?region=${encodeURIComponent(formData.region)}`)
            .then(res => res.json())
            .then(data => setDivisionOptions(data || []))
            .catch(console.error);

        fetch(`/api/locations/leg-districts?region=${encodeURIComponent(formData.region)}`)
            .then(res => res.json())
            .then(data => setLegDistrictOptions(data || []))
            .catch(console.error);

    }, [formData.region]);

    useEffect(() => {
        if (!formData.region || !formData.division) {
            setDistrictOptions([]);
            return;
        }

        fetch(`/api/locations/districts?region=${encodeURIComponent(formData.region)}&division=${encodeURIComponent(formData.division)}`)
            .then(res => res.json())
            .then(data => setDistrictOptions(data || []))
            .catch(console.error);

    }, [formData.region, formData.division]);

    // Save draft whenever formData or currentStep changes
    useEffect(() => {
        const saveDraft = async () => {
            await saveUnit1Draft('draft_unit_1', { formData, step: currentStep });
        };
        if (formData.school_id || currentStep > 1) {
            saveDraft();
        }
    }, [formData, currentStep]);


    const handleBack = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        } else {
            navigate(-1);
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
    };

    const handleRegionChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, region: val, province: '', municipality: '', barangay: '', division: '', district: '' }));
    };

    const handleProvinceChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, province: val, municipality: '', barangay: '' }));
    };

    const handleCityChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, municipality: val, barangay: '' }));
    };

    const handleDivisionChange = (e) => {
        const val = e.target.value;
        setFormData(prev => ({ ...prev, division: val, district: '' }));
    };

    const handleFetchData = async (idToFetch = formData.school_id) => {
        if (!idToFetch) return;
        setLoading(true);
        try {
            // First, attempt to fetch from the new IERN endpoint
            const iernRes = await fetch(`/api/schools_iern/${idToFetch}`);
            if (iernRes.ok) {
                const iernText = await iernRes.text();
                if (!iernText) {
                    setLoading(false);
                    return;
                }
                let iernData;
                try {
                    iernData = JSON.parse(iernText);
                } catch(e) {
                    console.error("IERN API returned invalid JSON:", iernText.substring(0, 50));
                    setLoading(false);
                    return;
                }
                if (iernData.exists && iernData.data) {
                    const row = iernData.data;
                    setFormData(prev => ({
                        ...prev,
                        school_id: idToFetch,
                        school_name: row.School_Name || row.school_name || prev.school_name,
                        region: row.Region || row.region || prev.region,
                        province: row.Province || row.province || prev.province,
                        municipality: row.Municipality || row.municipality || row.City || row.city || prev.municipality,
                        barangay: row.Barangay || row.barangay || prev.barangay,
                        division: row.Division || row.division || prev.division,
                        district: row.District || row.district || prev.district,
                        leg_district: row.Legislative_District || row.leg_district || row.legislative_district || prev.leg_district,
                        curricular_offering: row.Curricular_Offering || row.curricular_offering || prev.curricular_offering,
                        latitude: row.Latitude || row.latitude || prev.latitude,
                        longitude: row.Longitude || row.longitude || prev.longitude,
                        iern: row.iern || "",
                    }));
                    setFetchedIern(row.iern || "");
                    setShowIernModal(true);
                    setLoading(false);
                    return; // Early return to avoid fetching the generic profile if IERN is hit
                }
            }
            
            // Fallback: fetch from general school-profile
            const res = await fetch(`/api/school-profile/${idToFetch}`);
            if (res.ok) {
                const data = await res.json();
                setFormData(prev => ({
                    ...prev,
                    school_id: idToFetch,
                    school_name: data.school_name || data.schoolName || prev.school_name,
                    region: data.region || prev.region,
                    province: data.province || prev.province,
                    municipality: data.municipality || data.city || prev.municipality,
                    barangay: data.barangay || prev.barangay,
                    division: data.division || prev.division,
                    district: data.district || prev.district,
                    leg_district: data.leg_district || data.legislativeDistrict || prev.leg_district,
                    curricular_offering: data.curricular_offering || data.curricularOffering || prev.curricular_offering,
                    latitude: data.latitude || prev.latitude,
                    longitude: data.longitude || prev.longitude,
                }));
            }
        } catch (err) {
            console.error("Failed to fetch school data:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleNext = async () => {
        if (currentStep === 1 && formData.school_id) {
            await handleFetchData();
        }
        if (currentStep < TOTAL_STEPS) {
            setCurrentStep(currentStep + 1);
        } else {
            handleSubmit();
        }
    };

    // ---------- Validation per step ----------
    const isStep1Valid = formData.school_id.length === 6 && /^\d+$/.test(formData.school_id) && formData.school_name.trim() !== "";
    const isStep2Valid = formData.region && formData.province && formData.municipality && formData.barangay && formData.division && formData.district && formData.leg_district;
    const isStep3Valid = formData.curricular_offering !== "";
    const isStep4Valid = formData.latitude !== "" && formData.longitude !== "";

    const isCurrentStepValid = () => {
        if (currentStep === 1) return isStep1Valid;
        if (currentStep === 2) return isStep2Valid;
        if (currentStep === 3) return isStep3Valid;
        if (currentStep === 4) return isStep4Valid;
        return false;
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);

            // Failsafe: If iern is still empty, do one last lookup from schools_IERN
            let finalIern = formData.iern;
            if (!finalIern && formData.school_id) {
                try {
                    const iernRes = await fetch(`/api/schools_iern/${formData.school_id}`);
                    if (iernRes.ok) {
                        const iernData = await iernRes.json();
                        if (iernData.exists && iernData.data?.iern) {
                            finalIern = iernData.data.iern;
                        }
                    }
                } catch (e) {
                    console.warn("Failsafe IERN lookup failed:", e);
                }
            }
            
            // Save to Backend
            const payload = { ...formData, iern: finalIern || null };
            const res = await fetch('/api/ph_schools/unit1', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                console.error("Server returned error:", errorData);
                throw new Error(errorData.error || `Server HTTP Error: ${res.status}`);
            }

            // Sync with draft cleanup
            await clearUnit1Draft('draft_unit_1');

            const stored = localStorage.getItem('quest_progress');
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };

            if (!progress.completedUnits.includes(1)) {
                progress.completedUnits.push(1);
                progress.xp += 150;
                localStorage.setItem('quest_progress', JSON.stringify(progress));
            }

            setShowSuccess(true);
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to sync. Progress saved locally.");
        } finally {
            setLoading(false);
        }
    };

    const progressPercentage = (currentStep / TOTAL_STEPS) * 100;

    // Step question titles
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

    // Slide animation direction
    const slideVariants = {
        enter: { opacity: 0, x: 60, scale: 0.97 },
        center: { opacity: 1, x: 0, scale: 1 },
        exit: { opacity: 0, x: -60, scale: 0.97 },
    };

    return (
        <div className="min-h-screen bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-gray-50 to-gray-200 flex flex-col font-sans">

            {/* ========== TASK 2: GAMIFIED HEADER ========== */}
            <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm shadow-[0_2px_12px_rgba(0,0,0,0.04)] px-4 py-3">
                <div className="max-w-md mx-auto flex items-center gap-3">
                    {/* X Button */}
                    <button
                        onClick={() => navigate('/modular-dashboard')}
                        className="p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                        aria-label="Exit lesson"
                    >
                        <FiX className="w-6 h-6" />
                    </button>

                    {/* Thick Progress Bar */}
                    <div className="flex-1 mx-4 h-4 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div
                            className="h-full bg-green-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPercentage}%` }}
                            transition={{ duration: 0.5, ease: "easeOut" }}
                        />
                    </div>

                    {/* Step counter */}
                    <span className="text-sm font-bold text-gray-400 whitespace-nowrap">
                        {currentStep}/{TOTAL_STEPS}
                    </span>
                </div>
            </header>

            {/* Welcome Back Toast */}
            <AnimatePresence>
                {showWelcomeBack && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="fixed top-16 left-1/2 -translate-x-1/2 bg-gray-800 text-white px-4 py-2 rounded-full shadow-lg text-sm flex items-center gap-2 z-[60]"
                    >
                        <FiCheckCircle className="text-green-400" />
                        Welcome back! Continuing from Step {currentStep}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ========== TASK 3: MAIN CONTENT ========== */}
            <main className="flex-1 overflow-y-auto pb-28">
                <AnimatePresence mode="wait">

                {/* ---- REVIEW MODE: Summary Receipt Card ---- */}
                {isReviewMode ? (
                    <motion.div
                        key="review-card"
                        initial={{ opacity: 0, y: 30, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ type: "spring", bounce: 0.3, duration: 0.5 }}
                        className="max-w-md w-full mx-auto mt-10 px-6"
                    >
                        {/* Receipt Header */}
                        <div className="text-center mb-6">
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.2, type: "spring", bounce: 0.5 }}
                                className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-200"
                            >
                                <FiCheckCircle className="w-8 h-8 text-white" />
                            </motion.div>
                            <h2 className="text-2xl font-black text-gray-800">Unit 1 Complete!</h2>
                            <p className="text-sm text-gray-400 mt-1">School Identity has been verified and saved.</p>
                        </div>

                        {/* Receipt Body */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-3xl shadow-xl shadow-gray-100/80 border border-gray-100 overflow-hidden"
                        >
                            {/* Receipt paper top notch */}
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
                                    <motion.div
                                        key={item.label}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.35 + i * 0.06 }}
                                        className="flex items-start gap-3"
                                    >
                                        <span className="text-lg mt-0.5">{item.icon}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold uppercase tracking-wider text-gray-300">{item.label}</p>
                                            <p className="text-base font-semibold text-gray-800 truncate">{item.value || "—"}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                            {/* Dashed divider */}
                            <div className="mx-6 border-t-2 border-dashed border-gray-100" />
                            <div className="px-6 py-4">
                                <p className="text-xs text-center text-gray-300">Tap below to make corrections</p>
                            </div>
                        </motion.div>

                        {/* Unlock & Edit Button */}
                        <motion.button
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.7 }}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.97 }}
                            onClick={() => { setIsReviewMode(false); setCurrentStep(1); }}
                            className="mt-6 w-full py-5 rounded-2xl font-black text-lg tracking-wide bg-gradient-to-r from-indigo-500 to-purple-600 text-white shadow-xl shadow-indigo-200 border-b-[5px] border-indigo-700 active:border-b-0 active:translate-y-[5px] transition-all flex items-center justify-center gap-3"
                        >
                            <FiEdit2 className="w-5 h-5" />
                            Unlock &amp; Edit Data
                        </motion.button>
                    </motion.div>
                ) : (
                    /* ---- WIZARD MODE ---- */
                    <div className="flex-1 max-w-md w-full mx-auto mt-12 px-6">
                    <AnimatePresence mode="wait">

                        {/* ---- STEP 1: School Name & School ID ---- */}
                        {currentStep === 1 && (
                            <motion.div
                                key="step1"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {stepQuestions[1]}
                                </h2>
                                <p className="mt-2 text-sm text-gray-400">{stepSubtitles[1]}</p>

                                <div className="relative mt-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">School ID</label>
                                    <input
                                        type="text"
                                        name="school_id"
                                        value={formData.school_id}
                                        onChange={handleChange}
                                        onBlur={() => { if (formData.school_id.length >= 6) handleFetchData(formData.school_id); }}
                                        placeholder="e.g. 101010"
                                        maxLength={6}
                                        className={chunkyInput}
                                    />
                                    {formData.school_id.length === 6 && /^\d+$/.test(formData.school_id) && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute right-4 top-10 bg-green-100 p-1.5 rounded-full"
                                        >
                                            <FiCheck className="text-green-600 w-5 h-5" />
                                        </motion.div>
                                    )}
                                </div>

                                <div className="mt-4">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">School Name</label>
                                    <input
                                        type="text"
                                        name="school_name"
                                        value={formData.school_name}
                                        onChange={handleChange}
                                        disabled={!!formData.iern}
                                        placeholder="e.g. San Isidro Elementary School"
                                        className={chunkyInput}
                                    />
                                </div>
                                {formData.iern && (
                                    <div className="mt-4">
                                        <label className="block text-xs font-bold uppercase tracking-wider text-green-500 mb-1">Official IERN</label>
                                        <input
                                            type="text"
                                            value={formData.iern}
                                            disabled
                                            className={chunkyInput + " !border-green-300 !bg-green-50"}
                                        />
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ---- STEP 2: Region, Division, District ---- */}
                        {currentStep === 2 && (
                            <motion.div
                                key="step2"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {stepQuestions[2]}
                                </h2>
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
                                                {provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Municipality</label>
                                            <select name="municipality" value={formData.municipality} onChange={handleCityChange} disabled={!formData.province} className={chunkySelect}>
                                                <option value="">Select</option>
                                                {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Barangay</label>
                                            <select name="barangay" value={formData.barangay} onChange={handleChange} disabled={!formData.municipality} className={chunkySelect}>
                                                <option value="">Select</option>
                                                {barangayOptions.map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Division</label>
                                             <select name="division" value={formData.division} onChange={handleDivisionChange} disabled={!formData.region} className={chunkySelect}>
                                                <option value="">Select</option>
                                                {divisionOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">District</label>
                                             <select name="district" value={formData.district} onChange={handleChange} disabled={!formData.division} className={chunkySelect}>
                                                <option value="">Select</option>
                                                {districtOptions.map(d => <option key={d} value={d}>{d}</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Leg. District</label>
                                            <select name="leg_district" value={formData.leg_district} onChange={handleChange} className={chunkySelect}>
                                                <option value="">Select</option>
                                                {legDistrictOptions.map(l => <option key={l} value={l}>{l}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ---- STEP 3: School Type & Curricular Offering ---- */}
                        {currentStep === 3 && (
                            <motion.div
                                key="step3"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {stepQuestions[3]}
                                </h2>
                                <p className="mt-2 text-sm text-gray-400">{stepSubtitles[3]}</p>

                                <div className="mt-6">
                                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Curricular Offering</label>
                                    <select
                                        name="curricular_offering"
                                        value={formData.curricular_offering}
                                        onChange={handleChange}
                                        className={chunkySelect}
                                    >
                                        <option value="">Select Curricular Offering...</option>
                                        <option value="Purely Elementary">Purely ES</option>
                                        <option value="Elementary School and Junior High School (K-10)">ES and JHS (K to 10)</option>
                                        <option value="Junior High and Senior High">JHS with SHS</option>
                                        <option value="All Offering (K to 12)">All Offering (K to 12)</option>
                                        <option value="Purely Junior High School">Purely JHS</option>
                                        <option value="Purely Senior High School">Purely SHS</option>
                                    </select>
                                </div>

                                {/* Visual feedback when selected */}
                                {formData.curricular_offering && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="mt-6 bg-green-50 border-2 border-green-200 rounded-2xl p-4 flex items-center gap-3"
                                    >
                                        <div className="bg-green-100 p-2 rounded-full">
                                            <FiCheck className="text-green-600 w-5 h-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-green-700">Selected</p>
                                            <p className="text-xs text-green-600">{formData.curricular_offering}</p>
                                        </div>
                                    </motion.div>
                                )}
                            </motion.div>
                        )}

                        {/* ---- STEP 4: Contact Info / Coordinates ---- */}
                        {currentStep === 4 && (
                            <motion.div
                                key="step4"
                                variants={slideVariants}
                                initial="enter"
                                animate="center"
                                exit="exit"
                                transition={{ duration: 0.3 }}
                            >
                                <h2 className="text-2xl font-bold text-gray-800">
                                    {stepQuestions[4]}
                                </h2>
                                <p className="mt-2 text-sm text-gray-400">{stepSubtitles[4]}</p>

                                <div className="mt-6 grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Latitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            name="latitude"
                                            value={formData.latitude}
                                            onChange={handleChange}
                                            className={chunkyInput}
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">Longitude</label>
                                        <input
                                            type="number"
                                            step="any"
                                            name="longitude"
                                            value={formData.longitude}
                                            onChange={handleChange}
                                            className={chunkyInput}
                                        />
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

            {/* ========== TASK 4: STICKY ACTION BAR (only shown in wizard mode) ========== */}
            {!isReviewMode && (
            <div className="fixed bottom-0 left-0 w-full p-6 bg-white border-t border-gray-100 flex justify-center z-50">
                <div className="w-full max-w-md flex gap-3">
                    {/* Back button (only shown after step 1) */}
                    {currentStep > 1 && (
                        <motion.button
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            onClick={handleBack}
                            className="px-5 py-4 rounded-2xl font-bold text-gray-500 bg-gray-100 border-b-[4px] border-gray-200 active:border-b-0 active:translate-y-[4px] transition-all"
                        >
                            Back
                        </motion.button>
                    )}

                    {/* Continue / Complete Level button */}
                    {currentStep === TOTAL_STEPS ? (
                        <button
                            onClick={handleNext}
                            disabled={loading || !isCurrentStepValid()}
                            className="flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center bg-green-500 border-b-[6px] border-green-700 active:border-b-0 active:translate-y-[6px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Syncing...
                                </span>
                            ) : "Complete Level ⭐"}
                        </button>
                    ) : (
                        <button
                            onClick={handleNext}
                            disabled={loading || !isCurrentStepValid()}
                            className="flex-1 py-4 rounded-2xl text-white font-bold text-lg text-center bg-blue-500 border-b-[6px] border-blue-700 active:border-b-0 active:translate-y-[6px] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
                        >
                            {loading ? 'Loading...' : 'Continue'}
                        </button>
                    )}
                </div>
            </div>
            )}

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="School Identity profile setup is complete! ✓"
                redirectUrl="/modular-dashboard"
            />

            <AnimatePresence>
                {showIernModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
                    >
                        <motion.div
                            initial={{ scale: 0.8, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.8, y: 20 }}
                            transition={{ type: "spring", bounce: 0.5 }}
                            className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center relative overflow-hidden"
                        >
                            {/* Decorative Background */}
                            <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-40 h-40 bg-green-100 rounded-full blur-3xl opacity-50"></div>
                            
                            <motion.div 
                                initial={{ rotate: -180, scale: 0 }}
                                animate={{ rotate: 0, scale: 1 }}
                                transition={{ type: "spring", delay: 0.2 }}
                                className="w-20 h-20 bg-green-500 rounded-full mx-auto flex items-center justify-center shadow-lg relative z-10"
                            >
                                <span className="text-4xl">🌟</span>
                            </motion.div>
                            
                            <h2 className="text-3xl font-extrabold text-gray-800 mt-6 relative z-10">School Identified!</h2>
                            <p className="text-gray-500 mt-3 text-sm relative z-10">
                                Your official InsightEd Educational Registry Number (IERN) is:
                            </p>
                            
                            <motion.div 
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="bg-gray-50 border-2 border-gray-200 rounded-2xl p-4 mt-6 relative z-10"
                            >
                                <span className="text-4xl tracking-widest font-black text-green-600">
                                    {fetchedIern}
                                </span>
                            </motion.div>
                            
                            <button
                                onClick={() => setShowIernModal(false)}
                                className="w-full mt-8 py-4 rounded-2xl text-white font-bold text-lg text-center bg-blue-500 border-b-[6px] border-blue-700 active:border-b-0 active:translate-y-[6px] transition-all relative z-10"
                            >
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
