package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.NotBlank;

public record AperturaCompuertaRequest(
    boolean esAutorizada,
    @NotBlank String ubicacion
) {}
