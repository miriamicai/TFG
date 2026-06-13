package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CentrifugadoraManualRequest(
    @Min(1) int revoluciones,
    @Min(1) int temperatura,
    @NotBlank String almazaraId
) {}
