"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import ListingForm from "@/components/ListingForm";
import { parseListing } from "@/lib/parseListing";
import type { Campus, ListingInput } from "@/lib/types";

export default function AddClient({ campuses, initial }: { campuses: Campus[]; initial: ListingInput | null }) {
  const router = useRouter();
  const [data, setData] = useState<ListingInput>(initial ?? {});
  const [formKey, setFormKey] = useState(0);
  const [pasteUrl, setPasteUrl] = useState("");
  const [pasteText, setPasteText] = useState("");
  const [duplicate, setDuplicate] = useState<number | null>(null);

  function applyPaste() {
    setData(parseListing({ url: pasteUrl, text: pasteText }));
    setFormKey((k) => k + 1);
  }

  async function save(input: ListingInput): Promise<string | null> {
    setDuplicate(null);
    const res = await fetch("/api/listings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await res.json();
    if (res.status === 409) {
      setDuplicate(body.id);
      return body.error;
    }
    if (!res.ok) return body.error ?? "No se pudo guardar";
    router.push(`/listing/${body.listing.id}`);
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4">
      <h1 className="text-2xl font-bold">Añadir piso</h1>

      {initial ? (
        <p className="card text-sm">
          Datos leídos del anuncio con el marcador. <strong>Revísalos</strong> (sobre todo precio, m² y habitaciones), coloca el piso en el mapa y guarda.
        </p>
      ) : (
        <details className="card text-sm" open>
          <summary className="cursor-pointer font-semibold">Rellenar a partir del texto del anuncio</summary>
          <div className="mt-3 flex flex-col gap-2">
            <p className="text-neutral-600 dark:text-neutral-400">
              En el anuncio de Idealista pulsa <kbd>Ctrl</kbd>+<kbd>A</kbd> y <kbd>Ctrl</kbd>+<kbd>C</kbd>, y pégalo aquí. O más
              cómodo: usa el <Link className="underline" href="/marcador">marcador</Link>.
            </p>
            <input className="input" placeholder="Enlace del anuncio (opcional)" value={pasteUrl} onChange={(e) => setPasteUrl(e.target.value)} />
            <textarea className="input min-h-28" placeholder="Pega aquí el texto del anuncio…" value={pasteText} onChange={(e) => setPasteText(e.target.value)} />
            <div>
              <button type="button" className="btn" onClick={applyPaste} disabled={!pasteText.trim()}>
                Leer datos
              </button>
            </div>
          </div>
        </details>
      )}

      {duplicate != null && (
        <p className="text-sm">
          Ya lo tenías guardado: <Link className="underline" href={`/listing/${duplicate}`}>ver ficha</Link>.
        </p>
      )}

      <ListingForm key={formKey} initial={data} campuses={campuses} submitLabel="Guardar y analizar" onSubmit={save} />
    </div>
  );
}
