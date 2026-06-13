// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * CadenaAceite — trazabilidad on-chain para lotes de aceite de oliva.
 *
 * Cubre el ciclo completo desde la recogida en campo hasta la extracción en almazara.
 * Todas las funciones de escritura requieren onlyOwner (la cuenta del backend).
 *
 * El backend (Spring Boot) replica cada txHash en H2 y almacena los datos detallados
 * (metadatos JSON, cooperativaId, almazaraId) en la base de datos relacional, de forma
 * que el frontend puede mostrar enlaces "verificado en blockchain" sin consultar
 * Ganache en cada carga de página.
 *
 * EventoOnChain almacena solo los datos mínimos necesarios para certificar
 * on-chain que el evento ocurrió; los datos detallados viven en H2.
 */
contract CadenaAceite is Ownable {

    // -----------------------------------------------------------------------
    // Tipos de datos
    // -----------------------------------------------------------------------

    struct EventoOnChain {
        string  tipoEvento;   // p. ej. "LOTE_CREADO", "LAVADO", "EXTRACCION_FINALIZADA"
        uint256 pesoKg;       // 0 en eventos que no son de pesaje
        uint256 timestamp;    // block.timestamp en el momento de la llamada
    }

    // -----------------------------------------------------------------------
    // Estado
    // -----------------------------------------------------------------------

    mapping(uint256 => EventoOnChain[]) private _eventos;

    // -----------------------------------------------------------------------
    // Constructor
    // -----------------------------------------------------------------------

    constructor() Ownable(msg.sender) {}

    // -----------------------------------------------------------------------
    // Eventos — fase campo / transporte
    // -----------------------------------------------------------------------

    event LoteCreado(
        uint256 indexed loteId,
        string          agricultorId,
        string          cooperativaId,
        string          contenedorId,
        string          matriculaCamion,
        string          coordenadasContenedor,
        uint256         timestamp
    );

    event CamionCerrado(
        uint256 indexed loteId,
        string          cooperativaId,
        uint256         timestamp
    );

    event AperturaCompuertaRegistrada(
        uint256 indexed loteId,
        bool            esAutorizada,
        string          ubicacion,
        uint256         timestamp
    );

    // -----------------------------------------------------------------------
    // Eventos — fase almazara
    // -----------------------------------------------------------------------

    event LavadoRegistrado(
        uint256 indexed loteId,
        bool            aguaApta,
        uint256         temperaturaAgua,
        uint256         phAgua,          // x10: 68 = pH 6.8
        string          almazaraId,
        uint256         timestamp
    );

    event PesajeCintaRegistrado(
        uint256 indexed loteId,
        uint256         pesoKg,
        string          almazaraId,
        uint256         timestamp
    );

    event MoliendaIniciada(
        uint256 indexed loteId,
        string          almazaraId,
        uint256         timestamp
    );

    event TemperaturaBatidoRegistrada(
        uint256 indexed loteId,
        uint256         temperaturaC,    // x10: 245 = 24.5°C
        string          almazaraId,
        uint256         timestamp
    );

    event DecanterRegistrado(
        uint256 indexed loteId,
        uint256         litrosAceite,
        uint256         kgAlpeorujo,
        string          almazaraId,
        uint256         timestamp
    );

    event ExtraccionFinalizada(
        uint256 indexed loteId,
        uint256         litrosAceiteTotal,
        uint256         rendimientoPorcentaje,  // x10: 205 = 20.5%
        string          almazaraId,
        uint256         timestamp
    );

    event PesajeCamionLlenoRegistrado(
        uint256 indexed loteId,
        uint256         pesoKg,
        string          almazaraId,
        uint256         timestamp
    );

    event VolcadoTolvaRegistrado(
        uint256 indexed loteId,
        string          almazaraId,
        uint256         timestamp
    );

    event PesajeCamionVacioRegistrado(
        uint256 indexed loteId,
        uint256         pesoKg,
        string          almazaraId,
        uint256         timestamp
    );

    event CentrifugadoraRegistrada(
        uint256 indexed loteId,
        uint256         revoluciones,
        uint256         temperatura,    // x10: 200 = 20.0°C
        string          almazaraId,
        uint256         timestamp
    );

    // -----------------------------------------------------------------------
    // Funciones de escritura — fase campo / transporte
    // -----------------------------------------------------------------------

    function crearLote(
        uint256       loteId,
        string calldata agricultorId,
        string calldata cooperativaId,
        string calldata contenedorId,
        string calldata matriculaCamion,
        string calldata coordenadasContenedor
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("LOTE_CREADO", 0, block.timestamp));
        emit LoteCreado(loteId, agricultorId, cooperativaId, contenedorId, matriculaCamion, coordenadasContenedor, block.timestamp);
    }

    function cerrarCamion(
        uint256       loteId,
        string calldata cooperativaId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("CAMION_CERRADO", 0, block.timestamp));
        emit CamionCerrado(loteId, cooperativaId, block.timestamp);
    }

    function registrarAperturaCompuerta(
        uint256       loteId,
        bool          esAutorizada,
        string calldata ubicacion
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("APERTURA_COMPUERTA", 0, block.timestamp));
        emit AperturaCompuertaRegistrada(loteId, esAutorizada, ubicacion, block.timestamp);
    }

    // -----------------------------------------------------------------------
    // Funciones de escritura — fase almazara
    // -----------------------------------------------------------------------

    function registrarLavado(
        uint256       loteId,
        bool          aguaApta,
        uint256       temperaturaAgua,
        uint256       phAgua,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("LAVADO", 0, block.timestamp));
        emit LavadoRegistrado(loteId, aguaApta, temperaturaAgua, phAgua, almazaraId, block.timestamp);
    }

    function registrarPesajeCinta(
        uint256       loteId,
        uint256       pesoKg,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("PESAJE_CINTA", pesoKg, block.timestamp));
        emit PesajeCintaRegistrado(loteId, pesoKg, almazaraId, block.timestamp);
    }

    function iniciarMolienda(
        uint256       loteId,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("MOLIENDA_INICIADA", 0, block.timestamp));
        emit MoliendaIniciada(loteId, almazaraId, block.timestamp);
    }

    function registrarTemperaturaBatido(
        uint256       loteId,
        uint256       temperaturaC,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("TEMPERATURA_BATIDO", 0, block.timestamp));
        emit TemperaturaBatidoRegistrada(loteId, temperaturaC, almazaraId, block.timestamp);
    }

    function registrarDecanter(
        uint256       loteId,
        uint256       litrosAceite,
        uint256       kgAlpeorujo,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("DECANTER", 0, block.timestamp));
        emit DecanterRegistrado(loteId, litrosAceite, kgAlpeorujo, almazaraId, block.timestamp);
    }

    function finalizarExtraccion(
        uint256       loteId,
        uint256       litrosAceiteTotal,
        uint256       rendimientoPorcentaje,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("EXTRACCION_FINALIZADA", 0, block.timestamp));
        emit ExtraccionFinalizada(loteId, litrosAceiteTotal, rendimientoPorcentaje, almazaraId, block.timestamp);
    }

    function registrarPesajeCamionLleno(
        uint256       loteId,
        uint256       pesoKg,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("PESAJE_CAMION_LLENO", pesoKg, block.timestamp));
        emit PesajeCamionLlenoRegistrado(loteId, pesoKg, almazaraId, block.timestamp);
    }

    function registrarVolcadoTolva(
        uint256       loteId,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("VOLCADO_TOLVA", 0, block.timestamp));
        emit VolcadoTolvaRegistrado(loteId, almazaraId, block.timestamp);
    }

    function registrarPesajeCamionVacio(
        uint256       loteId,
        uint256       pesoKg,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("PESAJE_CAMION_VACIO", pesoKg, block.timestamp));
        emit PesajeCamionVacioRegistrado(loteId, pesoKg, almazaraId, block.timestamp);
    }

    function registrarCentrifugadora(
        uint256       loteId,
        uint256       revoluciones,
        uint256       temperatura,
        string calldata almazaraId
    ) external onlyOwner {
        _eventos[loteId].push(EventoOnChain("CENTRIFUGADORA", 0, block.timestamp));
        emit CentrifugadoraRegistrada(loteId, revoluciones, temperatura, almazaraId, block.timestamp);
    }

    // -----------------------------------------------------------------------
    // Función de lectura (no usada por Spring Boot —lee de H2— pero útil
    // para verificación directa on-chain y la demostración)
    // -----------------------------------------------------------------------

    function obtenerEventos(uint256 loteId)
        external
        view
        returns (EventoOnChain[] memory)
    {
        return _eventos[loteId];
    }
}
