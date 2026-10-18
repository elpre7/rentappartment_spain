# CampusRent

App local para analizar pisos de **3-4 habitaciones** para alquilar a **estudiantes**, en varias ciudades
universitarias: Zaragoza, Huelva, Jaén, Burgos, León, Huesca y Castellón vienen ya configuradas y puedes añadir más
desde Ajustes.

Para cada piso calcula dos escenarios, **por habitaciones** y **piso entero a un grupo**. Cada uno incluye
ITP, notaría, hipoteca, comunidad, IBI, seguros, meses vacíos en verano, suministros, muebles e impuestos.
También dice a cuántos minutos andando está cada campus.

Se basa en la idea de [Brickwise](https://github.com/eljommys/brickwise) (MIT), adaptada a España.

## Arrancarla (Windows)

Necesitas [Node.js](https://nodejs.org) (versión LTS). Después, en la ventana negra (`cmd`):

```
git clone https://github.com/elpre7/rentappartment_spain.git
cd rentappartment_spain
git checkout claude/zealous-wozniak-03k9dt
npm install
npm run dev
```

Si no tienes `git`, descarga el código desde GitHub: elige la rama `claude/zealous-wozniak-03k9dt`, pulsa
**Code → Download ZIP** y descomprímelo. Luego, en `cmd`, entra en esa carpeta con `cd` y ejecuta `npm install` y
`npm run dev`.

Abre http://localhost:3000 en el navegador. **No cierres la ventana negra** mientras la uses.

Para volver a arrancarla otro día, abre `cmd` y escribe:

```
cd rentappartment_spain
npm run dev
```

## Cómo se usa

1. **Marcador**: entra en la pestaña «Marcador» y arrastra el botón naranja a la barra de marcadores de Chrome.
2. Abre un piso en **Idealista** y pulsa el marcador. Se abre la app con los datos ya rellenos.
3. Revisa los datos, **haz clic en el mapa** donde está el piso y guarda.
4. En la ficha ves los dos escenarios lado a lado y si el piso pasa tu filtro: neta mínima, cash-on-cash mínimo y
   minutos al campus.
5. En **Ajustes** cambias todos los supuestos. Todos los pisos se recalculan al momento.

Sin marcador también funciona: en «Añadir piso» pegas el texto del anuncio (`Ctrl+A`, `Ctrl+C` en Idealista) o rellenas
el formulario a mano.

## Supuestos por defecto (revísalos)

Cada ciudad tiene su renta de referencia por habitación, su renta por m² del piso entero y el ITP de su comunidad
(Ajustes → Ciudades). Se usan solo si el piso no tiene las suyas: en la ficha puedes poner las de la zona.

| Ciudad | Habitación | Piso entero | ITP | Fuente de las rentas |
| --- | --- | --- | --- | --- |
| Zaragoza | 375 €/mes | 12,3 €/m² | 8 % | HousingAnywhere 2025; idealista ago. 2026 |
| León | 300 €/mes | 8,5 €/m² | 8 % | habitación: idealista jun. 2026; piso: estimación |
| Jaén | 230 €/mes | 7,5 €/m² | 7 % | habitación: idealista 2024 + subida; piso: estimación |
| Huelva, Burgos, Huesca, Castellón | 260–300 €/mes | 9–10 €/m² | 7–10 % | estimación propia |

Los tipos de ITP son el general de cada comunidad, de memoria: compruébalos.

Comunes a todas las ciudades (Ajustes):

| Supuesto | Valor | Nota |
| --- | --- | --- |
| Hipoteca | 70 % al 3,5 % a 25 años | supuesto |
| Meses vacíos | 1,5 por habitaciones, 1 entero | verano |
| Impuesto | 19 % sobre el rendimiento neto | IRNR para residentes en la UE |
| Tope por habitaciones | desactivado | si se activa, la suma de las habitaciones no puede superar la renta del piso entero |

Las coordenadas de los campus son **aproximadas**. Corrígelas en Ajustes (Google Maps → clic derecho → copiar coordenadas).

Es una herramienta de cálculo orientativa, no asesoramiento fiscal ni de inversión.

## Datos

Todo se guarda en `~/.campusrent/campusrent.db`, dentro de tu carpeta de usuario. Para hacer una copia, copia ese fichero.
La ubicación se puede cambiar con la variable de entorno `CAMPUSRENT_DB`.

## Desarrollo

```
npm test        # tests del modelo financiero y del lector de anuncios
npm run lint
npm run build
```

Los informes de investigación están en `reports/` y las notas en `research_notes/`.
