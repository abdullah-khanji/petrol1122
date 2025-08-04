// renderer/src/components/Dashboard.jsx
import { useEffect, useState } from 'react';
import { Line }  from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement, PointElement, CategoryScale,
  LinearScale, Tooltip, Legend,
} from 'chart.js';
import api from '../api';

ChartJS.register(LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function Dashboard() {
  const [chart, setChart] = useState({ labels: [], datasets: [] });

  /* one fetch on mount -------------------------------------------------- */
  useEffect(() => {
    Promise.all([
      api.get('/readings/petrol'),
      api.get('/readings/diesel'),
    ])
      .then(([petrolRes, dieselRes]) => {
        /* keep every reading date (they're already sorted) */
        const labels = petrolRes.data.map((r) => r.date);

        setChart({
          labels,
          datasets: [
            {
              label: 'Petrol',
              data: petrolRes.data.map((r) => r.units),
              borderColor: '#28a745',     // green
              backgroundColor: '#28a745',
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 2,
            },
            {
              label: 'Diesel',
              data: dieselRes.data.map((r) => r.units),
              borderColor: '#fd7e14',     // orange
              backgroundColor: '#fd7e14',
              tension: 0.3,
              pointRadius: 4,
              pointHoverRadius: 6,
              borderWidth: 2,
            },
          ],
        });
      })
      .catch(() => setChart({ labels: [], datasets: [] }));
  }, []);

  const options = {
    responsive: true,
    plugins: {
      legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      y: { grid: { color: '#e0e0e0' } },
      x: { grid: { display: false } },
    },
  };

  return (
    <>
      <div className="row">
        <div className="col-6">
      <h5 className="mb-3">Daily Units – Petrol (green) vs Diesel (orange)</h5>
          <Line data={chart} options={options}/>
        </div>

        {/* optional right-hand column for anything else */}
        <div className="col-6">
          {/* Put another chart, table, or leave blank for now */}
        </div>
      </div>
    </>
  );
}
