// src/Register.jsx

import React, { useState, useEffect, useRef, useMemo } from 'react';
import logo from './assets/InsightEd1.png';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import PageTransition from './components/PageTransition';
import Papa from 'papaparse';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- CONSTANTS ---111111
const CSV_PATH = `${import.meta.env.BASE_URL}schools.csv`;
const OFFICES_CSV_PATH = `${import.meta.env.BASE_URL}Personnel Positions by Functional Division at RO and SDO Levels - Sheet1.csv`;

// --- AUTHORIZATION CODES (Secure & Alphanumeric) ---
const AUTHORIZATION_CODES = {
    'Central Office': '8XK2-M9P4',
    'Regional Office': 'H7V3-L5N1',
    'School Division Office': 'Q9D2-R4J6',
    'Division Engineer': 'E5T8-B2W3',
    'Non-DepEd Engineer': 'E5T8-B2W3',
    'Local Government Unit': 'L2G7-X4Z9',
    'Central Office Finance': '8XK2-M9P4', // Same as Central Office
    'Super User': 'SUP3R-US3R', // Added for testing
    // 'Admin' is usually hidden or database-only, but adding for completeness if enabled in dropdown
    'Admin': 'A3M6-Y1K8',
    'EFD Engineer': 'EFD8-C1D9',
    'Implementing Agency': 'AG5N-K9L2'
};

import locationData from './locations.json';

const getDashboardPath = (role, accountCategory) => {
    // Division/Non-DepEd Engineer redirect depends on their account category
    if (role === 'Division Engineer' || role === 'Non-DepEd Engineer' || role === 'Engineer') {
        return (accountCategory === 'Non-DepEd Engineer' || role === 'Non-DepEd Engineer')
            ? '/non-deped-dashboard'
            : '/engineer-dashboard';
    }
    const roleMap = {
        'EFD Engineer': '/efd-dashboard',
        'Local Government Unit': '/lgu-dashboard',
        'School Head': '/my-activity',
        'Human Resource': '/hr-dashboard',
        'Admin': '/super-user-selector',
        'Central Office': '/monitoring-dashboard',
        'Regional Office': '/monitoring-dashboard',
        'School Division Office': '/monitoring-dashboard',
        'Central Office Finance': '/finance-dashboard',
        'Super User': '/super-user-selector',
    };
    return roleMap[role] || '/';
};

const Register = () => {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [loading, setLoading] = useState(false);

    // --- BASIC FORM STATE ---
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '', // Generic roles auth email
        schoolEmail: '', // School Head: actual school email (used as Firebase auth email)
        contactNumber: '', // School Head: 11-digit contact number
        password: '',
        confirmPassword: '',
        role: 'School Head', // Default
        // Legacy/Other Role Fields
        bureau: '',
        office: '',
        position: '',
        region: '',
        division: '',
        province: '',
        city: '',
        barangay: '',
        authCode: '',
        altEmail: '',
        accountCategory: '', // Added this line
        agencyType: '',
        specificAgency: '',
        passcode: ''
    });

    // --- REGISTRATION STAGES ---
    const [registrationStage, setRegistrationStage] = useState('form'); // 'form' | 'passcode' | 'confirm'


    // --- OTP STATE --- (REMOVED)




    // --- LOCATION DROPDOWN STATE (Generic Roles) ---
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [barangayOptions, setBarangayOptions] = useState([]);

    // --- SCHOOL HEAD CASCADING OPTIONS STATE ---
    const [regions, setRegions] = useState([]);
    const [divisions, setDivisions] = useState([]);
    const [districts, setDistricts] = useState([]);
    const [municipalities, setMunicipalities] = useState([]);
    const [availableSchools, setAvailableSchools] = useState([]);

    // --- OFFICE DATA STATE ---
    const [officeData, setOfficeData] = useState([]);
    const [isOfficeCsvLoaded, setIsOfficeCsvLoaded] = useState(false);

    // Cascading Selections (5-Step Hierarchy)
    const [selectedRegion, setSelectedRegion] = useState('');
    const [selectedDivision, setSelectedDivision] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [selectedSchool, setSelectedSchool] = useState(null);

    // Map Marker Ref
    const markerRef = useRef(null);

    // --- REGISTRATION SUCCESS STATE ---
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [registeredIern, setRegisteredIern] = useState('');
    const [activeTab, setActiveTab] = useState('internal'); // 'internal' | 'external'


    // --- 1. LOAD INITIAL DATA (Regions + Office CSV) ---
    useEffect(() => {
        // Load Regions from API
        fetch('/api/locations/regions')
            .then(res => res.json())
            .then(data => setRegions(data || []))
            .catch(err => console.error("Failed to load regions:", err));

        // Load Offices CSV
        Papa.parse(OFFICES_CSV_PATH, {
            download: true,
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                if (results.data && results.data.length > 0) {
                    setOfficeData(results.data);
                    setIsOfficeCsvLoaded(true);
                }
            },
            error: (err) => {
                console.error("Office CSV Load Error:", err);
            }
        });
    }, []);

    // --- 2. CASCADING EFFECTS ---

    // Load Divisions when Region changes
    useEffect(() => {
        setDivisions([]);
        // Note: Downstream selections (division, district...) should be cleared by the change handler
        if (selectedRegion) {
            fetch(`/api/locations/divisions?region=${encodeURIComponent(selectedRegion)}`)
                .then(res => res.json())
                .then(data => setDivisions(data || []))
                .catch(console.error);
        }
    }, [selectedRegion]);

    // Load Districts when Division changes
    useEffect(() => {
        setDistricts([]);
        if (selectedRegion && selectedDivision) {
            fetch(`/api/locations/districts?region=${encodeURIComponent(selectedRegion)}&division=${encodeURIComponent(selectedDivision)}`)
                .then(res => res.json())
                .then(data => setDistricts(data || []))
                .catch(console.error);
        }
    }, [selectedRegion, selectedDivision]);

    // Load Municipalities when District changes
    useEffect(() => {
        setMunicipalities([]);
        if (selectedRegion && selectedDivision && selectedDistrict) {
            fetch(`/api/locations/municipalities?region=${encodeURIComponent(selectedRegion)}&division=${encodeURIComponent(selectedDivision)}&district=${encodeURIComponent(selectedDistrict)}`)
                .then(res => res.json())
                .then(data => setMunicipalities(data || []))
                .catch(console.error);
        }
    }, [selectedRegion, selectedDivision, selectedDistrict]);

    // Load Schools when Municipality changes
    useEffect(() => {
        setAvailableSchools([]);
        if (selectedRegion && selectedDivision && selectedDistrict && selectedMunicipality) {
            fetch(`/api/locations/schools?region=${encodeURIComponent(selectedRegion)}&division=${encodeURIComponent(selectedDivision)}&district=${encodeURIComponent(selectedDistrict)}&municipality=${encodeURIComponent(selectedMunicipality)}`)
                .then(res => res.json())
                .then(data => setAvailableSchools(data || []))
                .catch(console.error);
        }
    }, [selectedRegion, selectedDivision, selectedDistrict, selectedMunicipality]);



    // --- OFFICE DROPDOWN LOGIC ---
    const regionalOffices = useMemo(() => {
        if (!isOfficeCsvLoaded) return [];
        const divisionsMap = {};
        officeData
            .filter(row => row['Governance Level'] && row['Governance Level'].includes('Regional Office'))
            .forEach(row => {
                const val = row['Functional Division'];
                if (val) {
                    const u = val.toUpperCase().trim();
                    if (!divisionsMap[u]) divisionsMap[u] = val.trim();
                }
            });
        return Object.values(divisionsMap).sort();
    }, [officeData, isOfficeCsvLoaded]);

    const divisionOffices = useMemo(() => {
        if (!isOfficeCsvLoaded) return [];
        const divisionsMap = {};
        officeData
            .filter(row => row['Governance Level'] && row['Governance Level'].includes('Schools Division Office'))
            .forEach(row => {
                const val = row['Functional Division'];
                if (val) {
                    const u = val.toUpperCase().trim();
                    if (!divisionsMap[u]) divisionsMap[u] = val.trim();
                }
            });
        return Object.values(divisionsMap).sort();
    }, [officeData, isOfficeCsvLoaded]);

    const centralOfficeBureaus = useMemo(() => {
        if (!isOfficeCsvLoaded) return [];
        const divisionsMap = {};
        officeData
            .filter(row => row['Governance Level'] && row['Governance Level'].includes('Central Office'))
            .forEach(row => {
                const val = row['Functional Division'];
                if (val) {
                    const u = val.toUpperCase().trim();
                    if (!divisionsMap[u]) divisionsMap[u] = val.trim();
                }
            });
        return Object.values(divisionsMap).sort();
    }, [officeData, isOfficeCsvLoaded]);

    // --- HANDLERS ---
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRoleChange = (e) => {
        const newRole = e.target.value;
        setFormData(prev => ({
            ...prev,
            role: newRole,
            // Reset location fields on role change
            region: '', division: '', province: '', city: '', barangay: '', office: '', position: '',
            // Reset role-specific fields
            schoolEmail: '', contactNumber: '', altEmail: '', accountCategory: ''
        }));
        // Reset school selection if moving away
        setSelectedSchool(null);
    };

    const handleTabChange = (tab) => {
        setActiveTab(tab);
        setFormData(prev => ({
            ...prev,
            role: tab === 'external' ? 'Implementing Agency' : 'Regional Office',
            region: '', division: '', province: '', city: '', barangay: '', office: '', position: '',
            schoolEmail: '', contactNumber: '', altEmail: '', accountCategory: '', authCode: '',
            agencyType: '', specificAgency: ''
        }));
        setSelectedSchool(null);
    };

    const handleSchoolSelect = (e) => {
        const schoolId = e.target.value;
        if (!schoolId) {
            setSelectedSchool(null);
            return;
        }

        const school = availableSchools.find(s => s.school_id === schoolId);
        // Create a copy so we can modify latitude/longitude without affecting the source data
        setSelectedSchool({ ...school });
    };

    // --- OTP HANDLERS ---


    // --- LOCATION HANDLERS (Generic Roles) ---
    const handleRegionChange = (e) => {
        const region = e.target.value;
        setFormData({
            ...formData,
            region,
            province: '', city: '', barangay: '', division: ''
        });

        // Trigger Cascading Load (Database)
        setSelectedRegion(region);

        // Legacy Location Data (for LGU Province/City/Barangay)
        if (region && locationData[region]) {
            setProvinceOptions(Object.keys(locationData[region]).sort());
        } else {
            setProvinceOptions([]);
        }
        setCityOptions([]);
        setBarangayOptions([]);
    };

    const handleProvinceChange = (e) => {
        const province = e.target.value;
        setFormData({
            ...formData,
            province,
            city: '', barangay: ''
        });

        if (province && formData.region) {
            setCityOptions(Object.keys(locationData[formData.region][province]).sort());
        } else {
            setCityOptions([]);
        }
        setBarangayOptions([]);
    };

    const handleCityChange = (e) => {
        const city = e.target.value;
        setFormData({
            ...formData,
            city,
            barangay: ''
        });

        if (city && formData.province && formData.region) {
            const brgys = locationData[formData.region][formData.province][city];
            setBarangayOptions(brgys.sort());
        } else {
            setBarangayOptions([]);
        }
    };

    // --- 3. DRAGGABLE MARKER LOGIC ---
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    const { lat, lng } = marker.getLatLng();
                    setSelectedSchool(prev => ({
                        ...prev,
                        latitude: lat,
                        longitude: lng
                    }));
                }
            },
        }),
        [],
    );

    // --- 4. REGISTRATION SUBMISSION ---
    const handleRegister = async (e) => {
        e.preventDefault();

        // School Heads are identified by school_id only, others by email
        const identifier = (formData.role === 'School Head')
            ? selectedSchool.school_id
            : (formData.email || '').trim();

        const contactEmail = (formData.role === 'School Head')
            ? (formData.schoolEmail || '').trim()
            : identifier;

        const contactDigits = (formData.contactNumber || '').replace(/\D/g, '');

        // Basic Validations
        if (formData.password !== formData.confirmPassword) {
            alert("Passwords do not match!");
            return;
        }

        // --- AUTHORIZATION CODE CHECK (For Non-School Heads and Non-Super Users) ---
        if (formData.role !== 'School Head' && formData.role !== 'Super User') {
            const requiredCode = AUTHORIZATION_CODES[formData.role];
            if (requiredCode && formData.authCode !== requiredCode) {
                alert(`Invalid Authorization Code for ${formData.role}. Please send an email to support.stride@deped.gov.ph to obtain the secure code.`);
                return;
            }
        }

        if (formData.role === 'School Head') {
            if (!selectedSchool) {
                alert("Please select a school.");
                return;
            }

            // --- STRICT DEPED EMAIL VALIDATION ---
            const lowerEmail = contactEmail.toLowerCase();
            if (formData.role === 'School Head' && !lowerEmail.endsWith('@deped.gov.ph')) {
                alert("Restricted Access: Please use your official DepEd email address (@deped.gov.ph).");
                return;
            }

            // Basic email format check (redundant but safe)
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
                alert("Please enter a valid school email address.");
                return;
            }

            if (!contactDigits || contactDigits.length !== 11 || !contactDigits.startsWith('09')) {
                alert("Please enter a valid 11-digit mobile number starting with 09.");
                return;
            }
        }



        // STRICT EMAIL VALIDATION (Global Check)
        if (formData.role !== 'School Head' && formData.role !== 'Local Government Unit' && formData.role !== 'Implementing Agency' && !contactEmail.toLowerCase().endsWith('@deped.gov.ph')) {
            alert("Registration is restricted to official DepEd accounts (@deped.gov.ph).");
            return;
        }

        // Engineer (Division/EFD) Specific Validations
        if (formData.role === 'Division Engineer' || formData.role === 'Non-DepEd Engineer' || formData.role === 'EFD Engineer') {
            if (formData.contactNumber.length !== 11) {
                alert("Please enter a valid 11-digit mobile number.");
                return;
            }
        }

        // Local Government Unit & Implementing Agency Specific Validations
        if (formData.role === 'Local Government Unit' || formData.role === 'Implementing Agency') {
            if (formData.contactNumber.length !== 11) {
                alert("Please enter a valid 11-digit mobile number.");
                return;
            }
            if (!formData.region || !formData.province || !formData.city) {
                alert("Please complete the Assignment details (Region, Province, Municipality).");
                return;
            }
        }

        // if (!isOtpVerified) {
        //     alert("Please verify your email via OTP before registering.");
        //     return;
        // }

        // Bypass Passcode Stage and go straight to Final Submission
        handleSubmitFinal();
    };


    const handleSubmitFinal = async () => {
        const contactDigits = (formData.contactNumber || '').replace(/\D/g, '');
        const identifier = (formData.role === 'School Head')
            ? selectedSchool.school_id
            : (formData.email || '').trim();

        const contactEmail = (formData.role === 'School Head')
            ? (formData.schoolEmail || '').trim()
            : identifier;

        setLoading(true);
        try {
            let regData = null;

            // STEP A: Pre-Checks for School Head (Already logically passed form validation, but backend check is safe)
            if (formData.role === 'School Head') {
                if (!selectedSchool) throw new Error("Please select a school.");

                // Backend Check
                console.log("Step A: Checking existing school...");
                const checkRes = await fetch('/api/check-existing-school', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ schoolId: selectedSchool.school_id })
                });
                console.log("Step A: Check response received", checkRes.status);
                if (!checkRes.ok) {
                    const errorText = await checkRes.text();
                    throw new Error(`Check School Failed (${checkRes.status}): ${errorText || 'No detail'}`);
                }
                const checkText = await checkRes.text();
                console.log("Step A: Check response text:", checkText);
                if (!checkText) throw new Error("Empty response from /api/check-existing-school");
                const checkData = JSON.parse(checkText);
                if (checkData.exists) {
                    throw new Error(checkData.message || "School already registered.");
                }
            }

            // STEP B & C: Unified Native Registration and Persistence
            if (formData.role === 'School Head') {
                // CALL NEW ONE-SHOT ENDPOINT
                console.log("SENDING REGISTRATION DATA:", {
                    ...selectedSchool
                });

                // selectedSchool now contains the updated latitude/longitude from the map drag
                const finalSchoolData = {
                    ...selectedSchool,
                    curricularOffering: ""
                };

                console.log("SENDING FINAL REGISTRATION DATA:", finalSchoolData);

                const endpoint = '/api/register-beta'; // Use the iern-check endpoint for school heads now
                const regRes = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        password: formData.password,
                        contactNumber: contactDigits,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        schoolData: finalSchoolData
                    })
                });

                console.log("Step B: Registration response received", regRes.status);
                if (!regRes.ok) {
                    const errorText = await regRes.text();
                    throw new Error(`Registration Failed (${regRes.status}): ${errorText || 'No detail'}`);
                }
                const regText = await regRes.text();
                console.log("Step B: Registration response text:", regText);
                if (!regText) throw new Error("Empty response from " + endpoint);
                regData = JSON.parse(regText);
                if (!regData.success) {
                    throw new Error(regData.error || "Server Registration Failed.");
                }

                if (regData.success && regData.token) {
                    login(regData.user, regData.token);
                } else {
                    throw new Error(regData.error || "Registration succeeded but no session was established. Please log in.");
                }

            } else {
                // GENERIC REGISTRATION (Engineer, etc.)
                console.log("Syncing to Native Backend...");
                const regRes = await fetch('/api/register-user', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: identifier, // Fixed variable bug
                        password: formData.password,
                        role: formData.role === 'Implementing Agency' ? (formData.agencyType || formData.role) : formData.role,
                        firstName: formData.firstName,
                        lastName: formData.lastName,
                        region: formData.region,
                        division: formData.role === 'Implementing Agency' ? `${formData.agencyType} ${formData.specificAgency}`.trim() : formData.division,
                        province: formData.province,
                        city: formData.city,
                        barangay: formData.barangay,
                        office: formData.office,
                        position: formData.position,
                        contactNumber: formData.contactNumber,
                        altEmail: formData.altEmail,
                        accountCategory: formData.accountCategory
                    })
                });

                const regText = await regRes.text();
                console.log("Generic Registration response text:", regText);
                if (!regText) throw new Error("Empty response from /api/register-user");
                regData = JSON.parse(regText);
                if (!regData.success) {
                    throw new Error(regData.error || "Server Registration Failed.");
                }

                console.log("✅ Registration Successful! Setting session...");
                if (regData.token) {
                    login(regData.user, regData.token);
                } else {
                    throw new Error("No session token received.");
                }

                alert("✅ Account created successfully!");
                localStorage.setItem('needs_pin_setup', 'true');
                const destPath = getDashboardPath(formData.role, formData.accountCategory);
                navigate(destPath);
                return;
            }

            // STEP D: Success
            if ((formData.role === 'School Head') && regData?.iern) {
                setRegisteredIern(regData.iern);
                // Set role and schoolId in localStorage for immediate access by Dashboard/BottomNav/Modular Units
                localStorage.setItem('userRole', formData.role);
                if (selectedSchool?.school_id) {
                    localStorage.setItem('schoolId', selectedSchool.school_id);
                }
                
                // Set user email and uid for subsequent steps (like PinSetup)
                localStorage.setItem('userEmail', contactEmail);
                if (regData?.user?.uid) {
                    localStorage.setItem('uid', regData.user.uid);
                }

                // Mark for PIN setup as TRUE so the global modal triggers on dashboard
                localStorage.setItem('needs_pin_setup', 'true');

                setShowSuccessModal(true);
            } else {
                // Set role in localStorage for immediate access by Dashboard/BottomNav
                localStorage.setItem('userRole', formData.role);
                // Save accountCategory so other components can read it
                if (formData.accountCategory) {
                    localStorage.setItem('accountCategory', formData.accountCategory);
                } else if (formData.role === 'EFD Engineer') {
                    localStorage.setItem('accountCategory', 'EFD Engineer');
                }
                const destPath = getDashboardPath(formData.role, formData.accountCategory || ( (formData.role === 'EFD Engineer') ? 'EFD Engineer' : '' ));
                navigate(destPath);
            }

        } catch (error) {
            console.error("Registration Error:", error);
            alert(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-700 to-slate-200 animate-gradient-xy py-10">
                {/* Background Blobs */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-blue-100 animate-gradient-xy"></div>
                <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-purple-300/20 rounded-full blur-[100px] animate-blob"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-400/20 rounded-full blur-[100px] animate-blob animation-delay-2000"></div>

                <div className="relative z-10 w-[90%] max-w-xl">
                    <div className="bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-3xl p-6 md:p-8 transform transition-all duration-500 max-h-[85vh] overflow-y-auto custom-scrollbar">

                        {/* Header */}
                        {registrationStage === 'form' && (
                            <div className="text-center mb-8">
                                <img src={logo} alt="InsightEd Ratio" className="h-20 mx-auto mb-4 object-contain drop-shadow-sm" />
                                <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Create Account</h2>
                                <p className="text-slate-500 font-medium">Join the InsightEd network</p>
                            </div>
                        )}

                        <form onSubmit={handleRegister} className="space-y-6">

                            {registrationStage === 'form' && (
                                <>
                                    {/* REGISTRATION TABS */}
                            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6">
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('internal')}
                                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                                        activeTab === 'internal'
                                            ? 'bg-white text-blue-700 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    Internal Personnel
                                </button>
                                <button
                                    type="button"
                                    onClick={() => handleTabChange('external')}
                                    className={`flex-1 py-3 text-sm font-bold rounded-xl transition-all ${
                                        activeTab === 'external'
                                            ? 'bg-white text-purple-700 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700'
                                    }`}
                                >
                                    External Agency
                                </button>
                            </div>

                            {activeTab === 'internal' && (
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-in fade-in slide-in-from-top-2">
                                    <label className="block text-xs font-bold text-blue-800 uppercase tracking-wider mb-2">Registering As</label>
                                <div className="relative">
                                    <select
                                        name="role"
                                        value={formData.role}
                                        onChange={handleRoleChange}
                                        className="w-full bg-white border border-blue-200 rounded-xl px-4 py-3 text-blue-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                    >
                                        <option value="Central Office">CO Personnel</option>
                                        <option value="Regional Office">RO Personnel</option>
                                        <option value="School Division Office">SDO Personnel</option>
                                        <option value="School Head">School Head</option>
                                        <option value="Division Engineer">Division Engineer</option>
                                        {/*<option value="Non-DepEd Engineer">Non-DepEd Engineer</option>*/}
                                        <option value="EFD Engineer">EFD Engineer </option>
                                        <option value="Local Government Unit">Local Government Unit</option>
                                        <option value="Central Office Finance">Central Office Finance</option>
                                        {/* <option value="Super User" hidden>Super User</option> */}
                                        {/* Super User hidden from registration - managed internally */}
                                        {/* {<option value="Admin">Admin</option>} */}
                                    </select>
                                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-blue-500">
                                        <svg className="fill-current h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" /></svg>
                                    </div>
                                </div>
                                </div>
                            )}

                            {activeTab === 'external' && (
                                <div className="space-y-4 p-4 bg-purple-50 rounded-xl border border-purple-100 animate-in fade-in slide-in-from-top-2">
                                    <h3 className="text-sm font-bold text-purple-800 uppercase flex items-center gap-2">
                                        <span className="bg-purple-100 text-purple-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">1</span>
                                        Agency & Assignment
                                    </h3>
                                    {/* 1. AGENCY DETAILS (Moved to top) */}
                                    <div className="space-y-3">
                                        <label className="text-xs font-bold text-purple-700 uppercase">Agency Details</label>
                                        
                                        <select
                                            name="agencyType"
                                            value={formData.agencyType || ''}
                                            onChange={handleChange}
                                            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                                            required
                                        >
                                            <option value="">Select Agency Type</option>
                                            <option value="PGO">PGO (Provincial Government Office)</option>
                                            <option value="CGO">CGO (City Government Office)</option>
                                            <option value="MGO">MGO (Municipal Government Office)</option>
                                            <option value="DPWH">DPWH (Department of Public Works and Highways)</option>
                                            <option value="CSO">CSO (Civil Society Organization)</option>
                                        </select>

                                        {formData.agencyType && (
                                            <div className="animate-in fade-in slide-in-from-top-1">
                                                <input
                                                    name="specificAgency"
                                                    value={formData.specificAgency || ''}
                                                    placeholder={
                                                        formData.agencyType === 'DPWH' ? "Specify District (e.g., District 1)" :
                                                        `Specific ${formData.agencyType} Name (e.g., ${formData.province || 'Benguet'})`
                                                    }
                                                    onChange={handleChange}
                                                    className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                    required
                                                />
                                                <p className="text-[10px] text-purple-400 mt-1 ml-1">Provide the specific name or district of the agency.</p>
                                            </div>
                                        )}
                                        
                                        <input
                                            name="position"
                                            value={formData.position}
                                            placeholder="Position / Designation"
                                            onChange={handleChange}
                                            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                            required
                                        />
                                    </div>

                                    {/* 2. JURISDICTION (Moved down) */}
                                    <div className="space-y-3 pt-3 border-t border-purple-200/50">
                                        <label className="text-xs font-bold text-purple-700 uppercase">Jurisdiction</label>

                                        {/* REGION */}
                                        <select
                                            name="region"
                                            onChange={handleRegionChange}
                                            value={formData.region}
                                            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                                            required
                                        >
                                            <option value="">Select Region</option>
                                            {regions.map((reg) => (
                                                <option key={reg} value={reg}>{reg}</option>
                                            ))}
                                        </select>

                                        {/* PROVINCE */}
                                        <select
                                            name="province"
                                            onChange={handleProvinceChange}
                                            value={formData.province}
                                            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                            disabled={!formData.region}
                                            required
                                        >
                                            <option value="">Select Province</option>
                                            {provinceOptions.map((prov) => (
                                                <option key={prov} value={prov}>{prov}</option>
                                            ))}
                                        </select>

                                        {/* MUNICIPALITY */}
                                        <select
                                            name="city"
                                            onChange={handleCityChange}
                                            value={formData.city}
                                            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500 disabled:opacity-50"
                                            disabled={!formData.province}
                                            required
                                        >
                                            <option value="">Select Municipality/City</option>
                                            {cityOptions.map((city) => (
                                                <option key={city} value={city}>{city}</option>
                                            ))}
                                        </select>
                                    </div>

                                    {/* 3. CONTACT INFO (Added to fix mobile number validation) */}
                                    <div className="space-y-3 pt-3 border-t border-purple-200/50">
                                        <label className="text-xs font-bold text-purple-700 uppercase">Contact Information</label>

                                        {/* MOBILE */}
                                        <div>
                                            <input
                                                name="contactNumber"
                                                inputMode="numeric"
                                                value={formData.contactNumber}
                                                onFocus={() => {
                                                    if (!formData.contactNumber) setFormData(prev => ({ ...prev, contactNumber: '09' }));
                                                }}
                                                onChange={(e) => {
                                                    let val = e.target.value.replace(/\D/g, '');
                                                    if (!val.startsWith('09')) {
                                                        if (val.startsWith('9')) val = '0' + val;
                                                        else if (val.length < 2) val = '09';
                                                        else val = '09' + val.substring(2);
                                                    }
                                                    val = val.slice(0, 11);
                                                    setFormData(prev => ({ ...prev, contactNumber: val }));
                                                }}
                                                placeholder="Mobile No. (09xx xxx xxxx)"
                                                className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                maxLength={11}
                                                required
                                            />
                                            <p className="text-[10px] text-purple-600 mt-1 ml-1">Must be 11 digits.</p>
                                        </div>

                                        {/* ALT EMAIL */}
                                        <input
                                            name="altEmail"
                                            type="email"
                                            value={formData.altEmail}
                                            onChange={handleChange}
                                            placeholder="Alternative Email Address (Optional)"
                                            className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                        />
                                    </div>

                                </div>
                            )}

                            {/* AUTHORIZATION CODE INPUT (For Non-School Heads and Non-Super Users) */}
                            {formData.role !== 'School Head' && formData.role !== 'Super User' && (
                                <div className="bg-amber-50 p-4 rounded-2xl border border-amber-200 animate-fade-in">
                                    <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider mb-2 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                                        </svg>
                                        Authorization Code (Required)
                                    </label>
                                    <input
                                        type="text"
                                        name="authCode"
                                        value={formData.authCode}
                                        onChange={handleChange}
                                        placeholder="Enter Secure Code"
                                        className="w-full bg-white border border-amber-300 rounded-xl px-4 py-3 text-amber-900 font-mono tracking-widest focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all placeholder:text-amber-300 placeholder:font-sans placeholder:tracking-normal"
                                        required
                                    />
                                    <p className="text-[10px] text-amber-600 mt-2 ml-1">
                                        Please send an email to <span className="font-bold select-all">support.stride@deped.gov.ph</span> to obtain the secure code for <strong>{formData.role}</strong> registration.
                                    </p>
                                </div>
                            )}

                            {/* === SCHOOL HEAD SPECIFIC FLOW === */}
                            {formData.role === 'School Head' ? (
                                <div className="space-y-5 animate-in fade-in slide-in-from-bottom-4">
                                    <div className="bg-white p-5 rounded-2xl border-l-4 border-l-blue-500 shadow-sm border border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span>
                                            School Selection
                                        </h3>

                                        {regions.length === 0 ? (
                                            <div className="text-center py-4 text-slate-400 text-sm animate-pulse">Loading School Database...</div>
                                        ) : (
                                            <div className="grid grid-cols-1 gap-3">
                                                {/* 1. Region */}
                                                <select
                                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                                    value={selectedRegion}
                                                    onChange={(e) => {
                                                        setSelectedRegion(e.target.value);
                                                        setSelectedDivision('');
                                                        setSelectedDistrict('');
                                                        setSelectedMunicipality('');
                                                        setSelectedSchool(null);
                                                    }}
                                                >
                                                    <option value="">Select Region</option>
                                                    {regions.map(r => <option key={r} value={r}>{r}</option>)}
                                                </select>

                                                {/* 2. Division */}
                                                <select
                                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                    value={selectedDivision}
                                                    disabled={!selectedRegion}
                                                    onChange={(e) => {
                                                        setSelectedDivision(e.target.value);
                                                        setSelectedDistrict('');
                                                        setSelectedMunicipality('');
                                                        setSelectedSchool(null);
                                                    }}
                                                >
                                                    <option value="">Select Division</option>
                                                    {divisions.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>

                                                {/* 3. District */}
                                                <select
                                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                    value={selectedDistrict}
                                                    disabled={!selectedDivision}
                                                    onChange={(e) => {
                                                        setSelectedDistrict(e.target.value);
                                                        setSelectedMunicipality('');
                                                        setSelectedSchool(null);
                                                    }}
                                                >
                                                    <option value="">Select District</option>
                                                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                                                </select>

                                                {/* 4. Municipality */}
                                                <select
                                                    className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                    value={selectedMunicipality}
                                                    disabled={!selectedDistrict}
                                                    onChange={(e) => {
                                                        setSelectedMunicipality(e.target.value);
                                                        setSelectedSchool(null);
                                                    }}
                                                >
                                                    <option value="">Select Municipality</option>
                                                    {municipalities.map(m => <option key={m} value={m}>{m}</option>)}
                                                </select>

                                                {/* 5. School (Final Step) */}
                                                <select
                                                    className="w-full p-3 rounded-xl bg-blue-50 border border-blue-200 text-sm font-semibold text-blue-900 focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                                                    value={selectedSchool?.school_id || ''}
                                                    disabled={!selectedMunicipality}
                                                    onChange={handleSchoolSelect}
                                                >
                                                    <option value="">Select School</option>
                                                    {availableSchools.map(s => <option key={s.school_id} value={s.school_id}>{s.school_name} - {s.school_id}</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>





                                    {/* AUTO-GENERATED CREDENTIALS */}
                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Your Username (School ID)</label>
                                        <input
                                            type="text"
                                            value={selectedSchool?.school_id || ''}
                                            readOnly
                                            className="w-full bg-slate-200 border-none rounded-lg px-3 py-2 text-slate-800 text-lg font-mono font-bold mb-2 cursor-not-allowed text-center tracking-widest"
                                        />
                                        <p className="text-[10px] text-slate-500 text-center">You will use this ID to log in.</p>
                                    </div>

                                    {/* SCHOOL CONTACT DETAILS */}
                                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                                        <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                                            <span className="bg-blue-100 text-blue-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">2</span>
                                            Account Recovery & Contact Info
                                        </h3>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Official School Email</label>
                                                <div className="flex items-center w-full max-w-full">
                                                    <input
                                                        type="text"
                                                        value={formData.schoolEmail ? formData.schoolEmail.split('@')[0] : ''}
                                                        onChange={(e) => {
                                                            const username = e.target.value.replace(/[^a-zA-Z0-9._-]/g, '');
                                                            setFormData(prev => ({ ...prev, schoolEmail: username + '@deped.gov.ph' }));
                                                        }}
                                                        placeholder="username"
                                                        className="flex-1 min-w-0 bg-white border border-r-0 border-slate-200 text-sm rounded-l-xl px-3 py-3 outline-none focus:ring-2 focus:ring-blue-500 overflow-hidden text-ellipsis"
                                                        required
                                                    />
                                                    <span className="bg-slate-100 border border-l-0 border-slate-200 text-slate-500 text-xs sm:text-sm font-bold px-2 sm:px-3 py-3 rounded-r-xl select-none whitespace-nowrap">
                                                        @deped.gov.ph
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Used for password resets and notifications.</p>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold text-slate-500 mb-1 ml-1">Mobile Number</label>
                                                <input
                                                    name="contactNumber"
                                                    inputMode="numeric"
                                                    value={formData.contactNumber}
                                                    onFocus={() => {
                                                        if (!formData.contactNumber) setFormData(prev => ({ ...prev, contactNumber: '09' }));
                                                    }}
                                                    onChange={(e) => {
                                                        let val = e.target.value.replace(/\D/g, '');
                                                        // STRICT ENFORCEMENT: Must start with 09
                                                        if (!val.startsWith('09')) {
                                                            if (val.startsWith('9')) val = '0' + val; // Auto-fix 9...
                                                            else if (val.length < 2) val = '09'; // Prevent deleting 09
                                                            else val = '09' + val.substring(2); // Re-attach if messed up middle?? No, safe default. 
                                                        }
                                                        // Ensure length limit
                                                        val = val.slice(0, 11);
                                                        setFormData(prev => ({ ...prev, contactNumber: val }));
                                                    }}
                                                    placeholder="0912 345 6789"
                                                    className="w-full bg-white border border-slate-200 text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500"
                                                    maxLength={11}
                                                    required
                                                />
                                                <p className="text-[10px] text-slate-400 mt-1 ml-1">Must be exactly 11 digits.</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* MAP & LOCATION CONFIRMATION */}
                                    {selectedSchool && selectedSchool.latitude && selectedSchool.longitude && (
                                        <div className="animate-in fade-in slide-in-from-top-2 space-y-4">

                                            {/* MAP */}
                                            <div className="w-full h-[250px] rounded-xl overflow-hidden border border-slate-200 relative z-0 shadow-inner">
                                                <MapContainer
                                                    center={[parseFloat(selectedSchool.latitude), parseFloat(selectedSchool.longitude)]}
                                                    zoom={17}
                                                    style={{ height: '100%', width: '100%' }}
                                                    dragging={true}
                                                    scrollWheelZoom={true}
                                                >
                                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                                    <Marker
                                                        position={[parseFloat(selectedSchool.latitude), parseFloat(selectedSchool.longitude)]}
                                                        draggable={true}
                                                        eventHandlers={eventHandlers}
                                                        ref={markerRef}
                                                    >
                                                        <Popup>Target: {selectedSchool.school_name}<br />Drag to adjust.</Popup>
                                                    </Marker>
                                                </MapContainer>
                                            </div>

                                            {/* CONFIRMATION UI */}
                                            <div className="p-4 rounded-xl border-2 bg-blue-50 border-blue-200">
                                                <div className="flex justify-between items-center mb-2">
                                                    <h4 className="font-bold text-blue-900 text-sm uppercase">Confirm Location</h4>
                                                </div>

                                                <p className="text-xs text-blue-700 mb-2">
                                                    Drag the pin on the map to precise location of your school if needed.
                                                </p>

                                                <div className="grid grid-cols-2 gap-2">
                                                    <div className="bg-white p-2 rounded border border-blue-100">
                                                        <div className="text-[10px] uppercase text-slate-400 font-bold">Latitude</div>
                                                        <div className="text-xs font-mono font-bold text-slate-700">{parseFloat(selectedSchool.latitude).toFixed(6)}</div>
                                                    </div>
                                                    <div className="bg-white p-2 rounded border border-blue-100">
                                                        <div className="text-[10px] uppercase text-slate-400 font-bold">Longitude</div>
                                                        <div className="text-xs font-mono font-bold text-slate-700">{parseFloat(selectedSchool.longitude).toFixed(6)}</div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>

                            ) : (
                                /* === GENERIC / OTHER ROLE FLOW === */
                                <div className="space-y-4 animate-in fade-in">
                                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-blue-100 text-blue-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">1</span>
                                        Personal Information
                                    </h3>

                                    <div className="grid grid-cols-2 gap-3">
                                        <input name="firstName" value={formData.firstName} placeholder="First Name" onChange={handleChange} className="bg-white border text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" required />
                                        <input name="lastName" value={formData.lastName} placeholder="Last Name" onChange={handleChange} className="bg-white border text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" required />
                                    </div>


                                    <input name="email" type="email" placeholder={formData.role === 'Local Government Unit' ? "Email Address" : "DepEd Email Address"} onChange={handleChange} value={formData.email} className="w-full bg-white border text-sm rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500" required />

                                    {/* CENTRAL OFFICE FIELDS */}
                                    {formData.role === 'Central Office' && (
                                        <div className="space-y-3 p-4 bg-yellow-50 rounded-xl border border-yellow-100">
                                            <label className="text-xs font-bold text-yellow-700 uppercase">Bureau Assignment</label>
                                            <div className="space-y-3">
                                                <select
                                                    name="office"
                                                    value={formData.office} // Mapping Bureau to office
                                                    onChange={handleChange}
                                                    className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-yellow-500"
                                                    required
                                                >
                                                    <option value="">Select Bureau / Service</option>
                                                    {centralOfficeBureaus.map((bureau) => (
                                                        <option key={bureau} value={bureau}>{bureau}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    name="division"
                                                    value={formData.division} // Mapping Division to division
                                                    placeholder="Division"
                                                    onChange={handleChange}
                                                    className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
                                                    required
                                                />

                                                <input
                                                    name="position"
                                                    value={formData.position}
                                                    placeholder="Position"
                                                    onChange={handleChange}
                                                    className="w-full bg-white border border-yellow-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-yellow-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* REGIONAL OFFICE FIELDS */}
                                    {formData.role === 'Regional Office' && (
                                        <div className="space-y-3 p-4 bg-purple-50 rounded-xl border border-purple-100">
                                            <label className="text-xs font-bold text-purple-700 uppercase">Region Assignment</label>
                                            <select
                                                name="region"
                                                onChange={handleRegionChange}
                                                value={formData.region}
                                                className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                                                required
                                            >
                                                <option value="">Select Region</option>
                                                {regions.map((reg) => (
                                                    <option key={reg} value={reg}>{reg}</option>
                                                ))}
                                            </select>
                                            <select
                                                name="office"
                                                value={formData.office}
                                                onChange={handleChange}
                                                className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-purple-500"
                                                required
                                            >
                                                <option value="">Select Office</option>
                                                {regionalOffices.map((office) => (
                                                    <option key={office} value={office}>{office}</option>
                                                ))}
                                            </select>


                                            <input
                                                name="position"
                                                value={formData.position}
                                                placeholder="Position"
                                                onChange={handleChange}
                                                className="w-full bg-white border border-purple-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-purple-500"
                                                required
                                            />
                                        </div>
                                    )}

                                    {/* SCHOOL DIVISION OFFICE FIELDS */}
                                    {formData.role === 'School Division Office' && (
                                        <div className="space-y-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                            <label className="text-xs font-bold text-orange-700 uppercase">Division Assignment</label>
                                            <select
                                                name="region"
                                                onChange={handleRegionChange}
                                                value={formData.region}
                                                className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            >
                                                <option value="">Select Region</option>
                                                {regions.map((reg) => (
                                                    <option key={reg} value={reg}>{reg}</option>
                                                ))}
                                            </select>

                                            <select
                                                name="division"
                                                onChange={handleChange}
                                                value={formData.division}
                                                className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                                disabled={!formData.region}
                                                required
                                            >
                                                <option value="">Select Division</option>
                                                {divisions.map(div => (
                                                    <option key={div} value={div}>{div}</option>
                                                ))}
                                            </select>

                                            <select
                                                name="office"
                                                value={formData.office}
                                                onChange={handleChange}
                                                className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            >
                                                <option value="">Select Office</option>
                                                {divisionOffices.map((office) => (
                                                    <option key={office} value={office}>{office}</option>
                                                ))}
                                            </select>

                                            <input
                                                name="position"
                                                value={formData.position}
                                                placeholder="Position"
                                                onChange={handleChange}
                                                className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                required
                                            />
                                        </div>
                                    )}


                                    {/* ENGINEER & EFD FIELDS */}
                                    {(formData.role === 'Division Engineer' || formData.role === 'Non-DepEd Engineer' || formData.role === 'EFD Engineer') && (
                                        <div className="space-y-4 p-4 bg-teal-50 rounded-xl border border-teal-100">
                                            <h3 className="text-sm font-bold text-teal-800 uppercase flex items-center gap-2">
                                                <span className="bg-teal-100 text-teal-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">2</span>
                                                {formData.role === 'EFD Engineer' ? 'Position & Contact' : 'Assignment & Contact'}
                                            </h3>

                                            {/* ASSIGNMENT / POSITION */}
                                            <div className="space-y-3">
                                                {formData.role !== 'EFD Engineer' ? (
                                                    <label className="text-xs font-bold text-teal-700 uppercase">Assignment</label>
                                                ) : (
                                                    <label className="text-xs font-bold text-teal-700 uppercase">Position</label>
                                                )}

                                                {formData.role !== 'EFD Engineer' && (
                                                    <>
                                                        <select
                                                            name="region"
                                                            onChange={handleRegionChange}
                                                            value={formData.region}
                                                            className="w-full bg-white border border-teal-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                                                            required
                                                        >
                                                            <option value="">Select Region</option>
                                                            {regions.map((reg) => (
                                                                <option key={reg} value={reg}>{reg}</option>
                                                            ))}
                                                        </select>

                                                        <select
                                                            name="division"
                                                            onChange={handleChange}
                                                            value={formData.division}
                                                            className="w-full bg-white border border-teal-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                                                            disabled={!formData.region}
                                                            required
                                                        >
                                                            <option value="">Select Division</option>
                                                            {divisions.map(div => (
                                                                <option key={div} value={div}>{div}</option>
                                                            ))}
                                                        </select>
                                                    </>
                                                )}

                                                <select
                                                    name="position"
                                                    value={formData.position}
                                                    onChange={handleChange}
                                                    className="w-full bg-white border border-teal-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-teal-500"
                                                    required
                                                >
                                                    <option value="">Select Position</option>
                                                    <option value="Engineer II">Engineer II</option>
                                                    <option value="Engineer III">Engineer III</option>
                                                    <option value="Engineer IV">Engineer IV</option>
                                                    <option value="Engineer V">Engineer V</option>
                                                    <option value="Technical Assistant I (COS)">Technical Assistant I (COS)</option>
                                                    <option value="Technical Assistant II (COS)">Technical Assistant II (COS)</option>
                                                    <option value="Technical Assistant III (COS)">Technical Assistant III (COS)</option>
                                                    <option value="Technical Assistant IV (COS)">Technical Assistant IV (COS)</option>
                                                    <option value="Technical Assistant V (COS)">Technical Assistant V (COS)</option>
                                                </select>


                                            </div>

                                            {/* CONTACT INFO */}
                                            <div className="space-y-3 pt-3 border-t border-teal-200/50">
                                                <label className="text-xs font-bold text-teal-700 uppercase">Contact Information</label>

                                                {/* MOBILE */}
                                                <div>
                                                    <input
                                                        name="contactNumber"
                                                        inputMode="numeric"
                                                        value={formData.contactNumber}
                                                        onFocus={() => {
                                                            if (!formData.contactNumber) setFormData(prev => ({ ...prev, contactNumber: '09' }));
                                                        }}
                                                        onChange={(e) => {
                                                            let val = e.target.value.replace(/\D/g, '');
                                                            if (!val.startsWith('09')) {
                                                                if (val.startsWith('9')) val = '0' + val;
                                                                else if (val.length < 2) val = '09';
                                                                else val = '09' + val.substring(2);
                                                            }
                                                            val = val.slice(0, 11);
                                                            setFormData(prev => ({ ...prev, contactNumber: val }));
                                                        }}
                                                        placeholder="Mobile No. (09xx xxx xxxx)"
                                                        className="w-full bg-white border border-teal-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                        maxLength={11}
                                                        required
                                                    />
                                                    <p className="text-[10px] text-teal-600 mt-1 ml-1">Must be 11 digits.</p>
                                                </div>

                                                {/* ALT EMAIL */}
                                                <input
                                                    name="altEmail"
                                                    type="email"
                                                    value={formData.altEmail}
                                                    onChange={handleChange}
                                                    placeholder="Alternative Email Address (Optional)"
                                                    className="w-full bg-white border border-teal-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-teal-500"
                                                />
                                                <p className="text-[10px] text-teal-600 ml-1">Backup email for account recovery.</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* LOCAL GOVERNMENT UNIT FIELDS */}
                                    {formData.role === 'Local Government Unit' && (
                                        <div className="space-y-4 p-4 bg-orange-50 rounded-xl border border-orange-100">
                                            <h3 className="text-sm font-bold text-orange-800 uppercase flex items-center gap-2">
                                                <span className="bg-orange-100 text-orange-600 w-5 h-5 flex items-center justify-center rounded-full text-[10px]">2</span>
                                                LGU Assignment & Contact
                                            </h3>

                                            {/* ASSIGNMENT */}
                                            <div className="space-y-3">
                                                <label className="text-xs font-bold text-orange-700 uppercase">Jurisdiction</label>

                                                {/* REGION */}
                                                <select
                                                    name="region"
                                                    onChange={handleRegionChange}
                                                    value={formData.region}
                                                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500"
                                                    required
                                                >
                                                    <option value="">Select Region</option>
                                                    {regions.map((reg) => (
                                                        <option key={reg} value={reg}>{reg}</option>
                                                    ))}
                                                </select>

                                                {/* PROVINCE */}
                                                <select
                                                    name="province"
                                                    onChange={handleProvinceChange}
                                                    value={formData.province}
                                                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                                    disabled={!formData.region}
                                                    required
                                                >
                                                    <option value="">Select Province</option>
                                                    {provinceOptions.map((prov) => (
                                                        <option key={prov} value={prov}>{prov}</option>
                                                    ))}
                                                </select>

                                                {/* MUNICIPALITY */}
                                                <select
                                                    name="city"
                                                    onChange={handleCityChange}
                                                    value={formData.city}
                                                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm text-slate-700 outline-none focus:ring-2 focus:ring-orange-500 disabled:opacity-50"
                                                    disabled={!formData.province}
                                                    required
                                                >
                                                    <option value="">Select Municipality/City</option>
                                                    {cityOptions.map((city) => (
                                                        <option key={city} value={city}>{city}</option>
                                                    ))}
                                                </select>

                                                <input
                                                    name="position"
                                                    value={formData.position}
                                                    placeholder="Position / Designation"
                                                    onChange={handleChange}
                                                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                    required
                                                />
                                            </div>

                                            {/* CONTACT INFO */}
                                            <div className="space-y-3 pt-3 border-t border-orange-200/50">
                                                <label className="text-xs font-bold text-orange-700 uppercase">Contact Information</label>

                                                {/* MOBILE */}
                                                <div>
                                                    <input
                                                        name="contactNumber"
                                                        inputMode="numeric"
                                                        value={formData.contactNumber}
                                                        onFocus={() => {
                                                            if (!formData.contactNumber) setFormData(prev => ({ ...prev, contactNumber: '09' }));
                                                        }}
                                                        onChange={(e) => {
                                                            let val = e.target.value.replace(/\D/g, '');
                                                            if (!val.startsWith('09')) {
                                                                if (val.startsWith('9')) val = '0' + val;
                                                                else if (val.length < 2) val = '09';
                                                                else val = '09' + val.substring(2);
                                                            }
                                                            val = val.slice(0, 11);
                                                            setFormData(prev => ({ ...prev, contactNumber: val }));
                                                        }}
                                                        placeholder="Mobile No. (09xx xxx xxxx)"
                                                        className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                        maxLength={11}
                                                        required
                                                    />
                                                    <p className="text-[10px] text-orange-600 mt-1 ml-1">Must be 11 digits.</p>
                                                </div>

                                                {/* ALT EMAIL */}
                                                <input
                                                    name="altEmail"
                                                    type="email"
                                                    value={formData.altEmail}
                                                    onChange={handleChange}
                                                    placeholder="Alternative Email Address (Optional)"
                                                    className="w-full bg-white border border-orange-200 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-orange-500"
                                                />
                                            </div>
                                        </div>
                                    )}



                                </div>
                            )}

                            {/* === 3. EMAIL VERIFICATION & SECURITY (COMMENTED OUT FOR TESTING) === */}
                            {/* <div className="pt-2 border-t border-slate-100 animate-in fade-in">
                                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2 mb-3">
                                    <span className="bg-blue-100 text-blue-600 w-6 h-6 flex items-center justify-center rounded-full text-xs">
                                        {(formData.role === 'School Head') ? 2 : (['Engineer'].includes(formData.role) ? 3 : 2)}
                                    </span>
                                    Account Security
                                </h3>

                                <div className="mb-6 space-y-3">

                                    
                                    
                                    <div className="flex flex-col gap-3">
                                        <p className="text-xs text-slate-500">
                                            Verifying: <span className="font-bold text-slate-700">{formData.email || "No email entered"}</span>
                                        </p>

                                        {!isOtpVerified && (
                                            <button
                                                type="button"
                                                onClick={handleSendOtp}
                                                disabled={otpLoading || !canResend || !formData.email}
                                                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 py-3 rounded-xl text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                            >
                                                {otpLoading ? 'Sending Code...' : !canResend ? `Resend in ${timer}s` : isOtpSent ? 'Resend Verification Code' : 'Send Verification Code'}
                                            </button>
                                        )}

                                        {isOtpSent && !isOtpVerified && (
                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                <label className="block text-xs font-bold text-slate-500 uppercase mb-2">Enter Code</label>
                                                <div className="flex justify-between gap-2 mb-3">
                                                    {otp.map((digit, index) => (
                                                        <input
                                                            key={index}
                                                            type="text"
                                                            maxLength="1"
                                                            value={digit}
                                                            onChange={e => handleOtpChange(e.target, index)}
                                                            className="w-10 h-12 text-center border-2 border-slate-200 rounded-lg focus:border-blue-500 outline-none text-lg font-bold bg-white"
                                                        />
                                                    ))}
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleVerifyOtp}
                                                    className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold shadow-sm hover:bg-blue-700"
                                                >
                                                    Verify Code
                                                </button>
                                            </div>
                                        )}

                                        {isOtpVerified && (
                                            <div className="bg-green-50 text-green-700 px-4 py-3 rounded-xl text-sm font-bold flex items-center gap-2 border border-green-200">
                                                <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                                                Email Verified Successfully
                                            </div>
                                        )}
                                    </div> 
                                    
                                </div>
                            </div> */}

                                    {/* PASSWORD FIELDS */}
                                    <div className="space-y-3 pt-4 border-t border-slate-100">
                                        <h3 className="text-sm font-bold text-slate-800 mb-2">Security Credentials</h3>
                                        <input name="password" type="password" placeholder="Password" onChange={handleChange} className="w-full bg-white border text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" required />
                                        <input name="confirmPassword" type="password" placeholder="Confirm Password" onChange={handleChange} className="w-full bg-white border text-sm rounded-xl px-4 py-3 outline-none focus:border-blue-500" required />
                                    </div>
                                </>
                            )}

                            {/* SUBMIT BUTTON */}
                            {registrationStage === 'form' && (
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-4 rounded-xl shadow-xl shadow-blue-500/30 transform transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
                                >
                                    {loading ? 'Processing...' : 'Complete Registration'}
                                    {!loading && <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6"></path></svg>}
                                </button>
                            )}


                        </form>

                        <div className="mt-8 text-center pt-6 border-t border-slate-100">
                            <Link to="/" className="text-sm font-semibold text-blue-600 hover:text-blue-800">Back to Login</Link>
                        </div>
                    </div>
                </div>

                {/* SUCCESS MODAL */}
                {showSuccessModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
                        <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl text-center relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-green-400 to-blue-500"></div>

                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-green-600 text-3xl">
                                ✅
                            </div>

                            <h2 className="text-2xl font-bold text-slate-800 mb-2">Registration Successful!</h2>
                            <p className="text-slate-500 mb-6">Welcome to InsightEd. Your account has been created.</p>

                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl mb-6">
                                <p className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-1">Your School IERN</p>
                                <h3 className="text-3xl font-black text-blue-900 tracking-tight font-mono">{registeredIern}</h3>
                                <p className="text-[10px] text-blue-400 mt-2">Please save this reference number.</p>
                            </div>

                            <button
                                onClick={() => {
                                    if (localStorage.getItem('needs_pin_setup') === 'true') {
                                        navigate('/setup-pin');
                                    } else {
                                        navigate(getDashboardPath(formData.role));
                                    }
                                }}
                                className="w-full py-4 rounded-xl bg-[#004A99] text-white font-bold text-lg shadow-xl shadow-blue-900/20 hover:bg-blue-800 transition transform active:scale-[0.98]"
                            >
                                Continue
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </PageTransition>
    );
};

export default Register;
