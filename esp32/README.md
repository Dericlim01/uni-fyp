# 🔌 ESP32 Secure IoT Node

This project contains the firmware for an **ESP32** acting as a secure "Root of Trust" (RoT) edge device. It captures sensor data, cryptographically signs it using **ECDSA**, and transmits it to a gateway via **MQTT**.

---

## 🛠 Features

- **Hardware-Level Security**: Uses the ESP32's Non-Volatile Storage (NVS) to securely store network credentials and private keys.
- **Cryptographic Integrity**: 
  - **SHA-256**: Generates a unique hash for every sensor reading.
  - **ECDSA Signing**: Signs the hash using a private key (mbedTLS) to ensure authenticity.
- **Robust Communication**: Uses MQTT protocol for lightweight and reliable data transmission.
- **JSON Payload**: Sends structured data containing the Device ID, Temperature, Hash, and Signature.

---

## 🏗 System Architecture

1.  **Provisioning**: Credentials and keys are flashed into the NVS partition (once).
2.  **Sensing**: The device reads environmental data (e.g., Temperature).
3.  **Signing**: A hash is generated and signed on-device.
4.  **Publishing**: The signed packet is sent to the Raspberry Pi Gateway for blockchain verification.

---

## 📋 Prerequisites

### Hardware
- ESP32 Development Board (e.g., NodeMCU, DevKitV1)
- Micro-USB cable
- (Optional) DHT11/22 Sensor (The current code uses simulated data)

### Software (Arduino IDE / PlatformIO)
- **Libraries**:
  - `PubSubClient` (for MQTT)
  - `ArduinoJson` (for JSON formatting)
  - `Preferences` (included in ESP32 core)
  - `mbedtls` (included in ESP32 core)

---

## 🚀 Installation & Setup

### 1. Provisioning (NVS Setup)
Before running the main firmware, you must provision the device with your network credentials and a private key.

#### Key Generation (ECC)
The ESP32 requires an **ECC (secp256r1)** private key for signing.
```bash
# 1. Generate the key
openssl ecparam -name prime256v1 -genkey -noout -out private.pem

# 2. View the key text
cat private.pem
```

#### Formatting Requirement
The `mbedtls` library is very strict. You must include the header, footer, and `\n` characters exactly:
```cpp
const char* my_private_key = 
  "-----BEGIN EC PRIVATE KEY-----\n"
  "MHQCAQEEIFxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n"
  "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx\n"
  "-----END EC PRIVATE KEY-----";
```

1.  Open `prerun.cpp`.
2.  Update your `ssid`, `password`, `mqtt_server`, and `priv_key`.
3.  Upload this sketch to the ESP32 to save these values into the **"security"** NVS namespace.

### 2. Main Firmware
1.  Open `index.cpp`.
2.  Ensure you have the required libraries installed.
3.  Select the correct ESP32 board and COM port.
4.  Upload the code.

---

## 📡 MQTT Payload Structure

The device publishes to the `sensor/data` topic with the following JSON format:

```json
{
  "deviceId": "ESP32_01",
  "temperature": 25.5,
  "hash": "b5ac...",
  "signature": "3045..."
}
```

---

## 📂 Project Structure

```text
esp32/
├── index.cpp               # Main firmware logic (Signing & Publishing)
├── prerun.cpp              # Provisioning script for NVS credentials
├── verification-script.py  # Python tool for offline signature verification
├── .env                    # Configuration template
└── README.md               # This file
```

---

## 🔒 Security Workflow

| Component | Responsibility |
| :--- | :--- |
| **NVS** | Secure storage of the Private Key. |
| **mbedTLS** | Execution of ECDSA (secp256r1) signing. |
| **SHA-256** | Ensuring data hasn't been modified in transit. |

---

## 📄 License
[ISC](https://choosealicense.com/licenses/isc/)
