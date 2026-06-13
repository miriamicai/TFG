package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record PesajeCamionVacioManualRequest(
    @Min(1) int pesoKg,
    @NotBlank String almazaraId
) {}
