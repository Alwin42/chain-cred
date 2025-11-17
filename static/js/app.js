document.addEventListener("DOMContentLoaded", () => {
    // Get stored data
    const userRole = localStorage.getItem('userRole');
    const userWallet = localStorage.getItem('userWalletAddress'); // Check if wallet is connected
    
    const navJobs = document.getElementById('nav-jobs');
    const navDashboard = document.getElementById('nav-dashboard');

    // Only run if nav elements exist
    if (navJobs && navDashboard) {

        // === SCENARIO 1: GUEST (Not Logged In) ===
        if (!userWallet) {
            // Define a function to handle guest clicks
            const blockAccess = (event) => {
                event.preventDefault(); // STOP the link from opening
                alert("🔒 Login Required\n\nPlease connect your wallet or sign in to access Jobs and Dashboards.");
                window.location.href = '/wallet-login'; // Redirect to login page
            };

            // Attach this blocking function to both links
            navJobs.addEventListener('click', blockAccess);
            navDashboard.addEventListener('click', blockAccess);
            
            // Optional: Visually indicate they are locked (e.g., add a lock icon)
            navDashboard.innerHTML = 'DASHBOARD <ion-icon name="lock-closed-outline" class="text-xs mb-1"></ion-icon>';
        } 
        
        // === SCENARIO 2: LOGGED IN AS EMPLOYER ===
        else if (userRole === 'employer') {
            // Change "JOBS" to "HIRE" and link to find freelancers
            navJobs.innerText = "HIRE";
            navJobs.href = "/find-freelancers"; 
            
            // Point Dashboard to Employer Dashboard
            navDashboard.href = "/Edashboard";
        } 
        
        // === SCENARIO 3: LOGGED IN AS FREELANCER (Default) ===
        else {
            // Keep "JOBS" pointing to job board
            navJobs.innerText = "JOBS";
            navJobs.href = "/Jobs"; 
            
            // Point Dashboard to Freelancer Dashboard
            navDashboard.href = "/Fdashboard";
        }
    }
});