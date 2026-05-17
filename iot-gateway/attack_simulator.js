import mqtt from 'mqtt';
import crypto from 'crypto';
import readline from 'readline';

// ═══════════════════════════════════════════════════════════════════════════
//  CRYPTOGRAPHIC KEY SETUP
//  The ESP32 uses ECDSA with secp256r1 (prime256v1/P-256) via mbedTLS.
//  We mirror this exactly using Node.js built-in crypto module.
// ═══════════════════════════════════════════════════════════════════════════

// Attacker's own ECC keypair — represents an external malicious actor
// This key is NOT associated with any whitelisted device
const attackerKeyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'sec1',  format: 'pem' }
});
console.log("🔑 Attacker ECC Key Generated (secp256r1)");

// Compromised Device Key — represents a leaked/stolen key from ESP32_01
// In a real scenario, this would be the actual private key extracted from a device
const compromisedKeyPair = crypto.generateKeyPairSync('ec', {
    namedCurve: 'prime256v1',
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'sec1',  format: 'pem' }
});
console.log("🔑 Compromised Device ECC Key Generated (secp256r1)");

// ═══════════════════════════════════════════════════════════════════════════
//  CRYPTOGRAPHIC HELPER FUNCTIONS
//  Mirrors the ESP32 firmware's exact hashing and signing logic
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Compute SHA-256 hash matching the ESP32 firmware format.
 * ESP32 C++ logic: String("DEVICE_ID") + String(temp) + String(timestamp)
 * Arduino String(float) defaults to 2 decimal places.
 */
function computeHash(deviceId, temperature, timestamp) {
    const rawData = String(deviceId) + temperature.toFixed(2) + String(timestamp);
    return crypto.createHash('sha256').update(rawData).digest('hex');
}

/**
 * Sign a SHA-256 hash using ECDSA with secp256r1 (P-256).
 * Mirrors mbedtls_pk_sign() on the ESP32 with MBEDTLS_MD_SHA256.
 * Returns the DER-encoded signature as a hex string.
 */
function signHash(hashHex, privateKeyPem) {
    const hashBuffer = Buffer.from(hashHex, 'hex');
    const sign = crypto.createSign('SHA256');
    // We pass the raw hash bytes; createSign with SHA256 will hash again,
    // so we use the 'RSA-SHA256' workaround — but for ECDSA we need to
    // sign the pre-hashed data directly using the sign.update + sign.sign approach.
    // Actually, Node.js sign.sign() expects the data to be hashed internally.
    // To sign a pre-computed hash, we use crypto.sign() with null algorithm.
    const signature = crypto.sign(null, hashBuffer, {
        key: privateKeyPem,
        dsaEncoding: 'der'
    });
    return signature.toString('hex');
}

// ═══════════════════════════════════════════════════════════════════════════
//  MQTT CONNECTION & MENU
// ═══════════════════════════════════════════════════════════════════════════

const client = mqtt.connect('mqtt://localhost');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

client.on('connect', () => {
    console.log("\n😈 Attacker Connected to MQTT Broker");
    console.log("══════════════════════════════════════════════════");
    console.log("  Crypto Suite : ECDSA secp256r1 (P-256) + SHA-256");
    console.log("  Hash Format  : SHA256(deviceId + temp[2dp] + timestamp)");
    console.log("══════════════════════════════════════════════════\n");
    showMenu();
});

function showMenu() {
    console.log("\n╔══════════════════════════════════════════╗");
    console.log("║     IoT Attack Simulator (Crypto v2)     ║");
    console.log("╠══════════════════════════════════════════╣");
    console.log("║  1. Unauthorized Device (Spoofed ID)     ║");
    console.log("║  2. Replay Attack (Duplicate Payload)    ║");
    console.log("║  3. Data Tampering (Forged Reading)      ║");
    console.log("║  4. Exit                                 ║");
    console.log("╚══════════════════════════════════════════╝");

    rl.question("\n⚔️  Select attack vector (1-4): ", (answer) => {
        switch (answer.trim()) {
            case '1':
                simulateUnauthorizedDevice();
                setTimeout(showMenu, 1500);
                break;
            case '2':
                simulateReplayAttack();
                setTimeout(showMenu, 4000);
                break;
            case '3':
                simulateDataTampering();
                setTimeout(showMenu, 1500);
                break;
            case '4':
                console.log("👋 Exiting...");
                process.exit(0);
            default:
                console.log("❌ Invalid selection. Try again.");
                showMenu();
        }
    });
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTACK 1: UNAUTHORIZED DEVICE
//  ─────────────────────────────────────────────────────────────────────────
//  Scenario: An external attacker with their own valid ECC keypair
//  broadcasts data under a non-whitelisted device ID.
//
//  The hash and signature are cryptographically valid, but the device ID
//  "HACKER_DEVICE_99" is not registered on the smart contract whitelist.
//
//  Expected Gateway Response: Rejected/Unauthorized (whitelist check fails)
// ═══════════════════════════════════════════════════════════════════════════

function simulateUnauthorizedDevice() {
    console.log("\n⚔️  Attack 1: Unauthorized Device (Valid Crypto, Invalid Identity)");
    console.log("─".repeat(60));

    const deviceId = "HACKER_DEVICE_99";
    const temperature = 36.50;
    const timestamp = Math.floor(Date.now() / 1000);

    // Compute a real SHA-256 hash using the exact ESP32 string format
    const hash = computeHash(deviceId, temperature, timestamp);

    // Sign it with a real ECDSA private key (attacker's own key)
    const signature = signHash(hash, attackerKeyPair.privateKey);

    const payload = {
        deviceId: deviceId,
        temperature: temperature,
        deviceTimestamp: timestamp,
        hash: hash,
        signature: signature
    };

    client.publish('sensor/data', JSON.stringify(payload));

    console.log(`  📡 Device ID  : ${deviceId} (NOT whitelisted)`);
    console.log(`  🌡️  Temperature: ${temperature} °C`);
    console.log(`  🔒 Hash       : ${hash.substring(0, 32)}...`);
    console.log(`  ✍️  Signature  : ${signature.substring(0, 32)}... (${signature.length / 2} bytes, DER)`);
    console.log(`  📤 Payload sent.`);
    console.log(`  🎯 Expected   : Rejected/Unauthorized (whitelist check)`);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTACK 2: REPLAY ATTACK
//  ─────────────────────────────────────────────────────────────────────────
//  Scenario: An attacker intercepts a valid, previously-transmitted packet
//  and re-broadcasts it verbatim.
//
//  The hash is legitimate and the signature is valid, but the gateway's
//  MongoDB unique index on the 'hash' field will reject the duplicate.
//
//  First send  → Accepted (unique hash, new entry)
//  Second send → Rejected (duplicate hash, MongoDB unique constraint)
// ═══════════════════════════════════════════════════════════════════════════

function simulateReplayAttack() {
    console.log("\n⚔️  Attack 2: Replay Attack (Captured & Re-broadcast)");
    console.log("─".repeat(60));

    const deviceId = "ESP32_01";
    const temperature = 25.50;
    const timestamp = 1651234560; // Fixed past timestamp — simulates captured packet

    // Use the exact same hash format the ESP32 would produce
    const hash = computeHash(deviceId, temperature, timestamp);

    // Sign with compromised key (simulating a captured valid packet)
    const signature = signHash(hash, compromisedKeyPair.privateKey);

    const replayPayload = {
        deviceId: deviceId,
        temperature: temperature,
        deviceTimestamp: timestamp,
        hash: hash,
        signature: signature
    };

    // First transmission — should succeed if hash is fresh in DB
    client.publish('sensor/data', JSON.stringify(replayPayload));
    console.log(`  📡 Device ID  : ${deviceId}`);
    console.log(`  🔒 Hash       : ${hash.substring(0, 32)}...`);
    console.log(`  📤 [1st Send] Payload transmitted.`);
    console.log(`  🎯 Expected   : Verified (if hash is new in DB)`);

    // Second transmission — exact duplicate, should be caught
    setTimeout(() => {
        client.publish('sensor/data', JSON.stringify(replayPayload));
        console.log(`\n  📤 [2nd Send] Identical payload re-transmitted.`);
        console.log(`  🎯 Expected   : ⚠️ Duplicate detected (MongoDB unique index on hash)`);
    }, 2500);
}

// ═══════════════════════════════════════════════════════════════════════════
//  ATTACK 3: DATA TAMPERING
//  ─────────────────────────────────────────────────────────────────────────
//  Scenario: An attacker who has obtained the private key of a legitimate
//  whitelisted device (ESP32_01) sends falsified sensor readings.
//
//  The attacker crafts a malicious temperature value (999.9 °C), computes
//  a valid SHA-256 hash over the tampered payload using the EXACT same
//  string concatenation format as the ESP32 firmware, and signs it with
//  the compromised device key.
//
//  This attack produces a cryptographically perfect payload — valid hash,
//  valid signature, valid device ID — demonstrating that hash integrity
//  alone does NOT protect against insider/compromised-key threats.
//
//  Expected Gateway Response: Verified (current system cannot detect this)
//  This highlights the need for additional defenses like anomaly detection,
//  key rotation, or hardware-bound keys (e.g., secure elements).
// ═══════════════════════════════════════════════════════════════════════════

function simulateDataTampering() {
    console.log("\n⚔️  Attack 3: Data Tampering (Compromised Device Key)");
    console.log("─".repeat(60));

    const deviceId = "ESP32_01"; // Valid, whitelisted device
    const maliciousTemp = 999.90; // Falsified dangerous reading
    const timestamp = Math.floor(Date.now() / 1000);

    // Compute a VALID hash of the TAMPERED data using ESP32's exact format
    // This is the key insight: the hash matches the payload, so hash
    // integrity check passes, but the data itself is fabricated
    const hash = computeHash(deviceId, maliciousTemp, timestamp);

    // Sign with the compromised device key — produces a valid ECDSA signature
    const signature = signHash(hash, compromisedKeyPair.privateKey);

    const payload = {
        deviceId: deviceId,
        temperature: maliciousTemp,
        deviceTimestamp: timestamp,
        hash: hash,
        signature: signature
    };

    client.publish('sensor/data', JSON.stringify(payload));

    console.log(`  📡 Device ID  : ${deviceId} (whitelisted ✅)`);
    console.log(`  🌡️  Temperature: ${maliciousTemp} °C (FALSIFIED ❌)`);
    console.log(`  🔒 Hash       : ${hash.substring(0, 32)}... (matches tampered data ✅)`);
    console.log(`  ✍️  Signature  : ${signature.substring(0, 32)}... (valid ECDSA ✅)`);
    console.log(`  📤 Payload sent.`);
    console.log(`  🎯 Expected   : Verified ⚠️ (system cannot detect compromised key)`);
    console.log(`  💡 Mitigation : Signature verification against registered public key,`);
    console.log(`                  anomaly detection, or hardware-bound secure elements.`);
}
