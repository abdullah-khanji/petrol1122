// renderer/src/components/DetailRecord.jsx
import { useEffect, useMemo, useState } from "react";
import api from "../api";

export default function DetailRecord({ personId, onBack }) {
  const [info, setInfo] = useState(null);

  // loan form
  const [form, setForm] = useState({
    date: "",
    units: "",
    unit_rate: "",
    fuel_type: "petrol",
  });

  // payment form
  const [pform, setPform] = useState({
    date: "",
    amount: "",
  });

  // inline delete confirm state
  const [confirmId, setConfirmId] = useState(null);
  const [confirmPayId, setConfirmPayId] = useState(null);
  const reload = () =>
    api.get(`/loans/person/${personId}`).then((res) => setInfo(res.data));

  useEffect(() => {
    reload();
  }, [personId]);

  function addLoan(e) {
    e.preventDefault();
    api
      .post("/loans", { ...form, person_id: personId })
      .then(reload)
      .then(() =>
        setForm({ date: "", units: "", unit_rate: "", fuel_type: "petrol" })
      );
  }

  function addPayment(e) {
    e.preventDefault();
    api
      .post("/payments", {
        paid_by: personId,
        date: pform.date,
        amount: Number(pform.amount),
      })
      .then(reload)
      .then(() => setPform({ date: "", amount: "" }));
  }

  async function doDeleteLoan(id) {
    try {
      await api.delete(`/loans/${id}`);
      await reload();
      setConfirmId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete loan");
    }
  }
  async function doDeletePayment(id) {
    try {
      await api.delete(`/payments/${id}`);
      await reload();
      setConfirmPayId(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete payment");
    }
  }
  // Merge loans + payments into a single chronological list
  const mergedRows = useMemo(() => {
    if (!info) return [];

    const loanRows = (info.loans || []).map((l) => ({
      kind: "loan",
      id: l.id,
      date: l.date,
      fuel: l.fuel_type,
      units: l.units,
      rate: l.unit_rate,
      amount: Number(l.pkr ?? l.units * l.unit_rate),
    }));

    const payRows = (info.payments || []).map((p) => ({
      kind: "payment",
      id: p.id,
      date: p.date,
      fuel: "—",
      units: "—",
      rate: "—",
      amount: Number(p.amount), // shown in Rs column
    }));

    // newest first; tie-break: loans before payments on same date
    return [...loanRows, ...payRows].sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      if (db !== da) return db - da;
      if (a.kind !== b.kind) return a.kind === "loan" ? -1 : 1;
      return (b.id ?? 0) - (a.id ?? 0);
    });
  }, [info]);

  if (!info) return <p>Loading…</p>;

  const totalLoan = info.totals?.loan ?? 0;
  const totalPaid = info.totals?.paid ?? 0;
  const totalNet = info.totals?.net ?? totalLoan - totalPaid;

  return (
    <div className="container-fluid">
      <button className="btn btn-link mb-2" onClick={onBack}>
        ← back
      </button>

      {/* RIGHT header card + forms */}
      <div className="row">
        <div className="col-6">
          <form className="row g-2 form-sm" onSubmit={addPayment}>
            <div className="col-auto mt-5">
              <button className="btn btn-success btn-sm">وصول</button>
            </div>
            <div className="col-3">
              <label className="form-label mt-3 mb-0">
                رقم
                <input
                  type="number"
                  step="0.01"
                  className="form-control form-control-sm"
                  value={pform.amount}
                  onChange={(e) =>
                    setPform({ ...pform, amount: e.target.value })
                  }
                  required
                />
              </label>
            </div>
            <div className="col-3">
              <label className="form-label mt-3 mb-0">
                تاریخ
                <input
                  type="date"
                  className="form-control form-control-sm"
                  value={pform.date}
                  onChange={(e) => setPform({ ...pform, date: e.target.value })}
                  required
                />
              </label>
            </div>
          </form>
        </div>

        <div className="col-6 my_text text-end">
          {/* person + totals card */}
          <div className="card mb-3">
            <div className="card-body">
              <h5 className="card-title mb-3">{info.person.name} : نام</h5>
              <p className="mb-2">{info.person.address} : پتہ</p>
              <p className="mb-2">{info.person.phone} : فون</p>
              <hr />
              <p className="mb-1">قرض: {Number(totalLoan).toLocaleString()}</p>
              <p className="mb-1">
                ادا شدہ: {Number(totalPaid).toLocaleString()}
              </p>
              <p className="mb-0 fw-bold">
                بقیہ: {Number(totalNet).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>
      <hr />
      {/* add-loan form */}
      <div className="row">
        <form
          className="row g-2 align-items-end justify-content-end mb-3 form-sm text-end"
          onSubmit={addLoan}
        >
          <div className="col-auto">
            <button className="btn btn-primary btn-sm">
              &nbsp;&nbsp;&nbsp;درج&nbsp;&nbsp;&nbsp;
            </button>
          </div>
          <div className="col-2">
            <label className="form-label mb-0 d-block">
              قسم
              <select
                className="form-select form-select-sm"
                value={form.fuel_type}
                onChange={(e) =>
                  setForm({ ...form, fuel_type: e.target.value })
                }
              >
                <option value="petrol">Petrol</option>
                <option value="diesel">Diesel</option>
              </select>
            </label>
          </div>
          <div className="col-3">
            <label className="form-label mb-0">
              یونٹ ریٹ
              <input
                type="number"
                step="0.01"
                className="form-control form-control-sm"
                value={form.unit_rate}
                onChange={(e) =>
                  setForm({ ...form, unit_rate: e.target.value })
                }
              />
            </label>
          </div>
          <div className="col-3">
            <label className="form-label mb-0">
              یونٹس
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
              تاریخ
              <input
                type="date"
                className="form-control form-control-sm"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </label>
          </div>
        </form>
      </div>
      <hr />
      {/* Loans table */}
      <table className="table table-sm table-bordered mt-4">
        <thead className="table-light">
          <tr>
            <th style={{ width: 140 }}></th>
            <th>تاریخ</th>
            <th>قسم</th>
            <th>یونٹس</th>
            <th>ریٹ</th>
            <th>Rs رقم</th>
          </tr>
        </thead>

        <tbody>
          {mergedRows.map((r) => (
            <tr key={`${r.kind}-${r.id}`}>
              <td>
                {r.kind === "loan" ? (
                  confirmId !== r.id ? (
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
                  )
                ) : confirmPayId !== r.id ? (
                  <span
                    role="button"
                    className="badge text-bg-success"
                    style={{ cursor: "pointer" }}
                    onClick={() => setConfirmPayId(r.id)}
                    title="Delete payment"
                  >
                    delete
                  </span>
                ) : (
                  <div className="d-flex gap-2">
                    <span
                      role="button"
                      className="badge text-bg-danger"
                      style={{ cursor: "pointer" }}
                      onClick={() => doDeletePayment(r.id)}
                    >
                      OK
                    </span>
                    <span
                      role="button"
                      className="badge text-bg-secondary"
                      style={{ cursor: "pointer" }}
                      onClick={() => setConfirmPayId(null)}
                    >
                      cancel
                    </span>
                  </div>
                )}
              </td>

              <td>{r.date}</td>
              <td>{r.fuel}</td>
              <td>{r.units}</td>
              <td>{r.rate}</td>

              {/* Rs amount: green for payments, normal for loans */}
              <td
                className={
                  r.kind === "payment" ? "text-success fw-semibold" : ""
                }
              >
                {Number(r.amount).toLocaleString()}
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={6}></td>
          </tr>
        </tbody>

        <tfoot>
          <tr className="fw-bold text-end">
            <td colSpan={5}>Loan Total (Σ)</td>
            <td>{Number(totalLoan).toLocaleString()}</td>
          </tr>
          <tr className="fw-bold text-end">
            <td colSpan={5}>Paid Total (Σ)</td>
            <td className="text-success">
              {Number(totalPaid).toLocaleString()}
            </td>
          </tr>
          <tr className="fw-bold text-end">
            <td colSpan={5}>Net (Loan − Paid)</td>
            <td>{Number(totalNet).toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
