#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "mbedtls/md.h"
#include "mbedtls/pk.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"
#include "time.h"

// Onboard LED (ESP32-S GPIO 2)
#define STATUS_LED 2

// Globals
WiFiClient espClient;
PubSubClient client(espClient);
Preferences prefs;
String ssid, password, mqtt_server, privateKey;

// SHA-256 Hashing
void getSHA256(const char* payload, unsigned char* outputHash) {
    mbedtls_md_context_t ctx;
    mbedtls_md_init(&ctx);
    mbedtls_md_setup(&ctx, mbedtls_md_info_from_type(MBEDTLS_MD_SHA256), 0);
    mbedtls_md_starts(&ctx);
    mbedtls_md_update(&ctx, (const unsigned char*)payload, strlen(payload));
    mbedtls_md_finish(&ctx, outputHash);
    mbedtls_md_free(&ctx);
}

// ECDSA Signing
size_t signData(unsigned char* hash, unsigned char* signature) {
    mbedtls_pk_context pk;
    mbedtls_entropy_context entropy;
    mbedtls_ctr_drbg_context ctr_drbg;
    size_t sig_len = 0;

    mbedtls_pk_init(&pk);
    mbedtls_entropy_init(&entropy);
    mbedtls_ctr_drbg_init(&ctr_drbg);
    mbedtls_ctr_drbg_seed(&ctr_drbg, mbedtls_entropy_func, &entropy, NULL, 0);

    // Load key from NVS string with required RNG arguments for newer ESP32 cores
    mbedtls_pk_parse_key(&pk, (const unsigned char*)privateKey.c_str(), privateKey.length() + 1, NULL, 0, mbedtls_ctr_drbg_random, &ctr_drbg);
    
    // Sign hash (hash length is 32 bytes for SHA256)
    mbedtls_pk_sign(&pk, MBEDTLS_MD_SHA256, hash, 32, signature, 128, &sig_len, mbedtls_ctr_drbg_random, &ctr_drbg);

    mbedtls_pk_free(&pk);
    mbedtls_entropy_free(&entropy);
    mbedtls_ctr_drbg_free(&ctr_drbg);
    return sig_len;
}

void setup() {
    Serial.begin(115200);

    // Initialize onboard LED
    pinMode(STATUS_LED, OUTPUT);
    digitalWrite(STATUS_LED, LOW);  // LED off during setup
    
    // Fetch Key from NVS
    prefs.begin("security", true);
    ssid = prefs.getString("ssid", "");
    password = prefs.getString("password", "");
    mqtt_server = prefs.getString("mqtt_server", "");
    privateKey = prefs.getString("priv_key", "");
    prefs.end();

    if (privateKey == "") {
        Serial.println("Error: No key found in NVS! Run Provisioning first.");
        while(1);
    }

    // WiFi & MQTT Setup
    WiFi.begin(ssid.c_str(), password.c_str());
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nWiFi Connected!");
    
    // Sync Time via NTP
    configTime(0, 0, "pool.ntp.org", "time.nist.gov");
    Serial.print("Syncing time");
    while (time(nullptr) < 1000000000) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\nTime synchronized!");
    
    // Convert MQTT server string to C-string for the library
    client.setServer(mqtt_server.c_str(), 1883);
    client.setBufferSize(512);

    // All ready — LED solid on
    digitalWrite(STATUS_LED, HIGH);
    Serial.println("Status: LED ON — ready.");
}

void loop() {
    if (!client.connected()) {
        // Lost connection — LED off
        digitalWrite(STATUS_LED, LOW);

        if (client.connect("ESP32_Secure_Node")) {
            Serial.println("Connected to Gateway");
            // Reconnected — LED on
            digitalWrite(STATUS_LED, HIGH);
        }
    }
    client.loop();

    static unsigned long lastMsg = 0;
    if (millis() - lastMsg > 10000) { // Every 10 seconds
        lastMsg = millis();

        // Capture Data
        float temp = random(220, 280) / 10.0;
        unsigned long currentTimestamp = time(nullptr);
        
        // Use device timestamp to make hash unique
        String rawData = String("ESP32_01") + String(temp) + String(currentTimestamp);

        // Hash Data
        unsigned char hash[32];
        getSHA256(rawData.c_str(), hash);

        // Sign Hash
        unsigned char signature[128];
        size_t sigLen = signData(hash, signature);

        // Construct JSON Payload
        StaticJsonDocument<512> doc;
        doc["deviceId"] = "ESP32_01";
        doc["temperature"] = temp;
        doc["deviceTimestamp"] = currentTimestamp;
        
        // Convert binary hash/sig to hex strings
        char hashHex[65];
        for(int i=0; i<32; i++) sprintf(&hashHex[i*2], "%02x", hash[i]);
        doc["hash"] = hashHex;

        char sigHex[257];
        for(int i=0; i<sigLen; i++) sprintf(&sigHex[i*2], "%02x", signature[i]);
        doc["signature"] = sigHex;

        char buffer[512];
        serializeJson(doc, buffer);
        
        // Only publish and blink if still connected
        if (client.connected()) {
            client.publish("sensor/data", buffer);
            Serial.println("Signed packet sent to Gateway.");

            // Blink LED to indicate data transmission (3 visible blinks)
            for (int i = 0; i < 3; i++) {
                digitalWrite(STATUS_LED, LOW);
                delay(200);
                digitalWrite(STATUS_LED, HIGH);
                delay(200);
            }
        }
    }
}
