// src/forms/SchoolProfile.jsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse'; 
import { auth } from '../firebase'; 
import { onAuthStateChanged } from "firebase/auth";
import locationData from '../locations.json'; 
import LoadingScreen from '../components/LoadingScreen'; 
// 👇 IMPORT THE OUTBOX HELPER
import { addToOutbox } from '../db';

const SchoolProfile = () => {
    const navigate = useNavigate();
    
    // --- STATE ---
    const [loading, setLoading] = useState(true); 
    const [isSaving, setIsSaving] = useState(false);
    
    // Mode States
    // Removed "isLocked". Form is always open.
    const [hasSavedData, setHasSavedData] = useState(false); 
    const [lastUpdated, setLastUpdated] = useState(null);

    // Modals
    const [showSaveModal, setShowSaveModal] = useState(false); 
    
    // Confirmation Checkboxes
    const [ack1, setAck1] = useState(false);
    const [ack2, setAck2] = useState(false);

    // Dropdown Data
    const [provinceOptions, setProvinceOptions] = useState([]);
    const [cityOptions, setCityOptions] = useState([]);
    const [barangayOptions, setBarangayOptions] = useState([]);
    const [divisionOptions, setDivisionOptions] = useState([]); 
    const [districtOptions, setDistrictOptions] = useState([]); 
    const [legDistrictOptions, setLegDistrictOptions] = useState([]);
    
    // Data Caches
    const [schoolDirectory, setSchoolDirectory] = useState([]); 
    const [regionDivMap, setRegionDivMap] = useState({}); 
    const [divDistMap, setDivDistMap] = useState({}); 

    // Form Data
    const [formData, setFormData] = useState({
        schoolId: '', schoolName: '', 
        region: '', province: '', municipality: '', barangay: '', 
        division: '', district: '', legDistrict: '', 
        motherSchoolId: '', latitude: '', longitude: '',
        curricularOffering: '' // 👈 RE-ADDED THIS FIELD
    });

    const [originalData, setOriginalData] = useState(null);
    const goBack = () => navigate('/school-forms');

    // --- HELPER: FORMAT TIMESTAMP ---
    const formatTimestamp = (isoString) => {
        if (!isoString) return '';
        return new Date(isoString).toLocaleString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric', 
            hour: 'numeric', minute: '2-digit', hour12: true
        });
    };

    // --- HELPER: DETECT CHANGES ---
    const getChanges = () => {
        if (!originalData) return [];
        const changes = [];
        Object.keys(formData).forEach(key => {
            if (formData[key] !== originalData[key]) {
                changes.push({
                    field: key,
                    oldVal: originalData[key],
                    newVal: formData[key]
                });
            }
        });
        return changes;
    };

    const getNameSuggestion = (name) => {
        if (!name) return null;
        const n = name.trim();
        if (/\bES$/.test(n)) return "Suggestion: Please spell out 'ES' to 'Elementary School'";
        if (/\bNHS$/.test(n)) return "Suggestion: Please spell out 'NHS' to 'National High School'";
        return null; 
    };

    const nameWarning = getNameSuggestion(formData.schoolName);

    // --- GPS HANDLER ---
    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            alert("Geolocation is not supported by your browser.");
            return;
        }
        const confirmGPS = confirm("This will use your device's GPS to get your current location.");
        if (!confirmGPS) return;

        navigator.geolocation.getCurrentPosition(
            (position) => {
                setFormData(prev => ({
                    ...prev,
                    latitude: position.coords.latitude.toFixed(6),
                    longitude: position.coords.longitude.toFixed(6)
                }));
                alert("Location updated from Device GPS!");
            },
            (error) => {
                console.error("GPS Error:", error);
                alert("Unable to retrieve location.");
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    // --- 1. INITIAL LOAD LOGIC ---
    useEffect(() => {
        let isMounted = true;

        const initialize = async () => {
            try {
                // Load CSV
                const csvResponse = await fetch('/schools.csv');
                const csvText = await csvResponse.text();

                const parsedData = await new Promise((resolve) => {
                    Papa.parse(csvText, {
                        header: true, skipEmptyLines: true,
                        complete: (results) => resolve(results.data),
                        error: () => resolve([])
                    });
                });

                if (isMounted) {
                    setSchoolDirectory(parsedData); 
                    
                    const tempRegDiv = {}; const tempDivDist = {}; const tempLegs = new Set();
                    const clean = (str) => str ? String(str).toLowerCase().replace(/[^a-z0-9]/g, '') : '';
                    const headers = parsedData.length > 0 ? Object.keys(parsedData[0]) : [];
                    const regKey = headers.find(h => clean(h) === 'region');
                    const divKey = headers.find(h => clean(h) === 'division');
                    const distKey = headers.find(h => clean(h) === 'district'); 
                    const legKey = headers.find(h => clean(h).includes('legislative') || clean(h) === 'legdistrict');

                    parsedData.forEach(row => {
                        const reg = regKey ? row[regKey]?.trim() : null;
                        const div = divKey ? row[divKey]?.trim() : null;
                        const dist = distKey ? row[distKey]?.trim() : null;
                        const leg = legKey ? row[legKey]?.trim() : null;

                        if (reg && div) { if (!tempRegDiv[reg]) tempRegDiv[reg] = new Set(); tempRegDiv[reg].add(div); }
                        if (div && dist) { if (!tempDivDist[div]) tempDivDist[div] = new Set(); tempDivDist[div].add(dist); }
                        if (leg) tempLegs.add(leg);
                    });

                    const processedRegDiv = {}; Object.keys(tempRegDiv).forEach(k => processedRegDiv[k] = Array.from(tempRegDiv[k]).sort());
                    const processedDivDist = {}; Object.keys(tempDivDist).forEach(k => processedDivDist[k] = Array.from(tempDivDist[k]).sort());

                    setRegionDivMap(processedRegDiv);
                    setDivDistMap(processedDivDist);
                    setLegDistrictOptions(Array.from(tempLegs).sort());
                
                    // Load User Data
                    onAuthStateChanged(auth, async (user) => {
                        if (!user || !isMounted) return;

                        try {
                            const response = await fetch(`/api/school-by-user/${user.uid}`);
                            const result = await response.json();
                            
                            if (result.exists) {
                                const dbData = result.data;
                                
                                if (locationData[dbData.region]) {
                                    setProvinceOptions(Object.keys(locationData[dbData.region]).sort());
                                    if (locationData[dbData.region][dbData.province]) {
                                        setCityOptions(Object.keys(locationData[dbData.region][dbData.province]).sort());
                                        if (locationData[dbData.region][dbData.province][dbData.municipality]) {
                                            setBarangayOptions(locationData[dbData.region][dbData.province][dbData.municipality].sort());
                                        }
                                    }
                                }
                                if (dbData.region && processedRegDiv[dbData.region]) setDivisionOptions(processedRegDiv[dbData.region]);
                                if (dbData.division && processedDivDist[dbData.division]) setDistrictOptions(processedDivDist[dbData.division]);

                                const loadedData = {
                                    schoolId: dbData.school_id, 
                                    schoolName: dbData.school_name,
                                    region: dbData.region, 
                                    province: dbData.province, 
                                    municipality: dbData.municipality, 
                                    barangay: dbData.barangay,
                                    division: dbData.division, 
                                    district: dbData.district, 
                                    legDistrict: dbData.leg_district,
                                    motherSchoolId: dbData.mother_school_id, 
                                    latitude: dbData.latitude, 
                                    longitude: dbData.longitude,
                                    curricularOffering: dbData.curricular_offering || '' // Load from DB
                                };

                                setFormData(loadedData);
                                setOriginalData(loadedData); 
                                setLastUpdated(dbData.submitted_at); 
                                setHasSavedData(true);
                            }
                        } catch (error) { 
                            console.error("DB Check failed or Offline:", error); 
                        } finally {
                            if (isMounted) setLoading(false);
                        }
                    });
                }
            } catch (err) {
                console.error("Initialization Error:", err);
                if (isMounted) setLoading(false);
            }
        };

        initialize();
        return () => { isMounted = false; };
    }, []);

    // --- HANDLERS ---
    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    
    const handleRegionChange = (e) => {
        const selectedRegion = e.target.value;
        setDivisionOptions(regionDivMap[selectedRegion] || []);
        setFormData(prev => ({ ...prev, region: selectedRegion, province: '', municipality: '', barangay: '', division: '', district: '' }));
        setProvinceOptions(selectedRegion && locationData[selectedRegion] ? Object.keys(locationData[selectedRegion]).sort() : []);
        setCityOptions([]); setBarangayOptions([]); setDistrictOptions([]); 
    };

    const handleDivisionChange = (e) => {
        const selectedDivision = e.target.value;
        setFormData(prev => ({ ...prev, division: selectedDivision, district: '' }));
        setDistrictOptions(divDistMap[selectedDivision] || []);
    };

    const handleProvinceChange = (e) => {
        const province = e.target.value;
        setFormData(prev => ({ ...prev, province, municipality: '', barangay: '' }));
        setCityOptions(province && formData.region ? Object.keys(locationData[formData.region][province]).sort() : []);
        setBarangayOptions([]);
    };

    const handleCityChange = (e) => {
        const municipality = e.target.value;
        setFormData(prev => ({ ...prev, municipality, barangay: '' }));
        setBarangayOptions(municipality && formData.province ? locationData[formData.region][formData.province][municipality].sort() : []);
    };

    // --- AUTOFILL LOGIC ---
    const handleIdBlur = async () => {
        const targetId = String(formData.schoolId).trim();
        if (targetId.length < 6) return; 
        setLoading(true);

        if (navigator.onLine) {
            try {
                const response = await fetch(`/api/check-school/${targetId}`);
                if (response.ok) {
                    const result = await response.json();
                    if (result.exists) {
                        alert("This School ID is already registered.");
                        setFormData(prev => ({...prev, schoolId: ''})); 
                        setLoading(false);
                        return;
                    }
                }
            } catch (error) { console.warn("DB Check skipped."); }
        }

        const clean = (str) => str?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';
        const headers = schoolDirectory.length > 0 ? Object.keys(schoolDirectory[0]) : [];
        const idKey = headers.find(h => clean(h) === 'schoolid');

        if (idKey) {
            const school = schoolDirectory.find(s => String(s[idKey]).trim().split('.')[0] === targetId);
            if (school) {
                const getVal = (target) => { const k = headers.find(h => clean(h).includes(clean(target))); return k ? String(school[k]).trim() : ''; };
                const findMatch = (options, value) => options.find(opt => clean(opt) === clean(value)) || value;

                const rawRegion = getVal('region'); const matchedRegion = findMatch(Object.keys(locationData), rawRegion);
                setDivisionOptions(regionDivMap[matchedRegion] || []);
                const matchedDiv = findMatch(regionDivMap[matchedRegion] || [], getVal('division'));
                setDistrictOptions(divDistMap[matchedDiv] || []);
                
                let provOpts = [], matchedProv = getVal('province');
                if (locationData[matchedRegion]) { provOpts = Object.keys(locationData[matchedRegion]).sort(); matchedProv = findMatch(provOpts, matchedProv); }
                setProvinceOptions(provOpts);

                let cityOpts = [], matchedMun = getVal('municipality');
                if (locationData[matchedRegion]?.[matchedProv]) { cityOpts = Object.keys(locationData[matchedRegion][matchedProv]).sort(); matchedMun = findMatch(cityOpts, matchedMun); }
                setCityOptions(cityOpts);

                let brgyOpts = [], matchedBrgy = getVal('barangay');
                if (locationData[matchedRegion]?.[matchedProv]?.[matchedMun]) { brgyOpts = locationData[matchedRegion][matchedProv][matchedMun].sort(); matchedBrgy = findMatch(brgyOpts, matchedBrgy); }
                setBarangayOptions(brgyOpts);

                setFormData(prev => ({
                    ...prev,
                    schoolName: getVal('schoolname'),
                    region: matchedRegion, province: matchedProv, municipality: matchedMun, barangay: matchedBrgy,
                    division: matchedDiv, district: getVal('district'), legDistrict: getVal('legdistrict') || getVal('legislative'),
                    motherSchoolId: getVal('motherschool') || '', latitude: getVal('latitude'), longitude: getVal('longitude'),
                    curricularOffering: getVal('offering') || ''
                }));
            } else { alert("School ID not found in CSV directory."); }
        }
        setLoading(false);
    };

    // --- BUTTON ACTIONS ---
    const handleSaveClick = (e) => { 
        e.preventDefault(); 
        if (!auth.currentUser) return; 
        setAck1(false);
        setAck2(false);
        setShowSaveModal(true); 
    };
    
    // --- SAVE LOGIC (OUTBOX + ONLINE) ---
    const confirmSave = async () => {
        setShowSaveModal(false); 
        setIsSaving(true);
        const payload = { ...formData, submittedBy: auth.currentUser.uid };
        
        // 📴 OFFLINE CHECK
        if (!navigator.onLine) {
            try {
                await addToOutbox({
                    type: 'SCHOOL_PROFILE',
                    label: 'School Profile', 
                    url: '/api/save-school',
                    payload: payload
                });
                alert("📴 You are offline. \n\nData saved to Outbox! Sync when you have internet.");
                setLastUpdated(new Date().toISOString());
                setOriginalData({...formData});
                setHasSavedData(true);
            } catch (error) {
                console.error("Offline Save Failed:", error);
                alert("Failed to save offline.");
            } finally {
                setIsSaving(false);
            }
            return;
        }

        // 🌐 ONLINE SAVE
        try {
            const response = await fetch('/api/save-school', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
            });
            if (response.ok) {
                alert('Success: Profile updated successfully.'); 
                setLastUpdated(new Date().toISOString()); 
                setOriginalData({...formData}); 
                setHasSavedData(true);
            } else { 
                const err = await response.json(); 
                alert('Failed: ' + err.message); 
            }
        } catch (error) { alert("Error saving data."); } finally { setIsSaving(false); }
    };

    const inputClass = `w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#004A99] bg-white text-gray-800 font-semibold text-[14px] shadow-sm disabled:bg-gray-100 disabled:text-gray-500 transition-all`;
    const labelClass = "block text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 ml-1";
    const sectionClass = "bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-6";

    if (loading) return <LoadingScreen message="Loading School Profile..." />;

    return (
        <div className="min-h-screen bg-slate-50 font-sans pb-32 relative"> 
            
            {/* HEADER */}
            <div className="bg-[#004A99] px-6 pt-12 pb-24 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="relative z-10 flex items-center gap-4">
                    <button onClick={goBack} className="text-white/80 hover:text-white text-2xl transition">&larr;</button>
                    <div>
                        <h1 className="text-2xl font-bold text-white">School Profile</h1>
                        <p className="text-blue-200 text-xs mt-1">
                            {lastUpdated ? `Last Updated: ${formatTimestamp(lastUpdated)}` : 'Create your school profile'}
                        </p>
                    </div>
                </div>
            </div>

            {/* FORM */}
            <div className="px-5 -mt-12 relative z-20">
                <form onSubmit={handleSaveClick}>
                    
                    {/* 1. IDENTITY */}
                    <div className={sectionClass}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2"><span className="text-xl">🏫</span> Identity</h2>
                        </div>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className={labelClass}>School ID (6-Digit)</label>
                                <input type="text" name="schoolId" value={formData.schoolId} onChange={handleChange} onBlur={handleIdBlur} placeholder="100001" maxLength="6" className={`${inputClass} text-center text-xl tracking-widest font-bold ${hasSavedData ? 'bg-gray-200 cursor-not-allowed' : ''}`} required disabled={hasSavedData} />
                                {hasSavedData && <p className="text-[10px] text-gray-400 mt-1 text-center">Permanently linked to this account.</p>}
                            </div>
                            <div>
                                <label className={labelClass}>School Name</label>
                                <input type="text" name="schoolName" value={formData.schoolName} onChange={handleChange} className={inputClass} required />
                                {nameWarning && <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg flex gap-2 items-start"><span className="text-amber-500 text-lg">⚠️</span><p className="text-amber-700 text-xs font-semibold leading-relaxed">{nameWarning}</p></div>}
                            </div>
                            <div>
                                <label className={labelClass}>Mother School ID</label>
                                <input type="text" name="motherSchoolId" value={formData.motherSchoolId} onChange={handleChange} className={inputClass} placeholder="If annex, enter mother school ID" />
                            </div>
                        </div>
                    </div>

                    {/* 2. CLASSIFICATION (RESTORED) */}
                    <div className={sectionClass}>
                        <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4"><span className="text-xl">📊</span> Classification</h2>
                        <div>
                            <label className={labelClass}>Curricular Offering</label>
                            <select name="curricularOffering" value={formData.curricularOffering} onChange={handleChange} className={inputClass} required>
                                <option value="">-- Select Offering --</option>
                                <option>Purely Elementary</option>
                                <option>Elementary School and Junior High School (K-10)</option>
                                <option>All Offering (K-12)</option>
                                <option>Junior and Senior High</option>
                                <option>Purely Junior High School</option>
                                <option>Purely Senior High School</option>
                            </select>
                        </div>
                    </div>

                    {/* 3. LOCATION */}
                    <div className={sectionClass}>
                        <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4"><span className="text-xl">📍</span> Location</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Region</label><select name="region" value={formData.region} onChange={handleRegionChange} className={inputClass} required><option value="">Select Region</option>{Object.keys(locationData).sort().map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                            <div><label className={labelClass}>Province</label><select name="province" value={formData.province} onChange={handleProvinceChange} className={inputClass} disabled={!formData.region} required><option value="">Select Province</option>{provinceOptions.map(p => <option key={p} value={p}>{p}</option>)}</select></div>
                            <div><label className={labelClass}>Municipality / City</label><select name="municipality" value={formData.municipality} onChange={handleCityChange} className={inputClass} disabled={!formData.province} required><option value="">Select City/Mun</option>{cityOptions.map(c => <option key={c} value={c}>{c}</option>)}</select></div>
                            <div><label className={labelClass}>Barangay</label><select name="barangay" value={formData.barangay} onChange={handleChange} className={inputClass} disabled={!formData.municipality} required><option value="">Select Barangay</option>{barangayOptions.map(b => <option key={b} value={b}>{b}</option>)}</select></div>
                        </div>
                    </div>

                    {/* 4. HIERARCHY */}
                    <div className={sectionClass}>
                        <h2 className="text-gray-800 font-bold text-lg flex items-center gap-2 mb-4"><span className="text-xl">🏛️</span> Administration</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div><label className={labelClass}>Division</label><select name="division" value={formData.division} onChange={handleDivisionChange} className={inputClass} disabled={!formData.region} required><option value="">Select Division</option>{divisionOptions.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            <div><label className={labelClass}>District</label><select name="district" value={formData.district} onChange={handleChange} className={inputClass} disabled={!formData.division} required><option value="">Select District</option>{districtOptions.map(d => <option key={d} value={d}>{d}</option>)}</select></div>
                            <div className="md:col-span-2"><label className={labelClass}>Legislative District</label><select name="legDistrict" value={formData.legDistrict} onChange={handleChange} className={inputClass} required><option value="">Select District</option>{legDistrictOptions.map(l => <option key={l} value={l}>{l}</option>)}</select></div>
                        </div>
                    </div>

                    {/* 5. COORDINATES */}
                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 mb-6">
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-blue-800 font-bold text-sm uppercase tracking-wide">🌐 Geo-Tagging</h2>
                            <button type="button" onClick={handleGetLocation} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 shadow-sm transition-all"><span>📍</span> Get My Location</button>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div><label className={labelClass}>Latitude</label><input type="text" name="latitude" value={formData.latitude} onChange={handleChange} className={inputClass} placeholder="14.5995" /></div>
                            <div><label className={labelClass}>Longitude</label><input type="text" name="longitude" value={formData.longitude} onChange={handleChange} className={inputClass} placeholder="120.9842" /></div>
                        </div>
                        {formData.latitude && formData.longitude && (
                            <div className="mt-4 flex gap-2 justify-end">
                                <a href={`geo:${formData.latitude},${formData.longitude}?q=${formData.latitude},${formData.longitude}`} className="flex items-center gap-2 text-[#004A99] hover:text-white hover:bg-[#004A99] text-xs font-bold bg-white px-3 py-2 rounded-lg border border-blue-100 shadow-sm transition-all no-underline"><span>📱</span> Open in App</a>
                                <a href={`https://www.openstreetmap.org/?mlat=${formData.latitude}&mlon=${formData.longitude}#map=18/${formData.latitude}/${formData.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-700 hover:text-white hover:bg-green-600 text-xs font-bold bg-white px-3 py-2 rounded-lg border border-green-100 shadow-sm transition-all no-underline"><span>🗺️</span> View Map (Fast)</a>
                            </div>
                        )}
                    </div>

                </form>
            </div>

            {/* ACTIONS */}
            <div className="fixed bottom-0 left-0 w-full bg-white border-t border-gray-200 p-4 pb-8 z-50 flex gap-3 shadow-[0_-5px_20px_rgba(0,0,0,0.05)]">
                {/* Always show Save button (No more "Unlock" mode) */}
                <button onClick={handleSaveClick} disabled={isSaving} className="w-full bg-[#CC0000] text-white font-bold py-4 rounded-xl shadow-lg hover:bg-[#A30000] flex items-center justify-center gap-2">
                    {isSaving ? "Saving..." : "Save Changes"}
                </button>
            </div>

            {/* SAVE MODAL */}
            {showSaveModal && (
                <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-6 backdrop-blur-sm animate-in fade-in">
                    <div className="bg-white p-6 rounded-2xl w-full max-w-sm">
                        <h3 className="font-bold text-lg">Review Changes</h3>
                        
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 my-4 text-xs max-h-32 overflow-y-auto">
                            {getChanges().length > 0 ? getChanges().map((c, i) => (
                                <div key={i} className="flex justify-between border-b pb-1 mb-1 last:border-0"><span className="font-bold text-gray-500">{c.field}</span><span className="text-gray-800">{c.newVal}</span></div>
                            )) : <p className="text-gray-400 italic">No changes detected.</p>}
                        </div>

                        {!hasSavedData && (
                            <div className="mb-6 p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-3">
                                <label className="flex items-start gap-3 cursor-pointer group select-none"><input type="checkbox" checked={ack1} onChange={(e) => setAck1(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-600 cursor-pointer" /><span className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900 leading-tight">I confirm that I am the <b>SCHOOL HEAD</b> and that all information I provide is TRUE and ACCURATE.</span></label>
                                <label className="flex items-start gap-3 cursor-pointer group select-none"><input type="checkbox" checked={ack2} onChange={(e) => setAck2(e.target.checked)} className="mt-0.5 w-4 h-4 text-blue-600 rounded focus:ring-blue-600 cursor-pointer" /><span className="text-[11px] font-medium text-gray-700 group-hover:text-gray-900 leading-tight">I acknowledge that I have read and understood the information above.</span></label>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <button onClick={()=>setShowSaveModal(false)} className="flex-1 py-3 border rounded-xl font-bold text-gray-600">Cancel</button>
                            <button onClick={confirmSave} disabled={!hasSavedData && (!ack1 || !ack2)} className={`flex-1 py-3 text-white rounded-xl font-bold transition-all shadow-md ${(!hasSavedData && (!ack1 || !ack2)) ? 'bg-gray-300 cursor-not-allowed shadow-none' : 'bg-[#CC0000] hover:bg-[#A30000]'}`}>Confirm</button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
};

export default SchoolProfile;