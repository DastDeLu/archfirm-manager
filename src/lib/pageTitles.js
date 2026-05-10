// Mapping route key → titolo italiano per l'header dell'area contenuto.
// Le chiavi sono i path/component name dichiarati in App.jsx/pages.config.js
// e NON vanno modificati (sono usati dal router).
const pageTitles = {
  Dashboard: 'Dashboard',
  Treasury: 'Cassa',
  Revenues: 'Ricavi',
  Expenses: 'Spese',
  Fees: 'Previsionale incassi',
  Forecast: 'Previsionale',
  Earnings: 'Guadagni',
  CapitoliSpesa: 'Capitoli di Spesa',
  Chapters: 'Capitoli',
  Baselines: 'Budget',
  Quotes: 'Preventivi',
  Projects: 'Progetti',
  Clients: 'Clienti',
  Marketing: 'Marketing',
  WBS: 'WBS',
  WBSProjects: 'Progetti WBS',
  DashboardConfronto: 'Dashboard Confronto',
  Objectives: 'Obiettivi',
  Automations: 'Automazioni',
  SettingsPage: 'Impostazioni',
  ControlDashboard: 'Dashboard di Controllo',
  KpiTargets: 'Target KPI',
};

export function getPageTitle(routeKey) {
  if (!routeKey) return '';
  return pageTitles[routeKey] || routeKey;
}