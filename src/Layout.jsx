import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  Building2,
  FolderKanban,
  Wallet,
  Receipt,
  TrendingUp,
  FileText,
  Megaphone,
  Settings,
  Search,
  Menu,
  X,
  ChevronDown,
  LogOut,
  User,
  Shield,
  Banknote,
  PiggyBank
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import GlobalSearch from './components/search/GlobalSearch';
import ControlDashboardSidebarWidget from './components/dashboard/ControlDashboardSidebarWidget';
import NotificationCenter from './components/notifications/NotificationCenter';
import { BudgetProvider } from './components/budget/BudgetContext';
import { calculateCashForecast } from './components/utils/cashForecast.jsx';

const navItems = [
  { name: 'Dashboard', icon: LayoutDashboard, path: 'Dashboard' },
  { 
  name: 'Finanza', 
  icon: Wallet, 
  children: [
    { name: 'Cassa', path: 'Treasury' },
      { name: 'Ricavi', path: 'Revenues' },
      { name: 'Spese', path: 'Expenses' },
      { name: 'Previsionale incassi', path: 'Fees' },
      { name: 'Previsioni', path: 'Forecast' },
      { name: 'Guadagni', path: 'Earnings' },
      { name: 'Capitoli di Spesa', path: 'CapitoliSpesa' },
      { name: 'Budget', path: 'Baselines' },
    ]
  },
  { 
    name: 'Progetti', 
    icon: FolderKanban, 
    children: [
      { name: 'Preventivi', path: 'Quotes' },
      { name: 'Progetti', path: 'Projects' },
      { name: 'Clienti', path: 'Clients' },
    ]
  },
  { name: 'Marketing', icon: Megaphone, path: 'Marketing' },
  { name: 'WBS', icon: FileText, path: 'WBS' },
        { 
          name: 'Admin', 
          icon: Settings, 
          children: [
            { name: 'Dashboard Confronto', path: 'DashboardConfronto' },
            { name: 'Obiettivi', path: 'Objectives' },
            { name: 'Automazioni', path: 'Automations' },
            { name: 'Impostazioni', path: 'SettingsPage' },
          ]
        },
];

function CashDisplay({ bankCash, pettyCash, forecast }) {
  return (
    <div className="px-4 py-5 border-b border-slate-200/60">
      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-emerald-100/50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <Banknote className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="text-xs font-medium text-slate-600">Banca</span>
          </div>
          <span className={cn(
            "text-sm font-bold",
            bankCash >= 0 ? "text-emerald-600" : "text-red-500"
          )}>
            €{bankCash?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-amber-100/50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500/10 rounded-lg">
              <PiggyBank className="h-4 w-4 text-amber-600" />
            </div>
            <span className="text-xs font-medium text-slate-600">Cassa</span>
          </div>
          <span className={cn(
            "text-sm font-bold",
            pettyCash >= 0 ? "text-amber-600" : "text-red-500"
          )}>
            €{pettyCash?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
          </span>
        </div>
        
        <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-blue-100/50 rounded-xl">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-500/10 rounded-lg">
              <TrendingUp className="h-4 w-4 text-blue-600" />
            </div>
            <span className="text-xs font-medium text-slate-600">Previsione</span>
          </div>
          <span className={cn(
            "text-sm font-bold",
            forecast >= 0 ? "text-blue-600" : "text-red-500"
          )}>
            €{forecast?.toLocaleString('it-IT', { minimumFractionDigits: 2 }) || '0.00'}
          </span>
        </div>
      </div>
    </div>
  );
}

function NavItem({ item, isActive, isMobile, closeMobile }) {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  
  const isChildActive = item.children?.some(child => 
    location.pathname.includes(child.path)
  );

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
            isChildActive 
              ? "bg-slate-900 text-white" 
              : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <div className="flex items-center gap-3">
            <item.icon className="h-4.5 w-4.5" />
            <span>{item.name}</span>
          </div>
          <ChevronDown className={cn(
            "h-4 w-4 transition-transform duration-200",
            isOpen && "rotate-180"
          )} />
        </button>
        {isOpen && (
          <div className="mt-1 ml-4 pl-4 border-l border-slate-200 space-y-1">
            {item.children.map(child => (
              <Link
                key={child.path}
                to={createPageUrl(child.path)}
                onClick={isMobile ? closeMobile : undefined}
                className={cn(
                  "block px-3 py-2 rounded-lg text-sm transition-all duration-200",
                  location.pathname.includes(child.path)
                    ? "bg-slate-100 text-slate-900 font-medium"
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                )}
              >
                {child.name}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link
      to={createPageUrl(item.path)}
      onClick={isMobile ? closeMobile : undefined}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
        isActive 
          ? "bg-slate-900 text-white" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
      )}
    >
      <item.icon className="h-4.5 w-4.5" />
      <span>{item.name}</span>
    </Link>
  );
}

export default function Layout({ children, currentPageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      try {
        const userData = await base44.auth.me();
        setUser(userData);
      } catch (e) {
        console.log('User not authenticated');
      }
    };
    loadUser();
  }, []);

  // React Query per i dati della cassa - si aggiorna automaticamente
  const { data: cashData = { bankCash: 0, pettyCash: 0, forecast: 0, cashForecastAlerts: [] } } = useQuery({
    queryKey: ['cashData'],
    queryFn: async () => {
      const [revenues, expenses, forecasts, openingBalances, installments] = await Promise.all([
        base44.entities.Revenue.list(),
        base44.entities.Expense.list(),
        base44.entities.Forecast.list(),
        base44.entities.OpeningBalance.list(),
        base44.entities.Installment.list()
      ]);

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth() + 1;
      const previousYear = currentYear - 1;

      // Get opening balances for current year
      const bankOpening = openingBalances.find(ob => ob.type === 'bank' && ob.year === currentYear)?.amount || 0;
      const pettyOpening = openingBalances.find(ob => ob.type === 'petty' && ob.year === currentYear)?.amount || 0;

      // Calculate bank balance: revenues without payment_method or with bank methods
      const bankRevenues = revenues
        .filter(r => !r.payment_method || ['bank_transfer', 'card'].includes(r.payment_method))
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const bankExpenses = expenses
        .filter(e => !e.payment_method || ['bank_transfer', 'card'].includes(e.payment_method))
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const bankTotal = bankOpening + bankRevenues - bankExpenses;

      // Calculate petty cash balance: only cash payment_method
      const pettyRevenues = revenues
        .filter(r => r.payment_method === 'cash')
        .reduce((sum, r) => sum + (r.amount || 0), 0);
      
      const pettyExpenses = expenses
        .filter(e => e.payment_method === 'cash')
        .reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const pettyTotal = pettyOpening + pettyRevenues - pettyExpenses;

      // Forecast calculation
      const currentForecast = forecasts.find(f => f.month === currentMonth && f.year === currentYear);
      const forecastNet = currentForecast 
        ? (currentForecast.revenue_amount || 0) - (currentForecast.expense_amount || 0)
        : 0;

      // Calculate cash forecast
      const ytdRevenues = revenues.filter(r => r.date?.startsWith(String(currentYear)));
      const ytdExpenses = expenses.filter(e => e.date?.startsWith(String(currentYear)));
      const cfIncassiYTD = ytdRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);
      const cfSpeseYTD = ytdExpenses.reduce((sum, e) => sum + (e.amount || 0), 0);
      
      const riporti = installments
        .filter(i => i.status !== 'paid' && i.status !== 'cancelled')
        .reduce((sum, i) => sum + (i.amount || 0), 0);
      
      const previousYearRevenues = revenues.filter(r => r.date?.startsWith(String(previousYear)));
      const baseAnnoPrecedente = previousYearRevenues.reduce((sum, r) => sum + (r.amount || 0), 0);

      const cashForecast = calculateCashForecast({
        cassaAttuale: bankTotal,
        riporti,
        percentualeIncasso: 0.70,
        baseAnnoPrecedente,
        growthRate: 0.35,
        speseAnnuePreviste: 117000,
        cfIncassiYTD,
        cfSpeseYTD,
        meseCorrente: currentMonth
      });

      return { 
        bankCash: bankTotal, 
        pettyCash: pettyTotal, 
        forecast: forecastNet,
        cashForecastAlerts: cashForecast.alerts
      };
    },
    refetchInterval: 30000,
  });

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <BudgetProvider>
    <div className="min-h-screen bg-slate-50/50">
      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-40 flex items-center justify-between px-4">
        <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-slate-900">ArchFirm</span>
        </div>
        <div className="flex items-center gap-1">
          <NotificationCenter />
          <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg hover:bg-slate-100">
            <Search className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center">
                  <Building2 className="h-5 w-5 text-white" />
                </div>
                <span className="font-bold text-slate-900">ArchFirm</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <CashDisplay 
              bankCash={cashData.bankCash} 
              pettyCash={cashData.pettyCash} 
              forecast={cashData.forecast}
            />
            <nav className="p-3 space-y-1">
              {navItems.map(item => (
                <NavItem 
                  key={item.name} 
                  item={item} 
                  isActive={currentPageName === item.path}
                  isMobile
                  closeMobile={() => setSidebarOpen(false)}
                />
              ))}
            </nav>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 flex-col bg-white border-r border-slate-200/60 z-30">
        <div className="p-5 border-b border-slate-200/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center shadow-lg shadow-slate-900/20">
              <Building2 className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-slate-900">ArchFirm</h1>
              <p className="text-xs text-slate-500">Manager Pro</p>
            </div>
          </div>
        </div>

        <CashDisplay 
          bankCash={cashData.bankCash} 
          pettyCash={cashData.pettyCash} 
          forecast={cashData.forecast}
        />

        <ControlDashboardSidebarWidget />

        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <NavItem 
              key={item.name} 
              item={item} 
              isActive={currentPageName === item.path}
            />
          ))}
        </nav>

        {user && (
          <div className="p-4 border-t border-slate-200/60">
            <div className="flex items-center gap-3 p-2">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center">
                <User className="h-4 w-4 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{user.full_name || user.email}</p>
                <div className="flex items-center gap-1">
                  {user.role === 'admin' && <Shield className="h-3 w-3 text-amber-500" />}
                  <p className="text-xs text-slate-500 capitalize">{user.role}</p>
                </div>
              </div>
              <button 
                onClick={() => base44.auth.logout()}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <main className="lg:ml-64 min-h-screen pt-16 lg:pt-0">
        <div className="hidden lg:flex items-center justify-between h-16 px-6 border-b border-slate-200/60 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-slate-900">{currentPageName}</h2>
          </div>
          <div className="flex items-center gap-2">
            <NotificationCenter />
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchOpen(true)}
              className="gap-2 text-slate-500"
            >
              <Search className="h-4 w-4" />
              <span>Search</span>
              <kbd className="ml-2 pointer-events-none h-5 select-none items-center gap-1 rounded border bg-slate-100 px-1.5 text-[10px] font-medium hidden sm:inline-flex">
                ⌘K
              </kbd>
            </Button>
          </div>
        </div>
        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>

      <GlobalSearch open={searchOpen} onOpenChange={setSearchOpen} />
    </div>
    </BudgetProvider>
  );
}