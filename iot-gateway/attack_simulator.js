import mqtt from 'mqtt';
import crypto from 'crypto';
import readline from 'readline';

// Connect to the MQTT broker
const client = mqtt.connect('mqtt://localhost');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

client.on('connect', () => {
    console.log("😈 Attacker Connected to MQTT Broker");
    showMenu();
});

function showMenu() {
    console.log("\n--- IoT Attack Simulator ---");
    console.log("1. Simulate Unauthorized Device (Spoofing Device ID)");
    console.log("2. Simulate Replay Attack");
    console.log("3. Simulate Data Tampering (Signature Bypass)");
    console.log("4. Exit");

    rl.question("Select an attack to simulate (1-4): ", (answer) => {
        switch (answer.trim()) {
            case '1':
                simulateUnauthorizedDevice();
                setTimeout(showMenu, 1000);
                break;
            case '2':
                simulateReplayAttack();
                setTimeout(showMenu, 3000);
                break;
            case '3':
                simulateDataSpoofing();
                setTimeout(showMenu, 1000);
                break;
            case '4':
                console.log("Exiting...");
                process.exit(0);
            default:
                console.log("Invalid selection. Try again.");
                showMenu();
        }
    });
}

function simulateUnauthorizedDevice() {
    console.log("⚔️  Initiating Unauthorized Device Attack...");

    const fakeData = {
        deviceId: "HACKER_DEVICE_99", // Not whitelisted on smart contract
        temperature: 100.0,
        deviceTimestamp: Math.floor(Date.now() / 1000),
        hash: crypto.randomBytes(32).toString('hex'),
        signature: crypto.randomBytes(64).toString('hex')
    };

    client.publish('sensor/data', JSON.stringify(fakeData));
    console.log(`📤 Sent spoofed payload from ${fakeData.deviceId}`);
}

// Attack 2: Replaying an exact copy of a previously valid message
function simulateReplayAttack() {
    console.log("⚔️  Initiating Replay Attack...");

    // This should match a payload that was already sent successfully.
    // The gateway will block this because MongoDB has a unique index on 'hash'.
    const replayData = {
        deviceId: "ESP32_01",
        temperature: 25.5,
        deviceTimestamp: 1651234560,
        hash: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", // A static hash
        signature: "1234567890abcdef"
    };

    client.publish('sensor/data', JSON.stringify(replayData));
    console.log("📤 Sent replay payload (1st time)");

    setTimeout(() => {
        client.publish('sensor/data', JSON.stringify(replayData));
        console.log("📤 Sent replay payload (2nd time) - Gateway should detect as duplicate!");
    }, 2000);
}

// Attack 3: Tampering with data using a valid Device ID
// Notice how the gateway and smart contract don't verify the cryptographic signature!
function simulateDataSpoofing() {
    console.log("⚔️  Initiating Data Spoofing Attack...");

    const maliciousData = {
        deviceId: "ESP32_01", // Valid, whitelisted device
        temperature: 999.9, // Fake, malicious data
        deviceTimestamp: Math.floor(Date.now() / 1000),
        hash: crypto.randomBytes(32).toString('hex'), // Random fake hash
        signature: crypto.randomBytes(64).toString('hex') // Random fake signature
    };

    client.publish('sensor/data', JSON.stringify(maliciousData));
    console.log(`📤 Sent tampered data: ${maliciousData.temperature} °C for ${maliciousData.deviceId}`);
    console.log("🚨 The system will likely accept this because signatures aren't verified!");
}
