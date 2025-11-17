document.addEventListener('DOMContentLoaded', () => {
    
    // Select the section we want to watch
    const featuresSection = document.querySelector('#features-section');
    
    // Create an Observer
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            
            // If the section is visible on screen
            if (entry.isIntersecting) {
                
                // 1. Animate the Header Text
                anime({
                    targets: ['.feature-title', '.feature-subtitle'],
                    translateY: [50, 0],
                    opacity: [0, 1],
                    duration: 1000,
                    delay: anime.stagger(200), // Delay between title and subtitle
                    easing: 'easeOutExpo'
                });

                // 2. Animate the Cards (Staggered from left to right)
                anime({
                    targets: '.feature-card',
                    translateY: [100, 0],
                    opacity: [0, 1],
                    duration: 1200,
                    delay: anime.stagger(200, {start: 500}), // Start after 500ms, then 200ms gap
                    easing: 'easeOutElastic(1, .6)' // Bouncy effect
                });

                // Stop observing after animation runs once
                observer.unobserve(featuresSection);
            }
        });
    }, {
        threshold: 0.2 // Trigger when 20% of the section is visible
    });

    // Start observing
    if(featuresSection) {
        observer.observe(featuresSection);
    }
});