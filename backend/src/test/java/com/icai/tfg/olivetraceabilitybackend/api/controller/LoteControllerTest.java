package com.icai.tfg.olivetraceabilitybackend.api.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.icai.tfg.olivetraceabilitybackend.api.dto.AperturaCompuertaRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.CentrifugadoraManualRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.CrearLoteRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.DecanterRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.ExtraccionFinalizadaRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.PesajeCamionLlenoManualRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.PesajeCamionVacioManualRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.SolicitarAlmazaraRequest;
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
        when(loteService.crearLote("AGR-001", "Finca Las Olivas", null, null, null, null))
                .thenReturn(lote);

        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CrearLoteRequest("AGR-001", "Finca Las Olivas", null, null, null, null))))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.loteId").value("LOT-2026-0001"))
                .andExpect(jsonPath("$.agricultorId").value("AGR-001"));
    }

    @Test
    void crearLote_camposEnBlanco_retorna400() throws Exception {
        mockMvc.perform(post(BASE)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CrearLoteRequest("", "Finca", null, null, null, null))))
                .andExpect(status().isBadRequest());

        verify(loteService, never()).crearLote(any(), any(), any(), any(), any(), any());
    }

    // ── POST /api/lotes/{id}/cerrar ──────────────────────────────────────────

    @Test
    void cerrarCamion_loteExiste_retorna200ConEvento() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.CAMION_CERRADO, null, "0xaaa");
        when(loteService.cerrarCamion("LOT-2026-0001", null)).thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/cerrar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("CAMION_CERRADO"))
                .andExpect(jsonPath("$.txHash").value("0xaaa"));
    }

    @Test
    void cerrarCamion_loteNoExiste_retorna404() throws Exception {
        when(loteService.cerrarCamion("LOT-2026-9999", null))
                .thenThrow(new LoteService.LoteNoEncontradoException("LOT-2026-9999"));

        mockMvc.perform(post(BASE + "/LOT-2026-9999/cerrar"))
                .andExpect(status().isNotFound());
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

    // ── POST /api/lotes/{id}/apertura-compuerta ──────────────────────────────

    @Test
    void registrarAperturaCompuerta_requestValido_retorna200ConEvento() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.APERTURA_COMPUERTA, null, "0xddd");
        when(loteService.registrarAperturaCompuerta("LOT-2026-0001", false, "Autovía A4"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/apertura-compuerta")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new AperturaCompuertaRequest(false, "Autovía A4"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("APERTURA_COMPUERTA"));
    }

    // ── POST /api/lotes/{id}/pesaje-camion-lleno/solicitar ───────────────────

    @Test
    void solicitarPesajeCamionLleno_sensorDisponible_retorna200ConPeso() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_CAMION_LLENO, 7500, "0xeee");
        when(loteService.registrarPesajeCamionLleno("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-camion-lleno/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("PESAJE_CAMION_LLENO"))
                .andExpect(jsonPath("$.pesoKg").value(7500));
    }

    @Test
    void solicitarPesajeCamionLleno_sensorNoDisponible_retorna503() throws Exception {
        when(loteService.registrarPesajeCamionLleno(any(), any()))
                .thenThrow(new SensorNoDisponibleException("MQTT timeout"));

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-camion-lleno/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isServiceUnavailable());
    }

    // ── POST /api/lotes/{id}/pesaje-camion-lleno (manual) ────────────────────

    @Test
    void registrarPesajeCamionLlenoManual_pesoValido_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_CAMION_LLENO, 7800, "0xfff");
        when(loteService.persistirPesajeCamionLleno("LOT-2026-0001", 7800, "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-camion-lleno")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PesajeCamionLlenoManualRequest(7800, "ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pesoKg").value(7800));
    }

    // ── POST /api/lotes/{id}/volcado-tolva ───────────────────────────────────

    @Test
    void registrarVolcadoTolva_loteExiste_retorna200ConEvento() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.VOLCADO_TOLVA, null, "0x111");
        when(loteService.registrarVolcadoTolva("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/volcado-tolva")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("VOLCADO_TOLVA"));
    }

    @Test
    void registrarVolcadoTolva_loteNoExiste_retorna404() throws Exception {
        when(loteService.registrarVolcadoTolva("LOT-2026-9999", "ALM-001"))
                .thenThrow(new LoteService.LoteNoEncontradoException("LOT-2026-9999"));

        mockMvc.perform(post(BASE + "/LOT-2026-9999/volcado-tolva")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isNotFound());
    }

    // ── POST /api/lotes/{id}/pesaje-camion-vacio/solicitar ───────────────────

    @Test
    void solicitarPesajeCamionVacio_sensorDisponible_retorna200ConPeso() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_CAMION_VACIO, 1500, "0x222");
        when(loteService.registrarPesajeCamionVacio("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-camion-vacio/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("PESAJE_CAMION_VACIO"))
                .andExpect(jsonPath("$.pesoKg").value(1500));
    }

    // ── POST /api/lotes/{id}/pesaje-camion-vacio (manual) ────────────────────

    @Test
    void registrarPesajeCamionVacioManual_pesoValido_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_CAMION_VACIO, 1600, "0x333");
        when(loteService.persistirPesajeCamionVacio("LOT-2026-0001", 1600, "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-camion-vacio")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new PesajeCamionVacioManualRequest(1600, "ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pesoKg").value(1600));
    }

    // ── POST /api/lotes/{id}/pesaje-cinta/solicitar ──────────────────────────

    @Test
    void solicitarPesajeCinta_sensorDisponible_retorna200ConPeso() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.PESAJE_CINTA, 4200, "0x444");
        when(loteService.solicitarPesajeCinta("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-cinta/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("PESAJE_CINTA"))
                .andExpect(jsonPath("$.pesoKg").value(4200));
    }

    @Test
    void solicitarPesajeCinta_sensorNoDisponible_retorna503() throws Exception {
        when(loteService.solicitarPesajeCinta(any(), any()))
                .thenThrow(new SensorNoDisponibleException("MQTT timeout"));

        mockMvc.perform(post(BASE + "/LOT-2026-0001/pesaje-cinta/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isServiceUnavailable());
    }

    // ── POST /api/lotes/{id}/lavado/solicitar ────────────────────────────────

    @Test
    void solicitarLavado_sensorDisponible_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.LAVADO, null, "0x555");
        when(loteService.solicitarLavado("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/lavado/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("LAVADO"));
    }

    // ── POST /api/lotes/{id}/molienda/solicitar ──────────────────────────────

    @Test
    void solicitarMolienda_sensorDisponible_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.MOLIENDA_INICIADA, null, "0x666");
        when(loteService.solicitarMolienda("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/molienda/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("MOLIENDA_INICIADA"));
    }

    // ── POST /api/lotes/{id}/temperatura-batido/solicitar ────────────────────

    @Test
    void solicitarTemperaturaBatido_sensorDisponible_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.TEMPERATURA_BATIDO, null, "0x777");
        when(loteService.solicitarTemperaturaBatido("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/temperatura-batido/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("TEMPERATURA_BATIDO"));
    }

    // ── POST /api/lotes/{id}/decanter/solicitar ──────────────────────────────

    @Test
    void solicitarDecanter_sensorDisponible_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.DECANTER, null, "0x888");
        when(loteService.solicitarDecanter("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/decanter/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("DECANTER"));
    }

    // ── POST /api/lotes/{id}/centrifugadora/solicitar ────────────────────────

    @Test
    void solicitarCentrifugadora_sensorDisponible_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.CENTRIFUGADORA, null, "0x999");
        when(loteService.registrarCentrifugadora("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/centrifugadora/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("CENTRIFUGADORA"));
    }

    // ── POST /api/lotes/{id}/extraccion-finalizada/solicitar ─────────────────

    @Test
    void solicitarExtraccion_sensorDisponible_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.EXTRACCION_FINALIZADA, null, "0xaaa");
        when(loteService.solicitarExtraccion("LOT-2026-0001", "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/extraccion-finalizada/solicitar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new SolicitarAlmazaraRequest("ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("EXTRACCION_FINALIZADA"));
    }

    // ── POST /api/lotes/{id}/decanter (manual) ───────────────────────────────

    @Test
    void registrarDecanter_requestValido_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.DECANTER, null, "0xbbb");
        when(loteService.registrarDecanter("LOT-2026-0001", 1200, 3200, "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/decanter")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new DecanterRequest(1200, 3200, "ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("DECANTER"));
    }

    // ── POST /api/lotes/{id}/centrifugadora (manual) ─────────────────────────

    @Test
    void registrarCentrifugadoraManual_requestValido_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.CENTRIFUGADORA, null, "0xccc");
        when(loteService.persistirCentrifugadora("LOT-2026-0001", 3500, 210, "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/centrifugadora")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new CentrifugadoraManualRequest(3500, 210, "ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("CENTRIFUGADORA"));
    }

    // ── POST /api/lotes/{id}/extraccion-finalizada (manual) ──────────────────

    @Test
    void finalizarExtraccion_requestValido_retorna200() throws Exception {
        EventoTrazabilidad evento = new EventoTrazabilidad(
                "LOT-2026-0001", TipoEvento.EXTRACCION_FINALIZADA, null, "0xddd");
        when(loteService.finalizarExtraccion("LOT-2026-0001", 1150, 175, "ALM-001"))
                .thenReturn(evento);

        mockMvc.perform(post(BASE + "/LOT-2026-0001/extraccion-finalizada")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(
                                new ExtraccionFinalizadaRequest(1150, 175, "ALM-001"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tipoEvento").value("EXTRACCION_FINALIZADA"));
    }

    // ── utilidades de test ───────────────────────────────────────────────────

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
