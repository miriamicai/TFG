package com.icai.tfg.olivetraceabilitybackend.api.controller;

import com.icai.tfg.olivetraceabilitybackend.api.dto.CrearLoteRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.EventoResponse;
import com.icai.tfg.olivetraceabilitybackend.api.dto.LoteResponse;
import com.icai.tfg.olivetraceabilitybackend.api.dto.RegistrarPesajeRequest;
import com.icai.tfg.olivetraceabilitybackend.api.dto.TrazabilidadResponse;
import com.icai.tfg.olivetraceabilitybackend.domain.model.EventoTrazabilidad;
import com.icai.tfg.olivetraceabilitybackend.domain.model.Lote;
import com.icai.tfg.olivetraceabilitybackend.domain.service.LoteService;
import com.icai.tfg.olivetraceabilitybackend.domain.service.LoteService.LoteNoEncontradoException;
import com.icai.tfg.olivetraceabilitybackend.domain.service.SensorNoDisponibleException;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/lotes")
public class LoteController {

    private final LoteService loteService;

    public LoteController(LoteService loteService) {
        this.loteService = loteService;
    }

    @PostMapping
    public ResponseEntity<LoteResponse> crearLote(@RequestBody @Valid CrearLoteRequest request) {
        Lote lote = loteService.crearLote(request.agricultorId(), request.origen());
        return ResponseEntity.status(HttpStatus.CREATED).body(toLoteDto(lote));
    }

    @PostMapping("/{loteId}/cerrar")
    public ResponseEntity<EventoResponse> cerrarCamion(@PathVariable String loteId) {
        EventoTrazabilidad evento = loteService.cerrarCamion(loteId);
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje")
    public ResponseEntity<EventoResponse> registrarPesaje(
            @PathVariable String loteId,
            @RequestBody @Valid RegistrarPesajeRequest request) {
        EventoTrazabilidad evento = loteService.registrarPesaje(loteId, request.pesoKg());
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @PostMapping("/{loteId}/pesaje/solicitar")
    public ResponseEntity<EventoResponse> solicitarPesaje(@PathVariable String loteId) {
        EventoTrazabilidad evento = loteService.solicitarPesaje(loteId);
        return ResponseEntity.ok(toEventoDto(evento));
    }

    @GetMapping("/{loteId}/trazabilidad")
    public ResponseEntity<TrazabilidadResponse> obtenerTrazabilidad(@PathVariable String loteId) {
        List<EventoTrazabilidad> eventos = loteService.obtenerTrazabilidad(loteId);
        List<EventoResponse> eventosDto = eventos.stream().map(this::toEventoDto).toList();
        return ResponseEntity.ok(new TrazabilidadResponse(loteId, eventosDto));
    }

    @ExceptionHandler(LoteNoEncontradoException.class)
    public ResponseEntity<String> handleNotFound(LoteNoEncontradoException e) {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(e.getMessage());
    }

    @ExceptionHandler(SensorNoDisponibleException.class)
    public ResponseEntity<String> handleSensor(SensorNoDisponibleException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).body(e.getMessage());
    }

    private LoteResponse toLoteDto(Lote lote) {
        return new LoteResponse(
            lote.getId(),
            lote.getLoteId(),
            lote.getAgricultorId(),
            lote.getOrigen(),
            lote.getFechaCreacion()
        );
    }

    private EventoResponse toEventoDto(EventoTrazabilidad evento) {
        return new EventoResponse(
            evento.getTipoEvento().name(),
            evento.getPesoKg(),
            evento.getTimestamp(),
            evento.getTxHash()
        );
    }
}
