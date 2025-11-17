// employer_dashboard.js
const rawAccount = localStorage.getItem('userWalletAddress');
const account = rawAccount ? rawAccount.toLowerCase() : null;
let currentReviewData = null; 

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
        // This ensures the loader stays until BOTH profile and projects are ready
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
            compEl.innerText = "Please click 'Edit Profile'";
        }
    } catch (err) {
        console.error("Error fetching profile:", err);
        nameEl.innerText = "Error loading profile";
    }
}

/**
 * Fetches projects assigned to this client wallet
 */
async function loadClientProjects() {
    const container = document.getElementById('client-projects-list');
    try {
        const res = await fetch(`/get_projects_for_client/${account}`);
        const projects = await res.json();

        if (projects.length === 0) {
            container.innerHTML = "<p class='text-light-muted italic'>No projects found assigned to this wallet.</p>";
            return;
        }

        container.innerHTML = projects.map((p) => `
            <div class="bg-primary-dark border border-gray-600 rounded-lg p-6 flex flex-col sm:flex-row justify-between items-start gap-4 hover:border-blue-500 transition duration-200">
                <div class="flex-grow">
                    <h4 class="text-lg font-bold text-white">${p.projectName}</h4>
                    <p class="text-light-muted text-sm mb-2">${p.description}</p>
                    
                    <div class="flex flex-wrap gap-4 mt-2">
                        <p class="text-xs text-blue-300 bg-blue-900/30 px-2 py-1 rounded">
                            <ion-icon name="person-outline" class="align-middle"></ion-icon>
                            <span class="font-mono ml-1">${p.freelancer}</span>
                        </p>
                        <p class="text-xs text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            <ion-icon name="link-outline" class="align-middle"></ion-icon>
                            Link: <a href="${p.link}" target="_blank" class="hover:text-white hover:underline">View Project</a>
                        </p>
                    </div>
                </div>
                <button onclick="openReviewModal('${p.freelancer}', ${p.index})" 
                        class="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg text-sm font-bold shadow-lg transition transform hover:-translate-y-0.5">
                    Review
                </button>
            </div>
        `).join('');

    } catch (err) {
        console.error(err);
        container.innerHTML = "<p class='text-red-400'>Error loading projects. Ensure backend is running.</p>";
    }
}

// === MODAL LOGIC (Unchanged) ===

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

    const originalText = btn.innerText;
    btn.innerText = "Submitting...";
    btn.disabled = true;

    const body = {
        freelancer: currentReviewData.freelancer,
        project_index: currentReviewData.index,
        rating: rating,
        comment_hash: comment 
    };

    try {
        const res = await fetch('/submit_review', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();

        if (data.status === "success") {
            alert("Review Submitted Successfully!\nTx Hash: " + data.tx_hash);
            closeReviewModal();
            document.getElementById('reviewRating').value = '';
            document.getElementById('reviewComment').value = '';
        } else {
            alert("Error: " + data.error);
        }
    } catch (err) {
        alert("Review failed: " + err.message);
    } finally {
        btn.innerText = originalText;
        btn.disabled = false;
    }
};