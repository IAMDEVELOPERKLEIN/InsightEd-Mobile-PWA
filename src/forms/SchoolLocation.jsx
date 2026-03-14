import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaBus, FaCarSide, FaWalking, FaWater, FaMountain, FaBolt, 
    FaShieldAlt, FaMapMarkerAlt, FaClinicMedical, FaSignal, FaCloudRain,
    FaHorse, FaBicycle, FaMotorcycle
} from 'react-icons/fa';
import PageTransition from '../components/PageTransition';

const SchoolLocation = ({ schoolId, onSaveSuccess, isReadOnly = false }) => {
    const [loading, setLoading] = useState(false);
    const [riskIndex, setRiskIndex] = useState(null);
    const [currentStep, setCurrentStep] = useState(1);

    const { register, handleSubmit, watch, setValue, formState: { errors, isValid }, reset } = useForm({
        mode: 'onChange',
        defaultValues: {
            school_id: schoolId,
            transportation_modes: [],
            road_paved_pct: 50,
            road_unpaved_pct: 50,
            road_lighting_pct: 0,
            public_transpo_availability: 3,
            near_cliff_ravine: false,
            road_cliff_pct: 0,
            near_water: false,
            water_proximity: [],
            hazards_experienced: [],
            has_insurgency_threats: false,
            insurgency_threats_6mo: 0,
            river_crossing_on_foot: false,
            river_crossing_count: 0,
            emergency_response_mins: 0,
            proximity_hospital_km: 0,
            proximity_brgy_hall_mins: 0,
            proximity_brgy_hall_km: 0,
            proximity_muni_hall_mins: 0,
            proximity_muni_hall_km: 0,
            proximity_sdo_mins: 0,
            proximity_sdo_km: 0,
            proximity_clinic_mins: 0,
            proximity_clinic_km: 0,
            proximity_terminal_mins: 0,
            proximity_terminal_km: 0,
            proximity_highway_mins: 0,
            proximity_highway_km: 0,
            cellular_coverage: 'Strong',
            weather_isolation: false,
            natural_calamities: [],
            anthropogenic_threats: [],
            road_passable_public_transpo_pct: 100
        }
    });

    const watchPaved = watch('road_paved_pct');
    const watchNearCliff = watch('near_cliff_ravine');
    const watchNearWater = watch('near_water');
    const watchWaterProximity = watch('water_proximity') || [];
    const watchHasInsurgency = watch('has_insurgency_threats');
    const watchCalamities = watch('natural_calamities') || [];
    const watchPassability = watch('road_passable_public_transpo_pct');
    const watchRiverFoot = watch('river_crossing_on_foot');
    const watchThreats = watch('anthropogenic_threats') || [];

    useEffect(() => {
        setValue('road_unpaved_pct', 100 - watchPaved);
    }, [watchPaved, setValue]);

    useEffect(() => {
        const fetchExisting = async () => {
            if (!schoolId) return;
            try {
                const res = await fetch(`/api/school-location/${schoolId}`);
                const result = await res.json();
                if (result.success && result.data) {
                    reset(result.data);
                    setRiskIndex(result.data.risk_index);
                }
            } catch (err) {
                console.error("Failed to fetch location profile", err);
            }
        };
        fetchExisting();
    }, [schoolId, reset]);

    const onSubmit = async (data) => {
        // STRICT VALIDATION: Do not mark Unit 9 as accomplished when ALL points of reference questions are 0
        const refPointsFields = [
            'emergency_response_mins', 'proximity_hospital_km',
            'proximity_brgy_hall_mins', 'proximity_brgy_hall_km',
            'proximity_muni_hall_mins', 'proximity_muni_hall_km',
            'proximity_sdo_mins', 'proximity_sdo_km',
            'proximity_clinic_mins', 'proximity_clinic_km',
            'proximity_terminal_mins', 'proximity_terminal_km',
            'proximity_highway_mins', 'proximity_highway_km'
        ];
        
        const sumRefPoints = refPointsFields.reduce((acc, field) => acc + (parseFloat(data[field]) || 0), 0);
        
        if (sumRefPoints <= 0) {
            alert("Error: You must provide at least one non-zero point of reference (time or distance) before marking Unit 9 as accomplished.");
            setCurrentStep(3); // Services step contains points of reference
            return;
        }

        if (!schoolId) {
            alert("Error: School ID is missing! Please complete Step 1 (School Identity) first or refresh the dashboard.");
            return;
        }
        setLoading(true);
        try {
            const res = await fetch('/api/school-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, school_id: schoolId })
            });
            const result = await res.json();
            console.log("Save Result:", result);
            if (result.success) {
                setRiskIndex(result.data.risk_index);
                if (onSaveSuccess) onSaveSuccess(result.data);
                alert("Location profile saved successfully!");
            } else {
                const details = result.details ? result.details.map(d => `${d.path.join('.')}: ${d.message}`).join('\n') : "Unknown error (check console)";
                alert(`Error saving: Validation failed (Status ${res.status})\n\n${details}`);
            }
        } catch (err) {
            alert("Network error saving profile.");
        } finally {
            setLoading(false);
        }
    };

    const hazardList = [
        "Snake bites", "Drowning", "Falling in ravines", 
        "Wild animal attacks", "Flash floods", "Heat exhaustion", 
        "Rockfalls", "Landslides", "Mudslides", "Leech attacks (Limatik)",
        "Extreme slippery terrain"
    ];

    const waterTypes = ["River", "Lake", "Sea", "Creek", "Swamp", "Marsh", "Dam"];

    const refPoints = [
        { label: "Nearest Hospital", mins: "emergency_response_mins", km: "proximity_hospital_km", icon: <FaClinicMedical /> },
        { label: "Barangay Hall", mins: "proximity_brgy_hall_mins", km: "proximity_brgy_hall_km", icon: <FaMapMarkerAlt /> },
        { label: "Municipal Hall", mins: "proximity_muni_hall_mins", km: "proximity_muni_hall_km", icon: <FaMapMarkerAlt /> },
        { label: "Schools Division Office", mins: "proximity_sdo_mins", km: "proximity_sdo_km", icon: <FaMapMarkerAlt /> },
        { label: "Health Clinic", mins: "proximity_clinic_mins", km: "proximity_clinic_km", icon: <FaClinicMedical /> },
        { label: "Transport Terminal", mins: "proximity_terminal_mins", km: "proximity_terminal_km", icon: <FaBus /> },
        { label: "Nearest Highway", mins: "proximity_highway_mins", km: "proximity_highway_km", icon: <FaCarSide /> }
    ];
    const calamityOptions = ["Typhoon", "Flooding", "Earthquake", "Volcanic Eruption", "Landslide", "Drought", "Storm Surge", "Tsunami"];

    const transportModes = [
        { id: 'Habal-habal', icon: <FaMotorcycle /> },
        { id: 'Jeepney', icon: <FaBus /> },
        { id: 'Tri-cycle', icon: <FaCarSide /> },
        { id: 'Pedicab', icon: <FaBicycle /> },
        { id: 'Walking', icon: <FaWalking /> },
        { id: 'Boat', icon: <FaWater /> },
        { id: 'Animal Ride', icon: <FaHorse /> },
        { id: 'Private Vehicle', icon: <FaCarSide /> },
        { id: 'Bicycle', icon: <FaBicycle /> }
    ];

    const steps = [
        { id: 1, title: "Transport", icon: <FaBus /> },
        { id: 2, title: "Geography", icon: <FaMountain /> },
        { id: 3, title: "Services", icon: <FaShieldAlt /> },
        { id: 4, title: "Calamities", icon: <FaCloudRain /> },
        { id: 5, title: "Threats", icon: <FaShieldAlt /> }
    ];

    const nextStep = () => setCurrentStep(prev => Math.min(prev + 1, 5));
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));

    const sectionStyle = "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6";
    const labelStyle = "block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3";
    const inputStyle = "w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all";

    const renderStepContent = () => {
        switch (currentStep) {
            case 1:
                return (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FaBus />
                            </div>
                            Transport & Access
                        </h3>

                        <div className="mb-8">
                            <label className={labelStyle}>Common transportation modes used</label>
                            <div className="grid grid-cols-2 gap-3">
                                {transportModes.map(mode => (
                                    <label key={mode.id} className="relative group cursor-pointer">
                                        <input 
                                            type="checkbox" 
                                            value={mode.id} 
                                            {...register('transportation_modes')}
                                            className="peer sr-only"
                                            disabled={isReadOnly}
                                        />
                                        <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-transparent peer-checked:border-blue-500 peer-checked:bg-blue-50 dark:peer-checked:bg-blue-900/20 transition-all">
                                            <div className="text-slate-400 group-hover:text-blue-500 peer-checked:text-blue-600 transition-colors">
                                                {mode.icon}
                                            </div>
                                            <span className="text-sm font-bold text-slate-600 dark:text-slate-300 peer-checked:text-blue-700 dark:peer-checked:text-blue-400">{mode.id}</span>
                                        </div>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className={labelStyle}>Public Transpo Availability (1-5)</label>
                                <div className="flex justify-between gap-2 mb-2">
                                    {[1, 2, 3, 4, 5].map(v => (
                                        <button 
                                            key={v}
                                            type="button"
                                            onClick={() => setValue('public_transpo_availability', v)}
                                            className={`flex-1 py-3 rounded-xl font-black text-sm transition-all ${watch('public_transpo_availability') == v ? 'bg-blue-600 text-white' : 'bg-slate-100 dark:bg-slate-900 text-slate-400'}`}
                                            disabled={isReadOnly}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                                <div className="flex justify-between px-1">
                                    <span className="text-[10px] font-bold text-slate-400">1: Once/Twice a day</span>
                                    <span className="text-[10px] font-bold text-slate-400">5: Available anytime</span>
                                </div>
                            </div>

                            <div>
                                <div className="flex justify-between mb-2">
                                    <label className={labelStyle}>Road Paved: {watchPaved}%</label>
                                    <span className="text-xs font-bold text-slate-400">Unpaved: {100 - watchPaved}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    {...register('road_paved_pct', { valueAsNumber: true })} 
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div>
                                <label className={labelStyle}>Road Lighting Coverage: {watch('road_lighting_pct')}%</label>
                                <input 
                                    type="range" 
                                    {...register('road_lighting_pct', { valueAsNumber: true })} 
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex justify-between mb-2">
                                    <label className={labelStyle}>Road Passable by Public Transpo: {watchPassability}%</label>
                                </div>
                                <input 
                                    type="range" 
                                    {...register('road_passable_public_transpo_pct', { valueAsNumber: true })} 
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                                    disabled={isReadOnly}
                                />
                            </div>
                        </div>
                    </motion.div>
                );
            case 2:
                return (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600 dark:text-orange-400">
                                <FaMountain />
                            </div>
                            Hazards & Geography
                        </h3>

                        <div className="space-y-6">
                            <div className="flex items-center justify-between p-4 rounded-2xl bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30">
                                <div className="flex items-center gap-3">
                                    <FaWater className="text-orange-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Near Cliff or Ravine?</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    {...register('near_cliff_ravine')} 
                                    className="w-6 h-6 rounded-lg text-orange-600 focus:ring-orange-500"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <AnimatePresence>
                                {watchNearCliff && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden p-1"
                                    >
                                        <div className="flex justify-between mb-2">
                                            <label className={labelStyle}>% of road along cliff</label>
                                            <span className="text-xs font-bold text-orange-500">{watch('road_cliff_pct')}%</span>
                                        </div>
                                        <input 
                                            type="range" 
                                            {...register('road_cliff_pct', { valueAsNumber: true })} 
                                            className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-orange-500"
                                            disabled={isReadOnly}
                                        />
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div className="flex items-center justify-between p-4 rounded-2xl bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 mt-6">
                                <div className="flex items-center gap-3">
                                    <FaWater className="text-blue-500" />
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Near a body of water?</span>
                                </div>
                                <input 
                                    type="checkbox" 
                                    {...register('near_water')} 
                                    className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <AnimatePresence>
                                {watchNearWater && (
                                    <motion.div 
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        className="overflow-hidden space-y-4"
                                    >
                                        <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700">
                                            <label className={labelStyle}>Types of water bodies nearby</label>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {waterTypes.map(type => {
                                                    const isSelected = watchWaterProximity.some(w => w.type === type);
                                                    return (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => {
                                                                if (isSelected) {
                                                                    setValue('water_proximity', watchWaterProximity.filter(w => w.type !== type));
                                                                } else {
                                                                    setValue('water_proximity', [...watchWaterProximity, { type, distance_km: '' }]);
                                                                }
                                                            }}
                                                            className={`px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                                                        >
                                                            {type}
                                                        </button>
                                                    );
                                                })}
                                            </div>

                                            <div className="space-y-3">
                                                {watchWaterProximity.map((item, index) => (
                                                    <div key={item.type} className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 space-y-3">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center">
                                                                    <FaWater size={12} />
                                                                </div>
                                                                <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{item.type}</span>
                                                            </div>
                                                            <button 
                                                                type="button"
                                                                onClick={() => setValue('water_proximity', watchWaterProximity.filter(w => w.type !== item.type))}
                                                                className="text-slate-400 hover:text-rose-500 transition-colors"
                                                            >
                                                                &times;
                                                            </button>
                                                        </div>
                                                        <div>
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Distance to school (in km)</p>
                                                            <div className="relative">
                                                                <input 
                                                                    type="number" 
                                                                    step="0.1"
                                                                    placeholder="Distance (km)"
                                                                    value={item.distance_km}
                                                                    onChange={(e) => {
                                                                        e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                                                                        const val = e.target.value;
                                                                        const newList = [...watchWaterProximity];
                                                                        newList[index] = { ...item, distance_km: val };
                                                                        setValue('water_proximity', newList);
                                                                    }}
                                                                    className="w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-xl p-3 text-sm font-bold placeholder:text-slate-300 pr-12"
                                                                    disabled={isReadOnly}
                                                                />
                                                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-400">KM</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>

                            <div>
                                <label className={labelStyle}>Hazards Experienced on Route</label>
                                <div className="flex flex-wrap gap-2">
                                    {hazardList.map(h => (
                                        <label key={h} className="cursor-pointer">
                                            <input 
                                                type="checkbox" 
                                                value={h} 
                                                {...register('hazards_experienced')}
                                                className="peer sr-only"
                                                disabled={isReadOnly}
                                            />
                                            <div className="px-4 py-2 rounded-full border-2 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold peer-checked:bg-orange-500 peer-checked:text-white peer-checked:border-orange-500 transition-all">
                                                {h}
                                            </div>
                                        </label>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-6 pt-8 border-t border-slate-100 dark:border-slate-800">
                                <div className="flex items-center justify-between p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
                                    <div className="flex items-center gap-3">
                                        <FaWater className="text-blue-600" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">River crossing on foot?</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        {...register('river_crossing_on_foot')} 
                                        className="w-6 h-6 rounded-lg text-blue-600 focus:ring-blue-500"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <AnimatePresence>
                                    {watchRiverFoot && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800"
                                        >
                                            <label className={labelStyle}>How many river crossings?</label>
                                            <input 
                                                type="number" 
                                                min="0"
                                                {...register('river_crossing_count', { 
                                                    onChange: (e) => { e.target.value = e.target.value.replace(/^0+(?=\d)/, ''); },
                                                    valueAsNumber: true 
                                                })} 
                                                placeholder="Enter number of crossings"
                                                className="w-full bg-white dark:bg-slate-800 border-0 rounded-xl p-4 text-sm font-bold shadow-sm"
                                                disabled={isReadOnly}
                                            />
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                );
            case 3:
                return (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <FaShieldAlt />
                            </div>
                            Services
                        </h3>

                        <div className="space-y-6">
                            <div className="p-4 bg-orange-50 dark:bg-orange-900/10 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
                                <label className={labelStyle}>Cellular Signal Strength</label>
                                <select {...register('cellular_coverage')} className={inputStyle} disabled={isReadOnly}>
                                    <option value="None">No Signal</option>
                                    <option value="Weak">Weak / Text Only</option>
                                    <option value="Moderate">Moderate / H+</option>
                                    <option value="Strong">Strong / 4G / 5G</option>
                                </select>
                            </div>

                            <div className="space-y-4">
                                <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">Points of Reference</h4>
                                <div className="grid grid-cols-1 gap-4">
                                    {refPoints.map(point => (
                                        <div key={point.label} className="bg-slate-50 dark:bg-slate-900/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 transition-all">
                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 shadow-sm flex items-center justify-center text-slate-600 dark:text-slate-400">
                                                    {point.icon}
                                                </div>
                                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">{point.label}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Time</p>
                                                    <input 
                                                        type="number" 
                                                        {...register(point.mins, { 
                                                            onChange: (e) => { e.target.value = e.target.value.replace(/^0+(?=\d)/, ''); },
                                                            valueAsNumber: true 
                                                        })} 
                                                        className="w-full bg-white dark:bg-slate-800 border-0 rounded-xl p-3 text-sm font-bold shadow-sm pr-12"
                                                        placeholder="0"
                                                        disabled={isReadOnly} 
                                                    />
                                                    <span className="absolute right-3 bottom-3 text-[10px] font-black text-slate-400">MINS</span>
                                                </div>
                                                <div className="relative">
                                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Distance</p>
                                                    <input 
                                                        type="number" 
                                                        step="0.1"
                                                        {...register(point.km, { 
                                                            onChange: (e) => { e.target.value = e.target.value.replace(/^0+(?=\d)/, ''); },
                                                            valueAsNumber: true 
                                                        })} 
                                                        className="w-full bg-white dark:bg-slate-800 border-0 rounded-xl p-3 text-sm font-bold shadow-sm pr-10"
                                                        placeholder="0.0"
                                                        disabled={isReadOnly} 
                                                    />
                                                    <span className="absolute right-3 bottom-3 text-[10px] font-black text-slate-400">KM</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                );
            case 4:
                return (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FaCloudRain />
                            </div>
                            Natural Calamities
                        </h3>

                        <div className="space-y-8">
                            <div>
                                <label className={labelStyle}>What natural calamities do you experience regularly?</label>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {calamityOptions.map(c => {
                                        const isSelected = watchCalamities.some(item => item.type === c);
                                        return (
                                            <button
                                                key={c}
                                                type="button"
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setValue('natural_calamities', watchCalamities.filter(item => item.type !== c));
                                                    } else {
                                                        setValue('natural_calamities', [...watchCalamities, { type: c, incidences: 0 }]);
                                                    }
                                                }}
                                                className={`px-4 py-3 rounded-2xl text-xs font-black transition-all border-2 ${isSelected ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-500'}`}
                                            >
                                                {c}
                                            </button>
                                        );
                                    })}
                                </div>

                                <AnimatePresence>
                                    {watchCalamities.length > 0 && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            className="space-y-3"
                                        >
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Incidences in the past 6 months</p>
                                            {watchCalamities.map((item, index) => (
                                                <div key={item.type} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                                    <div className="flex-1">
                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{item.type}</span>
                                                    </div>
                                                    <div className="w-32">
                                                        <input 
                                                            type="number" 
                                                            min="0"
                                                            value={item.incidences}
                                                            onChange={(e) => {
                                                                e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                                                                const val = e.target.value;
                                                                const newList = [...watchCalamities];
                                                                newList[index] = { ...item, incidences: parseInt(val) || 0 };
                                                                setValue('natural_calamities', newList);
                                                            }}
                                                            placeholder="0"
                                                            className="w-full bg-white dark:bg-slate-800 border-0 rounded-xl p-3 text-center text-sm font-bold shadow-sm"
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                );
            case 5:
                const threatOptions = ["Tribal/Clan Wars", "Civil Unrest", "Armed Conflict", "Theft/Robbery"];
                return (
                    <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <FaShieldAlt />
                            </div>
                            Social & Anthropogenic Threats
                        </h3>

                        <div className="space-y-8">
                            <div className="space-y-6">
                                <div className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                                    <div className="flex items-center gap-3">
                                        <FaShieldAlt className="text-rose-600" />
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Are there anthropogenic threats in the school community?</span>
                                    </div>
                                    <input 
                                        type="checkbox" 
                                        {...register('has_insurgency_threats')} 
                                        className="w-6 h-6 rounded-lg text-rose-600 focus:ring-rose-500"
                                        disabled={isReadOnly}
                                    />
                                </div>

                                <AnimatePresence>
                                    {watchHasInsurgency && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden space-y-6"
                                        >
                                            <div className="pt-4">
                                                <label className={labelStyle}>Types of Communal Conflicts / Threats</label>
                                                <div className="flex flex-wrap gap-2 mb-6">
                                                    {threatOptions.map(threat => {
                                                        const isSelected = watchThreats.some(t => t.type === threat);
                                                        return (
                                                            <button
                                                                key={threat}
                                                                type="button"
                                                                onClick={() => {
                                                                    if (isSelected) {
                                                                        setValue('anthropogenic_threats', watchThreats.filter(t => t.type !== threat));
                                                                    } else {
                                                                        setValue('anthropogenic_threats', [...watchThreats, { type: threat, incidences: 0 }]);
                                                                    }
                                                                }}
                                                                className={`px-4 py-2 rounded-full text-xs font-bold transition-all border-2 ${isSelected ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'}`}
                                                            >
                                                                {threat}
                                                            </button>
                                                        );
                                                    })}
                                                </div>

                                                <AnimatePresence>
                                                    {watchThreats.length > 0 && (
                                                        <motion.div 
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            className="space-y-3"
                                                        >
                                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Incidences in the past 6 months</p>
                                                            {watchThreats.map((item, index) => (
                                                                <div key={item.type} className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-3xl border border-slate-100 dark:border-slate-800">
                                                                    <div className="flex-1">
                                                                        <span className="text-sm font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">{item.type}</span>
                                                                    </div>
                                                                    <div className="w-32">
                                                                        <input 
                                                                            type="number" 
                                                                            min="0"
                                                                            value={item.incidences}
                                                                            onChange={(e) => {
                                                                                e.target.value = e.target.value.replace(/^0+(?=\d)/, '');
                                                                                const val = e.target.value;
                                                                                const newList = [...watchThreats];
                                                                                newList[index] = { ...item, incidences: parseInt(val) || 0 };
                                                                                setValue('anthropogenic_threats', newList);
                                                                            }}
                                                                            placeholder="0"
                                                                            className="w-full bg-white dark:bg-slate-800 border-0 rounded-xl p-3 text-center text-sm font-bold shadow-sm"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                );
            default:
                return null;
        }
    };

    return (
        <PageTransition>
            <div className="max-w-2xl mx-auto pb-32 pt-4 px-2">
                {/* Progress Bar Header */}
                <div className="mb-8 px-4">
                    <div className="flex justify-between items-end mb-3">
                        <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Current Progress</p>
                            <h2 className="text-sm font-black text-slate-700 uppercase tracking-tight">
                                Step {currentStep} <span className="text-slate-300 mx-1">/</span> {steps.length}: <span className="text-blue-600 ml-1">{steps.find(s => s.id === currentStep)?.title}</span>
                            </h2>
                        </div>
                        <span className="text-[10px] font-black text-blue-500 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-widest">
                            {Math.round((currentStep / steps.length) * 100)}% Complete
                        </span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
                        <motion.div 
                            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${(currentStep / steps.length) * 100}%` }}
                            transition={{ type: "spring", damping: 20, stiffness: 100 }}
                        />
                    </div>
                </div>

                {riskIndex && currentStep === 1 && (
                    <motion.div 
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-8 p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl ${riskIndex > 7 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : riskIndex > 4 ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Safety Risk Index</p>
                            <h2 className="text-4xl font-black">{riskIndex} <span className="text-lg opacity-60">/ 10</span></h2>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{riskIndex > 7 ? 'Critical Risk' : riskIndex > 4 ? 'Moderate Risk' : 'Low Risk'}</p>
                            <p className="text-[10px] opacity-70">Updated from last submission</p>
                        </div>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    {renderStepContent()}

                    {!isReadOnly && (
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 z-50">
                            <div className="max-w-2xl mx-auto flex gap-4">
                                {currentStep > 1 && (
                                    <button 
                                        type="button" 
                                        onClick={prevStep}
                                        className="flex-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-200 font-black py-4 rounded-2xl active:scale-95 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Back
                                    </button>
                                )}
                                
                                {currentStep < 5 ? (
                                    <button 
                                        key="btn-next"
                                        type="button" 
                                        onClick={nextStep}
                                        className="flex-[2] bg-blue-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-blue-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest"
                                    >
                                        Next Component
                                    </button>
                                ) : (
                                    <button 
                                        key="btn-save"
                                        type="submit" 
                                        disabled={loading}
                                        className="flex-[2] bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-lg shadow-emerald-500/30 active:scale-95 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <FaShieldAlt />
                                                Finish & Save
                                            </>
                                        )}
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                </form>
            </div>
        </PageTransition>
    );
};

export default SchoolLocation;
