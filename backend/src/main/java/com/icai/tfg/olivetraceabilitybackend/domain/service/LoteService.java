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
import org.springframework.dao.DataIntegrityViolationException;
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
        this.loteRepository   = loteRepository;
        this.eventoRepository = eventoRepository;
        this.blockchain       = blockchain;
        this.mqttService      = mqttService;
    }

    // -----------------------------------------------------------------------
    // Fase campo / transporte
    // -----------------------------------------------------------------------

    public Lote crearLote(String agricultorId, String origen, String cooperativaId,
                           String contenedorId, String matriculaCamion, String coordenadasContenedor) {
        Lote lote = crearLoteConRetry(agricultorId, origen, contenedorId, matriculaCamion, coordenadasContenedor);

        String txHash = enviarABlockchain(() ->
            blockchain.get().crearLote(
                BigInteger.valueOf(lote.getId()), agricultorId, cooperativaId,
                contenedorId, matriculaCamion, coordenadasContenedor
            )
        );

        String metadatos = buildJson(
            "\"contenedorId\":\"" + escapeJson(nullToEmpty(contenedorId)) + "\"",
            "\"matriculaCamion\":\"" + escapeJson(nullToEmpty(matriculaCamion)) + "\"",
            "\"coordenadasContenedor\":\"" + escapeJson(nullToEmpty(coordenadasContenedor)) + "\""
        );

        eventoRepository.save(new EventoTrazabilidad(
            lote.getLoteId(), TipoEvento.LOTE_CREADO, null, txHash,
            cooperativaId, null, null, metadatos
        ));
        return lote;
    }

    @Transactional
    public EventoTrazabilidad cerrarCamion(String loteId, String cooperativaId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().cerrarCamion(BigInteger.valueOf(lote.getId()), cooperativaId)
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.CAMION_CERRADO, null, txHash,
            cooperativaId, null, null, null
        ));
    }

    // ── Solicitudes IoT para fase almazara ───────────────────────────────────

    public EventoTrazabilidad solicitarLavado(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /lavado con datos manuales."
            );
        }
        MqttService.LavadoData data = mqttService.get().requestLavado(loteId);
        return registrarLavado(loteId, data.aguaApta(), data.temperaturaAgua(), data.phAgua(), almazaraId);
    }

    public EventoTrazabilidad solicitarPesajeCinta(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /pesaje-cinta con peso manual."
            );
        }
        int pesoKg = mqttService.get().requestPesajeCinta(loteId);
        return registrarPesajeCinta(loteId, pesoKg, almazaraId);
    }

    public EventoTrazabilidad solicitarTemperaturaBatido(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /temperatura-batido con datos manuales."
            );
        }
        int temperaturaC = mqttService.get().requestTemperaturaBatido(loteId);
        return registrarTemperaturaBatido(loteId, temperaturaC, almazaraId);
    }

    public EventoTrazabilidad solicitarDecanter(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /decanter con datos manuales."
            );
        }
        MqttService.DecanterData data = mqttService.get().requestDecanter(loteId);
        return registrarDecanter(loteId, data.litrosAceite(), data.kgAlpeorujo(), almazaraId);
    }

    public EventoTrazabilidad solicitarExtraccion(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /extraccion-finalizada con datos manuales."
            );
        }
        MqttService.ExtraccionData data = mqttService.get().requestExtraccion(loteId);
        return finalizarExtraccion(loteId, data.litrosAceiteTotal(), data.rendimientoPorcentaje(), almazaraId);
    }

    public EventoTrazabilidad registrarPesajeCamionLleno(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /pesaje-camion-lleno con peso manual."
            );
        }
        int pesoKg = mqttService.get().requestPesajeCamionLleno(loteId);
        return persistirPesajeCamionLleno(loteId, pesoKg, almazaraId);
    }

    @Transactional
    public EventoTrazabilidad registrarVolcadoTolva(String loteId, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarVolcadoTolva(BigInteger.valueOf(lote.getId()), almazaraId)
        );

        String metadatos = buildJson("\"almazaraId\":\"" + escapeJson(almazaraId) + "\"");

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.VOLCADO_TOLVA, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    public EventoTrazabilidad registrarPesajeCamionVacio(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /pesaje-camion-vacio con peso manual."
            );
        }
        int pesoKg = mqttService.get().requestPesajeCamionVacio(loteId);
        return persistirPesajeCamionVacio(loteId, pesoKg, almazaraId);
    }

    public EventoTrazabilidad solicitarMolienda(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /molienda con datos manuales."
            );
        }
        int temperaturaC = mqttService.get().requestTemperaturaMolienda(loteId);
        return persistirMolienda(loteId, temperaturaC, almazaraId);
    }

    public EventoTrazabilidad registrarCentrifugadora(String loteId, String almazaraId) {
        if (mqttService.isEmpty()) {
            throw new SensorNoDisponibleException(
                "MQTT deshabilitado (mqtt.enabled=false). Use el endpoint /centrifugadora con datos manuales."
            );
        }
        MqttService.CentrifugadoraData data = mqttService.get().requestCentrifugadora(loteId);
        return persistirCentrifugadora(loteId, data.revoluciones(), data.temperatura(), almazaraId);
    }

    @Transactional
    public EventoTrazabilidad persistirPesajeCamionLleno(String loteId, int pesoKg, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarPesajeCamionLleno(
                BigInteger.valueOf(lote.getId()), BigInteger.valueOf(pesoKg), almazaraId
            )
        );

        String metadatos = buildJson(
            "\"pesoKg\":" + pesoKg,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.PESAJE_CAMION_LLENO, pesoKg, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad persistirPesajeCamionVacio(String loteId, int pesoKg, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarPesajeCamionVacio(
                BigInteger.valueOf(lote.getId()), BigInteger.valueOf(pesoKg), almazaraId
            )
        );

        String metadatos = buildJson(
            "\"pesoKg\":" + pesoKg,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.PESAJE_CAMION_VACIO, pesoKg, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad persistirMolienda(String loteId, int temperaturaC, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().iniciarMolienda(BigInteger.valueOf(lote.getId()), almazaraId)
        );

        String metadatos = buildJson(
            "\"temperaturaC\":" + temperaturaC,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.MOLIENDA_INICIADA, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad persistirCentrifugadora(String loteId, int revoluciones,
                                                       int temperatura, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarCentrifugadora(
                BigInteger.valueOf(lote.getId()),
                BigInteger.valueOf(revoluciones),
                BigInteger.valueOf(temperatura),
                almazaraId
            )
        );

        String metadatos = buildJson(
            "\"revoluciones\":" + revoluciones,
            "\"temperatura\":" + temperatura,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.CENTRIFUGADORA, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad registrarAperturaCompuerta(String loteId, boolean esAutorizada, String ubicacion) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarAperturaCompuerta(
                BigInteger.valueOf(lote.getId()), esAutorizada, ubicacion
            )
        );

        String metadatos = buildJson(
            "\"esAutorizada\":" + esAutorizada,
            "\"ubicacion\":\"" + escapeJson(ubicacion) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.APERTURA_COMPUERTA, null, txHash,
            null, null, esAutorizada, metadatos
        ));
    }

    // -----------------------------------------------------------------------
    // Fase almazara
    // -----------------------------------------------------------------------

    @Transactional
    public EventoTrazabilidad registrarLavado(String loteId, boolean aguaApta,
                                               int temperaturaAgua, int phAgua, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarLavado(
                BigInteger.valueOf(lote.getId()),
                aguaApta,
                BigInteger.valueOf(temperaturaAgua),
                BigInteger.valueOf(phAgua),
                almazaraId
            )
        );

        String metadatos = buildJson(
            "\"aguaApta\":" + aguaApta,
            "\"temperaturaAgua\":" + temperaturaAgua,
            "\"phAgua\":" + phAgua,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.LAVADO, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad registrarPesajeCinta(String loteId, int pesoKg, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarPesajeCinta(
                BigInteger.valueOf(lote.getId()), BigInteger.valueOf(pesoKg), almazaraId
            )
        );

        String metadatos = buildJson(
            "\"pesoKg\":" + pesoKg,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.PESAJE_CINTA, pesoKg, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad iniciarMolienda(String loteId, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().iniciarMolienda(BigInteger.valueOf(lote.getId()), almazaraId)
        );

        String metadatos = buildJson(
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.MOLIENDA_INICIADA, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad registrarTemperaturaBatido(String loteId, int temperaturaC, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarTemperaturaBatido(
                BigInteger.valueOf(lote.getId()), BigInteger.valueOf(temperaturaC), almazaraId
            )
        );

        String metadatos = buildJson(
            "\"temperaturaC\":" + temperaturaC,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.TEMPERATURA_BATIDO, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad registrarDecanter(String loteId, int litrosAceite,
                                                 int kgAlpeorujo, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().registrarDecanter(
                BigInteger.valueOf(lote.getId()),
                BigInteger.valueOf(litrosAceite),
                BigInteger.valueOf(kgAlpeorujo),
                almazaraId
            )
        );

        String metadatos = buildJson(
            "\"litrosAceite\":" + litrosAceite,
            "\"kgAlpeorujo\":" + kgAlpeorujo,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.DECANTER, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    @Transactional
    public EventoTrazabilidad finalizarExtraccion(String loteId, int litrosAceiteTotal,
                                                   int rendimientoPorcentaje, String almazaraId) {
        Lote lote = loteRepository.findByLoteId(loteId)
            .orElseThrow(() -> new LoteNoEncontradoException(loteId));

        String txHash = enviarABlockchain(() ->
            blockchain.get().finalizarExtraccion(
                BigInteger.valueOf(lote.getId()),
                BigInteger.valueOf(litrosAceiteTotal),
                BigInteger.valueOf(rendimientoPorcentaje),
                almazaraId
            )
        );

        String metadatos = buildJson(
            "\"litrosAceiteTotal\":" + litrosAceiteTotal,
            "\"rendimientoPorcentaje\":" + rendimientoPorcentaje,
            "\"almazaraId\":\"" + escapeJson(almazaraId) + "\""
        );

        return eventoRepository.save(new EventoTrazabilidad(
            loteId, TipoEvento.EXTRACCION_FINALIZADA, null, txHash,
            null, almazaraId, null, metadatos
        ));
    }

    // -----------------------------------------------------------------------
    // Consulta
    // -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<EventoTrazabilidad> obtenerTrazabilidad(String loteId) {
        if (loteRepository.findByLoteId(loteId).isEmpty()) {
            throw new LoteNoEncontradoException(loteId);
        }
        return eventoRepository.findByLoteIdOrderByTimestampAsc(loteId);
    }

    // -----------------------------------------------------------------------
    // Helpers privados
    // -----------------------------------------------------------------------

    /**
     * Crea un lote con reintento automático ante colisión de loteId.
     * Si dos peticiones concurrentes generan el mismo loteId, la segunda
     * reintenta con un contador incrementado en lugar de fallar.
     */
    private Lote crearLoteConRetry(String agricultorId, String origen,
                                    String contenedorId, String matriculaCamion, String coordenadasContenedor) {
        int intentos = 0;
        while (true) {
            String loteId = generarLoteId(intentos);
            try {
                return loteRepository.save(
                    new Lote(loteId, agricultorId, origen, contenedorId, matriculaCamion, coordenadasContenedor)
                );
            } catch (DataIntegrityViolationException e) {
                intentos++;
                if (intentos >= 5) {
                    throw e;
                }
                log.warn("Colisión de loteId '{}', reintentando (intento {}/5)...", loteId, intentos);
            }
        }
    }

    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }

    private String generarLoteId(int offset) {
        int year = LocalDate.now().getYear();
        String prefix = "LOT-" + year + "-";
        long count = loteRepository.countByLoteIdStartingWith(prefix);
        return prefix + String.format("%04d", count + 1 + offset);
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

    /** Construye un objeto JSON a partir de pares clave:valor ya serializados. */
    private static String buildJson(String... pairs) {
        return "{" + String.join(",", pairs) + "}";
    }

    /**
     * Escapa los caracteres especiales JSON en una cadena de texto.
     * Suficiente para IDs y nombres cortos; no reemplaza a una librería
     * JSON completa para datos arbitrarios.
     */
    private static String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\n", "\\n")
                    .replace("\r", "\\r")
                    .replace("\t", "\\t");
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
