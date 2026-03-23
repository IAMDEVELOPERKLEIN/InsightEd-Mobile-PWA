import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingScreen from './LoadingScreen';

const ProtectedRoute = ({ children, allowedRoles }) => {
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

    // If role is not allowed, redirect to home
    // EXCEPT if the user is a Super User in "viewing as" mode
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        const isViewingAsSuperUser = sessionStorage.getItem('isViewingAsSuperUser') === 'true';
        if (user.role === 'Super User' && isViewingAsSuperUser) {
            // Allow Super User to access any impersonated dashboard
            return children;
        }
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;
