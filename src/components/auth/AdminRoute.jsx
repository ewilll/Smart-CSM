import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getCurrentUser, isAuthenticated } from '../../utils/auth';

/**
 * A wrapper component for routes that require an admin user.
 * Redirects to /dashboard if the user is authenticated but not an admin.
 * Redirects to /login if the user is not authenticated at all.
 */
const AdminRoute = ({ children }) => {
    const location = useLocation();
    const user = getCurrentUser();

    if (!isAuthenticated()) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role !== 'admin') {
        // If they are not an admin, redirect to the resident dashboard
        return <Navigate to="/dashboard" replace />;
    }

    return children;
};

export default AdminRoute;
