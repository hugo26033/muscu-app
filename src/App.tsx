import { useEffect, useRef, useState } from 'react';
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router';
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

function NavMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false);
    }
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div className="nav-menu" ref={rootRef}>
      <button
        type="button"
        className="nav-menu-button"
        aria-label="Menu"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="nav-menu-icon" aria-hidden>
          <span />
          <span />
          <span />
        </span>
      </button>
      {open && (
        <nav className="nav-menu-dropdown">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} end={tab.end} className="nav-menu-item">
              <span className="tab-icon" aria-hidden>
                {tab.icon}
              </span>
              {tab.label}
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <NavMenu />
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
      <UpdatePrompt />
    </HashRouter>
  );
}
