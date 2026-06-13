package com.icai.tfg.olivetraceabilitybackend.domain.model;

public enum TipoEvento {
    // Fase campo / transporte
    LOTE_CREADO,
    CAMION_CERRADO,
    APERTURA_COMPUERTA,

    // Fase almazara — recepción en báscula
    PESAJE_CAMION_LLENO,
    VOLCADO_TOLVA,
    PESAJE_CAMION_VACIO,

    // Fase almazara — procesado
    LAVADO,
    PESAJE_CINTA,
    MOLIENDA_INICIADA,
    TEMPERATURA_BATIDO,
    DECANTER,
    CENTRIFUGADORA,
    EXTRACCION_FINALIZADA
}
