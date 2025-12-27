import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ROUTES } from '../../constants';

// Component imports - lazy loaded for better performance
const HomePage = React.lazy(() => import('../features/HomePage'));
const LobbyPage = React.lazy(() => import('../features/LobbyPage'));
const JoinPage = React.lazy(() => import('../features/JoinPage'));
const GamePage = React.lazy(() => import('../features/GamePage'));
// const ResultsPage = React.lazy(() => import('../features/ResultsPage'));

// Temporary placeholder component
const PlaceholderPage: React.FC<{ title: string }> = ({ title }) => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">{title}</h1>
      <p className="text-gray-600">This page will be implemented in Phase 5</p>
    </div>
  </div>
);

// Enhanced error boundary for debugging
class RouteErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Route Error Boundary caught an error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
          <div className="text-center max-w-md">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Something went wrong</h2>
            <p className="text-gray-600 mb-4">An error occurred while loading this page</p>
            
            {/* Show error details in development */}
            {import.meta.env.DEV && this.state.error && (
              <div className="bg-red-50 border border-red-200 rounded p-4 mb-4 text-left">
                <p className="text-red-800 font-mono text-sm break-all">
                  {this.state.error.message}
                </p>
                <details className="mt-2">
                  <summary className="text-red-600 cursor-pointer">Stack trace</summary>
                  <pre className="text-xs text-red-700 mt-2 overflow-auto">
                    {this.state.error.stack}
                  </pre>
                </details>
              </div>
            )}
            
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Refresh Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Loading component
const LoadingSpinner: React.FC = () => (
  <div className="min-h-screen flex items-center justify-center" style={{backgroundColor: '#323232'}}>
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
      <p className="mt-4 text-gray-200">Loading...</p>
    </div>
  </div>
);

// Not found component
const NotFoundPage: React.FC = () => (
  <div className="min-h-screen bg-gray-100 flex items-center justify-center">
    <div className="text-center">
      <h1 className="text-6xl font-bold text-gray-800 mb-4">404</h1>
      <h2 className="text-2xl font-semibold text-gray-600 mb-4">Page Not Found</h2>
      <p className="text-gray-500 mb-8">The page you're looking for doesn't exist.</p>
      <a 
        href="/"
        className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
      >
        Go Home
      </a>
    </div>
  </div>
);

export const Router: React.FC = () => {
  return (
    <BrowserRouter>
      <RouteErrorBoundary>
        <React.Suspense fallback={<LoadingSpinner />}>
          <Routes>
            <Route path={ROUTES.HOME} element={<HomePage />} />
            <Route path={ROUTES.LOBBY} element={<LobbyPage />} />
            <Route path={ROUTES.JOIN_WITH_CODE} element={<JoinPage />} />
            <Route path={ROUTES.GAME} element={<GamePage />} />
            <Route path={ROUTES.RESULTS} element={<PlaceholderPage title="Results Page" />} />
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </React.Suspense>
      </RouteErrorBoundary>
    </BrowserRouter>
  );
}; 