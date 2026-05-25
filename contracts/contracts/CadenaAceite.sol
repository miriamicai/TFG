// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * CadenaAceite — on-chain traceability for olive oil batches.
 *
 * Each lot (identified by its backend database id) passes through up to three
 * stages.  Every stage both emits a Solidity event (indexed in the node logs)
 * and appends a record to an in-contract array so obtenerEventos() can return
 * the full history without relying on log queries.
 *
 * The backend (Spring Boot) mirrors every transaction to H2 and stores the
 * returned txHash, so the frontend can show "verified on chain" links without
 * querying Ganache on every page load.
 */
contract CadenaAceite {

    // -----------------------------------------------------------------------
    // Data types
    // -----------------------------------------------------------------------

    struct EventoOnChain {
        string   tipoEvento;   // "LOTE_CREADO" | "CAMION_CERRADO" | "PESAJE_REGISTRADO"
        uint256  pesoKg;       // 0 for non-weighing events
        uint256  timestamp;    // block.timestamp at the moment of the call
    }

    // -----------------------------------------------------------------------
    // Events  (indexed by loteId so they can be filtered cheaply)
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
    // State
    // -----------------------------------------------------------------------

    mapping(uint256 => EventoOnChain[]) private _eventos;

    // -----------------------------------------------------------------------
    // Write functions  (called by CadenaAceiteWrapper via RawTransactionManager)
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
    // Read function  (not used by Spring Boot — it reads from H2 — but useful
    // for direct on-chain verification and the TFG demonstration)
    // -----------------------------------------------------------------------

    function obtenerEventos(uint256 loteId)
        external
        view
        returns (EventoOnChain[] memory)
    {
        return _eventos[loteId];
    }
}
