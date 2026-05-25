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

    protected EventoTrazabilidad() {}

    public EventoTrazabilidad(String loteId, TipoEvento tipoEvento, Integer pesoKg, String txHash) {
        this.loteId     = loteId;
        this.tipoEvento = tipoEvento;
        this.pesoKg     = pesoKg;
        this.timestamp  = Instant.now();
        this.txHash     = txHash;
    }

    public Long getId()            { return id; }
    public String getLoteId()      { return loteId; }
    public TipoEvento getTipoEvento(){ return tipoEvento; }
    public Integer getPesoKg()     { return pesoKg; }
    public Instant getTimestamp()  { return timestamp; }
    public String getTxHash()      { return txHash; }
}
