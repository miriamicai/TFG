package com.icai.tfg.olivetraceabilitybackend.domain.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "eventos_trazabilidad")
public class EventoTrazabilidad {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String loteId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TipoEvento tipoEvento;

    private Integer pesoKg;

    @Column(nullable = false)
    private Instant timestamp;

    @Column(length = 66)
    private String txHash;

    /** Campo/transporte: cooperativa que gestiona el lote. Null para eventos de almazara. */
    private String cooperativaId;

    /** Almazara: instalación donde se procesa el lote. Null para eventos de campo. */
    private String almazaraId;

    /** Solo para APERTURA_COMPUERTA: indica si la apertura fue autorizada. */
    private Boolean esAutorizada;

    /**
     * JSON con datos adicionales específicos del tipo de evento.
     * Ejemplos:
     *   LAVADO: {"aguaApta":true,"temperaturaAgua":18,"phAgua":68,"almazaraId":"ALM-001"}
     *   TEMPERATURA_BATIDO: {"temperaturaC":245,"almazaraId":"ALM-001"}
     *   DECANTER: {"litrosAceite":1200,"kgAlpeorujo":3500,"almazaraId":"ALM-001"}
     */
    @Column(columnDefinition = "TEXT")
    private String metadatos;

    protected EventoTrazabilidad() {}

    /** Constructor completo usado por los nuevos métodos del servicio. */
    public EventoTrazabilidad(String loteId, TipoEvento tipoEvento, Integer pesoKg, String txHash,
                               String cooperativaId, String almazaraId, Boolean esAutorizada, String metadatos) {
        this.loteId        = loteId;
        this.tipoEvento    = tipoEvento;
        this.pesoKg        = pesoKg;
        this.timestamp     = Instant.now();
        this.txHash        = txHash;
        this.cooperativaId = cooperativaId;
        this.almazaraId    = almazaraId;
        this.esAutorizada  = esAutorizada;
        this.metadatos     = metadatos;
    }

    /** Constructor de compatibilidad para los eventos existentes sin campos nuevos. */
    public EventoTrazabilidad(String loteId, TipoEvento tipoEvento, Integer pesoKg, String txHash) {
        this(loteId, tipoEvento, pesoKg, txHash, null, null, null, null);
    }

    public Long getId()               { return id; }
    public String getLoteId()         { return loteId; }
    public TipoEvento getTipoEvento() { return tipoEvento; }
    public Integer getPesoKg()        { return pesoKg; }
    public Instant getTimestamp()     { return timestamp; }
    public String getTxHash()         { return txHash; }
    public String getCooperativaId()  { return cooperativaId; }
    public String getAlmazaraId()     { return almazaraId; }
    public Boolean getEsAutorizada()  { return esAutorizada; }
    public String getMetadatos()      { return metadatos; }
}
