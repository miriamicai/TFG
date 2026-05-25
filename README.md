# TFG — Trazabilidad de Aceite de Oliva

Sistema de trazabilidad blockchain para la cadena de suministro de aceite de oliva, con integración IoT vía MQTT para pesaje automatizado.

## Estructura del repositorio

```
.
├── backend/        Tenemos Spring Boot 3 — API REST + blockchain (web3j)
├── contracts/      Contiene el Smart contract Solidity (Hardhat) + scripts de despliegue
├── frontend/       React + Vite + Tailwind —> interfaz de usuario
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

### 4. Contratos (solo si se usa blockchain)

```bash
cd contracts
npm install
npx hardhat run scripts/deploy.js --network ganache
```

Actualiza `blockchain.contract.address` en `backend/src/main/resources/application.properties`.

## Flujo de pesaje IoT

```
Frontend → POST /api/lotes/{id}/pesaje/solicitar
         → Backend publica en  olive/scale/request
         → Simulador responde en  olive/scale/response (~2s)
         → Backend registra peso en blockchain + H2
         ← Devuelve EventoResponse { pesoKg, txHash }
```
