"""
Simulador de báscula IoT.
Se suscribe a olive/scale/request, espera entre 1,5 y 3 s y publica
un peso aleatorio en olive/scale/response.
"""
import json
import os
import random
import threading
import time

import paho.mqtt.client as mqtt

BROKER = os.getenv("MQTT_BROKER", "localhost")
PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_REQUEST = "olive/scale/request"
TOPIC_RESPONSE = "olive/scale/response"


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print(f"[simulador] Conectado al broker {BROKER}:{PORT}", flush=True)
        client.subscribe(TOPIC_REQUEST)
        print(f"[simulador] Suscrito a {TOPIC_REQUEST}", flush=True)
    else:
        print(f"[simulador] Conexión fallida (rc={rc})", flush=True)


def on_message(client, userdata, msg):
    try:
        data = json.loads(msg.payload.decode())
        lote_id = data["loteId"]
        print(f"[simulador] Solicitud de pesaje recibida para loteId={lote_id}", flush=True)

        def respond():
            delay = random.uniform(1.5, 3.0)
            time.sleep(delay)
            peso = random.randint(3000, 8000)
            payload = json.dumps({"loteId": lote_id, "pesoKg": peso})
            client.publish(TOPIC_RESPONSE, payload)
            print(
                f"[simulador] Publicado peso {peso} kg para loteId={lote_id} "
                f"(tras {delay:.1f}s)",
                flush=True,
            )

        threading.Thread(target=respond, daemon=True).start()
    except Exception as e:
        print(f"[simulador] Error al procesar mensaje: {e}", flush=True)


def main():
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    print(f"[simulador] Conectando a {BROKER}:{PORT}...", flush=True)
    client.connect(BROKER, PORT, keepalive=60)
    client.loop_forever()


if __name__ == "__main__":
    main()
