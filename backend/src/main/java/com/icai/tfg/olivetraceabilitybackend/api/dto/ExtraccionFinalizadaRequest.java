package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record ExtraccionFinalizadaRequest(
    @Positive int litrosAceiteTotal,
    @Min(0) @Max(1000) int rendimientoPorcentaje,   // x10: 0–1000 representa 0.0%–100.0%
    @NotBlank String almazaraId
) {}
