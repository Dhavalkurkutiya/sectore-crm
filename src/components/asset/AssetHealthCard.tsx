/**
 * AssetHealthCard
 * Sectore 360 — Phase 1 Final Enhancement
 *
 * Reusable component to display asset health score, level badge,
 * frequent breakdown alert, and smart replacement recommendations.
 * Used in: AssetProfilePage, TaskDetailPage, CustomerDashboard, AdminDashboard.
 */
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { assetHealthService } from '@/services/assetHealthService';
import type { Asset } from '@/types/customer';
import type { Task } from '@/types/task';
import { AlertTriangle, Heart, ShieldAlert, TrendingDown, Wrench, ZoomIn, ArrowUpRight } from 'lucide-react';

interface AssetHealthCardProps {
  asset: Asset;
  tasks?: Task[];  // pre-loaded tasks for accurate scoring
  compact?: boolean;
}

export function AssetHealthCard({ asset, tasks = [], compact = false }: AssetHealthCardProps) {
  const health = useMemo(() => assetHealthService.getHealth(asset, tasks), [asset, tasks]);

  const recIcon = (type: string) => {
    switch (type) {
      case 'replace':    return <TrendingDown size={13} />;
      case 'upgrade':    return <ArrowUpRight size={13} />;
      case 'inspection': return <ZoomIn size={13} />;
      default:           return <Wrench size={13} />;
    }
  };

  if (compact) {
    return (
      <div className={`rounded-lg border p-3 flex flex-col gap-2 ${assetHealthService.levelBg(health.level)}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <Heart size={14} className={assetHealthService.levelColor(health.level)} />
            <span className="text-xs font-semibold text-foreground">Asset Health</span>
          </div>
          <span className={`text-lg font-bold ${assetHealthService.levelColor(health.level)}`}>
            {health.score}%
          </span>
        </div>
        {/* Score bar */}
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${assetHealthService.scoreBarColor(health.score)}`}
            style={{ width: `${health.score}%` }}
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className={`text-xs font-medium ${assetHealthService.levelColor(health.level)}`}>
            {health.level}
          </span>
          {health.frequentBreakdownAlert && (
            <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-4 gap-1">
              <AlertTriangle size={9} /> {health.breakdownCount} Breakdowns
            </Badge>
          )}
        </div>
        {health.frequentBreakdownAlert && (
          <div className="flex items-start gap-1.5 rounded-md bg-destructive/10 border border-destructive/20 p-2">
            <AlertTriangle size={12} className="text-destructive mt-0.5 shrink-0" />
            <p className="text-xs text-destructive font-medium">
              ⚠ Frequent Breakdown Alert — This asset has required service {health.breakdownCount} times.
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Heart size={15} className={assetHealthService.levelColor(health.level)} />
          Asset Health Score
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {/* Score + bar */}
        <div className="flex items-center gap-4">
          <div className="text-4xl font-bold tabular-nums leading-none">
            <span className={assetHealthService.levelColor(health.level)}>{health.score}</span>
            <span className="text-xl text-muted-foreground">%</span>
          </div>
          <div className="flex-1 flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className={`text-sm font-semibold ${assetHealthService.levelColor(health.level)}`}>
                {health.level}
              </span>
              <span className="text-xs text-muted-foreground">{health.totalServiceCalls} total service calls</span>
            </div>
            <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${assetHealthService.scoreBarColor(health.score)}`}
                style={{ width: `${health.score}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Breakdowns', value: health.breakdownCount, danger: health.breakdownCount >= 4 },
            { label: 'Repairs', value: health.repairCount, danger: false },
            { label: 'Age (yrs)', value: health.ageYears.toFixed(1), danger: health.ageYears > 4 },
          ].map(({ label, value, danger }) => (
            <div key={label} className={`rounded-lg border p-2 text-center ${danger ? 'border-destructive/30 bg-destructive/5' : 'bg-muted/30'}`}>
              <p className={`text-lg font-bold tabular-nums ${danger ? 'text-destructive' : 'text-foreground'}`}>{value}</p>
              <p className="text-[10px] text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>

        {/* Frequent Breakdown Alert */}
        {health.frequentBreakdownAlert && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
            <ShieldAlert size={16} className="text-destructive mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-destructive">⚠ Frequent Breakdown Alert</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                This asset has required service {health.breakdownCount} times. A detailed inspection or replacement is recommended.
              </p>
            </div>
          </div>
        )}

        {/* Recommendations */}
        {health.recommendations.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Smart Recommendations</p>
            {health.recommendations.map((rec) => (
              <div key={rec.type} className="flex items-start gap-2 rounded-md border bg-muted/20 p-2.5">
                <span className={`mt-0.5 shrink-0 ${assetHealthService.levelColor(health.level)}`}>
                  {recIcon(rec.type)}
                </span>
                <div>
                  <p className="text-xs font-semibold text-foreground">{rec.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{rec.reason}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
