import { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { profileExtensionsService } from '../../services/profileExtensionsService';
import { Loader2 } from 'lucide-react';

export default function OnboardingGuard({ children }) {
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [forceRedirect, setForceRedirect] = useState(false);

  useEffect(() => {
    let cancelled = false;
    profileExtensionsService.getOnboardingStatus()
      .then((res) => {
        if (!cancelled) {
          setForceRedirect(!!res.data?.data?.forceRedirect);
        }
      })
      .catch(() => {
        if (!cancelled) setForceRedirect(false);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [location.pathname]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[40vh]">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  if (forceRedirect && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  return children;
}
