# 🛡️ Secure ESP32 Edge Node: Root of Trust Implementation

> **Overview**
> This project implements a sophisticated **"Root of Trust"** architecture for ESP32. By moving the private key into **NVS (Non-Volatile Storage)**, the sensitive key is kept entirely separate from the hardcoded firmware source code. This provides an essential layer of protection against simple memory dumps and code leaks.

---

## 🚀 The Three-Phase Architecture

This guide details the complete setup for your Secure ESP32 Edge Node, broken down into three distinct phases:

1. **Provisioning (Key Storage)**
2. **Main Secure Firmware (Data & Signing)**
3. **Gateway Verification (Blockchain Integration)**

---

### Phase 1: Store the Private Key in NVS

Before running the main logic, you must "provision" the device. This process runs **once** to save your ECC Private Key into the ESP32's secure NVS area.

- **File Reference:** [`prerun.cpp`](./prerun.cpp)
- **Action:** Open `prerun.cpp`, insert your actual ECC Private Key (in PEM format), and flash this sketch to your ESP32.
- **Result:** The private key is safely stored under the `security` namespace, and you are ready for Phase 2.

> [!WARNING]
> Ensure you keep the newline (`\n`) characters in your PEM-formatted key when pasting it into the provisioning script!

---

### Phase 2: The Main Secure MQTT Logic

Once provisioned, the main firmware runs continuously to securely capture and transmit data.

- **File Reference:** [`index.cpp`](./index.cpp)

**The Firmware Lifecycle:**
1. **Retrieve:** Fetches the private key securely from NVS.
2. **Generate:** Captures sensor data (e.g., temperature).
3. **Hash:** Hashes the payload using **SHA-256**.
4. **Sign:** Signs the hash with your ECC key via **ECDSA**.
5. **Publish:** Transmits the data, hash, and signature as a JSON payload over MQTT.

**Required Libraries:**
- `PubSubClient` (by Nick O'Leary)
- `ArduinoJson` (by Benoit Blanchon)
- `mbedtls` (Built-in to ESP32 core)

---

### Phase 3: Setting Up the Gateway (Raspberry Pi)

To bridge this to the blockchain (as per your Hybrid Framework), the Gateway (Raspberry Pi) must be configured to receive and verify the data.

#### 1. Install Mosquitto (The Broker)

Run the following commands on your Pi to install and enable the MQTT broker:

```bash
sudo apt update
sudo apt install mosquitto mosquitto-clients
sudo systemctl enable mosquitto
```

> [!NOTE]
> Ensure `/etc/mosquitto/mosquitto.conf` allows external connections by adding `listener 1883` and `allow_anonymous true`.

#### 2. The Verification Script (Python)

The Pi uses a Python script to receive the MQTT message, verify the signature against the ESP32's Public Key, and securely log the hash to your local blockchain (e.g., Ganache).

- **File Reference:** [`verification-script.py`](./verification-script.py)
- **Action:** Run this script on your Pi to start listening for incoming ESP32 payloads. Valid payloads will have their hashes sent to the ledger.

---

## ✅ Summary Checklist

- [ ] **Generate Keys:** Use OpenSSL to create an ECC P-256 key pair.
- [ ] **Provision:** Flash the `prerun.cpp` sketch to save the Private Key to the ESP32's NVS.
- [ ] **Deploy Main Code:** Flash the `index.cpp` main logic to the ESP32.
- [ ] **Gateway Setup:** Run Mosquitto and `verification-script.py` on the Raspberry Pi.
- [ ] **Verify:** Watch the Pi's console; you should see the JSON arrive with a hex signature, which the Pi then prepares for the blockchain.

---
*Built for the Secure Edge-to-Cloud IoT Framework.*
