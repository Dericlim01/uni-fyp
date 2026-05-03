// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HybridSecurity {
    mapping(string => string) private sensorHashes;
    mapping(string => bool) public whitelistedDevices;
    address public admin;

    constructor() {
        admin = msg.sender;
    }

    // Only allow specific devices to be added
    function authorizeDevice(string memory _deviceId) public {
        require(msg.sender == admin, "Only admin can authorize");
        whitelistedDevices[_deviceId] = true;
    }

    // Store the hash if the device is whitelisted
    function storeHash(string memory _deviceId, string memory _hash) public {
        require(whitelistedDevices[_deviceId], "Device not whitelisted!");
        sensorHashes[_deviceId] = _hash;
    }

    // Retrieve the hash for verification
    function getLatestHash(string memory _deviceId) public view returns (string memory) {
        return sensorHashes[_deviceId];
    }
}
