import { Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import UserDashboard from "./pages/user/UserDashboard";
import SubmitComplaint from "./pages/user/SubmitComplaint";
import MyComplaints from "./pages/user/MyComplaints";
import EngineerDashboard from "./pages/engineer/EngineerDashboard";
import ResolveTicket from "./pages/engineer/ResolveTicket";
import AdminDashboard from "./pages/admin/AdminDashboard";
import ManageTickets from "./pages/admin/ManageTickets";
import ManageEngineers from "./pages/admin/ManageEngineers";
import ManageDepartments from "./pages/admin/ManageDepartments";
import MapView from "./pages/admin/MapView";
import ManualQueue from "./pages/admin/ManualQueue";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, userProfile, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center min-h-screen"><div className="spinner" /></div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(userProfile?.role)) {
    return <Navigate to="/" />;
  }
  return children;
}

export default function App() {
  const { user, userProfile } = useAuth();

  const getDefaultRoute = () => {
    if (!user) return "/";
    switch (userProfile?.role) {
      case "admin": return "/admin";
      case "engineer": return "/engineer";
      default: return "/citizen";
    }
  };

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={getDefaultRoute()} /> : <Landing />} />
      <Route path="/login" element={user ? <Navigate to={getDefaultRoute()} /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to={getDefaultRoute()} /> : <Register />} />

      {/* Citizen Routes */}
      <Route path="/citizen" element={<ProtectedRoute allowedRoles={["user"]}><UserDashboard /></ProtectedRoute>} />
      <Route path="/citizen/submit" element={<ProtectedRoute allowedRoles={["user"]}><SubmitComplaint /></ProtectedRoute>} />
      <Route path="/citizen/complaints" element={<ProtectedRoute allowedRoles={["user"]}><MyComplaints /></ProtectedRoute>} />

      {/* Engineer Routes */}
      <Route path="/engineer" element={<ProtectedRoute allowedRoles={["engineer"]}><EngineerDashboard /></ProtectedRoute>} />
      <Route path="/engineer/resolve/:ticketId" element={<ProtectedRoute allowedRoles={["engineer"]}><ResolveTicket /></ProtectedRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>} />
      <Route path="/admin/tickets" element={<ProtectedRoute allowedRoles={["admin"]}><ManageTickets /></ProtectedRoute>} />
      <Route path="/admin/engineers" element={<ProtectedRoute allowedRoles={["admin"]}><ManageEngineers /></ProtectedRoute>} />
      <Route path="/admin/departments" element={<ProtectedRoute allowedRoles={["admin"]}><ManageDepartments /></ProtectedRoute>} />
      <Route path="/admin/map" element={<ProtectedRoute allowedRoles={["admin"]}><MapView /></ProtectedRoute>} />
      <Route path="/admin/manual-queue" element={<ProtectedRoute allowedRoles={["admin"]}><ManualQueue /></ProtectedRoute>} />

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}
