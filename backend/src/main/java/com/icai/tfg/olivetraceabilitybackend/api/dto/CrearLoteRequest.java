package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CrearLoteRequest(
    @NotBlank String agricultorId,
    @NotBlank String origen
) {}
