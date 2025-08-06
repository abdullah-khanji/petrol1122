// renderer/src/components/TyreTable.jsx
import { useEffect, useState } from "react";
import api from "../api";

export default function TyreTable() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sellQty, setSellQty] = useState({}); // id → qty input
  const [msg, setMsg] = useState("");

  useEffect(() => {
    reload();
  }, []);

  function reload() {
    setLoading(true);
    api
      .get("/tyre_stock")
      .then((r) => setRows(r.data))
      .finally(() => setLoading(false));
  }

  /* record sale ---------------------------------------------------------- */
  function handleSale(id) {
    const qty = Number(sellQty[id] || 0);
    if (!qty) return;

    setMsg("Saving…");
    api
      .post("/tyre/sale", { id, units_sold: qty })
      .then(() => {
        setMsg("Saved ✓");
        setSellQty((s) => ({ ...s, [id]: "" }));
        reload();
      })
      .catch(() => setMsg("Error"));
  }

  if (loading) return <div className="p-4">Loading…</div>;

  return (
    <div className="p-4">
      <h2 className="mb-3">Tyre Stock / Sales</h2>

      <div className="table-responsive">
        <table className="table table-striped table-hover table-sm fs-6">
          <thead className="table-dark">
            <tr>
              <th>Tyre</th>
              <th className="text-end">Buying&nbsp;Price</th>
              <th className="text-end">Available</th>
              <th className="text-end">Sold</th>
              <th className="text-end">Sell&nbsp;Qty</th>
              <th></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{r.tyre}</td>
                <td className="text-end fw-normal">
                  {r.buying_price.toFixed(2)}
                </td>
                <td className="text-end fw-normal">{r.available_stock}</td>
                <td className="text-end fw-normal">{r.sold_units}</td>
                <td className="text-end fw-normal" style={{ width: 90 }}>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    value={sellQty[r.id] || ""}
                    onChange={(e) =>
                      setSellQty((s) => ({ ...s, [r.id]: e.target.value }))
                    }
                  />
                </td>
                <td>
                  <button
                    className="btn btn-sm btn-primary"
                    disabled={!sellQty[r.id]}
                    onClick={() => handleSale(r.id)}
                  >
                    Sell
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {msg && <span>{msg}</span>}
      </div>
    </div>
  );
}
