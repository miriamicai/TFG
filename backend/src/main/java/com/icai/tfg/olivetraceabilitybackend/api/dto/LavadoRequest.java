package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record LavadoRequest(
    boolean aguaApta,
    @Positive int temperaturaAgua,
    @Min(0) @Max(140) int phAgua,   // x10: 0–140 representa pH 0.0–14.0
    @NotBlank String almazaraId
) {}
