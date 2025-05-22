let scene, camera, renderer, sphere, controls;
let videoElement, videoTexture, videoMesh;
let cameraEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Initialize the application
function init() {
    setupScene();
    setupControls();
    window.addEventListener('resize', onWindowResize);
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
    
    // Add orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.1;  // Allows closer zoom
    controls.maxDistance = 3;    // Maximum zoom out distance
    controls.enablePan = false;
    
    // Load 360 image (name without space)
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'images/Panorama7D6346.jpg',
        () => {
            // Success callback - hide loading message
            document.getElementById('loading').classList.add('hidden');
        },
        undefined, // Progress callback
        (error) => {
            console.error('Error loading image:', error);
            document.getElementById('loading').textContent = 'Error loading image';
        }
    );
    
    const texture = new THREE.TextureLoader().load('images/Panorama7D6346.jpg');
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
            width: { ideal: window.innerWidth * window.devicePixelRatio },
            height: { ideal: window.innerHeight * window.devicePixelRatio }
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
        
        // Keep controls enabled in AR mode
        controls.enabled = true;
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
        
        // Reset image to fully opaque
        sphere.material.opacity = 1;
        cameraEnabled = false;
        
        // Keep controls enabled
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
            if (e.touches.length === 2) {
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
    
    if (videoMesh) {
        videoMesh.scale.x = window.innerWidth / 500;
        videoMesh.scale.y = window.innerHeight / 500;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        if (cameraEnabled && isMobile) {
            // For mobile AR, dampen the controls
            controls.update();
            controls.target.set(0, 0, 0);
        } else {
            // Normal controls
            controls.update();
        }
    }
    
    renderer.render(scene, camera);
}

// Start the application
window.addEventListener('load', init);
