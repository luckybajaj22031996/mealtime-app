import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Onboarding from './screens/Onboarding';
import Home from './screens/Home';
import Settings from './screens/Settings';
import { useUserStore } from './store/userStore';
import './App.css';

export default function App() {
  const { profile } = useUserStore();
  const hasProfile = profile && profile.completed;
  return (
    <Router>
      <Routes>
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/home" element={hasProfile ? <Home /> : <Navigate to="/onboarding" />} />
        <Route path="/settings" element={hasProfile ? <Settings /> : <Navigate to="/onboarding" />} />
        <Route path="*" element={<Navigate to={hasProfile ? "/home" : "/onboarding"} />} />
      </Routes>
    </Router>
  );
}
