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
  // Celular con un globo de mensaje (consulta recibida, te escribimos)
  mensaje: {
    linea: <>
      <path d="M68 28V22a8 8 0 0 0-8-8H32a8 8 0 0 0-8 8v72a8 8 0 0 0 8 8h28a8 8 0 0 0 8-8V66" />
      <path d="M40 20h12M32 78h18M32 86h12" />
      <path d="M78 40h.01M86 40h.01M94 40h.01" strokeWidth="5" />
    </>,
    acento: <path d="M82.2 56.7A22 17 0 1 0 71.9 53L64 66z" />,
  },
  // Sobre abierto con un billete (caso cobrado)
  cobro: {
    linea: <>
      <path d="M34 54H22a4 4 0 0 0-4 4v40a4 4 0 0 0 4 4h76a4 4 0 0 0 4-4V58a4 4 0 0 0-4-4H86" />
      <path d="M19 56l41 26 41-26" />
      <path d="M34 66V28a4 4 0 0 1 4-4h44a4 4 0 0 1 4 4v38" />
      <circle cx="60" cy="46" r="7" />
      <path d="M42 32h8M70 32h8" />
    </>,
    acento: <path d="M92 15l5 5 10-11" />,
  },
  // Lupa sobre una hoja en blanco (sin resultados)
  lupa: {
    linea: <>
      <path d="M80 44V22a4 4 0 0 0-4-4H36L24 30v70a4 4 0 0 0 4 4h48a4 4 0 0 0 4-4V80" />
      <path d="M24 30h8a4 4 0 0 0 4-4v-8" />
      <circle cx="72" cy="62" r="18" />
      <path d="M85.5 75.5L100 90" strokeWidth="6" />
    </>,
    acento: <path d="M63 55a11 11 0 0 1 8-5" />,
  },
  // Libro abierto con señalador (Biblioteca)
  libros: {
    linea: <>
      <path d="M60 34Q78 24 98 30v58q-20-6-38 4q-18-10-38-4V30q20-6 38 4zM60 34v58" />
      <path d="M18 36v58h34q4 0 8 4q4-4 8-4h34V36" />
    </>,
    acento: <path d="M74 30v18l4-4 4 4V28" />,
  },
  // Flechas de actualizar y una llave (algo falló / versión nueva)
  actualizar: {
    linea: <>
      <path d="M76.5 69A26 26 0 0 1 31.5 69M39 71.7L31.5 69l-1.4 7.9" />
      <path d="M84.6 74.6A10 10 0 1 1 78.6 80.6L85.5 81.5z" />
      <path d="M95.1 91.1L106 102" strokeWidth="5" />
    </>,
    acento: <path d="M31.5 43A26 26 0 0 1 78.5 43M71 40.3l7.5 2.7 1.4-7.9" />,
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
