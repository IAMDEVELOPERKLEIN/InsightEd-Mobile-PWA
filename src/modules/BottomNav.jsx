import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Icons 
import { TbHomeEdit, TbCloudUpload, TbClipboardList, TbSchool, TbArrowsLeftRight, TbChartBar, TbFileCheck } from "react-icons/tb";
import { LuCompass } from "react-icons/lu";
import { FiSettings, FiCheckSquare, FiLogOut, FiMessageSquare, FiHome, FiUser, FiList } from "react-icons/fi"; // Added FiMessageSquare, FiHome, FiUser, FiList

const BottomNav = ({ userRole: propRole }) => {
    const { user, logout, confirmLogout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Robust role detection: Prop -> Context -> Cache
    const userRole = propRole || user?.role || localStorage.getItem('userRole');

    // If no role is detected yet, don't show the nav bar (prevents flashes/errors)
    if (!userRole) return null;

    // --- SUPER USER OVERRIDE ---
    let effectiveRole = userRole;

    // Normalization logic for database vs UI role strings
    if (effectiveRole === 'deped_engineer' || effectiveRole === 'DepEd Engineer') effectiveRole = 'Division Engineer';
    if (effectiveRole === 'hrodi_engineer' || effectiveRole === 'HRODI Engineer' || effectiveRole === 'EFD' || effectiveRole === 'HRODI') effectiveRole = 'EFD Engineer';
    if (effectiveRole === 'non_deped_engineer') effectiveRole = 'Non-DepEd Engineer';
    if (effectiveRole === 'engineer') effectiveRole = 'Engineer';
    if (effectiveRole === 'school_head') effectiveRole = 'School Head';
    if (effectiveRole === 'lgu') effectiveRole = 'Local Government Unit';

    // Normalize Implementing Agency sub-roles
    if (['PGO', 'CGO', 'MGO', 'DPWH', 'CSO'].includes(effectiveRole)) {
        effectiveRole = 'Implementing Agency';
    }

    if (user?.role === 'Super User') {
        const impRole = sessionStorage.getItem('impersonatedRole');
        if (impRole) effectiveRole = impRole;
    }

    // --- CONFIGURATION BY ROLE ---
    const navConfigs = {

        'Non-DepEd Engineer': [
            { label: 'Home', path: '/non-deped-dashboard', icon: TbHomeEdit },
            { label: 'Projects', path: '/engineer-projects', icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Local Government Unit': [
            { label: 'Projects', path: '/lgu-dashboard', icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'School Head': [
            { label: 'Home', path: '/my-activity', icon: TbHomeEdit },
            { label: 'Modules', path: '/modular-dashboard', icon: LuCompass },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Division Engineer': [
            { label: 'Home', path: '/engineer-dashboard', icon: TbHomeEdit },
            { label: 'Projects', path: '/engineer-projects', icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Admin': [
            { label: 'Home', path: '/admin-dashboard', icon: TbHomeEdit },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Human Resource': [
            { label: 'Home', path: '/hr-dashboard', icon: TbHomeEdit },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Regional Office': [
            { label: 'InsightED', path: '/monitoring-dashboard', state: { activeTab: 'home' }, icon: TbHomeEdit },
            { label: 'Insights', path: '/monitoring-dashboard', state: { activeTab: 'insights' }, icon: TbChartBar },
            { label: 'Infra', path: '/monitoring-dashboard', state: { activeTab: 'engineer' }, icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'School Division Office': [
            { label: 'Home', path: '/monitoring-dashboard', state: { activeTab: 'all' }, icon: TbHomeEdit },
            { label: 'Insights', path: '/monitoring-dashboard', state: { activeTab: 'insights' }, icon: TbChartBar },
            { label: 'Infra', path: '/monitoring-dashboard', state: { activeTab: 'engineer' }, icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Central Office': [
            { label: 'Home', path: '/monitoring-dashboard', state: { activeTab: 'accomplishment', resetFilters: true }, icon: TbHomeEdit },
            { label: 'Infra', path: '/monitoring-dashboard', state: { activeTab: 'infra', resetFilters: true }, icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Central Office Finance': [
            { label: 'Home', path: '/finance-dashboard', icon: TbHomeEdit },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],

        'Masterlist': [
            { label: 'Home', path: '/psip', state: { activeTab: 'home' }, icon: TbHomeEdit },
            { label: 'Data', path: '/psip', state: { activeTab: 'data' }, icon: TbChartBar },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/psip', state: { activeTab: 'settings' }, icon: FiSettings },
        ],

        'EFD Engineer': [
            { label: 'Home', path: '/efd-dashboard', icon: TbHomeEdit },
            { label: 'Projects', path: '/efd-monitoring', icon: TbClipboardList },
            { label: 'Mother MOA', path: '/efd-mother-moa', icon: TbFileCheck },
            { label: 'Monitoring', path: '/efd-newcon-monitoring', icon: TbChartBar },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Implementing Agency': [
            { label: 'Home', path: '/agency-dashboard', state: { activeTab: 'home' }, icon: TbHomeEdit },
            { label: 'Deployment', path: '/agency-dashboard', state: { activeTab: 'deployment' }, icon: TbClipboardList },
            { label: 'Chat', path: '/chat', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
    };

    const currentNavItems = navConfigs[effectiveRole];

    // --- SUPER USER INJECTION ---
    // REMOVED: Moved to Floating Button
    const finalNavItems = currentNavItems;

    // If role exists but not in config (unexpected), don't show anything or show safe fallback
    if (!finalNavItems) return null;

    return createPortal(
        <div className="fixed bottom-0 left-0 w-full h-[70px] z-[1000] bg-white border-t border-slate-200 shadow-[0_-4px_12px_rgba(0,0,0,0.05)] flex items-center">
            <div className="w-full h-full flex justify-around items-center px-1 sm:px-2">
                {finalNavItems.map((item) => {
                    const isActive = location.pathname === item.path &&
                        (!item.state || location.state?.activeTab === item.state.activeTab || (!location.state?.activeTab && (item.state.activeTab === 'all' || item.state.activeTab === 'home')));

                    const Icon = item.icon;

                    return (
                        <button
                            key={item.label}
                            className="flex-1 flex flex-col items-center justify-center h-full bg-transparent border-none cursor-pointer group transition-all"
                            onClick={() => {
                                if (item.logout) {
                                    confirmLogout();
                                    return;
                                }
                                
                                // Preserve impersonation UID if present
                                let targetPath = item.path;
                                if (user?.role === 'Super User') {
                                    const impUid = sessionStorage.getItem('impersonatedUid');
                                    if (impUid && targetPath && !targetPath.includes('uid=')) {
                                        targetPath += (targetPath.includes('?') ? '&' : '?') + `uid=${impUid}`;
                                    }
                                }
                                
                                navigate(targetPath, { state: { ...(item.state || {}), refreshTrigger: Date.now() } });
                            }}
                        >
                            <Icon
                                size={20}
                                className={`mb-1 transition-colors ${isActive ? 'text-[#004A99] scale-110' : 'text-slate-400 group-hover:text-slate-600'}`}
                            />
                            <span className={`text-[7px] sm:text-[9px] font-bold uppercase tracking-wider transition-colors text-center px-1 ${isActive ? 'text-[#004A99]' : 'text-slate-400 group-hover:text-slate-600'}`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>,
        document.body
    );
};

export default BottomNav;