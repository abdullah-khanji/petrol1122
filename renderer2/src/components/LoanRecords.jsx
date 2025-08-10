import { useEffect, useState, useMemo } from "react";
import api from "../api";

export default function LoanRecords({ onOpen }) {
  /* ------------ list of rows ------------ */
  const [rows, setRows] = useState([]);
  const [confirmId, setConfirmId] = useState(null);

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
  async function fetchData(ignore) {
    try {
      const res = await api.get("/loans/people");
      console.log(res.data);
      if (!ignore) setRows(res.data);
    } catch (err) {
      console.error(err);
    }
  }
  useEffect(() => {
    let ignore = false; // optional guard for quick unmounts

    fetchData(ignore);

    /* optional cleanup */
    return () => {
      ignore = true;
    };
  }, []);

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
      let ignore = false;
      fetchData(ignore);
    } catch (err) {
      console.error(err);
      alert(`Failed to add record: ${err.message || err}`);
    }
  }
  async function doDeleteLoan(id) {
    // ← rename (no confirm here)
    try {
      await api.delete(`/persons/${id}`);
      let ignore = false;
      fetchData(ignore);
      setConfirmId(null); // reset confirm state
    } catch (err) {
      console.error(err);
      alert("Failed to delete loan");
    }
  }
  const grandTotal = useMemo(
    () => rows.reduce((sum, r) => sum + Number(r.net_total || 0), 0),
    [rows]
  );

  /* ------------ render ------------ */
  return (
    <>
      <h4 className="mb-4">Loan Records</h4>

      {/* ---------- ADD-PERSON+LOAN FORM ---------- */}
      <form
        className="row g-2 mb-5 align-items-end mb-4 form-sm"
        onSubmit={handleSubmit}
      >
        <div className="col-auto">
          <button className="btn btn-success btn-sm">Add</button>
        </div>
        <div className="col-1">
          <label className="form-label mb-0 d-block">
            قسم
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

        <div className="col-1">
          <label className="form-label mb-0">
            یونٹس
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
            ریٹ
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
        <div className="col-2">
          <label className="form-label mb-0">
            تاریخ
            <input
              type="date"
              className="form-control form-control-sm"
              value={form.date}
              onChange={(e) => setForm({ ...form, date: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="col-2">
          <label className="form-label mb-0">
            پتہ
            <input
              className="form-control form-control-sm"
              lang="ur"
              dir="rtl"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              required
            />
          </label>
        </div>

        <div className="col-2">
          <label className="form-label mb-0">
            فون
            <input
              className="form-control form-control-sm"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              required
            />
          </label>
        </div>
        <div className="col-2">
          <label className="form-label mb-0 text-end">
            نام
            <input
              className="form-control form-control-sm"
              lang="ur"
              dir="rtl"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
          </label>
        </div>
      </form>

      {/* ---------- PEOPLE LIST TABLE ---------- */}
      <table className="table table-sm table-bordered align-middle table-sm">
        <thead className="table-light">
          <tr>
            <th style={{ width: 140 }}></th>
            <th className="text-end">کل رقم</th>
            <th className="text-end">پتہ</th>
            <th className="text-end">فون</th>
            <th className="text-end">نام</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr className="fw-normal fs-6" key={r.id}>
              <td className="d-flex gap-2">
                <button
                  className="btn btn-outline-primary btn-sm"
                  onClick={() => onOpen(r.id)}
                >
                  تفصیل
                </button>
                {confirmId !== r.id ? (
                  <button
                    className="btn btn-outline-danger btn-sm"
                    onClick={() => setConfirmId(r.id)}
                  >
                    Delete
                  </button>
                ) : (
                  <div className="btn-group btn-group-sm">
                    <button
                      className="btn btn-danger"
                      onClick={() => doDeleteLoan(r.id)}
                    >
                      OK
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => setConfirmId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </td>
              <td className="text-end">
                {Number(r.net_total).toLocaleString()}
              </td>
              <td className="text-end">{r.address}</td>
              <td className="text-end">{r.phone}</td>
              <td className="text-end">{r.name}</td>
            </tr>
          ))}
        </tbody>{" "}
        <tfoot>
          <tr className="fw-bold">
            {/* label before the total column */}
            <td className="text-end">ٹوٹل قرضہ(Σ)</td>
            <td className="text-end">{grandTotal.toLocaleString()}</td>
            {/* empty cells to keep grid alignment */}
            <td colSpan={3}></td>
          </tr>
        </tfoot>
      </table>
    </>
  );
}
