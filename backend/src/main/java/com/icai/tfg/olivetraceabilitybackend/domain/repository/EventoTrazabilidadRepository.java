package com.icai.tfg.olivetraceabilitybackend.domain.repository;

import com.icai.tfg.olivetraceabilitybackend.domain.model.EventoTrazabilidad;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface EventoTrazabilidadRepository extends JpaRepository<EventoTrazabilidad, Long> {

    List<EventoTrazabilidad> findByLoteIdOrderByTimestampAsc(String loteId);
}
