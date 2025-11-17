document.addEventListener("DOMContentLoaded", () => {
    // Get stored data
    const userRole = localStorage.getItem('userRole');
    const userWallet = localStorage.getItem('userWalletAddress'); 
    
    const navJobs = document.getElementById('nav-jobs');
    const navDashboard = document.getElementById('nav-dashboard');

    // Only run if nav elements exist
    if (navJobs && navDashboard) {

        // === SCENARIO 1: GUEST (Not Logged In) ===
        if (!userWallet) {
            // 1. Make sure the link is visible for guests (to entice them)
            navJobs.style.display = 'inline';
            navJobs.innerText = "JOBS";
            
            // 2. Block access when clicked
            const blockAccess = (event) => {
                event.preventDefault(); 
                alert("🔒 Login Required\n\nPlease connect your wallet or sign in to access this feature.");
                window.location.href = '/wallet-login'; 
            };

            navJobs.addEventListener('click', blockAccess);
            navDashboard.addEventListener('click', blockAccess);
            
            // Add lock icon to dashboard for visual cue
            navDashboard.innerHTML = 'DASHBOARD <ion-icon name="lock-closed-outline" class="text-xs mb-1"></ion-icon>';
        } 
        
        // === SCENARIO 2: LOGGED IN AS EMPLOYER ===
        else if (userRole === 'employer') {
            // === VISIBLE ===
            navJobs.style.display = 'inline'; 
            
            // Change text to "HIRE" and link to finding freelancers
            navJobs.innerText = "HIRE";
            navJobs.href = "/find-freelancers"; 
            
            // Point Dashboard to Employer Dashboard
            navDashboard.href = "/Edashboard";
        } 
        
        // === SCENARIO 3: LOGGED IN AS FREELANCER ===
        else {
            // === HIDDEN ===
            // Freelancers should not see this link
            navJobs.style.display = 'none'; 
            
            // Point Dashboard to Freelancer Dashboard
            navDashboard.href = "/Fdashboard";
        }
    }
});