import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "./authHooks";

export function ProtectedRoute() {
  const { session, loading } = useSession();
  const location = useLocation();
  if (loading) return <div className="grid min-h-screen place-items-center">Loading vault...</div>;
  if (!session) return <Navigate to="/login" replace state={{ from: location }} />;
  return <Outlet />;
}
