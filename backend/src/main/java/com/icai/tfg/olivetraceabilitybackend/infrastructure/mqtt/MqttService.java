package com.icai.tfg.olivetraceabilitybackend.infrastructure.mqtt;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.icai.tfg.olivetraceabilitybackend.domain.service.SensorNoDisponibleException;
import org.eclipse.paho.client.mqttv3.IMqttDeliveryToken;
import org.eclipse.paho.client.mqttv3.MqttCallback;
import org.eclipse.paho.client.mqttv3.MqttClient;
import org.eclipse.paho.client.mqttv3.MqttException;
import org.eclipse.paho.client.mqttv3.MqttMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

@Service
@ConditionalOnProperty(name = "mqtt.enabled", havingValue = "true")
public class MqttService {

    private static final Logger log = LoggerFactory.getLogger(MqttService.class);

    // ── Registros de datos ───────────────────────────────────────────────────

    public record LavadoData(boolean aguaApta, int temperaturaAgua, int phAgua) {}
    public record DecanterData(int litrosAceite, int kgAlpeorujo) {}
    public record ExtraccionData(int litrosAceiteTotal, int rendimientoPorcentaje) {}
    public record CentrifugadoraData(int revoluciones, int temperatura) {}

    // ── Infraestructura ──────────────────────────────────────────────────────

    private final MqttClient   mqttClient;
    private final ObjectMapper objectMapper;

    // ── Configuración de tópicos ─────────────────────────────────────────────

    @Value("${mqtt.topic.cinta.request}")
    private String topicCintaRequest;

    @Value("${mqtt.topic.cinta.response}")
    private String topicCintaResponse;

    @Value("${mqtt.topic.lavado.request}")
    private String topicLavadoRequest;

    @Value("${mqtt.topic.lavado.response}")
    private String topicLavadoResponse;

    @Value("${mqtt.topic.batido.request}")
    private String topicBatidoRequest;

    @Value("${mqtt.topic.batido.response}")
    private String topicBatidoResponse;

    @Value("${mqtt.topic.decanter.request}")
    private String topicDecanterRequest;

    @Value("${mqtt.topic.decanter.response}")
    private String topicDecanterResponse;

    @Value("${mqtt.topic.extraccion.request}")
    private String topicExtraccionRequest;

    @Value("${mqtt.topic.extraccion.response}")
    private String topicExtraccionResponse;

    @Value("${mqtt.topic.camionlleno.request}")
    private String topicCamionLlenoRequest;

    @Value("${mqtt.topic.camionlleno.response}")
    private String topicCamionLlenoResponse;

    @Value("${mqtt.topic.camionvacio.request}")
    private String topicCamionVacioRequest;

    @Value("${mqtt.topic.camionvacio.response}")
    private String topicCamionVacioResponse;

    @Value("${mqtt.topic.molienda.request}")
    private String topicMoliendaRequest;

    @Value("${mqtt.topic.molienda.response}")
    private String topicMoliendaResponse;

    @Value("${mqtt.topic.centrifugadora.request}")
    private String topicCentrifugadoraRequest;

    @Value("${mqtt.topic.centrifugadora.response}")
    private String topicCentrifugadoraResponse;

    @Value("${mqtt.request.timeout.seconds}")
    private int timeoutSeconds;

    // ── Mapas de solicitudes pendientes (uno por tipo de dato) ───────────────

    private final ConcurrentHashMap<String, CompletableFuture<Integer>>            pendingPesajeCinta       = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<LavadoData>>         pendingLavado            = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<Integer>>            pendingTemperaturaBatido = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<DecanterData>>       pendingDecanter          = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<ExtraccionData>>     pendingExtraccion        = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<Integer>>            pendingCamionLleno       = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<Integer>>            pendingCamionVacio       = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<Integer>>            pendingMolienda          = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, CompletableFuture<CentrifugadoraData>> pendingCentrifugadora    = new ConcurrentHashMap<>();

    public MqttService(MqttClient mqttClient, ObjectMapper objectMapper) {
        this.mqttClient   = mqttClient;
        this.objectMapper = objectMapper;
    }

    // ── Ciclo de vida ─────────────────────────────────────────────────────────

    @PostConstruct
    public void init() throws MqttException {
        mqttClient.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                log.warn("Conexión MQTT perdida: {}", cause.getMessage());
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                try {
                    JsonNode node        = objectMapper.readTree(message.getPayload());
                    JsonNode loteIdNode  = node.get("loteId");
                    if (loteIdNode == null || loteIdNode.isNull()) {
                        log.warn("MQTT: mensaje en topic={} sin campo 'loteId', ignorado", topic);
                        return;
                    }
                    String loteId = loteIdNode.asText();

                    if (topicCintaResponse.equals(topic)) {
                        int peso = node.get("pesoKg").asInt();
                        CompletableFuture<Integer> f = pendingPesajeCinta.get(loteId);
                        if (f != null) {
                            f.complete(peso);
                            log.info("MQTT: [cinta] peso={} kg para loteId={}", peso, loteId);
                        } else {
                            log.warn("MQTT: [cinta] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicLavadoResponse.equals(topic)) {
                        boolean aguaApta = node.get("aguaApta").asBoolean();
                        int     temp     = node.get("temperaturaAgua").asInt();
                        int     ph       = node.get("phAgua").asInt();
                        CompletableFuture<LavadoData> f = pendingLavado.get(loteId);
                        if (f != null) {
                            f.complete(new LavadoData(aguaApta, temp, ph));
                            log.info("MQTT: [lavado] temp={} ph={} aguaApta={} para loteId={}", temp, ph, aguaApta, loteId);
                        } else {
                            log.warn("MQTT: [lavado] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicBatidoResponse.equals(topic)) {
                        int tempC = node.get("temperaturaC").asInt();
                        CompletableFuture<Integer> f = pendingTemperaturaBatido.get(loteId);
                        if (f != null) {
                            f.complete(tempC);
                            log.info("MQTT: [batido] temperaturaC={} ({}) para loteId={}", tempC, tempC / 10.0, loteId);
                        } else {
                            log.warn("MQTT: [batido] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicDecanterResponse.equals(topic)) {
                        int litros    = node.get("litrosAceite").asInt();
                        int alpeorujo = node.get("kgAlpeorujo").asInt();
                        CompletableFuture<DecanterData> f = pendingDecanter.get(loteId);
                        if (f != null) {
                            f.complete(new DecanterData(litros, alpeorujo));
                            log.info("MQTT: [decanter] litros={} alpeorujo={} para loteId={}", litros, alpeorujo, loteId);
                        } else {
                            log.warn("MQTT: [decanter] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicExtraccionResponse.equals(topic)) {
                        int litros      = node.get("litrosAceiteTotal").asInt();
                        int rendimiento = node.get("rendimientoPorcentaje").asInt();
                        CompletableFuture<ExtraccionData> f = pendingExtraccion.get(loteId);
                        if (f != null) {
                            f.complete(new ExtraccionData(litros, rendimiento));
                            log.info("MQTT: [extraccion] litros={} rendimiento={} para loteId={}", litros, rendimiento, loteId);
                        } else {
                            log.warn("MQTT: [extraccion] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicCamionLlenoResponse.equals(topic)) {
                        int peso = node.get("pesoKg").asInt();
                        CompletableFuture<Integer> f = pendingCamionLleno.get(loteId);
                        if (f != null) {
                            f.complete(peso);
                            log.info("MQTT: [camionlleno] peso={} kg para loteId={}", peso, loteId);
                        } else {
                            log.warn("MQTT: [camionlleno] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicCamionVacioResponse.equals(topic)) {
                        int peso = node.get("pesoKg").asInt();
                        CompletableFuture<Integer> f = pendingCamionVacio.get(loteId);
                        if (f != null) {
                            f.complete(peso);
                            log.info("MQTT: [camionvacio] peso={} kg para loteId={}", peso, loteId);
                        } else {
                            log.warn("MQTT: [camionvacio] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicMoliendaResponse.equals(topic)) {
                        int tempC = node.get("temperaturaC").asInt();
                        CompletableFuture<Integer> f = pendingMolienda.get(loteId);
                        if (f != null) {
                            f.complete(tempC);
                            log.info("MQTT: [molienda] temperaturaC={} ({}) para loteId={}", tempC, tempC / 10.0, loteId);
                        } else {
                            log.warn("MQTT: [molienda] respuesta para loteId desconocido={}", loteId);
                        }

                    } else if (topicCentrifugadoraResponse.equals(topic)) {
                        int revoluciones = node.get("revoluciones").asInt();
                        int temperatura  = node.get("temperatura").asInt();
                        CompletableFuture<CentrifugadoraData> f = pendingCentrifugadora.get(loteId);
                        if (f != null) {
                            f.complete(new CentrifugadoraData(revoluciones, temperatura));
                            log.info("MQTT: [centrifugadora] rpm={} temp={} para loteId={}", revoluciones, temperatura, loteId);
                        } else {
                            log.warn("MQTT: [centrifugadora] respuesta para loteId desconocido={}", loteId);
                        }
                    }

                } catch (Exception e) {
                    log.error("MQTT: error al parsear mensaje de respuesta en topic={}: {}", topic, e.getMessage(), e);
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {}
        });

        mqttClient.subscribe(topicCintaResponse);
        mqttClient.subscribe(topicLavadoResponse);
        mqttClient.subscribe(topicBatidoResponse);
        mqttClient.subscribe(topicDecanterResponse);
        mqttClient.subscribe(topicExtraccionResponse);
        mqttClient.subscribe(topicCamionLlenoResponse);
        mqttClient.subscribe(topicCamionVacioResponse);
        mqttClient.subscribe(topicMoliendaResponse);
        mqttClient.subscribe(topicCentrifugadoraResponse);

        log.info("MQTT: suscrito a {} {} {} {} {} {} {} {} {}",
            topicCintaResponse, topicLavadoResponse,
            topicBatidoResponse, topicDecanterResponse, topicExtraccionResponse,
            topicCamionLlenoResponse, topicCamionVacioResponse, topicMoliendaResponse,
            topicCentrifugadoraResponse);
    }

    // ── Request methods ───────────────────────────────────────────────────────

    /**
     * Solicita el peso en la cinta transportadora de la almazara vía MQTT.
     */
    public int requestPesajeCinta(String loteId) {
        CompletableFuture<Integer> future = new CompletableFuture<>();
        pendingPesajeCinta.put(loteId, future);
        try {
            publish(topicCintaRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud pesaje-cinta enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de pesaje-cinta no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingPesajeCinta.remove(loteId);
        }
    }

    /**
     * Solicita los parámetros de lavado (temperatura, pH, aptitud del agua) vía MQTT.
     */
    public LavadoData requestLavado(String loteId) {
        CompletableFuture<LavadoData> future = new CompletableFuture<>();
        pendingLavado.put(loteId, future);
        try {
            publish(topicLavadoRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud lavado enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de lavado no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingLavado.remove(loteId);
        }
    }

    /**
     * Solicita la temperatura de batido vía MQTT.
     * El valor devuelto es x10 (ej. 245 = 24.5°C).
     */
    public int requestTemperaturaBatido(String loteId) {
        CompletableFuture<Integer> future = new CompletableFuture<>();
        pendingTemperaturaBatido.put(loteId, future);
        try {
            publish(topicBatidoRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud temperatura-batido enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de temperatura de batido no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingTemperaturaBatido.remove(loteId);
        }
    }

    /**
     * Solicita los resultados del decanter (litros de aceite y kg de alpeorujo) vía MQTT.
     */
    public DecanterData requestDecanter(String loteId) {
        CompletableFuture<DecanterData> future = new CompletableFuture<>();
        pendingDecanter.put(loteId, future);
        try {
            publish(topicDecanterRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud decanter enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor del decanter no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingDecanter.remove(loteId);
        }
    }

    /**
     * Solicita los datos finales de extracción (litros totales y rendimiento x10) vía MQTT.
     */
    public ExtraccionData requestExtraccion(String loteId) {
        CompletableFuture<ExtraccionData> future = new CompletableFuture<>();
        pendingExtraccion.put(loteId, future);
        try {
            publish(topicExtraccionRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud extraccion-finalizada enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de extracción no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingExtraccion.remove(loteId);
        }
    }

    /**
     * Solicita el peso del camión lleno en báscula de almazara vía MQTT.
     */
    public int requestPesajeCamionLleno(String loteId) {
        CompletableFuture<Integer> future = new CompletableFuture<>();
        pendingCamionLleno.put(loteId, future);
        try {
            publish(topicCamionLlenoRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud pesaje-camion-lleno enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de pesaje camión lleno no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingCamionLleno.remove(loteId);
        }
    }

    /**
     * Solicita el peso del camión vacío en báscula de almazara vía MQTT.
     */
    public int requestPesajeCamionVacio(String loteId) {
        CompletableFuture<Integer> future = new CompletableFuture<>();
        pendingCamionVacio.put(loteId, future);
        try {
            publish(topicCamionVacioRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud pesaje-camion-vacio enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de pesaje camión vacío no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingCamionVacio.remove(loteId);
        }
    }

    /**
     * Solicita la temperatura del molino vía MQTT.
     * El valor devuelto es x10 (ej. 245 = 24.5°C).
     */
    public int requestTemperaturaMolienda(String loteId) {
        CompletableFuture<Integer> future = new CompletableFuture<>();
        pendingMolienda.put(loteId, future);
        try {
            publish(topicMoliendaRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud temperatura-molienda enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de molienda no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingMolienda.remove(loteId);
        }
    }

    /**
     * Solicita los datos de la centrifugadora (RPM y temperatura) vía MQTT.
     */
    public CentrifugadoraData requestCentrifugadora(String loteId) {
        CompletableFuture<CentrifugadoraData> future = new CompletableFuture<>();
        pendingCentrifugadora.put(loteId, future);
        try {
            publish(topicCentrifugadoraRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud centrifugadora enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de centrifugadora no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingCentrifugadora.remove(loteId);
        }
    }

    // ── Métodos auxiliares privados ───────────────────────────────────────────

    private void publish(String topic, String payload) throws MqttException {
        MqttMessage msg = new MqttMessage(payload.getBytes());
        msg.setQos(1);
        mqttClient.publish(topic, msg);
    }
}
