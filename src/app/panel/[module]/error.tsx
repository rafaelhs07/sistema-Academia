'use client';
export default function ErrorPage({reset}:{reset:()=>void}){return <main className="standalone"><div className="card"><h1>No pudimos abrir esta sección</h1><p>Vuelve a intentar. Si continúa, comparte el momento del error con el administrador.</p><button className="btn primary" onClick={reset}>Volver a intentar</button></div></main>;}
