import { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Readings from "./components/Readings";
import BuyingList from "./components/BuyingList";
import TyreTable from "./components/TyreTable";

export default function App() {
  const [view, setView] = useState("dashboard");

  return (
    <div className="d-flex">
      {/* left column */}
      <Sidebar onSelect={setView} current={view} />

      {/* right column */}
      <div className="flex-grow-1">
        <Navbar />
        <main className="p-3">
          {view === "dashboard" && <Dashboard />}
          {view === "readings" && <Readings />}
          {view === "buying" && (
            <h3>
              <BuyingList />
            </h3>
          )}
          {view === "tyres" && (
            <h3>
              <TyreTable />
            </h3>
          )}
        </main>
      </div>
    </div>
  );
}
