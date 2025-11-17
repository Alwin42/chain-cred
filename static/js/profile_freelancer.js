document.addEventListener('DOMContentLoaded', async () => {
    const targetWallet = document.getElementById('targetWallet').value;
    
    if (!targetWallet) {
        alert("No wallet address provided.");
        window.location.href = '/';
        return;
    }

    console.log("Loading profile for:", targetWallet);

    try {
        // 1. Fetch Profile JSON (Name, Bio - Off Chain)
        const profileRes = await fetch(`/get_profile/${targetWallet}`);
        if (profileRes.ok) {
            const profile = await profileRes.json();
            renderProfileInfo(profile, targetWallet);
        } else {
            document.getElementById('p-name').innerText = "Profile Not Found";
        }

        // 2. Fetch Projects (Directly from Blockchain via credchain.js)
        // We use the window function exposed by credchain.js
        if (typeof window.getAllProjectsFromChain !== 'function') {
            // Dynamic import fallback if module isn't ready instantly
            const mod = await import('/static/js/credchain.js');
            window.getAllProjectsFromChain = mod.getAllProjectsFromChain;
            window.getProjectReviewsFromChain = mod.getProjectReviewsFromChain;
        }

        const projects = await window.getAllProjectsFromChain(targetWallet);
        
        renderBadges(projects.length);
        await renderProjects(projects, targetWallet);

    } catch (err) {
        console.error("Error loading profile:", err);
        document.getElementById('p-projects-list').innerHTML = `<p class="text-red-400 text-center">Error loading blockchain data.</p>`;
    }
});

function renderProfileInfo(profile, wallet) {
    document.getElementById('p-name').innerText = profile.name || "Unnamed";
    document.getElementById('p-wallet').innerText = wallet.substring(0, 6) + "..." + wallet.substring(wallet.length - 4);
    document.getElementById('p-bio').innerText = profile.bio || "No bio provided.";
    document.getElementById('p-avatar').innerText = profile.name ? profile.name.charAt(0).toUpperCase() : "-";

    // Skills
    const skillsContainer = document.getElementById('p-skills');
    if (profile.skills && profile.skills.length > 0) {
        skillsContainer.innerHTML = profile.skills.map(s => 
            `<span class="bg-blue-900/40 text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-blue-800">${s}</span>`
        ).join('');
    } else {
        skillsContainer.innerHTML = `<span class="text-xs text-gray-500">No skills listed</span>`;
    }

    // Contact Info
    if (profile.email) {
        document.getElementById('contact-email').classList.remove('hidden');
        document.getElementById('val-email').innerText = profile.email;
    }
    if (profile.phone) {
        document.getElementById('contact-phone').classList.remove('hidden');
        document.getElementById('val-phone').innerText = profile.phone;
    }

    // Social Links
    if (profile.github) {
        const gh = document.getElementById('link-github');
        gh.href = profile.github;
        gh.classList.remove('hidden');
    }
    if (profile.linkedin) {
        const li = document.getElementById('link-linkedin');
        li.href = profile.linkedin;
        li.classList.remove('hidden');
    }
}

function renderBadges(count) {
    const container = document.getElementById('p-badges');
    const milestones = [3, 5, 7, 10];
    
    let html = '';
    milestones.forEach(m => {
        const isUnlocked = count >= m;
        
        // Use actual images if available, else icons
        html += `
        <div class="flex flex-col items-center group relative">
             <div class="w-12 h-12 rounded-full bg-gray-800 border-2 ${isUnlocked ? 'border-yellow-500' : 'border-gray-600'} flex items-center justify-center overflow-hidden shadow-lg">
                 ${isUnlocked ? 
                   `<img src="/static/images/badge${m}.png" class="w-full h-full object-cover">` : 
                   `<ion-icon name="lock-closed" class="text-gray-500 text-lg"></ion-icon>`
                 }
            </div>
            <span class="text-[10px] ${isUnlocked ? 'text-yellow-400' : 'text-gray-500'} mt-1">${m}+ Projs</span>
        </div>`;
    });
    container.innerHTML = html;
}

async function renderProjects(projects, wallet) {
    const container = document.getElementById('p-projects-list');
    
    if (projects.length === 0) {
        container.innerHTML = `<div class="text-center text-gray-500 py-10">No verified projects found on-chain.</div>`;
        return;
    }

    container.innerHTML = ""; 

    for (const [index, p] of projects.entries()) {
        // Create Card Container
        const card = document.createElement('div');
        card.className = "bg-primary-dark border border-gray-600 rounded-xl p-6 hover:border-blue-500 transition duration-300";
        
        card.innerHTML = `
            <div class="flex justify-between items-start mb-3">
                <h3 class="text-xl font-bold text-white">${p.projectName}</h3>
                <span class="px-3 py-1 rounded text-xs font-bold ${p.verified ? 'bg-green-900 text-green-300' : 'bg-yellow-900 text-yellow-300'}">
                    ${p.verified ? 'Verified' : 'Pending'}
                </span>
            </div>
            
            <p class="text-gray-300 text-sm mb-4">${p.description}</p>
            
            <div class="flex flex-wrap gap-2 mb-4">
                <span class="text-xs bg-gray-800 text-blue-300 px-2 py-1 rounded border border-gray-600">${p.languages}</span>
                <a href="${p.link}" target="_blank" class="text-xs bg-gray-800 text-gray-300 px-2 py-1 rounded border border-gray-600 hover:bg-gray-700 flex items-center gap-1">
                    <ion-icon name="link"></ion-icon> Source
                </a>
            </div>

            <div class="mt-4 pt-4 border-t border-gray-700">
                <h4 class="text-sm font-bold text-gray-400 mb-2 flex items-center">
                    <ion-icon name="star" class="text-yellow-500 mr-1"></ion-icon> Reviews
                </h4>
                <div id="reviews-${index}" class="space-y-2">
                    <div class="animate-pulse text-xs text-gray-600">Fetching reviews from chain...</div>
                </div>
            </div>
        `;
        
        container.appendChild(card);

        // Fetch Reviews for this specific project from Chain
        loadReviewsForProject(wallet, index, `reviews-${index}`);
    }
}

async function loadReviewsForProject(wallet, index, elementId) {
    const container = document.getElementById(elementId);
    try {
        // CALL BLOCKCHAIN DIRECTLY via credchain.js
        const reviews = await window.getProjectReviewsFromChain(wallet, index);

        if (reviews.length === 0) {
            container.innerHTML = `<div class="text-xs text-gray-500 italic">No reviews submitted yet.</div>`;
            return;
        }

        container.innerHTML = reviews.map(r => `
            <div class="bg-gray-800/50 p-3 rounded-lg border border-gray-700">
                <div class="flex justify-between items-center mb-1">
                    <span class="text-xs font-mono text-blue-400" title="${r.reviewer}">Client: ${r.reviewer.substring(0,6)}...</span>
                    <div class="flex text-yellow-500 text-xs">
                        ${"★".repeat(Number(r.rating))}${"☆".repeat(5-Number(r.rating))}
                    </div>
                </div>
                <p class="text-sm text-gray-300 italic">"${r.commentHash}"</p>
            </div>
        `).join('');

    } catch (err) {
        console.error(`Error loading reviews for project ${index}:`, err);
        container.innerHTML = `<div class="text-xs text-red-400">Failed to load reviews.</div>`;
    }
}