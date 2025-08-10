// renderer/src/components/BuyingList.jsx
import { useEffect, useState } from "react";
import api from "../api";

export default function BuyingList() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/buying_unit_rate")
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4">
      <h2 className="mb-3">Buying List</h2>

      <div className="">
        <table className="table table-striped table-hover table-sm fs-6">
          <thead className="table-dark">
            <tr>
              <th className="text-end">ٹوٹل</th>
              <th className="text-end">یونٹس خریدے</th>
              <th className="text-end">خریداری رقم(₨/L)</th>
              <th></th>
              <th>قسم</th>
              <th>تاریخ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="text-end fw-normal">
                  {r.total_units.toFixed(2)}
                </td>
                <td className="text-end fw-normal">{r.units.toFixed(2)}</td>
                <td className="text-end fw-normal">
                  {r.buying_rate_per_unit.toFixed(2)}
                </td>
                <td></td>
                <td className="fw-normal">{r.fuel_type}</td>
                <td className="fw-normal">{r.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
