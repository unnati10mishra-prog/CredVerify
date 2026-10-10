import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { LandingPage } from './pages/public/LandingPage';
import { VerifyPage } from './pages/public/VerifyPage';
import { LoginPage } from './pages/auth/LoginPage';
import { InstitutionDashboard } from './pages/institution/InstitutionDashboard';
import { StudentWalletPage } from './pages/student/StudentWalletPage';
import { AdminAuditPage } from './pages/admin/AdminAuditPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-500/30 selection:text-white">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/verify" element={<VerifyPage />} />
            <Route path="/verify/:credentialId" element={<VerifyPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/institution" element={<InstitutionDashboard />} />
            <Route path="/student" element={<StudentWalletPage />} />
            <Route path="/admin" element={<AdminAuditPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </BrowserRouter>
  );
};

export default App;
