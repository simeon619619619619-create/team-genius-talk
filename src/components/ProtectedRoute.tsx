import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProfile } from '@/hooks/useProfile';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, needsOnboarding } = useProfile();
  const navigate = useNavigate();
  const location = useLocation();
  
  const loading = authLoading || profileLoading;
  
  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth', { replace: true });
      return;
    }
    
    // Redirect to onboarding if not completed (except if already on onboarding page)
    if (!loading && user && needsOnboarding() && location.pathname !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
  }, [user, loading, navigate, needsOnboarding, location.pathname]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (!user) return null;
  
  // Allow onboarding page to render even if onboarding not completed
  if (location.pathname === '/onboarding') {
    return <>{children}</>;
  }
  
  // Block other pages if onboarding not completed
  if (needsOnboarding()) {
    return null;
  }
  
  return <>{children}</>;
}
