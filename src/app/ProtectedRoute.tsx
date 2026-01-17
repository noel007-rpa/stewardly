import { Navigate, Outlet } from "react-router-dom";
import { getSession } from "../state/sessionStore";

export function ProtectedRoute() {
  const { accessToken } = getSession();
  return accessToken ? <Outlet /> : <Navigate to="/login" replace />;
}
