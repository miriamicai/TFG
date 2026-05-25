package com.icai.tfg.olivetraceabilitybackend.domain.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "lotes")
public class Lote {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String loteId;

    @Column(nullable = false)
    private String agricultorId;

    @Column(nullable = false)
    private String origen;

    @Column(nullable = false)
    private Instant fechaCreacion;

    protected Lote() {}

    public Lote(String loteId, String agricultorId, String origen) {
        this.loteId = loteId;
        this.agricultorId = agricultorId;
        this.origen = origen;
        this.fechaCreacion = Instant.now();
    }

    public Long getId() { return id; }
    public String getLoteId() { return loteId; }
    public String getAgricultorId() { return agricultorId; }
    public String getOrigen() { return origen; }
    public Instant getFechaCreacion() { return fechaCreacion; }
}
