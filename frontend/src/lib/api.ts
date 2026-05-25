const BASE_URL = 'http://localhost:8080/api';

export interface EventoResponse {
  tipoEvento: 'LOTE_CREADO' | 'CAMION_CERRADO' | 'PESAJE_REGISTRADO';
  pesoKg: number | null;
  timestamp: string;
  txHash: string | null;
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

export async function crearLote(agricultorId: string, origen: string): Promise<Lote> {
  const res = await fetch(`${BASE_URL}/lotes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ agricultorId, origen }),
  });
  return handleResponse(res);
}

export async function cerrarCamion(loteId: string): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/cerrar`, {
    method: 'POST',
  });
  return handleResponse(res);
}

export async function registrarPesaje(loteId: string, pesoKg: number): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/pesaje`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pesoKg }),
  });
  return handleResponse(res);
}

export async function solicitarPesaje(loteId: string): Promise<EventoResponse> {
  const res = await fetch(`${BASE_URL}/lotes/${loteId}/pesaje/solicitar`, {
    method: 'POST',
  });
  return handleResponse(res);
}
