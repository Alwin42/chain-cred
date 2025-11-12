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
    '''contractaddress,abi=depoly_contract()'''      
    global contract

    with open("./compiledcccode.json","r") as file:
        compiledsol = json.load(file) 
    abi=compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]
    contract=w3.eth.contract(address='0xC7C0851104bBfeDBa3E3a370fE051dACA2686B6F', abi=abi)
    
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
        r = requests.get(link, timeout=10, headers={"User-Agent": "CredChainVerifier/1.0"})
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
    """Adds a project to the blockchain. Auto-verification is handled inside the smart contract."""
    print("Submit Project Function Triggered")
    data = request.get_json()
    wallet = data.get("wallet")
    client = data.get("client")
    link = data.get("link")

    if not wallet or not link or not client:
        return jsonify({"error": "wallet, client, and link required"}), 400

    deploysmartcontract()

    # Normalize GitHub link
    if "github.com" in link and "raw.githubusercontent.com" not in link:
        link = link.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    # Fetch content & hash
    try:
        r = requests.get(link, timeout=12)
        if r.status_code != 200:
            return jsonify({"error": "provided link not reachable"}), 400
        content = r.content
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    h = hashlib.sha256(content).hexdigest()

    # Call addProject (auto-verifies inside contract)
    try:
        feature = contract.functions.addProject(
            Web3.to_checksum_address(wallet),
            Web3.to_checksum_address(client),
            h,
            link
        )
        receipt = callfeature(feature)
        print("Project added + verified automatically:", receipt)
    except Exception as e:
        return jsonify({"error": f"addProject failed: {str(e)}"}), 500

    # Track builder for dashboard use
    KNOWN_BUILDERS.add(wallet)
    save_builders()

    try:
        count = contract.functions.getProjectCount(Web3.to_checksum_address(wallet)).call()
        index = count - 1
    except Exception:
        index = None

    return jsonify({
        "status": "added_and_verified",
        "tx": receipt.transactionHash.hex(),
        "index": index
    })


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

# ----------------------------------------------------------- GET ALL PROJECTS (BUILDER) -----------------------------------------------------------
@app.route("/get_all_projects/<builder>", methods=["GET"])
def get_all_projects(builder):
    """Fetch all projects created by a specific builder (freelancer)."""
    try:
        deploysmartcontract()
        result = contract.functions.getAllProjects(Web3.to_checksum_address(builder)).call()

        # Format the data into readable JSON
        formatted_projects = [
            {
                "client": p[0],
                "projectHash": p[1],
                "link": p[2],
                "verified": p[3]
            }
            for p in result
        ]

        return jsonify({
            "builder": builder,
            "projectCount": len(formatted_projects),
            "projects": formatted_projects
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# ----------------------------------------------------------- GET ALL REVIEWS (BUILDER) -----------------------------------------------------------
@app.route("/get_all_reviews/<builder>", methods=["GET"])
def get_all_reviews(builder):
    """Fetch all reviews received by a specific freelancer."""
    try:
        deploysmartcontract()
        result = contract.functions.getAllReviews(Web3.to_checksum_address(builder)).call()

        # Format reviews for readability
        formatted_reviews = [
            {
                "reviewer": r[0],
                "projectIndex": r[1],
                "rating": r[2],
                "commentHash": r[3]
            }
            for r in result
        ]

        return jsonify({
            "builder": builder,
            "reviewCount": len(formatted_reviews),
            "reviews": formatted_reviews
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500
    
# ----------------------------------------------------------- FREELANCER PROFILE SYSTEM -----------------------------------------------------------
PROFILES_FILE = "profiles.json"

# Load or initialize profiles
def load_profiles():
    global PROFILES
    if os.path.exists(PROFILES_FILE):
        with open(PROFILES_FILE, "r") as f:
            PROFILES = json.load(f)
    else:
        PROFILES = {}

def save_profiles():
    with open(PROFILES_FILE, "w") as f:
        json.dump(PROFILES, f, indent=2)

load_profiles()

# ---------------- Create or Update Freelancer Profile ----------------
@app.route("/create_profile", methods=["POST"])
def create_profile():
    """
    Request JSON Example:
    {
        "wallet": "0xFreelancerWallet",
        "name": "John Doe",
        "bio": "Blockchain developer and data scientist.",
        "skills": ["Solidity", "Python", "Flask"],
        "github": "https://github.com/johndoe",
        "linkedin": "https://linkedin.com/in/johndoe",
        "profile_pic": "ipfs://QmHash..."
    }
    """
    data = request.get_json()
    wallet = data.get("wallet")

    if not wallet:
        return jsonify({"error": "wallet required"}), 400

    # Normalize wallet (lowercase for key consistency)
    wallet = wallet.lower()

    # Update or create
    PROFILES[wallet] = {
        "name": data.get("name", ""),
        "bio": data.get("bio", ""),
        "skills": data.get("skills", []),
        "github": data.get("github", ""),
        "linkedin": data.get("linkedin", ""),
        "profile_pic": data.get("profile_pic", "")
    }

    save_profiles()
    return jsonify({"status": "Profile saved", "wallet": wallet})

# ---------------- Get Freelancer Profile ----------------
@app.route("/get_profile/<wallet>", methods=["GET"])
def get_profile(wallet):
    wallet = wallet.lower()
    load_profiles()

    if wallet not in PROFILES:
        return jsonify({"error": "Profile not found"}), 404

    return jsonify(PROFILES[wallet])

if __name__=="__main__":
    app.run(debug=True)