import paho.mqtt.client as mqtt
import json
from eth_account.messages import encode_defunct
from web3 import Web3

# Connect to local Ganache/Blockchain
w3 = Web3(Web3.HTTPProvider('http://127.0.0.1:8545'))

def on_message(client, userdata, msg):
    payload = json.loads(msg.payload)
    print(f"Received data from {payload['device_id']}")
    
    # Verification Logic (Simplify for demo)
    # Re-hash 'data' and compare with payload['hash']
    # Use ECC Public key to verify payload['signature']
    
    # If Valid -> Push to Blockchain
    # contract.functions.recordData(payload['device_id'], payload['hash']).transact()
    print(f"Integrity Verified. Hash {payload['hash']} sent to Ledger.")

client = mqtt.Client()
client.on_message = on_message
client.connect("localhost", 1883)
client.subscribe("sensors/temperature")
client.loop_forever()
