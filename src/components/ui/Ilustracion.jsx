// Ilustraciones de línea para pantallas vacías y la vista del cliente.
// Trazo en el color del texto (se adapta a claro/oscuro) y un detalle en el color de acento.
const DIBUJOS = {
  // Carpeta abierta y vacía
  carpeta: {
    linea: <>
      <path d="M18 88V34a4 4 0 0 1 4-4h22l8 8h36a4 4 0 0 1 4 4v8" />
      <path d="M18 92l12-38a4 4 0 0 1 4-3h66a3 3 0 0 1 3 4L91 90a4 4 0 0 1-4 3H21a3 3 0 0 1-3-3" />
    </>,
    acento: <path d="M52 46v-6a2 2 0 0 1 2-2h20a2 2 0 0 1 2 2v6" />,
  },
  // Tarea terminada con un café
  listo: {
    linea: <>
      <path d="M16 58l18 18 40-44" strokeWidth="5" />
      <path d="M70 74h28v8a12 12 0 0 1-12 12h-4a12 12 0 0 1-12-12z" />
      <path d="M98 78h2a5 5 0 0 1 0 10h-3" />
      <path d="M64 102h42" />
    </>,
    acento: <path d="M80 66c-3-4 3-6 0-10M90 66c-3-4 3-6 0-10" />,
  },
  // Celular sacándole una foto a un documento
  foto: {
    linea: <>
      <rect x="40" y="10" width="40" height="70" rx="7" />
      <path d="M54 15h12" />
      <rect x="49" y="34" width="22" height="16" rx="3" />
      <circle cx="60" cy="42" r="4.5" />
      <path d="M22 108l18-16h62l-18 16z" />
      <path d="M46 100h30M52 96h26" />
    </>,
    acento: <path d="M86 20l6-6M88 30h8M82 12V4" />,
  },
  // Auto con un escudo (el seguro)
  auto: {
    linea: <>
      <path d="M20 84h-4a2 2 0 0 1-2-2v-10a6 6 0 0 1 4-6l14-4 12-12a8 8 0 0 1 6-2h28a8 8 0 0 1 6 3l12 13 10 2a6 6 0 0 1 5 6v10a2 2 0 0 1-2 2h-5" />
      <circle cx="33" cy="84" r="8" />
      <circle cx="89" cy="84" r="8" />
      <path d="M41 84h40" />
      <path d="M50 60l8-8h13v8zM77 52h9l8 8H77z" />
    </>,
    acento: <path d="M62 64l7 3v5c0 5-3 8-7 9-4-1-7-4-7-9v-5z" />,
  },
};

export default function Ilustracion({ nombre, size = 96, style }) {
  const d = DIBUJOS[nombre];
  if (!d) return null;
  return (
    <svg viewBox="0 0 120 120" width={size} height={size} aria-hidden="true" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", ...style }}>
      <g stroke="var(--sub)">{d.linea}</g>
      <g stroke="var(--accent)">{d.acento}</g>
    </svg>
  );
}
