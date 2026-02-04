/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import Chapters from './pages/Chapters';
import Clients from './pages/Clients';
import Dashboard from './pages/Dashboard';
import Earnings from './pages/Earnings';
import Expenses from './pages/Expenses';
import Fees from './pages/Fees';
import Forecast from './pages/Forecast';
import Marketing from './pages/Marketing';
import Projects from './pages/Projects';
import Revenues from './pages/Revenues';
import SettingsPage from './pages/SettingsPage';
import WBS from './pages/WBS';
import Baselines from './pages/Baselines';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Chapters": Chapters,
    "Clients": Clients,
    "Dashboard": Dashboard,
    "Earnings": Earnings,
    "Expenses": Expenses,
    "Fees": Fees,
    "Forecast": Forecast,
    "Marketing": Marketing,
    "Projects": Projects,
    "Revenues": Revenues,
    "SettingsPage": SettingsPage,
    "WBS": WBS,
    "Baselines": Baselines,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};