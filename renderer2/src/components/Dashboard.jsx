import { useEffect, useState } from "react";
import { Line, Pie } from "react-chartjs-2";
import "./Sidebar.css";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";
import api from "../api";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  ArcElement
);

export default function Dashboard() {
  /* ────────────────────────── state ────────────────────────── */
  const [cards, setCards] = useState({ petrol: "—", diesel: "—", total: "—" });
  const [chart, setChart] = useState({ labels: [], datasets: [] });
  const [rows, setRows] = useState([]); // editable table rows
  const [saveStatus, setSaveStatus] = useState("");
  const [income, setIncome] = useState({ petrol: "—", diesel: "—" });
  const [stock, setStock] = useState({ petrol: "—", diesel: "—" });
  const todayDMY = () => {
    const d = new Date();
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${dd}-${mm}-${d.getFullYear()}`; // "07-08-2025"
  };

  const dmyToISO = (dmy) => {
    // "07-08-2025" → "2025-08-07"
    const [dd, mm, yyyy] = dmy.split("-");
    return `${yyyy}-${mm}-${dd}`;
  };
  const [buying, setBuying] = useState({
    date: todayDMY(),
    fuel_type: "petrol",
    buying_rate_per_unit: "",
    units: "",
  });
  const [buyMsg, setBuyMsg] = useState("");

  /* ───────────────────── reusable loader ───────────────────── */
  function reloadDashboard() {
    /* 1) editable table defaults (latest meters & rates) */
    api.get("/pumps/latest-meters").then((r) =>
      setRows(
        r.data.map((row) => ({
          ...row,
          currentMeter: row.previous_meter, // start = previous
          unitRate: row.unit_rate,
        }))
      )
    );

    /* 2) revenue cards */
    api
      .get("/report/revenue-cumulative")
      .then((r) => setCards(r.data))
      .catch(() => setCards({ petrol: "—", diesel: "—", total: "—" }));

    api
      .get("/fuel-stock")
      .then((r) => setStock(r.data))
      .catch(() => setStock({ petrol: "—", diesel: "—" }));
    /* 4) twin-line chart */
    Promise.all([
      api.get("/readings3/petrol"),
      api.get("/readings3/diesel"),
    ]).then(([pt, ds]) => {
      setChart({
        labels: pt.data.detail.map((r) => r.date),
        datasets: [
          {
            label: "Petrol Revenue",
            data: pt.data.detail.map((r) => r.revenue_amount),
            borderColor: "#28a745",
            backgroundColor: "#28a745",
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: "Diesel Revenue",
            data: ds.data.detail.map((r) => r.revenue_amount),
            borderColor: "#fd7e14",
            backgroundColor: "#fd7e14",
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      });
      /* 2) NEW: compute total revenue for the two fuels ------------- */
      const petrolIncome = pt.data.total_revenue;

      const dieselIncome = ds.data.total_revenue;

      setIncome({
        petrol: petrolIncome.toFixed(2),
        diesel: dieselIncome.toFixed(2),
      });
    });
  }

  /* first load */
  useEffect(reloadDashboard, []);

  /* ─────────────── helpers for the editable table ───────────── */
  function updateRow(idx, field, value) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  }

  function calcPKR(r) {
    const units = r.currentMeter - r.previous_meter;
    return (units * r.unitRate).toFixed(2);
  }

  /* submit handler */
  function handleSubmit() {
    const payload = rows.map((r) => ({
      pump_id: r.pump_id,
      previous_meter: Number(r.previous_meter),
      current_meter: Number(r.currentMeter),
      unit_rate: Number(r.unitRate),
    }));

    api
      .post("/pumps/readings", payload)
      .then(() => {
        setSaveStatus("Saved ✓");
        reloadDashboard(); // ← refresh everything
      })
      .catch(() => setSaveStatus("Error saving"));
  }

  /* ───────── save purchase ───────── */
  function onBuyChange(e) {
    const { name, value } = e.target;
    setBuying((b) => ({ ...b, [name]: value }));
  }
  function saveBuying(e) {
    e.preventDefault();
    setBuyMsg("Saving…");
    api
      .post("/buying-unit-rate", {
        ...buying,
        buying_rate_per_unit: +buying.buying_rate_per_unit,
        units: +buying.units,
      })
      .then(() => {
        setBuyMsg("Saved ✓");
        setBuying({
          date: "",
          fuel_type: "petrol",
          buying_rate_per_unit: "",
          units: "",
        });
        reload();
      })
      .catch(() => setBuyMsg("Error"));
  }

  /* ───────────────────────── chart opts ─────────────────────── */
  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, boxHeight: 12 } },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { display: false },
      y: { display: true },
    },
  };

  const pieOpts = { plugins: { legend: { position: "bottom" } } };
  const pieData = {
    labels: ["Petrol", "Diesel"],
    datasets: [
      {
        data: [Number(income.petrol) || 0, Number(income.diesel) || 0],
        backgroundColor: ["#28a745", "#fd7e14"],
        hoverOffset: 4,
      },
    ],
  };
  /* ────────────────────────── JSX ──────────────────────────── */
  return (
    <>
      {/* revenue cards */}
      <div className="row g-3 mb-4">
        <div className="col">
          <StatCard
            title="Petrol Units"
            value={cards.petrol.units}
            note={`سٹاک : ${stock.petrol}`}
          />
        </div>
        <div className="col">
          <StatCard
            title="Diesel Units"
            value={cards.diesel.units}
            note={`سٹاک : ${stock.diesel}`}
          />
        </div>
        <div className="col">
          <StatCard title="income Petrol" value={income.petrol} />
        </div>
        <div className="col">
          <StatCard title="income Diesel" value={income.diesel} />
        </div>
      </div>

      {/* twin-line chart */}
      <div className="row">
        <div className="col-6">
          <Line data={chart} options={options} />
        </div>
        <div className="col-6 d-flex align-items-center justify-content-center">
          <Pie data={pieData} options={pieOpts} style={{ maxHeight: 300 }} />+{" "}
        </div>
      </div>

      {/* editable table */}
      <div className="row g-3 mt-4">
        <div className="col-12">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr className="urdu-nastaliq bold-headline">
                <th>پمپ</th>
                <th>قسم</th>
                <th>پرانہ</th>
                <th>موجودہ</th>
                <th>یونٹ ریٹ</th>
                <th>PKR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.pump_id}>
                  <td>{r.pump_name}</td>
                  <td>{r.fuel_type}</td>

                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={r.previous_meter}
                      onChange={(e) =>
                        updateRow(idx, "previous_meter", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      value={r.currentMeter}
                      onChange={(e) =>
                        updateRow(idx, "currentMeter", e.target.value)
                      }
                    />
                  </td>

                  <td>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-sm"
                      value={r.unitRate}
                      onChange={(e) =>
                        updateRow(idx, "unitRate", e.target.value)
                      }
                    />
                  </td>

                  <td>{calcPKR(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <button className="btn btn-primary" onClick={handleSubmit}>
            Submit Readings
          </button>
          {saveStatus && <span className="ms-3">{saveStatus}</span>}
        </div>

        <div className="col-lg-12" id="buying petrol or diesel">
          <h5>Record New Fuel Purchase</h5>
          <form onSubmit={saveBuying} className="card p-3 shadow-sm">
            <div className="row g-3">
              <div className="col-3">
                <label className="form-label">Date</label>
                <input
                  type="date"
                  name="date"
                  className="form-control"
                  value={buying.date}
                  pattern="\d{2}-\d{2}-\d{4}"
                  onChange={onBuyChange}
                  required
                />
              </div>
              <div className="col-3">
                <label className="form-label">Fuel</label>
                <select
                  name="fuel_type"
                  className="form-select"
                  value={buying.fuel_type}
                  onChange={onBuyChange}
                >
                  <option value="petrol">Petrol</option>
                  <option value="diesel">Diesel</option>
                </select>
              </div>
              <div className="col-3">
                <label className="form-label">Buying Rate (₨/L)</label>
                <input
                  type="number"
                  step="0.01"
                  name="buying_rate_per_unit"
                  className="form-control"
                  value={buying.buying_rate_per_unit}
                  onChange={onBuyChange}
                  required
                />
              </div>
              <div className="col-3">
                <label className="form-label">Units (L)</label>
                <input
                  type="number"
                  step="0.01"
                  name="units"
                  className="form-control"
                  value={buying.units}
                  onChange={onBuyChange}
                  required
                />
              </div>
              <div className="col-12">
                <button type="submit" className="btn btn-success">
                  Save Purchase
                </button>
                {buyMsg && <span className="ms-2">{buyMsg}</span>}
              </div>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

function StatCard({ title, value, note }) {
  return (
    <div className="card">
      {/* position-relative lets us anchor the note absolutely */}
      <div className="card-body position-relative">
        <h6 className="card-title text-muted">{title}</h6>
        <h4 className="card-text">{value}</h4>

        {note && (
          <small
            className="text-muted position-absolute bottom-1 start-1 mb-2"
            style={{ fontSize: ".75rem" }}
          >
            <b>{note}</b>
          </small>
        )}
      </div>
    </div>
  );
}
