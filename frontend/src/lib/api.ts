const BASE_URL = 'http://localhost:8080/api';

export interface EventoResponse {
  tipoEvento: string;
  pesoKg: number | null;
  timestamp: string;
  txHash: string | null;
  cooperativaId?: string | null;
  almazaraId?: string | null;
  esAutorizada?: boolean | null;
  metadatos?: string | null;
}

export interface TrazabilidadResponse {
  loteId: string;
  eventos: EventoResponse[];
}

export interface Lote {
  id: number;
  loteId: string;
  agricultorId: string;
  origen: string;
  fechaCreacion: string;
  contenedorId?: string | null;
  matriculaCamion?: string | null;
  coordenadasContenedor?: string | null;
}

export interface AperturaCompuertaRequest {
  esAutorizada: boolean;
  ubicacion: string;
}

export interface PesajeCintaRequest {
  pesoKg: number;
  almazaraId: string;
}

export interface LavadoRequest {
  aguaApta: boolean;
  temperaturaAgua: number;
  phAgua: number;
  almazaraId: string;
}

export interface MoliendaRequest {
  almazaraId: string;
}

export interface TemperaturaBatidoRequest {
  temperaturaC: number;
  almazaraId: string;
}

export interface DecanterRequest {
  litrosAceite: number;
  kgAlpeorujo: number;
  almazaraId: string;
}

export interface ExtraccionFinalizadaRequest {
  litrosAceiteTotal: number;
  rendimientoPorcentaje: number;
  almazaraId: string;
}

export interface PesajeCamionLlenoManualRequest {
  pesoKg: number;
  almazaraId: string;
}

export interface PesajeCamionVacioManualRequest {
  pesoKg: number;
  almazaraId: string;
}

export interface CentrifugadoraManualRequest {
  revoluciones: number;
  temperatura: number;
  almazaraId: string;
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text().catch(() => `Error ${res.status}`);
    throw new Error(text || `Error ${res.status}`);
  }
  return res.json();
}

export async function getTrazabilidad(loteId: string): Promise<TrazabilidadResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/trazabilidad`);
  return handleResponse(res);
}

export async function crearLote(
  agricultorId: string,
  origen: string,
  contenedorId?: string,
  matriculaCamion?: string,
  coordenadasContenedor?: string,
): Promise<Lote> {
  const res = await fetch(`${BASE_URL}/lotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agricultorId, origen, contenedorId, matriculaCamion, coordenadasContenedor }),
  });
  return handleResponse(res);
}

export async function cerrarCamion(loteId: string): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/cerrar`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function registrarAperturaCompuerta(
  loteId: string,
  data: AperturaCompuertaRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/apertura-compuerta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function registrarPesajeCinta(
  loteId: string,
  data: PesajeCintaRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/pesaje-cinta`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function registrarLavado(
  loteId: string,
  data: LavadoRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/lavado`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function iniciarMolienda(
  loteId: string,
  data: MoliendaRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/molienda`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function registrarTemperaturaBatido(
  loteId: string,
  data: TemperaturaBatidoRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/temperatura-batido`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function registrarDecanter(
  loteId: string,
  data: DecanterRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/decanter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function finalizarExtraccion(
  loteId: string,
  data: ExtraccionFinalizadaRequest,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/extraccion-finalizada`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return handleResponse(res);
}

export async function solicitarPesajeCinta(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/pesaje-cinta/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarLavado(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/lavado/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarTemperaturaBatido(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/temperatura-batido/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarDecanter(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/decanter/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarExtraccion(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/extraccion-finalizada/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarPesajeCamionLleno(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/pesaje-camion-lleno/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarPesajeCamionVacio(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/pesaje-camion-vacio/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function registrarVolcadoTolva(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/volcado-tolva`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarMolienda(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/molienda/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}

export async function solicitarCentrifugadora(
  loteId: string,
  almazaraId: string,
): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/centrifugadora/solicitar`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ almazaraId }),
  });
  return handleResponse(res);
}
