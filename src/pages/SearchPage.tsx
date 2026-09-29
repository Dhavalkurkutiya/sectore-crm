/**
 * Global Search Page — RBAC-aware
 * Sectore 360 — Phase 1, Part 6
 *
 * Scope rules:
 *  - admin/superadmin/manager/backoffice: full database
 *  - engineer: only tasks assigned to them (no customer browse, no engineer list)
 *  - customer: only their own tickets (tasks) — no customers, assets, engineers, AMCs
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { PageHeader } from '@/components/shared/PageHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { TaskStatusBadge, TaskPriorityBadge } from '@/components/task/TaskBadges';
import { StatusBadge, CustomerTypeBadge } from '@/components/customer/StatusBadge';
import { AMCStatusBadge, AMCContractTypeBadge } from '@/components/amc/AMCBadges';
import { customerService } from '@/services/customerService';
import { assetService } from '@/services/assetService';
import { taskService } from '@/services/taskService';
import { amcService } from '@/services/amcService';
import { engineerService } from '@/services/engineerService';
import { useAuth } from '@/contexts/AuthContext';
import { usePermissions } from '@/hooks/usePermissions';
import type { Customer, Asset } from '@/types/customer';
import type { Task } from '@/types/task';
import type { AMC } from '@/types/amc';
import type { EngineerProfile } from '@/types/engineer';
import { Search, Building2, Server, ArrowRight, Loader2, ClipboardList, FileText, HardHat, ShieldAlert } from 'lucide-react';

interface SearchResults {
  customers: Customer[];
  assets: Asset[];
  tasks: Task[];
  amcs: AMC[];
  engineers: EngineerProfile[];
}

export default function SearchPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isEngineer, isCustomer, can } = usePermissions();
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(searchParams.get('q') ?? '');
  const [results, setResults] = useState<SearchResults>({ customers: [], assets: [], tasks: [], amcs: [], engineers: [] });
  const [loading, setLoading] = useState(false);

  // Debounced server-side search — fires only when ≥2 chars, cancels stale requests
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults({ customers: [], assets: [], tasks: [], amcs: [], engineers: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const searches: Promise<unknown>[] = [];

        if (!isEngineer && !isCustomer && can('view', 'customers'))
          searches.push(customerService.search(q, 10));
        else
          searches.push(Promise.resolve([]));

        if (!isEngineer && !isCustomer && can('view', 'assets'))
          searches.push(assetService.list(true).then((all) =>
            all.filter((a) =>
              a.serialNumber.toLowerCase().includes(q.toLowerCase()) ||
              (a.model ?? '').toLowerCase().includes(q.toLowerCase()) ||
              (a.brand ?? '').toLowerCase().includes(q.toLowerCase()) ||
              a.code.toLowerCase().includes(q.toLowerCase()) ||
              a.deviceType.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 10)
          ));
        else
          searches.push(Promise.resolve([]));

        if (can('view', 'tasks')) {
          const taskOpts = isEngineer
            ? { search: q, engineerId: user?.id, limit: 10 }
            : isCustomer
            ? { search: q, customerId: user?.customerId, limit: 10 }
            : { search: q, limit: 10 };
          searches.push(taskService.list(taskOpts));
        } else {
          searches.push(Promise.resolve([]));
        }

        if (!isEngineer && !isCustomer && can('view', 'amc'))
          searches.push(amcService.list({ search: q, limit: 10 } as Parameters<typeof amcService.list>[0]));
        else
          searches.push(Promise.resolve([]));

        if (!isEngineer && !isCustomer && can('view', 'engineers'))
          searches.push(engineerService.getAllProfiles().then((all) =>
            all.filter((e) =>
              e.name.toLowerCase().includes(q.toLowerCase()) ||
              e.employeeId.toLowerCase().includes(q.toLowerCase()) ||
              e.mobile.includes(q) ||
              e.email.toLowerCase().includes(q.toLowerCase()) ||
              e.specialization.toLowerCase().includes(q.toLowerCase())
            ).slice(0, 10)
          ));
        else
          searches.push(Promise.resolve([]));

        const [c, a, t, amcs, engineers] = await Promise.all(searches);
        setResults({
          customers: c as Customer[],
          assets:    a as Asset[],
          tasks:     t as Task[],
          amcs:      amcs as AMC[],
          engineers: engineers as EngineerProfile[],
        });
      } catch {
        // keep previous results on error
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, user?.id, isEngineer, isCustomer]);

  const handleSearch = (value: string) => {
    setQuery(value);
    if (value.trim()) setSearchParams({ q: value });
    else setSearchParams({});
  };

  // Customer name lookup — built from whatever the cache already has (free, no extra fetch)
  const custMap = useMemo(() => {
    const cached = results.customers.length > 0
      ? results.customers
      : ([] as import('@/types/customer').Customer[]);
    return Object.fromEntries(cached.map((c) => [c.id, c.companyName]));
  }, [results.customers]);

  const totalResults = results.customers.length + results.assets.length + results.tasks.length + results.amcs.length + results.engineers.length;
  const hasQuery = query.trim().length >= 2;

  // Scope label for UI
  const scopeLabel = isEngineer
    ? 'Searching your assigned tasks only'
    : isCustomer
    ? 'Searching your tickets only'
    : 'Searching entire database';

  const scopeBadges = isEngineer
    ? ['Task Number', 'Status', 'Priority']
    : isCustomer
    ? ['Ticket Number', 'Status', 'Priority', 'Issue Description']
    : ['Task Number', 'AMC Number', 'Company', 'Serial Number', 'Engineer', 'Employee ID', 'Status', 'Priority', 'Customer Code', 'Mobile', 'Model / Brand'];

  return (
    <DashboardLayout>
      <PageHeader
        title="Global Search"
        description="Search across customers, assets, tasks, serial numbers, and more."
        breadcrumbs={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Search' }]}
      />

      {/* RBAC scope indicator */}
      {(isEngineer || isCustomer) && (
        <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground bg-muted/40 px-3 py-2 rounded-lg w-fit">
          <ShieldAlert size={13} className="text-warning shrink-0" />
          {scopeLabel}
        </div>
      )}

      {/* Search bar */}
      <div className="relative max-w-2xl mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <Input
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={isEngineer ? 'Search your assigned tasks…' : isCustomer ? 'Search your tickets…' : 'Search customers, assets, tasks, serial numbers…'}
          className="pl-9 h-11 text-base"
          autoFocus
        />
        {loading && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-muted-foreground" />}
      </div>

      {/* Scope badges */}
      <div className="flex flex-wrap gap-2 mb-6">
        {scopeBadges.map((t) => (
          <Badge key={t} variant="outline" className="text-xs text-muted-foreground">{t}</Badge>
        ))}
      </div>

      {/* Results */}
      {hasQuery && !loading && (
        <div className="flex flex-col gap-6">
          <p className="text-sm text-muted-foreground">
            {totalResults === 0
              ? 'No results found.'
              : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${query}"`}
          </p>

          {/* Engineers */}
          {results.engineers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <HardHat size={14} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Engineers</h3>
                <Badge variant="outline" className="text-xs">{results.engineers.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {results.engineers.map((e) => (
                  <Card
                    key={e.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate('/engineer/profile')}
                  >
                    <HardHat size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.employeeId} · {e.specialization} · {e.mobile}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{e.yearsOfExperience}y exp</Badge>
                      <ArrowRight size={13} className="text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.engineers.length > 0 && results.amcs.length > 0 && <Separator />}

          {/* AMC Contracts */}
          {results.amcs.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <FileText size={14} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">AMC Contracts</h3>
                <Badge variant="outline" className="text-xs">{results.amcs.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {results.amcs.map((a) => (
                  <Card
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/amc/${a.id}`)}
                  >
                    <FileText size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground font-mono">{a.amcNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {a.customerName} · {a.contractType} · {a.visitFrequency}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <AMCContractTypeBadge type={a.contractType} />
                      <AMCStatusBadge status={a.status} />
                      <ArrowRight size={13} className="text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.amcs.length > 0 && results.tasks.length > 0 && <Separator />}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <ClipboardList size={14} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Tasks</h3>
                <Badge variant="outline" className="text-xs">{results.tasks.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {results.tasks.map((t) => (
                  <Card
                    key={t.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/tasks/${t.id}`)}
                  >
                    <ClipboardList size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground font-mono">{t.taskNumber}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {custMap[t.customerId] ?? t.customerId} · {t.taskType}
                        {t.engineerName ? ` · ${t.engineerName}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <TaskPriorityBadge priority={t.priority} />
                      <TaskStatusBadge status={t.status} />
                      <ArrowRight size={13} className="text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.tasks.length > 0 && (results.customers.length > 0 || results.assets.length > 0) && <Separator />}

          {/* Customers */}
          {results.customers.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Building2 size={14} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Customers</h3>
                <Badge variant="outline" className="text-xs">{results.customers.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {results.customers.map((c) => (
                  <Card
                    key={c.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/customers/${c.id}`)}
                  >
                    <Building2 size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.companyName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.code} · {c.contactPerson} · {c.primaryMobile}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <CustomerTypeBadge type={c.customerType} />
                      <StatusBadge status={c.status} />
                      <ArrowRight size={13} className="text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {results.customers.length > 0 && results.assets.length > 0 && <Separator />}

          {/* Assets */}
          {results.assets.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Server size={14} className="text-primary" />
                <h3 className="text-sm font-semibold text-foreground">Assets</h3>
                <Badge variant="outline" className="text-xs">{results.assets.length}</Badge>
              </div>
              <div className="flex flex-col gap-2">
                {results.assets.map((a) => (
                  <Card
                    key={a.id}
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => navigate(`/assets/${a.id}`)}
                  >
                    <Server size={14} className="text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {a.brand ?? ''} {a.model ?? ''}{(!a.brand && !a.model) ? a.code : ''}
                      </p>
                      <p className="text-xs text-muted-foreground font-mono">
                        {a.code} · SN: {a.serialNumber}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant="outline" className="text-xs">{a.category}</Badge>
                      <StatusBadge status={a.status} />
                      <ArrowRight size={13} className="text-muted-foreground" />
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {!hasQuery && !loading && (
        <div className="text-center py-16 text-muted-foreground">
          <Search size={40} className="mx-auto mb-3 opacity-20" />
          <p className="text-sm">Type at least 2 characters to search</p>
        </div>
      )}
    </DashboardLayout>
  );
}
