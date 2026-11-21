/**
 * App Shell - React Router wiring for SaaS pages + legacy editor
 */
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthInit } from './hooks/useAuth.js';
import Landing from './components/Landing.jsx';
import Trial from './components/Trial.jsx';
import LegacyEditor from './LegacyEditor.jsx';
import { LoginForm, RegisterForm, ProfilePage, ProtectedRoute } from './components/Auth.jsx';
import { PricingPage } from './components/Pricing.jsx';
import { AffiliatePage } from './components/Affiliate.jsx';
import { AdminPage } from './components/Admin.jsx';
import { SettingsPage } from './components/Settings.jsx';
import { EditorLayout } from './components/Editor.jsx';

export default function App() {
  useAuthInit();

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/app" element={<Navigate to="/app/trial" replace />} />
        <Route path="/app/trial" element={<Trial />} />
        <Route path="/studio" element={<LegacyEditor />} />
        <Route path="/editor" element={<EditorLayout />} />
        <Route path="/login" element={<LoginForm />} />
        <Route path="/register" element={<RegisterForm />} />
        <Route path="/pricing" element={<PricingPage />} />
        <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/affiliate" element={<ProtectedRoute><AffiliatePage /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute><AdminPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}