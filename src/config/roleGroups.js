export const ROLE_GROUPS = {
    EDUCATIONAL_ADMIN: 'EDUCATIONAL_ADMIN',
    TECHNICAL_FINANCE: 'TECHNICAL_FINANCE'
};

export const getRoleGroup = (role) => {
    if (!role) return null;
    
    // Grouping based on application logic in Login.jsx / ProtectedRoutes
    const educationalRoles = [
        'Human Resource',
        'Regional Office',
        'School Division Office',
        'Admin',
        'Super Admin',
        'Central Office',
        'Super User'
    ];
    
    const technicalRoles = [
        'Local Government Unit',
        'Central Office Finance',
        'Implementing Agency',
        'EFD',
        'EFD Engineer',
        'HRODI',
        'PGO',
        'CGO',
        'MGO',
        'DPWH',
        'CSO',
        'DepEd Engineer',
        'Non-DepEd Engineer',
        'Division Engineer',
        'Engineer'
    ];

    if (educationalRoles.includes(role)) return ROLE_GROUPS.EDUCATIONAL_ADMIN;
    if (technicalRoles.includes(role)) return ROLE_GROUPS.TECHNICAL_FINANCE;
    
    // School Head and unregistered paths fall back to null/undefined
    return null;
};
