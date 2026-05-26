// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * CadenaAceite — trazabilidad on-chain para lotes de aceite de oliva.
 *
 * Cada lote (identificado por su id en la base de datos del backend) pasa por
 * hasta tres etapas. Cada etapa emite un evento Solidity (indexado en los logs
 * del nodo) y añade un registro al array interno del contrato para que
 * obtenerEventos() pueda devolver el historial completo sin depender de
 * consultas a los logs.
 *
 * El backend (Spring Boot) replica cada transacción en H2 y almacena el
 * txHash devuelto, de forma que el frontend puede mostrar enlaces "verificado
 * en blockchain" sin consultar Ganache en cada carga de página.
 */
contract CadenaAceite {

    // -----------------------------------------------------------------------
    // Tipos de datos
    // -----------------------------------------------------------------------

    struct EventoOnChain {
        string   tipoEvento;   // "LOTE_CREADO" | "CAMION_CERRADO" | "PESAJE_REGISTRADO"
        uint256  pesoKg;       // 0 en eventos que no son de pesaje
        uint256  timestamp;    // block.timestamp en el momento de la llamada
    }

    // -----------------------------------------------------------------------
    // Eventos  (indexados por loteId para poder filtrarlos eficientemente)
    // -----------------------------------------------------------------------

    event LoteCreado(
        uint256 indexed loteId,
        string          agricultorId,
        uint256         timestamp
    );

    event CamionCerrado(
        uint256 indexed loteId,
        uint256         timestamp
    );

    event PesajeRegistrado(
        uint256 indexed loteId,
        uint256         pesoKg,
        uint256         timestamp
    );

    // -----------------------------------------------------------------------
    // Estado
    // -----------------------------------------------------------------------

    mapping(uint256 => EventoOnChain[]) private _eventos;

    // -----------------------------------------------------------------------
    // Funciones de escritura  (llamadas desde CadenaAceiteWrapper)
    // -----------------------------------------------------------------------

    function crearLote(uint256 loteId, string calldata agricultorId) external {
        _eventos[loteId].push(EventoOnChain("LOTE_CREADO", 0, block.timestamp));
        emit LoteCreado(loteId, agricultorId, block.timestamp);
    }

    function cerrarCamion(uint256 loteId) external {
        _eventos[loteId].push(EventoOnChain("CAMION_CERRADO", 0, block.timestamp));
        emit CamionCerrado(loteId, block.timestamp);
    }

    function registrarPesaje(uint256 loteId, uint256 pesoKg) external {
        _eventos[loteId].push(EventoOnChain("PESAJE_REGISTRADO", pesoKg, block.timestamp));
        emit PesajeRegistrado(loteId, pesoKg, block.timestamp);
    }

    // -----------------------------------------------------------------------
    // Función de lectura  (no usada por Spring Boot —lee de H2— pero útil
    // para verificación directa on-chain y la demostración del TFG)
    // -----------------------------------------------------------------------

    function obtenerEventos(uint256 loteId)
        external
        view
        returns (EventoOnChain[] memory)
    {
        return _eventos[loteId];
    }
}
