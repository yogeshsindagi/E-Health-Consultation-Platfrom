export const CONTRACT_ADDRESS = "0x9Db681A2C3193a0D50d29AeA1198874A4BF0eC76"; // Update after deployment

export const HEALTH_DATA_ABI = [
    "function grantAccess(address doctor) public",
    "function revokeAccess(address doctor) public",
    "function checkAccess(address patient, address doctor) public view returns (bool)",
    "event LogAccess(address indexed patient, address indexed provider, uint256 timestamp, string resourceId)",
    "event AccessGranted(address indexed patient, address indexed doctor)",
    "event AccessRevoked(address indexed patient, address indexed doctor)"
];
