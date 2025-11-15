// This script runs when the dashboard.html page is loaded.

// Get the real account from localStorage (set during login)
const account = localStorage.getItem('userWalletAddress'); 

document.addEventListener('DOMContentLoaded', () => {
    
    // If no account is found, the user is not logged in.
    if (!account) {
        alert("Please log in to view your dashboard.");
        // Redirect them back to the login page
        window.location.href = '/wallet-login'; // Use wallet-login for simple login
        return; // Stop running the rest of the script
    }
    
    // Load the profile and projects as soon as the page loads
    loadDashboardData();

    // === NEW LOGOUT LOGIC ===
    const logoutButton = document.getElementById('logoutBtn');
    
    if (logoutButton) {
        logoutButton.addEventListener('click', () => {
            alert("Disconnecting wallet and logging out.");
            
            // 1. Remove the wallet address from storage
            localStorage.removeItem('userWalletAddress');
            
            // 2. Redirect to the login page
            window.location.href = '/wallet-login'; // Redirect to the simple login page
        });
    }
    // === END OF NEW LOGIC ===
});

/**
 * Fetches profile and project data from the backend and populates the dashboard.
 */
async function loadDashboardData() {
    // Target all the elements we need to fill
    const avatarInitialsEl = document.getElementById('profile-avatar-initials');
    const nameEl = document.getElementById('profile-name');
    const bioEl = document.getElementById('profile-bio');
    const emailEl = document.getElementById('profile-email');
    const phoneEl = document.getElementById('profile-phone');
    const skillsListEl = document.getElementById('profile-skills-list');
    const projectsListEl = document.getElementById('projects-list');

    try {
        // --- 1. Load Profile ---
        if (typeof account === 'undefined' || !account) {
            throw new Error("User account is not defined.");
        }
        
        const profileResponse = await fetch(`http://localhost:5000/get_profile/${account}`);
        
        if (!profileResponse.ok) {
            throw new Error(`Profile not found (404). Have you saved it?`);
        }
        const pdata = await profileResponse.json();

        // Populate Profile Card
        const initials = pdata.name ? pdata.name.split(' ').map(n => n[0]).join('') : '--';
        avatarInitialsEl.innerText = initials.substring(0, 2).toUpperCase();
        
        nameEl.innerText = pdata.name || "Unnamed Profile";
        bioEl.innerText = pdata.bio || "No bio provided.";
        emailEl.innerText = pdata.email || "-";
        phoneEl.innerText = pdata.phone || "-";

        // Populate Skills
        if (pdata.skills && pdata.skills.length > 0) {
            skillsListEl.innerHTML = pdata.skills
                .map(skill => `<span class="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">${skill}</span>`)
                .join(' ');
        } else {
            skillsListEl.innerHTML = `<span class="text-light-muted text-xs">No skills listed.</span>`;
        }

        // --- 2. Load Projects ---
        
        const projectsResponse = await fetch(`http://localhost:5000/get_all_projects/${account}`);
        
        if (!projectsResponse.ok) {
            throw new Error(`HTTP error! status: ${projectsResponse.status}`);
        }
        
        const projectsData = await projectsResponse.json();
        const projects = projectsData.projects; 

        // Populate Projects List
        if (projects && projects.length > 0) {
            projectsListEl.innerHTML = projects
                .map(project => createProjectCardHTML(project))
                .join('');
        } else {
            projectsListEl.innerHTML = `<p class="text-light-muted">No projects added yet.</p>`;
        }

    } catch (error) {
        console.error("Error loading dashboard data:", error);
        
        if (projectsListEl) {
            projectsListEl.innerHTML = `<p class="text-red-400">Could not load projects. ${error.message}</p>`;
        }
        if (nameEl) {
            nameEl.innerText = "Error Loading Profile";
        }
        if (bioEl) {
            bioEl.innerText = error.message; // Show the real error
        }
    }
}

/**
 * Helper function to create the HTML for a single project card.
 * @param {object} project - The project data object from get_all_projects
 */
function createProjectCardHTML(project) {
    
    const p = {
        title: project.projectName || "Untitled Project",
        description: project.description || "No description.",
        tags: project.languages ? project.languages.split(',') : [], 
        status: project.verified ? "Verified" : "Pending",
        link: project.link || "#"
    };

    const statusColor = p.status.toLowerCase() === 'verified' 
        ? 'text-green-400 bg-green-900/50' 
        : 'text-yellow-400 bg-yellow-900/50';

    const tagsHTML = p.tags
        .map(tag => `<span class="bg-blue-600 text-white text-xs font-semibold px-3 py-1 rounded-full">${tag.trim()}</span>`)
        .join(' ');

    return `
    <div class="bg-primary-dark border border-gray-700 rounded-lg p-6 flex flex-col sm:flex-row gap-6 hover:border-blue-500 transition duration-300 ease-in-out">
        <div class="flex-grow">
            <h4 class="text-xl font-bold text-white">${p.title}</h4>
            <p class="text-light-muted text-sm mt-2 mb-4">${p.description}</p>
            <div class="flex flex-wrap gap-2">
                ${tagsHTML}
            </div>
        </div>
        <div class="flex-shrink-0 flex flex-col sm:items-end justify-between gap-4">
            <span class="text-xs font-semibold px-3 py-1 rounded-full ${statusColor}">${p.status}</span>
            <a href="${p.link}" class="text-blue-400 hover:text-blue-300 font-semibold" target="_blank" rel="noopener noreferrer">
                View Details &rarr;
            </a>
        </div>
    </div>
    `;
}