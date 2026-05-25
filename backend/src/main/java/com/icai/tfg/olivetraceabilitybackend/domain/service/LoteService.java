package com.icai.tfg.olivetraceabilitybackend.domain.service;

import com.icai.tfg.olivetraceabilitybackend.domain.model.EventoTrazabilidad;
import com.icai.tfg.olivetraceabilitybackend.domain.model.Lote;
import com.icai.tfg.olivetraceabilitybackend.domain.model.TipoEvento;
import com.icai.tfg.olivetraceabilitybackend.domain.repository.EventoTrazabilidadRepository;
import com.icai.tfg.olivetraceabilitybackend.domain.repository.LoteRepository;
import com.icai.tfg.olivetraceabilitybackend.infrastructure.blockchain.CadenaAceiteWrapper;
import com.icai.tfg.olivetraceabilitybackend.infrastructure.mqtt.MqttService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigInteger;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Service
public class LoteService {

    private static final Logger log = LoggerFactory.getLogger(LoteService.class);

    private final LoteRepository loteRepository;
    private final EventoTrazabilidadRepository eventoRepository;
    private final Optional<CadenaAceiteWrapper> blockchain;
    private final Optional<MqttService> mqttService;

    public LoteService(LoteRepository loteRepository,
                       EventoTrazabilidadRepository eventoRepository,
                       Optional<CadenaAceiteWrapper> blockchain,
                       Optional<MqttService> mqttService) {
        this.loteRepository  = loteRepository;
        this.eventoRepository = eventoRepository;
        this.blockchain      = blockchain;
        this.mqttService     = mqttService;
    }

    @Transactional
    public Lote crearLote(String agricultorId, String origen) {
        String loteId = generarLoteId();
        Lote lote = loteRepository.save(new Lote(loteId, agricultorId, origen));

        String txHash = enviarABlockchain(() ->
            blockchain.get().crearLote(BigInteger.valueOf(lote.getId()), agricultorId)
        );

        eventoRepository.save(new EventoTrazabilidad(loteId, TipoEvento.LOTE_CREADO, null, txHash));
        return lote;
    }

    @Transactional
    public EventoTrazabilidad cerrarCamion(String loteId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().cerrarCamion(BigInteger.valueOf(lote.getId()))
        );

        return eventoRepository.save(
            new EventoTrazabilidad(loteId, TipoEvento.CAMION_CERRADO, null, txHash)
        );
    }

    @Transactional
    public EventoTrazabilidad registrarPesaje(String loteId, int pesoKg) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarPesaje(
                BigInteger.valueOf(lote.getId()), BigInteger.valueOf(pesoKg)
            )
        );

        return eventoRepository.save(
            new EventoTrazabilidad(loteId, TipoEvento.PESAJE_REGISTRADO, pesoKg, txHash)
        );
    }

    /**
     * Solicita una lectura de peso a la báscula IoT vía MQTT y delega en
     * {@link #registrarPesaje} para persistir el evento en blockchain + H2.
     * Lanza un error si MQTT está deshabilitado o el sensor no responde a tiempo.
     */
    public EventoTrazabilidad solicitarPesaje(String loteId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException("MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /pesaje con peso manual.");
        }
        int pesoKg = mqttService.get().requestWeight(loteId);
        return registrarPesaje(loteId, pesoKg);
    }

    @Transactional(readOnly = true)
    public List<EventoTrazabilidad> obtenerTrazabilidad(String loteId) {
        if (loteRepository.findByLoteId(loteId).isEmpty()) {
            throw new LoteNoEncontradoException(loteId);
        }
        return eventoRepository.findByLoteIdOrderByTimestampAsc(loteId);
    }

    private String generarLoteId() {
        int year = LocalDate.now().getYear();
        String prefix = "LOT-" + year + "-";
        long count = loteRepository.countByLoteIdStartingWith(prefix);
        return prefix + String.format("%04d", count + 1);
    }

    private String enviarABlockchain(BlockchainCall call) {
        if (blockchain.isEmpty()) {
            log.debug("Blockchain deshabilitada (blockchain.enabled=false). Saltando llamada.");
            return null;
        }
        try {
            return call.execute();
        } catch (Exception e) {
            log.warn("Error al llamar al contrato blockchain: {}. El evento se guarda solo en H2.", e.getMessage(), e);
            return null;
        }
    }

    @FunctionalInterface
    private interface BlockchainCall {
        String execute() throws Exception;
    }

    public static class LoteNoEncontradoException extends RuntimeException {
        public LoteNoEncontradoException(String loteId) {
            super("Lote no encontrado: " + loteId);
        }
    }
}
