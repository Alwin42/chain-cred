from flask import Blueprint, render_template, request, redirect, url_for, jsonify,send_from_directory
import json
import os
import hashlib
import requests
from dotenv import load_dotenv
from web3 import Web3

routes = Blueprint('routes', __name__)

# ---------------------------------------------------------------------------
# 1. SETUP WEB3 (For Read-Only Operations)
# ---------------------------------------------------------------------------
load_dotenv()
MYADDRESS = os.getenv("METAMASK") 
SECRETCODE = os.getenv("SECRETKEY")

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
CHAIN_ID = 1287
# Ensure this matches credchain.js
CONTRACT_ADDRESS = "0xCCc0F45E8bE87022ea3E553BdD2f64cD6aAeed79" 

try:
    with open("./static/compiledcccode.json", "r") as file:
        compiledsol = json.load(file)
    contract_abi = compiledsol["contracts"]["chaincred.sol"]["CredChain"]["abi"]
    contract = w3.eth.contract(address=CONTRACT_ADDRESS, abi=contract_abi)
except Exception as e:
    print(f"Error loading ABI in routes.py: {e}")
    contract = None

# ---------------------------------------------------------------------------
# 2. PAGE ROUTES
# ---------------------------------------------------------------------------
@routes.route('/about')
def about(): return render_template('about.html')

@routes.route('/edit-profile')
def edit_profile(): return render_template('edit_profile.html')

@routes.route('/edit-company-profile')
def company_profile(): return render_template('edit_company_profile.html')

@routes.route('/login', methods=['GET', 'POST'])
def login(): return render_template('login.html')

@routes.route('/Fdashboard')
def dashboard(): return render_template('Fdashboard.html')

@routes.route('/Edashboard')
def edashboard(): return render_template('employer_dashboard.html')

@routes.route('/Jobs')
def jobs(): return render_template('Fjobs.html')

@routes.route('/wallet-login')
def wallet_login(): 
    return render_template('wallet_login.html')

@routes.route('/find-freelancers')
def find_freelancers(): return render_template('find_freelancer.html')

@routes.route('/profile/<wallet>')
def view_freelancer_profile(wallet):
    return render_template('profile_freelancer.html', wallet=wallet)

# ---------------------------------------------------------------------------
# 3. API ROUTES
# ---------------------------------------------------------------------------

# --- HASH PROJECT (Used by Frontend before signing) ---
@routes.route("/hash_project", methods=["POST"])
def hash_project():
    data = request.get_json()
    link = data.get("link")
    
    if not link: return jsonify({"error": "Link is required"}), 400

    # Normalize GitHub links
    if "github.com" in link and "raw.githubusercontent.com" not in link:
        link = link.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/")

    try:
        r = requests.get(link, timeout=10)
        if r.status_code != 200:
            return jsonify({"error": f"Link not reachable ({r.status_code})"}), 400
        content = r.content
    except Exception as e:
        return jsonify({"error": str(e)}), 400

    # Generate Hash
    project_hash = hashlib.sha256(content).hexdigest()
    return jsonify({"hash": project_hash})


