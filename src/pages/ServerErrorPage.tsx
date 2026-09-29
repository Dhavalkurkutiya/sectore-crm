/**
 * 500 Server Error Page
 * Sectore 360 — Part 6
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ServerCrash } from 'lucide-react';

export default function ServerErrorPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-background">
      <div className="w-20 h-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <ServerCrash size={36} className="text-destructive" />
      </div>
      <div>
        <p className="text-7xl font-black text-destructive mb-2">500</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Server Error</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          Something went wrong on our end. Please try again or contact support.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
        <Button onClick={() => navigate('/dashboard')}>Back to Home</Button>
      </div>
      <p className="text-xs text-muted-foreground">Sectore 360 · Sectore Tecknologies</p>
    </div>
  );
}
