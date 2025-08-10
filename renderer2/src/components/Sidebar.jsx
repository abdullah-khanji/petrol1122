// Sidebar.jsx
import "./Sidebar.css";

const items = [
  { id: "dashboard", label: "ڈیش بورڈ" },
  { id: "readings", label: "ریڈنگز" },
  { id: "buying", label: "اسٹاک کی فہرست" },
  { id: "tyres", label: "ٹائر اسٹاک" },
  { id: "loan-records", label: "قرض کھاتہ" },
];

export default function Sidebar({ onSelect, current }) {
  return (
    <nav className="sidebar bg-dark border-start d-flex flex-column py-5 flex-shrink-0">
      {items.map((i) => (
        <a
          key={i.id}
          role="button"
          className={
            "nav-link text-white px-3 py-4 " +
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
