package com.icai.tfg.olivetraceabilitybackend.api.dto;

import java.util.List;

public record TrazabilidadResponse(
    String loteId,
    List<EventoResponse> eventos
) {}
