import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiCheckCircle, FiEdit2, FiCheck, FiArrowRight, FiArrowLeft, FiChevronLeft, FiPlus, FiTrash2, FiMapPin, FiSave, FiSearch, FiChevronDown, FiUnlock } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import SuccessModal from "../SuccessModal";
import { MapContainer, TileLayer, Marker, Popup, Rectangle, useMapEvents, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";

// Fix for default marker icon in react-leaflet
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconUrl: markerIcon,
    iconRetinaUrl: markerIcon2x,
    shadowUrl: markerShadow,
});

// Helper: fly/zoom to school coordinates when they load
const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.flyTo(center, 19, { duration: 1.5 });
        }
    }, [center, map]);
    return null;
};

// ── Constants ──────────────────────────────────────────────────────────
const DEFAULT_BUILDING_TYPES = [
    "Academic Building",
    "Laboratory Building",
    "Administrative Building",
    "Multi-Purpose Building",
    "Covered Court",
    "Canteen/Feeding Center",
    "Clinic",
    "Library",
    "Comfort Room (CR) Building",
    "Storage Building",
    "Teacher's Cottage",
    "Security/Guard House",
    "Gymnasium"
];

export default function Unit10PhysicalFacilities() {
    const navigate = useNavigate();

    // ── Global State ─────────────────────────────────────────────────────────
    const [schoolId, setSchoolId] = useState("");
    const [loading, setLoading] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [schoolData, setSchoolData] = useState(null);
    const [currentPage, setCurrentPage] = useState(1); // 1-5 Wizard Stages
    const [buildingTypes, setBuildingTypes] = useState(() => {
        const cached = localStorage.getItem("nsbi_building_types");
        return cached ? JSON.parse(cached) : DEFAULT_BUILDING_TYPES;
    });
    const [newBuildingSearch, setNewBuildingSearch] = useState("");
    const [goodBuildingSearch, setGoodBuildingSearch] = useState("");
    const [isNewDropdownOpen, setIsNewDropdownOpen] = useState(false);
    const [isGoodDropdownOpen, setIsGoodDropdownOpen] = useState(false);

    // Map & Space State
    const [spaces, setSpaces] = useState([]);
    const [centerMap, setCenterMap] = useState([14.5995, 120.9842]); // Default Manila
    const [isFormVisible, setIsFormVisible] = useState(false);

    // New space form
    const [newSpace, setNewSpace] = useState({
        space_name: "New Building Area",
        center_lat: null,
        center_lng: null,
        length_m: 10,
        width_m: 10
    });

    const totalAreaSqm = (newSpace.length_m || 0) * (newSpace.width_m || 0);

    // ── Phase 2: Building Inventory State ────────────────────────────────────
    const [hasNewlyBuilt, setHasNewlyBuilt] = useState(null);
    const [newlyBuiltBuildings, setNewlyBuiltBuildings] = useState([]);
    const [showNewBuildingModal, setShowNewBuildingModal] = useState(false);
    
    const currentYear = new Date().getFullYear();
    const [newBuildingFormData, setNewBuildingFormData] = useState({
        building_name: "",
        category: "Academic Building",
        storey: 1,
        classroom: 1,
        room_length: 9,
        room_width: 7,
        year_completed: currentYear,
        remarks: ""
    });

    const [hasGoodCondition, setHasGoodCondition] = useState(null);
    const [goodConditionBuildings, setGoodConditionBuildings] = useState([]);
    const [showGoodBuildingModal, setShowGoodBuildingModal] = useState(false);
    
    const [goodBuildingFormData, setGoodBuildingFormData] = useState({
        building_name: "",
        category: "Academic Building",
        storey: 1,
        classroom: 1,
        room_length: 9,
        room_width: 7,
        year_completed: currentYear,
        remarks: ""
    });

    const REPAIR_CATEGORIES = [
        'Roofing', 'Purlins', 'Trusses', 'Ceiling (Exterior)', 'Ceiling (Interior)', 
        'Wall (Exterior)', 'Partition', 'Door', 'Windows', 'Flooring', 'Beams / Columns'
    ];

    const [hasRepair, setHasRepair] = useState(null);
    const [repairAssessments, setRepairAssessments] = useState([]);
    const [showRepairModal, setShowRepairModal] = useState(false);
    
    const [repairRoomFormData, setRepairRoomFormData] = useState({
        building_name: "",
        room_name: "",
        room_length: 9,
        room_width: 7
    });

    const [repairItemsState, setRepairItemsState] = useState({});

    const [hasDemolition, setHasDemolition] = useState(null);
    const [demolitionRecords, setDemolitionRecords] = useState([]);
    const [showDemolitionModal, setShowDemolitionModal] = useState(false);
    
    const [demolitionFormData, setDemolitionFormData] = useState({
        building_name: "",
        room_length: 9,
        room_width: 7,
        age: false,
        safety: false,
        calamity: false,
        upgrade: false
    });

    const [editingNewBuildingId, setEditingNewBuildingId] = useState(null);
    const [editingGoodBuildingId, setEditingGoodBuildingId] = useState(null);
    const [editingRepairRoomId, setEditingRepairRoomId] = useState(null);
    const [editingDemolitionId, setEditingDemolitionId] = useState(null);

    const years = Array.from({ length: currentYear - 1950 + 1 }, (_, i) => currentYear - i);

    // ── Data Fetching ─────────────────────────────────────────────────────
    const [isReadOnly, setIsReadOnly] = useState(false);

    useEffect(() => {
        const init = async () => {
            const storedId = localStorage.getItem("schoolId");
            if (!storedId) return;
            setSchoolId(storedId);

            try {
                // Fetch school profile to get latitude and longitude for map center
                const resProfile = await fetch(`/api/ph_schools/${storedId}`);
                if (resProfile.ok) {
                    const profile = await resProfile.json();
                    if (profile.exists && profile.data) {
                        setSchoolData(profile.data);
                        if (profile.data.latitude && profile.data.longitude) {
                            setCenterMap([parseFloat(profile.data.latitude), parseFloat(profile.data.longitude)]);
                        }
                    }
                }

                // Fetch existing spaces
                fetchSpaces(storedId);

                // Prefetch building types in background
                fetchBuildingTypes();

                // Fetch Phase 2 Master Data
                fetchMasterData(storedId);
            } catch (e) {
                console.warn("Could not fetch Unit 10 data", e);
            }
        };
        init();
    }, []);

    const fetchMasterData = async (id) => {
        try {
            const res = await fetch(`/api/ph_schools/unit10/${id}/master`);
            if (res.ok) {
                const json = await res.json();
                if (json.success && json.data) {
                    const { inventory, repairs, demolitions, isCompleted } = json.data;
                    
                    // Filter Inventory
                    const newlyBuilt = inventory.filter(i => i.status === 'Newly Built');
                    const goodCondition = inventory.filter(i => i.status === 'Good Condition');
                    setNewlyBuiltBuildings(newlyBuilt);
                    setGoodConditionBuildings(goodCondition);
                    if (newlyBuilt.length > 0) setHasNewlyBuilt(true);
                    if (goodCondition.length > 0) setHasGoodCondition(true);

                    // Reconstruct Repairs for display/submission (repairAssessments)
                    const assessments = repairs.map(r => ({
                        id: r.id,
                        roomId: r.building_name + '-' + r.room_name,
                        building_name: r.building_name,
                        room_name: r.room_name,
                        item: r.item_name,
                        condition: r.condition,
                        damage_ratio: r.damage_ratio,
                        recommend_action: r.recommended_action,
                        demo_justification: r.demo_justification,
                        remarks: r.remarks
                    }));
                    setRepairAssessments(assessments);
                    if (assessments.length > 0) setHasRepair(true);

                    // Demolitions
                    setDemolitionRecords(demolitions);
                    if (demolitions.length > 0) setHasDemolition(true);

                    // Set ReadOnly based on completion
                    setIsReadOnly(isCompleted);
                }
            }
        } catch (e) {
            console.warn("Error fetching master data:", e);
        }
    };

    const fetchBuildingTypes = async () => {
        try {
            const res = await fetch('/api/reference/building-types');
            if (res.ok) {
                const data = await res.json();
                if (Array.isArray(data) && data.length > 0) {
                    setBuildingTypes(data);
                    localStorage.setItem("nsbi_building_types", JSON.stringify(data));
                }
            }
        } catch (e) {
            console.warn("Could not fetch building types", e);
        }
    };

    const fetchSpaces = async (id) => {
        try {
            const res = await fetch(`/api/ph_schools/unit10/${id}/spaces`);
            if (res.ok) {
                const data = await res.json();
                if (data.success) {
                    setSpaces(data.spaces);
                }
            }
        } catch (e) {
            console.warn("Error fetching spaces:", e);
        }
    };

    // ── Map Click Event Handler ───────────────────────────────────────────
    const MapClickHandler = () => {
        useMapEvents({
            click(e) {
                if (isFormVisible) {
                    setNewSpace(prev => ({
                        ...prev,
                        center_lat: e.latlng.lat,
                        center_lng: e.latlng.lng
                    }));
                }
            },
        });
        return null;
    };

    // ── Calculation Utilities ──────────────────────────────────────────────
    const calculateBounds = (lat, lng, lengthM, widthM) => {
        if (!lat || !lng || !lengthM || !widthM) return null;
        
        // 1 degree lat = ~111.32 km
        const latDiff = (lengthM / 2) / 111320;
        // 1 degree lng = ~111.32 km * cos(lat)
        const lngDiff = (widthM / 2) / (111320 * Math.cos(lat * Math.PI / 180));
        
        return [
            [lat - latDiff, lng - lngDiff], // South-West
            [lat + latDiff, lng + lngDiff]  // North-East
        ];
    };

    // ── Saving / Deleting ──────────────────────────────────────────────────
    const handleSaveSpace = async () => {
        if (!newSpace.center_lat || !newSpace.center_lng) {
            alert("Please tap on the map to place the center pin.");
            return;
        }

        try {
            setLoading(true);
            const payload = {
                ...newSpace,
                total_area_sqm: totalAreaSqm,
                iern: schoolData?.iern || null,
            };

            const res = await fetch(`/api/ph_schools/unit10/${schoolId}/spaces`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            if (!res.ok) throw new Error("Failed to save space");

            // Update Progress locally if this is the first interaction that completes unit 10
            const stored = localStorage.getItem('quest_progress');
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(9)) {
                progress.completedUnits.push(9); // Actually Unit 10 is index 10, wait...
                // The dashboard mapped Unit 10 ID to locked array of 9. Let's just update as needed.
                if (!progress.completedUnits.includes(10)) progress.completedUnits.push(10);
                progress.xp += 300;
                localStorage.setItem('quest_progress', JSON.stringify(progress));
            }

            await fetchSpaces(schoolId);
            setIsFormVisible(false);
            setNewSpace({
                space_name: "New Building Area",
                center_lat: null, center_lng: null,
                length_m: 10, width_m: 10
            });
        } catch (err) {
            console.error("Submission failed", err);
            alert("Failed to save space.");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (spaceId) => {
        if (!window.confirm("Delete this space?")) return;
        try {
            const res = await fetch(`/api/ph_schools/unit10/spaces/${spaceId}`, { method: "DELETE" });
            if (res.ok) {
                setSpaces(spaces.filter(s => s.id !== spaceId));
            }
        } catch (e) {
            console.error(e);
        }
    };

    // ── Phase 2 Handlers ──────────────────────────────────────────────────
    const handleSaveNewBuilding = () => {
        if (!newBuildingFormData.building_name) {
            alert("Please enter a building name.");
            return;
        }

        const newEntry = {
            ...newBuildingFormData,
            id: editingNewBuildingId || Date.now().toString(), // local id for the list
            status: 'Newly Built' // Hardcoded status as requested
        };

        if (editingNewBuildingId) {
            setNewlyBuiltBuildings(newlyBuiltBuildings.map(b => b.id === editingNewBuildingId ? newEntry : b));
        } else {
            setNewlyBuiltBuildings([...newlyBuiltBuildings, newEntry]);
        }

        setShowNewBuildingModal(false);
        setEditingNewBuildingId(null);
        setNewBuildingFormData({
            building_name: "", category: "Academic Building", storey: 1, classroom: 1,
            room_length: 9, room_width: 7, year_completed: currentYear, remarks: ""
        });
    };

    const handleEditNewBuilding = (building) => {
        setNewBuildingFormData({
            building_name: building.building_name,
            category: building.category,
            storey: building.storey,
            classroom: building.classroom,
            room_length: building.room_length,
            room_width: building.room_width,
            year_completed: building.year_completed,
            remarks: building.remarks || ""
        });
        setEditingNewBuildingId(building.id);
        setShowNewBuildingModal(true);
    };

    const handleDeleteNewBuilding = (id) => {
        setNewlyBuiltBuildings(newlyBuiltBuildings.filter(b => b.id !== id));
    };

    const handleSaveGoodBuilding = () => {
        if (!goodBuildingFormData.building_name) {
            alert("Please enter a building name.");
            return;
        }

        const newEntry = {
            ...goodBuildingFormData,
            id: editingGoodBuildingId || Date.now().toString(),
            status: 'Good Condition' // Hardcoded status
        };

        if (editingGoodBuildingId) {
            setGoodConditionBuildings(goodConditionBuildings.map(b => b.id === editingGoodBuildingId ? newEntry : b));
        } else {
            setGoodConditionBuildings([...goodConditionBuildings, newEntry]);
        }
        
        setShowGoodBuildingModal(false);
        setEditingGoodBuildingId(null);
        setGoodBuildingFormData({
            building_name: "", category: "Academic Building", storey: 1, classroom: 1,
            room_length: 9, room_width: 7, year_completed: currentYear, remarks: ""
        });
    };

    const handleEditGoodBuilding = (building) => {
        setGoodBuildingFormData({
            building_name: building.building_name,
            category: building.category,
            storey: building.storey,
            classroom: building.classroom,
            room_length: building.room_length,
            room_width: building.room_width,
            year_completed: building.year_completed,
            remarks: building.remarks || ""
        });
        setEditingGoodBuildingId(building.id);
        setShowGoodBuildingModal(true);
    };

    const handleDeleteGoodBuilding = (id) => {
        setGoodConditionBuildings(goodConditionBuildings.filter(b => b.id !== id));
    };

    const handleToggleRepairItem = (category) => {
        setRepairItemsState(prev => {
            if (prev[category]) {
                const newState = { ...prev };
                delete newState[category];
                return newState;
            } else {
                return {
                    ...prev,
                    [category]: {
                        made_of: "",
                        condition: "Good",
                        damage_ratio: 0,
                        recommend_action: "Routine Repair",
                        demo_justification: "",
                        remarks: ""
                    }
                };
            }
        });
    };

    const handleUpdateRepairItem = (category, field, value) => {
        setRepairItemsState(prev => ({
            ...prev,
            [category]: {
                ...prev[category],
                [field]: value
            }
        }));
    };

    const handleSaveRepairRoom = () => {
        if (!repairRoomFormData.building_name || !repairRoomFormData.room_name) {
            alert("Please provide building and room names.");
            return;
        }

        const selectedCategories = Object.keys(repairItemsState);
        if (selectedCategories.length === 0) {
            alert("Please select at least one item to assess.");
            return;
        }

        // Flattening Logic: one object per checked category
        const roomId = editingRepairRoomId || Date.now().toString(); // unique ID for the whole room group
        
        const newAssessments = selectedCategories.map(category => ({
            id: roomId + "-" + category.replace(/\s/g, ''),
            roomId: roomId,
            building_name: repairRoomFormData.building_name,
            room_name: repairRoomFormData.room_name,
            room_length: repairRoomFormData.room_length,
            room_width: repairRoomFormData.room_width,
            item: category,
            ...repairItemsState[category]
        }));

        if (editingRepairRoomId) {
            // Remove old items for this room, then append the new ones
            setRepairAssessments(prev => [...prev.filter(a => a.roomId !== editingRepairRoomId), ...newAssessments]);
        } else {
            setRepairAssessments(prev => [...prev, ...newAssessments]);
        }
        
        setShowRepairModal(false);
        setEditingRepairRoomId(null);
        setRepairRoomFormData({
            building_name: "",
            room_name: "",
            room_length: 9,
            room_width: 7
        });
        setRepairItemsState({});
    };

    const handleEditRepairRoom = (roomGroup) => {
        setRepairRoomFormData({
            building_name: roomGroup.building_name,
            room_name: roomGroup.room_name,
            room_length: roomGroup.room_length,
            room_width: roomGroup.room_width
        });
        
        const reconstructedState = {};
        roomGroup.items.forEach(itm => {
            reconstructedState[itm.item] = {
                made_of: itm.made_of || "",
                condition: itm.condition,
                damage_ratio: itm.damage_ratio || 0,
                recommend_action: itm.recommend_action || "Routine Repair",
                demo_justification: itm.demo_justification || "",
                remarks: itm.remarks || ""
            };
        });
        setRepairItemsState(reconstructedState);
        setEditingRepairRoomId(roomGroup.roomId);
        setShowRepairModal(true);
    };

    const handleDeleteRepairRoom = (roomId) => {
        setRepairAssessments(prev => prev.filter(a => a.roomId !== roomId));
    };

    // Helper to group assessments by room for display
    const groupedRepairs = repairAssessments.reduce((acc, curr) => {
        if (!acc[curr.roomId]) {
            acc[curr.roomId] = {
                roomId: curr.roomId,
                building_name: curr.building_name,
                room_name: curr.room_name,
                room_length: curr.room_length,
                room_width: curr.room_width,
                items: []
            };
        }
        acc[curr.roomId].items.push(curr);
        return acc;
    }, {});
    const groupedRepairsArray = Object.values(groupedRepairs);

    const handleToggleDemolitionReason = (reason) => {
        setDemolitionFormData(prev => ({ ...prev, [reason]: !prev[reason] }));
    };

    const handleSaveDemolition = () => {
        if (!demolitionFormData.building_name) {
            alert("Please provide the building name.");
            return;
        }

        const hasReason = demolitionFormData.age || demolitionFormData.safety || demolitionFormData.calamity || demolitionFormData.upgrade;
        if (!hasReason) {
            alert("Please select at least one justification for demolition.");
            return;
        }

        const newRecord = {
            ...demolitionFormData,
            id: editingDemolitionId || Date.now().toString()
        };

        if (editingDemolitionId) {
            setDemolitionRecords(prev => prev.map(r => r.id === editingDemolitionId ? newRecord : r));
        } else {
            setDemolitionRecords(prev => [...prev, newRecord]);
        }
        
        setShowDemolitionModal(false);
        setEditingDemolitionId(null);
        setDemolitionFormData({
            building_name: "",
            room_length: 9,
            room_width: 7,
            age: false,
            safety: false,
            calamity: false,
            upgrade: false
        });
    };

    const handleEditDemolition = (demoRecord) => {
        setDemolitionFormData({
            building_name: demoRecord.building_name,
            room_length: demoRecord.room_length || 9,
            room_width: demoRecord.room_width || 7,
            age: demoRecord.age || false,
            safety: demoRecord.safety || false,
            calamity: demoRecord.calamity || false,
            upgrade: demoRecord.upgrade || false
        });
        setEditingDemolitionId(demoRecord.id);
        setShowDemolitionModal(true);
    };

    const handleDeleteDemolition = (id) => {
        setDemolitionRecords(prev => prev.filter(r => r.id !== id));
    };

    const handleMasterSubmit = async () => {
        const confirmSubmit = window.confirm("Are you sure you want to finalize and save this entire Unit 10 Audit?");
        if (!confirmSubmit) return;

        try {
            setLoading(true);
            
            // Phase 2 Step 1 & 2: Building Inventory
            const inventoryPayload = [...newlyBuiltBuildings, ...goodConditionBuildings];
            
            // Phase 2 Step 3: Repair Assessments
            const repairPayload = [...groupedRepairsArray];
            
            // Phase 2 Step 4: Demolitions
            const demoPayload = [...demolitionRecords];

            console.log("--- FINAL PAYLOAD TO BACKEND ---");
            console.log("Inventory:", inventoryPayload);
            console.log("Repairs:", repairPayload);
            console.log("Demolitions:", demoPayload);

            console.log("--- EXACT RAW PAYLOAD ---");
            console.log(JSON.stringify({ inventory: inventoryPayload, repairs: repairPayload, demolitions: demoPayload }, null, 2));

            // Send all data to the backend master endpoint
            const masterRes = await fetch(`/api/ph_schools/unit10/${schoolId}/master`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    inventory: inventoryPayload,
                    repairs: repairPayload,
                    demolitions: demoPayload
                })
            });

            if (!masterRes.ok) {
                const errorData = await masterRes.json().catch(() => null);
                console.error("Master Submission Error Response:", errorData);
                throw new Error("Failed to submit Unit 10 master payload.");
            }
            
            // Force Unit 10 completion XP if not done
            const stored = localStorage.getItem('quest_progress');
            let progress = stored ? JSON.parse(stored) : { completedUnits: [], xp: 0 };
            if (!progress.completedUnits.includes(10)) {
                progress.completedUnits.push(10);
                progress.xp += 500;
                localStorage.setItem('quest_progress', JSON.stringify(progress));
            }
            navigate("/modular-dashboard");

        } catch (err) {
            console.error("Master submission failed", err);
            alert("Failed to submit master payload.");
        } finally {
            setLoading(false);
        }
    };

    const handleBack = () => {
        navigate("/modular-dashboard");
    };

    // ── Summary Dashboard Component ─────────────────────────────────────────
    const SummaryDashboard = () => {
        const totalClassrooms = 
            newlyBuiltBuildings.reduce((sum, b) => sum + (parseInt(b.classroom) || 0), 0) +
            goodConditionBuildings.reduce((sum, b) => sum + (parseInt(b.classroom) || 0), 0);

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden pb-20">
                <header className="sticky top-0 z-50 bg-white shadow-sm px-4 py-3">
                    <div className="max-w-3xl mx-auto flex items-center justify-between">
                        <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
                            <FiChevronLeft className="w-6 h-6" />
                        </button>
                        <div className="flex flex-col items-center">
                            <h1 className="font-bold text-gray-800 text-xl">Unit 10 Summary</h1>
                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Audit Completed ✅</span>
                        </div>
                        <div className="w-10"></div>
                    </div>
                </header>

                <main className="flex-1 w-full max-w-3xl mx-auto p-4 lg:p-6 flex flex-col space-y-8 pb-32">
                    
                    {/* Header */}
                    <div className="text-center mb-6 mt-8">
                        <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            className="w-20 h-20 bg-gradient-to-br from-indigo-500 to-emerald-500 rounded-[2rem] mx-auto mb-6 flex items-center justify-center shadow-xl shadow-indigo-200"
                        >
                            <span className="text-4xl">🏢</span>
                        </motion.div>
                        <span className="inline-block px-4 py-1.5 rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] mb-3 shadow-sm">
                            Unit 10 • Physical Facilities
                        </span>
                        <h1 className="text-4xl font-black text-slate-800 leading-tight">Architecture Summary</h1>
                        <p className="text-slate-500 font-medium mt-2">Verified records as of {new Date().toLocaleDateString()}</p>
                    </div>

                    {/* 1. Top-Level Metric Cards */}
                    <div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black text-emerald-600 mb-1">{spaces.length}</span>
                                <span className="text-sm font-bold text-gray-500 leading-tight">Buildable<br/>Spaces</span>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black text-blue-600 mb-1">{totalClassrooms}</span>
                                <span className="text-sm font-bold text-gray-500 leading-tight">Total Usable<br/>Classrooms</span>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black text-amber-500 mb-1">{groupedRepairsArray.length}</span>
                                <span className="text-sm font-bold text-gray-500 leading-tight">Rooms Needing<br/>Repair</span>
                            </div>
                            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col items-center justify-center text-center">
                                <span className="text-4xl font-black text-rose-600 mb-1">{demolitionRecords.length}</span>
                                <span className="text-sm font-bold text-gray-500 leading-tight">Buildings to<br/>Demolish</span>
                            </div>
                        </div>
                    </div>

                    {/* 2. Phase 1: Buildable Space Map View */}
                    <div className="bg-amber-50 p-6 rounded-[2rem] border-2 border-amber-100 relative overflow-hidden">
                        <h3 className="text-xl font-black text-amber-900 mb-4 flex items-center gap-2"><FiMapPin /> Phase 1: Buildable Spaces</h3>
                        <div className="h-[250px] rounded-2xl overflow-hidden shadow-inner mb-4 bg-white border border-amber-200">
                            {centerMap ? (
                                <MapContainer center={centerMap} zoom={18} scrollWheelZoom={false} dragging={false} doubleClickZoom={false} zoomControl={false} className="h-full w-full">
                                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                                    <RecenterMap center={centerMap} />
                                    {spaces.map((s, idx) => {
                                        const bounds = calculateBounds(parseFloat(s.center_lat), parseFloat(s.center_lng), parseFloat(s.length_m) || 0, parseFloat(s.width_m) || 0);
                                        return bounds ? (
                                            <Rectangle key={'ro-' + idx} bounds={bounds} pathOptions={{ color: 'blue', weight: 3, fillOpacity: 0.2 }} />
                                        ) : null;
                                    })}
                                </MapContainer>
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400 font-medium">Map unvailable</div>
                            )}
                        </div>
                        <div className="space-y-3">
                            {spaces.map(s => (
                                <div key={s.id} className="bg-white/80 backdrop-blur-sm p-4 rounded-xl shadow-sm border border-amber-100/50 flex justify-between items-center">
                                    <div>
                                        <h4 className="font-bold text-amber-900">{s.space_name}</h4>
                                        <p className="text-xs text-amber-700 font-medium">{s.length_m}m &times; {s.width_m}m</p>
                                    </div>
                                    <span className="text-amber-600 font-black bg-amber-100 px-3 py-1 rounded-lg">{parseFloat(s.total_area_sqm).toFixed(1)} m&sup2;</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* 3. Phase 2: Inventory Breakdown */}
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800">Phase 2: Inventory</h3>
                        
                        {/* Newly Built */}
                        <div className="bg-emerald-50 p-6 rounded-[2rem] border-2 border-emerald-100">
                            <h4 className="font-black text-lg text-emerald-800 mb-4">✨ Newly Built ({newlyBuiltBuildings.length})</h4>
                            <div className="space-y-3">
                                {newlyBuiltBuildings.map(b => (
                                    <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-emerald-100">
                                        <h5 className="font-black text-gray-800 text-lg">{b.building_name}</h5>
                                        <div className="inline-flex bg-emerald-100 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full mt-2 mb-3">
                                            {b.storey} Storey(s) | {b.classroom} Classrooms
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                                            <p className="font-bold text-gray-600">Standard Room Size: <span className="text-gray-800">{b.room_length}m &times; {b.room_width}m</span></p>
                                            <p className="text-gray-500 mt-1">Area per room: {(parseFloat(b.room_length) * parseFloat(b.room_width)).toFixed(1)} m&sup2;</p>
                                        </div>
                                    </div>
                                ))}
                                {newlyBuiltBuildings.length === 0 && <p className="text-emerald-600/60 font-medium italic text-sm text-center py-2">No newly built structures recorded.</p>}
                            </div>
                        </div>

                        {/* Good Condition */}
                        <div className="bg-blue-50 p-6 rounded-[2rem] border-2 border-blue-100">
                            <h4 className="font-black text-lg text-blue-800 mb-4">✅ Good Condition ({goodConditionBuildings.length})</h4>
                            <div className="space-y-3">
                                {goodConditionBuildings.map(b => (
                                    <div key={b.id} className="bg-white p-4 rounded-2xl shadow-sm border border-blue-100">
                                        <h5 className="font-black text-gray-800 text-lg">{b.building_name}</h5>
                                        <div className="inline-flex bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full mt-2 mb-3">
                                            {b.storey} Storey(s) | {b.classroom} Classrooms
                                        </div>
                                        <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-sm">
                                            <p className="font-bold text-gray-600">Standard Room Size: <span className="text-gray-800">{b.room_length}m &times; {b.room_width}m</span></p>
                                            <p className="text-gray-500 mt-1">Area per room: {(parseFloat(b.room_length) * parseFloat(b.room_width)).toFixed(1)} m&sup2;</p>
                                        </div>
                                    </div>
                                ))}
                                {goodConditionBuildings.length === 0 && <p className="text-blue-600/60 font-medium italic text-sm text-center py-2">No good condition structures recorded.</p>}
                            </div>
                        </div>
                    </div>

                    {/* 4. Action Items */}
                    <div className="space-y-6">
                        <h3 className="text-2xl font-black text-gray-800">Action Items</h3>
                        
                        {/* Repairs */}
                        <div className="bg-orange-50 p-6 rounded-[2rem] border-2 border-orange-100">
                            <h4 className="font-black text-lg text-orange-800 mb-4">🛠️ Repair Assessments ({groupedRepairsArray.length} rooms)</h4>
                            <div className="space-y-3">
                                {groupedRepairsArray.map(r => (
                                    <div key={r.roomId} className="bg-white p-4 rounded-2xl shadow-sm border border-orange-100">
                                        <h5 className="font-black text-gray-800">{r.building_name} &bull; <span className="text-orange-600">{r.room_name}</span></h5>
                                        <p className="text-xs font-bold text-gray-400 mt-1 mb-3">Room Dimensions: {r.room_length}m &times; {r.room_width}m</p>
                                        <div className="bg-orange-50/50 p-3 rounded-xl text-sm border border-orange-50">
                                            <span className="font-bold text-orange-800 block mb-1">Damaged Items:</span>
                                            <p className="text-orange-700/80 leading-relaxed font-medium">
                                                {r.items.map(i => `${i.item} (${i.recommend_action === 'Routine Repair' ? i.damage_ratio + '%' : i.recommend_action})`).join(', ')}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                                {groupedRepairsArray.length === 0 && <p className="text-orange-600/60 font-medium italic text-sm text-center py-2">No repairs needed.</p>}
                            </div>
                        </div>

                        {/* Demolitions */}
                        <div className="bg-rose-50 p-6 rounded-[2rem] border-2 border-rose-100">
                            <h4 className="font-black text-lg text-rose-800 mb-4">🚜 Slated for Demolition ({demolitionRecords.length})</h4>
                            <div className="space-y-3">
                                {demolitionRecords.map(d => (
                                    <div key={d.id} className="bg-white p-4 rounded-2xl shadow-sm border border-rose-100">
                                        <h5 className="font-black text-gray-800 text-lg mb-1">{d.building_name}</h5>
                                        <p className="text-sm font-bold text-gray-500 mb-3">Losing {(parseFloat(d.room_length) * parseFloat(d.room_width)).toFixed(1)} m&sup2; footprint</p>
                                        <div className="flex flex-wrap gap-2">
                                            {d.age && <span className="bg-rose-100 text-rose-800 text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-lg">Age/Dilapidation</span>}
                                            {d.safety && <span className="bg-rose-100 text-rose-800 text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-lg">Safety Hazard</span>}
                                            {d.calamity && <span className="bg-rose-100 text-rose-800 text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-lg">Calamity Damage</span>}
                                            {d.upgrade && <span className="bg-rose-100 text-rose-800 text-[10px] uppercase tracking-wider font-black px-2 py-1 rounded-lg">Site Upgrade</span>}
                                        </div>
                                    </div>
                                ))}
                                {demolitionRecords.length === 0 && <p className="text-rose-600/60 font-medium italic text-sm text-center py-2">No demolitions recorded.</p>}
                            </div>
                        </div>
                    </div>

                    {/* 5. Unlock Action */}
                    <div className="pt-6 pb-4">
                        <motion.div 
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.3 }}
                            className="mt-6"
                        >
                            <button 
                                onClick={() => setIsReadOnly(false)}
                                className="group relative w-full py-6 rounded-[2rem] bg-white border-4 border-indigo-100 text-indigo-700 font-black text-lg shadow-xl shadow-indigo-100/50 hover:border-indigo-200 hover:bg-indigo-50 transition-all duration-300 overflow-hidden flex items-center justify-center gap-3"
                            >
                                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/5 to-indigo-500/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                                <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                    <FiUnlock className="w-5 h-5 text-indigo-700" />
                                </div>
                                <span>Unlock to Edit Architecture</span>
                            </button>
                        </motion.div>
                        <p className="text-center text-xs font-bold text-gray-400 mt-4">Unlocking allows you to add or modify records in this specific audit unit.</p>
                    </div>

                </main>
            </div>
        );
    };

    // ── Render Wizard ─────────────────────────────────────────────────────
    if (isReadOnly) {
        return <SummaryDashboard />;
    }

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col font-sans overflow-x-hidden pb-10">
            {/* Header / Nav */}
            <header className="sticky top-0 z-50 bg-white shadow-sm px-4 py-3">
                <div className="max-w-3xl mx-auto flex items-center justify-between">
                    <button onClick={handleBack} className="p-2 rounded-full hover:bg-gray-100 text-gray-400">
                        <FiChevronLeft className="w-6 h-6" />
                    </button>
                    <div className="flex flex-col items-center">
                        <h1 className="font-bold text-gray-800 text-xl">Unit 10 Audit</h1>
                        <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Step {currentPage} of 5</span>
                    </div>
                    <div className="w-10"></div>
                </div>
                {/* Visual Progress Bar */}
                <div className="max-w-3xl mx-auto mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden flex gap-1">
                    {[1, 2, 3, 4, 5].map(step => (
                        <div 
                            key={step} 
                            className={`flex-1 h-full transition-all duration-500 ${currentPage >= step ? "bg-indigo-500" : "bg-gray-200"}`}
                        />
                    ))}
                </div>
            </header>

            <main className="flex-1 w-full max-w-3xl mx-auto p-4 lg:p-6 flex flex-col pt-8">
                
                {currentPage === 1 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-2">
                            Visual Multi-Space Builder 🏗️
                        </h2>
                        <p className="text-gray-500 mb-6 font-medium">Draw and record buildable spaces for the school campus footprint.</p>

                        {/* Map Display area */}
                        <div className="bg-white p-3 rounded-2xl shadow-sm border border-gray-200 mb-6 relative overflow-hidden z-0">
                            <div className="h-[400px] rounded-xl overflow-hidden shadow-inner">
                                {centerMap && (
                                    <MapContainer center={centerMap} zoom={18} scrollWheelZoom={true} className="h-full w-full">
                                        <TileLayer
                                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                            maxZoom={20}
                                        />
                                        <MapClickHandler />
                                        <RecenterMap center={centerMap} />

                                        {/* Render existing spaces */}
                                        {spaces.map((s, idx) => {
                                            const b = calculateBounds(parseFloat(s.center_lat), parseFloat(s.center_lng), parseFloat(s.length_m), parseFloat(s.width_m));
                                            if (!b) return null;
                                            return (
                                                <React.Fragment key={idx}>
                                                    <Rectangle bounds={b} pathOptions={{ color: 'blue', weight: 2, fillOpacity: 0.2 }} />
                                                    <Marker position={[s.center_lat, s.center_lng]}>
                                                        <Popup>{s.space_name} ({s.total_area_sqm} sqm)</Popup>
                                                    </Marker>
                                                </React.Fragment>
                                            );
                                        })}

                                        {/* Render new drawing space */}
                                        {newSpace.center_lat && newSpace.center_lng && isFormVisible && (
                                            <>
                                                <Rectangle 
                                                    bounds={calculateBounds(newSpace.center_lat, newSpace.center_lng, newSpace.length_m || 0, newSpace.width_m || 0)} 
                                                    pathOptions={{ color: 'emerald', weight: 4, fillOpacity: 0.4 }} 
                                                />
                                                <Marker position={[newSpace.center_lat, newSpace.center_lng]}>
                                                    <Popup>Target Location</Popup>
                                                </Marker>
                                            </>
                                        )}
                                    </MapContainer>
                                )}
                            </div>
                        </div>

                        {/* Form or Add Button */}
                        <AnimatePresence mode="wait">
                            {!isFormVisible ? (
                                <motion.button 
                                    key="addbtn"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    onClick={() => setIsFormVisible(true)}
                                    className="bg-emerald-500 w-full py-4 rounded-2xl text-white font-black text-lg border-b-[6px] border-emerald-700 active:border-b-0 active:translate-y-[6px] shadow-lg flex justify-center items-center gap-2 mb-8 transition-all hover:bg-emerald-400"
                                >
                                    <FiPlus className="w-6 h-6"/> Add New Space
                                </motion.button>
                            ) : (
                                <motion.div 
                                    key="form"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: -20 }}
                                    className="bg-white p-5 rounded-3xl shadow-lg border border-gray-100 mb-8"
                                >
                                    <div className="flex justify-between items-center mb-4">
                                        <h3 className="font-black text-xl text-gray-800">New Space Details</h3>
                                        <button onClick={() => setIsFormVisible(false)} className="text-gray-400 hover:text-gray-700"><FiX className="w-6 h-6"/></button>
                                    </div>

                                    <p className="text-sm font-bold text-amber-600 mb-4 bg-amber-50 p-3 rounded-lg flex items-center gap-2">
                                        <FiMapPin className="shrink-0" />
                                        {newSpace.center_lat ? "Pin placed! Adjust size." : "Tap on the map above to select the center location!"}
                                    </p>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="text-sm font-bold text-gray-500 ml-2">Space Name / ID</label>
                                            <input type="text" value={newSpace.space_name} onChange={(e) => setNewSpace({...newSpace, space_name: e.target.value})}
                                                className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-emerald-500 transition-all" />
                                        </div>
                                        
                                        <div className="flex gap-4">
                                            <div className="flex-1">
                                                <label className="text-sm font-bold text-gray-500 ml-2">Length (meters)</label>
                                                <input type="number" value={newSpace.length_m} onChange={(e) => setNewSpace({...newSpace, length_m: parseFloat(e.target.value) || 0})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-emerald-500 transition-all text-center" />
                                            </div>
                                            <div className="flex-1">
                                                <label className="text-sm font-bold text-gray-500 ml-2">Width (meters)</label>
                                                <input type="number" value={newSpace.width_m} onChange={(e) => setNewSpace({...newSpace, width_m: parseFloat(e.target.value) || 0})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-emerald-500 transition-all text-center" />
                                            </div>
                                        </div>

                                        <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 flex justify-between items-center mt-4">
                                            <span className="font-bold text-emerald-800">Computed Area:</span>
                                            <span className="text-3xl font-black text-emerald-600">{totalAreaSqm.toFixed(2)} m&sup2;</span>
                                        </div>
                                    </div>

                                    <button onClick={handleSaveSpace} disabled={loading || !newSpace.center_lat}
                                        className="w-full mt-6 py-4 rounded-2xl text-white font-black text-lg bg-indigo-500 border-b-[6px] border-indigo-700 active:border-b-0 active:translate-y-[6px] transition-all disabled:opacity-50 disabled:bg-gray-300 disabled:border-gray-400 shadow-xl shadow-indigo-200/50">
                                        {loading ? "Saving..." : "Save space configuration ✓"}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* List of Saved spaces */}
                        {spaces.length > 0 && (
                            <div className="mt-4">
                                <h3 className="font-black text-xl text-gray-800 mb-4 px-2">Saved Spaces</h3>
                                <div className="space-y-3">
                                    {spaces.map(s => (
                                        <div key={s.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                                            <div>
                                                <h4 className="font-bold text-lg text-gray-800">{s.space_name}</h4>
                                                <p className="text-sm text-gray-500 font-medium">{s.length_m}m &times; {s.width_m}m &nbsp;&bull;&nbsp; <span className="text-emerald-600 font-bold">{parseFloat(s.total_area_sqm).toFixed(2)} m&sup2;</span></p>
                                            </div>
                                            <button onClick={() => handleDelete(s.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors">
                                                <FiTrash2 className="w-5 h-5"/>
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ────────────────────────────────────────────────────────
                    PHASE 2: Building Inventory - Newly Built
                    ──────────────────────────────────────────────────────── */}
                {currentPage === 2 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-2">
                            Building Inventory 🏢
                        </h2>
                        <p className="text-gray-500 mb-6 font-medium">Log the physical structures on your campus.</p>

                        {/* Gatekeeper: Newly Built */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100 mb-8">
                            <h3 className="font-bold text-gray-700 mb-4 px-1 text-lg">Do you have any Newly Built buildings?</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setHasNewlyBuilt(true)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasNewlyBuilt === true ? "bg-emerald-100 border-emerald-500 text-emerald-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiCheck className="w-6 h-6" /> Yes
                                </button>
                                <button onClick={() => setHasNewlyBuilt(false)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasNewlyBuilt === false ? "bg-rose-100 border-rose-500 text-rose-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiX className="w-6 h-6" /> No
                                </button>
                            </div>
                        </div>

                        {/* Inventory Area (If Yes) */}
                        {hasNewlyBuilt && (
                            <div className="space-y-6">
                                
                                {/* Card List */}
                                {newlyBuiltBuildings.length > 0 && (
                                    <div className="space-y-4">
                                        {newlyBuiltBuildings.map(b => (
                                            <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-gray-100 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-black text-xl text-gray-800">{b.building_name}</h4>
                                                    <p className="text-sm font-bold text-gray-500 mt-1">{b.category} &bull; {b.storey} Storey &bull; {b.classroom} Rooms</p>
                                                    <div className="mt-3 inline-flex bg-indigo-50 border border-indigo-100 px-3 py-1.5 rounded-xl">
                                                        <span className="text-xs font-bold text-indigo-700">
                                                            Standard Room Area: {b.room_length * b.room_width} m&sup2;
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {true && (
                                                        <>
                                                            <button onClick={() => handleEditNewBuilding(b)} className="p-3 bg-indigo-50 text-indigo-500 rounded-xl hover:bg-indigo-100 transition-colors">
                                                                <FiEdit2 className="w-5 h-5"/>
                                                            </button>
                                                            <button onClick={() => handleDeleteNewBuilding(b.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors">
                                                                <FiTrash2 className="w-5 h-5"/>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Button */}
                                {!showNewBuildingModal ? (
                                    <motion.button 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setShowNewBuildingModal(true)}
                                        className="bg-emerald-50 w-full py-4 rounded-2xl text-emerald-600 font-black text-lg border-2 border-emerald-200 border-dashed hover:bg-emerald-100 hover:border-emerald-300 transition-all flex justify-center items-center gap-2"
                                    >
                                        <FiPlus className="w-6 h-6"/> Add Newly Built Building
                                    </motion.button>
                                ) : showNewBuildingModal ? (
                                    /* Form Modal Area */
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-200"
                                    >
                                        <div className="flex justify-between items-center mb-6 border-b-2 border-gray-50 pb-4">
                                            <h3 className="font-black text-2xl text-gray-800">Newly Built Details</h3>
                                            <button onClick={() => setShowNewBuildingModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full"><FiX className="w-6 h-6"/></button>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Building Name</label>
                                                <input type="text" value={newBuildingFormData.building_name} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, building_name: e.target.value})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all placeholder-gray-300" placeholder="e.g. Marcos Type Bldg" />
                                            </div>
                                            
                                            <div className={`relative ${isNewDropdownOpen ? 'z-50' : 'z-0'}`}>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Building Category</label>
                                                <div className="relative mt-1">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <FiSearch className="text-gray-400 w-5 h-5" />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Search building type..."
                                                        value={isNewDropdownOpen ? newBuildingSearch : newBuildingFormData.category}
                                                        onFocus={() => {
                                                            setIsNewDropdownOpen(true);
                                                            setNewBuildingSearch("");
                                                        }}
                                                        onChange={(e) => {
                                                            setNewBuildingSearch(e.target.value);
                                                            setNewBuildingFormData(prev => ({...prev, category: e.target.value}));
                                                        }}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl pl-11 pr-12 py-4 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder-gray-300 shadow-sm"
                                                    />
                                                    <div 
                                                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-indigo-500"
                                                        onClick={() => setIsNewDropdownOpen(!isNewDropdownOpen)}
                                                    >
                                                        <FiChevronDown className={`w-6 h-6 transition-transform duration-300 ${isNewDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    <AnimatePresence>
                                                        {isNewDropdownOpen && (
                                                            <>
                                                                <motion.div 
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    className="absolute z-[100] w-full mt-2 bg-white border-2 border-gray-100 rounded-3xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden py-2"
                                                                >
                                                                    {(newBuildingSearch ? buildingTypes.filter(t => t.toLowerCase().includes(newBuildingSearch.toLowerCase())) : buildingTypes).map(type => (
                                                                        <button 
                                                                            key={type} 
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setNewBuildingFormData({...newBuildingFormData, category: type});
                                                                                setNewBuildingSearch(type);
                                                                                setIsNewDropdownOpen(false);
                                                                            }}
                                                                            className={`w-full text-left px-6 py-4 font-bold text-gray-700 transition-all border-b border-gray-50 last:border-0 hover:bg-indigo-50 hover:pl-8 flex items-center justify-between ${newBuildingFormData.category === type ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                                                        >
                                                                            <span>{type}</span>
                                                                            {newBuildingFormData.category === type && <FiCheck className="w-5 h-5" />}
                                                                        </button>
                                                                    ))}
                                                                    <div className="px-6 py-8 text-center text-gray-400">
                                                                        {buildingTypes.length === 0 ? (
                                                                            <>
                                                                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                                                <p className="italic font-medium">Fetching building types...</p>
                                                                            </>
                                                                        ) : (newBuildingSearch && buildingTypes.filter(t => t.toLowerCase().includes(newBuildingSearch.toLowerCase())).length === 0) ? (
                                                                            <>
                                                                                <FiSearch className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                                                <p className="italic font-medium">No matching building types found</p>
                                                                            </>
                                                                        ) : null}
                                                                    </div>
                                                                </motion.div>
                                                                <div className="fixed inset-0 z-40" onClick={() => setIsNewDropdownOpen(false)}></div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Storeys</label>
                                                    <input type="number" value={newBuildingFormData.storey} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, storey: parseInt(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all text-center" min="1" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Classrooms</label>
                                                    <input type="number" value={newBuildingFormData.classroom} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, classroom: parseInt(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all text-center" min="1" />
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Length (m)</label>
                                                    <input type="number" value={newBuildingFormData.room_length} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, room_length: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all text-center" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Width (m)</label>
                                                    <input type="number" value={newBuildingFormData.room_width} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, room_width: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all text-center" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Year Completed</label>
                                                <select value={newBuildingFormData.year_completed} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, year_completed: parseInt(e.target.value)})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Remarks</label>
                                                <textarea value={newBuildingFormData.remarks} onChange={(e) => setNewBuildingFormData({...newBuildingFormData, remarks: e.target.value})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 transition-all min-h-[100px]" placeholder="Optional notes..."></textarea>
                                            </div>

                                            <button onClick={handleSaveNewBuilding}
                                                className="w-full mt-4 py-4 rounded-2xl text-white font-black text-lg bg-indigo-500 border-b-[6px] border-indigo-700 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl shadow-indigo-200/50">
                                                Save Building
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ────────────────────────────────────────────────────────
                    PHASE 2: Building Inventory - Good Condition
                    ──────────────────────────────────────────────────────── */}
                {currentPage === 3 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-2">
                            Good Condition Buildings ✅
                        </h2>
                        <p className="text-gray-500 mb-6 font-medium">Log existing structures that are in good physical standing.</p>

                        {/* Gatekeeper: Good Condition */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100 mb-8">
                            <h3 className="font-bold text-gray-700 mb-4 px-1 text-lg">Do you have any buildings in Good Condition?</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setHasGoodCondition(true)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasGoodCondition === true ? "bg-blue-100 border-blue-500 text-blue-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiCheck className="w-6 h-6" /> Yes
                                </button>
                                <button onClick={() => setHasGoodCondition(false)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasGoodCondition === false ? "bg-rose-100 border-rose-500 text-rose-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiX className="w-6 h-6" /> No
                                </button>
                            </div>
                        </div>

                        {/* Inventory Area (If Yes) */}
                        {hasGoodCondition && (
                            <div className="space-y-6">
                                
                                {/* Card List */}
                                {goodConditionBuildings.length > 0 && (
                                    <div className="space-y-4">
                                        {goodConditionBuildings.map(b => (
                                            <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-gray-100 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-black text-xl text-gray-800">{b.building_name}</h4>
                                                    <p className="text-sm font-bold text-gray-500 mt-1">{b.category} &bull; {b.storey} Storey &bull; {b.classroom} Rooms</p>
                                                    <div className="mt-3 inline-flex bg-blue-50 border border-blue-100 px-3 py-1.5 rounded-xl">
                                                        <span className="text-xs font-bold text-blue-700">
                                                            Standard Room Area: {b.room_length * b.room_width} m&sup2;
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {true && (
                                                        <>
                                                            <button onClick={() => handleEditGoodBuilding(b)} className="p-3 bg-blue-50 text-blue-500 rounded-xl hover:bg-blue-100 transition-colors">
                                                                <FiEdit2 className="w-5 h-5"/>
                                                            </button>
                                                            <button onClick={() => handleDeleteGoodBuilding(b.id)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors">
                                                                <FiTrash2 className="w-5 h-5"/>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Button */}
                                {!showGoodBuildingModal ? (
                                    <motion.button 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setShowGoodBuildingModal(true)}
                                        className="bg-blue-50 w-full py-4 rounded-2xl text-blue-600 font-black text-lg border-2 border-blue-200 border-dashed hover:bg-blue-100 hover:border-blue-300 transition-all flex justify-center items-center gap-2"
                                    >
                                        <FiPlus className="w-6 h-6"/> Add Good Condition Building
                                    </motion.button>
                                ) : showGoodBuildingModal ? (
                                    /* Form Modal Area */
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-200"
                                    >
                                        <div className="flex justify-between items-center mb-6 border-b-2 border-gray-50 pb-4">
                                            <h3 className="font-black text-2xl text-gray-800">Good Condition Details</h3>
                                            <button onClick={() => setShowGoodBuildingModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full"><FiX className="w-6 h-6"/></button>
                                        </div>

                                        <div className="space-y-5">
                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Building Name</label>
                                                <input type="text" value={goodBuildingFormData.building_name} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, building_name: e.target.value})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all placeholder-gray-300" placeholder="e.g. Quezon Type Bldg" />
                                            </div>
                                            
                                            <div className={`relative ${isGoodDropdownOpen ? 'z-50' : 'z-0'}`}>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Building Category</label>
                                                <div className="relative mt-1">
                                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                                                        <FiSearch className="text-gray-400 w-5 h-5" />
                                                    </div>
                                                    <input 
                                                        type="text" 
                                                        placeholder="Search building type..."
                                                        value={isGoodDropdownOpen ? goodBuildingSearch : goodBuildingFormData.category}
                                                        onFocus={() => {
                                                            setIsGoodDropdownOpen(true);
                                                            setGoodBuildingSearch("");
                                                        }}
                                                        onChange={(e) => {
                                                            setGoodBuildingSearch(e.target.value);
                                                            setGoodBuildingFormData(prev => ({...prev, category: e.target.value}));
                                                        }}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 rounded-2xl pl-11 pr-12 py-4 text-lg font-bold text-gray-700 outline-none focus:border-indigo-500 focus:bg-white transition-all placeholder-gray-300 shadow-sm"
                                                    />
                                                    <div 
                                                        className="absolute inset-y-0 right-0 pr-4 flex items-center cursor-pointer text-gray-400 hover:text-indigo-500"
                                                        onClick={() => setIsGoodDropdownOpen(!isGoodDropdownOpen)}
                                                    >
                                                        <FiChevronDown className={`w-6 h-6 transition-transform duration-300 ${isGoodDropdownOpen ? 'rotate-180' : ''}`} />
                                                    </div>

                                                    <AnimatePresence>
                                                        {isGoodDropdownOpen && (
                                                            <>
                                                                <motion.div 
                                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }} 
                                                                    animate={{ opacity: 1, y: 0, scale: 1 }} 
                                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                                    className="absolute z-[100] w-full mt-2 bg-white border-2 border-gray-100 rounded-3xl shadow-2xl max-h-72 overflow-y-auto overflow-x-hidden py-2"
                                                                >
                                                                    {(goodBuildingSearch ? buildingTypes.filter(t => t.toLowerCase().includes(goodBuildingSearch.toLowerCase())) : buildingTypes).map(type => (
                                                                        <button 
                                                                            key={type} 
                                                                            type="button"
                                                                            onClick={() => {
                                                                                setGoodBuildingFormData({...goodBuildingFormData, category: type});
                                                                                setGoodBuildingSearch(type);
                                                                                setIsGoodDropdownOpen(false);
                                                                            }}
                                                                            className={`w-full text-left px-6 py-4 font-bold text-gray-700 transition-all border-b border-gray-50 last:border-0 hover:bg-indigo-50 hover:pl-8 flex items-center justify-between ${goodBuildingFormData.category === type ? 'bg-indigo-50 text-indigo-600' : ''}`}
                                                                        >
                                                                            <span>{type}</span>
                                                                            {goodBuildingFormData.category === type && <FiCheck className="w-5 h-5" />}
                                                                        </button>
                                                                    ))}
                                                                    <div className="px-6 py-8 text-center text-gray-400">
                                                                        {buildingTypes.length === 0 ? (
                                                                            <>
                                                                                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                                                                                <p className="italic font-medium">Fetching building types...</p>
                                                                            </>
                                                                        ) : (goodBuildingSearch && buildingTypes.filter(t => t.toLowerCase().includes(goodBuildingSearch.toLowerCase())).length === 0) ? (
                                                                            <>
                                                                                <FiSearch className="w-10 h-10 mx-auto mb-2 opacity-20" />
                                                                                <p className="italic font-medium">No matching building types found</p>
                                                                            </>
                                                                        ) : null}
                                                                    </div>
                                                                </motion.div>
                                                                <div className="fixed inset-0 z-40" onClick={() => setIsGoodDropdownOpen(false)}></div>
                                                            </>
                                                        )}
                                                    </AnimatePresence>
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Storeys</label>
                                                    <input type="number" value={goodBuildingFormData.storey} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, storey: parseInt(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all text-center" min="1" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Classrooms</label>
                                                    <input type="number" value={goodBuildingFormData.classroom} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, classroom: parseInt(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all text-center" min="1" />
                                                </div>
                                            </div>

                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Length (m)</label>
                                                    <input type="number" value={goodBuildingFormData.room_length} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, room_length: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all text-center" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Width (m)</label>
                                                    <input type="number" value={goodBuildingFormData.room_width} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, room_width: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all text-center" />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Year Completed</label>
                                                <select value={goodBuildingFormData.year_completed} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, year_completed: parseInt(e.target.value)})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
                                                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Remarks</label>
                                                <textarea value={goodBuildingFormData.remarks} onChange={(e) => setGoodBuildingFormData({...goodBuildingFormData, remarks: e.target.value})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-blue-500 transition-all min-h-[100px]" placeholder="Optional notes..."></textarea>
                                            </div>

                                            <button onClick={handleSaveGoodBuilding}
                                                className="w-full mt-4 py-4 rounded-2xl text-white font-black text-lg bg-blue-500 border-b-[6px] border-blue-700 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl shadow-blue-200/50">
                                                Save Building
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ────────────────────────────────────────────────────────
                    PHASE 2: Building Inventory - Repair Assessment
                    ──────────────────────────────────────────────────────── */}
                {currentPage === 4 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-2">
                            Repair Assessment 🛠️
                        </h2>
                        <p className="text-gray-500 mb-6 font-medium">Log rooms that require attention or minor repairs.</p>
                        
                        {/* Gatekeeper: Repair */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100 mb-8">
                            <h3 className="font-bold text-gray-700 mb-4 px-1 text-lg">Do you have any rooms needing Repair?</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setHasRepair(true)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasRepair === true ? "bg-amber-100 border-amber-500 text-amber-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiCheck className="w-6 h-6" /> Yes
                                </button>
                                <button onClick={() => setHasRepair(false)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasRepair === false ? "bg-rose-100 border-rose-500 text-rose-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiX className="w-6 h-6" /> No
                                </button>
                            </div>
                        </div>

                        {/* Inventory Area (If Yes) */}
                        {hasRepair && (
                            <div className="space-y-6">
                                
                                {/* Card List */}
                                {repairAssessments.length > 0 && (
                                    <div className="space-y-4">
                                        {groupedRepairsArray.map(b => (
                                            <div key={b.roomId} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-gray-100 flex justify-between items-center">
                                                <div>
                                                    <h4 className="font-black text-xl text-gray-800">{b.building_name} - {b.room_name}</h4>
                                                    <p className="text-sm font-bold text-gray-500 mt-1">{b.items?.length || 0} Items for Repair</p>
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    {true && (
                                                        <>
                                                            <button onClick={() => handleEditRepairRoom(b)} className="p-3 bg-amber-50 text-amber-500 rounded-xl hover:bg-amber-100 transition-colors">
                                                                <FiEdit2 className="w-5 h-5"/>
                                                            </button>
                                                            <button onClick={() => handleDeleteRepairRoom(b.roomId)} className="p-3 bg-rose-50 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors">
                                                                <FiTrash2 className="w-5 h-5"/>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Button */}
                                {!showRepairModal ? (
                                    <motion.button 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setShowRepairModal(true)}
                                        className="bg-amber-50 w-full py-4 rounded-2xl text-amber-600 font-black text-lg border-2 border-amber-200 border-dashed hover:bg-amber-100 hover:border-amber-300 transition-all flex justify-center items-center gap-2"
                                    >
                                        <FiPlus className="w-6 h-6"/> Add Room for Repair
                                    </motion.button>
                                ) : showRepairModal ? (
                                    /* Form Modal Area */
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-[2rem] shadow-xl border border-gray-200"
                                    >
                                        <div className="flex justify-between items-center mb-6 border-b-2 border-gray-50 pb-4">
                                            <h3 className="font-black text-2xl text-gray-800">Room Repair Assessment</h3>
                                            <button onClick={() => setShowRepairModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full"><FiX className="w-6 h-6"/></button>
                                        </div>

                                        {/* Top Section: Room Details */}
                                        <div className="space-y-4 mb-8 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                                            <h4 className="font-bold text-gray-700">Room Details</h4>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Building Name</label>
                                                    <input type="text" value={repairRoomFormData.building_name} onChange={(e) => setRepairRoomFormData({...repairRoomFormData, building_name: e.target.value})}
                                                        className="w-full bg-white border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-amber-500 transition-all placeholder-gray-300" placeholder="e.g. Science Bldg" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Name</label>
                                                    <input type="text" value={repairRoomFormData.room_name} onChange={(e) => setRepairRoomFormData({...repairRoomFormData, room_name: e.target.value})}
                                                        className="w-full bg-white border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-amber-500 transition-all placeholder-gray-300" placeholder="e.g. Lab 1" />
                                                </div>
                                            </div>
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Length (m)</label>
                                                    <input type="number" value={repairRoomFormData.room_length} onChange={(e) => setRepairRoomFormData({...repairRoomFormData, room_length: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-white border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-amber-500 transition-all text-center" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Width (m)</label>
                                                    <input type="number" value={repairRoomFormData.room_width} onChange={(e) => setRepairRoomFormData({...repairRoomFormData, room_width: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-white border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-amber-500 transition-all text-center" />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Bottom Section: Item Checklist */}
                                        <h4 className="font-bold text-gray-700 mb-4 px-1">Items for Repair</h4>
                                        <div className="space-y-4">
                                            {REPAIR_CATEGORIES.map(category => {
                                                const isChecked = !!repairItemsState[category];
                                                const itemData = repairItemsState[category] || {};

                                                return (
                                                    <div key={category} className={`border-2 rounded-2xl overflow-hidden transition-all ${isChecked ? 'border-amber-400 bg-amber-50/30' : 'border-gray-100 bg-white'}`}>
                                                        <label className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50">
                                                            <input type="checkbox" checked={isChecked} onChange={() => handleToggleRepairItem(category)} 
                                                                className="w-6 h-6 rounded text-amber-500 focus:ring-amber-500 border-gray-300" />
                                                            <span className={`font-bold text-lg ${isChecked ? 'text-amber-800' : 'text-gray-600'}`}>{category}</span>
                                                        </label>

                                                        {isChecked && (
                                                            <div className="p-4 pt-0 space-y-4 border-t border-amber-100 mt-2">
                                                                <div className="flex gap-4">
                                                                    <div className="flex-1">
                                                                        <label className="text-xs font-bold text-gray-500">Made Of</label>
                                                                        <input type="text" value={itemData.made_of} onChange={(e) => handleUpdateRepairItem(category, 'made_of', e.target.value)}
                                                                            className="w-full bg-white border-2 border-gray-200 mt-1 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-amber-500" placeholder="e.g. Wood, Steel..." />
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <label className="text-xs font-bold text-gray-500">Condition</label>
                                                                        <select value={itemData.condition} onChange={(e) => handleUpdateRepairItem(category, 'condition', e.target.value)}
                                                                            className="w-full bg-white border-2 border-gray-200 mt-1 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-amber-500 appearance-none">
                                                                            <option value="Good">Good</option>
                                                                            <option value="Repair">Repair</option>
                                                                            <option value="Replacement">Replacement</option>
                                                                        </select>
                                                                    </div>
                                                                </div>

                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500 flex justify-between">
                                                                        <span>Damage Ratio</span>
                                                                        <span className="text-amber-600">{itemData.damage_ratio}%</span>
                                                                    </label>
                                                                    <input type="range" min="0" max="100" value={itemData.damage_ratio} onChange={(e) => handleUpdateRepairItem(category, 'damage_ratio', parseInt(e.target.value))}
                                                                        className="w-full mt-2 accent-amber-500 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer" />
                                                                </div>

                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500">Recommended Action</label>
                                                                    <select value={itemData.recommend_action} onChange={(e) => handleUpdateRepairItem(category, 'recommend_action', e.target.value)}
                                                                        className="w-full bg-white border-2 border-gray-200 mt-1 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-amber-500 appearance-none">
                                                                        <option value="Routine Repair">Routine Repair</option>
                                                                        <option value="Major Repair/Rehabilitation">Major Repair/Rehabilitation</option>
                                                                        <option value="Structural Retrofit">Structural Retrofit</option>
                                                                        <option value="Recommend for Condemnation">Recommend for Condemnation</option>
                                                                        <option value="Recommend for Demolition">Recommend for Demolition</option>
                                                                    </select>
                                                                </div>

                                                                {(itemData.recommend_action === 'Recommend for Demolition' || itemData.recommend_action === 'Recommend for Condemnation') && (
                                                                    <div>
                                                                        <label className="text-xs font-bold text-rose-500">Demolition/Condemnation Justification</label>
                                                                        <textarea value={itemData.demo_justification} onChange={(e) => handleUpdateRepairItem(category, 'demo_justification', e.target.value)}
                                                                            className="w-full bg-rose-50 border-2 border-rose-200 mt-1 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-rose-500 min-h-[60px]" placeholder="Explain why..."></textarea>
                                                                    </div>
                                                                )}

                                                                <div>
                                                                    <label className="text-xs font-bold text-gray-500">Remarks</label>
                                                                    <input type="text" value={itemData.remarks} onChange={(e) => handleUpdateRepairItem(category, 'remarks', e.target.value)}
                                                                        className="w-full bg-white border-2 border-gray-200 mt-1 rounded-xl px-3 py-2 text-sm font-bold text-gray-700 outline-none focus:border-amber-500" placeholder="Optional notes..." />
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        <button onClick={handleSaveRepairRoom}
                                            className="w-full mt-6 py-4 rounded-2xl text-white font-black text-lg bg-amber-500 border-b-[6px] border-amber-700 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl shadow-amber-200/50">
                                            Save Room Assessment ✓
                                        </button>
                                    </motion.div>
                                ) : null}
                            </div>
                        )}
                    </motion.div>
                )}

                {/* ────────────────────────────────────────────────────────
                    PHASE 2: Building Inventory - Demolition
                    ──────────────────────────────────────────────────────── */}
                {currentPage === 5 && (
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="pb-20">
                        <h2 className="text-3xl font-black text-gray-800 tracking-tight leading-tight mb-2">
                            Demolition & Finalize 🚜
                        </h2>
                        <p className="text-gray-500 mb-6 font-medium">Finalize your audit by documenting buildings for demolition.</p>

                        {/* Gatekeeper: Demolition */}
                        <div className="bg-white p-5 rounded-[2rem] shadow-sm border-2 border-gray-100 mb-8">
                            <h3 className="font-bold text-gray-700 mb-4 px-1 text-lg">Are there any buildings slated for demolition?</h3>
                            <div className="flex gap-3">
                                <button onClick={() => setHasDemolition(true)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasDemolition === true ? "bg-rose-100 border-rose-500 text-rose-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiCheck className="w-6 h-6" /> Yes
                                </button>
                                <button onClick={() => setHasDemolition(false)}
                                    className={`flex-1 py-4 rounded-2xl font-black text-lg border-2 transition-all flex flex-col items-center gap-1 ${hasDemolition === false ? "bg-slate-100 border-slate-500 text-slate-700 shadow-sm" : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"}`}>
                                    <FiX className="w-6 h-6" /> No
                                </button>
                            </div>
                        </div>

                        {/* Inventory Area (If Yes) */}
                        {hasDemolition && (
                            <div className="space-y-6">
                                
                                {/* Card List */}
                                {demolitionRecords.length > 0 && (
                                    <div className="space-y-4">
                                        {demolitionRecords.map(b => (
                                            <div key={b.id} className="bg-white p-5 rounded-3xl shadow-sm border-2 border-rose-100 flex justify-between items-start">
                                                <div className="flex-1">
                                                    <h4 className="font-black text-2xl text-gray-800">{b.building_name}</h4>
                                                    <p className="text-sm font-bold text-gray-500 mt-1">Area Lost: {b.room_length * b.room_width} m&sup2;</p>
                                                    
                                                    <div className="mt-4 flex flex-wrap gap-2">
                                                        {b.age && <span className="inline-flex bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700">Age / Dilapidation</span>}
                                                        {b.safety && <span className="inline-flex bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700">Safety Hazard</span>}
                                                        {b.calamity && <span className="inline-flex bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700">Calamity Damage</span>}
                                                        {b.upgrade && <span className="inline-flex bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl text-xs font-bold text-rose-700">Site Upgrade / Repurposing</span>}
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 ml-4">
                                                    {true && (
                                                        <>
                                                            <button onClick={() => handleEditDemolition(b)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-indigo-500 transition-colors border border-gray-200">
                                                                <FiEdit2 className="w-5 h-5"/>
                                                            </button>
                                                            <button onClick={() => handleDeleteDemolition(b.id)} className="p-3 bg-gray-50 text-gray-400 rounded-xl hover:bg-gray-100 hover:text-rose-500 transition-colors border border-gray-200">
                                                                <FiTrash2 className="w-5 h-5"/>
                                                            </button>
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Add Button */}
                                {!showDemolitionModal ? (
                                    <motion.button 
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        onClick={() => setShowDemolitionModal(true)}
                                        className="bg-rose-50 w-full py-4 rounded-2xl text-rose-600 font-black text-lg border-2 border-rose-200 border-dashed hover:bg-rose-100 hover:border-rose-300 transition-all flex justify-center items-center gap-2"
                                    >
                                        <FiPlus className="w-6 h-6"/> Add Building for Demolition
                                    </motion.button>
                                ) : showDemolitionModal ? (
                                    /* Form Modal Area */
                                    <motion.div 
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="bg-white p-6 rounded-[2rem] shadow-xl border-2 border-rose-100"
                                    >
                                        <div className="flex justify-between items-center mb-6 border-b-2 border-gray-50 pb-4">
                                            <h3 className="font-black text-2xl text-gray-800">Demolition Details</h3>
                                            <button onClick={() => setShowDemolitionModal(false)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-2 rounded-full"><FiX className="w-6 h-6"/></button>
                                        </div>

                                        <div className="space-y-6">
                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2">Building Name</label>
                                                <input type="text" value={demolitionFormData.building_name} onChange={(e) => setDemolitionFormData({...demolitionFormData, building_name: e.target.value})}
                                                    className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-rose-500 transition-all placeholder-gray-300" placeholder="e.g. Old Marcos Bldg" />
                                            </div>
                                            
                                            <div className="flex gap-4">
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Length (m)</label>
                                                    <p className="text-xs text-rose-400 italic ml-2 mb-1">Standard dimension being lost</p>
                                                    <input type="number" value={demolitionFormData.room_length} onChange={(e) => setDemolitionFormData({...demolitionFormData, room_length: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-rose-500 transition-all text-center" />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="text-sm font-bold text-gray-500 ml-2">Room Width (m)</label>
                                                    <p className="text-xs text-rose-400 italic ml-2 mb-1">Standard dimension being lost</p>
                                                    <input type="number" value={demolitionFormData.room_width} onChange={(e) => setDemolitionFormData({...demolitionFormData, room_width: parseFloat(e.target.value) || 0})}
                                                        className="w-full bg-gray-50 border-2 border-gray-200 mt-1 rounded-2xl px-4 py-3 text-lg font-bold text-gray-700 outline-none focus:border-rose-500 transition-all text-center" />
                                                </div>
                                            </div>

                                            {/* Justification Toggles */}
                                            <div>
                                                <label className="text-sm font-bold text-gray-500 ml-2 mb-2 block">Justifications (Select at least one)</label>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                    <button onClick={() => handleToggleDemolitionReason('age')}
                                                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 text-left flex items-center justify-between transition-all ${demolitionFormData.age ? 'bg-rose-50 border-rose-400 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                        Age / Dilapidation
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${demolitionFormData.age ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300'}`}>
                                                            {demolitionFormData.age && <FiCheck className="w-3 h-3" />}
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleToggleDemolitionReason('safety')}
                                                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 text-left flex items-center justify-between transition-all ${demolitionFormData.safety ? 'bg-rose-50 border-rose-400 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                        Safety Hazard
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${demolitionFormData.safety ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300'}`}>
                                                            {demolitionFormData.safety && <FiCheck className="w-3 h-3" />}
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleToggleDemolitionReason('calamity')}
                                                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 text-left flex items-center justify-between transition-all ${demolitionFormData.calamity ? 'bg-rose-50 border-rose-400 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                        Calamity Damage
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${demolitionFormData.calamity ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300'}`}>
                                                            {demolitionFormData.calamity && <FiCheck className="w-3 h-3" />}
                                                        </div>
                                                    </button>
                                                    <button onClick={() => handleToggleDemolitionReason('upgrade')}
                                                        className={`py-3 px-4 rounded-xl font-bold text-sm border-2 text-left flex items-center justify-between transition-all ${demolitionFormData.upgrade ? 'bg-rose-50 border-rose-400 text-rose-700' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                                        Site Upgrade / Repurposing
                                                        <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center ${demolitionFormData.upgrade ? 'bg-rose-500 border-rose-500 text-white' : 'border-gray-300'}`}>
                                                            {demolitionFormData.upgrade && <FiCheck className="w-3 h-3" />}
                                                        </div>
                                                    </button>
                                                </div>
                                            </div>

                                            <button onClick={handleSaveDemolition}
                                                className="w-full mt-4 py-4 rounded-2xl text-white font-black text-lg bg-rose-500 border-b-[6px] border-rose-700 active:border-b-0 active:translate-y-[6px] transition-all shadow-xl shadow-rose-200/50">
                                                Save Demolition Assessment
                                            </button>
                                        </div>
                                    </motion.div>
                                ) : null}
                            </div>
                        )}

                        {/* FINAL SUBMIT BUTTON on Page 5 */}
                        {true && (
                            <div className="mt-12 p-8 bg-indigo-600 rounded-[2.5rem] shadow-2xl shadow-indigo-200 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-6 opacity-10">
                                    <FiCheckCircle className="w-32 h-32 text-white" />
                                </div>
                                <h3 className="text-white font-black text-3xl mb-2 relative z-10">Finalize Audit ✨</h3>
                                <p className="text-indigo-100 font-medium mb-8 relative z-10">Ready to save all your Physical Facilities data for this school?</p>
                                
                                <button onClick={handleMasterSubmit} disabled={loading}
                                    className="w-full py-5 rounded-2xl bg-white text-indigo-600 font-black text-2xl shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50 border-b-[6px] border-indigo-200 active:border-b-0 active:translate-y-[6px]">
                                    {loading ? "Processing..." : "Submit Unit Audit"}
                                    <FiArrowRight className="w-6 h-6" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* Wizard Navigation Buttons */}
                <div className="mt-8 flex gap-4 pb-12">
                    {currentPage > 1 && (
                        <button 
                            onClick={() => setCurrentPage(prev => prev - 1)}
                            className="flex-1 py-4 px-6 rounded-2xl bg-white border-2 border-gray-200 text-gray-600 font-black text-lg flex items-center justify-center gap-2 hover:bg-gray-50 transition-all active:scale-95"
                        >
                            <FiArrowLeft /> Back
                        </button>
                    )}
                    {currentPage < 5 && (
                        <button 
                            onClick={() => setCurrentPage(prev => prev + 1)}
                            className="flex-[2] py-4 px-6 rounded-2xl bg-indigo-500 text-white font-black text-lg flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 hover:bg-indigo-600 transition-all border-b-[6px] border-indigo-700 active:border-b-0 active:translate-y-[6px]"
                        >
                            Next Step <FiArrowRight />
                        </button>
                    )}
                </div>

            </main>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => setShowSuccess(false)}
                message="Space mapped and recorded successfully!"
                redirectUrl={null}
            />
        </div>
    );
}
