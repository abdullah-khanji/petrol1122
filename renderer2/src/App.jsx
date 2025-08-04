import { useState } from 'react';
import Navbar   from './components/Navbar';
import Sidebar  from './components/Sidebar';
import Dashboard from './components/Dashboard';

export default function App() {
  const [view, setView] = useState('dashboard');

  return (
    <div className="d-flex">
      {/* left column */}
      <Sidebar onSelect={setView} current={view} />

      {/* right column */}
      <div className="flex-grow-1">
        <Navbar />
        <main className="p-3">
          {view === 'dashboard' && <Dashboard />}
          {view === 'readings'  && <h3>Readings – coming soon</h3>}
          {view === 'reports'   && <h3>Reports – coming soon</h3>}
          {view === 'settings'  && <h3>Settings – coming soon</h3>}
        </main>
      </div>
    </div>
  );
}