import React, { useMemo } from 'react';
import { FiX, FiCheck, FiChevronDown } from 'react-icons/fi';
import { createPortal } from 'react-dom';

const FilterDrawer = ({ 
    isOpen, 
    onClose, 
    projects,
    regions, 
    categories, 
    selectedRegions, 
    setSelectedRegions, 
    selectedCategories, 
    setSelectedCategories,
    selectedDivision,
    setSelectedDivision,
    selectedProvince,
    setSelectedProvince,
    selectedMunicipality,
    setSelectedMunicipality,
    selectedDistrict,
    setSelectedDistrict,
    locations = [] // New prop for database-driven locations
}) => {
    if (!isOpen) return null;

    const normalize = (val) => val?.toString().trim().toUpperCase() || '';

    // Derived options based on selected parent layers
    const options = useMemo(() => {
        // Use database locations if available, otherwise fallback to projects
        const sourceData = locations.length > 0 ? locations : projects;
        
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

        return {
            divisions: [...new Set(divisions)].sort(),
            provinces: [...new Set(provinces)].sort(),
            municipalities: [...new Set(municipalities)].sort(),
            districts: [...new Set(districts)].sort()
        };
    }, [projects, locations, selectedRegions, selectedDivision, selectedProvince, selectedMunicipality]);

    const handleRegionChange = (region) => {
        const next = region ? [region] : [];
        setSelectedRegions(next);
        
        if (next.length === 0) {
            setSelectedDivision('');
            setSelectedProvince('');
            setSelectedMunicipality('');
            setSelectedDistrict('');
        }
    };

    const clearFilters = () => {
        setSelectedRegions([]);
        setSelectedCategories([]);
        setSelectedDivision('');
        setSelectedProvince('');
        setSelectedMunicipality('');
        setSelectedDistrict('');
    };

    const DropdownField = ({ label, value, onChange, options, placeholder }) => (
        <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
            <div className="relative group">
                <select 
                    value={value} 
                    onChange={(e) => onChange(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-[11px] font-bold text-slate-700 outline-none focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 appearance-none transition-all"
                >
                    <option value="">{placeholder}</option>
                    {options.map(opt => (
                        <option key={opt} value={opt}>{opt}</option>
                    ))}
                </select>
                <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-blue-500" />
            </div>
        </div>
    );

    return createPortal(
        <div className="fixed inset-0 z-[3000] flex justify-end">
            <div 
                className="absolute inset-0 bg-black/40 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            ></div>
            
            <div className="relative w-full max-w-sm bg-white h-full shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 tracking-tight">Filters</h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Refine project list</p>
                    </div>
                    <button 
                        onClick={onClose}
                        className="p-2 bg-slate-50 text-slate-400 hover:text-slate-600 rounded-full transition-colors"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                    {/* Primary Dropdowns */}
                    <div className="space-y-4">
                        <DropdownField 
                            label="Region" 
                            value={selectedRegions[0] || ''} 
                            onChange={(reg) => handleRegionChange(reg)} 
                            options={locations.length > 0 ? [...new Set(locations.map(l => l.region).filter(Boolean))].sort() : regions} 
                            placeholder="All Regions" 
                        />

                        <DropdownField 
                            label="Project Category" 
                            value={selectedCategories[0] || ''} 
                            onChange={(cat) => setSelectedCategories(cat ? [cat] : [])} 
                            options={categories} 
                            placeholder="All Categories" 
                        />
                    </div>

                    {/* Sub Filters (Hierarchical) */}
                    <div className={`space-y-4 border-t border-slate-50 pt-6 transition-all ${selectedRegions.length === 0 ? 'opacity-40 grayscale pointer-events-none' : ''}`}>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span>
                            <h3 className="text-[10px] font-black text-slate-800 uppercase tracking-widest">Location Details</h3>
                        </div>
                        
                        <DropdownField 
                            label="Division" 
                            value={selectedDivision} 
                            onChange={setSelectedDivision} 
                            options={options.divisions} 
                            placeholder="All Divisions" 
                        />
                        
                        <DropdownField 
                            label="Province" 
                            value={selectedProvince} 
                            onChange={setSelectedProvince} 
                            options={options.provinces} 
                            placeholder="All Provinces" 
                        />
                        
                        <DropdownField 
                            label="Municipality" 
                            value={selectedMunicipality} 
                            onChange={setSelectedMunicipality} 
                            options={options.municipalities} 
                            placeholder="All Municipalities" 
                        />
                        
                        <DropdownField 
                            label="Legislative District" 
                            value={selectedDistrict} 
                            onChange={setSelectedDistrict} 
                            options={options.districts} 
                            placeholder="All Districts" 
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-3">
                    <button 
                        onClick={onClose}
                        className="w-full py-4 bg-blue-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-200 active:scale-[0.98] transition-all"
                    >
                        Apply Filters
                    </button>
                    <button 
                        onClick={clearFilters}
                        className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 text-center block"
                    >
                        Reset All
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default FilterDrawer;
