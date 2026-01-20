from blockchain_utils import blockchain_client
try:
    addr = blockchain_client.deploy_contract()
    print(f"DEPLOYED_ADDR:{addr}")
    with open("contract_address.txt", "w") as f:
        f.write(str(addr))
except Exception as e:
    print(f"ERROR:{e}")
