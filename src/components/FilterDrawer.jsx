import React, { useState, useMemo, useEffect } from 'react';
import { FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { createPortal } from 'react-dom';

const FilterDrawer = ({ 
    isOpen, 
    onClose, 
    onApply,
    projects = [],
    locations = [], // New prop for database-driven locations
    initialRegions = [],
    initialDivisions = [],
    initialCategories = [],
    initialYears = [],
    hideRegions = false,
    hideDivisions = false
}) => {
    // Internal state for the drawer
    const [selectedRegions, setSelectedRegions] = useState(initialRegions);
    const [selectedCategories, setSelectedCategories] = useState(initialCategories);
    const [selectedDivision, setSelectedDivision] = useState(initialDivisions[0] || '');
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedMunicipality, setSelectedMunicipality] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [selectedYears, setSelectedYears] = useState(initialYears);

    // Sync with initial values when drawer opens
    useEffect(() => {
        if (isOpen) {
            setSelectedRegions(initialRegions || []);
            setSelectedCategories(initialCategories || []);
            setSelectedDivision(initialDivisions[0] || '');
            setSelectedYears(initialYears || []);
        }
    }, [isOpen, initialRegions, initialDivisions, initialCategories, initialYears]);

    const [selectedBatchFunds, setSelectedBatchFunds] = useState([]);

    const normalize = (val) => val?.toString().trim().toUpperCase() || '';

    // Derived options based on selected parent layers
    const options = useMemo(() => {
        // Use database locations if available, otherwise fallback to projects
        // Ensure sourceData is ALWAYS an array to avoid .filter crash
        const sourceData = Array.isArray(locations) && locations.length > 0 ? locations : (Array.isArray(projects) ? projects : []);
        
        const filtered = sourceData.filter(loc => 
            selectedRegions.length === 0 || selectedRegions.some(reg => normalize(reg) === normalize(loc.region))
        );

        const divisions = [...new Set(filtered.map(l => l.division).filter(Boolean))].map(s => s.trim().toUpperCase());
        
        const provinces = [...new Set(filtered
            .filter(l => !selectedDivision || normalize(l.division) === normalize(selectedDivision))
            .map(l => l.province).filter(Boolean))].map(s => s.trim().toUpperCase());
            
        const municipalities = [...new Set(filtered
            .filter(l => !selectedDivision || normalize(l.division) === normalize(selectedDivision))
            .filter(l => !selectedProvince || normalize(l.province) === normalize(selectedProvince))
            .map(l => l.municipality).filter(Boolean))].map(s => s.trim().toUpperCase());
            
        const districts = [...new Set(filtered
            .filter(l => !selectedDivision || normalize(l.division) === normalize(selectedDivision))
            .filter(l => !selectedProvince || normalize(l.province) === normalize(selectedProvince))
            .filter(l => !selectedMunicipality || normalize(l.municipality) === normalize(selectedMunicipality))
            .map(l => l.legislative_district).filter(Boolean))].map(s => s.trim().toUpperCase());

        const years = [...new Set(sourceData.map(p => p.funding_year || p.fundingYear).filter(Boolean))].map(y => y.toString());

        const batches = [...new Set(sourceData.map(p => p.batch_of_funds || p.batchOfFunds).filter(Boolean))].map(s => s.trim());

        return {
            divisions: [...new Set(divisions)].sort(),
            provinces: [...new Set(provinces)].sort(),
            municipalities: [...new Set(municipalities)].sort(),
            districts: [...new Set(districts)].sort(),
            years: Array.from(new Set(years)).sort((a,b) => b.localeCompare(a)),
            categories: [...new Set(sourceData.map(p => p.project_category || p.projectCategory).filter(Boolean))].map(s => s.trim()),
            batches: Array.from(new Set(batches)).sort()
        };
    }, [projects, locations, selectedRegions, selectedDivision, selectedProvince, selectedMunicipality]);

    if (!isOpen) return null;

    const handleApply = () => {
        if (onApply) {
            onApply({
                regions: selectedRegions,
                divisions: selectedDivision ? [selectedDivision] : [],
                categories: selectedCategories,
                years: selectedYears,
                province: selectedProvince,
                municipality: selectedMunicipality,
                district: selectedDistrict,
                batches: selectedBatchFunds
            });
        }
        onClose();
    };

    const clearFilters = () => {
        setSelectedRegions([]);
        setSelectedCategories([]);
        setSelectedDivision('');
        setSelectedProvince('');
        setSelectedMunicipality('');
        setSelectedDistrict('');
        setSelectedYears([]);
        setSelectedBatchFunds([]);
    };

    const DropdownField = ({ label, value, onChange, options, placeholder }) => (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <select 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 appearance-none transition-all"
                >
                    <option value="">{placeholder}</option>
                    {(options || []).map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500" />
            </div>
        </div>
    );

    const MultiSelectField = ({ label, options, selected, onChange }) => (
        <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="flex flex-wrap gap-2">
                {(options || []).map(opt => {
                    const isSel = selected.includes(opt);
                    return (
                        <button
                            key={opt}
                            onClick={() => {
                                if (isSel) onChange(selected.filter(s => s !== opt));
                                else onChange([...selected, opt]);
                            }}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black transition-all border ${
                                isSel 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 hover:border-blue-200'
                            }`}
                        >
                            {opt}
                        </button>
                    );
                })}
            </div>
        </div>
    );

    const drawer = (
        <div className="fixed inset-0 z-[10000] overflow-hidden">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
            
            <div className="absolute inset-y-0 right-0 max-w-full flex">
                <div className="w-screen max-w-md bg-white dark:bg-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
                    {/* Header */}
                    <div className="px-6 py-8 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-black text-slate-800 dark:text-white leading-tight underline decoration-blue-500 decoration-4 underline-offset-4 tracking-tighter">Filter Projects</h2>
                            <button onClick={onClose} className="p-3 bg-slate-50 dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 rounded-2xl text-slate-400 transition-all active:scale-90">
                                <FiX size={20} />
                            </button>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Criteria</span>
                            <button 
                                onClick={clearFilters}
                                className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest hover:underline"
                            >
                                Reset All
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* Regions */}
                        {!hideRegions && (
                            <MultiSelectField 
                                label="Regions" 
                                options={['NCR', 'CAR', 'REGION I', 'REGION II', 'REGION III', 'REGION IV-A', 'MIMAROPA', 'REGION V', 'REGION VI', 'REGION VII', 'REGION VIII', 'REGION IX', 'REGION X', 'REGION XI', 'REGION XII', 'CARAGA', 'BARMM']}
                                selected={selectedRegions}
                                onChange={setSelectedRegions}
                            />
                        )}

                        {/* Category */}
                        <MultiSelectField 
                            label="Project Category"
                            options={options.categories}
                            selected={selectedCategories}
                            onChange={setSelectedCategories}
                        />

                        {/* Location Hierarchy */}
                        <div className="space-y-4">
                            {!hideDivisions && (
                                <DropdownField 
                                    label="Division" 
                                    value={selectedDivision} 
                                    onChange={setSelectedDivision}
                                    options={options.divisions}
                                    placeholder="All Divisions"
                                />
                            )}
                            <DropdownField 
                                label="Province" 
                                value={selectedProvince} 
                                onChange={setSelectedProvince}
                                options={options.provinces}
                                placeholder="All Provinces"
                            />
                            <DropdownField 
                                label="Municipality / City" 
                                value={selectedMunicipality} 
                                onChange={setSelectedMunicipality}
                                options={options.municipalities}
                                placeholder="All Municipalities"
                            />
                        </div>

                        {/* Years */}
                        <MultiSelectField 
                            label="Funding Year"
                            options={options.years}
                            selected={selectedYears}
                            onChange={setSelectedYears}
                        />

                        {/* Batch of Funds */}
                        <MultiSelectField 
                            label="Batch of Funds"
                            options={options.batches}
                            selected={selectedBatchFunds}
                            onChange={setSelectedBatchFunds}
                        />
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/40">
                        <button 
                            onClick={handleApply}
                            className="w-full py-4 bg-blue-600 dark:bg-blue-500 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-xl shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                        >
                            <FiCheck size={16} /> Apply Filters
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );

    return createPortal(drawer, document.body);
};

export default FilterDrawer;
