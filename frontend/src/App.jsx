import { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "./stores/authStore";
import PageWrapper from "./components/layout/PageWrapper";
import Spinner from "./components/common/Spinner";
import Landing from "./pages/Landing";
import Login from "./pages/Login";

// Code-split every console page so the landing/login bundle stays small.
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Events = lazy(() => import("./pages/Events"));
const Alerts = lazy(() => import("./pages/Alerts"));
const Incidents = lazy(() => import("./pages/Incidents"));
const Assistant = lazy(() => import("./pages/Assistant"));
const Intelligence = lazy(() => import("./pages/Intelligence"));
const Analytics = lazy(() => import("./pages/Analytics"));
const ModelPerformance = lazy(() => import("./pages/ModelPerformance"));
const UserManagement = lazy(() => import("./pages/UserManagement"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const LiveStream = lazy(() => import("./pages/LiveStream"));
const AttackPaths = lazy(() => import("./pages/AttackPaths"));

const Fallback = () => (
  <div className="flex min-h-[40vh] items-center justify-center">
    <Spinner />
  </div>
);

function ProtectedRoute({ children, adminOnly = false }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const role = useAuthStore((s) => s.user?.role);
  const location = useLocation();
  if (!isAuthenticated) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (adminOnly && role !== "admin") return <Navigate to="/dashboard" replace />;
  return (
    <PageWrapper>
      <Suspense fallback={<Fallback />}>{children}</Suspense>
    </PageWrapper>
  );
}

// Signed-in users have no business on the login page.
function PublicOnlyRoute({ children }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const location = useLocation();
  if (isAuthenticated) return <Navigate to={location.state?.from || "/dashboard"} replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/live" element={<ProtectedRoute><LiveStream /></ProtectedRoute>} />
        <Route path="/events" element={<ProtectedRoute><Events /></ProtectedRoute>} />
        <Route path="/alerts" element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
        <Route path="/incidents" element={<ProtectedRoute><Incidents /></ProtectedRoute>} />
        <Route path="/attack-paths" element={<ProtectedRoute><AttackPaths /></ProtectedRoute>} />
        <Route path="/intelligence" element={<ProtectedRoute><Intelligence /></ProtectedRoute>} />
        <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
        <Route path="/models" element={<ProtectedRoute><ModelPerformance /></ProtectedRoute>} />
        <Route path="/assistant" element={<ProtectedRoute><Assistant /></ProtectedRoute>} />
        <Route path="/users" element={<ProtectedRoute adminOnly><UserManagement /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
