import { HashRouter, NavLink, Route, Routes } from 'react-router';
import UpdatePrompt from './components/UpdatePrompt';
import ExerciseDetail from './pages/ExerciseDetail';
import Exercises from './pages/Exercises';
import Home from './pages/Home';
import NewSession from './pages/NewSession';
import NotFound from './pages/NotFound';
import Program from './pages/Program';
import SessionDetail from './pages/SessionDetail';
import { EditSessionPage, NewSessionPage } from './pages/SessionEditor';
import Settings from './pages/Settings';
import TemplateEditor from './pages/TemplateEditor';

const TABS = [
  { to: '/', label: 'Séances', icon: '🏋️', end: true },
  { to: '/exercices', label: 'Exercices', icon: '📈', end: false },
  { to: '/programme', label: 'Programme', icon: '🗂️', end: false },
  { to: '/reglages', label: 'Réglages', icon: '⚙️', end: false },
];

export default function App() {
  return (
    <HashRouter>
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
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
      <nav className="tabbar">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end} className="tab">
            <span className="tab-icon" aria-hidden>
              {tab.icon}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
      <UpdatePrompt />
    </HashRouter>
  );
}
