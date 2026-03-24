import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';
import { getRoleGroup } from '../config/roleGroups';

const ProtectedRoute = ({ children, allowedRoles, allowedGroups }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return <LoadingScreen />;
    }

    // If not logged in, redirect to login
    if (!user) {
        const lastRole = localStorage.getItem('lastRole');
        const state = lastRole === 'School Head' ? { pathId: 'path_school_head' } : null;
        return <Navigate to="/login" replace state={state} />;
    }

    // Determine derived role for Super Users (if impersonating)
    const isSuperUser = user.role === 'Super User';
    const impersonatedRole = sessionStorage.getItem('impersonatedRole');
    const effectiveRole = (isSuperUser && impersonatedRole) ? impersonatedRole : user.role;
    const userGroup = getRoleGroup(effectiveRole);

    // Group-based check
    if (allowedGroups && !allowedGroups.includes(userGroup)) {
        return <Navigate to="/" replace />;
    }

    // Role-based check
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const isViewingAsSuperUser = sessionStorage.getItem('isViewingAsSuperUser') === 'true';
        if (isSuperUser && isViewingAsSuperUser) {
            // Allow Super User to access any impersonated dashboard
            return children;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
