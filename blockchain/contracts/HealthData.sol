// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract HealthData {
    address public owner;

    // Mapping from Patient Address -> Doctor Address -> Is Allowed
    mapping(address => mapping(address => bool)) private accessList;

    event LogAccess(
        address indexed patient,
        address indexed provider,
        uint256 timestamp,
        string resourceId
    );

    event AccessGranted(address indexed patient, address indexed doctor);
    event AccessRevoked(address indexed patient, address indexed doctor);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner can call this function");
        _;
    }

    constructor() {
        owner = msg.sender;
    }

    // Patient grants access to a doctor
    function grantAccess(address doctor) public {
        accessList[msg.sender][doctor] = true;
        emit AccessGranted(msg.sender, doctor);
    }

    // Patient revokes access from a doctor
    function revokeAccess(address doctor) public {
        accessList[msg.sender][doctor] = false;
        emit AccessRevoked(msg.sender, doctor);
    }

    // Check if a doctor has access to a patient's data
    function checkAccess(address patient, address doctor) public view returns (bool) {
        return accessList[patient][doctor];
    }

    // Log data access - Only callable by the Backend Server (Owner)
    // The backend verifies the checkAccess logic via view call first, 
    // then calls this to write the log to the blockchain.
    function logDataAccess(
        address patient, 
        address provider, 
        string memory resourceId
    ) public onlyOwner {
        emit LogAccess(patient, provider, block.timestamp, resourceId);
    }
}
