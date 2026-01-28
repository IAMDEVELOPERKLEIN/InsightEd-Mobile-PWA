import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { TbTrophy, TbArrowLeft, TbBuildingSkyscraper, TbMap2, TbMedal, TbSearch, TbFilter } from "react-icons/tb";
import { auth } from '../firebase';
import PageTransition from '../components/PageTransition';
import MyRankFooter from './MyRankFooter';

const Leaderboard = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('schools'); // 'schools' or 'divisions'
    const [data, setData] = useState({ schools: [], divisions: [] });
    const [userRole, setUserRole] = useState(null);
    const [userScope, setUserScope] = useState(null); // The region or division name
    const [viewScope, setViewScope] = useState('division'); // 'division' or 'region' (New Toggle State)
    const [currentUserRegion, setCurrentUserRegion] = useState(null);
    const [currentUserDivision, setCurrentUserDivision] = useState(null);
    const [currentSchoolId, setCurrentSchoolId] = useState(null); // To highlight current user
    const [myRankData, setMyRankData] = useState(null); // Store user's rank info
    const [showStickyFooter, setShowStickyFooter] = useState(false); // Toggle footer visibility
    const [search, setSearch] = useState('');

    useEffect(() => {
        const init = async () => {
            const user = auth.currentUser;
            if (!user) return;

            // Determine Scope based on functionality context (simulated here since we don't have a rigid role context provider yet)
            // We'll fetch the user's profile to see their assigned region/division
            try {
                // Try School Head profile first
                const headRes = await fetch(`/api/school-head/${user.uid}`);
                const headJson = await headRes.json();

                let scope = '';
                let filter = '';
                let role = 'School Head';

                if (headJson.exists) {
                    // School Head -> View their Division
                    scope = 'division';
                    filter = headJson.data.division; // Assuming head_division exists from schema
                    setUserScope(filter);
                } else {
                    // Try to infer from localStorage or simplified logic for RO/SDO
                    const savedRole = localStorage.getItem('userRole');
                    role = savedRole;
                    // For demo/hackathon purposes, we might need to fetch the specific RO/SDO profile
                    // But for now, let's assume if role is 'Regional Office', we show Region VIII
                    if (savedRole === 'Regional Office') {
                        scope = 'region';
                        filter = 'Region VIII'; // Hardcoded for this region as per context likely
                        setUserScope(filter);
                    } else if (savedRole === 'School Division Office') {
                        scope = 'division';
                        // Ideally strictly fetched, but for now we might need to ask or default
                        filter = 'Leyte'; // Placeholder default or fetch from separate profile table if exists
                        setUserScope(filter);
                    }
                }

                if (headJson.exists) {
                    setCurrentUserRegion(headJson.data.region || 'Region VIII');
                    setCurrentUserDivision(headJson.data.division || 'Leyte');
                    setCurrentSchoolId(headJson.data.school_id); // Save ID for highlighting
                } else {
                    // Defaults for demo
                    setCurrentUserRegion('Region VIII');
                    setCurrentUserDivision('Leyte');
                }

                setUserRole(role);

                // Initial Fetch - Default to Division view for clarity
                const initialScopeStr = headJson.exists ? 'division' : scope; // Prefer division view for heads initially
                const initialFilter = headJson.exists ? headJson.data.division : filter;

                if (initialFilter) {
                    const res = await fetch(`/api/leaderboard?scope=${initialScopeStr}&filter=${encodeURIComponent(initialFilter)}`);
                    const json = await res.json();
                    setData(json);
                    setUserScope(initialFilter);
                }

            } catch (err) {
                console.error("Leaderboard init error:", err);
            } finally {
                setLoading(false);
            }
        };
        init();
    }, []);

    const handleTabChange = async (tab) => {
        setActiveTab(tab);
        // Reset scope logic if switching tabs (optional, or keep persistence)
        if (tab !== 'schools') {
            // Standard switching for other tabs
            await fetchTab(tab);
        }
    };

    // Dedicated fetcher for transparency
    const fetchTab = async (tab) => {
        setLoading(true);
        try {
            let url = '';
            let scopeArg = '';
            let filterArg = '';

            if (tab === 'regions') {
                scopeArg = 'national';
                url = `/api/leaderboard?scope=national`;
                setUserScope('National');
            } else if (tab === 'divisions') {
                scopeArg = 'region';
                filterArg = currentUserRegion || 'Region VIII';
                url = `/api/leaderboard?scope=region&filter=${encodeURIComponent(filterArg)}`;
                setUserScope(filterArg);
            } else {
                // SCHOOLS TAB: Respect the `viewScope` toggle
                if (viewScope === 'region') {
                    startRegionFetch();
                    return; // handled by startRegionFetch
                } else {
                    startDivisionFetch();
                    return;
                }
            }

            const res = await fetch(url);
            const json = await res.json();
            setData(json);
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    }

    // Toggle Handlers
    const toggleViewScope = async (newScope) => {
        if (newScope === viewScope) return;
        setViewScope(newScope);
        setLoading(true);

        try {
            let url = '';
            let displayScope = '';

            if (newScope === 'region') {
                url = `/api/leaderboard?scope=region&filter=${encodeURIComponent(currentUserRegion || 'Region VIII')}`;
                displayScope = currentUserRegion || 'Region VIII';
            } else {
                url = `/api/leaderboard?scope=division&filter=${encodeURIComponent(currentUserDivision || 'Leyte')}`;
                displayScope = currentUserDivision || 'Leyte';
            }

            setUserScope(displayScope);
            const res = await fetch(url);
            const json = await res.json();
            setData(json);

        } catch (err) {
            console.error("Scope switch error:", err);
        } finally {
            setLoading(false);
        }
    };

    const getMedalColor = (index) => {
        if (index === 0) return 'text-yellow-500';
        if (index === 1) return 'text-slate-400';
        if (index === 2) return 'text-amber-700';
        return 'text-slate-300 opacity-50';
    };

    const sortedSchools = data.schools ? data.schools.filter(s => s.school_name.toLowerCase().includes(search.toLowerCase())) : [];

    // Intersection Observer for Sticky Footer
    // We want to verify if the user's row is visible. 
    // Effect to update MyRankData when data changes
    useEffect(() => {
        if (currentSchoolId && sortedSchools.length > 0) {
            const index = sortedSchools.findIndex(s => s.school_id === currentSchoolId);
            if (index !== -1) {
                setMyRankData({
                    rank: index + 1,
                    ...sortedSchools[index]
                });
            } else {
                setMyRankData(null);
            }
        }
    }, [sortedSchools, currentSchoolId]);

    // Ref for the user's row
    const userRowRef = React.useRef(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                // If user row is NOT intersecting (not visible), show sticky footer
                setShowStickyFooter(!entry.isIntersecting);
            },
            { threshold: 0.1 } // Trigger as soon as 10% is visible
        );

        if (userRowRef.current) {
            observer.observe(userRowRef.current);
        } else {
            // If the ref is null (e.g. user not in viewport or list not rendered, or user not found in list yet),
            // and we have rank data, we should probably show the footer if they are effectively "off screen"?
            // Actually, if ref is null, it means the element isn't in DOM.
            // If the list is large and virtualization is not used, it should be in DOM.
            // If we have data but no ref, it might be that we haven't rendered yet or filters hid it.
            // Lets default to hidden if we can't find them, or show if we know they exist.
            // Simpler: if myRankData exists, show footer by default? 
            // Correct approach: Try to observe whenever ref changes.
            if (myRankData) setShowStickyFooter(true);
        }

        return () => {
            if (userRowRef.current) observer.unobserve(userRowRef.current);
        };
    }, [sortedSchools, myRankData, activeTab]);

    return (
        <PageTransition>
            <div className="min-h-screen bg-slate-50 relative pb-20">
                {/* Header */}
                <div className="bg-[#004A99] px-6 pt-12 pb-24 rounded-b-[3rem] shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
                    <div className="relative z-10">
                        <div className="flex items-center justify-between text-white mb-2">
                            <button onClick={() => navigate(-1)} className="p-2 -ml-2 hover:bg-white/10 rounded-full transition-colors">
                                <TbArrowLeft size={24} />
                            </button>
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-md border border-white/10">
                                <TbTrophy size={18} className="text-yellow-400" />
                                <span className="text-xs font-bold tracking-wide uppercase">Leaderboard</span>
                            </div>
                            <div className="w-8"></div> {/* Spacer */}
                        </div>
                        <h1 className="text-2xl font-bold text-white text-center mt-2">Top Performers</h1>
                        <p className="text-blue-200 text-center text-xs opacity-80 mb-6">{userScope ? `${userScope} Rankings` : 'Loading scope...'}</p>

                        {/* Search & Scope Toggle */}
                        <div className="flex gap-3 mb-2">
                            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2.5 flex items-center border border-white/10 flex-1 shadow-inner shadow-black/10">
                                <TbSearch className="text-blue-200 ml-1" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="bg-transparent border-none text-white placeholder-blue-200/50 text-sm w-full focus:outline-none px-3 font-medium"
                                />
                            </div>

                            {/* Scope Toggle (Only visible on Schools tab) */}
                            {activeTab === 'schools' && (
                                <button
                                    onClick={() => toggleViewScope(viewScope === 'division' ? 'region' : 'division')}
                                    className="bg-white/10 backdrop-blur-md rounded-2xl px-4 flex items-center justify-center border border-white/10 hover:bg-white/20 transition-all active:scale-95 shadow-lg shadow-black/5"
                                >
                                    <div className="flex flex-col items-center leading-none">
                                        <span className="text-[9px] text-blue-200 font-bold uppercase tracking-wide mb-0.5">Scope</span>
                                        <span className="text-white font-bold text-xs">{viewScope === 'division' ? 'My Div' : 'Region'}</span>
                                    </div>
                                    <TbFilter className="text-white ml-2 opacity-80" size={16} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Scope Tabs (Visible for everyone now to allow National View) */}
                <div className="flex justify-center -mt-8 relative z-20 px-4 mb-6">
                    <div className="bg-white p-1 rounded-full shadow-lg flex w-full max-w-sm overflow-x-auto">
                        <button
                            onClick={() => handleTabChange('schools')}
                            className={`flex-1 py-2 px-2 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'schools' ? 'bg-[#004A99] text-white shadow-md' : 'text-slate-500'}`}
                        >
                            Schools
                        </button>
                        <button
                            onClick={() => handleTabChange('divisions')}
                            className={`flex-1 py-2 px-2 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'divisions' ? 'bg-[#004A99] text-white shadow-md' : 'text-slate-500'}`}
                        >
                            Divisions
                        </button>
                        <button
                            onClick={() => handleTabChange('regions')}
                            className={`flex-1 py-2 px-2 rounded-full text-[10px] font-bold transition-all whitespace-nowrap ${activeTab === 'regions' ? 'bg-[#004A99] text-white shadow-md' : 'text-slate-500'}`}
                        >
                            Regions
                        </button>
                    </div>
                </div>

                {/* List Content */}
                <div className={`px-5 relative z-10 ${userRole !== 'Regional Office' ? '-mt-12' : ''} space-y-4`}>
                    {loading ? (
                        <div className="text-center py-10 text-slate-400 text-sm">Loading rankings...</div>
                    ) : (
                        <>
                            {activeTab === 'schools' && sortedSchools.map((item, index) => {
                                const isMe = item.school_id === currentSchoolId;
                                return (
                                    <div
                                        key={item.school_id}
                                        ref={isMe ? userRowRef : null}
                                        className={`bg-white p-4 rounded-2xl shadow-sm border flex items-center gap-4 relative overflow-hidden transition-all ${isMe ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200 z-10 scale-[1.01]' : 'border-slate-100'}`}
                                    >
                                        {/* Rank Badge */}
                                        <div className={`text-2xl font-black italic ${getMedalColor(index)} w-8 text-center shrink-0`}>
                                            {index + 1}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex justify-between items-start">
                                                <h3 className={`font-bold text-sm truncate pr-2 ${isMe ? 'text-blue-800' : 'text-slate-800'}`}>
                                                    {item.school_name} {isMe && <span className="ml-1 text-[10px] bg-blue-600 text-white px-1.5 py-0.5 rounded-full uppercase align-middle">You</span>}
                                                </h3>
                                                <span className="font-bold text-[#004A99] text-sm">{Math.round(item.completion_rate)}%</span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[10px] text-slate-500 mt-1">
                                                <TbMap2 size={12} />
                                                {item.division}
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full mt-2 overflow-hidden">
                                                <div
                                                    className="bg-gradient-to-r from-blue-400 to-[#004A99] h-full rounded-full"
                                                    style={{ width: `${item.completion_rate}%` }}
                                                ></div>
                                            </div>
                                        </div>

                                        {index < 3 && (
                                            <div className="absolute -top-1 -right-1">
                                                <TbMedal className={`${getMedalColor(index)} opacity-20 rotate-12`} size={40} />
                                            </div>
                                        )}
                                    </div>
                                )
                            })}

                            {activeTab === 'divisions' && data.divisions && data.divisions.map((item, index) => (
                                <div key={item.name} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden group hover:border-blue-200 transition-colors">
                                    <div className={`text-2xl font-black italic ${getMedalColor(index)} w-8 text-center shrink-0`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-xs font-black border border-blue-100">{item.avg_completion}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-blue-400 to-indigo-600 h-full rounded-full"
                                                style={{ width: `${item.avg_completion}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    {index < 3 && (
                                        <TbMedal className={`${getMedalColor(index)} opacity-10 absolute -right-4 -top-2 rotate-12`} size={80} />
                                    )}
                                </div>
                            ))}


                            {activeTab === 'regions' && data.regions && data.regions.map((item, index) => (
                                <div key={item.name} className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4 relative overflow-hidden">
                                    <div className={`text-2xl font-black italic ${getMedalColor(index)} w-8 text-center shrink-0`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="font-bold text-slate-800 text-sm">{item.name}</h3>
                                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-xs font-black border border-emerald-100">{item.avg_completion}%</span>
                                        </div>
                                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                                className="bg-gradient-to-r from-emerald-400 to-teal-600 h-full rounded-full"
                                                style={{ width: `${item.avg_completion}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    {index < 3 && (
                                        <TbMedal className={`${getMedalColor(index)} opacity-10 absolute -right-4 -top-2 rotate-12`} size={80} />
                                    )}
                                </div>
                            ))}
                        </>
                    )}
                </div>

                {/* Sticky "My Rank" Footer */}
                {activeTab === 'schools' && myRankData && showStickyFooter && (
                    <MyRankFooter
                        rank={myRankData.rank}
                        schoolName={myRankData.school_name}
                        score={myRankData.completion_rate}
                        medalColor={getMedalColor(myRankData.rank - 1)}
                    />
                )}
            </div>
        </PageTransition >
    );
};

export default Leaderboard;
