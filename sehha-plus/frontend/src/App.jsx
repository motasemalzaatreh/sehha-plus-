import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import Login           from "./pages/Login";
import PatientDashboard from "./pages/Patient/PatientDashboard";
import DoctorDashboard  from "./pages/Doctor/DoctorDashboard";
import ManagerDashboard from "./pages/Manager/ManagerDashboard";

function PrivateRoute({ children, role }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}`} replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to={`/${user.role}`}/> : <Login/>}/>
      <Route path="/patient" element={<PrivateRoute role="patient"><PatientDashboard/></PrivateRoute>}/>
      <Route path="/doctor"  element={<PrivateRoute role="doctor"> <DoctorDashboard/> </PrivateRoute>}/>
      <Route path="/manager" element={<PrivateRoute role="manager"><ManagerDashboard/></PrivateRoute>}/>
      <Route path="*" element={<Navigate to="/login" replace/>}/>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes/>
      </BrowserRouter>
    </AuthProvider>
  );
}
