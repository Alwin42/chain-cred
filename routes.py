from flask import Blueprint, render_template, request, redirect, url_for, jsonify
import json
import os
from dotenv import load_dotenv
from web3 import Web3

routes = Blueprint('routes', __name__)

# ---------------------------------------------------------------------------
# 1. SETUP WEB3 & CONTRACT (Required for these routes to work)
# ---------------------------------------------------------------------------
load_dotenv()

# Load Secrets
MYADDRESS = os.getenv("METAMASK")
SECRETCODE = os.getenv("SECRETKEY")

# Connect to Moonbase Alpha
w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
CHAIN_ID = 1287
CONTRACT_ADDRESS = "0xCCc0F45E8bE87022ea3E553BdD2f64cD6aAeed79" # Your deployed address

# Load ABI
try:
    with open("./static/compiledcccode.json", "r") as file:
        compiledsol = json.load(file)
    contract_abi = compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]
except Exception as e:
    print(f"Error loading ABI in routes.py: {e}")
    contract_abi = []

# Create Contract Instance
if contract_abi:
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)
else:
    contract = None

# Helper: Send Transaction
def send_transaction(function_call):
    """Helper to build, sign, and send a transaction."""
    if not MYADDRESS or not SECRETCODE:
        raise Exception("Environment variables METAMASK or SECRETKEY are missing.")
        
    nonce = w3.eth.get_transaction_count(Web3.to_checksum_address(MYADDRESS), "pending")

    tx_data = function_call.build_transaction({
        "chainId": CHAIN_ID,
        "from": Web3.to_checksum_address(MYADDRESS),
        "nonce": nonce,
        "gas": 5000000,
        "gasPrice": w3.to_wei("20", "gwei")
    })

    signed_tx = w3.eth.account.sign_transaction(tx_data, private_key=SECRETCODE)
    tx_hash = w3.eth.send_raw_transaction(signed_tx.raw_transaction)
    
    # Wait for receipt
    receipt = w3.eth.wait_for_transaction_receipt(tx_hash)
    return receipt

# ---------------------------------------------------------------------------
# 2. PAGE ROUTES (Views)
# ---------------------------------------------------------------------------

@routes.route('/about')
def about():
    return render_template('about.html')

@routes.route('/edit-profile')
def edit_profile():
    return render_template('edit_profile.html')

@routes.route('/edit-company-profile')
def company_profile():
    return render_template('edit_company_profile.html')

@routes.route('/login', methods=['GET', 'POST'])
def login():
    return render_template('login.html')

@routes.route('/Fdashboard')
def dashboard():
    return render_template('Fdashboard.html')

@routes.route('/Edashboard')
def edashboard():
    return render_template('employer_dashboard.html')


@routes.route('/wallet-login')
def wallet_login():
    return render_template('wallet_login.html')

@routes.route('/find-freelancers')
def find_freelancers():
    return render_template('find_freelancer.html')


# ---------------------------------------------------------------------------
# 3. API ROUTES (Smart Contract Interactions)
# ---------------------------------------------------------------------------

# --- SUBMIT PROJECT ---
@routes.route('/submit_project', methods=['POST'])
def submit_project():
    """
    Expects JSON: { "wallet": "0x...", "client": "0x...", "name": "...", "description": "...", "languages": "...", "link": "..." }
    """
    if not contract: return jsonify({"error": "Contract not loaded"}), 500

    try:
        data = request.get_json()
        
        # Generate a simple hash for the project (or fetch from backend logic if needed)
        # Ideally, you hash the file content here, but using link string as seed for now
        import hashlib
        project_hash = hashlib.sha256(data.get("link", "").encode()).hexdigest()

        # Prepare the struct
        # Struct order in Solidity: user, client, projectName, description, languages, projectHash, link
        project_input = (
            Web3.to_checksum_address(data['wallet']),   # user
            Web3.to_checksum_address(data['client']),   # client
            data['name'],
            data['description'],
            data['languages'],
            project_hash,
            data['link']
        )

        # Call Contract
        fn = contract.functions.addProject(project_input)
        receipt = send_transaction(fn)

        return jsonify({
            "status": "success", 
            "tx_hash": receipt.transactionHash.hex()
        })

    except Exception as e:
        print(f"Submit Project Error: {e}")
        return jsonify({"error": str(e)}), 500


# --- GET ALL PROJECTS (For a Freelancer) ---
@routes.route('/get_all_projects/<builder>', methods=['GET'])
def get_all_projects(builder):
    """
    Fetches all projects for a specific freelancer address.
    """
    if not contract: return jsonify({"projects": []})

    try:
        builder_address = Web3.to_checksum_address(builder)
        projects_raw = contract.functions.getAllProjects(builder_address).call()

        # Format the output (Structs return tuples)
        projects = []
        for p in projects_raw:
            projects.append({
                "client": p[0],
                "projectName": p[1],
                "description": p[2],
                "languages": p[3],
                "projectHash": p[4],
                "link": p[5],
                "verified": p[6],
                "timestamp": p[7]
            })

        return jsonify({"builder": builder, "projects": projects})

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- GET PROJECTS FOR CLIENT ---
@routes.route('/get_projects_for_client/<client_address>', methods=['GET'])
def get_projects_for_client(client_address):
    """
    Note: Solidity mapping is [freelancer] -> projects.
    To find projects for a client, we must loop through KNOWN BUILDERS.
    """
    if not contract: return jsonify([])
    
    try:
        client_addr = Web3.to_checksum_address(client_address)
        found_projects = []

        # Load the list of builders from the JSON file
        known_builders = []
        if os.path.exists("builders.json"):
            with open("builders.json", "r") as f:
                known_builders = json.load(f)
        
        # Loop through every builder to see if they did work for this client
        for builder in known_builders:
            builder_addr = Web3.to_checksum_address(builder)
            projects_raw = contract.functions.getAllProjects(builder_addr).call()

            for i, p in enumerate(projects_raw):
                # Check if the project's client matches the requested client
                if Web3.to_checksum_address(p[0]) == client_addr:
                    found_projects.append({
                        "freelancer": builder,
                        "index": i, # Needed for review submission
                        "projectName": p[1],
                        "description": p[2],
                        "languages": p[3],
                        "link": p[5],
                        "verified": p[6]
                    })

        return jsonify(found_projects)

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- SUBMIT REVIEW ---
@routes.route('/submit_review', methods=['POST'])
def submit_review():
    """
    Expects JSON: { "freelancer": "0x...", "project_index": 0, "rating": 5, "comment_hash": "..." }
    """
    if not contract: return jsonify({"error": "Contract not loaded"}), 500

    try:
        data = request.get_json()
        
        freelancer = Web3.to_checksum_address(data['freelancer'])
        index = int(data['project_index'])
        rating = int(data['rating'])
        comment = data.get('comment_hash', 'No comment')

        fn = contract.functions.submitReview(freelancer, index, rating, comment)
        receipt = send_transaction(fn)

        return jsonify({
            "status": "success", 
            "tx_hash": receipt.transactionHash.hex()
        })

    except Exception as e:
        print(f"Submit Review Error: {e}")
        return jsonify({"error": str(e)}), 500