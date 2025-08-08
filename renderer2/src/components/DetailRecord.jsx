import { useEffect, useState } from "react";
import api from "../api";

export default function DetailRecord({ personId, onBack }) {
  const [info, setInfo] = useState(null);
  const [form, setForm] = useState({
    date: "",
    units: "",
    unit_rate: "",
    fuel_type: "petrol",
  });

  useEffect(() => {
    console.log("oook", personId);
    api.get(`/loans/person/${personId}`).then((res) => setInfo(res.data));
  }, [personId]);

  function addLoan(e) {
    e.preventDefault();
    api
      .post("/loans", { ...form, person_id: personId })
      .then(() => api.get(`/loans/person/${personId}`))
      .then((res) => setInfo(res.data))
      .then(() =>
        setForm({ date: "", units: "", unit_rate: "", fuel_type: "petrol" })
      );
  }

  if (!info) return <p>Loading…</p>;

  return (
    <div className="container-fluid">
      <button className="btn btn-link mb-2" onClick={onBack}>
        ← back
      </button>

      {/* person header */}
      <div className="col-6 my_text">
        <div className="card mb-3">
          <div className="card-body">
            <h5 className="card-title mb-3">Name: {info.person.name}</h5>
            <p className="mb-3"> Address: {info.person.address}</p>
            <p className="mb-3">Phone: {info.person.phone}</p>
            <p className="mb-3">Total: {info.person.phone}</p>
          </div>
        </div>
        <br />
        <br />
      </div>
      {/* add-loan form */}
      <form className="row g-2 align-items-end mb-4 form-sm" onSubmit={addLoan}>
        <div className="col-2">
          <label className="form-label mb-0">
            Date
            <input
              type="date"
              className="form-control form-control-sm"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
            />
          </label>
        </div>
        <div className="col-2">
          <label className="form-label mb-0">
            Units
            <input
              type="number"
              className="form-control form-control-sm"
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
            />
          </label>
        </div>
        <div className="col-2">
          <label className="form-label mb-0">
            Unit Rate
            <input
              type="number"
              step="0.01"
              className="form-control form-control-sm"
              value={form.unit_rate}
              onChange={(e) => setForm({ ...form, unit_rate: e.target.value })}
            />
          </label>
        </div>
        <div className="col-2">
          <label className="form-label mb-0 d-block">
            Fuel
            <select
              className="form-select form-select-sm"
              value={form.fuel_type}
              onChange={(e) => setForm({ ...form, fuel_type: e.target.value })}
            >
              <option value="petrol">Petrol</option>
              <option value="diesel">Diesel</option>
            </select>
          </label>
        </div>
        <div className="col-auto">
          <button className="btn btn-success btn-sm">Add</button>
        </div>
      </form>

      <br />
      <br />
      {/* loans table */}
      <table className="table table-sm table-bordered">
        <thead className="table-light">
          <tr>
            <th>Date</th>
            <th>Fuel</th>
            <th>Units</th>
            <th>Rate</th>
            <th>PKR</th>
          </tr>
        </thead>
        <tbody>
          {info.loans.map((l) => (
            <tr key={l.id}>
              <td>{l.date}</td>
              <td>{l.fuel_type}</td>
              <td>{l.units}</td>
              <td>{l.unit_rate}</td>
              <td>{l.pkr.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
