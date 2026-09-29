/**
 * 403 Unauthorized Page
 * Sectore 360 — Part 6
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ShieldOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getDefaultRoute } from '@/lib/permissions';

export default function UnauthorizedPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const home = user ? getDefaultRoute(user.role) : '/dashboard';

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-background">
      <div className="w-20 h-20 rounded-full bg-warning/10 flex items-center justify-center">
        <ShieldOff size={36} className="text-warning" />
      </div>
      <div>
        <p className="text-7xl font-black text-warning mb-2">403</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          You do not have permission to access this page. Contact your administrator if you believe this is an error.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
        <Button onClick={() => navigate(home)}>Back to Home</Button>
      </div>
      <p className="text-xs text-muted-foreground">Sectore 360 · Sectore Tecknologies</p>
    </div>
  );
}
