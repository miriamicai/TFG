package com.icai.tfg.olivetraceabilitybackend.infrastructure.blockchain;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.web3j.crypto.Credentials;
import org.web3j.protocol.Web3j;
import org.web3j.protocol.http.HttpService;
import java.io.IOException;

@Configuration
@ConditionalOnProperty(name = "blockchain.enabled", havingValue = "true")
public class BlockchainConfig {

    private static final Logger log = LoggerFactory.getLogger(BlockchainConfig.class);

    @Value("${blockchain.node.url}")
    private String nodeUrl;

    @Value("${blockchain.contract.address}")
    private String contractAddress;

    @Value("${blockchain.wallet.privateKey}")
    private String privateKey;

    @Bean
    public Web3j web3j() {
        log.info("Conectando a Ganache en {}", nodeUrl);
        return Web3j.build(new HttpService(nodeUrl));
    }

    @Bean
    @org.springframework.lang.Nullable
    public CadenaAceiteWrapper cadenaAceiteWrapper(Web3j web3j) {
        Credentials credentials = Credentials.create(privateKey);
        try {
            long chainId = web3j.ethChainId().send().getChainId().longValue();
            log.info("Conectado a chain ID {}. Cargando contrato en {}", chainId, contractAddress);
            return new CadenaAceiteWrapper(contractAddress, web3j, credentials, chainId);
        } catch (IOException e) {
            log.warn("No se pudo conectar a Ganache en {}. Las llamadas blockchain se omitirán.", nodeUrl);
            return null;
        }
    }
}
