import requests
import os
import json
import hashlib
from dotenv import load_dotenv
from pathlib import Path
from flask import Flask,jsonify,render_template,request
from flask_cors import CORS
from web3 import Web3
from deploy import depoly_contract

load_dotenv()
MYADDRESS = Web3.to_checksum_address(os.getenv("METAMASK"))
SECRETCODE = os.getenv("SECRETKEY")

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

app = Flask(__name__)
CORS(app) 

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/client')
def clientpage():
    return render_template('client.html')

#-----------------------------------------------------------SMART CONTRACT DEPLOYMENT-----------------------------------------------------------
def deploysmartcontract():                                  #deployment function call
    print("Contract Deployment Function Triggered")
    '''contractaddress,abi=depoly_contract()    '''         
    global contract

    with open("./compiledcccode.json","r") as file:
        compiledsol = json.load(file) 
    abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]
    contract=w3.eth.contract(address="0xa1450595DB224Db098c1324388bf541ad725E1Ea", abi=abi)
    
    '''global contract
    contract='0x7B87314c1975ba20ff93b931f3aEA7779098fA13'   '''

#-----------------------------------------------------------JSON FILES-----------------------------------------------------------
BUILDERS_FILE = "builders.json"
def load_builders():
    global KNOWN_BUILDERS
    if os.path.exists(BUILDERS_FILE):
        with open(BUILDERS_FILE, "r") as f:
            KNOWN_BUILDERS = set(json.load(f))
    else:
        KNOWN_BUILDERS = set()

def save_builders():
    with open(BUILDERS_FILE, "w") as f:
        json.dump(list(KNOWN_BUILDERS), f)
load_builders()


PENDING_FILE = "pending.json"
def load_pending():
    global PENDING_PROJECTS
    if os.path.exists(PENDING_FILE):
        with open(PENDING_FILE, "r") as f:
            PENDING_PROJECTS = json.load(f)
    else:
        PENDING_PROJECTS = []

def save_pending():
    with open(PENDING_FILE, "w") as f:
        json.dump(PENDING_PROJECTS, f, indent=2)


#-----------------------------------------------------------CALL FUNCTIONS-----------------------------------------------------------
def callfeature(feature):
    print("Function Call Recieved!!")
    balance = w3.eth.get_balance(MYADDRESS)
    print("Balance:", w3.from_wei(balance, "ether"), "DEV")

    
    #fetching nonce(latest transaction) of our wallet
    nonce=w3.eth.get_transaction_count(MYADDRESS,"pending")

    feature_transaction=feature.build_transaction(       #call function by building a transaction
        {"chainId":chainid,
        "from": MYADDRESS,
        "nonce":nonce,
        "gas": 7000000,
        "gasPrice": w3.to_wei("20", "gwei")}
    )
    
    signedfeature_transaction=w3.eth.account.sign_transaction(feature_transaction,private_key=SECRETCODE)  #sign that transaction
    feature_transactionhash=w3.eth.send_raw_transaction(signedfeature_transaction.raw_transaction)    #generate transcation hash
    print("Transcation hash:", feature_transactionhash.hex())

    feature_transactionreceipt=w3.eth.wait_for_transaction_receipt(feature_transactionhash)   #fetch the transaction receipt
    return feature_transactionreceipt


def owner_account():
    return w3.eth.account.from_key(SECRETCODE)

#-----------------------------------------------------------VERIFY USER-----------------------------------------------------------
@app.route("/verify_user", methods=["POST"])
def verify_user():
    print("User Verification Function Triggered")
    """
    Request JSON:
    { "wallet": "0x..", "profile_link": "https://github.com/..." }
    """
    data = request.get_json()
    wallet = data.get("wallet")
    print(wallet)
    link = data.get("profile_link")
    print(link)
    deploysmartcontract()
    if not wallet or not link:
        return jsonify({"error": "wallet and profile_link required"}), 400

    # Quick validation: link reachable (simple MVP)
    try:
        r = requests.get(link, timeout=8)
        if r.status_code != 200:
            return jsonify({"verified": False, "reason": "profile link unreachable"}), 400
    except Exception as e:
        return jsonify({"verified": False, "reason": str(e)}), 400

    # mark verified on-chain
    try:
        setverified = contract.functions.setUserVerified(Web3.to_checksum_address(wallet), True)
        receipt = callfeature(setverified)
        print("Github user verification: ",receipt)
        return jsonify({"verified": True, "tx": receipt.transactionHash.hex()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

#-----------------------------------------------------------ADD PROJECT-----------------------------------------------------------
@app.route("/submit_project", methods=["POST"])
def submit_project():
    print("Submit Project Function Triggered")
    """
    JSON:
    { "wallet":"0x..", "link":"https://raw.githubusercontent.com/.. or https://github.com/.. " }
    """
    data = request.get_json()
    wallet = data.get("wallet")
    client = data.get("client")
    link = data.get("link")
    deploysmartcontract()
    if not wallet or not link:
        return jsonify({"error":"wallet and link required"}), 400

    # Normalize GitHub link
    if "github.com" in link and "raw.githubusercontent.com" not in link:
        link = link.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    # Fetch content (for repo, fetching raw or zip is tricky; simple GET for demo)
    try:
        r = requests.get(link, timeout=12)
        if r.status_code != 200:
            return jsonify({"error":"provided link not reachable"}), 400
        content = r.content
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Compute SHA-256 hex
    h = hashlib.sha256(content).hexdigest()

    # Call addProject
    try:
        feature = contract.functions.addProject(Web3.to_checksum_address(wallet),Web3.to_checksum_address(client), h, link)
        receipt = callfeature(feature)
        print("Github user verification: ", receipt)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Determine index (getProjectCount returns number of projects)
    try:
        count = contract.functions.getProjectCount(Web3.to_checksum_address(wallet)).call()
        index = count - 1
    except Exception:
        index = None

    load_pending()  # Load existing pending projects
    PENDING_PROJECTS.append({"user": wallet, "link": link, "hash": h, "index": index})
    save_pending()  # Save updated pending list
    KNOWN_BUILDERS.add(wallet)
    save_builders()
    return jsonify({"status": "added", "tx": receipt.transactionHash.hex(), "index": index})


#-----------------------------------------------------------VERIFY PROJECT-----------------------------------------------------------
@app.route("/run_verify_pending", methods=["POST"])
def run_verify_pending():
    print("Project Verification Function Triggered")
    load_pending()  # Load current pending list
    print("Current pending projects:", PENDING_PROJECTS)
    print("\n")

    results = []
    to_remove = []
    for i, p in enumerate(list(PENDING_PROJECTS)):
        try:
            r = requests.get(p["link"], timeout=12)
            if r.status_code == 200:
                new_hash = hashlib.sha256(r.content).hexdigest()
                print("Rechecking project:", p["link"])
                print("Stored hash:", p["hash"])
                print("Fetched new hash:", new_hash)
                print("Match:", new_hash == p["hash"])
                verified = (new_hash == p["hash"])
                if verified:
                    fn = contract.functions.verifyProject(Web3.to_checksum_address(p["user"]), p["index"], True)
                    receipt = callfeature(fn)
                    results.append({
                        "user": p["user"],
                        "index": p["index"],
                        "verified": True,
                        "tx": receipt.transactionHash.hex()
                    })
                    to_remove.append(i)
                else:
                    results.append({"user": p["user"], "index": p["index"], "verified": False})
            else:
                results.append({"user": p["user"], "index": p["index"], "error": "link unreachable"})
        except Exception as e:
            results.append({"user": p["user"], "index": p["index"], "error": str(e)})

    for idx in sorted(to_remove, reverse=True):
        PENDING_PROJECTS.pop(idx)

    save_pending()  # Save updated list after verification

    return jsonify({"results": results})


#-----------------------------------------------------------MINT BADGES-----------------------------------------------------------
@app.route("/mint_manual", methods=["POST"])
def mint_manual():
    # Admin manual badge mint
    data = request.get_json()
    wallet = data.get("wallet")
    uri = data.get("uri")
    if not wallet or not uri:
        return jsonify({"error":"wallet and uri required"}), 400
    try:
        fn = contract.functions.checkAndMintBadge(Web3.to_checksum_address(wallet))
        receipt = callfeature(fn)
        return jsonify({"tx": receipt.transactionHash.hex()})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


#-----------------------------------------------------------CLIENT PROJECTS-----------------------------------------------------------
@app.route("/get_projects_for_client/<wallet>")
def get_projects_for_client(wallet):
    deploysmartcontract()
    projects = []
    # Iterate through all known builders (or fetch from DB if stored)
    for builder in KNOWN_BUILDERS:  # you can track builders in a set
        count = contract.functions.getProjectCount(Web3.to_checksum_address(builder)).call()
        for i in range(count):
            p = contract.functions.getProject(Web3.to_checksum_address(builder), i).call()
            if Web3.to_checksum_address(p[0]) == Web3.to_checksum_address(wallet):  # client matches
                projects.append({
                    "builder": builder,
                    "link": p[2],
                    "verified": p[3]
                })
    return jsonify(projects)


#-----------------------------------------------------------REVIEW-----------------------------------------------------------
@app.route("/submit_review", methods=["POST"])
def submit_review():
    data = request.get_json()
    freelancer = data.get("freelancer")
    project_index = int(data.get("project_index"))
    rating = int(data.get("rating"))
    comment_hash = data.get("comment_hash")  # optional IPFS comment link

    deploysmartcontract()

    fn = contract.functions.submitReview(
        Web3.to_checksum_address(freelancer),
        project_index,
        rating,
        comment_hash
    )
    receipt = callfeature(fn)
    return jsonify({"tx": receipt.transactionHash.hex()})

#-----------------------------------------------------------GET PROJECT WITH REVIEWS-----------------------------------------------------------
@app.route("/get_project_with_reviews", methods=["GET"])
def get_project_with_reviews():
    builder = request.args.get("builder")
    index = request.args.get("index", type=int)

    if not builder or index is None:
        return jsonify({"error": "builder and index query params required"}), 400

    try:
        deploysmartcontract()
        result = contract.functions.getProjectWithReviews(Web3.to_checksum_address(builder), index).call()

        client = result[0]
        project_hash = result[1]
        link = result[2]
        verified = result[3]
        reviews = result[4]

        formatted_reviews = [
            {
                "reviewer": r[0],
                "projectIndex": r[1],
                "rating": r[2],
                "commentHash": r[3]
            }
            for r in reviews
        ]

        return jsonify({
            "builder": builder,
            "index": index,
            "client": client,
            "projectHash": project_hash,
            "link": link,
            "verified": verified,
            "reviews": formatted_reviews
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__=="__main__":
    app.run(debug=True)