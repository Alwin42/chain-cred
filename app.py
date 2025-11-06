import requests
import os
from dotenv import load_dotenv
from pathlib import Path
from flask import Flask,jsonify,render_template
from web3 import Web3

load_dotenv()
MYADDRESS = Web3.to_checksum_address(os.getenv("METAMASK"))
SECRETCODE = os.getenv("SECRETKEY")

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

def callfeature(transactionreceipt,abi):
    balance = w3.eth.get_balance(MYADDRESS)
    print("Balance:", w3.from_wei(balance, "ether"), "DEV")

    testverificationcontract=w3.eth.contract(address=transactionreceipt.contractAddress, abi=abi)
    
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

