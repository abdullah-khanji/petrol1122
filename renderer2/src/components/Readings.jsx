// renderer/src/components/Readings.jsx
import { useEffect, useState } from "react";
import api from "../api";

export default function Readings() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  /* fetch on mount */
  useEffect(() => {
    api
      .get("/pump_readings")
      .then((r) => setData(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="p-4">Loading…</div>;
  }

  return (
    <div className="p-4">
      <h2 className="mb-3">Pump Readings</h2>

      <div className="table-responsive">
        <table className="table table-striped table-hover">
          <thead className="table-dark">
            <tr>
              <th>Date</th>
              <th>Pump</th>
              <th>Type</th>
              <th className="text-end">Units</th>
              <th className="text-end">Rate&nbsp;(₨/L)</th>
              <th className="text-end">PKR&nbsp;(Units × Rate)</th>
              <th className="text-end">Meter</th>
            </tr>
          </thead>
          <tbody>
            {data.map((r) => (
              <tr key={r.id}>
                <td>{r.reading_date}</td>
                <td>{r.pump_name}</td>
                <td>{r.fuel_type}</td>
                <td className="text-end">{r.units.toFixed(2)}</td>
                <td className="text-end">{r.rate_per_unit.toFixed(2)}</td>
                <td className="text-end">
                  {(r.units * r.rate_per_unit).toFixed(2)}
                </td>
                <td className="text-end">{r.meter_reading.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
