# TFG — Trazabilidad de Aceite de Oliva

Sistema de trazabilidad blockchain para la cadena de suministro de aceite de oliva. Cubre la fase de campo y transporte (creación del lote, cierre del camión, pesaje IoT) y la fase de almazara (apertura de compuerta, pesaje en cinta, lavado, molienda, batido, decantación y extracción final). Todos los eventos quedan registrados de forma inmutable en un smart contract Ethereum.

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

Dirección actual desplegada: `0xd5C3A465B258979726DeF70e43C02dbCDB106da4`

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

### Fase campo / transporte

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/lotes` | Crear lote (agricultorId, origen, cooperativaId?) |
| POST | `/lotes/{id}/cerrar` | Cerrar camión (cooperativaId?) |
| POST | `/lotes/{id}/pesaje` | Registrar peso manual |
| POST | `/lotes/{id}/pesaje/solicitar` | Pesaje automático vía sensor IoT (MQTT) |
| GET | `/lotes/{id}/trazabilidad` | Historial completo de eventos |

### Fase almazara

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| POST | `/lotes/{id}/apertura-compuerta` | Apertura de tolva de recepción |
| POST | `/lotes/{id}/pesaje-cinta` | Pesaje en cinta transportadora |
| POST | `/lotes/{id}/lavado` | Paso por lavadora |
| POST | `/lotes/{id}/pesaje-post-limpieza` | Pesaje tras lavado |
| POST | `/lotes/{id}/molienda` | Inicio de molturación |
| POST | `/lotes/{id}/temperatura-batido` | Temperatura de termobatidora |
| POST | `/lotes/{id}/decanter` | Parámetros del decanter centrífugo |
| POST | `/lotes/{id}/extraccion-finalizada` | Cierre del proceso de extracción |

## Documentación

Ver el directorio `docs/` para documentación técnica completa:

- `docs/CONTEXT.md` — setup y referencia rápida
- `docs/DOCUMENTACION_TECNICA.md` — decisiones de diseño
- `docs/JUSTIFICACION_TECNICA.md` — ~14.000 palabras para la memoria del TFG (20 secciones)
- `docs/CONFIGURACION.md` — todos los ficheros de configuración explicados
- `docs/MEJORAS_CODIGO.md` — revisión técnica con antes/después (13 mejoras)
