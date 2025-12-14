import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Competitions } from './pages/Competitions';
import { Projects } from './pages/Projects';
import { Teams } from './pages/Teams';
import { Profile } from './pages/Profile';
import { Layout } from './components/Layout';
import { getSession } from './services/authService';
import { initializeDatabase } from './services/dataService';
import { User } from './types';

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      // Safety timeout: If database init hangs for more than 4 seconds, force load app
      const safetyTimer = setTimeout(() => {
        setIsLoading(false);
      }, 4000);

      try {
        // Initialize Database (Fetch Data)
        await initializeDatabase();
      } catch (error) {
        console.error("Initialization warning:", error);
      }

      const sessionUser = getSession();
      if (sessionUser) {
        setUser(sessionUser);
      }
      
      clearTimeout(safetyTimer);
      setIsLoading(false);
    };

    init();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
           <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600"></div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route 
          path="/login" 
          element={!user ? <Login onLoginSuccess={setUser} /> : <Navigate to="/" replace />} 
        />
        
        <Route
          path="/*"
          element={
            user ? (
              <Layout user={user} onLogout={() => setUser(null)}>
                <Routes>
                  <Route path="/" element={<Dashboard user={user} />} />
                  <Route path="/competitions" element={<Competitions user={user} />} />
                  <Route path="/projects" element={<Projects user={user} />} />
                  <Route path="/teams" element={<Teams user={user} />} />
                  <Route path="/profile" element={<Profile user={user} />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Layout>
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
    </Router>
  );
}

export default App;