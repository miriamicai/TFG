package com.icai.tfg.olivetraceabilitybackend.api.dto;

import jakarta.validation.constraints.Positive;

public record RegistrarPesajeRequest(
    @Positive int pesoKg
) {}
