// /static/js/credchain.js

let web3;
let contract;
let account;

// === CONFIGURATION ===
const CONTRACT_ADDRESS = "0xCCc0F45E8bE87022ea3E553BdD2f64cD6aAeed79"; // Update if you deploy a new contract
const COMPILED_JSON_PATH = "/static/compiledcccode.json"; 

// === HELPER: Load ABI ===
async function loadAbi() {
    try {
        console.log("[credchain] Fetching ABI from:", COMPILED_JSON_PATH);
        const resp = await fetch(COMPILED_JSON_PATH);
        if (!resp.ok) throw new Error(`Failed to fetch ABI JSON: ${resp.status}`);
        const compiled = await resp.json();

        // Path to ABI in your specific JSON structure
        const abi = compiled?.contracts?.["chaincred.sol"]?.CredChain?.abi;
        if (!abi) throw new Error("ABI not found in compiled JSON");
        return abi;
    } catch (err) {
        console.error("[credchain] loadAbi error:", err);
        throw err;
    }
}

// === HELPER: Switch Network (Moonbase Alpha) ===
async function switchToMoonbase() {
    const chainIdHex = "0x507"; // 1287
    if (!window.ethereum) throw new Error("MetaMask not found");

    try {
        await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: chainIdHex }]
        });
    } catch (err) {
        // If chain not added, add it
        if (err.code === 4902) {
            try {
                await window.ethereum.request({
                    method: "wallet_addEthereumChain",
                    params: [{
                        chainId: chainIdHex,
                        chainName: "Moonbase Alpha",
                        rpcUrls: ["https://rpc.api.moonbase.moonbeam.network"],
                        nativeCurrency: { name: "DEV", symbol: "DEV", decimals: 18 },
                        blockExplorerUrls: ["https://moonbase.moonscan.io/"]
                    }]
                });
            } catch (addErr) {
                console.error("[credchain] Failed to add chain:", addErr);
                throw addErr;
            }
        } else {
            throw err;
        }
    }
}

// === INITIALIZE CONTRACT ===
async function initContract() {
    if (!window.ethereum) return;
    
    if (!web3) {
        web3 = new Web3(window.ethereum);
    }
    
    if (!contract) {
        const abi = await loadAbi();
        contract = new web3.eth.Contract(abi, CONTRACT_ADDRESS);
        console.log("[credchain] Contract initialized");
    }
}

// =================================================================
// CORE FUNCTIONS
// =================================================================

/**
 * Connects the wallet and initializes the contract.
 */
export async function connectWallet() {
    if (!window.ethereum) {
        alert("Please install MetaMask!");
        throw new Error("No ethereum provider");
    }

    await switchToMoonbase();

    web3 = new Web3(window.ethereum);
    const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
    account = accounts[0];
    
    console.log("[credchain] Connected:", account);
    await initContract();
    
    return account;
}

/**
 * Helper to send a transaction with gas estimation.
 */
async function sendTx(methodCall) {
    if (!account) await connectWallet();
    
    try {
        const gas = await methodCall.estimateGas({ from: account });
        const gasPrice = await web3.eth.getGasPrice();
        
        return await methodCall.send({
            from: account,
            gas: Math.floor(gas * 1.2), // Add 20% buffer
            gasPrice: gasPrice
        });
    } catch (err) {
        console.error("[credchain] Transaction failed:", err);
        throw err;
    }
}

// --- 1. ADD PROJECT ---
export async function addProjectOnChain(client, name, desc, lang, projectHash, link) {
    if (!contract) await initContract();

    // Struct must match Solidity: ProjectInput
    const p = {
        user: account,
        client: client,
        projectName: name,
        description: desc,
        languages: lang,
        projectHash: projectHash,
        link: link
    };

    console.log("[credchain] Adding Project:", p);
    return sendTx(contract.methods.addProject(p));
}

// --- 2. VERIFY USER ---
export async function verifyUserOnChain() {
    if (!contract) await initContract();
    console.log("[credchain] Verifying User:", account);
    return sendTx(contract.methods.setUserVerified(account, true));
}

// --- 3. SUBMIT REVIEW ---
export async function submitReviewOnChain(freelancer, index, rating, commentHash) {
    if (!contract) await initContract();
    console.log("[credchain] Submitting Review:", { freelancer, index, rating });
    return sendTx(contract.methods.submitReview(freelancer, index, rating, commentHash));
}

// --- 4. GET ALL PROJECTS (Read-Only) ---
export async function getAllProjectsFromChain(builderAddress) {
    if (!contract) await initContract(); // Can init without connecting wallet for read-only if provider exists

    try {
        console.log("[credchain] Fetching projects for:", builderAddress);
        const projectsRaw = await contract.methods.getAllProjects(builderAddress).call();

        // Format data
        return projectsRaw.map(p => ({
            client: p.client || p[0],
            projectName: p.projectName || p[1],
            description: p.description || p[2],
            languages: p.languages || p[3],
            projectHash: p.projectHash || p[4],
            link: p.link || p[5],
            verified: p.verified || p[6],
            timestamp: p.timestamp || p[7]
        }));

    } catch (err) {
        console.error("[credchain] Get Projects Error:", err);
        return [];
    }
}

// --- 5. GET REVIEWS FOR PROJECT (Read-Only) ---
export async function getProjectReviewsFromChain(builder, index) {
    if (!contract) await initContract();

    try {
        const reviewsRaw = await contract.methods.getProjectReviews(builder, index).call();
        
        return reviewsRaw.map(r => ({
            reviewer: r.reviewer || r[0],
            projectIndex: r.projectIndex || r[1],
            rating: r.rating || r[2],
            commentHash: r.commentHash || r[3]
        }));

    } catch (err) {
        console.error("[credchain] Get Reviews Error:", err);
        return [];
    }
}

// =================================================================
// EXPOSE TO WINDOW (Crucial for non-module scripts)
// =================================================================
window.connectWallet = connectWallet;
window.addProjectOnChain = addProjectOnChain;
window.verifyUserOnChain = verifyUserOnChain;
window.submitReviewOnChain = submitReviewOnChain;
window.getAllProjectsFromChain = getAllProjectsFromChain;
window.getProjectReviewsFromChain = getProjectReviewsFromChain;
window.cc_account = () => account;

console.log("[credchain] Module loaded and functions exported to window.");