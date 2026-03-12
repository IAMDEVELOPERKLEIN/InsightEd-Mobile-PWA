import React from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';

// Icons 
import { TbHomeEdit, TbCloudUpload, TbClipboardList, TbSchool, TbArrowsLeftRight, TbChartBar } from "react-icons/tb";
import { LuCompass } from "react-icons/lu";
import { FiSettings, FiCheckSquare, FiLogOut, FiMessageSquare } from "react-icons/fi"; // Added FiMessageSquare

const BottomNav = ({ userRole }) => {
    const navigate = useNavigate();
    const location = useLocation();

    // If no role is provided yet (loading), don't show the nav bar
    if (!userRole) return null;

    // --- SUPER USER OVERRIDE ---
    let effectiveRole = userRole;

    // Normalization logic for database vs UI role strings
    if (effectiveRole === 'deped_engineer') effectiveRole = 'DepEd Engineer';
    if (effectiveRole === 'non_deped_engineer') effectiveRole = 'Non-DepEd Engineer';
    if (effectiveRole === 'engineer') effectiveRole = 'Engineer';
    if (effectiveRole === 'school_head') effectiveRole = 'School Head';
    if (effectiveRole === 'lgu') effectiveRole = 'Local Government Unit';

    if (localStorage.getItem('userRole') === 'Super User') {
        const impRole = sessionStorage.getItem('impersonatedRole');
        if (impRole) effectiveRole = impRole;
    }

    // --- CONFIGURATION BY ROLE ---
    const navConfigs = {
        'Engineer': [
            { label: 'Home', path: '/engineer-dashboard', icon: TbHomeEdit },
            { label: 'Projects', path: '/engineer-projects', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'DepEd Engineer': [
            { label: 'Home', path: '/engineer-dashboard', icon: TbHomeEdit },
            { label: 'Projects', path: '/engineer-projects', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Non-DepEd Engineer': [
            { label: 'Home', path: '/engineer-dashboard', icon: TbHomeEdit },
            { label: 'Projects', path: '/engineer-projects', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Local Government Unit': [
            { label: 'Projects', path: '/lgu-dashboard', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'School Head': [
            { label: 'Home', path: '/my-activity', icon: TbHomeEdit },
            { label: 'Modules', path: '/modular-dashboard', icon: LuCompass },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Admin': [
            { label: 'Home', path: '/admin-dashboard', icon: TbHomeEdit },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Human Resource': [
            { label: 'Home', path: '/hr-dashboard', icon: TbHomeEdit },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Regional Office': [
            { label: 'InsightED', path: '/monitoring-dashboard', state: { activeTab: 'home' }, icon: TbHomeEdit },
            { label: 'Infra', path: '/monitoring-dashboard', state: { activeTab: 'engineer' }, icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'School Division Office': [
            { label: 'Home', path: '/monitoring-dashboard', state: { activeTab: 'all' }, icon: TbHomeEdit },
            { label: 'Infra', path: '/monitoring-dashboard', state: { activeTab: 'engineer' }, icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Central Office': [
            { label: 'Home', path: '/monitoring-dashboard', state: { activeTab: 'accomplishment', resetFilters: true }, icon: TbHomeEdit },
            { label: 'Infra', path: '/monitoring-dashboard', state: { activeTab: 'infra', resetFilters: true }, icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Central Office Finance': [
            { label: 'Home', path: '/finance-dashboard', icon: TbHomeEdit },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'Masterlist': [
            { label: 'Home', path: '/psip', state: { activeTab: 'home' }, icon: TbHomeEdit },
            { label: 'Data', path: '/psip', state: { activeTab: 'data' }, icon: TbChartBar },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/psip', state: { activeTab: 'settings' }, icon: FiSettings },
        ],
        'EFD': [
            { label: 'Home', path: '/efd-dashboard', icon: TbHomeEdit },
            { label: 'Assignment', path: '/efd-monitoring', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'EFD Engineer': [
            { label: 'Home', path: '/efd-dashboard', icon: TbHomeEdit },
            { label: 'Assignment', path: '/efd-monitoring', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'HRODI Engineer': [
            { label: 'Home', path: '/efd-dashboard', icon: TbHomeEdit },
            { label: 'Assignment', path: '/efd-monitoring', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
            { label: 'Settings', path: '/profile', icon: FiSettings },
        ],
        'HRODI': [
            { label: 'Home', path: '/efd-dashboard', icon: TbHomeEdit },
            { label: 'Assignment', path: '/efd-monitoring', icon: TbClipboardList },
            { label: 'Chat', id: 'chatbot-toggle', icon: FiMessageSquare },
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
        <div style={styles.wrapper}>
            <div style={styles.navContainer}>
                {finalNavItems.map((item) => {
                    const isActive = location.pathname === item.path &&
                        (!item.state || location.state?.activeTab === item.state.activeTab || (!location.state?.activeTab && item.state.activeTab === 'all'));

                    const Icon = item.icon;

                    return (
                        <button
                            key={item.label}
                            style={styles.navButton}
                        onClick={() => {
                            if (item.id === 'chatbot-toggle') {
                                window.dispatchEvent(new CustomEvent('toggle-chatbot'));
                                return;
                            }
                            if (item.logout) {
                                localStorage.clear();
                                sessionStorage.clear();
                                navigate('/');
                                return;
                            }
                            navigate(item.path, { state: { ...(item.state || {}), refreshTrigger: Date.now() } });
                        }}
                        >
                            <Icon
                                size={24}
                                color={isActive ? '#004A99' : '#B0B0B0'}
                                style={styles.icon}
                            />
                            <span style={{
                                ...styles.label,
                                ...styles.label,
                                color: isActive ? '#004A99' : '#B0B0B0'
                            }}>
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

const styles = {
    wrapper: {
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100%',
        height: '70px',
        zIndex: 1000,
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
        display: 'flex',
        alignItems: 'center'
    },
    navContainer: {
        width: '100%',
        height: '100%',
        display: 'flex',
        justifyContent: 'space-around',
        alignItems: 'center'
    },
    navButton: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        height: '100%'
    },
    icon: {
        marginBottom: '4px',
        transition: 'all 0.2s ease'
    },
    label: {
        fontSize: '10px',
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: '0.02em'
    }
};

export default BottomNav;