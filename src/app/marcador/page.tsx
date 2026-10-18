"use client";

import { useEffect, useRef } from "react";

/**
 * Se ejecuta en la página del anuncio (Idealista u otro portal), en el navegador
 * del usuario: recoge el texto visible y abre /add de esta app con él.
 * Los selectores de Idealista son best-effort; si cambian, el texto completo
 * de la página sigue llegando y el parser saca lo que puede.
 */
function bookmarkletCode(origin: string): string {
  const fn = `(function(){
var q=function(s){var e=document.querySelector(s);return e?e.innerText.trim():''};
var d={url:location.href,
title:q('.main-info__title-main')||q('h1')||document.title,
address:q('.main-info__title-minor'),
price:q('.info-data-price')||q('.re-DetailHeader-price'),
features:[q('.info-features'),q('.details-property')].join('\\n'),
text:((document.querySelector('main')||document.body).innerText||'').slice(0,6000)};
window.open('${origin}/add?d='+encodeURIComponent(JSON.stringify(d)),'_blank');
})();`;
  return "javascript:" + fn.replace(/\n/g, "");
}

export default function MarcadorPage() {
  const link = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // React no deja poner URLs javascript: en href, así que se fija a mano.
    link.current?.setAttribute("href", bookmarkletCode(window.location.origin));
  }, []);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4">
      <h1 className="text-2xl font-bold">Marcador para Idealista</h1>
      <p>
        Con este botón en tu barra de marcadores, añades un piso de Idealista con un clic: lee el anuncio en tu navegador y abre el formulario
        de esta app ya relleno.
      </p>

      <div className="card flex flex-col items-start gap-3">
        <a ref={link} className="btn-primary cursor-grab" onClick={(e) => e.preventDefault()} draggable>
          ＋ CampusRent
        </a>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">⬆ Arrastra este botón a la barra de marcadores de Chrome.</p>
      </div>

      <ol className="flex list-decimal flex-col gap-2 pl-6">
        <li>
          Si no ves la barra de marcadores, pulsa <kbd>Ctrl</kbd>+<kbd>Mayús</kbd>+<kbd>B</kbd> en Chrome.
        </li>
        <li>Arrastra el botón naranja de arriba hasta esa barra.</li>
        <li>Abre un piso en Idealista (la ficha del anuncio, no la lista de resultados).</li>
        <li>
          Pulsa <strong>＋ CampusRent</strong> en la barra. Se abre esta app con los datos: revísalos, marca el piso en el mapa y guarda.
        </li>
      </ol>

      <p className="text-sm text-neutral-500">
        Esta app tiene que estar arrancada (la ventana negra abierta). Si un día la arrancas en otro puerto (no 3000), vuelve a esta página y
        arrastra el botón otra vez. Si el marcador no rellena algo, también puedes copiar el texto del anuncio y pegarlo en «Añadir piso».
      </p>
    </div>
  );
}
