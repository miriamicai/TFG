package com.icai.tfg.olivetraceabilitybackend.api.controller;

import com.icai.tfg.olivetraceabilitybackend.api.dto.*;
import com.icai.tfg.olivetraceabilitybackend.domain.model.EventoTrazabilidad;
import com.icai.tfg.olivetraceabilitybackend.domain.model.Lote;
import com.icai.tfg.olivetraceabilitybackend.domain.service.LoteService;
import com.icai.tfg.olivetraceabilitybackend.domain.service.LoteService.LoteNoEncontradoException;
import com.icai.tfg.olivetraceabilitybackend.domain.service.SensorNoDisponibleException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/lotes")
public class LoteController {

    private final LoteService loteService;

    public LoteController(LoteService loteService) {
        this.loteService = loteService;
    }

    // -----------------------------------------------------------------------
    // Fase campo / transporte
    // -----------------------------------------------------------------------

    @PostMapping
    public ResponseEntity<LoteResponse> crearLote(@RequestBody @Valid CrearLoteRequest request) {
        Lote lote = loteService.crearLote(
            request.agricultorId(), request.origen(), request.cooperativaId(),
            request.contenedorId(), request.matriculaCamion(), request.coordenadasContenedor()
        );
        return ResponseEntity.status(HttpStatus.CREATED).body(toLoteDto(lote));
    }

    @PostMapping("/{loteId}/cerrar")
    public ResponseEntity<EventoResponse> cerrarCamion(
            @PathVariable String loteId,
            @RequestBody(required = false) CerrarCamionRequest request) {
        String cooperativaId = request != null ? request.cooperativaId() : null;
        EventoTrazabilidad evento = loteService.cerrarCamion(loteId, cooperativaId);
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/apertura-compuerta")
    public ResponseEntity<EventoResponse> registrarAperturaCompuerta(
            @PathVariable String loteId,
            @RequestBody @Valid AperturaCompuertaRequest request) {
        EventoTrazabilidad evento = loteService.registrarAperturaCompuerta(
            loteId, request.esAutorizada(), request.ubicacion()
        );
        return ResponseEntity.ok(toEventoDto(evento));
    }

    // -----------------------------------------------------------------------
    // Fase almazara
    // -----------------------------------------------------------------------

    @PostMapping("/{loteId}/lavado")
    public ResponseEntity<EventoResponse> registrarLavado(
            @PathVariable String loteId,
            @RequestBody @Valid LavadoRequest request) {
        EventoTrazabilidad evento = loteService.registrarLavado(
            loteId, request.aguaApta(), request.temperaturaAgua(), request.phAgua(), request.almazaraId()
        );
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje-cinta")
    public ResponseEntity<EventoResponse> registrarPesajeCinta(
            @PathVariable String loteId,
            @RequestBody @Valid PesajeCintaRequest request) {
        EventoTrazabilidad evento = loteService.registrarPesajeCinta(loteId, request.pesoKg(), request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/molienda")
    public ResponseEntity<EventoResponse> iniciarMolienda(
            @PathVariable String loteId,
            @RequestBody @Valid MoliendaRequest request) {
        EventoTrazabilidad evento = loteService.iniciarMolienda(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/temperatura-batido")
    public ResponseEntity<EventoResponse> registrarTemperaturaBatido(
            @PathVariable String loteId,
            @RequestBody @Valid TemperaturaBatidoRequest request) {
        EventoTrazabilidad evento = loteService.registrarTemperaturaBatido(
            loteId, request.temperaturaC(), request.almazaraId()
        );
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/decanter")
    public ResponseEntity<EventoResponse> registrarDecanter(
            @PathVariable String loteId,
            @RequestBody @Valid DecanterRequest request) {
        EventoTrazabilidad evento = loteService.registrarDecanter(
            loteId, request.litrosAceite(), request.kgAlpeorujo(), request.almazaraId()
        );
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/extraccion-finalizada")
    public ResponseEntity<EventoResponse> finalizarExtraccion(
            @PathVariable String loteId,
            @RequestBody @Valid ExtraccionFinalizadaRequest request) {
        EventoTrazabilidad evento = loteService.finalizarExtraccion(
            loteId, request.litrosAceiteTotal(), request.rendimientoPorcentaje(), request.almazaraId()
        );
        return ResponseEntity.ok(toEventoDto(evento));
    }

    // -----------------------------------------------------------------------
    // Fase almazara — solicitudes IoT (MQTT)
    // -----------------------------------------------------------------------

    @PostMapping("/{loteId}/lavado/solicitar")
    public ResponseEntity<EventoResponse> solicitarLavado(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.solicitarLavado(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje-cinta/solicitar")
    public ResponseEntity<EventoResponse> solicitarPesajeCinta(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.solicitarPesajeCinta(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/temperatura-batido/solicitar")
    public ResponseEntity<EventoResponse> solicitarTemperaturaBatido(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.solicitarTemperaturaBatido(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/decanter/solicitar")
    public ResponseEntity<EventoResponse> solicitarDecanter(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.solicitarDecanter(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/extraccion-finalizada/solicitar")
    public ResponseEntity<EventoResponse> solicitarExtraccion(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.solicitarExtraccion(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    // -----------------------------------------------------------------------
    // Fase almazara — nuevos endpoints (pesaje camión + volcado + centrifugadora)
    // -----------------------------------------------------------------------

    @PostMapping("/{loteId}/pesaje-camion-lleno/solicitar")
    public ResponseEntity<EventoResponse> solicitarPesajeCamionLleno(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.registrarPesajeCamionLleno(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje-camion-lleno")
    public ResponseEntity<EventoResponse> registrarPesajeCamionLlenoManual(
            @PathVariable String loteId,
            @RequestBody @Valid PesajeCamionLlenoManualRequest request) {
        EventoTrazabilidad evento = loteService.persistirPesajeCamionLleno(loteId, request.pesoKg(), request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/volcado-tolva")
    public ResponseEntity<EventoResponse> registrarVolcadoTolva(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.registrarVolcadoTolva(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje-camion-vacio/solicitar")
    public ResponseEntity<EventoResponse> solicitarPesajeCamionVacio(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.registrarPesajeCamionVacio(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje-camion-vacio")
    public ResponseEntity<EventoResponse> registrarPesajeCamionVacioManual(
            @PathVariable String loteId,
            @RequestBody @Valid PesajeCamionVacioManualRequest request) {
        EventoTrazabilidad evento = loteService.persistirPesajeCamionVacio(loteId, request.pesoKg(), request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/molienda/solicitar")
    public ResponseEntity<EventoResponse> solicitarMolienda(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.solicitarMolienda(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/centrifugadora/solicitar")
    public ResponseEntity<EventoResponse> solicitarCentrifugadora(
            @PathVariable String loteId,
            @RequestBody @Valid SolicitarAlmazaraRequest request) {
        EventoTrazabilidad evento = loteService.registrarCentrifugadora(loteId, request.almazaraId());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/centrifugadora")
    public ResponseEntity<EventoResponse> registrarCentrifugadoraManual(
            @PathVariable String loteId,
            @RequestBody @Valid CentrifugadoraManualRequest request) {
        EventoTrazabilidad evento = loteService.persistirCentrifugadora(
            loteId, request.revoluciones(), request.temperatura(), request.almazaraId()
        );
        return ResponseEntity.ok(toEventoDto(evento));
    }

    // -----------------------------------------------------------------------
    // Consulta
    // -----------------------------------------------------------------------

    @GetMapping("/{loteId}/trazabilidad")
    public ResponseEntity<TrazabilidadResponse> obtenerTrazabilidad(@PathVariable String loteId) {
        List<EventoTrazabilidad> eventos = loteService.obtenerTrazabilidad(loteId);
        List<EventoResponse> eventosDto = eventos.stream().map(this::toEventoDto).toList();
        return ResponseEntity.ok(new TrazabilidadResponse(loteId, eventosDto));
    }

    // -----------------------------------------------------------------------
    // Manejadores de errores
    // -----------------------------------------------------------------------

    @ExceptionHandler(LoteNoEncontradoException.class)
    public ResponseEntity<String> handleNotFound(LoteNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }

    @ExceptionHandler(SensorNoDisponibleException.class)
    public ResponseEntity<String> handleSensor(SensorNoDisponibleException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(e.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, String>> handleValidation(MethodArgumentNotValidException e) {
        Map<String, String> errors = e.getBindingResult().getFieldErrors().stream()
            .collect(Collectors.toMap(
                FieldError::getField,
                fe -> fe.getDefaultMessage() != null ? fe.getDefaultMessage() : "valor inválido",
                (a, b) -> a   // en caso de múltiples errores en el mismo campo, conservar el primero
            ));
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(errors);
    }

    // -----------------------------------------------------------------------
    // Mappers
    // -----------------------------------------------------------------------

    private LoteResponse toLoteDto(Lote lote) {
        return new LoteResponse(
            lote.getId(),
            lote.getLoteId(),
            lote.getAgricultorId(),
            lote.getOrigen(),
            lote.getFechaCreacion(),
            lote.getContenedorId(),
            lote.getMatriculaCamion(),
            lote.getCoordenadasContenedor()
        );
    }

    private EventoResponse toEventoDto(EventoTrazabilidad evento) {
        return new EventoResponse(
            evento.getTipoEvento().name(),
            evento.getPesoKg(),
            evento.getTimestamp(),
            evento.getTxHash(),
            evento.getCooperativaId(),
            evento.getAlmazaraId(),
            evento.getEsAutorizada(),
            evento.getMetadatos()
        );
    }
}
