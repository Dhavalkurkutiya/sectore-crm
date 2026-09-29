/**
 * 404 Not Found Page
 * Sectore 360 — Part 6
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { FileQuestion } from 'lucide-react';

export default function NotFoundPage() {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 p-8 text-center bg-background">
      <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center">
        <FileQuestion size={36} className="text-muted-foreground" />
      </div>
      <div>
        <p className="text-7xl font-black text-primary mb-2">404</p>
        <h1 className="text-2xl font-bold text-foreground mb-2">Page Not Found</h1>
        <p className="text-muted-foreground max-w-sm text-sm">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={() => navigate(-1)} variant="outline">Go Back</Button>
        <Button onClick={() => navigate('/dashboard')}>Back to Home</Button>
      </div>
      <p className="text-xs text-muted-foreground">Sectore 360 · Sectore Tecknologies</p>
    </div>
  );
}
