"""
Simulador de sensores IoT para almazara.
Maneja 9 topics de solicitud y responde con datos simulados:
  olive/cinta/request        → peso cinta almazara  (3500-4440 kg)
  olive/lavado/request       → parámetros de lavado (temp x10: 150-220, pH x10: 65-75)
  olive/batido/request       → temperatura de batido (220-265 x10)
  olive/decanter/request     → litros aceite (1050-1600) + kg alpeorujo (2600-3600)
  olive/extraccion/request   → litros totales (1000-1550) + rendimiento (150-200 x10)
  olive/camionlleno/request  → peso camión lleno (7000-8000 kg)
  olive/camionvacio/request  → peso camión vacío / tara (1000-2000 kg)
  olive/molienda/request     → temperatura molino (200-280 x10)
  olive/centrifugadora/request → revoluciones + temperatura (x10)
"""
import json
import os
import random
import threading
import time

import paho.mqtt.client as mqtt

BROKER = os.getenv("MQTT_BROKER", "localhost")
PORT   = int(os.getenv("MQTT_PORT", "1883"))

TOPICS_REQUEST = [
    "olive/cinta/request",
    "olive/lavado/request",
    "olive/batido/request",
    "olive/decanter/request",
    "olive/extraccion/request",
    "olive/camionlleno/request",
    "olive/camionvacio/request",
    "olive/molienda/request",
    "olive/centrifugadora/request",
]


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[simulador] Conectado al broker {BROKER}:{PORT}", flush=True)
        for topic in TOPICS_REQUEST:
            client.subscribe(topic)
            print(f"[simulador] Suscrito a {topic}", flush=True)
    else:
        print(f"[simulador] Conexión fallida (rc={rc})", flush=True)


# ── Handlers por topic ────────────────────────────────────────────────────────

def handle_cinta(client, lote_id):
    """Cinta transportadora almazara: 3500-4440 kg (siempre < post-limpieza mínimo 4500)."""
    delay = random.uniform(1.5, 3.0)
    time.sleep(delay)
    peso = random.randint(3500, 4440)
    payload = json.dumps({"loteId": lote_id, "pesoKg": peso})
    client.publish("olive/cinta/response", payload)
    print(
        f"[simulador][cinta] Publicado pesoKg={peso} para loteId={lote_id} "
        f"(tras {delay:.1f}s)",
        flush=True,
    )


def handle_lavado(client, lote_id):
    """Parámetros de agua de lavado: temperatura x10 (150-220 → 15.0-22.0°C), pH x10 (65-75 → 6.5-7.5)."""
    delay = random.uniform(2.0, 4.0)
    time.sleep(delay)
    temp = random.randint(150, 220)
    ph   = random.randint(65, 75)
    payload = json.dumps({
        "loteId":          lote_id,
        "temperaturaAgua": temp,
        "phAgua":          ph,
        "aguaApta":        True,
    })
    client.publish("olive/lavado/response", payload)
    print(
        f"[simulador][lavado] Publicado temp={temp} ({temp/10:.1f}°C) ph={ph} ({ph/10:.1f}) "
        f"para loteId={lote_id} (tras {delay:.1f}s)",
        flush=True,
    )


def handle_batido(client, lote_id):
    """Temperatura de batido x10: entre 220 y 265 (22.0–26.5°C)."""
    delay = random.uniform(2.0, 4.0)
    time.sleep(delay)
    temp = random.randint(220, 265)
    payload = json.dumps({"loteId": lote_id, "temperaturaC": temp})
    client.publish("olive/batido/response", payload)
    print(
        f"[simulador][batido] Publicado temperaturaC={temp} ({temp/10:.1f}°C) "
        f"para loteId={lote_id} (tras {delay:.1f}s)",
        flush=True,
    )


def handle_decanter(client, lote_id):
    """Resultados del decanter: litros aceite y kg alpeorujo.
    Con ~7000-8000 kg de aceituna en cinta: aceite 15-20% → 1050-1600 L;
    alpeorujo 37-45% → 2600-3600 kg."""
    delay = random.uniform(3.0, 5.0)
    time.sleep(delay)
    litros   = random.randint(1050, 1600)
    alpeorujo = random.randint(2600, 3600)
    payload = json.dumps({
        "loteId":      lote_id,
        "litrosAceite": litros,
        "kgAlpeorujo":  alpeorujo,
    })
    client.publish("olive/decanter/response", payload)
    print(
        f"[simulador][decanter] Publicado litros={litros} alpeorujo={alpeorujo} "
        f"para loteId={lote_id} (tras {delay:.1f}s)",
        flush=True,
    )


def handle_extraccion(client, lote_id):
    """Extracción finalizada: litros totales y rendimiento x10.
    Litros ligeramente menores al decanter (pérdidas en centrifugadora);
    rendimiento 15-20% (×10 → 150-200)."""
    delay = random.uniform(2.0, 3.0)
    time.sleep(delay)
    litros      = random.randint(1000, 1550)
    rendimiento = random.randint(150, 200)
    payload = json.dumps({
        "loteId":                lote_id,
        "litrosAceiteTotal":     litros,
        "rendimientoPorcentaje": rendimiento,
    })
    client.publish("olive/extraccion/response", payload)
    print(
        f"[simulador][extraccion] Publicado litros={litros} rendimiento={rendimiento/10:.1f}% "
        f"para loteId={lote_id} (tras {delay:.1f}s)",
        flush=True,
    )


def handle_camionlleno(client, lote_id):
    """Pesaje camión lleno en báscula de almazara: 7000-8000 kg."""
    delay = random.uniform(1.5, 3.0)
    time.sleep(delay)
    peso = random.randint(7000, 8000)
    payload = json.dumps({"loteId": lote_id, "pesoKg": peso})
    client.publish("olive/camionlleno/response", payload)
    print(
        f"[simulador][camionlleno] Publicado pesoKg={peso} para loteId={lote_id} "
        f"(tras {delay:.1f}s)",
        flush=True,
    )


def handle_camionvacio(client, lote_id):
    """Pesaje camión vacío tras volcado (tara): 1000-2000 kg."""
    delay = random.uniform(1.5, 3.0)
    time.sleep(delay)
    peso = random.randint(1000, 2000)
    payload = json.dumps({"loteId": lote_id, "pesoKg": peso})
    client.publish("olive/camionvacio/response", payload)
    print(
        f"[simulador][camionvacio] Publicado pesoKg={peso} para loteId={lote_id} "
        f"(tras {delay:.1f}s)",
        flush=True,
    )


def handle_molienda(client, lote_id):
    """Temperatura del molino x10: entre 200 y 280 (20.0–28.0°C)."""
    delay = random.uniform(2.0, 4.0)
    time.sleep(delay)
    temp = random.randint(200, 280)
    payload = json.dumps({"loteId": lote_id, "temperaturaC": temp})
    client.publish("olive/molienda/response", payload)
    print(
        f"[simulador][molienda] Publicado temperaturaC={temp} ({temp/10:.1f}°C) "
        f"para loteId={lote_id} (tras {delay:.1f}s)",
        flush=True,
    )


def handle_centrifugadora(client, lote_id):
    """Centrifugadora: revoluciones y temperatura x10."""
    delay = random.uniform(2.0, 4.0)
    time.sleep(delay)
    rpm  = random.randint(3000, 5000)
    temp = random.randint(180, 240)
    payload = json.dumps({
        "loteId":       lote_id,
        "revoluciones": rpm,
        "temperatura":  temp,
    })
    client.publish("olive/centrifugadora/response", payload)
    print(
        f"[simulador][centrifugadora] Publicado rpm={rpm} temp={temp/10:.1f}°C "
        f"para loteId={lote_id} (tras {delay:.1f}s)",
        flush=True,
    )


# ── Dispatch ──────────────────────────────────────────────────────────────────

HANDLERS = {
    "olive/cinta/request":        handle_cinta,
    "olive/lavado/request":       handle_lavado,
    "olive/batido/request":       handle_batido,
    "olive/decanter/request":     handle_decanter,
    "olive/extraccion/request":   handle_extraccion,
    "olive/camionlleno/request":  handle_camionlleno,
    "olive/camionvacio/request":  handle_camionvacio,
    "olive/molienda/request":     handle_molienda,
    "olive/centrifugadora/request": handle_centrifugadora,
}


def on_message(client, userdata, msg):
    try:
        data    = json.loads(msg.payload.decode())
        lote_id = data["loteId"]
        handler = HANDLERS.get(msg.topic)
        if handler is None:
            print(f"[simulador] Topic desconocido: {msg.topic}", flush=True)
            return
        print(
            f"[simulador] Solicitud recibida en {msg.topic} para loteId={lote_id}",
            flush=True,
        )
        threading.Thread(target=handler, args=(client, lote_id), daemon=True).start()
    except Exception as e:
        print(f"[simulador] Error al procesar mensaje: {e}", flush=True)


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"[simulador] Conectando a {BROKER}:{PORT}...", flush=True)
    client.connect(BROKER, PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
