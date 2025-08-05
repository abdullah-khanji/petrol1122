import { useEffect, useState } from "react";
import { Line } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import api from "../api";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [cards, setCards] = useState({ petrol: "—", diesel: "—", total: "—" });
  const [chart, setChart] = useState({ labels: [], datasets: [] });
  const [rows, setRows] = useState([]);
  const [saveStatus, setSaveStatus] = useState("");
  /* fetch once on mount ------------------------------------------------ */
  useEffect(() => {
    api.get("/pumps/latest-meters").then((r) => {
      // add editable fields currentMeter / unitRate seeded with defaults
      setRows(
        r.data.map((row) => ({
          ...row,
          currentMeter: row.previous_meter,
          unitRate: row.unit_rate,
        }))
      );
    });
    /* cumulative revenue cards */
    api
      .get("/report/revenue-cumulative")
      .then((r) => setCards(r.data))
      .catch(() => setCards({ petrol: "—", diesel: "—", total: "—" }));

    /* twin-line units chart */
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
            borderColor: "#28a745", // green
            backgroundColor: "#28a745",
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: "Diesel Revenue",
            data: ds.data.detail.map((r) => r.revenue_amount),
            borderColor: "#fd7e14", // orange
            backgroundColor: "#fd7e14",
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      });
    });
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: "top", labels: { boxWidth: 12, boxHeight: 12 } },
      tooltip: { mode: "index", intersect: false },
    },
    interaction: { mode: "index", intersect: false },
    scales: {
      x: { display: false }, // hide axes
      y: { display: true },
    },
  };

  /* helper to update an editable cell */
  function updateRow(idx, field, value) {
    setRows((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r))
    );
  }
  /* compute PKR on the fly */
  function calcPKR(r) {
    const units = r.currentMeter - r.previous_meter;
    // return units;
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
      .then(() => setSaveStatus("Saved ✓"))
      .catch(() => setSaveStatus("Error saving"));
  }
  return (
    <>
      {/* revenue cards */}
      <div className="row g-3 mb-4">
        <div className="col">
          <StatCard title="Petrol Units" value={cards.petrol.units} />
        </div>
        <div className="col">
          <StatCard title="Diesel Units" value={cards.diesel.units} />
        </div>
      </div>

      {/* twin-line chart in half-width column */}
      <div className="row">
        <div className="col-6">
          <Line data={chart} options={options} />
        </div>
        <div className="col-6"></div>
      </div>

      {/* table */}
      <div className="row g-3 mt-4">
        <div className="col-12">
          <table className="table table-bordered align-middle">
            <thead className="table-light">
              <tr>
                <th>Pump</th>
                <th>Type</th>
                <th>Previous Meter</th>
                <th>Current Meter</th>
                <th>Unit Rate</th>
                <th>PKR</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r, idx) => (
                <tr key={r.pump_id}>
                  <td>{r.pump_name}</td>
                  <td>{r.fuel_type}</td>

                  {/* editable Previous Meter */}
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

                  {/* editable Current Meter */}
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

                  {/* editable Unit Rate */}
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

                  {/* PKR (read-only) */}
                  <td>{calcPKR(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* submit button & status */}
          <button className="btn btn-primary" onClick={handleSubmit}>
            Submit Readings
          </button>
          {saveStatus && <span className="ms-3">{saveStatus}</span>}
        </div>
      </div>
      {/* table_end */}
    </>
  );
}

/* small reusable card */
function StatCard({ title, value }) {
  return (
    <div className="card">
      <div className="card-body">
        <h6 className="card-title text-muted">{title}</h6>
        <h4 className="card-text">{value}</h4>
      </div>
    </div>
  );
}
