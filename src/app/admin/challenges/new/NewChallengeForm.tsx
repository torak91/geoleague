'use client';

import { useState, useTransition } from 'react';
import { HEADINGS } from '@/lib/headings';
import { createChallengeAction } from './actions';

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const REQUIRED_COUNT = HEADINGS.length;

function tomorrowIso(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

export function NewChallengeForm() {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [stage, setStage] = useState<'idle' | 'presigning' | 'uploading' | 'creating'>('idle');
  const [, startTransition] = useTransition();
  const [isSubmitting, setIsSubmitting] = useState(false);

  function onFilesChange(list: FileList | null) {
    setError(null);
    setProgress(0);
    if (!list) {
      setFiles([]);
      return;
    }
    const arr = Array.from(list);
    if (arr.length !== REQUIRED_COUNT) {
      setError(`Servono esattamente ${REQUIRED_COUNT} immagini (caricate ${arr.length}).`);
    }
    for (const f of arr) {
      if (f.type !== 'image/jpeg') {
        setError(`"${f.name}" non è JPEG.`);
      }
      if (f.size > MAX_FILE_BYTES) {
        setError(`"${f.name}" supera 5MB.`);
      }
    }
    // Sort alphabetically — must match heading order (script outputs
    // zero-padded names: 000.jpg, 015.jpg, … 345.jpg).
    arr.sort((a, b) => a.name.localeCompare(b.name));
    setFiles(arr);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (files.length !== REQUIRED_COUNT) {
      setError(`Servono esattamente ${REQUIRED_COUNT} immagini.`);
      return;
    }

    const formData = new FormData(e.currentTarget);
    const lat = parseFloat(formData.get('lat') as string);
    const lng = parseFloat(formData.get('lng') as string);
    const scheduled_for = formData.get('scheduled_for') as string;
    const difficulty = formData.get('difficulty') as 'easy' | 'medium' | 'hard';
    const region = formData.get('region') as 'nord' | 'centro' | 'sud' | 'isole';
    const location_label = (formData.get('location_label') as string).trim();

    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      setError('Coordinate non valide.');
      return;
    }

    setIsSubmitting(true);
    try {
      setStage('presigning');
      const presignRes = await fetch('/api/admin/upload-images', { method: 'POST' });
      if (!presignRes.ok) throw new Error('presign_failed');
      const { prefix, urls } = (await presignRes.json()) as {
        prefix: string;
        urls: Record<string, string>;
      };

      setStage('uploading');
      setProgress(0);
      let done = 0;
      await Promise.all(
        HEADINGS.map(async (h, i) => {
          const file = files[i];
          const url = urls[String(h)];
          if (!url) throw new Error(`no_presigned_url_${h}`);
          const res = await fetch(url, {
            method: 'PUT',
            headers: { 'Content-Type': 'image/jpeg' },
            body: file,
          });
          if (!res.ok) throw new Error(`upload_failed_${h}`);
          done += 1;
          setProgress(done);
        }),
      );

      setStage('creating');
      startTransition(async () => {
        const result = await createChallengeAction({
          image_prefix: prefix,
          scheduled_for,
          lat,
          lng,
          difficulty,
          region,
          location_label: location_label || null,
        });
        if (result && !result.ok) {
          setError(
            result.error === 'duplicate_date'
              ? 'Esiste già una sfida per questa data.'
              : 'Salvataggio non riuscito.',
          );
          setIsSubmitting(false);
          setStage('idle');
        }
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      setError(`Errore: ${msg}`);
      setIsSubmitting(false);
      setStage('idle');
    }
  }

  const fileCountOk = files.length === REQUIRED_COUNT;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <label className="block text-sm">
          <span className="font-medium">
            Immagini ({REQUIRED_COUNT} richieste, ordinate alfabeticamente = ordine heading)
          </span>
          <input
            type="file"
            accept="image/jpeg"
            multiple
            required
            onChange={(e) => onFilesChange(e.currentTarget.files)}
            className="mt-1 block w-full text-xs"
          />
          <span className="mt-1 block text-xs text-neutral-500">
            Generate con <code>npm run fetch:streetview -- &lt;lat&gt; &lt;lng&gt; ./out/&lt;slug&gt;</code>{' '}
            poi seleziona tutti i file della cartella.
          </span>
        </label>

        {files.length > 0 ? (
          <div className="mt-3 rounded-lg border border-neutral-200 bg-white p-2 text-xs">
            <div className="mb-1 flex items-center justify-between">
              <span className={fileCountOk ? 'text-green-700' : 'text-amber-700'}>
                {files.length} / {REQUIRED_COUNT} file
              </span>
              {stage === 'uploading' ? (
                <span className="text-blue-600">
                  Caricamento {progress} / {REQUIRED_COUNT}…
                </span>
              ) : null}
            </div>
            <ol className="grid max-h-32 grid-cols-2 gap-x-3 gap-y-0.5 overflow-y-auto font-mono text-[10px] text-neutral-600 sm:grid-cols-3 md:grid-cols-4">
              {files.map((f, i) => (
                <li key={f.name + i}>
                  {String(HEADINGS[i] ?? '?')}° ← {f.name}
                </li>
              ))}
            </ol>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium">Latitudine</span>
          <input
            name="lat"
            type="number"
            step="any"
            required
            min={-90}
            max={90}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Longitudine</span>
          <input
            name="lng"
            type="number"
            step="any"
            required
            min={-180}
            max={180}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Data programmata</span>
          <input
            name="scheduled_for"
            type="date"
            required
            defaultValue={tomorrowIso()}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium">Difficoltà</span>
          <select
            name="difficulty"
            required
            defaultValue="medium"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            <option value="easy">Facile</option>
            <option value="medium">Media</option>
            <option value="hard">Difficile</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="font-medium">Regione</span>
          <select
            name="region"
            required
            defaultValue="centro"
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2"
          >
            <option value="nord">Nord</option>
            <option value="centro">Centro</option>
            <option value="sud">Sud</option>
            <option value="isole">Isole</option>
          </select>
        </label>
        <label className="block text-sm sm:col-span-2">
          <span className="font-medium">Etichetta (opzionale, mostrata dopo la chiusura)</span>
          <input
            name="location_label"
            type="text"
            maxLength={120}
            className="mt-1 block w-full rounded-lg border border-neutral-300 px-3 py-2"
          />
        </label>
      </div>

      {error ? (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !fileCountOk}
        className="w-full rounded-lg bg-neutral-900 px-4 py-2 text-base font-medium text-white hover:bg-neutral-800 disabled:opacity-50"
      >
        {stage === 'presigning'
          ? 'Preparazione caricamento…'
          : stage === 'uploading'
            ? `Caricamento ${progress} / ${REQUIRED_COUNT}…`
            : stage === 'creating'
              ? 'Creazione sfida…'
              : 'Crea sfida'}
      </button>
    </form>
  );
}
