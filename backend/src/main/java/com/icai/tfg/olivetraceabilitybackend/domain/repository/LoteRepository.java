package com.icai.tfg.olivetraceabilitybackend.domain.repository;

import com.icai.tfg.olivetraceabilitybackend.domain.model.Lote;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface LoteRepository extends JpaRepository<Lote, Long> {

    Optional<Lote> findByLoteId(String loteId);

    long countByLoteIdStartingWith(String prefix);
}
