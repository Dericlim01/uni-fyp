#include <Preferences.h>

void setup() {
  Serial.begin(115200);
  Preferences prefs;
  
  // Open NVS namespace "security" in read/write mode
  prefs.begin("security", false);

  // Network Credentials
  const char* ssid = "";
  const char* password = "";
  const char* mqtt_server = ""; // Pi Gateway IP e.g. 192.168.1.XX
  prefs.putString("ssid", ssid);
  prefs.putString("password", password);
  prefs.putString("mqtt_server", mqtt_server);

  // ECC PRIVATE KEY (Keep the Newlines \n)
  const char* my_private_key = 
    "-----BEGIN EC PRIVATE KEY-----\n"
    "-----END EC PRIVATE KEY-----";

  prefs.putString("priv_key", my_private_key);
  
  Serial.println("Private Key securely stored in NVS.");
  prefs.end();
}

void loop() {}
