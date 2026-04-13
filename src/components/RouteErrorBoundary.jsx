import React from 'react';
import { Link, useLocation } from 'react-router-dom';

class RouteErrorBoundaryInner extends React.Component {
  state = { error: null };

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Route render error:', error, info?.componentStack);
  }

  componentDidUpdate(prevProps) {
    // Auto-recover the boundary after route changes so one broken page
    // does not keep the whole app stuck on the fallback screen.
    if (this.state.error && prevProps.locationKey !== this.props.locationKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6 text-center">
          <h1 className="text-lg font-bold text-slate-800 mb-2">Something went wrong</h1>
          <pre className="text-xs text-rose-600 max-w-lg overflow-auto text-left bg-white border rounded-lg p-4 mb-4">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <Link to="/dashboard" className="text-blue-600 font-semibold underline">
            Go to dashboard
          </Link>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function RouteErrorBoundary(props) {
  const location = useLocation();
  const locationKey = `${location.pathname}${location.search}`;
  return <RouteErrorBoundaryInner locationKey={locationKey} {...props} />;
}
