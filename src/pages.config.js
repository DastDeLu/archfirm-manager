import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import WBS from './pages/WBS';
import Revenues from './pages/Revenues';
import Expenses from './pages/Expenses';
import Forecast from './pages/Forecast';
import Earnings from './pages/Earnings';
import Chapters from './pages/Chapters';
import Fees from './pages/Fees';
import Marketing from './pages/Marketing';
import SettingsPage from './pages/SettingsPage';
import __Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "Clients": Clients,
    "Projects": Projects,
    "WBS": WBS,
    "Revenues": Revenues,
    "Expenses": Expenses,
    "Forecast": Forecast,
    "Earnings": Earnings,
    "Chapters": Chapters,
    "Fees": Fees,
    "Marketing": Marketing,
    "SettingsPage": SettingsPage,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};