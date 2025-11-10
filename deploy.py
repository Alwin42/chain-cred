from web3 import Web3
from solcx import compile_standard,install_solc
import json
from dotenv import load_dotenv
import os
install_solc("0.8.17")

load_dotenv()
MYADDRESS = Web3.to_checksum_address(os.getenv("METAMASK"))
SECRETCODE = os.getenv("SECRETKEY")

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

def depoly_contract():
    #Read the Smart Contract
    with open("./CredChain.sol","r") as file:
        chaincredfile=file.read()

    #complie the smart contract - default lines
    compiledsol = compile_standard(
        {
            "language":"Solidity",
            "sources":{"chaincred.sol":{"content":chaincredfile}},
            "settings":{
                "outputSelection":  {
                    "*":{"*": ["abi","metadata","evm.bytecode","evm.sourceMap"]}
                }
            }
        },solc_version="0.8.17"
    )

    #move the compiled code into a new file 'compiledcode.json'
    with open("./compiledcccode.json","w") as file:
        json.dump(compiledsol,file)

    #fetching bytecode from the compiled Smart Contract
    bytecode=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["evm"]["bytecode"]["object"]

    #get abi from the compiled Smart Contract
    global abi
    abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]



    #creating the contract
    CredChain=w3.eth.contract(abi=abi,bytecode=bytecode)
    print("Contract Created")

    balance = w3.eth.get_balance(MYADDRESS)
    print("Balance:", w3.from_wei(balance, "ether"), "DEV")

    #fetching nonce(latest transaction) of our wallet
    nonce=w3.eth.get_transaction_count(MYADDRESS,"pending")

    gas_estimate = CredChain.constructor().estimate_gas({"from": MYADDRESS})
    print("Gas estimate:", gas_estimate)
    
    transaction = CredChain.constructor().build_transaction({
        "chainId": chainid,
        "from": MYADDRESS,
        "nonce": nonce,
        "gas": gas_estimate + 300000,   # small buffer,
        "gasPrice": w3.to_wei("20", "gwei")
    })

    #Signing a transaction
    signedtransaction=w3.eth.account.sign_transaction(transaction,private_key=SECRETCODE)

    #Sending a Transaction
    transactionhash=w3.eth.send_raw_transaction(signedtransaction.raw_transaction)
    print(transactionhash)
    transactionreceipt=w3.eth.wait_for_transaction_receipt(transactionhash)
    print("Contract Deployed")
    print("Transction Receipt: ",transactionreceipt)
    if transactionreceipt["status"] == 0:
        print("❌ Deployment failed. Check constructor or imports.")
    else:
        print("✅ Deployment successful!")
    address=transactionreceipt.contractAddress
    print("Smart Contract Address: ",address)
    return address,abi


if __name__ == "__main__":
    depoly_contract() 
