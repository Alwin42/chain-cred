// Fdashboard.js
const rawAccount = localStorage.getItem('userWalletAddress'); 
const account = rawAccount ? rawAccount.toLowerCase() : null;

document.addEventListener('DOMContentLoaded', () => {
    if (!account) {
        alert("Please log in.");
        window.location.href = '/wallet-login'; 
        return; 
    }
    
    // Initial Load
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
            submitBtn.innerText = "Processing...";

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
                    
                    // Reload data & check badges
                    const newProjectCount = await loadDashboardData();
                    checkAndShowBadge(newProjectCount);

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

function checkAndShowBadge(count) {
    const milestones = [3, 5, 7, 10];
    if (milestones.includes(count)) {
        document.getElementById('milestone-count').innerText = count;
        document.getElementById('badgeModal').classList.remove('hidden');
    }
}

function displayBadges(count) {
    const container = document.getElementById('badges-container');
    const badgesConfig = [
        { milestone: 3,  file: 'badge1.png', label: 'Bronze' },
        { milestone: 5,  file: 'badge2.png', label: 'Silver' },
        { milestone: 7,  file: 'badge3.png', label: 'Gold' },
        { milestone: 10, file: 'badge4.png', label: 'Platinum' }
    ];

    let badgesHtml = '';
    badgesConfig.forEach(badge => {
        if (count >= badge.milestone) {
            badgesHtml += `
                <div class="flex flex-col items-center group relative">
                    <div class="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-800 border-2 border-yellow-500 flex items-center justify-center overflow-hidden shadow-lg hover:scale-110 transition duration-300 cursor-pointer" title="${badge.label} Badge">
                         <img src="/static/images/${badge.file}" alt="${badge.label}" class="w-full h-full object-cover">
                    </div>
                    <span class="text-xs text-yellow-400 mt-2 font-bold">${badge.milestone}+</span>
                </div>
            `;
        } else {
            badgesHtml += `
                <div class="flex flex-col items-center opacity-40 grayscale">
                    <div class="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center">
                        <ion-icon name="lock-closed" class="text-3xl text-gray-500"></ion-icon>
                    </div>
                    <span class="text-xs text-gray-500 mt-2">${badge.milestone}</span>
                </div>
            `;
        }
    });

    if (count < 3) {
        container.innerHTML = `<div class="col-span-4 text-light-muted text-sm text-center italic mb-4">Complete 3 projects to earn your first badge!</div>${badgesHtml}`;
    } else {
        container.innerHTML = badgesHtml;
    }
}

async function loadDashboardData() {
    const nameEl = document.getElementById('profile-name');
    const bioEl = document.getElementById('profile-bio');
    const avatarEl = document.getElementById('profile-avatar-initials');
    const skillsEl = document.getElementById('profile-skills');
    const socialsEl = document.getElementById('profile-socials');
    const projectsListEl = document.getElementById('projects-list');
    
    // The Loader Element
    const loader = document.getElementById('global-loader');

    let projectCount = 0;

    try {
        // Fetch parallel
        const [profileRes, projRes] = await Promise.all([
            fetch(`/get_profile/${account}`),
            fetch(`/get_all_projects/${account}`)
        ]);

        // 1. Handle Profile Data
        if (profileRes.ok) {
            const pdata = await profileRes.json();
            nameEl.innerText = pdata.name || "Unnamed";
            bioEl.innerText = pdata.bio || "No bio provided.";
            avatarEl.innerText = pdata.name ? pdata.name[0].toUpperCase() : "-";
            
            if (pdata.skills && pdata.skills.length > 0) {
                skillsEl.innerHTML = pdata.skills.map(s => 
                    `<span class="bg-primary-dark text-blue-300 text-xs font-semibold px-2 py-1 rounded border border-gray-600">${s}</span>`
                ).join('');
            } else {
                skillsEl.innerHTML = '<span class="text-xs text-gray-500 italic">No skills added</span>';
            }

            let socialsHtml = '';
            if (pdata.github) {
                socialsHtml += `<a href="${pdata.github}" target="_blank" class="text-gray-400 hover:text-white transition text-2xl"><ion-icon name="logo-github"></ion-icon></a>`;
            }
            if (pdata.linkedin) {
                socialsHtml += `<a href="${pdata.linkedin}" target="_blank" class="text-blue-500 hover:text-blue-400 transition text-2xl"><ion-icon name="logo-linkedin"></ion-icon></a>`;
            }
            socialsEl.innerHTML = socialsHtml;

            if (pdata.email) {
                document.getElementById('contact-email').classList.remove('hidden');
                document.getElementById('val-email').innerText = pdata.email;
            }
            if (pdata.phone) {
                document.getElementById('contact-phone').classList.remove('hidden');
                document.getElementById('val-phone').innerText = pdata.phone;
            }

        } else {
            nameEl.innerText = "Profile Not Found";
        }

        // 2. Handle Projects Data
        if (projRes.ok) {
            const data = await projRes.json();
            const projects = data.projects || [];
            projectCount = projects.length;
            
            displayBadges(projectCount);
            
            if(projects.length > 0) {
                projectsListEl.innerHTML = projects.map((p) => `
                    <div class="bg-primary-dark border border-gray-700 rounded-lg p-6 mb-4 hover:border-blue-500 transition duration-300">
                        <h4 class="text-xl font-bold text-white">${p.projectName}</h4>
                        <p class="text-light-muted text-sm mt-1">${p.description}</p>
                        <div class="flex flex-wrap gap-2 mt-3">
                            <span class="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded">${p.languages}</span>
                            <span class="text-xs ${p.verified ? 'bg-green-900 text-green-200' : 'bg-yellow-900 text-yellow-200'} px-2 py-1 rounded">
                                ${p.verified ? "Verified" : "Pending"}
                            </span>
                            <a href="${p.link}" target="_blank" class="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded hover:bg-gray-600">View Code</a>
                        </div>
                    </div>
                `).join('');
            } else {
                projectsListEl.innerHTML = `<p class="text-light-muted text-center italic">No projects found on-chain.</p>`;
            }
        }
    } catch(err) {
        console.error("Dashboard Load Error:", err);
    } finally {
        // === HIDE LOADER ===
        // This runs after data is fetched (or if error occurs)
        if(loader) {
            // Add fade-out classes
            loader.classList.add('opacity-0', 'pointer-events-none');
            // Remove from DOM after transition
            setTimeout(() => loader.remove(), 500);
        }
    }

    return projectCount;
}