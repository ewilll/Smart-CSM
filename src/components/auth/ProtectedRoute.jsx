import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { isAuthenticated, getCurrentUser } from '../../utils/auth';

/**
 * A wrapper component for routes that require any authenticated user.
 * Redirects to /login if the user is not authenticated.
 */
const ProtectedRoute = ({ children }) => {
    const location = useLocation();
    const user = getCurrentUser();

    if (!isAuthenticated()) {
        // Redirect them to the /login page, but save the current location they were
        // trying to go to when they were redirected. This allows us to send them
        // along to that page after they login, which is a nicer user experience
        // than dropping them off on the home page.
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (user?.role === 'admin') {
        // Prevent admins from accessing the customer dashboard
        return <Navigate to="/admin" replace />;
    }

    return children;
};

export default ProtectedRoute;
