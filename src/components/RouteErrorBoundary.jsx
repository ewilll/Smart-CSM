import React from 'react';
import { Link } from 'react-router-dom';

export default class RouteErrorBoundary extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      // Safely check user role from localStorage
      let dashboardLink = '/dashboard';
      try {
        const userStr = localStorage.getItem('smart_csm_current_user');
        if (userStr) {
          const user = JSON.parse(userStr);
          if (user.role === 'admin') dashboardLink = '/admin';
        }
      } catch (e) {
        // Ignore JSON parse errors
      }

      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h1>
          <pre className="text-xs text-rose-600 max-w-lg overflow-auto text-left bg-white border rounded-lg p-4 mb-4">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <a href={dashboardLink} className="text-blue-600 font-semibold underline">
            Go to dashboard
          </a>
        </div>
      );
    }
    return this.props.children;
  }
}
