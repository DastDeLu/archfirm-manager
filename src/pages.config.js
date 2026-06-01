/**
 * pages.config.js - Page routing configuration
 * 
 * Usa React.lazy per il code-splitting: ogni pagina viene caricata solo
 * quando viene visitata, riducendo drasticamente il bundle iniziale.
 */
import { lazy } from 'react';
import __Layout from './Layout.jsx';

const Automations     = lazy(() => import('./pages/Automations'));
const Baselines       = lazy(() => import('./pages/Baselines'));
const CapitoliSpesa   = lazy(() => import('./pages/CapitoliSpesa'));
const Chapters        = lazy(() => import('./pages/Chapters'));
const Clients         = lazy(() => import('./pages/Clients'));
const ControlDashboard = lazy(() => import('./pages/ControlDashboard'));
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const DashboardConfronto = lazy(() => import('./pages/DashboardConfronto'));
const Earnings        = lazy(() => import('./pages/Earnings'));
const Expenses        = lazy(() => import('./pages/Expenses'));
const Fees            = lazy(() => import('./pages/Fees'));
const Forecast        = lazy(() => import('./pages/Forecast'));
const Marketing       = lazy(() => import('./pages/Marketing'));
const Objectives      = lazy(() => import('./pages/Objectives'));
const Projects        = lazy(() => import('./pages/Projects'));
const Quotes          = lazy(() => import('./pages/Quotes'));
const Revenues        = lazy(() => import('./pages/Revenues'));
const SettingsPage    = lazy(() => import('./pages/SettingsPage'));
const Treasury        = lazy(() => import('./pages/Treasury'));
const WBS             = lazy(() => import('./pages/WBS'));
const WBSProjects     = lazy(() => import('./pages/WBSProjects'));

export const PAGES = {
    "Automations": Automations,
    "Baselines": Baselines,
    "CapitoliSpesa": CapitoliSpesa,
    "Chapters": Chapters,
    "Clients": Clients,
    "ControlDashboard": ControlDashboard,
    "Dashboard": Dashboard,
    "DashboardConfronto": DashboardConfronto,
    "Earnings": Earnings,
    "Expenses": Expenses,
    "Fees": Fees,
    "Forecast": Forecast,
    "Marketing": Marketing,
    "Objectives": Objectives,
    "Projects": Projects,
    "Quotes": Quotes,
    "Revenues": Revenues,
    "SettingsPage": SettingsPage,
    "Treasury": Treasury,
    "WBS": WBS,
    "WBSProjects": WBSProjects,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};