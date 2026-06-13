package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;

public record DecanterRequest(
    @Positive int litrosAceite,
    @Positive int kgAlpeorujo,
    @NotBlank String almazaraId
) {}
