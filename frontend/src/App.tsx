import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/login";
import RegisterPage from "./pages/register";
import HospitalAdminDashboard from "./pages/hospitalAdmin";
import PatientDashboard from "./pages/patientDashboard";
import DoctorDashboard from "./pages/doctorDashboard";
import { Toaster } from "sonner";

function App() {
  return (
    <Router>
      {/* Toaster component allows the toast.success/error calls to show up */}
      <Toaster position="top-right" richColors />

      <Routes>
        {/* Redirect root to login */}
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/hospital-admin/dashboard" element={<HospitalAdminDashboard />} />

        <Route path="/patient/dashboard" element={<PatientDashboard />} />

        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />



      </Routes>
    </Router>
  );
}

export default App;