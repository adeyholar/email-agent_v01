// main.tsx - React Application Entry Point
// Initializes the React app with routing and global styles

import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import EmailDashboard from './components/emailDashboard.jsx'
import './index.css'

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Email Agent Error:', error, errorInfo);
  }

  render() {
    if ((this.state as any).hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-gray-900 mb-4">Something went wrong</h1>
            <p className="text-gray-600 mb-6">Please refresh the page or contact support.</p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Main App Component
const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Routes>
            <Route path="/" element={<EmailDashboard />} />
            <Route path="/dashboard" element={<EmailDashboard />} />
            <Route path="*" element={
              <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-2xl font-bold text-gray-900 mb-4">Page Not Found</h1>
                  <p className="text-gray-600 mb-6">The page you're looking for doesn't exist.</p>
                  <a 
                    href="/"
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 inline-block"
                  >
                    Go to Dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </Router>
    </ErrorBoundary>
  );
};

// Initialize React app
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)