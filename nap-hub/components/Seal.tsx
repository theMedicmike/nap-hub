export function Seal({ size = 30, full = false }: { size?: number; full?: boolean }) {
  if (!full) {
    return (
      <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx="60" cy="60" r="46" fill="none" stroke="#B48A2F" strokeWidth="2.5" />
        <path d="M60 40 C73 51 73 69 60 82 C47 69 47 51 60 40 Z" fill="#B48A2F" />
        <line x1="60" y1="44" x2="60" y2="80" stroke="#14233B" strokeWidth="2" />
      </svg>
    );
  }
  const nodes = [
    [106, 60], [92.5, 27.5], [60, 14], [27.5, 27.5],
    [14, 60], [27.5, 92.5], [60, 106], [92.5, 92.5],
  ];
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden="true">
      <circle cx="60" cy="60" r="52" fill="none" stroke="#B48A2F" strokeWidth="0.6" opacity="0.45" />
      <g stroke="#B48A2F" strokeWidth="0.7" opacity="0.28">
        {nodes.map(([x, y], i) => (
          <line key={i} x1="60" y1="60" x2={x} y2={y} />
        ))}
      </g>
      <circle cx="60" cy="60" r="46" fill="none" stroke="#B48A2F" strokeWidth="1" />
      <g fill="#C9A45A">
        {nodes.map(([x, y], i) => (
          <circle key={i} cx={x} cy={y} r="3.6" />
        ))}
      </g>
      <path d="M60 38 C75 51 75 71 60 84 C45 71 45 51 60 38 Z" fill="#B48A2F" />
      <g stroke="#14233B" strokeWidth="1.4">
        <line x1="60" y1="43" x2="60" y2="81" />
        <line x1="60" y1="56" x2="69" y2="50" />
        <line x1="60" y1="56" x2="51" y2="50" />
        <line x1="60" y1="66" x2="69" y2="61" />
        <line x1="60" y1="66" x2="51" y2="61" />
      </g>
    </svg>
  );
}
