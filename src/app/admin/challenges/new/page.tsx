import { NewChallengeForm } from './NewChallengeForm';

export default function NewChallengePage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Nuova sfida</h1>
      <p className="text-sm text-neutral-600">
        Carica le 8 immagini Street View (heading 0°, 45°, 90°, 135°, 180°, 225°, 270°, 315°) e
        inserisci coordinate e metadati. Le immagini vengono caricate su R2 prima della creazione
        della sfida.
      </p>
      <NewChallengeForm />
    </div>
  );
}
