document.addEventListener('DOMContentLoaded', () => {
    const grid = document.getElementById('freelancer-results-grid');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-button');

    let allFreelancers = []; 

    // 1. Fetch Data on Load
    fetchFreelancers();

    async function fetchFreelancers() {
        try {
            const res = await fetch('/get_all_freelancers');
            if (!res.ok) throw new Error("Failed to fetch data");
            
            allFreelancers = await res.json();
            renderCards(allFreelancers);

        } catch (err) {
            console.error(err);
            grid.innerHTML = `<div class="col-span-full text-center text-red-400">Failed to load profiles. Please try again later.</div>`;
        }
    }

    // 2. Render Cards
    function renderCards(freelancers) {
        grid.innerHTML = ""; 

        if (freelancers.length === 0) {
            grid.innerHTML = `<div class="col-span-full text-center text-light-muted">No freelancers found matching your criteria.</div>`;
            return;
        }

        freelancers.forEach(f => {
            // --- 1. Skills HTML ---
            const skillsHtml = f.skills.map(skill => 
                `<span class="bg-primary-dark text-blue-300 text-xs font-semibold px-3 py-1 rounded-full border border-gray-700">${skill}</span>`
            ).join('');

            // --- 2. Social Buttons ---
            let socialButtons = '';
            if (f.github && f.github.includes('http')) {
                socialButtons += `
                    <a href="${f.github}" target="_blank" class="flex items-center justify-center w-10 h-10 rounded-full bg-gray-800 hover:bg-gray-700 text-white transition" title="GitHub">
                        <ion-icon name="logo-github" class="text-xl"></ion-icon>
                    </a>`;
            }
            if (f.linkedin && f.linkedin.includes('http')) {
                socialButtons += `
                    <a href="${f.linkedin}" target="_blank" class="flex items-center justify-center w-10 h-10 rounded-full bg-blue-700 hover:bg-blue-600 text-white transition" title="LinkedIn">
                        <ion-icon name="logo-linkedin" class="text-xl"></ion-icon>
                    </a>`;
            }

            // --- 3. Contact Info (Text) ---
            let contactInfoHtml = '';
            if ((f.email && f.email.trim()) || (f.phone && f.phone.trim())) {
                contactInfoHtml += `<div class="mt-4 space-y-2 border-t border-gray-700 pt-3">`;
                if (f.email && f.email.trim()) {
                    contactInfoHtml += `
                        <div class="flex items-center gap-2 text-sm text-gray-300">
                            <ion-icon name="mail-outline" class="text-red-400 text-lg"></ion-icon>
                            <span class="truncate">${f.email}</span>
                        </div>`;
                }
                if (f.phone && f.phone.trim()) {
                    contactInfoHtml += `
                        <div class="flex items-center gap-2 text-sm text-gray-300">
                            <ion-icon name="call-outline" class="text-green-400 text-lg"></ion-icon>
                            <span>${f.phone}</span>
                        </div>`;
                }
                contactInfoHtml += `</div>`;
            }

            // --- 4. Card HTML with Verified Badge ---
            const card = document.createElement('div');
            card.className = "bg-primary rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col h-full transition duration-300 ease-in-out hover:border-blue-500 hover:-translate-y-1";
            
            card.innerHTML = `
                <div class="p-6">
                    <div class="flex items-center gap-3 mb-3">
                        <div class="w-10 h-10 rounded-full bg-primary-dark flex items-center justify-center text-blue-400 font-bold text-lg border border-gray-600">
                            ${f.name.charAt(0).toUpperCase()}
                        </div>
                        <span class="text-sm font-medium text-blue-400 truncate w-full">
                            ${f.wallet.substring(0, 6)}...${f.wallet.substring(f.wallet.length - 4)}
                        </span>
                    </div>

                    <div class="flex items-center gap-2 mb-1">
                        <h3 class="text-2xl font-bold text-white truncate">${f.name}</h3>
                        <ion-icon name="checkmark-circle" class="text-blue-500 text-xl" title="Verified Developer"></ion-icon>
                    </div>
                    
                    <p class="text-xs text-gray-500 mb-3">Verified Builder</p>
                </div>

                <div class="px-6 pb-6 flex-grow">
                    <p class="text-light-muted text-sm line-clamp-3 mb-4">
                        ${f.bio || "No bio provided."}
                    </p>

                    <div class="mb-2">
                        <h4 class="text-xs font-semibold text-gray-500 uppercase mb-2">Skills</h4>
                        <div class="flex flex-wrap gap-2">
                            ${skillsHtml || '<span class="text-xs text-gray-500">No skills listed</span>'}
                        </div>
                    </div>

                    ${contactInfoHtml}
                </div>

                <div class="p-6 mt-auto border-t border-gray-700 bg-primary-dark/30 flex items-center justify-between">
                    <div class="flex gap-2">
                        ${socialButtons}
                    </div>
                    <a href="/profile/${f.wallet}" class="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-semibold transition">
                        View Profile
                    </a>
                </div>
            `;

            grid.appendChild(card);
        });
    }

    // 3. Search Filtering
    function filterFreelancers() {
        const query = searchInput.value.toLowerCase();
        const filtered = allFreelancers.filter(f => {
            const nameMatch = f.name.toLowerCase().includes(query);
            const skillMatch = f.skills.some(s => s.toLowerCase().includes(query));
            return nameMatch || skillMatch;
        });
        renderCards(filtered);
    }

    searchInput.addEventListener('keyup', filterFreelancers);
    searchBtn.addEventListener('click', filterFreelancers);
});