package com.icai.tfg.olivetraceabilitybackend.infrastructure.blockchain;

import org.web3j.abi.FunctionEncoder;
import org.web3j.abi.datatypes.Bool;
import org.web3j.abi.datatypes.Function;
import org.web3j.abi.datatypes.Utf8String;
import org.web3j.abi.datatypes.generated.Uint256;
import org.web3j.crypto.Credentials;
import org.web3j.crypto.RawTransaction;
import org.web3j.crypto.TransactionEncoder;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.core.DefaultBlockParameterName;
import org.web3j.protocol.core.methods.response.EthSendTransaction;
import org.web3j.utils.Numeric;

import java.io.IOException;
import java.math.BigInteger;
import java.util.Arrays;
import java.util.Collections;

/**
 * Wrapper de bajo nivel sobre Web3j para CadenaAceite.sol.
 *
 * Usa solo las APIs estables y primitivas de Web3j (sin clase base Contract):
 *   1. ethGetTransactionCount  → nonce
 *   2. RawTransaction.createTransaction → transacción sin firmar
 *   3. TransactionEncoder.signMessage   → bytes firmados (EIP-155)
 *   4. ethSendRawTransaction            → difusión a la red
 */
public class CadenaAceiteWrapper {

    private final String contractAddress;
    private final Web3j web3j;
    private final Credentials credentials;
    private final long chainId;

    // Gas price: 20 Gwei. Gas limit: 300 000 — superior a los ~80 000 que
    // consumen las funciones reales, y por debajo del límite de bloque de
    // Ganache (~6 700 000).
    private static final BigInteger GAS_PRICE = BigInteger.valueOf(20_000_000_000L);
    private static final BigInteger GAS_LIMIT  = BigInteger.valueOf(300_000L);

    public CadenaAceiteWrapper(String contractAddress, Web3j web3j, Credentials credentials, long chainId) {
        this.contractAddress = contractAddress;
        this.web3j           = web3j;
        this.credentials     = credentials;
        this.chainId         = chainId;
    }

    // -----------------------------------------------------------------------
    // Fase campo / transporte
    // -----------------------------------------------------------------------

    public String crearLote(BigInteger loteId, String agricultorId, String cooperativaId,
                             String contenedorId, String matriculaCamion, String coordenadasContenedor) throws IOException {
        Function function = new Function(
            "crearLote",
            Arrays.asList(
                new Uint256(loteId),
                new Utf8String(nullToEmpty(agricultorId)),
                new Utf8String(nullToEmpty(cooperativaId)),
                new Utf8String(nullToEmpty(contenedorId)),
                new Utf8String(nullToEmpty(matriculaCamion)),
                new Utf8String(nullToEmpty(coordenadasContenedor))
            ),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String cerrarCamion(BigInteger loteId, String cooperativaId) throws IOException {
        Function function = new Function(
            "cerrarCamion",
            Arrays.asList(new Uint256(loteId), new Utf8String(nullToEmpty(cooperativaId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarAperturaCompuerta(BigInteger loteId, boolean esAutorizada, String ubicacion) throws IOException {
        Function function = new Function(
            "registrarAperturaCompuerta",
            Arrays.asList(new Uint256(loteId), new Bool(esAutorizada), new Utf8String(nullToEmpty(ubicacion))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    // -----------------------------------------------------------------------
    // Fase almazara
    // -----------------------------------------------------------------------

    public String registrarLavado(BigInteger loteId, boolean aguaApta, BigInteger temperaturaAgua,
                                   BigInteger phAgua, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarLavado",
            Arrays.asList(
                new Uint256(loteId),
                new Bool(aguaApta),
                new Uint256(temperaturaAgua),
                new Uint256(phAgua),
                new Utf8String(nullToEmpty(almazaraId))
            ),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarPesajeCinta(BigInteger loteId, BigInteger pesoKg, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarPesajeCinta",
            Arrays.asList(new Uint256(loteId), new Uint256(pesoKg), new Utf8String(nullToEmpty(almazaraId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String iniciarMolienda(BigInteger loteId, String almazaraId) throws IOException {
        Function function = new Function(
            "iniciarMolienda",
            Arrays.asList(new Uint256(loteId), new Utf8String(nullToEmpty(almazaraId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarTemperaturaBatido(BigInteger loteId, BigInteger temperaturaC, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarTemperaturaBatido",
            Arrays.asList(new Uint256(loteId), new Uint256(temperaturaC), new Utf8String(nullToEmpty(almazaraId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarDecanter(BigInteger loteId, BigInteger litrosAceite, BigInteger kgAlpeorujo,
                                     String almazaraId) throws IOException {
        Function function = new Function(
            "registrarDecanter",
            Arrays.asList(
                new Uint256(loteId),
                new Uint256(litrosAceite),
                new Uint256(kgAlpeorujo),
                new Utf8String(nullToEmpty(almazaraId))
            ),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String finalizarExtraccion(BigInteger loteId, BigInteger litrosAceiteTotal,
                                       BigInteger rendimientoPorcentaje, String almazaraId) throws IOException {
        Function function = new Function(
            "finalizarExtraccion",
            Arrays.asList(
                new Uint256(loteId),
                new Uint256(litrosAceiteTotal),
                new Uint256(rendimientoPorcentaje),
                new Utf8String(nullToEmpty(almazaraId))
            ),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarPesajeCamionLleno(BigInteger loteId, BigInteger pesoKg, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarPesajeCamionLleno",
            Arrays.asList(new Uint256(loteId), new Uint256(pesoKg), new Utf8String(nullToEmpty(almazaraId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarVolcadoTolva(BigInteger loteId, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarVolcadoTolva",
            Arrays.asList(new Uint256(loteId), new Utf8String(nullToEmpty(almazaraId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarPesajeCamionVacio(BigInteger loteId, BigInteger pesoKg, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarPesajeCamionVacio",
            Arrays.asList(new Uint256(loteId), new Uint256(pesoKg), new Utf8String(nullToEmpty(almazaraId))),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    public String registrarCentrifugadora(BigInteger loteId, BigInteger revoluciones,
                                           BigInteger temperatura, String almazaraId) throws IOException {
        Function function = new Function(
            "registrarCentrifugadora",
            Arrays.asList(
                new Uint256(loteId),
                new Uint256(revoluciones),
                new Uint256(temperatura),
                new Utf8String(nullToEmpty(almazaraId))
            ),
            Collections.emptyList()
        );
        return sendTransaction(function);
    }

    // -----------------------------------------------------------------------
    // Infraestructura compartida
    // -----------------------------------------------------------------------

    private String sendTransaction(Function function) throws IOException {
        String encodedFunction = FunctionEncoder.encode(function);

        // 1. Obtener el nonce actual para la dirección del remitente
        BigInteger nonce = web3j
            .ethGetTransactionCount(credentials.getAddress(), DefaultBlockParameterName.LATEST)
            .send()
            .getTransactionCount();

        // 2. Construir la transacción cruda sin firmar
        RawTransaction rawTransaction = RawTransaction.createTransaction(
            nonce,
            GAS_PRICE,
            GAS_LIMIT,
            contractAddress,
            BigInteger.ZERO,   // value (ETH): 0
            encodedFunction
        );

        // 3. Firmar con el chain ID (protección anti-replay EIP-155)
        byte[] signedMessage = TransactionEncoder.signMessage(rawTransaction, chainId, credentials);

        // 4. Difundir al nodo
        EthSendTransaction response = web3j
            .ethSendRawTransaction(Numeric.toHexString(signedMessage))
            .send();

        if (response.hasError()) {
            throw new IOException("Error en blockchain: " + response.getError().getMessage());
        }
        String hash = response.getTransactionHash();
        if (hash == null || hash.isBlank()) {
            throw new IOException(
                "Ganache no devolvió txHash (resultado null). " +
                "Causas habituales: (1) contrato no desplegado en " + contractAddress +
                ", (2) chainId incorrecto en la firma, (3) nonce ya usado."
            );
        }
        return hash;
    }

    /** Convierte null a cadena vacía para que el ABI de Solidity acepte el string. */
    private static String nullToEmpty(String value) {
        return value != null ? value : "";
    }
}
