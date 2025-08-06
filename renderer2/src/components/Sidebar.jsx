// renderer/src/components/Sidebar.jsx
import "./Sidebar.css";

const items = [
  { id: "dashboard", label: "Dashboard" },
  { id: "readings", label: "Readings" },
  { id: "buying", label: "Buying List" },
  { id: "tyres", label: "Tyre Stock" },
];

export default function Sidebar({ onSelect, current }) {
  return (
    <nav className="sidebar bg-dark d-flex flex-column">
      {items.map((i) => (
        <a
          key={i.id}
          role="button"
          className={
            "nav-link text-white px-3 py-2 " +
            (current === i.id ? "active" : "link-light")
          }
          onClick={() => onSelect(i.id)}
        >
          <strong>{i.label}</strong>
        </a>
      ))}
    </nav>
  );
}
