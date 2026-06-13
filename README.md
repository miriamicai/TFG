# TFG — Trazabilidad de Aceite de Oliva

Sistema de trazabilidad blockchain para la cadena de suministro de aceite de oliva. Cubre la fase de campo, transporte y la fase de almazara. Todos los eventos quedan registrados de forma inmutable en un smart contract Ethereum.

## Estructura del repositorio

```
.
├── backend/        Spring Boot 3 — API REST + blockchain (web3j) + IoT (MQTT)
├── contracts/      Smart contract Solidity con Hardhat (OpenZeppelin Ownable)
├── frontend/       React + Vite + TypeScript + Tailwind — interfaz de usuario
└── iot-simulator/  Simulador IoT Python + broker Mosquitto (Docker)
```

## Arranque del proyecto

### 1. Broker MQTT + simulador IoT

```bash
docker compose up -d
```

Levanta Mosquitto en el puerto `1883` y el simulador IoT Python.

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run
```

API disponible en `http://localhost:8080`.
Consola H2 en `http://localhost:8080/h2-console`.

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Interfaz disponible en `http://localhost:5173`.

### 4. Contratos (solo si se usa blockchain o se modifica el contrato)

Requisitos previos: Ganache Desktop corriendo en el puerto 7545 con Chain ID 1337.

```bash
cd contracts
npm install          # incluye @openzeppelin/contracts@5
npx hardhat run scripts/deploy.js --network ganache
```

Copia la dirección resultante a `blockchain.contract.address` en `backend/src/main/resources/application.properties`.

## Flujo de pesaje IoT

```
Frontend → POST /api/lotes/{id}/pesaje/solicitar
         → Backend publica en  olive/scale/request
         → Simulador responde en  olive/scale/response (~2s)
         → Backend registra peso en blockchain + H2
         ← Devuelve EventoResponse { pesoKg, txHash }
```

## API REST — resumen de endpoints

Base URL: `http://localhost:8080/api`




