#include <WiFi.h>
#include <PubSubClient.h>
#include <ArduinoJson.h>
#include <Preferences.h>
#include "mbedtls/md.h"
#include "mbedtls/pk.h"
#include "mbedtls/entropy.h"
#include "mbedtls/ctr_drbg.h"

// Network Config
// const char* ssid = "YOUR_WIFI";
// const char* password = "YOUR_PASSWORD";
// const char* mqtt_server = ""; // Pi Gateway IP e.g. 192.168.1.XX

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

    // Load key from NVS string
    mbedtls_pk_parse_key(&pk, (const unsigned char*)privateKey.c_str(), privateKey.length() + 1, NULL, 0);
    
    mbedtls_pk_sign(&pk, MBEDTLS_MD_SHA256, hash, 0, signature, &sig_len, mbedtls_ctr_drbg_random, &ctr_drbg);

    mbedtls_pk_free(&pk);
    mbedtls_entropy_free(&entropy);
    mbedtls_ctr_drbg_free(&ctr_drbg);
    return sig_len;
}

void setup() {
    Serial.begin(115200);
    
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
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) delay(500);
    client.setServer(mqtt_server, 1883);
}

void loop() {
    if (!client.connected()) {
        if (client.connect("ESP32_Secure_Node")) {
            Serial.println("Connected to Gateway");
        }
    }
    client.loop();

    static unsigned long lastMsg = 0;
    if (millis() - lastMsg > 10000) { // Every 10 seconds
        lastMsg = millis();

        // Capture Data
        float temp = random(220, 280) / 10.0;
        String rawData = String(temp);

        // Hash Data
        unsigned char hash[32];
        getSHA256(rawData.c_str(), hash);

        // Sign Hash
        unsigned char signature[128];
        size_t sigLen = signData(hash, signature);

        // Construct JSON Payload
        StaticJsonDocument<512> doc;
        doc["device_id"] = "ESP32_01";
        doc["data"] = temp;
        
        // Convert binary hash/sig to hex strings for JSON
        char hashHex[65];
        for(int i=0; i<32; i++) sprintf(&hashHex[i*2], "%02x", hash[i]);
        doc["hash"] = hashHex;

        char sigHex[257];
        for(int i=0; i<sigLen; i++) sprintf(&sigHex[i*2], "%02x", signature[i]);
        doc["signature"] = sigHex;

        char buffer[512];
        serializeJson(doc, buffer);
        
        // Publish
        client.publish("sensors/temperature", buffer);
        Serial.println("Signed packet sent to Gateway.");
    }
}
