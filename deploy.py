from web3 import Web3
from solcx import compile_standard,install_solc
import json
from dotenv import load_dotenv
import os
install_solc("0.8.17")

load_dotenv()
MYADDRESS = Web3.to_checksum_address(os.getenv("METAMASK"))
SECRETCODE = os.getenv("SECRETKEY")

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
abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

def depoly_contract():
    #creating the contract
    CredChain=w3.eth.contract(abi=abi,bytecode=bytecode)
    print("Contract Created")

    balance = w3.eth.get_balance(MYADDRESS)
    print("Balance:", w3.from_wei(balance, "ether"), "DEV")

    #fetching nonce(latest transaction) of our wallet
    nonce=w3.eth.get_transaction_count(MYADDRESS,"pending")

    transaction = CredChain.constructor().build_transaction({
        "chainId": chainid,
        "from": MYADDRESS,
        "nonce": nonce,
        "gas": 7000000,
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
    return transactionreceipt

transactionreceipt=depoly_contract()     #function call for deploy contract

smaddress="0xA5c04406A334Efadd09c9dab95a5faff56c360bb"
address=transactionreceipt.contractAddress
print("Smart Contract Address: ",address)
#Fetching Smart Contract Address
testverificationcontract=w3.eth.contract(address=transactionreceipt.contractAddress, abi=abi)
print(testverificationcontract.functions.isVerified("0xCEaaa7a684f5FBBDF41B865e2945142340D82029").call())

balance = w3.eth.get_balance(MYADDRESS)
print("Balance:", w3.from_wei(balance, "ether"), "DEV")

#fetching nonce(latest transaction) of our wallet
nonce=w3.eth.get_transaction_count(MYADDRESS,"pending")

verifyaddress_transaction=testverificationcontract.functions.setVerified(MYADDRESS).build_transaction(       #call function by building a transaction
    {"chainId":chainid,
     "from": MYADDRESS,
     "nonce":nonce,
     "gas": 7000000,
     "gasPrice": w3.to_wei("20", "gwei")}
)
signedverifyaddress_transaction=w3.eth.account.sign_transaction(verifyaddress_transaction,private_key=SECRETCODE)  #sign that transaction
verifyaddress_transactionhash=w3.eth.send_raw_transaction(signedverifyaddress_transaction.raw_transaction)    #generate transcation hash
print("Transcation hash:", verifyaddress_transactionhash.hex())
verifyaddress_transactionreceipt=w3.eth.wait_for_transaction_receipt(verifyaddress_transactionhash)   #fetch the transaction receipt

print(testverificationcontract.functions.isVerified(MYADDRESS).call())