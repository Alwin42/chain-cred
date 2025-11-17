// employer_dashboard.js
const rawAccount = localStorage.getItem('userWalletAddress');
const account = rawAccount ? rawAccount.toLowerCase() : null;
let currentReviewData = null; // Stores data for modal

document.addEventListener('DOMContentLoaded', async () => {
    if (!account) {
        alert("Please log in.");
        window.location.href = '/wallet-login';
        return;
    }
    document.getElementById('clientAddr').innerText = account;
    const loader = document.getElementById('global-loader');

    try {
        // === FETCH DATA IN PARALLEL ===
        await Promise.all([
            loadEmployerProfile(),
            loadClientProjects()
        ]);

    } catch (err) {
        console.error("Dashboard Init Error:", err);
    } finally {
        // === HIDE LOADER ===
        if (loader) {
            loader.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => loader.remove(), 500);
        }
    }

    // Logout Logic
    document.getElementById('logoutBtn').addEventListener('click', () => {
        if(confirm("Are you sure you want to disconnect?")) {
            localStorage.removeItem('userWalletAddress');
            localStorage.removeItem('userRole');
            window.location.href = '/wallet-login';
        }
    });
});

/**
 * Fetches the employer's profile details
 */
async function loadEmployerProfile() {
    const nameEl = document.getElementById('emp-name');
    const compEl = document.getElementById('emp-company');
    const emailEl = document.getElementById('emp-email');
    const phoneEl = document.getElementById('emp-phone');

    try {
        const res = await fetch(`/get_client_profile/${account}`);
        const data = await res.json();

        if (data.exists && data.profile) {
            nameEl.innerText = data.profile.name || "Unnamed Employer";
            compEl.innerText = data.profile.company || "Company Not Set";
            emailEl.innerText = data.profile.email || "No email provided";
            phoneEl.innerText = data.profile.phone || "No phone provided";
        } else {
            nameEl.innerText = "Profile Not Found";
            compEl.innerText = "Please click 'Edit Company Profile'";
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
        nameEl.innerText = "Error loading profile";
    }
}

/**
 * Fetches projects AND their reviews from chain
 */
async function loadClientProjects() {
    const container = document.getElementById('client-projects-list');
    
    try {
        // 1. Ensure web3 functions are loaded
        if (typeof window.getAllProjectsFromChain !== 'function' || typeof window.getProjectReviewsFromChain !== 'function') {
            const mod = await import('/static/js/credchain.js');
            window.getAllProjectsFromChain = mod.getAllProjectsFromChain;
            window.getProjectReviewsFromChain = mod.getProjectReviewsFromChain;
        }

        // 2. Get list of all builders
        const buildersRes = await fetch('/builders.json');
        if (!buildersRes.ok) throw new Error("Could not load builders list");
        const builders = await buildersRes.json();

        // 3. Fetch projects for ALL builders in parallel
        const projectPromises = builders.map(builderAddr => window.getAllProjectsFromChain(builderAddr));
        const projectResults = await Promise.all(projectPromises);

        // 4. Filter results: Keep only projects where client == me
        let myProjects = [];
        
        projectResults.forEach((builderProjects, i) => {
            const freelancerAddr = builders[i];
            
            builderProjects.forEach((p, index) => {
                if (p.client.toLowerCase() === account) {
                    myProjects.push({
                        ...p,
                        freelancer: freelancerAddr,
                        index: index // Crucial for fetching reviews
                    });
                }
            });
        });

        if (myProjects.length === 0) {
            container.innerHTML = "<p class='text-light-muted italic text-center'>No projects found assigned to this wallet.</p>";
            return;
        }

        // 5. NEW: Fetch Reviews for these specific projects (Parallel)
        const reviewPromises = myProjects.map(p => window.getProjectReviewsFromChain(p.freelancer, p.index));
        const reviewsResults = await Promise.all(reviewPromises);

        // Merge reviews into project objects
        myProjects = myProjects.map((p, i) => ({
            ...p,
            reviews: reviewsResults[i]
        }));

        // 6. Render Projects with Reviews
        container.innerHTML = myProjects.map((p) => {
            
            // Generate HTML for reviews if they exist
            let reviewsHtml = '';
            if (p.reviews && p.reviews.length > 0) {
                reviewsHtml = p.reviews.map(r => `
                    <div class="bg-gray-800/50 p-3 rounded border border-gray-700 mt-2">
                        <div class="flex justify-between items-center mb-1">
                            <span class="text-xs text-yellow-400 font-bold">Rating: ${r.rating}/5</span>
                            <span class="text-[10px] text-gray-500 font-mono truncate w-24">${r.reviewer}</span>
                        </div>
                        <p class="text-sm text-gray-300 italic">"${r.commentHash}"</p>
                    </div>
                `).join('');
            } else {
                reviewsHtml = `<p class="text-xs text-gray-500 italic mt-2">No reviews submitted yet.</p>`;
            }

            return `
            <div class="bg-primary-dark border border-gray-600 rounded-lg p-6 mb-6 hover:border-blue-500 transition duration-200">
                <div class="flex flex-col sm:flex-row justify-between items-start gap-4">
                    <div class="flex-grow w-full">
                        <div class="flex justify-between items-center mb-2">
                            <h4 class="text-lg font-bold text-white">${p.projectName}</h4>
                            <span class="text-xs ${p.verified ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'} px-2 py-1 rounded">
                                ${p.verified ? "Verified" : "Pending"}
                            </span>
                        </div>
                        <p class="text-light-muted text-sm mb-3">${p.description}</p>
                        
                        <div class="flex flex-wrap gap-3 text-xs mb-4">
                            <span class="bg-blue-900/30 text-blue-300 px-2 py-1 rounded border border-blue-900">
                                Developer: ${p.freelancer.substring(0, 6)}...${p.freelancer.substring(p.freelancer.length - 4)}
                            </span>
                            <a href="${p.link}" target="_blank" class="bg-gray-800 text-gray-300 px-2 py-1 rounded hover:bg-gray-700 flex items-center gap-1">
                                <ion-icon name="link"></ion-icon> Source
                            </a>
                        </div>

                        <div class="border-t border-gray-700 pt-3">
                            <h5 class="text-sm font-semibold text-gray-400 mb-2 flex items-center">
                                <ion-icon name="star-outline" class="mr-1"></ion-icon> Reviews
                            </h5>
                            <div class="space-y-2">
                                ${reviewsHtml}
                            </div>
                        </div>
                    </div>

                    ${p.reviews.length === 0 ? `
                    <button onclick="openReviewModal('${p.freelancer}', ${p.index})" 
                            class="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition transform hover:-translate-y-0.5 whitespace-nowrap">
                        Add Review
                    </button>
                    ` : `
                    <button class="bg-gray-700 text-gray-400 px-6 py-2 rounded-lg text-sm font-bold cursor-not-allowed opacity-50">
                        Reviewed
                    </button>
                    `}
                </div>
            </div>
        `}).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p class='text-red-400 text-center'>Failed to sync with blockchain.</p>";
    }
}

// === MODAL LOGIC ===

window.openReviewModal = (freelancer, index) => {
    currentReviewData = { freelancer, index };
    document.getElementById('reviewModal').classList.remove('hidden');
};

window.closeReviewModal = () => {
    document.getElementById('reviewModal').classList.add('hidden');
    currentReviewData = null;
};

window.submitReview = async () => {
    if (!currentReviewData) return;

    const rating = document.getElementById('reviewRating').value;
    const comment = document.getElementById('reviewComment').value;
    const btn = document.querySelector('#reviewModal button[onclick="submitReview()"]');

    if (!rating || rating < 1 || rating > 5) {
        alert("Please enter a valid rating (1-5).");
        return;
    }

    // 1. Load function if missing
    if (typeof window.submitReviewOnChain !== 'function') {
        const mod = await import('/static/js/credchain.js');
        window.submitReviewOnChain = mod.submitReviewOnChain;
    }

    // 2. Disable UI
    const originalText = btn.innerText;
    btn.innerText = "Confirm in Wallet...";
    btn.disabled = true;

    try {
        // 3. Send Transaction via MetaMask
        const receipt = await window.submitReviewOnChain(
            currentReviewData.freelancer,
            currentReviewData.index,
            rating,
            comment
        );

        // 4. Success
        alert("Review Submitted Successfully!\nTx Hash: " + receipt.transactionHash);
        closeReviewModal();
        document.getElementById('reviewRating').value = '';
        document.getElementById('reviewComment').value = '';
        
        // Refresh the list to show the new review
        loadClientProjects();

    } catch (err) {
        console.error(err);
        if(err.message && err.message.includes("User denied")) {
            alert("Transaction rejected.");
        } else if (err.message && err.message.includes("Already reviewed")) {
             alert("You have already reviewed this project!");
        } else {
            alert("Review failed: " + err.message);
        }
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};