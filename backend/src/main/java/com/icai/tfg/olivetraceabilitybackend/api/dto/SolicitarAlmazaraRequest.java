package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.NotBlank;

public record SolicitarAlmazaraRequest(
    @NotBlank String almazaraId
) {}
