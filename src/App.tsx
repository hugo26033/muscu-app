import { HashRouter, NavLink, Route, Routes } from 'react-router';
import UpdatePrompt from './components/UpdatePrompt';
import Calendar from './pages/Calendar';
import ExerciseDetail from './pages/ExerciseDetail';
import Exercises from './pages/Exercises';
import Home from './pages/Home';
import Muscles from './pages/Muscles';
import NewSession from './pages/NewSession';
import NotFound from './pages/NotFound';
import Program from './pages/Program';
import SessionDetail from './pages/SessionDetail';
import { EditSessionPage, NewSessionPage } from './pages/SessionEditor';
import Settings from './pages/Settings';
import TemplateEditor from './pages/TemplateEditor';

const TABS = [
  { to: '/', label: 'Calendrier', icon: '📅', end: true },
  { to: '/seances', label: 'Séances', icon: '🏋️', end: false },
  { to: '/exercices', label: 'Exercices', icon: '📈', end: false },
  { to: '/muscles', label: 'Muscles', icon: '💪', end: false },
  { to: '/programme', label: 'Programme', icon: '🗂️', end: false },
  { to: '/reglages', label: 'Réglages', icon: '⚙️', end: false },
];

function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Navigation principale">
      {TABS.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="bottom-nav-item">
          <span className="tab-icon" aria-hidden>
            {tab.icon}
          </span>
          <span className="bottom-nav-label">{tab.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export default function App() {
  return (
    <HashRouter>
      <main className="main">
        <Routes>
          <Route path="/" element={<Calendar />} />
          <Route path="/seances" element={<Home />} />
          <Route path="/muscles" element={<Muscles />} />
          <Route path="/seance/nouvelle" element={<NewSession />} />
          <Route path="/seance/nouvelle/:templateId" element={<NewSessionPage />} />
          <Route path="/seance/:id" element={<SessionDetail />} />
          <Route path="/seance/:id/modifier" element={<EditSessionPage />} />
          <Route path="/exercices" element={<Exercises />} />
          <Route path="/exercices/:id" element={<ExerciseDetail />} />
          <Route path="/programme" element={<Program />} />
          <Route path="/programme/:id" element={<TemplateEditor />} />
          <Route path="/reglages" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <BottomNav />
      <UpdatePrompt />
    </HashRouter>
  );
}
