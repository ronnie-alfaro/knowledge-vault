import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../../shared/lib/supabase";

export function AuthCallback() {
  const navigate = useNavigate();
  useEffect(() => {
    supabase.auth.getSession().finally(() => navigate("/dashboard", { replace: true }));
  }, [navigate]);
  return <div className="grid min-h-screen place-items-center">Finishing sign in...</div>;
}
