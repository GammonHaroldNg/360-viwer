let scene, camera, renderer, sphere, controls;
let videoElement, videoTexture, videoMesh;
let cameraEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Initialize the application
function init() {
    setupScene();
    setupControls();
    window.addEventListener('resize', onWindowResize);
    
    // Hide loading when image is loaded
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('images/Panorama_7D6346.jpg', () => {
        document.getElementById('loading').classList.add('hidden');
    });
}

function setupScene() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.5);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').prepend(renderer.domElement);
    
    // Add orbit controls for desktop
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.3;
    controls.maxDistance = 2;
    controls.enablePan = false;
    
    // Load 360 image
    const texture = new THREE.TextureLoader().load('images/Panorama_7D6346.jpg');
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    geometry.scale(-1, 1, 1); // Flip inside out
    
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1 // Start fully visible
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
    
    // Get device orientation if mobile
    if (isMobile) {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 1920 },
            height: { ideal: 1080 }
        } 
    })
    .then(function(stream) {
        videoElement.srcObject = stream;
        videoElement.play();
        
        // Create camera texture
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        videoTexture.format = THREE.RGBFormat;
        
        // Create camera background plane
        const videoGeometry = new THREE.PlaneGeometry(2, 2);
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            transparent: false
        });
        
        videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
        videoMesh.position.z = -1.5;
        scene.add(videoMesh);
        
        // Update UI
        document.getElementById('transparencyControl').classList.remove('hidden');
        document.getElementById('viewControls').classList.remove('hidden');
        document.getElementById('cameraToggle').textContent = '📷 Disable AR';
        cameraEnabled = true;
        
        // Set initial transparency to 80%
        sphere.material.opacity = 0.8;
        document.getElementById('opacityControl').value = 0.8;
        document.getElementById('opacityValue').textContent = '80%';
        
        // Disable orbit controls when camera is on
        controls.enabled = false;
    })
    .catch(function(error) {
        console.error('Error accessing camera:', error);
        alert('Camera access is required for AR mode. Please enable camera permissions.');
        toggleCamera();
    });
}

function toggleCamera() {
    if (cameraEnabled) {
        // Disable camera
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        if (videoMesh) scene.remove(videoMesh);
        if (isMobile) {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
        
        document.getElementById('cameraToggle').textContent = '📷 Enable AR';
        document.getElementById('transparencyControl').classList.add('hidden');
        document.getElementById('viewControls').classList.add('hidden');
        
        // Reset image to fully opaque
        sphere.material.opacity = 1;
        cameraEnabled = false;
        
        // Re-enable orbit controls
        controls.enabled = true;
        resetView();
    } else {
        setupCameraFeed();
    }
}

function handleOrientation(event) {
    if (!cameraEnabled || !isMobile) return;
    
    // Get device orientation and adjust camera
    const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
    const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
    const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
    
    camera.rotation.set(beta, alpha, -gamma, 'YXZ');
}

function resetView() {
    camera.position.set(0, 0, 0.5);
    controls.reset();
}

function zoom(amount) {
    if (cameraEnabled) return;
    
    const newDistance = controls.getDistance() + amount;
    if (newDistance >= controls.minDistance && newDistance <= controls.maxDistance) {
        controls.dolly(amount);
    }
}

function setupControls() {
    const cameraToggle = document.getElementById('cameraToggle');
    cameraToggle.addEventListener('click', toggleCamera);
    
    const opacityControl = document.getElementById('opacityControl');
    opacityControl.addEventListener('input', function(e) {
        if (cameraEnabled) {
            const value = parseFloat(e.target.value);
            sphere.material.opacity = value;
            document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
        }
    });
    
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('zoomIn').addEventListener('click', () => zoom(-0.1));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(0.1));
    
    // Add touch events for mobile
    if (isMobile) {
        let touchStartDistance = 0;
        
        document.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                touchStartDistance = getDistanceBetweenTouches(e);
            }
        });
        
        document.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && !cameraEnabled) {
                e.preventDefault();
                const currentDistance = getDistanceBetweenTouches(e);
                const delta = (touchStartDistance - currentDistance) * 0.01;
                zoom(delta);
                touchStartDistance = currentDistance;
            }
        });
    }
}

function getDistanceBetweenTouches(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls && controls.enabled) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

// Start the application
window.addEventListener('load', init);
