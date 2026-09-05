const wing = "M34 48C18 42 8 28 5 12c13 5 23 15 31 29M66 48c16-6 26-20 29-36-13 5-23 15-31 29";
const laurels = "M31 75C17 67 12 52 16 36M69 75c14-8 19-23 15-39";
const crown = "M35 25l7-15 8 11 8-11 7 15-5 9H40z";
const crystal = "M50 4l7 18-7 8-7-8z";

export default function XpFrameDecorations({ type }) {
  if (type === 'starter') return <><path d="M22 27l-8-8 12 2M78 27l8-8-12 2M22 73l-8 8 12-2M78 73l8 8-12-2"/><circle cx="50" cy="88" r="4"/></>;
  if (type === 'blue') return <><path d="M12 42l9-7-3 11 9-5M88 42l-9-7 3 11-9-5"/><path d="M50 6l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/><circle cx="50" cy="88" r="5"/></>;
  if (type === 'green') return <><path d={laurels}/>{[32,44,56,68].map((y)=><g key={y}><ellipse cx="18" cy={y} rx="7" ry="3" transform={`rotate(${y-62} 18 ${y})`}/><ellipse cx="82" cy={y} rx="7" ry="3" transform={`rotate(${62-y} 82 ${y})`}/></g>)}<path d={crystal}/></>;
  if (type === 'cyan') return <><path d={crystal}/><path d="M18 28l13 5-8 9-12-1zM82 28l-13 5 8 9 12-1zM20 72l13-6-5 13-12 5zM80 72l-13-6 5 13 12 5z"/></>;
  if (type === 'violet') return <><path d={crystal}/><path d="M27 23l8 12-13 1zM73 23l-8 12 13 1zM16 50l15-6-3 14zM84 50l-15-6 3 14zM28 78l8-14-14 2zM72 78l-8-14 14 2z"/></>;
  if (type === 'pink') return <><path d={wing}/><path d="M50 20c-9-10-20 3 0 16 20-13 9-26 0-16M50 82c-11-12-23 4 0 18 23-14 11-30 0-18"/></>;
  if (type === 'fire') return <><path d={wing}/><path d="M50 3c12 15-5 18 5 30-18-8-11-21-5-30M17 55c12 8 2 17 12 24-17-2-19-14-12-24M83 55c-12 8-2 17-12 24 17-2 19-14 12-24"/></>;
  if (type === 'gold') return <><path d={crown}/><path d={laurels}/><circle cx="50" cy="88" r="5"/></>;
  if (type === 'ice') return <><path d={wing}/><path d="M50 5v28M38 12l24 14M62 12L38 26M50 82v15M43 89h14"/></>;
  return <><path d={crown}/><path d={wing}/><path d={crystal}/><path d="M18 56c12 7 1 16 12 23-17-2-18-13-12-23M82 56c-12 7-1 16-12 23 17-2 18-13 12-23"/><circle cx="50" cy="88" r="6"/></>;
}