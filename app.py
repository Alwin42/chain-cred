import requests
import os
import json
import hashlib
from dotenv import load_dotenv
from pathlib import Path
from flask import Flask,jsonify,render_template,request,send_from_directory
from flask_cors import CORS
from web3 import Web3
from routes import routes 

w3 = Web3(Web3.HTTPProvider("https://rpc.api.moonbase.moonbeam.network"))
chainid=1287

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": ["http://localhost:5000", "http://127.0.0.1:5000"]}})
app.register_blueprint(routes) 


'''@app.route('/')
def home():
    return render_template('home.html')'''

@app.route('/')
def user():
    return render_template('home.html')

@app.route('/client')
def clientpage():
    return render_template('client.html')

# --- 2. YOUR NEW FEATURE ---
@app.route("/get_all_freelancers", methods=["GET"])
def get_all_freelancers():
    load_profiles()
    results = []
    
    for wallet, profile in PROFILES.items():
        results.append({
            "wallet": wallet,
            "name": profile.get("name", "Unnamed User"),
            "bio": profile.get("bio", "No bio provided."),
            "skills": profile.get("skills", []),
            "github": profile.get("github", ""),
            "linkedin": profile.get("linkedin", ""),
            "email": profile.get("email", ""),
            "phone": profile.get("phone", "")
            # ===========================
        })
        
    return jsonify(results)
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

CLIENTS = {}
def load_clients():
    global CLIENTS
    try:
        with open("clients.json", "r") as f:
            CLIENTS = json.load(f)
    except:
        CLIENTS = {}

def save_clients():
    with open("clients.json", "w") as f:
        json.dump(CLIENTS, f, indent=4)



#-----------------------------------------------------------VERIFY USER: WORKS-----------------------------------------------------------
@app.route("/verifyuser", methods=["POST"])
def verifyuser():
    
    data = request.get_json() or {}
    global wallet
    wallet = data.get("wallet")
    link = data.get("profile_link")

    #conditions
    if not wallet:
        return jsonify({"valid": False, "reason": "Wallet missing"}), 400
    if not link:
        return jsonify({"valid": False, "reason": "Profile link missing"}), 400
    if not ("github.com" in link or "linkedin.com" in link):
        return jsonify({"valid": False, "reason": "Not a valid link"}), 400

    try:
        r = requests.get(link, timeout=10, headers={"User-Agent": "CredChainVerifier/1.0"})
        if r.status_code == 404:
            return jsonify({"valid": False, "reason": "GitHub page not found"}), 400

    except Exception as e:
        return jsonify({"valid": False, "reason": f"Request failed: {str(e)}"}), 400

    # Save GitHub link
    load_profiles()
    w = wallet.lower()
    if w not in PROFILES:
        PROFILES[w] = {}
    PROFILES[w]["github"] = link
    save_profiles()

    print("Github Link Verified by Backend")
    return jsonify({"valid": True})

#-----------------------------------------------------------PROJECT HASHING: WORKS-----------------------------------------------------------
@app.route("/hash_project", methods=["POST"])
def hash_project():
    data = request.get_json()
    link=data.get("link")
    wallet=data.get("wallet")

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
        # Track builder for dashboard use
    if wallet and wallet not in ["null", "None"]:
        KNOWN_BUILDERS.add(wallet)
        save_builders()
    print("Hash of the Project: ",h)


    return jsonify({"hash": h})

#redirect to BUILDERS.JSON
@app.route("/builders.json")
def send_builders():
    return send_from_directory(".", "builders.json", mimetype='application/json')
    
# -----------------------------------------------------------CREATE/EDIT FREELANCER PROFILE-----------------------------------------------------------
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
        "github": PROFILES[wallet].get("github", ""),
        "linkedin": data.get("linkedin", ""),
        "email": data.get("email", ""),
        "phone": data.get("phone", "")
    }

    save_profiles()
    return jsonify({"status": "Profile saved", "wallet": wallet})

# -----------------------------------------------------------DISPLAY PROFILE(FREELANCER)-----------------------------------------------------------
@app.route("/get_profile/<wallet>", methods=["GET"])
def get_profile(wallet):
    wallet = wallet.lower()
    load_profiles()

    if wallet not in PROFILES:
        return jsonify({"error": "Profile not found"}), 404

    return jsonify(PROFILES[wallet])

# -----------------------------------------------------------SEARCH FOR FREELANCER-----------------------------------------------------------
@app.route("/search_freelancers/<lang>")
def search_freelancers(lang):
    lang = lang.lower()
    load_profiles()

    results = []

    for wallet, profile in PROFILES.items():
        skills = profile.get("skills", [])
        normalized = [s.lower() for s in skills]

        if lang in normalized:
            print("Wallet: ",wallet)


        if lang in normalized:
            results.append({
                "wallet": wallet,
                "name": profile.get("name", ""),
                "bio": profile.get("bio", ""),
                "skills": skills,
                "github": profile.get("github", ""),
                "linkedin": profile.get("linkedin", "")
            })

    return jsonify(results)


# -----------------------------------------------------------CREATE CLIENT PROFILE-----------------------------------------------------------
@app.route("/save_client_profile", methods=["POST"])
def save_client_profile():
    data = request.get_json() or {}

    wallet = data.get("wallet")
    name = data.get("name")
    company = data.get("company")
    email = data.get("email")
    phone = data.get("phone")

    if not wallet:
        return jsonify({"error": "Wallet required"}), 400

    load_clients()

    CLIENTS[wallet.lower()] = {
        "name": name,
        "company": company,
        "email": email,
        "phone": phone
    }

    save_clients()

    return jsonify({"success": True})

# -----------------------------------------------------------DISPLAY CLIENT PROFILE-----------------------------------------------------------
@app.route("/get_client_profile/<wallet>", methods=["GET"])
def get_client_profile(wallet):
    load_clients()

    profile = CLIENTS.get(wallet.lower())

    if not profile:
        return jsonify({"exists": False})

    return jsonify({
        "exists": True,
        "profile": profile
    })


if __name__=="__main__":
    app.run(debug=True)