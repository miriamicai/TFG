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

    private final MqttClient mqttClient;
    private final ObjectMapper objectMapper;

    @Value("${mqtt.topic.request}")
    private String topicRequest;

    @Value("${mqtt.topic.response}")
    private String topicResponse;

    @Value("${mqtt.request.timeout.seconds}")
    private int timeoutSeconds;

    private final ConcurrentHashMap<String, CompletableFuture<Integer>> pendingRequests =
            new ConcurrentHashMap<>();

    public MqttService(MqttClient mqttClient, ObjectMapper objectMapper) {
        this.mqttClient = mqttClient;
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() throws MqttException {
        mqttClient.setCallback(new MqttCallback() {
            @Override
            public void connectionLost(Throwable cause) {
                log.warn("Conexión MQTT perdida: {}", cause.getMessage());
            }

            @Override
            public void messageArrived(String topic, MqttMessage message) {
                if (!topicResponse.equals(topic)) return;
                try {
                    JsonNode node = objectMapper.readTree(message.getPayload());
                    String loteId = node.get("loteId").asText();
                    int pesoKg = node.get("pesoKg").asInt();

                    CompletableFuture<Integer> future = pendingRequests.get(loteId);
                    if (future != null) {
                        future.complete(pesoKg);
                        log.info("MQTT: peso recibido {} kg para loteId={}", pesoKg, loteId);
                    } else {
                        log.warn("MQTT: respuesta recibida para loteId desconocido={}", loteId);
                    }
                } catch (Exception e) {
                    log.error("MQTT: error al parsear mensaje de respuesta: {}", e.getMessage(), e);
                }
            }

            @Override
            public void deliveryComplete(IMqttDeliveryToken token) {}
        });

        mqttClient.subscribe(topicResponse);
        log.info("MQTT: suscrito a {}", topicResponse);
    }

    /**
     * Publica una solicitud de peso para {@code loteId} y bloquea hasta que el simulador
     * IoT responda o se agote el tiempo de espera configurado.
     *
     * @return el peso en kg reportado por el sensor
     * @throws RuntimeException si el sensor no responde dentro del timeout configurado
     */
    public int requestWeight(String loteId) {
        CompletableFuture<Integer> future = new CompletableFuture<>();
        pendingRequests.put(loteId, future);
        try {
            publish(topicRequest, "{\"loteId\":\"" + loteId + "\"}");
            log.info("MQTT: solicitud de peso enviada para loteId={}", loteId);
            return future.get(timeoutSeconds, TimeUnit.SECONDS);
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("El sensor de pesaje no respondió en " + timeoutSeconds + "s");
        } catch (Exception e) {
            future.cancel(true);
            throw new SensorNoDisponibleException("Error en comunicación MQTT: " + e.getMessage());
        } finally {
            pendingRequests.remove(loteId);
        }
    }

    private void publish(String topic, String payload) throws MqttException {
        MqttMessage msg = new MqttMessage(payload.getBytes());
        msg.setQos(1);
        mqttClient.publish(topic, msg);
    }
}
