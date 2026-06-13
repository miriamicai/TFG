package com.icai.tfg.olivetraceabilitybackend.api.dto;

import java.time.Instant;

public record LoteResponse(
    Long id,
    String loteId,
    String agricultorId,
    String origen,
    Instant fechaCreacion,
    String contenedorId,
    String matriculaCamion,
    String coordenadasContenedor
) {}
