// App.jsx
import { useState } from "react";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Dashboard from "./components/Dashboard";
import Readings from "./components/Readings";
import BuyingList from "./components/BuyingList";
import TyreTable from "./components/TyreTable";
import LoanRecords from "./components/LoanRecords";
import DetailRecord from "./components/DetailRecord";
import "./styles/custom.css";

export default function App() {
  // always an object
  const [view, setView] = useState({ page: "dashboard", personId: null });

  const goto = (page) => setView({ page, personId: null });

  return (
    <div className="app-scroll scroll-hidden">
      <div className="app-content">
        <div className="d-flex flex-row-reverse">
          {/* right-side sidebar */}
          <Sidebar onSelect={goto} current={view.page} />

          <div className="flex-grow-1">
            <Navbar />
            <main className="p-3">
              {view.page === "dashboard" && <Dashboard />}
              {view.page === "readings" && <Readings />}
              {view.page === "buying" && <BuyingList />}
              {view.page === "tyres" && <TyreTable />}
              {view.page === "loan-records" && (
                <LoanRecords
                  onOpen={(pid) => setView({ page: "detail", personId: pid })}
                />
              )}
              {view.page === "detail" && (
                <DetailRecord
                  personId={view.personId}
                  onBack={() => goto("loan-records")}
                />
              )}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
