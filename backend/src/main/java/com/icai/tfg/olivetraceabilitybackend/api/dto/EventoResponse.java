package com.icai.tfg.olivetraceabilitybackend.api.dto;

import java.time.Instant;

public record EventoResponse(
    String  tipoEvento,
    Integer pesoKg,
    Instant timestamp,
    String  txHash,
    String  cooperativaId,   // null para eventos de almazara
    String  almazaraId,      // null para eventos de campo/transporte
    Boolean esAutorizada,    // solo para APERTURA_COMPUERTA
    String  metadatos        // JSON con datos adicionales específicos del evento
) {}
