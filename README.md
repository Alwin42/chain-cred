![cred chain 1](https://github.com/user-attachments/assets/a865bd95-771c-4a26-9958-5eb602f2a792)

# CredChain: Decentralized Reputation for Freelancers 

CredChain is a **Web3-powered trust and reputation system** designed to empower freelancers by decentralizing their work history and professional identity. By storing verifiable **project proofs** and **client reviews** on the blockchain, we eliminate the risks associated with centralized platforms like fake portfolios, unverified experience, and platform lock-in.

##  Project Overview and Objectives

The core objective of CredChain is to create an **immutable, transparent, and portable professional identity** for every freelancer.

By leveraging the **MoonBase** (EVM compatibility on Polkadot), we enable on-chain verification of completed work and client feedback, giving freelancers full **ownership** over their reputation data. Our system shifts trust from centralized platforms to **cryptographic proof** and **verified on-chain interactions**.

---

##  The Problem CredChain Solves

| Issue | Centralized Platform Risk | CredChain Solution |
| :--- | :--- | :--- |
| **Fake Portfolios** | Easy to falsify claims or credentials. | **Hash Proofs** and **Smart Verification** ensure work integrity. |
| **No Code Provenance** | No transparent way to prove code authorship. | Immutable linkage of work hash to the freelancer's On-chain Identity. |
| **Client Trust Issues** | Reviews can be manipulated or deleted by central entities. | **Client-authenticated Reviews** are recorded immediately on-chain. |
| **High Platform Fees** | Platforms take significant cuts from earnings. | Reduced reliance on intermediaries and their fee structures. |

---

##  Solution: Core Mechanics

CredChain addresses these problems through a suite of verifiable, on-chain mechanics:

* **On-chain Identity**: Users authenticate via **MetaMask** on the MoonBase network, tying their wallet address to a persistent, verifiable identity.
* **GitHub Hashing (Hash Proofs)**: Freelancers submit a cryptographic hash proof of their project deliverable (e.g., a GitHub repository or IPFS file) to the smart contract, immutably linking the work to their identity.
* **Smart Verification**: The system uses the on-chain hash proof to verify that the work presented hasn't been modified since it was submitted. 
* **Review Authorization**: Clients who have interacted with a freelancer submit a review, which is immediately recorded on-chain without further approval, ensuring client-authenticated feedback.
* **Skill Search**: Profiles and projects are indexed to allow clients to search for **verified skills** based on successful, reviewed project history.
* **Project Badges (Badge System)**: Upon project completion, verifiable badges representing certain skills or milestones can be minted and linked to the freelancer's profile.
* **Decentralized Profiles**: The freelancer's complete reputation (verified identity, projects, reviews, and badges) is stored immutably on the blockchain. 

---

##  Features

The CredChain platform provides the following core features:

1.  **On-chain Portfolio**: A decentralized and immutable record of all completed, hash-proofed projects.
2.  **Client-authenticated Reviews**: Reviews submitted by verified clients are permanently stored and linked to the project.
3.  **Hash Proofs**: Cryptographic proofs of work deliverables ensure integrity and prevent tampering.
4.  **Skill Search**: Allows potential clients to search for freelancers based on verified skills demonstrated through completed projects.
5.  **Verified Users**: Mandatory wallet and identity verification for both clients and freelancers.
6.  **Proof-of-Work Badge System**: New way to recognize freelancer skill and effort beyond simple ratings. Automatically minted upon milestone/project completion and sent to the freelancer's wallet.

---

##  Dependencies and Technologies Used

| Category | Technology | Purpose |
| :--- | :--- | :--- |
| **Blockchain** | **MoonBase** | EVM-compatible environment on Polkadot for smart contract deployment. |
| **Wallet/Auth** | **MetaMask** | Primary user authentication and transaction signing. |
| **Smart Contract** | **Solidity** | Language used for writing the core reputation logic. |
| **Frontend** | **HMTL, Tailwind css , Web3.js** | User interface for profile management, project submission, and review. |
| **Backend** | **Python (Web3.py), Flask** | Server-side logic for handling off-chain processes and interacting with the Web3 environment. |
| **Data Storage** | **IPFS** | Decentralized storage for project deliverables and metadata. |

---

##  Smart Contract Functions (Solidity)

The core business logic is managed by the following key functions:

| Function Name | Description |
| :--- | :--- |
| `addProject` | Allows a verified freelancer to submit a new project, including its cryptographic hash proof. |
| `submitReview` | Enables a verified client to submit a review for a completed project. (No approval required). |
| `setUserVerified` | Function used by the contract owner or an oracle to mark a user's address as verified. |
| `getAllProjects` | Retrieves the list of all submitted projects on the network. |
| `getAllReviews` | Retrieves all reviews associated with a specific project or user. |
| `badgeMinting` | Handles the logic for minting and assigning skill badges to the freelancer. |

---

##  Polkadot Relevance & Web3 Integration

CredChain is built to leverage the **Web3 ecosystem**, specifically Polkadot's interoperable network structure:

* **Built on Moonbeam**: We utilize the MoonBase, which provides **EVM compatibility**, allowing us to deploy standard Solidity smart contracts while operating within the Polkadot ecosystem.
* **Web3 RPC**: All client-side interactions (MetaMask) communicate with the MoonBase network via standard Web3 RPC calls.
* **Polkadot User Metric Features**: The six core features (On-chain portfolio, Client-authenticated reviews, Hash proofs, Skill search, Verified users, and Badge system) are the on-chain metrics used to define a freelancer's reputation and are directly tied to Polkadot's vision of secure, verifiable digital identity.

---

##  Instructions for Setup and Usage

### Prerequisites

Before starting, ensure you have the following installed and configured:
* Python 3 and pip (for the Flask backend).
* Yarn or npm (for the frontend application).
* MetaMask browser extension configured for the Moonbase Alpha TestNet.

### Local Installation (Cloning)
First, clone the repository and navigate into the project directory:
```
git clone https://github.com/SR-005/cred-chain
cd cred-chain
```
### Backend Environment Setup (Python/Flask) 

These steps create an isolated Python virtual environment and install the required packages.

#### OS-Specific Commands

| Step | Ubuntu / macOS (Bash) | Windows (Bash) | Description |
| :--- | :--- | :--- | :--- |
| **1. Create Virtual Environment** | **`python3 -m venv venv`** | `python -m venv venv` | Creates a new environment named `venv`. |
| **2. Activate Virtual Environment** | **`source venv/bin/activate`** | `venv\Scripts\activate` | Activates the virtual environment session. |
| **3. Install Dependencies** | **`pip install -r requirements.txt`** | `pip install -r requirements.txt` | Installs Python packages listed in `requirements.txt`. |

### Running the Flask Backend

Once dependencies are installed and the virtual environment is active:
```
python3 app.py
```
### Configuration (.env File)

You must create a .env file in the root directory to securely store sensitive keys.

1.Create a file named .env in the root project folder.

2.Add your MetaMask wallet address (and other keys later) in the following format:

```
METAMASK=0xYourWalletAddressHere
```
### Frontend Installation and Run

Install the necessary Node.js/frontend packages:

```
yarn install
# or npm install
```
Smart Contract Setup (Optional)

If you are performing local development or re-deploying contracts:

* Navigate to the smart contract directory.

* Compile and deploy the contracts to your local development environment (e.g., Hardhat or Ganache).

* Update the contract address in the relevant frontend configuration file to point to your new deployment.

### Run the Frontend Application

Start the development server:
```
yarn dev
# or npm run dev
```
The application will typically start at http://localhost:3000. Connect your MetaMask wallet to the Moonbase Alpha TestNet to begin using CredChain.

---

## Video Walkthrough and Images

https://youtu.be/hdxkkQZXab8

![Screen](https://github.com/user-attachments/assets/827b28b2-7d2f-41fd-9484-620c5a582b33)

![Search](https://github.com/user-attachments/assets/115b0b6b-dafc-4fee-a5e6-331c46fda417)

![Review](https://github.com/user-attachments/assets/e73ab6c1-883d-41ff-8743-c25b2f9b9dd1)

![Badge confirm](https://github.com/user-attachments/assets/4772c4a7-436e-4be9-9c32-7ce5e35c6503)

---

## Team

This project was developed by:

* [Sreeram V Gopal](https://github.com/SR-005)
* [Alwin Emmanuel Sebastian](https://github.com/Alwin42)
* [Allen Jude](https://github.com/Ajallen14)
* [Arjun Shiju](https://github.com/Godly-arj)

---

