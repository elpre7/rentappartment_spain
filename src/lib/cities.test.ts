import assert from "node:assert/strict";
import { test } from "node:test";
import { detectCity, SEED_CITIES } from "./cities.ts";

test("detecta la ciudad por el texto del anuncio", () => {
  assert.equal(detectCity("Delicias, Zaragoza", SEED_CITIES), "zaragoza");
  assert.equal(detectCity("Piso en Centro, Jaen", SEED_CITIES), "jaen");
  assert.equal(detectCity("Gamonal, Burgos\nCastilla y León", SEED_CITIES), "burgos");
  assert.equal(detectCity("Eras de Renueva, León", SEED_CITIES), "leon");
  assert.equal(detectCity("Castellón de la Plana", SEED_CITIES), "castellon");
  assert.equal(detectCity("Madrid centro", SEED_CITIES), undefined);
});

test("las ciudades de serie tienen campus y valores con sentido", () => {
  for (const c of SEED_CITIES) {
    assert.ok(c.campuses.length > 0, c.id);
    assert.ok(c.room_rent > 100 && c.whole_rent_m2 > 3 && c.itp_pct > 0 && c.itp_pct < 0.15, c.id);
  }
});
