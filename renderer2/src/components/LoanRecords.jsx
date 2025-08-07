import { useEffect, useState } from "react";
import api from "../api";

export default function LoanRecords({ onOpen }) {
  /* ------------ list of rows ------------ */
  const [rows, setRows] = useState([]);

  /* ------------ new-record form state ------------ */
  const [form, setForm] = useState({
    name: "",
    address: "",
    phone: "",
    date: "",
    units: "",
    unit_rate: "",
    fuel_type: "petrol",
  });

  /* fetch list on mount / refresh */
  async function fetchData() {
    try {
      const res = await api.get("/loans/people");
      if (!ignore) setRows(res.data);
    } catch (err) {
      console.error(err);
    }
  }
  useEffect(() => {
    let ignore = false; // optional guard for quick unmounts

    fetchData();

    /* optional cleanup */
    return () => {
      ignore = true;
    };
  }, []);

  /* ------------ submit handler ------------ */
  async function handleSubmit(e) {
    e.preventDefault();
    try {
      /* 1) create person */
      const person = await api.post("/persons", {
        name: form.name,
        address: form.address,
        phone: form.phone,
      });

      /* 2) create first loan for that person */
      await api.post("/loans", {
        person_id: person.data.id,
        date: form.date,
        units: form.units,
        unit_rate: form.unit_rate,
        fuel_type: form.fuel_type,
      });

      /* 3) reset form + refresh table */
      setForm({
        name: "",
        address: "",
        phone: "",
        date: "",
        units: "",
        unit_rate: "",
        fuel_type: "petrol",
      });
      loadPeople();
    } catch (err) {
      console.error(err);
      alert("Failed to add record");
    }
  }

  /* ------------ render ------------ */
  return (
    <>
      <h4 className="mb-3">Loan Records</h4>

      {/* ---------- ADD-PERSON+LOAN FORM ---------- */}
      <form
        className="row g-2 align-items-end mb-4 form-sm"
        onSubmit={handleSubmit}
      >
        <div className="col-2">
          <label className="form-label mb-0">
            Name
            <input
              className="form-control form-control-sm"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-2">
          <label className="form-label mb-0">
            Address
            <input
              className="form-control form-control-sm"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-2">
          <label className="form-label mb-0">
            Phone
            <input
              className="form-control form-control-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-2">
          <label className="form-label mb-0">
            Date
            <input
              type="date"
              className="form-control form-control-sm"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-1">
          <label className="form-label mb-0">
            Units
            <input
              type="number"
              className="form-control form-control-sm"
              value={form.units}
              onChange={(e) => setForm({ ...form, units: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-1">
          <label className="form-label mb-0">
            Rate
            <input
              type="number"
              step="0.01"
              className="form-control form-control-sm"
              value={form.unit_rate}
              onChange={(e) => setForm({ ...form, unit_rate: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-1">
          <label className="form-label mb-0 d-block">
            Fuel
            <select
              className="form-select form-select-sm fuel-select"
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

      {/* ---------- PEOPLE LIST TABLE ---------- */}
      <table className="table table-sm table-bordered align-middle table-sm">
        <thead className="table-light">
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Address</th>
            <th>Total PKR</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.phone}</td>
              <td>{r.address}</td>
              <td>{Number(r.total_pkr).toLocaleString()}</td>
              <td>
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => onOpen(r.id)}
                >
                  Details
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
