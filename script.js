let scene, camera, renderer, sphere;
let videoElement;

// Initialize the application
function init() {
    // Hide permission prompt
    document.getElementById('permissionPrompt').classList.add('hidden');
    
    // Set up Three.js scene
    setupScene();
    
    // Set up camera feed
    setupCameraFeed();
    
    // Set up controls
    setupControls();
    
    // Handle window resize
    window.addEventListener('resize', onWindowResize);
}

function setupScene() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').prepend(renderer.domElement);
    
    // Load 360 image
    const texture = new THREE.TextureLoader().load('images/Panorama 7D6346.jpg');
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1); // Flip inside out
    
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.5
    });
    
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    // Start animation loop
    animate();
}

function setupCameraFeed() {
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(function(stream) {
            videoElement.srcObject = stream;
            videoElement.play();
            
            const videoTexture = new THREE.VideoTexture(videoElement);
            const videoGeometry = new THREE.SphereGeometry(490, 60, 40);
            const videoMaterial = new THREE.MeshBasicMaterial({
                map: videoTexture,
                side: THREE.BackSide
            });
            
            const videoSphere = new THREE.Mesh(videoGeometry, videoMaterial);
            scene.add(videoSphere);
        })
        .catch(function(error) {
            console.error('Error accessing camera:', error);
            alert('Camera access is required for this experience. Please enable camera permissions.');
            document.getElementById('permissionPrompt').classList.remove('hidden');
        });
}

function setupControls() {
    const opacityControl = document.getElementById('opacityControl');
    opacityControl.addEventListener('input', function(e) {
        sphere.material.opacity = parseFloat(e.target.value);
    });
    
    const startButton = document.getElementById('startButton');
    if (startButton) {
        startButton.addEventListener('click', function() {
            init();
        });
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

// Start the application when the page loads
window.addEventListener('load', init);
