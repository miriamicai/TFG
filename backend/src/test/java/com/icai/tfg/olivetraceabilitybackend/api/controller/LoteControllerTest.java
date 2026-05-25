package com.icai.tfg.olivetraceabilitybackend.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.icai.tfg.olivetraceabilitybackend.api.dto.CrearLoteRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.RegistrarPesajeRequest;
import com.icai.tfg.olivetraceabilitybackend.domain.model.EventoTrazabilidad;
import com.icai.tfg.olivetraceabilitybackend.domain.model.Lote;
import com.icai.tfg.olivetraceabilitybackend.domain.model.TipoEvento;
import com.icai.tfg.olivetraceabilitybackend.domain.service.LoteService;
import com.icai.tfg.olivetraceabilitybackend.domain.service.SensorNoDisponibleException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LoteController.class)
class LoteControllerTest {

    @Autowired MockMvc mockMvc;
    @Autowired ObjectMapper objectMapper;
    @MockBean  LoteService loteService;

    private static final String BASE = "/api/lotes";

    // ── POST /api/lotes ──────────────────────────────────────────────────────

    @Test
    void crearLote_requestValido_retorna201ConLoteResponse() throws Exception {
        Lote lote = loteConId("LOT-2026-0001", "AGR-001", "Finca Las Olivas", 1L);
        when(loteService.crearLote("AGR-001", "Finca Las Olivas")).thenReturn(lote);

        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CrearLoteRequest("AGR-001", "Finca Las Olivas"))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loteId").value("LOT-2026-0001"))
                .andExpect(jsonPath("$.agricultorId").value("AGR-001"));
    }

    @Test
    void crearLote_camposEnBlanco_retorna400() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CrearLoteRequest("", "Finca"))))
                .andExpect(status().isBadRequest());

        verify(loteService, never()).crearLote(any(), any());
    }

    // ── POST /api/lotes/{id}/cerrar ──────────────────────────────────────────

    @Test
    void cerrarCamion_loteExiste_retorna200ConEvento() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.CAMION_CERRADO, null, "0xaaa");
        when(loteService.cerrarCamion("LOT-2026-0001")).thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/cerrar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("CAMION_CERRADO"))
                .andExpect(jsonPath("$.txHash").value("0xaaa"));
    }

    @Test
    void cerrarCamion_loteNoExiste_retorna404() throws Exception {
        when(loteService.cerrarCamion("LOT-2026-9999"))
                .thenThrow(new LoteService.LoteNoEncontradoException("LOT-2026-9999"));

        mockMvc.perform(post(BASE + "/LOT-2026-9999/cerrar"))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/lotes/{id}/pesaje ──────────────────────────────────────────

    @Test
    void registrarPesaje_pesoValido_retorna200ConEvento() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_REGISTRADO, 5200, "0xbbb");
        when(loteService.registrarPesaje("LOT-2026-0001", 5200)).thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegistrarPesajeRequest(5200))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("PESAJE_REGISTRADO"))
                .andExpect(jsonPath("$.pesoKg").value(5200));
    }

    @Test
    void registrarPesaje_pesoNegativo_retorna400() throws Exception {
        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new RegistrarPesajeRequest(-1))))
                .andExpect(status().isBadRequest());

        verify(loteService, never()).registrarPesaje(any(), anyInt());
    }

    // ── POST /api/lotes/{id}/pesaje/solicitar ────────────────────────────────

    @Test
    void solicitarPesaje_sensorDisponible_retorna200ConPeso() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_REGISTRADO, 4750, "0xccc");
        when(loteService.solicitarPesaje("LOT-2026-0001")).thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje/solicitar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pesoKg").value(4750));
    }

    @Test
    void solicitarPesaje_sensorNoDisponible_retorna503() throws Exception {
        when(loteService.solicitarPesaje("LOT-2026-0001"))
                .thenThrow(new SensorNoDisponibleException("Sensor timeout"));

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje/solicitar"))
                .andExpect(status().isServiceUnavailable());
    }

    // ── GET /api/lotes/{id}/trazabilidad ─────────────────────────────────────

    @Test
    void obtenerTrazabilidad_loteExiste_retorna200ConEventos() throws Exception {
        EventoTrazabilidad e1 = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.LOTE_CREADO, null, "0xaaa");
        EventoTrazabilidad e2 = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.CAMION_CERRADO, null, "0xbbb");
        when(loteService.obtenerTrazabilidad("LOT-2026-0001")).thenReturn(List.of(e1, e2));

        mockMvc.perform(get(BASE + "/LOT-2026-0001/trazabilidad"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.loteId").value("LOT-2026-0001"))
                .andExpect(jsonPath("$.eventos.length()").value(2))
                .andExpect(jsonPath("$.eventos[0].tipoEvento").value("LOTE_CREADO"))
                .andExpect(jsonPath("$.eventos[1].tipoEvento").value("CAMION_CERRADO"));
    }

    @Test
    void obtenerTrazabilidad_loteNoExiste_retorna404() throws Exception {
        when(loteService.obtenerTrazabilidad("LOT-2026-9999"))
                .thenThrow(new LoteService.LoteNoEncontradoException("LOT-2026-9999"));

        mockMvc.perform(get(BASE + "/LOT-2026-9999/trazabilidad"))
                .andExpect(status().isNotFound());
    }

    // ── helper ───────────────────────────────────────────────────────────────

    private static Lote loteConId(String loteId, String agricultorId, String origen, Long id) {
        Lote lote = new Lote(loteId, agricultorId, origen);
        try {
            var field = Lote.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(lote, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return lote;
    }
}
