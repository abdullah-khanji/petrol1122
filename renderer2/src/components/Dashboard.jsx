import { useEffect, useState } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  LineElement, PointElement,
  CategoryScale, LinearScale, Tooltip, Legend,
} from 'chart.js';
import api from '../api';

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
);

export default function Dashboard() {
  const [cards, setCards] = useState({ petrol: '—', diesel: '—', total: '—' });
  const [chart, setChart] = useState({ labels: [], datasets: [] });

  /* fetch once on mount ------------------------------------------------ */
  useEffect(() => {
    /* cumulative revenue cards */
    api.get('/report/revenue-cumulative')
       .then(r => setCards(r.data))
       .catch(() => setCards({ petrol: '—', diesel: '—', total: '—' }));

    /* twin-line units chart */
    Promise.all([
      api.get('/readings2/petrol'),
      api.get('/readings2/diesel'),
    ]).then(([pt, ds]) => {
      setChart({
        labels: pt.data.map(r => r.date),
        datasets: [
          {
            label: 'Petrol',
            data:  pt.data.map(r => r.units),
            borderColor: '#28a745',            // green
            backgroundColor: '#28a745',
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
          {
            label: 'Diesel',
            data:  ds.data.map(r => r.units),
            borderColor: '#fd7e14',            // orange
            backgroundColor: '#fd7e14',
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
      legend: { position: 'top', labels: { boxWidth: 12, boxHeight: 12 } },
      tooltip: { mode: 'index', intersect: false },
    },
    interaction: { mode: 'index', intersect: false },
    scales: {
      x: { display: false },   // hide axes
      y: { display: false },
    },
  };

  return (
    <>
      {/* revenue cards */}
      <div className="row g-3 mb-4">
        <div className="col"><StatCard title="Petrol Revenue" value={cards.petrol[0].revenue} /></div>
        <div className="col"><StatCard title="Diesel Revenue" value={cards.diesel[0].revenue} /></div>
        <div className="col"><StatCard title="Total Revenue" value={cards.total.revenue} /></div>
        </div>

      {/* twin-line chart in half-width column */}
      <div className="row">
        <div className="col-6">
          <Line data={chart} options={options} />
        </div>
        <div className="col-6" >
        </div>
      </div>
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
