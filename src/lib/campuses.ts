import type { Campus } from "./types";

/**
 * Campus de Zaragoza con coordenadas APROXIMADAS (de memoria, sin verificar
 * en un mapa). Se pueden corregir en Ajustes: basta con buscar el edificio en
 * Google Maps, clic derecho → copiar coordenadas.
 */
export const DEFAULT_CAMPUSES: Omit<Campus, "id">[] = [
  { name: "Campus San Francisco", university: "Universidad de Zaragoza", lat: 41.6422, lng: -0.9005, active: true },
  { name: "Facultad de Medicina y Ciencias de la Salud", university: "Universidad de Zaragoza", lat: 41.6368, lng: -0.9038, active: true },
  { name: "Campus Río Ebro (EINA)", university: "Universidad de Zaragoza", lat: 41.6833, lng: -0.8885, active: true },
  { name: "Facultad de Veterinaria", university: "Universidad de Zaragoza", lat: 41.6512, lng: -0.8662, active: true },
  { name: "Campus Paraíso (Economía y Empresa)", university: "Universidad de Zaragoza", lat: 41.6462, lng: -0.8842, active: true },
  { name: "Campus Villanueva de Gállego", university: "Universidad San Jorge", lat: 41.7642, lng: -0.8183, active: true },
];
