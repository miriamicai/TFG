package com.icai.tfg.olivetraceabilitybackend.domain.service;

import com.icai.tfg.olivetraceabilitybackend.domain.model.EventoTrazabilidad;
import com.icai.tfg.olivetraceabilitybackend.domain.model.Lote;
import com.icai.tfg.olivetraceabilitybackend.domain.model.TipoEvento;
import com.icai.tfg.olivetraceabilitybackend.domain.repository.EventoTrazabilidadRepository;
import com.icai.tfg.olivetraceabilitybackend.domain.repository.LoteRepository;
import com.icai.tfg.olivetraceabilitybackend.infrastructure.blockchain.CadenaAceiteWrapper;
import com.icai.tfg.olivetraceabilitybackend.infrastructure.mqtt.MqttService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class LoteServiceTest {

    @Mock LoteRepository loteRepository;
    @Mock EventoTrazabilidadRepository eventoRepository;
    @Mock CadenaAceiteWrapper blockchain;
    @Mock MqttService mqttService;

    // Tres configuraciones del servicio para cubrir las ramas de Optional
    LoteService serviceConTodo;       // blockchain + MQTT activos
    LoteService serviceSinBlockchain; // solo MQTT activo
    LoteService serviceSinMqtt;       // nada activo

    @BeforeEach
    void setUp() {
        serviceConTodo = new LoteService(
                loteRepository, eventoRepository,
                Optional.of(blockchain), Optional.of(mqttService));
        serviceSinBlockchain = new LoteService(
                loteRepository, eventoRepository,
                Optional.empty(), Optional.of(mqttService));
        serviceSinMqtt = new LoteService(
                loteRepository, eventoRepository,
                Optional.empty(), Optional.empty());
    }

    // ── crearLote ────────────────────────────────────────────────────────────

    @Test
    void crearLote_sinBlockchain_guardaEventoConTxHashNull() {
        Lote lote = new Lote("LOT-2026-0001", "AGR-001", "Finca Las Olivas");
        when(loteRepository.countByLoteIdStartingWith(anyString())).thenReturn(0L);
        when(loteRepository.save(any())).thenReturn(lote);
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Lote resultado = serviceSinBlockchain.crearLote("AGR-001", "Finca Las Olivas");

        assertThat(resultado.getLoteId()).startsWith("LOT-");
        verify(eventoRepository).save(argThat(e ->
                e.getTipoEvento() == TipoEvento.LOTE_CREADO && e.getTxHash() == null));
    }

    @Test
    void crearLote_conBlockchain_guardaEventoConTxHash() throws Exception {
        Lote lote = loteConId("LOT-2026-0001", "AGR-001", "Finca Las Olivas", 1L);
        when(loteRepository.countByLoteIdStartingWith(anyString())).thenReturn(0L);
        when(loteRepository.save(any())).thenReturn(lote);
        when(blockchain.crearLote(any(), anyString())).thenReturn("0xabc123");
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        serviceConTodo.crearLote("AGR-001", "Finca Las Olivas");

        verify(eventoRepository).save(argThat(e ->
                e.getTipoEvento() == TipoEvento.LOTE_CREADO && "0xabc123".equals(e.getTxHash())));
    }

    @Test
    void crearLote_blockchainFalla_guardaEventoConTxHashNullSinLanzarExcepcion() throws Exception {
        Lote lote = loteConId("LOT-2026-0001", "AGR-001", "Finca", 1L);
        when(loteRepository.countByLoteIdStartingWith(anyString())).thenReturn(0L);
        when(loteRepository.save(any())).thenReturn(lote);
        when(blockchain.crearLote(any(), anyString())).thenThrow(new RuntimeException("Ganache caído"));
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        // El fallo de blockchain NO debe propagarse al llamador
        assertThatNoException().isThrownBy(() -> serviceConTodo.crearLote("AGR-001", "Finca"));
        verify(eventoRepository).save(argThat(e -> e.getTxHash() == null));
    }

    @Test
    void crearLote_generaLoteIdConPaddingCorrecto() {
        int anio = LocalDate.now().getYear();
        // Simulamos que ya existen 4 lotes este año → el nuevo debe ser 0005
        when(loteRepository.countByLoteIdStartingWith("LOT-" + anio + "-")).thenReturn(4L);
        when(loteRepository.save(any())).thenAnswer(i -> i.getArgument(0));
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        Lote resultado = serviceSinBlockchain.crearLote("AGR-001", "Finca");

        assertThat(resultado.getLoteId()).isEqualTo("LOT-" + anio + "-0005");
    }

    // ── cerrarCamion ─────────────────────────────────────────────────────────

    @Test
    void cerrarCamion_loteNoExiste_lanzaLoteNoEncontradoException() {
        when(loteRepository.findByLoteId("LOT-2026-9999")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> serviceSinMqtt.cerrarCamion("LOT-2026-9999"))
                .isInstanceOf(LoteService.LoteNoEncontradoException.class)
                .hasMessageContaining("LOT-2026-9999");
    }

    @Test
    void cerrarCamion_exitoso_guardaEventoCamionCerrado() {
        Lote lote = new Lote("LOT-2026-0001", "AGR-001", "Finca");
        when(loteRepository.findByLoteId("LOT-2026-0001")).thenReturn(Optional.of(lote));
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EventoTrazabilidad resultado = serviceSinBlockchain.cerrarCamion("LOT-2026-0001");

        assertThat(resultado.getTipoEvento()).isEqualTo(TipoEvento.CAMION_CERRADO);
        assertThat(resultado.getPesoKg()).isNull();
    }

    // ── registrarPesaje ──────────────────────────────────────────────────────

    @Test
    void registrarPesaje_exitoso_guardaEventoConPesoKg() {
        Lote lote = new Lote("LOT-2026-0001", "AGR-001", "Finca");
        when(loteRepository.findByLoteId("LOT-2026-0001")).thenReturn(Optional.of(lote));
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EventoTrazabilidad resultado = serviceSinBlockchain.registrarPesaje("LOT-2026-0001", 5200);

        assertThat(resultado.getTipoEvento()).isEqualTo(TipoEvento.PESAJE_REGISTRADO);
        assertThat(resultado.getPesoKg()).isEqualTo(5200);
    }

    @Test
    void registrarPesaje_loteNoExiste_lanzaExcepcion() {
        when(loteRepository.findByLoteId(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> serviceSinMqtt.registrarPesaje("LOT-2026-9999", 3000))
                .isInstanceOf(LoteService.LoteNoEncontradoException.class);
    }

    // ── solicitarPesaje ──────────────────────────────────────────────────────

    @Test
    void solicitarPesaje_mqttDeshabilitado_lanzaSensorNoDisponibleException() {
        assertThatThrownBy(() -> serviceSinMqtt.solicitarPesaje("LOT-2026-0001"))
                .isInstanceOf(SensorNoDisponibleException.class);
    }

    @Test
    void solicitarPesaje_mqttDisponible_delegaAPesajeConElPesoDelSensor() {
        Lote lote = new Lote("LOT-2026-0001", "AGR-001", "Finca");
        when(mqttService.requestWeight("LOT-2026-0001")).thenReturn(4750);
        when(loteRepository.findByLoteId("LOT-2026-0001")).thenReturn(Optional.of(lote));
        when(eventoRepository.save(any())).thenAnswer(i -> i.getArgument(0));

        EventoTrazabilidad resultado = serviceSinBlockchain.solicitarPesaje("LOT-2026-0001");

        assertThat(resultado.getTipoEvento()).isEqualTo(TipoEvento.PESAJE_REGISTRADO);
        assertThat(resultado.getPesoKg()).isEqualTo(4750);
    }

    // ── obtenerTrazabilidad ──────────────────────────────────────────────────

    @Test
    void obtenerTrazabilidad_loteNoExiste_lanzaExcepcion() {
        when(loteRepository.findByLoteId(anyString())).thenReturn(Optional.empty());

        assertThatThrownBy(() -> serviceSinMqtt.obtenerTrazabilidad("LOT-2026-9999"))
                .isInstanceOf(LoteService.LoteNoEncontradoException.class);
    }

    @Test
    void obtenerTrazabilidad_devuelveEventosDelRepositorioOrdenados() {
        Lote lote = new Lote("LOT-2026-0001", "AGR-001", "Finca");
        EventoTrazabilidad e1 = new EventoTrazabilidad("LOT-2026-0001", TipoEvento.LOTE_CREADO, null, "0xaaa");
        EventoTrazabilidad e2 = new EventoTrazabilidad("LOT-2026-0001", TipoEvento.CAMION_CERRADO, null, "0xbbb");
        when(loteRepository.findByLoteId("LOT-2026-0001")).thenReturn(Optional.of(lote));
        when(eventoRepository.findByLoteIdOrderByTimestampAsc("LOT-2026-0001"))
                .thenReturn(List.of(e1, e2));

        List<EventoTrazabilidad> resultado = serviceSinMqtt.obtenerTrazabilidad("LOT-2026-0001");

        assertThat(resultado).hasSize(2);
        assertThat(resultado.get(0).getTipoEvento()).isEqualTo(TipoEvento.LOTE_CREADO);
        assertThat(resultado.get(1).getTipoEvento()).isEqualTo(TipoEvento.CAMION_CERRADO);
    }

    // ── helper ───────────────────────────────────────────────────────────────

    /** Construye un Lote con el campo id (gestionado por JPA) asignado via reflexión. */
    private static Lote loteConId(String loteId, String agricultorId, String origen, Long id) {
        Lote lote = new Lote(loteId, agricultorId, origen);
        try {
            var field = Lote.class.getDeclaredField("id");
            field.setAccessible(true);
            field.set(lote, id);
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return lote;
    }
}
