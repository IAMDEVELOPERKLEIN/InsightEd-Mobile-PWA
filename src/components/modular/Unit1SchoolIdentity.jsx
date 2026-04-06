import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiCheck, FiEdit2, FiArrowLeft, FiUnlock, FiInfo, FiMaximize2, FiSave } from "react-icons/fi";
import { saveUnitDraft, getUnitDraft, clearUnitDraft } from "../../db";
import { useAuth } from "../../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import LocationPickerMap from "../LocationPickerMap";
import useReadOnly from "../../hooks/useReadOnly";
import { normalizeOffering } from "../../utils/dataNormalization";
import DocumentUpload from "./DocumentUpload";
import { resolveAssetUrl, resolveDocUrl } from "../../utils/assetHelper";

const TOTAL_STEPS = 7;

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
const Unit1SchoolIdentity = ({ targetSchoolId, isReadOnly: propReadOnly }) => {
    const formatDateAbbr = (dateStr) => {
        if (!dateStr) return "—";
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
    };

    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const [currentStep, setCurrentStep] = useState(0);
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [showWelcomeBack, setShowWelcomeBack] = useState(false);
    const [showIernModal, setShowIernModal] = useState(false);
    const [fetchedIern, setFetchedIern] = useState(null);
    const [isReviewMode, setIsReviewMode] = useState(false);
    const [isModeLoading, setIsModeLoading] = useState(true);
    const { isReadOnly: hookIsReadOnly, isSuperUser: hookIsSuperUser } = useReadOnly(); // Added
    const isReadOnly = propReadOnly ?? hookIsReadOnly;

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
        ownership: "",
        google_drive_link: "",
        google_drive_file_id: "",
        google_drive_file_name: "",
        google_drive_thumbnail_url: "",
        local_file_path: "",
        local_file_name: "",
        school_type: "",
        mother_school_id: "",
        extension_mother_school_name: "",
        ownership_document_type: "",
        established_month: "",
        established_year: "",
        head_first_name: "",
        head_middle_name: "",
        head_last_name: "",
        head_sex: "",
        head_position_title: "",
        head_date_hired: "",
        head_hired_month: "",
        head_hired_day: "",
        head_hired_year: "",
        ownership_doc_id: null,
        local_file_size: null,
    });

    const [originalSchoolLocation, setOriginalSchoolLocation] = useState(null);

    // ── School ID Unlock Safeguard ───────────────────────────────────────────
    const [isSchoolIdLocked, setIsSchoolIdLocked] = useState(true);
    const [showUnlockDialog, setShowUnlockDialog] = useState(false);
    const [unlockInput, setUnlockInput] = useState("");

    const [regionOptions, setRegionOptions] = useState([]);
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [barangayOptions, setBarangayOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]);
    const [districtOptions, setDistrictOptions] = useState([]);
    const [legDistrictOptions, setLegDistrictOptions] = useState([]);
    const [driveLinkValidating, setDriveLinkValidating] = useState(false);
    const [driveLinkError, setDriveLinkError] = useState("");
    const [fetchingMotherSchool, setFetchingMotherSchool] = useState(false);
    const [motherSchoolNotFound, setMotherSchoolNotFound] = useState(false);
    const [showGDriveGuide, setShowGDriveGuide] = useState(false);
    const [showDraftModal, setShowDraftModal] = useState(false);
    const [showFullscreenPdf, setShowFullscreenPdf] = useState(false);
    const [schoolNameWarning, setSchoolNameWarning] = useState("");
    const [isCertified, setIsCertified] = useState(false);

    // ── PARALLEL data-fetch on mount ────────────────────────────────────────
    useEffect(() => {
        if (authLoading) return; // Wait for AuthContext to resolve the actual user session

        const init = async () => {
            const storedId = targetSchoolId || user?.school_id || localStorage.getItem("schoolId");
            if (!storedId) {
                const draft = await getUnitDraft(1, "anonymous"); // Fallback or global draft
                if (draft && draft.formData) {
                    setFormData(prev => ({ ...prev, ...draft.formData }));
                    setCurrentStep(Math.min(draft.step, TOTAL_STEPS - 1));
                    setShowWelcomeBack(true);
                    setTimeout(() => setShowWelcomeBack(false), 3000);
                }
                setIsModeLoading(false);
                return;
            }

            // Kick off all fetches simultaneously
            const [savedRes, iernRes, draft] = await Promise.all([
                fetch(`/api/ph_schools/${storedId}`).catch(() => null),
                fetch(`/api/schools_iern/${storedId}`).catch(() => null),
                getUnitDraft(1, storedId)
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

            // Start with base data from backend or empty state
            let merged = { ...formData, school_id: storedId };

            if (iernRow) {
                merged = {
                    ...merged,
                    school_name: iernRow.School_Name || "",
                    region: iernRow.Region || "",
                    province: iernRow.Province || "",
                    municipality: iernRow.Municipality || iernRow.City || "",
                    barangay: iernRow.Barangay || "",
                    division: iernRow.Division || "",
                    district: iernRow.District || "",
                    leg_district: iernRow.Legislative_District || "",
                    latitude: iernRow.Latitude || "",
                    longitude: iernRow.Longitude || "",
                    iern: iernRow.iern || ""
                };
            }

            if (d) {
                merged = {
                    ...merged,
                    school_name: d.school_name || merged.school_name,
                    region: d.region || merged.region,
                    province: d.province || merged.province,
                    municipality: d.municipality || merged.municipality,
                    barangay: d.barangay || merged.barangay,
                    division: d.division || merged.division,
                    district: d.district || merged.district,
                    leg_district: d.leg_district || merged.leg_district,
                    curricular_offering: normalizeOffering(d.curricular_offering) || merged.curricular_offering,
                    latitude: d.latitude || merged.latitude,
                    longitude: d.longitude || merged.longitude,
                    iern: d.iern || merged.iern,
                    school_head: d.school_head || merged.school_head,
                    contact_number: d.contact_number || merged.contact_number,
                    ownership: d.ownership === "deped owned" ? "deped" : (d.ownership || merged.ownership),
                    google_drive_link: d.google_drive_link || merged.google_drive_link,
                    google_drive_file_id: d.google_drive_file_id || merged.google_drive_file_id,
                    google_drive_file_name: d.google_drive_file_name || merged.google_drive_file_name,
                    google_drive_thumbnail_url: d.google_drive_thumbnail_url || merged.google_drive_thumbnail_url,
                    school_type: d.school_type || merged.school_type,
                    mother_school_id: d.mother_school_id || merged.mother_school_id,
                    extension_mother_school_name: d.extension_mother_school_name || merged.extension_mother_school_name,
                    ownership_document_type: d.ownership_document_type || merged.ownership_document_type,
                    local_file_path: d.local_file_path || merged.local_file_path,
                    local_file_name: d.local_file_name || merged.local_file_name,
                    head_position_title: d.head_position_title || merged.head_position_title,
                    ...(() => {
                        const hiredVal = (d.head_date_hired) ? d.head_date_hired.split('T')[0] : merged.head_date_hired;
                        const hiredParts = hiredVal ? hiredVal.split('-') : [];
                        
                        return {
                            head_date_hired: hiredVal,
                            head_hired_year: hiredParts[0] || "",
                            head_hired_month: hiredParts[1] ? new Date(hiredVal).toLocaleString('default', { month: 'short' }).replace('.', '') : "",
                            head_hired_day: hiredParts[2] ? parseInt(hiredParts[2]).toString() : "",
                        };
                    })(),
                    head_first_name: d.head_first_name || merged.head_first_name,
                    head_middle_name: d.head_middle_name || merged.head_middle_name,
                    head_last_name: d.head_last_name || merged.head_last_name,
                    head_sex: d.head_sex || merged.head_sex,
                    established_month: d.established_month || merged.established_month,
                    established_year: d.established_year || merged.established_year,
                    ownership_doc_id: d.ownership_doc_id || merged.ownership_doc_id,
                };
            }

            // Also handle initial parsing from iernRow if d doesn't exist
            if (!d && iernRow) {
                // iernRow might not have these files, but let's be safe
            }

            // Draft explicitly overrides everything
            if (draft && draft.formData) {
                merged = { ...merged, ...draft.formData };
            }

            // ── Auto-Fill Logic for School Head ──────────────────────────────────
            // Populate from user session if fields are currently empty
            const sessionFirstName = user?.first_name || user?.firstName;
            const sessionLastName = user?.last_name || user?.lastName;

            if (!merged.head_first_name && sessionFirstName) {
                console.log("Auto-filling School Head First Name:", sessionFirstName);
                merged.head_first_name = sessionFirstName;
            }
            if (!merged.head_last_name && sessionLastName) {
                console.log("Auto-filling School Head Last Name:", sessionLastName);
                merged.head_last_name = sessionLastName;
            }

            setFormData(merged);

            // Pre-populate location dropdowns based on merged state
            if (merged.region) {
                const provRes = await fetch(`/api/locations/provinces?region=${encodeURIComponent(merged.region)}`).catch(() => null);
                if (provRes?.ok) setProvinceOptions(await provRes.json());
                if (merged.province) {
                    const cityRes = await fetch(`/api/locations/municipalities-by-province?region=${encodeURIComponent(merged.region)}&province=${encodeURIComponent(merged.province)}`).catch(() => null);
                    if (cityRes?.ok) setCityOptions(await cityRes.json());
                    if (merged.municipality) {
                        const brgyRes = await fetch(`/api/locations/barangays?region=${encodeURIComponent(merged.region)}&province=${encodeURIComponent(merged.province)}&municipality=${encodeURIComponent(merged.municipality)}`).catch(() => null);
                        if (brgyRes?.ok) setBarangayOptions(await brgyRes.json());
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

            if (iernRow && !d) {
                setFetchedIern(iernRow.iern || "");
                if (iernRow.iern) setShowIernModal(true);
            }

            // Determine if we should show review mode
            const dbCompleted = (d && (d.unit1 === 1 || d.unit1_completed === true));
            if (dbCompleted || propReadOnly) {
                setIsReviewMode(true);
            } else if (draft) {
                // If not completed, then we can restore the draft
                setCurrentStep(Math.min(draft.step, TOTAL_STEPS - 1));
                setShowWelcomeBack(true);
                setTimeout(() => setShowWelcomeBack(false), 3000);
            }

            // Initially lock if school_id exists
            if (merged.school_id) {
                setIsSchoolIdLocked(true);
            } else {
                setIsSchoolIdLocked(false);
            }

            if (merged.latitude && merged.longitude) {
                setOriginalSchoolLocation({
                    latitude: merged.latitude,
                    longitude: merged.longitude
                });
            }

            setIsModeLoading(false);
        };
        init();
    }, []);

    // ── Logic sync ───────────────────────────────────────────────────────────
    useEffect(() => {
        if (!formData.region) { setProvinceOptions([]); return; }
        fetch(`/api/locations/provinces?region=${encodeURIComponent(formData.region)}`)
            .then(r => r.json())
            .then(data => {
                const options = data || [];
                if (formData.region === 'Blank Region' && !options.includes('Blank Province')) options.unshift('Blank Province');
                setProvinceOptions(options);
            })
            .catch(() => {});
    }, [formData.region]);

    useEffect(() => {
        if (!formData.region || !formData.province) { setCityOptions([]); return; }
        fetch(`/api/locations/municipalities-by-province?region=${encodeURIComponent(formData.region)}&province=${encodeURIComponent(formData.province)}`)
            .then(r => r.json())
            .then(data => {
                const options = data || [];
                if (formData.province === 'Blank Province' && !options.includes('Blank Municipality')) options.unshift('Blank Municipality');
                setCityOptions(options);
            })
            .catch(() => {});
    }, [formData.region, formData.province]);

    useEffect(() => {
        if (!formData.region || !formData.province || !formData.municipality) { setBarangayOptions([]); return; }
        fetch(`/api/locations/barangays?region=${encodeURIComponent(formData.region)}&province=${encodeURIComponent(formData.province)}&municipality=${encodeURIComponent(formData.municipality)}`)
            .then(r => r.json())
            .then(data => {
                const options = data || [];
                if (formData.municipality === 'Blank Municipality' && !options.includes('Blank Barangay')) options.unshift('Blank Barangay');
                setBarangayOptions(options);
            })
            .catch(() => {});
    }, [formData.region, formData.province, formData.municipality]);

    useEffect(() => {
        if (!formData.region) { setDivisionOptions([]); setLegDistrictOptions([]); return; }
        Promise.all([
            fetch(`/api/locations/divisions?region=${encodeURIComponent(formData.region)}`).then(r => r.json()).catch(() => []),
            fetch(`/api/locations/leg-districts?region=${encodeURIComponent(formData.region)}`).then(r => r.json()).catch(() => []),
        ]).then(([divs, legs]) => { 
            const dOptions = divs || [];
            const lOptions = legs || [];
            if (formData.region === 'Blank Region') {
                if (!dOptions.includes('Blank Division')) dOptions.unshift('Blank Division');
                if (!lOptions.includes('Blank District')) lOptions.unshift('Blank District');
            }
            setDivisionOptions(dOptions); 
            setLegDistrictOptions(lOptions); 
        });
    }, [formData.region]);

    useEffect(() => {
        if (!formData.region || !formData.division) { setDistrictOptions([]); return; }
        fetch(`/api/locations/districts?region=${encodeURIComponent(formData.region)}&division=${encodeURIComponent(formData.division)}`)
            .then(r => r.json())
            .then(data => {
                const options = data || [];
                if (formData.division === 'Blank Division' && !options.includes('Blank District')) options.unshift('Blank District');
                setDistrictOptions(options);
            })
            .catch(() => {});
    }, [formData.region, formData.division]);

    useEffect(() => {
        fetch('/api/locations/regions')
            .then(r => r.json())
            .then(data => {
                const options = data || [];
                if (!options.includes('Blank Region')) options.unshift('Blank Region');
                setRegionOptions(options);
            })
            .catch(() => {});
    }, []);

    // ── Date Sync Logic ──────────────────────────────────────────────────────


    useEffect(() => {
        if (formData.head_hired_month && formData.head_hired_day && formData.head_hired_year) {
            const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
            const m = (months.indexOf(formData.head_hired_month) + 1).toString().padStart(2, '0');
            const d = formData.head_hired_day.padStart(2, '0');
            const y = formData.head_hired_year;
            const res = `${y}-${m}-${d}`;
            if (res !== formData.head_date_hired) setFormData(prev => ({ ...prev, head_date_hired: res }));
        }
    }, [formData.head_hired_month, formData.head_hired_day, formData.head_hired_year]);

    useEffect(() => {
        if (!formData.school_name) {
            setSchoolNameWarning("");
            return;
        }
        
        const abbrList = ["ES", "NHS", "PS", "CS", "CES", "HS", "IS", "SHS", "ELEM", "MNHS"];
        const regex = new RegExp(`\\b(${abbrList.join('|')})\\b`, 'i');
        const match = formData.school_name.match(regex);
        
        if (match) {
            const detected = match[1].toUpperCase();
            setSchoolNameWarning(`It looks like you are using an abbreviation (e.g., ${detected}). Please spell out the full name (e.g., National High School) for official record accuracy.`);
        } else {
            setSchoolNameWarning("");
        }
    }, [formData.school_name]);

    useEffect(() => {
        if (!isModeLoading && !isReviewMode) {
            const storedId = user?.school_id || localStorage.getItem("schoolId") || "anonymous";
            saveUnitDraft(1, storedId, { formData, step: currentStep });
        }
    }, [formData, currentStep, isModeLoading, isReviewMode, user]);

    // ── Handlers ─────────────────────────────────────────────────────────────
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    const handleRegionChange = (e) => setFormData(prev => ({ ...prev, region: e.target.value, province: "", municipality: "", barangay: "", division: "", district: "" }));
    const handleProvinceChange = (e) => setFormData(prev => ({ ...prev, province: e.target.value, municipality: "", barangay: "" }));
    const handleCityChange = (e) => setFormData(prev => ({ ...prev, municipality: e.target.value, barangay: "" }));
    const handleDivisionChange = (e) => setFormData(prev => ({ ...prev, division: e.target.value, district: "" }));
    const handleOwnershipChange = (e) => {
        setDriveLinkError("");
        setFormData(prev => ({ 
            ...prev, 
            ownership: e.target.value, 
            ownership_document_type: "",
            google_drive_link: "", 
            google_drive_file_id: "", 
            google_drive_file_name: "", 
            google_drive_thumbnail_url: "" 
        }));
    };
    const handleSchoolTypeChange = (e) => setFormData(prev => ({ ...prev, school_type: e.target.value, mother_school_id: "", extension_mother_school_name: "" }));
    
    const handleGoogleDriveLink = (e) => {
        const link = e.target.value;
        setFormData(prev => ({ ...prev, google_drive_link: link }));
        setDriveLinkError("");
    };

    const validateAndFetchGoogleDriveLink = async (link) => {
        if (!link.trim()) {
            setDriveLinkError("Please enter a Google Drive link");
            return;
        }

        setDriveLinkValidating(true);
        setDriveLinkError("");

        try {
            const response = await fetch("/api/validate-google-drive-link", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ link }),
            });

            const result = await response.json();

            if (!response.ok) {
                setDriveLinkError(result.error || "Failed to validate link. Make sure it's public and shared correctly.");
                setDriveLinkValidating(false);
                return;
            }

            setFormData(prev => ({
                ...prev,
                google_drive_file_id: result.fileId,
                google_drive_file_name: result.fileName,
                google_drive_thumbnail_url: result.thumbnailUrl,
            }));

            setDriveLinkError("");
        } catch (err) {
            console.error("Validation error:", err);
            setDriveLinkError("Error validating link. Please try again.");
        } finally {
            setDriveLinkValidating(false);
        }
    };

    const openGoogleDrivePicker = () => {
        // Load Google Picker API and open file picker
        if (window.gapi && window.gapi.picker) {
            const picker = new window.gapi.picker.PickerBuilder()
                .addView(window.gapi.picker.ViewId.DOCS)
                .addView(window.gapi.picker.ViewId.PDFS)
                .setOAuthToken(localStorage.getItem("google_auth_token"))
                .setCallback((data) => {
                    if (data.action === window.gapi.picker.Action.PICKED) {
                        const file = data.docs[0];
                        const driveLink = `https://drive.google.com/file/d/${file.id}/view`;
                        setFormData(prev => ({ ...prev, google_drive_link: driveLink }));
                        validateAndFetchGoogleDriveLink(driveLink);
                    }
                })
                .build();
            picker.setVisible(true);
        } else {
            alert("Google Picker not loaded. Please paste the link manually instead.");
        }
    };

    const handleUndoLocation = () => {
        if (originalSchoolLocation) {
            setFormData(prev => ({
                ...prev,
                latitude: originalSchoolLocation.latitude,
                longitude: originalSchoolLocation.longitude
            }));
        }
    };

    const handleBack = () => {
        if (currentStep > 0) setCurrentStep(s => s - 1);
        else navigate("/modular-dashboard");
    };

    const handleNext = () => {
        if (currentStep < TOTAL_STEPS - 1) setCurrentStep(s => s + 1);
        else handleSubmit();
    };

    const handleSaveDraftAndExit = async () => {
        const storedId = user?.school_id || localStorage.getItem("schoolId") || "anonymous";
        await saveUnitDraft(1, storedId, { formData, step: currentStep });
        if (formData.curricular_offering) {
            localStorage.setItem("schoolOffering", formData.curricular_offering);
        }
        navigate("/modular-dashboard");
    };

    const handleSubmit = async () => {
        try {
            setLoading(true);
            let finalIern = formData.iern;
            if (!finalIern && formData.school_id) {
                const r = await fetch(`/api/schools_iern/${formData.school_id}`).catch(() => null);
                if (r?.ok) { const j = await r.json(); if (j.exists && j.data?.iern) finalIern = j.data.iern; }
            }
            // STRICT VALIDATION WARNING (Frontend)
            const requiredFields = [
                { key: 'barangay', label: 'Barangay' },
                { key: 'leg_district', label: 'Legislative District' },
                { key: 'ownership', label: 'Ownership' },
                { key: 'school_type', label: 'School Classification' },
                { key: 'curricular_offering', label: 'Curricular Offering' },
                { key: 'latitude', label: 'Map Pin (Latitude)' },
                { key: 'longitude', label: 'Map Pin (Longitude)' },
                { key: 'school_name', label: 'School Name' },
                { key: 'local_file_path', label: 'Ownership Document' },
                { key: 'established_month', label: 'Month Established' },
                { key: 'established_year', label: 'Year Established' }
            ];

            const missing = requiredFields.filter(f => !formData[f.key]).map(f => f.label);
            
            if (missing.length > 0) {
                const proceed = window.confirm(
                    `Warning: The following fields are missing: ${missing.join(", ")}.\n\n` +
                    "While you can save your progress, this unit will NOT be marked as 'Accomplished' on your dashboard until these fields are provided. Do you want to proceed?"
                );
                if (!proceed) {
                    setLoading(false);
                    return;
                }
            }

            // Prepare JSON payload (no more files - using Google Drive links)
            const dataToSend = {
                school_id: formData.school_id,
                school_name: formData.school_name,
                region: formData.region,
                province: formData.province,
                municipality: formData.municipality,
                barangay: formData.barangay,
                division: formData.division,
                district: formData.district,
                leg_district: formData.leg_district,
                curricular_offering: formData.curricular_offering,
                latitude: formData.latitude,
                longitude: formData.longitude,
                iern: finalIern || "",
                school_head: formData.school_head,
                contact_number: formData.contact_number,
                ownership: formData.ownership,
                google_drive_thumbnail_url: formData.google_drive_thumbnail_url,
                established_month: formData.established_month,
                established_year: formData.established_year,
                school_type: formData.school_type,
                mother_school_id: formData.mother_school_id,
                extension_mother_school_name: formData.extension_mother_school_name,
                ownership_document_type: formData.ownership_document_type,
                head_first_name: formData.head_first_name,
                head_middle_name: formData.head_middle_name,
                head_last_name: formData.head_last_name,
                head_sex: formData.head_sex,
                head_position_title: formData.head_position_title,
                head_date_hired: formData.head_date_hired,
                local_file_path: formData.local_file_path,
                local_file_name: formData.local_file_name,
                local_file_size: formData.local_file_size,
            };
            
            const res = await fetch("/api/ph_schools/unit1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });
            
            if (!res.ok) {
                const errText = await res.text().catch(() => "");
                console.error(`API Error: ${res.status}`, errText);
                throw new Error(`HTTP ${res.status}: ${errText || "Unknown error"}`);
            }
            
            await clearUnitDraft(1, formData.school_id);
            const stored = localStorage.getItem("quest_progress");
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            
            const isCompleted = missing.length === 0;
            if (isCompleted && !progress.completedUnits.includes(1)) { 
                progress.completedUnits.push(1); 
                progress.xp += 150; 
                localStorage.setItem("quest_progress", JSON.stringify(progress)); 
            } else if (!isCompleted) {
                // If they cleared it, remove it from progress
                progress.completedUnits = progress.completedUnits.filter(u => u !== 1);
                localStorage.setItem("quest_progress", JSON.stringify(progress));
            }

            localStorage.setItem("schoolId", formData.school_id);
            localStorage.setItem("schoolOffering", formData.curricular_offering);
            
            // Sync progress to cloud for Activity Dashboard
            fetch('/api/user/progress', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    unitId: 1, 
                    schoolId: formData.school_id,
                    completed: isCompleted // Note: Backend handles this too, but good to be explicit
                })
            }).catch(e => console.warn("Activity sync failed:", e));

            setShowSuccess(true);
        } catch (err) {
            console.error("Submit error details:", err);
            const errorMsg = err.message || "Unknown error";
            alert(`Failed to sync: ${errorMsg}\n\nProgress saved locally.`);
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
        { q: "School Head Information", sub: "Please provide the details of the school's primary administrator." },
        { q: "Pin the school 📍", sub: "Confirm the coordinates to update the school's map registry." },
        { q: "School Ownership & Classification", sub: "Provide ownership details and school classification." },
    ];

    const isStep0Valid = formData.school_id.length === 6 && /^\d+$/.test(formData.school_id);
    const isStep1Valid = formData.school_name.trim().length > 3 && !schoolNameWarning;
    const isStep2Valid = formData.region && formData.province && formData.municipality && formData.barangay && formData.division && formData.district && formData.leg_district;
    const isStep3Valid = formData.curricular_offering !== "";
    const isStep4Valid = formData.head_first_name !== "" && formData.head_last_name !== "" && formData.head_position_title !== "" && formData.head_date_hired !== "";
    const isStep5Valid = formData.latitude !== "" && formData.longitude !== "";
    const isStep6Valid = formData.ownership && 
        formData.ownership_document_type && 
        formData.local_file_path && 
        formData.school_type &&
        formData.established_month &&
        formData.established_year && (
        (formData.school_type === "with_annex" && (formData.mother_school_id.length === 6 && /^\d+$/.test(formData.mother_school_id) && formData.extension_mother_school_name.trim().length > 0 && !motherSchoolNotFound)) ||
        (formData.school_type === "without_annex") ||
        (formData.school_type === "extension" && (formData.mother_school_id.length === 6 && /^\d+$/.test(formData.mother_school_id) && formData.extension_mother_school_name.trim().length > 0 && !motherSchoolNotFound)) ||
        (formData.school_type !== "without_annex" && motherSchoolNotFound && formData.extension_mother_school_name.trim().length > 5)
    );
    const isCurrentStepValid = () => {
        if (currentStep === 0) return isStep0Valid;
        if (currentStep === 1) return isStep1Valid;
        if (currentStep === 2) return isStep2Valid;
        if (currentStep === 3) return isStep3Valid;
        if (currentStep === 4) return isStep4Valid;
        if (currentStep === 5) return isStep5Valid;
        if (currentStep === 6) return isStep6Valid;
        return false;
    };

    if (isModeLoading) return <SkeletonWizard />;

    return (
        <div className="min-h-screen bg-white flex flex-col font-sans text-gray-900 overflow-hidden">
            
            {/* Minimal Header */}
            {!isReadOnly && (
                <header className="px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <button onClick={() => navigate("/modular-dashboard")} className="p-2 -ml-2 text-gray-400 hover:text-gray-900 transition-colors">
                            <FiArrowLeft className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="flex-1 max-w-[120px] mx-4 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <motion.div className="h-full bg-blue-600 rounded-full" initial={{ width: 0 }} animate={{ width: `${progressPercentage}%` }} transition={{ duration: 0.8, ease: "circOut" }} />
                    </div>
                    <span className="text-xs font-black tracking-widest text-gray-300 uppercase">Step {currentStep + 1}/{TOTAL_STEPS}</span>
                </header>
            )}

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
                        <div key="review" className="max-w-md mx-auto pb-32 mt-4 space-y-8">
                            {/* Header */}
                            <div className="text-center mb-10">
                                <motion.div 
                                    initial={{ scale: 0 }} 
                                    animate={{ scale: 1 }} 
                                    className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-100"
                                >
                                    <span className="text-4xl text-white">🏫</span>
                                </motion.div>
                                <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm border border-indigo-100">
                                    Unit 1 • School Identity Profile
                                </span>
                                <h1 className="text-3xl font-black text-slate-800 leading-tight tracking-tight px-4">{formData.school_name || "Official School Name"}</h1>
                                <p className="text-slate-500 font-medium mt-2">ID: <span className="font-black text-slate-800 tracking-wider">{formData.school_id}</span> • IERN: <span className="font-black text-slate-800 tracking-wider">{formData.iern || "PENDING"}</span></p>
                            </div>

                            {/* Core Stats Bar */}
                            <div className="bg-slate-50 rounded-[2.5rem] p-6 grid grid-cols-2 gap-6 border border-slate-100">
                                <div className="space-y-1">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Classification</span>
                                    <p className="font-black text-slate-700 text-sm italic">
                                        {formData.school_type === "with_annex" ? "School with Annex" : 
                                         formData.school_type === "extension" ? "Annex" : "Without Annex"}
                                    </p>
                                </div>
                                <div className="space-y-1 border-l border-slate-200 pl-6">
                                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Offering</span>
                                    <p className="font-black text-indigo-600 text-sm truncate">{formData.curricular_offering || "Unset"}</p>
                                </div>
                            </div>

                            {/* Geographical Registry */}
                            <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-8 text-6xl opacity-10 grayscale group-hover:grayscale-0 transition-all duration-700">📍</div>
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Geographical Registry</h3>
                                </div>
                                <div className="space-y-4">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Region</span>
                                            <p className="font-bold text-slate-700">{formData.region || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Province</span>
                                            <p className="font-bold text-slate-700">{formData.province || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Municipality</span>
                                            <p className="font-bold text-slate-700">{formData.municipality || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Barangay</span>
                                            <p className="font-bold text-slate-700">{formData.barangay || "—"}</p>
                                        </div>
                                    </div>
                                    <div className="pt-4 border-t border-slate-50 grid grid-cols-1 gap-4">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Division</span>
                                            <p className="font-bold text-slate-700">{formData.division || "—"}</p>
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">District</span>
                                            <p className="font-bold text-slate-700">{formData.district || "—"}</p>
                                        </div>
                                    </div>
                                </div>
                            </section>
                                
                                <section>
                                    <div className="flex items-center gap-2 mb-4 ml-2 mt-8">
                                        <div className="w-1 h-4 bg-indigo-500 rounded-full" />
                                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Foundation Info</h3>
                                    </div>
                                    <div className="bg-white rounded-[2.5rem] p-6 border border-slate-100 shadow-sm space-y-4">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Year Established</span>
                                                <p className="text-xl font-black text-slate-800">
                                                    {formData.established_month} {formData.established_year}
                                                </p>
                                            </div>
                                            <div className="w-12 h-12 rounded-2xl bg-indigo-50 flex items-center justify-center shadow-inner text-xl">
                                                🎊
                                            </div>
                                        </div>
                                    </div>
                                </section>

                            {/* Administration */}
                            <section className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl shadow-slate-200">
                                <div className="flex items-center gap-2 mb-8">
                                    <div className="w-1.5 h-6 bg-blue-400 rounded-full" />
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">School Administration</h3>
                                </div>
                                <div className="flex items-start gap-5 mb-8">
                                    <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-3xl">👤</div>
                                    <div>
                                        <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-1">School Head</p>
                                        <h4 className="text-xl font-black">{[formData.head_first_name, formData.head_middle_name, formData.head_last_name].filter(Boolean).join(' ')}</h4>
                                        <p className="text-slate-400 text-sm font-bold mt-1 uppercase tracking-wider">{formData.head_position_title || "Designation Unset"}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-6 pt-6 border-t border-white/10">
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Sex</span>
                                        <p className="font-black text-sm">{formData.head_sex || "—"}</p>
                                    </div>
                                    <div>
                                        <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest block mb-2">Date of Assignment</span>
                                        <p className="font-black text-sm">{formatDateAbbr(formData.head_date_hired)}</p>
                                    </div>
                                </div>
                            </section>

                            {/* Coordinates Overlay */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block mb-1">Latitude</span>
                                    <p className="font-black text-emerald-900 text-lg tracking-tight">{formData.latitude || "0.000000"}</p>
                                </div>
                                <div className="bg-emerald-50 rounded-3xl p-5 border border-emerald-100">
                                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-widest block mb-1">Longitude</span>
                                    <p className="font-black text-emerald-900 text-lg tracking-tight">{formData.longitude || "0.000000"}</p>
                                </div>
                            </div>

                            {/* Ownership & Compliance */}
                            <section className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                                <div className="flex items-center gap-2 mb-6">
                                    <div className="w-1.5 h-6 bg-purple-500 rounded-full" />
                                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Legal & Ownership</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-1">Ownership</span>
                                            <p className="font-black text-slate-800 text-lg capitalize">{formData.ownership?.replace('_', ' ') || "—"}</p>
                                        </div>
                                        <div className="w-12 h-12 rounded-2xl bg-purple-50 flex items-center justify-center text-2xl">⚖️</div>
                                    </div>
                                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block mb-2">Document Type</span>
                                        <p className="font-bold text-slate-700 text-sm">{formData.ownership_document_type || "No document provided"}</p>
                                    </div>
                                    {formData.local_file_path && (
                                        <div className="space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest block">Digital Archive</span>
                                                <span className="text-[9px] font-black bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full uppercase">Verified</span>
                                            </div>
                                            <div className="flex items-center gap-4 p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center text-xl shadow-inner">📄</div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-bold text-slate-700 text-sm truncate">
                                                        {formData.local_file_name || formData.local_file_path.split('/').pop()}
                                                    </p>
                                                    <a 
                                                        href={resolveDocUrl(formData.local_file_path, { download: true })} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        download={`Ownership_Document_${formData.school_id || 'Unit1'}.pdf`}
                                                        className="text-indigo-600 text-[10px] font-black uppercase tracking-tighter mt-0.5 hover:underline"
                                                    >
                                                        View Document &rarr;
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Unlock Action */}
                            <motion.div 
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-12"
                            >
                                {!propReadOnly && (
                                    <button 
                                        onClick={() => { setIsReviewMode(false); setCurrentStep(0); }}
                                        className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FiUnlock className="w-5 h-5 text-indigo-700" />
                                        </div>
                                        <span>Unlock to Edit Profile</span>
                                    </button>
                                )}
                                {!propReadOnly && (
                                    <p className="text-center text-slate-400 text-[10px] font-bold uppercase tracking-widest mt-4 px-8">
                                        Data is currently synced with the regional cloud registry. 
                                    </p>
                                )}
                            </motion.div>
                        </div>
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
                                            <div className="flex items-center justify-between pl-4 mb-2">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">6-Digit School ID</label>
                                                {isSchoolIdLocked ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em] bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">Autolocked</span>
                                                        <button 
                                                            onClick={() => setShowUnlockDialog(true)}
                                                            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95"
                                                        >
                                                            <FiUnlock className="w-3 h-3" />
                                                            Unlock
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-full border border-emerald-100 flex items-center gap-1.5 shadow-sm">
                                                        <FiCheck className="w-3.5 h-3.5" /> Editing Enabled
                                                    </span>
                                                )}
                                            </div>
                                            <div className="relative">
                                                <input 
                                                    type="tel" 
                                                    name="school_id" 
                                                    value={formData.school_id} 
                                                    onChange={handleChange} 
                                                    maxLength={6} 
                                                    placeholder="e.g. 101010" 
                                                    className={`${chunkyInput} ${isSchoolIdLocked ? '!bg-slate-50 !text-slate-500 font-black cursor-not-allowed border-dashed' : 'bg-white'}`} 
                                                    readOnly={isSchoolIdLocked}
                                                    onClick={() => isSchoolIdLocked && setShowUnlockDialog(true)}
                                                    autoFocus={!isSchoolIdLocked} 
                                                />
                                                {isStep0Valid && <FiCheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />}
                                            </div>
                                        </div>

                                        {/* Unlock Confirmation Section */}
                                        <AnimatePresence>
                                            {showUnlockDialog && (
                                                <motion.div 
                                                    initial={{ opacity: 0, y: 10, scale: 0.95 }} 
                                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="p-6 bg-slate-900 rounded-[2.5rem] border-4 border-indigo-500/20 text-white space-y-5 shadow-2xl">
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl flex items-center justify-center text-2xl shadow-xl shadow-indigo-500/20 flex-shrink-0">🔐</div>
                                                            <div className="space-y-1">
                                                                <h4 className="font-black text-xs uppercase tracking-[0.2em] text-indigo-400">Security Requirement</h4>
                                                                <p className="text-[12px] text-slate-300 font-bold leading-relaxed">Type <span className="text-white bg-white/20 px-1.5 py-0.5 rounded-md font-black">Confirm</span> exactly to unlock this protected field.</p>
                                                            </div>
                                                        </div>
                                                        <div className="space-y-2">
                                                            <input 
                                                                type="text" 
                                                                value={unlockInput}
                                                                onChange={(e) => setUnlockInput(e.target.value)}
                                                                placeholder="Type here..."
                                                                className="w-full p-4 bg-white/10 border-2 border-white/5 rounded-3xl text-white font-black text-center text-lg focus:outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-600"
                                                                autoFocus
                                                            />
                                                        </div>
                                                        <div className="flex gap-3">
                                                            <button 
                                                                onClick={() => { setShowUnlockDialog(false); setUnlockInput(""); }}
                                                                className="flex-1 py-4 bg-white/5 hover:bg-white/10 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all"
                                                            >
                                                                Cancel
                                                            </button>
                                                            <button 
                                                                disabled={unlockInput.toLowerCase() !== "confirm"}
                                                                onClick={() => {
                                                                    setIsSchoolIdLocked(false);
                                                                    setShowUnlockDialog(false);
                                                                    setUnlockInput("");
                                                                }}
                                                                className="flex-1 py-4 bg-indigo-500 disabled:opacity-20 text-slate-900 rounded-[1.5rem] text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-500/20"
                                                            >
                                                                Unlock ID
                                                            </button>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>

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
                                        <AnimatePresence>
                                            {schoolNameWarning && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.95 }} 
                                                    animate={{ opacity: 1, scale: 1 }} 
                                                    exit={{ opacity: 0, scale: 0.95 }} 
                                                    className="mt-4 p-4 bg-amber-50 border-2 border-amber-100 rounded-3xl flex gap-3 items-center"
                                                >
                                                    <FiInfo className="w-6 h-6 text-amber-500 flex-shrink-0" />
                                                    <p className="text-[13px] font-bold text-amber-800 leading-relaxed">{schoolNameWarning}</p>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}

                                {currentStep === 2 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Region</label>
                                                <select name="region" value={formData.region} onChange={handleRegionChange} className={chunkySelect}>
                                                    <option value="">Choose Region</option>
                                                    {regionOptions.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Province</label>
                                                    <select name="province" value={formData.province} onChange={handleProvinceChange} className={chunkySelect} disabled={!formData.region}>
                                                        <option value="" disabled hidden style={{color: '#999'}}>Select</option>
                                                        {provinceOptions.map(p => <option key={p}>{p}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Municipality</label>
                                                    <select name="municipality" value={formData.municipality} onChange={handleCityChange} className={chunkySelect} disabled={!formData.province}>
                                                        <option value="" disabled hidden style={{color: '#999'}}>Select</option>
                                                        {cityOptions.map(c => <option key={c}>{c}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Division</label>
                                                <select name="division" value={formData.division} onChange={handleDivisionChange} className={chunkySelect} disabled={!formData.region}>
                                                    <option value="" disabled hidden style={{color: '#999'}}>Select Division</option>
                                                    {divisionOptions.map(d => <option key={d}>{d}</option>)}
                                                </select>
                                            </div>
                                            <div className="grid grid-cols-1 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">District</label>
                                                    <select name="district" value={formData.district} onChange={handleChange} className={chunkySelect} disabled={!formData.division}>
                                                        <option value="" disabled hidden style={{color: '#999'}}>Select</option>
                                                        {districtOptions.map(d => <option key={d}>{d}</option>)}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Barangay</label>
                                                    <select name="barangay" value={formData.barangay} onChange={handleChange} className={chunkySelect} disabled={!formData.municipality}>
                                                        <option value="" disabled hidden style={{color: '#999'}}>Select</option>
                                                        {barangayOptions.map(b => <option key={b}>{b}</option>)}
                                                    </select>
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Legislative District</label>
                                                <select name="leg_district" value={formData.leg_district} onChange={handleChange} className={chunkySelect} disabled={!formData.region}>
                                                    <option value="" disabled hidden style={{color: '#999'}}>Select Leg. District</option>
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
                                            <option value="" disabled hidden style={{color: '#999'}}>Select Category...</option>
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

                                {currentStep === 4 && (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-1 gap-4">
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">First Name</label>
                                                <input
                                                    type="text"
                                                    name="head_first_name"
                                                    value={formData.head_first_name}
                                                    onChange={handleChange}
                                                    placeholder="First Name"
                                                    className={chunkyInput}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Middle Name</label>
                                                    <input
                                                        type="text"
                                                        name="head_middle_name"
                                                        value={formData.head_middle_name}
                                                        onChange={handleChange}
                                                        placeholder="Middle (Optional)"
                                                        className={chunkyInput}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Last Name</label>
                                                    <input
                                                        type="text"
                                                        name="head_last_name"
                                                        value={formData.head_last_name}
                                                        onChange={handleChange}
                                                        placeholder="Last Name"
                                                        className={chunkyInput}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Sex</label>
                                                <select
                                                    name="head_sex"
                                                    value={formData.head_sex}
                                                    onChange={handleChange}
                                                    className={chunkySelect}
                                                >
                                                    <option value="">Select Sex</option>
                                                    <option value="Male">Male</option>
                                                    <option value="Female">Female</option>
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">Position Title</label>
                                                <select
                                                    name="head_position_title"
                                                    value={formData.head_position_title}
                                                    onChange={handleChange}
                                                    className={chunkySelect}
                                                >
                                                    <option value="">Select Position</option>
                                                    <option value="Teacher I">Teacher I</option>
                                                    <option value="Teacher II">Teacher II</option>
                                                    <option value="Teacher III">Teacher III</option>
                                                    <option value="Teacher IV">Teacher IV</option>
                                                    <option value="Teacher V">Teacher V</option>
                                                    <option value="Teacher VI">Teacher VI</option>
                                                    <option value="Teacher VII">Teacher VII</option>
                                                    <option value="Master Teacher I">Master Teacher I</option>
                                                    <option value="Master Teacher II">Master Teacher II</option>
                                                    <option value="Master Teacher III">Master Teacher III</option>
                                                    <option value="Master Teacher IV">Master Teacher IV</option>
                                                    <option value="Master Teacher V">Master Teacher V</option>
                                                    <option value="Master Teacher VI">Master Teacher VI</option>
                                                    <option value="Head Teacher I">Head Teacher I</option>
                                                    <option value="Head Teacher II">Head Teacher II</option>
                                                    <option value="Head Teacher III">Head Teacher III</option>
                                                    <option value="Head Teacher IV">Head Teacher IV</option>
                                                    <option value="Head Teacher V">Head Teacher V</option>
                                                    <option value="Head Teacher VI">Head Teacher VI</option>
                                                    <option value="School Principal I">School Principal I</option>
                                                    <option value="School Principal II">School Principal II</option>
                                                    <option value="School Principal III">School Principal III</option>
                                                    <option value="School Principal IV">School Principal IV</option>
                                                    <option value="Assistant School Principal I">Assistant School Principal I</option>
                                                    <option value="Assistant School Principal II">Assistant School Principal II</option>
                                                    <option value="PSDS (Officer-in-Charge)">PSDS (Officer-in-Charge)</option>
                                                </select>
                                            </div>
                                            <div className="space-y-4">


                                                {/* Date Assigned Selection */}
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4 block">Date of Assignment</label>
                                                    <div className="grid grid-cols-3 gap-3">
                                                        <select name="head_hired_year" value={formData.head_hired_year} onChange={handleChange} className={chunkySelect + " !text-sm text-left px-4"}>
                                                            <option value="" disabled hidden>Year</option>
                                                            {Array.from({ length: 70 }, (_, i) => (new Date().getFullYear() - i).toString()).map(y => (
                                                                <option key={y} value={y}>{y}</option>
                                                            ))}
                                                        </select>
                                                        <select name="head_hired_month" value={formData.head_hired_month} onChange={handleChange} className={chunkySelect + " !text-sm text-left px-4"}>
                                                            <option value="" disabled hidden>Month</option>
                                                            {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((m, idx) => {
                                                                const currentYear = new Date().getFullYear();
                                                                const currentMonth = new Date().getMonth(); // 0-indexed
                                                                const isFuture = formData.head_hired_year === currentYear.toString() && idx > currentMonth;
                                                                return <option key={m} value={m} disabled={isFuture}>{m}</option>;
                                                            })}
                                                        </select>
                                                        <select name="head_hired_day" value={formData.head_hired_day} onChange={handleChange} className={chunkySelect + " !text-sm text-left px-4"}>
                                                            <option value="" disabled hidden>Day</option>
                                                            {(() => {
                                                                const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                                                                const mIdx = monthNames.indexOf(formData.head_hired_month);
                                                                const year = parseInt(formData.head_hired_year);
                                                                
                                                                let maxDays = 31;
                                                                if (mIdx !== -1 && !isNaN(year)) {
                                                                    maxDays = new Date(year, mIdx + 1, 0).getDate();
                                                                }
                                                                
                                                                const currentYear = new Date().getFullYear();
                                                                const currentMonth = new Date().getMonth();
                                                                const currentDay = new Date().getDate();

                                                                return Array.from({ length: maxDays }, (_, i) => (i + 1).toString()).map(d => {
                                                                    const dayNum = parseInt(d);
                                                                    const isFutureDay = formData.head_hired_year === currentYear.toString() && 
                                                                                        mIdx === currentMonth && 
                                                                                        dayNum > currentDay;
                                                                    return <option key={d} value={d} disabled={isFutureDay}>{d}</option>;
                                                                });
                                                            })()}
                                                        </select>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {currentStep === 5 && (
                                    <div className="space-y-4 pb-20">
                                        <div className="flex items-center justify-between px-1">
                                            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Refine School Position</h4>
                                            <div className="flex items-center gap-2">
                                                {originalSchoolLocation && (parseFloat(formData.latitude) !== parseFloat(originalSchoolLocation.latitude) || parseFloat(formData.longitude) !== parseFloat(originalSchoolLocation.longitude)) && (
                                                    <button 
                                                        type="button"
                                                        onClick={handleUndoLocation}
                                                        className="text-[10px] font-black text-white bg-rose-500 px-3 py-1 rounded-lg border border-rose-600 shadow-sm active:scale-95 transition-all flex items-center gap-1"
                                                    >
                                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" /></svg>
                                                        UNDO
                                                    </button>
                                                )}
                                                <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-lg border border-blue-100 animate-pulse">DRAG MARKER TO MOVE</span>
                                            </div>
                                        </div>
                                        
                                        <div className="h-48 rounded-[2rem] overflow-hidden border-2 border-gray-100 shadow-inner relative mt-0">
                                            <LocationPickerMap
                                                latitude={formData.latitude}
                                                longitude={formData.longitude}
                                                onLocationSelect={(lat, lng) => setFormData(prev => ({ ...prev, latitude: lat.toFixed(6), longitude: lng.toFixed(6) }))}
                                                readOnly={false}
                                                className="h-full"
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <input type="text" value={formData.latitude} disabled placeholder="Lat" className={chunkyInput + " text-sm text-center !bg-gray-50"} />
                                            <input type="text" value={formData.longitude} disabled placeholder="Long" className={chunkyInput + " text-sm text-center !bg-gray-50"} />
                                        </div>
                                    </div>
                                )}

                                        {currentStep === 6 && (
                                    <div className="space-y-6 pb-20">
                                        {/* Year Established */}
                                        <div className="space-y-3">
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4 block">Year Established</label>
                                            <div className="grid grid-cols-2 gap-4">
                                                <select
                                                    name="established_year"
                                                    value={formData.established_year}
                                                    onChange={handleChange}
                                                    className={chunkySelect}
                                                >
                                                    <option value="" disabled hidden style={{color: '#999'}}>Year...</option>
                                                    {Array.from({ length: new Date().getFullYear() - 1900 + 1 }, (_, i) => new Date().getFullYear() - i).map(y => (
                                                        <option key={y} value={y}>{y}</option>
                                                    ))}
                                                </select>
                                                <select 
                                                    name="established_month" 
                                                    value={formData.established_month} 
                                                    onChange={handleChange} 
                                                    className={chunkySelect}
                                                >
                                                    <option value="" disabled hidden style={{color: '#999'}}>Month...</option>
                                                    {["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"].map((m, idx) => {
                                                        const currentYear = new Date().getFullYear();
                                                        const currentMonth = new Date().getMonth();
                                                        const isFuture = formData.established_year === currentYear.toString() && idx > currentMonth;
                                                        return <option key={m} value={m} disabled={isFuture}>{m}</option>;
                                                    })}
                                                </select>
                                            </div>
                                        </div>

                                        {/* Ownership Question */}
                                        <div>
                                            <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4 block mb-2">Ownership</label>
                                            <select name="ownership" value={formData.ownership} onChange={handleOwnershipChange} className={chunkySelect}>
                                                <option value="" disabled hidden style={{color: '#999'}}>Select Ownership...</option>
                                                <option value="deped">DepEd Owned</option>
                                                <option value="privately_owned">Privately Owned</option>
                                                <option value="lgu_owned">LGU Owned</option>
                                            </select>
                                        </div>

                                        {/* Ownership Document Upload */}
                                        {formData.ownership && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4 block">Document Type</label>
                                                <select 
                                                    name="ownership_document_type" 
                                                    value={formData.ownership_document_type} 
                                                    onChange={handleChange} 
                                                    className={chunkySelect}
                                                >
                                                    <option value="" disabled hidden style={{color: '#999'}}>Select Document Type...</option>
                                                    <option value="Transfer Certificate of Title">Transfer Certificate of Title</option>
                                                    <option value="Special Patents">Special Patents</option>
                                                    <option value="Presidential Proclamations">Presidential Proclamations</option>
                                                    <option value="Deed of Sale">Deed of Sale</option>
                                                    <option value="Deed of Donation">Deed of Donation</option>
                                                    <option value="Deed of Donation (DepEd Registered)">Deed of Donation (DepEd Registered)</option>
                                                    <option value="Deed of Donation (Unregistered)">Deed of Donation (Unregistered)</option>
                                                    <option value="Usufruct Agreement">Usufruct Agreement</option>
                                                    <option value="Memorandum of Agreement">Memorandum of Agreement</option>
                                                    <option value="Lease Agreement">Lease Agreement</option>
                                                    <option value="Expropriation">Expropriation</option>
                                                    <option value="Tax Declaration Only">Tax Declaration Only</option>
                                                    <option value="Extrajudicial Settlement">Extrajudicial Settlement</option>
                                                </select>
                                                
                                                {/* Local Document Upload (Replaces GDrive) */}
                                                <div className="pt-2">
                                                    <DocumentUpload 
                                                        iern={formData.iern || formData.school_id} 
                                                        docType={formData.ownership_document_type}
                                                        initialFile={formData.local_file_path}
                                                        initialDocId={formData.ownership_doc_id}
                                                        initialFileSize={formData.local_file_size}
                                                        onUploadSuccess={(path, id, name, size) => setFormData(prev => ({ 
                                                            ...prev, 
                                                            local_file_path: path, 
                                                            ownership_doc_id: id, 
                                                            local_file_name: name,
                                                            local_file_size: size 
                                                        }))}
                                                    />
                                                    

                                                </div>
                                            </motion.div>
                                        )}

                                        {/* School Type Question */}
                                        {formData.local_file_path && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4 block">School Type</label>
                                                <select name="school_type" value={formData.school_type} onChange={handleSchoolTypeChange} className={chunkySelect}>
                                                    <option value="" disabled hidden style={{color: '#999'}}>Select School Type...</option>
                                                    <option value="with_annex">School with Annex</option>
                                                    <option value="without_annex">School without Annex</option>
                                                    <option value="extension">Annex</option>
                                                </select>
                                            </motion.div>
                                        )}

                                        {/* Mother School ID - For Annex & Extension */}
                                        {(formData.school_type === "with_annex" || formData.school_type === "extension") && (
                                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                                                className="space-y-3">
                                                <label className="text-[11px] font-bold text-gray-400 uppercase tracking-widest pl-4">
                                                    {formData.school_type === "with_annex" && "What is your annex school id?"}
                                                    {formData.school_type === "extension" && "What is your mother school ID?"}
                                                </label>
                                                <div className="relative">
                                                    <input
                                                        type="tel"
                                                        name="mother_school_id"
                                                        value={formData.mother_school_id}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setFormData(prev => ({ ...prev, mother_school_id: val }));
                                                            setMotherSchoolNotFound(false);
                                                            // Auto-fetch school name when 6 digits entered
                                                            if (val.length === 6 && /^\d+$/.test(val)) {
                                                                setFetchingMotherSchool(true);
                                                                fetch(`/api/schools_iern/${val}`)
                                                                    .then(r => r.ok ? r.json() : null)
                                                                    .then(data => {
                                                                        if (data?.exists && data.data?.School_Name) {
                                                                            setFormData(prev => ({ ...prev, extension_mother_school_name: data.data.School_Name }));
                                                                            setMotherSchoolNotFound(false);
                                                                        } else {
                                                                            setMotherSchoolNotFound(true);
                                                                            setFormData(prev => ({ ...prev, extension_mother_school_name: "" }));
                                                                        }
                                                                        setFetchingMotherSchool(false);
                                                                    })
                                                                    .catch(() => {
                                                                        setMotherSchoolNotFound(true);
                                                                        setFormData(prev => ({ ...prev, extension_mother_school_name: "" }));
                                                                        setFetchingMotherSchool(false);
                                                                    });
                                                            } else {
                                                                setFormData(prev => ({ ...prev, extension_mother_school_name: "" }));
                                                            }
                                                        }}
                                                        maxLength="6"
                                                        placeholder="6-digit ID"
                                                        className={chunkyInput}
                                                        autoFocus
                                                    />
                                                    {formData.mother_school_id.length === 6 && /^\d+$/.test(formData.mother_school_id) && !fetchingMotherSchool && !motherSchoolNotFound && <FiCheckCircle className="absolute right-5 top-1/2 -translate-y-1/2 text-emerald-500 w-6 h-6" />}
                                                    {formData.mother_school_id.length === 6 && /^\d+$/.test(formData.mother_school_id) && !fetchingMotherSchool && motherSchoolNotFound && <FiX className="absolute right-5 top-1/2 -translate-y-1/2 text-red-500 w-6 h-6" />}
                                                    {fetchingMotherSchool && <div className="absolute right-5 top-1/2 -translate-y-1/2 w-5 h-5 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />}
                                                </div>

                                                {motherSchoolNotFound && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                                        className="p-4 bg-amber-50 border-2 border-amber-100 rounded-[2rem] space-y-4">
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-xl">⚠️</span>
                                                            <p className="text-sm font-bold text-amber-800 leading-tight">School ID not found in database. Please enter the full school name manually:</p>
                                                        </div>
                                                        <div>
                                                            <input 
                                                                type="text" 
                                                                value={formData.extension_mother_school_name} 
                                                                onChange={(e) => {
                                                                    const val = e.target.value;
                                                                    setFormData(prev => ({ ...prev, extension_mother_school_name: val }));
                                                                }}
                                                                placeholder="Enter Official School Name"
                                                                className={chunkyInput + " !bg-white"}
                                                            />
                                                            {(() => {
                                                                const abbrList = ["ES", "NHS", "PS", "CS", "CES", "HS", "IS", "SHS", "ELEM", "MNHS"];
                                                                const regex = new RegExp(`\\b(${abbrList.join('|')})\\b`, 'i');
                                                                const match = formData.extension_mother_school_name.match(regex);
                                                                if (match) {
                                                                    return <p className="text-[10px] text-red-500 font-bold mt-2 px-4 italic leading-tight uppercase tracking-wider">🚫 No Abbreviations. Please spell out "{match[1].toUpperCase()}" (e.g., Elementary School).</p>;
                                                                }
                                                                return null;
                                                            })()}
                                                        </div>
                                                    </motion.div>
                                                )}

                                                {formData.extension_mother_school_name && !motherSchoolNotFound && (
                                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                                                        className="p-4 bg-blue-50 border-2 border-blue-100 rounded-2xl">
                                                        <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-1">Autofilled School Name</p>
                                                        <p className="text-lg font-black text-blue-900">{formData.extension_mother_school_name}</p>
                                                    </motion.div>
                                                )}
                                            </motion.div>
                                        )}


                                        {/* Certification Checkbox */}
                                        <motion.div 
                                            initial={{ opacity: 0, y: 20 }} 
                                            animate={{ opacity: 1, y: 0 }}
                                            onClick={() => setIsCertified(!isCertified)}
                                            className={`p-6 rounded-[3rem] border-2 mt-8 transition-all cursor-pointer flex items-start gap-4 ${
                                                isCertified 
                                                    ? 'bg-emerald-50 border-emerald-200' 
                                                    : 'bg-white border-slate-100 hover:border-slate-200 shadow-sm'
                                            }`}
                                        >
                                            <div className={`mt-1 w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${
                                                isCertified 
                                                    ? 'bg-emerald-500 border-emerald-500 text-white' 
                                                    : 'border-slate-300 bg-white'
                                            }`}>
                                                {isCertified && <FiCheck className="w-4 h-4" />}
                                            </div>
                                            <p className={`text-[11px] font-bold leading-relaxed tracking-tight ${isCertified ? 'text-emerald-900' : 'text-slate-500 uppercase tracking-widest'}`}>
                                                I hereby certify that all data and information provided in this module/unit is true and correct
                                            </p>
                                        </motion.div>


                                    </div>
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Sticky Navigation Footer */}
            {(!isReadOnly && !isReviewMode) && (
                <div className="fixed bottom-0 left-0 w-full p-6 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50">
                    <div className="max-w-md mx-auto flex gap-3">
                        {currentStep === 0 ? (
                            <button onClick={() => setShowDraftModal(true)} className="flex-none h-16 px-6 rounded-3xl bg-gray-100 flex items-center justify-center gap-2 text-gray-500 hover:text-gray-900 active:scale-95 transition-all">
                                <FiSave className="w-6 h-6" />
                                <span className="text-sm font-bold">Save Draft</span>
                            </button>
                        ) : (
                            <>
                                <button onClick={handleBack} className="w-16 h-16 rounded-3xl bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 active:scale-95 transition-all">
                                    <FiArrowLeft className="w-6 h-6" />
                                </button>
                                <button onClick={() => setShowDraftModal(true)} className="flex-none h-16 px-6 rounded-3xl bg-blue-50 border-2 border-blue-100 flex items-center justify-center gap-2 text-blue-500 hover:text-blue-700 active:scale-95 transition-all">
                                    <FiSave className="w-6 h-6" />
                                    <span className="text-sm font-bold">Save Draft</span>
                                </button>
                            </>
                        )}
                        <button onClick={handleNext} disabled={loading || (!hookIsSuperUser && !isCurrentStepValid()) || (currentStep === TOTAL_STEPS - 1 && !isCertified)}
                            className={`flex-1 h-16 rounded-[2rem] text-white font-black text-lg transition-all shadow-xl active:scale-98 disabled:opacity-30 disabled:scale-100
                                ${(currentStep === TOTAL_STEPS - 1 && !isReadOnly) ? "bg-emerald-500 shadow-emerald-200" : "bg-blue-600 shadow-blue-200"}`}>
                            {loading ? (
                                <div className="flex items-center justify-center gap-2">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    <span>Syncing...</span>
                                </div>
                            ) : (currentStep === TOTAL_STEPS - 1 && !isReadOnly) ? "💾 Save Profile" : "Continue"}
                        </button>
                    </div>
                </div>
            )}

            <SuccessModal isOpen={showSuccess} onClose={() => setShowSuccess(false)} message="School identity profile has been successfully saved to our cloud registry! ✓" redirectUrl="/modular-dashboard" />

            <AnimatePresence>
                {showDraftModal && (
                    <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-end justify-center">
                        <motion.div initial={{ y: 300 }} animate={{ y: 0 }} exit={{ y: 300 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full rounded-t-[3rem] p-10 pb-12 shadow-2xl relative">
                            <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mb-8" />
                            <div className="w-20 h-20 bg-blue-500 rounded-full mx-auto flex items-center justify-center text-3xl shadow-2xl shadow-blue-200 mb-6 font-bold text-white">
                                <FiSave />
                            </div>
                            <h2 className="text-2xl font-black text-gray-900 text-center leading-tight">Save Progress?</h2>
                            <p className="text-gray-500 text-center font-medium mt-3 px-4">Would you like to save your progress and go back to the modules overview?</p>
                            
                            <div className="grid grid-cols-2 gap-4 mt-10">
                                <button onClick={() => setShowDraftModal(false)}
                                    className="py-5 rounded-[2rem] bg-gray-100 text-gray-900 font-black text-lg active:scale-95 transition-all">
                                    Continue
                                </button>
                                <button onClick={handleSaveDraftAndExit}
                                    className="py-5 rounded-[2rem] bg-blue-600 text-white font-black text-lg shadow-xl shadow-blue-100 active:scale-95 transition-all">
                                    Save & Exit
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

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

            {/* Google Drive Sharing Guide Modal */}
            <AnimatePresence>
                {showGDriveGuide && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-gray-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="bg-white w-full max-w-lg rounded-[2rem] shadow-2xl overflow-hidden">
                            
                            {/* Header */}
                            <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 flex items-center justify-between">
                                <h3 className="text-xl font-black text-white">How to Share with "Anyone"</h3>
                                <button onClick={() => setShowGDriveGuide(false)} className="p-2 hover:bg-blue-700 rounded-full transition-colors">
                                    <FiX className="w-6 h-6 text-white" />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-6 space-y-6">
                                {/* Guide Image */}
                                <div className="bg-gray-50 rounded-xl overflow-hidden border-2 border-gray-200">
                                    <img 
                                        src="https://lh3.googleusercontent.com/d/1-_gdU-google-drive-share-guide" 
                                        alt="Google Drive sharing steps"
                                        className="w-full h-auto object-contain bg-white"
                                        onError={(e) => {
                                            e.target.style.display = 'none';
                                        }}
                                    />
                                    {/* Fallback if image fails to load */}
                                    <div className="p-8 text-center space-y-4">
                                        <p className="text-sm font-bold text-gray-700">Step-by-step guide:</p>
                                        <ol className="text-left space-y-3 text-sm text-gray-600">
                                            <li className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">1</span>
                                                <span>Open your file in Google Drive</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">2</span>
                                                <span>Click the <strong>Share</strong> button (top right)</span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">3</span>
                                                <span>Change from "Restricted" to <strong>"Anyone"</strong></span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">4</span>
                                                <span>Make sure the access level is set to <strong>"Viewer"</strong></span>
                                            </li>
                                            <li className="flex gap-3">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold text-xs">5</span>
                                                <span>Copy the share link and paste it here</span>
                                            </li>
                                        </ol>
                                    </div>
                                </div>

                                {/* Warning Box */}
                                <div className="p-4 bg-amber-50 border-l-4 border-amber-400 rounded">
                                    <p className="text-sm font-bold text-amber-900">⚠️ Important:</p>
                                    <p className="text-xs text-amber-800 mt-1">Make sure to select <strong>"Anyone with the link"</strong> not "Restricted" or "Specific people"</p>
                                </div>
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 p-4 border-t border-gray-200">
                                <button 
                                    onClick={() => setShowGDriveGuide(false)}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors"
                                >
                                    Got it! 👍
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}

                {/* Fullscreen PDF Modal */}
                {showFullscreenPdf && formData.google_drive_file_id && (
                    <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="w-full h-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        >
                            {/* Header */}
                            <div className="bg-emerald-600 p-4 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">📄</span>
                                    <div>
                                        <h3 className="text-white font-bold">{formData.google_drive_file_name}</h3>
                                        <p className="text-emerald-100 text-xs">Fullscreen View</p>
                                    </div>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setShowFullscreenPdf(false)}
                                    className="text-white hover:bg-emerald-700 p-2 rounded-lg transition-colors"
                                    title="Close"
                                >
                                    <FiX className="w-6 h-6" />
                                </button>
                            </div>

                            {/* PDF Viewer */}
                            <div className="flex-1 overflow-hidden">
                                <iframe
                                    src={`https://drive.google.com/file/d/${formData.google_drive_file_id}/preview`}
                                    loading="lazy"
                                    className="w-full h-full border-0"
                                    allowFullScreen
                                    referrerPolicy="no-referrer"
                                    title="Full document preview"
                                />
                            </div>

                            {/* Footer */}
                            <div className="bg-gray-50 border-t border-gray-200 p-4 flex items-center justify-between gap-3">
                                <a
                                    href={formData.google_drive_link}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold rounded-lg transition-colors"
                                >
                                    Open in Google Drive
                                </a>
                                <button
                                    type="button"
                                    onClick={() => setShowFullscreenPdf(false)}
                                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-bold rounded-lg transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Unit1SchoolIdentity;
