document.addEventListener('DOMContentLoaded', () => {

    // --- 1. Select All Elements ---
    const roleRadios = document.querySelectorAll('input[name="role"]');
    const employerForm = document.getElementById('employerForm');
    const freelancerSection = document.getElementById('freelancerSection');
    const freelancerForm = document.getElementById('freelancerForm');
    const connectWalletBtn = document.getElementById('connectWalletBtn');
    const loginForm = document.getElementById('loginForm');
    const verify = document.getElementById('verify');
    const profileLinkInput = document.getElementById('profileLink');

    // --- 2. Page-Level Variable ---
    // This will store the user's wallet address after they connect
    let account;

    // --- 3. Helper Functions ---

    /**
     * Gets all required input fields from a specific form section.
     */
    function getRequiredInputs(formSection) {
        if (!formSection) return [];
        return formSection.querySelectorAll('input[required], select[required], textarea[required]');
    }

    /**
     * Checks if all required fields in the *visible* form are filled.
     * This enables/disables the "Connect Wallet" button.
     */
    function checkFormValidity() {
        let currentFormInputs;

        // Check which form is active
        if (employerForm && !employerForm.classList.contains('hidden')) {
            currentFormInputs = getRequiredInputs(employerForm);
        } else if (freelancerForm && !freelancerSection.classList.contains('hidden')) {
            currentFormInputs = getRequiredInputs(freelancerForm);
        } else {
            currentFormInputs = [];
        }

        let allFieldsFilled = true;
        currentFormInputs.forEach(input => {
            if (input.value.trim() === '' || (input.type === 'email' && !input.checkValidity())) {
                allFieldsFilled = false;
            }
        });

        // Enable/disable the Connect Wallet button
        if (connectWalletBtn) {
            connectWalletBtn.disabled = !allFieldsFilled;
        }
    }

    // --- 4. Event Listeners ---

    /**
     * Event listener for role selection (Employer/Freelancer).
     * This toggles which form is visible and which fields are 'required'.
     */
    roleRadios.forEach(radio => {
        radio.addEventListener('change', (event) => {
            const employerInputs = getRequiredInputs(employerForm);
            const freelancerInputs = getRequiredInputs(freelancerForm);

            if (event.target.value === 'employer') {
                employerForm.classList.remove('hidden');
                freelancerSection.classList.add('hidden');

                // Make employer fields required, and freelancer fields not required
                employerInputs.forEach(input => input.required = true);
                freelancerInputs.forEach(input => input.required = false);

            } else {
                freelancerSection.classList.remove('hidden');
                employerForm.classList.add('hidden');

                // Make freelancer fields required, and employer fields not required
                employerInputs.forEach(input => input.required = false);
                freelancerInputs.forEach(input => input.required = true);
            }
            // Re-check validity when form switches
            checkFormValidity();
        });
    });

    /**
     * Event listener for real-time validation as the user types.
     */
    if (loginForm) {
        loginForm.addEventListener('input', checkFormValidity);
    }

    /**
     * Event listener for the "Connect Wallet" button.
     */
    if (connectWalletBtn) {
        connectWalletBtn.addEventListener('click', async () => {
            if (!window.connectWallet) {
                alert("Error: credchain.js module not loaded");
                return;
            }

            try {
                // Call the connectWallet function from credchain.js
                const addr = await window.connectWallet();
                account = addr; // Save the account for use in "Verify" and "Login"
                
                console.log("Wallet connected:", account);
                
                // Update the UI
                connectWalletBtn.textContent = "Wallet Connected!";
                connectWalletBtn.style.backgroundColor = '#059669'; // Green color

            } catch (e) {
                console.error("connect error:", e);
                alert("Connection failed: " + e.message);
                connectWalletBtn.textContent = "Connection Failed";
                connectWalletBtn.style.backgroundColor = '#DC2626'; // Red color
            }
        });
    }

    /**
     * Event listener for the GitHub "Verify" button.
     */
    if (verify) {
        verify.addEventListener('click', async () => {
            if (!account) {
                alert("Please connect your wallet first.");
                return;
            }
            if (!window.verifyUserOnChain) {
                alert("Error: verifyUserOnChain function not loaded.");
                return;
            }

            const link = profileLinkInput.value;
            
            // 1. Call backend to validate the link
            const backendRes = await fetch("http://localhost:5000/verifyuser", {
                method: "POST",
                headers: {"Content-Type":"application/json"},
                body: JSON.stringify({wallet: account,  profile_link: link})
            });

            const backendData = await backendRes.json();

            if (!backendData.valid) {
                alert("GitHub validation failed: " + backendData.reason);
                return;
            }

            // 2. If backend is happy, call the smart contract
            alert("Backend verification successful! Please confirm the transaction on-chain.");
            
            try {
                const { wallet, tx } = await window.verifyUserOnChain();
                console.log("Verified wallet:", wallet);
                alert("Verified On Chain!\nWallet: " + wallet + "\nTx: " + tx.transactionHash);
                
                // Update UI
                verify.textContent = "Verified!";
                verify.disabled = true;

            } catch (err) {
                console.error("On-chain verification error:", err);
                alert("On-chain verification failed: " + err.message);
            }
        });
    } else {
        // This is normal if the verify button isn't on the page (e.g., employer form)
        console.log("Verify button not found (this is OK if employer is selected).");
    }

    /**
     * Event listener for the final "Login" button (form submission).
     */
    if (loginForm) {
        loginForm.addEventListener('submit', async (event) => {
            event.preventDefault(); // Stop the form from reloading the page

            if (!account) { 
                alert('Please connect your wallet first!');
                return;
            }

            const formData = new FormData(loginForm);
            const data = Object.fromEntries(formData.entries());
            data.wallet = account; // Add the connected wallet to the form data

            const selectedRole = document.querySelector('input[name="role"]:checked').value;

            // --- FREELANCER LOGIN LOGIC ---
            if (selectedRole === 'freelancer') {
                try {
                    const profileData = {
                        wallet: data.wallet,
                        name: data.freelancerName,
                        linkedin: data.freelancerLinkedIn,
                        skills: data.skills.split(',').map(s => s.trim()), // Convert string to array
                        email: data.emailAddress,
                        phone: data.phoneNumber
                    };

                    const response = await fetch('http://localhost:5000/create_profile', {
                        method: 'POST',
                        headers: {'Content-Type': 'application/json'},
                        body: JSON.stringify(profileData)
                    });

                    const result = await response.json();

                    if (response.ok) {
                        alert('Profile saved successfully! Redirecting to your dashboard.');
                        // Save the wallet to browser storage for the dashboard to use
                        localStorage.setItem('userWalletAddress', account);
                        // Redirect to the Freelancer dashboard
                        window.location.href = '/Fdashboard'; 
                    } else {
                        // Show error from the backend
                        alert('Error saving profile: ' + (result.error || 'Unknown error'));
                    }

                } catch (err) {
                    // Show network/fetch error
                    console.error('Freelancer login error:', err);
                    alert('A frontend error occurred. Check the console.');
                }

            // --- EMPLOYER LOGIN LOGIC ---
            } else if (selectedRole === 'employer') {
                
                // (In the future, you would add a fetch() call here to save employer data)
                
                alert('Employer login successful! Redirecting to your dashboard.');
                // Save the wallet to browser storage for the dashboard to use
                localStorage.setItem('userWalletAddress', account);
                // Redirect to the Employer dashboard
                window.location.href = '/Edashboard';
            }
        });
    }

    // --- 5. Initial Page Load Logic ---

    // Run the role check once on load to set the correct 'required' fields
    const checkedRole = document.querySelector('input[name="role"]:checked');
    if (checkedRole) {
        checkedRole.dispatchEvent(new Event('change'));
    }
    
    // Run the validity check once on load
    checkFormValidity();

});