'use client';
import { Printer } from 'lucide-react';
export function PrintButton(){return <button className="btn primary no-print" onClick={()=>window.print()}><Printer size={17}/>Imprimir o guardar PDF</button>;}
