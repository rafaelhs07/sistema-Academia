'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Phone, ShieldAlert, Award, Copy, Check, Printer, MessageSquareText } from 'lucide-react';
import type { AppContext } from '@/lib/context';
import { allowed } from '@/lib/money';

export function StudentProfile({
  context,
  id,
  revision
}: {
  context: AppContext;
  id: string;
  revision: number;
}) {
  const [student, setStudent] = useState<Record<string, unknown> | null>(null);
  const [message, setMessage] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    fetch(
      `/api/data/students?academy=${context.academy.id}&student=${id}${
        context.branch ? `&branch=${context.branch}` : ''
      }`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(data => setStudent(data.rows?.[0] ?? null))
      .catch(() => {});
    return () => controller.abort();
  }, [context.academy.id, context.branch, id, revision]);

  async function collection() {
    const response = await fetch(`/api/collection?academy=${context.academy.id}&student=${id}`);
    const data = await response.json();
    setMessage(data.error ?? data.message);
    setCopied(false);
  }

  function copyToClipboard() {
    if (!message) return;
    navigator.clipboard.writeText(message);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  }

  if (!student) return null;

  const labels = (student._labels as Record<string, string>) ?? {};

  return (
    <section className="card student-profile">
      <div className="profile-heading">
        {student.photo_path && allowed(context.permissions, 'documents.read') ? (
          <Image
            unoptimized
            width={72}
            height={72}
            src={`/api/students/${id}/photo?academy=${context.academy.id}`}
            alt={`Fotografía de ${student.name}`}
            className="rounded-xl border border-slate-200"
          />
        ) : (
          <span className="profile-initial">
            {String(student.name)[0]}
          </span>
        )}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="eyebrow mb-0">EXPEDIENTE DEL ESTUDIANTE</span>
            <span className={`badge ${String(student.status)}`}>
              <span className="status-dot" />
              {String(student.status).toUpperCase()}
            </span>
          </div>
          <h2>{String(student.name)}</h2>
          <p className="text-muted">
            Miembro desde el {String(student.joined_on).slice(0, 10)}
            {student.birth_date ? ` · Nacimiento: ${String(student.birth_date).slice(0, 10)}` : ''}
          </p>
        </div>

        {allowed(context.permissions, 'billing.read') && (
          <div className="profile-actions self-start">
            <Link
              target="_blank"
              className="btn small"
              href={`/estado-cuenta/${id}?academy=${context.academy.id}`}
            >
              <Printer size={15} />
              <span>Estado de cuenta</span>
            </Link>
            <button className="btn small primary" onClick={collection}>
              <MessageSquareText size={15} />
              <span>Aviso de cobro</span>
            </button>
          </div>
        )}
      </div>

      <div className="student-facts">
        <div>
          <small className="flex items-center gap-1.5">
            <Phone size={13} />
            <span>Contacto directo</span>
          </small>
          <strong>{String(student.phone ?? 'Sin teléfono registrado')}</strong>
          <span>{String(student.email ?? 'Sin correo registrado')}</span>
        </div>

        <div>
          <small className="flex items-center gap-1.5">
            <ShieldAlert size={13} />
            <span>Contacto de emergencia</span>
          </small>
          <strong>{String(student.emergency_name ?? 'Por configurar')}</strong>
          <span>{String(student.emergency_phone ?? 'Sin teléfono de emergencia')}</span>
        </div>

        <div>
          <small className="flex items-center gap-1.5">
            <Award size={13} />
            <span>Disciplina y Grupo</span>
          </small>
          <strong>{String(labels.discipline_id ?? 'Disciplina general')}</strong>
          <span>{String(labels.group_id ?? 'Sin grupo asignado')}</span>
        </div>
      </div>

      {message && (
        <div className="collection-message p-4 bg-slate-50 border border-slate-200 rounded-lg mt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-xs text-slate-700">Mensaje generado para enviar por WhatsApp o correo:</span>
            <button
              type="button"
              className="btn small"
              onClick={copyToClipboard}
              title="Copiar texto"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? '¡Copiado!' : 'Copiar mensaje'}</span>
            </button>
          </div>
          <textarea
            readOnly
            value={message}
            className="w-full bg-white border border-slate-300 rounded p-2 text-xs font-mono"
            rows={4}
          />
          <small className="text-muted block mt-1">
            Copia y pega este texto en tu canal de mensajería preferido. El sistema no realiza envíos automáticos.
          </small>
        </div>
      )}
    </section>
  );
}
