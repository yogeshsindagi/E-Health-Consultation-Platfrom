import os
import json
from web3 import Web3
from eth_account import Account
from solcx import compile_standard, install_solc
from dotenv import load_dotenv

load_dotenv()

# Configuration
WEB3_PROVIDER = os.getenv("WEB3_PROVIDER", "http://127.0.0.1:8545")
ADMIN_PRIVATE_KEY = os.getenv("ADMIN_PRIVATE_KEY") # Must be set in .env
CONTRACT_ADDRESS = os.getenv("CONTRACT_ADDRESS")

# Initialize Web3
w3 = Web3(Web3.HTTPProvider(WEB3_PROVIDER))

class BlockchainClient:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(BlockchainClient, cls).__new__(cls)
            cls._instance._init_client()
        return cls._instance

    def _init_client(self):
        self.w3 = w3
        self.account = None
        self.contract = None
        
        if ADMIN_PRIVATE_KEY:
            self.account = Account.from_key(ADMIN_PRIVATE_KEY)
            print(f"Loaded Admin Wallet: {self.account.address}")
        else:
            print("WARNING: ADMIN_PRIVATE_KEY not set. Blockchain writes will fail.")

        self._compile_and_load_contract()

    def _compile_and_load_contract(self):
        # Path to solidity file
        base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        contract_path = os.path.join(base_path, "blockchain", "contracts", "HealthData.sol")
        
        if not os.path.exists(contract_path):
             # Fallback if running from root or strict structure not found
             contract_path = os.path.abspath("blockchain/contracts/HealthData.sol")

        if not os.path.exists(contract_path):
            print(f"Error: Contract not found at {contract_path}")
            return

        with open(contract_path, "r") as f:
            source = f.read()

        # Install specific solc version if needed
        try:
            install_solc("0.8.0")
        except Exception:
            pass # might be already installed

        compiled_sol = compile_standard(
            {
                "language": "Solidity",
                "sources": {"HealthData.sol": {"content": source}},
                "settings": {
                    "outputSelection": {
                        "*": {
                            "*": ["abi", "metadata", "evm.bytecode", "evm.sourceMap"]
                        }
                    }
                },
            },
            solc_version="0.8.0",
        )

        self.abi = compiled_sol["contracts"]["HealthData.sol"]["HealthData"]["abi"]
        self.bytecode = compiled_sol["contracts"]["HealthData.sol"]["HealthData"]["evm"]["bytecode"]["object"]

        if CONTRACT_ADDRESS:
            self.contract = self.w3.eth.contract(address=CONTRACT_ADDRESS, abi=self.abi)
            print(f"Loaded Contract at {CONTRACT_ADDRESS}")
        else:
            print("WARNING: CONTRACT_ADDRESS not set. You valid read/writes require a deployed contract.")

    def deploy_contract(self):
        """Helper to deploy contract if not exists"""
        if not self.account:
            raise Exception("Admin account not loaded")
            
        Contract = self.w3.eth.contract(abi=self.abi, bytecode=self.bytecode)
        
        # Build transaction
        construct_txn_call = Contract.constructor().build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
        })
        
        estimated_gas = self.w3.eth.estimate_gas(construct_txn_call)
        print(f"Estimated Gas for deployment: {estimated_gas}")

        construct_txn = Contract.constructor().build_transaction({
            'from': self.account.address,
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
            'gas': int(estimated_gas * 1.2), # Add buffer
            'gasPrice': self.w3.eth.gas_price
        })

        signed_txn = self.w3.eth.account.sign_transaction(construct_txn, private_key=ADMIN_PRIVATE_KEY)
        tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
        tx_receipt = self.w3.eth.wait_for_transaction_receipt(tx_hash)
        
        print(f"Contract Deployed at: {tx_receipt.contractAddress}")
        self.contract = self.w3.eth.contract(address=tx_receipt.contractAddress, abi=self.abi)
        return tx_receipt.contractAddress

    def check_access(self, patient_address: str, doctor_address: str) -> bool:
        print(f"[Check] Checking Blockchain Access: {patient_address} -> {doctor_address}")
        if not self.contract:
            return False
        try:
            return self.contract.functions.checkAccess(patient_address, doctor_address).call()
        except Exception as e:
            print(f"Blockchain checkAccess failed: {e}")
            return False

    def log_access(self, patient_address: str, doctor_address: str, resource_id: str):
        if not self.contract or not self.account:
            print("Cannot log access: Contract or Account missing")
            return

        try:
            txn = self.contract.functions.logDataAccess(
                patient_address, doctor_address, resource_id
            ).build_transaction({
                'from': self.account.address,
                'nonce': self.w3.eth.get_transaction_count(self.account.address),
                'gas': 200000,
                'gasPrice': self.w3.eth.gas_price
            })
            
            signed_txn = self.w3.eth.account.sign_transaction(txn, private_key=ADMIN_PRIVATE_KEY)
            tx_hash = self.w3.eth.send_raw_transaction(signed_txn.raw_transaction)
            # We don't wait for receipt to avoid blocking response too long, or maybe we should?
            # for logs, async is better.
            print(f"Access Logged TX: {tx_hash.hex()}")
            return tx_hash.hex()
        except Exception as e:
            print(f"Blockchain logAccess failed: {e}")

blockchain_client = BlockchainClient()
