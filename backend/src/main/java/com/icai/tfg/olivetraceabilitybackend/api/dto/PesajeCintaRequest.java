package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record PesajeCintaRequest(
    @Positive int pesoKg,
    @NotBlank String almazaraId
) {}
