// Fdashboard.js
const rawAccount = localStorage.getItem('userWalletAddress'); 
const account = rawAccount ? rawAccount.toLowerCase() : null;

document.addEventListener('DOMContentLoaded', () => {
    if (!account) {
        alert("Please log in.");
        window.location.href = '/wallet-login'; 
        return; 
    }
    loadDashboardData();

    // Logout Logic
    const logoutBtn = document.getElementById('logoutBtn');
    if(logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            if(confirm("Disconnect wallet?")) {
                localStorage.removeItem('userWalletAddress');
                window.location.href = '/wallet-login';
            }
        });
    }

    // Submit Project Logic
    const projectForm = document.getElementById('projectForm');
    if(projectForm) {
        projectForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = projectForm.querySelector('button[type="submit"]');
            submitBtn.disabled = true;
            submitBtn.innerText = "Processing Transaction...";

            const body = {
                wallet: account,
                name: document.getElementById('proj_name').value,
                description: document.getElementById('proj_desc').value,
                languages: document.getElementById('proj_lang').value,
                link: document.getElementById('proj_link').value,
                client: document.getElementById('proj_client').value
            };

            try {
                const res = await fetch('/submit_project', {
                    method: 'POST',
                    headers: {'Content-Type': 'application/json'},
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                
                if(data.status === "success") {
                    alert("Project Added Successfully!\nTx Hash: " + data.tx_hash);
                    document.getElementById('submitProjectModal').classList.add('hidden');
                    projectForm.reset();
                    loadDashboardData(); // Refresh list
                } else {
                    alert("Error: " + data.error);
                }
            } catch(err) {
                alert("Submission failed: " + err.message);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerText = "Submit On-Chain";
            }
        });
    }
});

async function loadDashboardData() {
    const nameEl = document.getElementById('profile-name');
    const bioEl = document.getElementById('profile-bio');
    const avatarEl = document.getElementById('profile-avatar-initials');
    const projectsListEl = document.getElementById('projects-list');

    try {
        // 1. Load Profile
        const profileRes = await fetch(`/get_profile/${account}`);
        if(profileRes.ok) {
            const pdata = await profileRes.json();
            nameEl.innerText = pdata.name || "Unnamed";
            bioEl.innerText = pdata.bio || "No bio";
            const initials = pdata.name ? pdata.name[0].toUpperCase() : "-";
            avatarEl.innerText = initials;
        } else {
            nameEl.innerText = "Profile Not Found";
        }

        // 2. Load Projects (using new routes.py endpoint)
        const projRes = await fetch(`/get_all_projects/${account}`);
        if(projRes.ok) {
            const data = await projRes.json();
            const projects = data.projects || [];
            
            if(projects.length > 0) {
                projectsListEl.innerHTML = projects.map((p, index) => `
                    <div class="bg-primary-dark border border-gray-700 rounded-lg p-6 mb-4">
                        <h4 class="text-xl font-bold text-white">${p.projectName}</h4>
                        <p class="text-light-muted text-sm mt-1">${p.description}</p>
                        <div class="flex gap-2 mt-3">
                            <span class="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">${p.languages}</span>
                            <span class="text-xs bg-gray-800 text-gray-400 px-2 py-1 rounded">${p.verified ? "Verified" : "Pending"}</span>
                        </div>
                    </div>
                `).join('');
            } else {
                projectsListEl.innerHTML = `<p class="text-light-muted">No projects found on-chain.</p>`;
            }
        }
    } catch(err) {
        console.error(err);
    }
}