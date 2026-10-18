import assert from "node:assert/strict";
import { test } from "node:test";
import { externalIdFromUrl, parseEuros, parseListing } from "./parseListing.ts";

test("precios en formato español", () => {
  assert.equal(parseEuros("185.000 €"), 185000);
  assert.equal(parseEuros("1.250.000€"), 1250000);
  assert.equal(parseEuros("199000 €"), 199000);
  assert.equal(parseEuros(""), undefined);
});

test("id del anuncio", () => {
  assert.equal(externalIdFromUrl("https://www.idealista.com/inmueble/104567890/"), "idealista:104567890");
  assert.equal(externalIdFromUrl("https://www.idealista.com/en/inmueble/104567890/?x=1"), "idealista:104567890");
  assert.equal(externalIdFromUrl("https://example.com/piso"), "");
});

test("texto típico de una ficha de idealista", () => {
  const text = `Piso en venta en calle de Pedro Cerbuna
Universidad, Zaragoza
185.000 €
92 m² 4 hab. Planta 3ª exterior con ascensor
Características básicas
92 m² construidos, 80 m² útiles
4 habitaciones
2 baños
Gastos de comunidad 60 €/mes
2.010 €/m²`;
  const r = parseListing({ url: "https://www.idealista.com/inmueble/1234567/?foo", text });
  assert.equal(r.url, "https://www.idealista.com/inmueble/1234567/");
  assert.equal(r.external_id, "idealista:1234567");
  assert.equal(r.price, 185000);
  assert.equal(r.size_m2, 92);
  assert.equal(r.rooms, 4);
  assert.equal(r.bathrooms, 2);
  assert.equal(r.floor, "Planta 3ª");
  assert.equal(r.elevator, true);
  assert.equal(r.community_monthly, 60);
  assert.equal(r.title, "Piso en venta en calle de Pedro Cerbuna");
});

test("campos separados del marcador y sin ascensor", () => {
  const r = parseListing({
    title: " Piso en Delicias ",
    address: "Delicias, Zaragoza",
    price: "139.900 €",
    features: "110 m² 3 hab. Bajo exterior sin ascensor",
  });
  assert.equal(r.title, "Piso en Delicias");
  assert.equal(r.price, 139900);
  assert.equal(r.size_m2, 110);
  assert.equal(r.rooms, 3);
  assert.equal(r.floor, "Bajo");
  assert.equal(r.elevator, false);
});
