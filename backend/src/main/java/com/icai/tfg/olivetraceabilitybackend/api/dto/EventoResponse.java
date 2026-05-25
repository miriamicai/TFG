package com.icai.tfg.olivetraceabilitybackend.api.dto;

import java.time.Instant;

public record EventoResponse(
    String tipoEvento,
    Integer pesoKg,
    Instant timestamp,
    String txHash
) {}
