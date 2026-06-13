package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record TemperaturaBatidoRequest(
    @Positive int temperaturaC,   // x10: 245 = 24.5°C
    @NotBlank String almazaraId
) {}
