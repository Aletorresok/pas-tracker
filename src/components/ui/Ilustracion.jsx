// Ilustraciones de línea para pantallas vacías y la vista del cliente.
// Cuadradas (120×120) salvo las que dicen otro `ancho`; `size` es el alto.
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
  // Camino con vueltas y tres etapas; el auto llega a la bandera (el reclamo avanza hasta el cobro)
  camino: {
    ancho: 160,
    linea: <>
      <path d="M4 108H112C140 107 140 67 112 66H52C44 66 44 51 52 50.5L156 45" />
      <path d="M10 92H112C120 92 120 78 112 78H52C28 78 28 42 52 41.5L82 39.9M125 37.6L156 36" />
      <circle cx="20" cy="100" r="3.5" />
      <circle cx="82" cy="72" r="3.5" />
      <circle cx="140" cy="41.3" r="3" />
      <g transform="translate(94 44.3) rotate(-3)">
        <path d="M-4.5 0H-8a2 2 0 0 1-2-2v-5a3 3 0 0 1 2.4-2.9L-1-11l5-5a3 3 0 0 1 2.1-.9H15a3 3 0 0 1 2.3 1.1l4.2 4.8 4.5 1a3 3 0 0 1 2.4 2.9V-2a2 2 0 0 1-2 2h-2.5M4.5 0h10" />
        <circle cx="0" cy="0" r="4" />
        <circle cx="19" cy="0" r="4" />
        <path d="M1.5-11l4-4h9l4 4zM10.5-15v4" />
      </g>
    </>,
    acento: <path d="M140 38.3V18l12 4-12 4.5" />,
  },
};

export default function Ilustracion({ nombre, size = 96, style }) {
  const d = DIBUJOS[nombre];
  if (!d) return null;
  return (
    <svg viewBox={`0 0 ${d.ancho || 120} 120`} width={size * (d.ancho || 120) / 120} height={size} aria-hidden="true" fill="none" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"
      style={{ display: "block", flex: "none", ...style }}>
      <g stroke="var(--sub)">{d.linea}</g>
      <g stroke="var(--accent)">{d.acento}</g>
    </svg>
  );
}
