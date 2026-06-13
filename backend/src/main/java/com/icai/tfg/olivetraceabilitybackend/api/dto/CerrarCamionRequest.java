package com.icai.tfg.olivetraceabilitybackend.api.dto;

public record CerrarCamionRequest(
    String cooperativaId   // opcional: el frontend actual llama sin body
) {}
