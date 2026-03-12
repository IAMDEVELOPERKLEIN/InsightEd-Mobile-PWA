import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    FaBus, FaCarSide, FaWalking, FaWater, FaMountain, FaBolt, 
    FaShieldAlt, FaMapMarkerAlt, FaClinicMedical, FaSignal, FaCloudRain 
} from 'react-icons/fa';
import PageTransition from '../components/PageTransition';

const SchoolLocation = ({ schoolId, onSaveSuccess, isReadOnly = false }) => {
    const [loading, setLoading] = useState(false);
    const [riskIndex, setRiskIndex] = useState(null);

    const { register, handleSubmit, watch, setValue, formState: { errors }, reset } = useForm({
        defaultValues: {
            school_id: schoolId,
            transportation_modes: [],
            road_paved_pct: 50,
            road_unpaved_pct: 50,
            road_lighting_pct: 0,
            public_transpo_availability: 3,
            near_cliff_ravine: false,
            cliff_distance_m: null,
            hazards_experienced: [],
            insurgency_threats_6mo: 0,
            requires_hiking: false,
            hiking_distance_km: null,
            manmade_bridge_foot: false,
            river_crossing_no_bridge: false,
            emergency_response_mins: 30,
            cellular_coverage: 'Strong',
            weather_isolation: false
        }
    });

    const watchPaved = watch('road_paved_pct');
    const watchNearCliff = watch('near_cliff_ravine');
    const watchRequiresHiking = watch('requires_hiking');

    useEffect(() => {
        // Sync unpaved with paved to always sum to 100
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
        setLoading(true);
        try {
            const res = await fetch('/api/school-location', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, school_id: schoolId })
            });
            const result = await res.json();
            if (result.success) {
                setRiskIndex(result.data.risk_index);
                if (onSaveSuccess) onSaveSuccess(result.data);
            } else {
                alert("Error saving: " + (result.error || "Unknown error"));
            }
        } catch (err) {
            alert("Network error saving profile.");
        } finally {
            setLoading(false);
        }
    };

    const hazardList = [
        "Snake bites", "Drowning", "Falling in ravines", 
        "Wild animal attacks", "Flash floods", "Heat exhaustion", "Rockfalls"
    ];

    const transportModes = [
        { id: 'Habal-habal', icon: <FaBus /> },
        { id: 'Jeepney', icon: <FaCarSide /> },
        { id: 'Tri-cycle', icon: <FaCarSide /> },
        { id: 'Walking', icon: <FaWalking /> },
        { id: 'Boat', icon: <FaWater /> }
    ];

    const sectionStyle = "bg-white/80 dark:bg-slate-800/80 backdrop-blur-md p-6 rounded-3xl border border-gray-100 dark:border-slate-700 shadow-sm mb-6";
    const labelStyle = "block text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-3";
    const inputStyle = "w-full bg-slate-50 dark:bg-slate-900 border-0 rounded-2xl p-4 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 transition-all";

    return (
        <PageTransition>
            <div className="max-w-2xl mx-auto pb-24">
                {riskIndex && (
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className={`mb-8 p-6 rounded-[2.5rem] flex items-center justify-between text-white shadow-xl ${riskIndex > 7 ? 'bg-gradient-to-r from-rose-500 to-orange-500' : riskIndex > 4 ? 'bg-gradient-to-r from-orange-400 to-amber-500' : 'bg-gradient-to-r from-emerald-500 to-teal-500'}`}
                    >
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-80">Safety Risk Index</p>
                            <h2 className="text-4xl font-black">{riskIndex} <span className="text-lg opacity-60">/ 10</span></h2>
                        </div>
                        <div className="text-right">
                            <p className="text-sm font-bold">{riskIndex > 7 ? 'Critical Risk' : riskIndex > 4 ? 'Moderate Risk' : 'Low Risk'}</p>
                            <p className="text-[10px] opacity-70">Based on site hazards</p>
                        </div>
                    </motion.div>
                )}

                <form onSubmit={handleSubmit(onSubmit)}>
                    {/* Transport & Infrastructure */}
                    <div className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                                <FaBus />
                            </div>
                            Transport & Access
                        </h3>

                        <div className="mb-8">
                            <label className={labelStyle}>Transportation Modes</label>
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
                                <div className="flex justify-between mb-2">
                                    <label className={labelStyle}>Road Paved: {watchPaved}%</label>
                                    <span className="text-xs font-bold text-slate-400">Unpaved: {100 - watchPaved}%</span>
                                </div>
                                <input 
                                    type="range" 
                                    {...register('road_paved_pct')} 
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div>
                                <label className={labelStyle}>Road Lighting Coverage: {watch('road_lighting_pct')}%</label>
                                <input 
                                    type="range" 
                                    {...register('road_lighting_pct')} 
                                    className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div>
                                <label className={labelStyle}>Public Transpo Availability (1-5)</label>
                                <div className="flex justify-between gap-2">
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
                            </div>
                        </div>
                    </div>

                    {/* Geographic & Hazards */}
                    <div className={sectionStyle}>
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
                                        className="overflow-hidden"
                                    >
                                        <label className={labelStyle}>Distance to Cliff (meters)</label>
                                        <input 
                                            type="number" 
                                            {...register('cliff_distance_m')} 
                                            placeholder="e.g. 15"
                                            className={inputStyle}
                                            disabled={isReadOnly}
                                        />
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
                        </div>
                    </div>

                    {/* Access & Safety */}
                    <div className={sectionStyle}>
                        <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 flex items-center gap-3">
                            <div className="w-10 h-10 bg-rose-100 dark:bg-rose-900/30 rounded-2xl flex items-center justify-center text-rose-600 dark:text-rose-400">
                                <FaShieldAlt />
                            </div>
                            Safety & Emergency
                        </h3>

                        <div className="space-y-6">
                            <div>
                                <label className={labelStyle}>Insurgency-related threats (Past 6 months)</label>
                                <input 
                                    type="number" 
                                    {...register('insurgency_threats_6mo')} 
                                    className={inputStyle}
                                    placeholder="Count of incidences"
                                    disabled={isReadOnly}
                                />
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <label className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-transparent hover:border-blue-100 dark:hover:border-blue-900/30 transition-all">
                                    <div className="flex items-center gap-3">
                                        <FaWalking className="text-blue-500" />
                                        <span className="text-sm font-bold">Requires Hiking?</span>
                                    </div>
                                    <input type="checkbox" {...register('requires_hiking')} className="w-6 h-6" disabled={isReadOnly} />
                                </label>

                                <AnimatePresence>
                                    {watchRequiresHiking && (
                                        <motion.div 
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden space-y-4 px-2"
                                        >
                                            <div>
                                                <label className={labelStyle}>Hiking Distance (km)</label>
                                                <input type="number" step="0.1" {...register('hiking_distance_km')} className={inputStyle} disabled={isReadOnly} />
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-slate-500">Man-made foot bridge?</span>
                                                <input type="checkbox" {...register('manmade_bridge_foot')} className="w-5 h-5" disabled={isReadOnly} />
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <label className="flex items-center justify-between p-4 rounded-2xl bg-rose-50 dark:bg-rose-900/10 border border-rose-100 dark:border-rose-900/30">
                                    <div className="flex items-center gap-3">
                                        <FaWater className="text-rose-500" />
                                        <span className="text-sm font-bold text-rose-700 dark:text-rose-400">River Crossing (No Bridge)?</span>
                                    </div>
                                    <input type="checkbox" {...register('river_crossing_no_bridge')} className="w-6 h-6 text-rose-600 focus:ring-rose-500" disabled={isReadOnly} />
                                </label>

                                <div>
                                    <label className={labelStyle}>Emergency Signal Coverage</label>
                                    <select {...register('cellular_coverage')} className={inputStyle} disabled={isReadOnly}>
                                        <option value="None">No Signal</option>
                                        <option value="Weak">Weak / Edge</option>
                                        <option value="Strong">Strong / 4G / 5G</option>
                                    </select>
                                </div>

                                <div>
                                    <label className={labelStyle}>Time to Nearest Hospital (Mins)</label>
                                    <input type="number" {...register('emergency_response_mins')} className={inputStyle} disabled={isReadOnly} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-100 dark:border-slate-800 z-50">
                            <button 
                                type="submit" 
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-lg shadow-blue-500/30 active:scale-95 transition-all text-lg flex items-center justify-center gap-3"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
                                ) : (
                                    <>
                                        <FaShieldAlt />
                                        Save Safety Profile
                                    </>
                                )}
                            </button>
                        </div>
                    )}
                </form>
            </div>
        </PageTransition>
    );
};

export default SchoolLocation;
