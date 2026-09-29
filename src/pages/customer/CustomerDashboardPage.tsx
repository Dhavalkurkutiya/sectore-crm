/**
 * Customer Dashboard Page — Phase 1 RC2
 * Sectore 360 — ALL data strictly filtered to user.customerId
 * NEVER loads company-wide tables. Every query: WHERE customerId = loggedInCustomerId
 */
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { DashboardLayout } from '@/components/layouts/DashboardLayout';
import { companyProfileService } from '@/services/companyProfileService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { taskService } from '@/services/taskService';
import { amcService } from '@/services/amcService';
import { assetService } from '@/services/assetService';
import {
  Package, ClipboardList, CheckCircle2, Calendar,
  ShieldCheck, PlusCircle, Ticket, FileText, Building2,
  Phone, Mail, MessageCircle, HeartHandshake,
} from 'lucide-react';

export default function CustomerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const company = companyProfileService.get();

  // customerId is the customers.id linked to this user account
  const customerId = user?.customerId;

  const [openTickets,       setOpenTickets]       = useState(0);
  const [completedTickets,  setCompletedTickets]  = useState(0);
  const [activeAMC,         setActiveAMC]         = useState(0);
  const [totalAssets,       setTotalAssets]       = useState(0);
  const [assetsWithPurchase, setAssetsWithPurchase] = useState(0);
  const [recentTasks,       setRecentTasks]       = useState<Awaited<ReturnType<typeof taskService.list>>>([]);
  const [upcomingTasks,     setUpcomingTasks]     = useState<Awaited<ReturnType<typeof taskService.list>>>([]);
  const [loading,           setLoading]           = useState(true);

  useEffect(() => {
    if (!customerId) return;
    setLoading(true);

    Promise.all([
      // Tickets — filtered by THIS customer only
      taskService.getStatsByCustomer(customerId),
      // Recent tickets — filtered by THIS customer only
      taskService.list({ customerId, includeCancelled: true, limit: 5 }),
      // Upcoming visits — open tickets with a visit date, THIS customer only
      taskService.list({ customerId, includeCancelled: false }),
      // AMC contracts — THIS customer only
      amcService.list({ customerId }),
      // Assets — THIS customer only
      assetService.getByCustomer(customerId),
    ]).then(([stats, recent, all, amcs, assets]) => {
      setOpenTickets(stats.openTickets);
      setCompletedTickets(stats.completedTickets);
      setRecentTasks(recent);
      setUpcomingTasks(
        all.filter((t) => t.expectedVisitDate && !['Completed', 'Closed', 'Cancelled'].includes(t.status))
           .slice(0, 3),
      );
      setActiveAMC(amcs.filter((a) => a.status === 'Active').length);
      setTotalAssets(assets.length);
      setAssetsWithPurchase(assets.filter((a) => a.purchaseDate).length);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [customerId]);

  const stats = [
    { label: 'Active AMC Contracts', value: activeAMC,        icon: ShieldCheck, color: 'text-primary'   },
    { label: 'Open Tickets',         value: openTickets,       icon: Ticket,       color: 'text-amber-600' },
    { label: 'Completed Tickets',    value: completedTickets,  icon: CheckCircle2, color: 'text-green-600' },
    { label: 'Registered Assets',    value: totalAssets,       icon: Package,      color: 'text-primary'   },
  ];

  return (
    <DashboardLayout>
      <div className="flex flex-col gap-6 max-w-4xl mx-auto pb-8">

        {/* Header */}
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <Building2 size={20} className="text-primary" />
            <h1 className="text-xl font-bold text-foreground">{user?.name ?? 'Customer'}</h1>
          </div>
          <p className="text-sm text-muted-foreground">Welcome to your Sectore 360 portal</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {stats.map(({ label, value, icon: Icon, color }) => (
            <Card key={label}>
              <CardContent className="p-4 flex flex-col gap-2">
                <Icon size={18} className={color} />
                <p className="text-2xl font-bold text-foreground">
                  {loading ? <span className="inline-block h-7 w-8 bg-muted animate-pulse rounded" /> : value}
                </p>
                <p className="text-xs text-muted-foreground leading-tight">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-foreground mb-3">Quick Actions</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button className="h-auto flex-col gap-1.5 py-4" onClick={() => navigate('/customer/raise-request')}>
              <PlusCircle size={18} /><span className="text-xs">Raise Request</span>
            </Button>
            <Button variant="secondary" className="h-auto flex-col gap-1.5 py-4" onClick={() => navigate('/customer/tickets')}>
              <Ticket size={18} /><span className="text-xs">My Tickets</span>
            </Button>
            <Button variant="secondary" className="h-auto flex-col gap-1.5 py-4" onClick={() => navigate('/customer/assets')}>
              <Package size={18} /><span className="text-xs">My Assets</span>
            </Button>
            <Button variant="secondary" className="h-auto flex-col gap-1.5 py-4" onClick={() => navigate('/customer/reports')}>
              <FileText size={18} /><span className="text-xs">Reports</span>
            </Button>
          </div>
        </div>

        {/* Support Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <HeartHandshake size={15} className="text-primary" />Need Help?
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">{company.name} — {company.tagline}</p>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">Emergency Support</span>
                <span className="font-semibold">+91 {company.emergencyPhone}</span>
              </div>
              {company.secondaryPhone && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">Office</span>
                  <span className="font-semibold">+91 {company.secondaryPhone}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground text-xs">Email</span>
                <span className="font-semibold text-xs truncate max-w-[60%] text-right">{company.supportEmail}</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-1">
              <a href={`tel:+91${company.emergencyPhone}`}>
                <Button variant="outline" className="w-full gap-1.5 h-10 text-xs" type="button">
                  <Phone size={13} className="text-primary" />Call
                </Button>
              </a>
              <a href={`mailto:${company.supportEmail}`}>
                <Button variant="outline" className="w-full gap-1.5 h-10 text-xs" type="button">
                  <Mail size={13} className="text-primary" />Email
                </Button>
              </a>
              <a href={`https://wa.me/91${company.emergencyPhone}?text=${encodeURIComponent('Hello, I need technical support.')}`} target="_blank" rel="noreferrer">
                <Button variant="outline" className="w-full gap-1.5 h-10 text-xs" type="button">
                  <MessageCircle size={13} className="text-green-600" />WhatsApp
                </Button>
              </a>
            </div>
          </CardContent>
        </Card>

        {/* Upcoming visits */}
        {upcomingTasks.length > 0 && (
          <Card>
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar size={14} className="text-primary" />Upcoming Visits
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4 flex flex-col gap-2">
              {upcomingTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex flex-col gap-0.5">
                    <p className="text-sm font-medium font-mono">{t.taskNumber}</p>
                    <p className="text-xs text-muted-foreground">{t.expectedVisitDate ?? 'TBD'}</p>
                  </div>
                  <Badge variant="outline" className="text-xs">{t.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Warranty summary */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ShieldCheck size={14} className="text-primary" />Warranty Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Assets with purchase records</p>
              <Badge className="bg-primary/10 text-primary border-0">
                {assetsWithPurchase} of {totalAssets}
              </Badge>
            </div>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => navigate('/customer/assets')}>
              <Package size={14} className="mr-1.5" />View All Assets
            </Button>
          </CardContent>
        </Card>

        {/* Recent tickets */}
        <Card>
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ClipboardList size={14} className="text-primary" />Recent Tickets
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 flex flex-col gap-2">
            {recentTasks.length === 0 && !loading && (
              <p className="text-sm text-muted-foreground py-4 text-center">No tickets yet</p>
            )}
            {recentTasks.map((t) => (
              <div key={t.id}
                className="flex items-center justify-between py-2 border-b border-border last:border-0 cursor-pointer hover:bg-muted/40 -mx-1 px-1 rounded"
                onClick={() => navigate('/customer/tickets')}>
                <div className="flex flex-col gap-0.5 min-w-0">
                  <p className="text-sm font-medium font-mono">{t.taskNumber}</p>
                  <p className="text-xs text-muted-foreground truncate">{t.issueDescription}</p>
                </div>
                <Badge variant="outline" className="text-xs shrink-0 ml-2">{t.status}</Badge>
              </div>
            ))}
            <Button variant="outline" size="sm" className="mt-2" onClick={() => navigate('/customer/tickets')}>
              View All Tickets
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
