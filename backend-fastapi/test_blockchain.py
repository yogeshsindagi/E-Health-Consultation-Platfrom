import os
import sys
from web3 import Web3
from dotenv import load_dotenv

# Ensure we can import from local modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from blockchain_utils import blockchain_client, BlockchainClient

def test_blockchain_integration():
    print("Starting Blockchain Integration Test...")
    
    # 1. Check Connection
    if not blockchain_client.w3.is_connected():
        print("[ERROR] Failed to connect to Web3 Provider.")
        return
    print(f"[OK] Connected to Web3 Provider: {blockchain_client.w3.provider}")
    
    # 2. Check Admin Account
    if not blockchain_client.account:
        print("[ERROR] Admin account not loaded.")
        return
    print(f"[OK] Admin Account: {blockchain_client.account.address}")
    
    # 2b. Check Balance
    balance = blockchain_client.w3.eth.get_balance(blockchain_client.account.address)
    print(f"[INFO] Admin Balance: {blockchain_client.w3.from_wei(balance, 'ether')} ETH")
    if balance == 0:
        print("[ERROR] Admin account has 0 ETH. Please check if Ganache seed matches or update .env.")
        return
    
    # 3. Check/Deploy Contract
    if not blockchain_client.contract:
        print("[WARN] Contract not loaded. Attempting deployment...")
        try:
            address = blockchain_client.deploy_contract()
            print(f"[OK] Contract Deployed at: {address}")
            
            # Update .env with the new address
            env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env')
            with open(env_path, 'r') as f:
                lines = f.readlines()
            
            new_lines = []
            param_found = False
            for line in lines:
                if line.startswith("CONTRACT_ADDRESS="):
                    new_lines.append(f"CONTRACT_ADDRESS={address}\n")
                    param_found = True
                else:
                    new_lines.append(line)
            
            if not param_found:
                new_lines.append(f"\nCONTRACT_ADDRESS={address}\n")
                
            with open(env_path, 'w') as f:
                f.writelines(new_lines)
            print("[OK] Updated .env with CONTRACT_ADDRESS")
            
        except Exception as e:
            print(f"[ERROR] Deployment failed: {repr(e)}")
            return
    else:
        print(f"[OK] Contract loaded at: {blockchain_client.contract.address}")

    # 4. Test Write (Log Access)
    print("\nTesting Log Access...")
    patient = "0x9931e0cda91039f431044586e0cc88afd975bb3a4bf12bc4b73f1b1b10058029" # Dummy address
    doctor = "0x987025b5e054b983340c7273546c6f4279fbcacd94017ca68121023827db8471" # Dummy address
    resource_id = "test_resource_001"
    
    try:
        tx_hash = blockchain_client.log_access(patient, doctor, resource_id)
        if tx_hash:
            print(f"[OK] Access Logged. TX Hash: {tx_hash}")
        else:
            print("[ERROR] Failed to log access (no TX hash returned).")
    except Exception as e:
        print(f"[ERROR] Failed to log access: {e}")

    # 5. Test Read (Check Access)
    # Note: The smart contract logic for checkAccess might depend on specific implementation
    # For now we just verify we can call it without error
    print("\nTesting Check Access...")
    try:
        has_access = blockchain_client.check_access(patient, doctor)
        print(f"[OK] Check Access Result: {has_access}")
    except Exception as e:
        print(f"[ERROR] Failed to check access: {e}")

if __name__ == "__main__":
    test_blockchain_integration()
