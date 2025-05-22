let scene, camera, renderer, sphere, controls;
let videoElement, cameraEnabled = false;
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
    
    // Create camera with extreme zoom range
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.set(0, 0, 0.3);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').prepend(renderer.domElement);
    
    // Enhanced orbit controls with extreme zoom
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.02;  // Extreme close zoom
    controls.maxDistance = 10;    // Far zoom
    controls.enablePan = false;
    
    // Load 360 image
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'images/Panorama7D6346.jpg',
        () => {
            document.getElementById('loading').classList.add('hidden');
        },
        undefined,
        (error) => {
            console.error('Error loading image:', error);
            document.getElementById('loading').textContent = 'Error loading image';
        }
    );
    
    const texture = new THREE.TextureLoader().load('images/Panorama7D6346.jpg');
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    geometry.scale(-1, 1, 1);
    
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1
    });
    
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    animate();
}

function setupCameraFeed() {
    const cameraContainer = document.getElementById('cameraContainer');
    cameraContainer.innerHTML = ''; // Clear previous video
    
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    videoElement.style.width = '100%';
    videoElement.style.height = '100%';
    videoElement.style.objectFit = 'cover';
    cameraContainer.appendChild(videoElement);
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: 4096 },
            height: { ideal: 2160 }
        } 
    }).then(function(stream) {
        videoElement.srcObject = stream;
        videoElement.play();
        
        document.getElementById('transparencyControl').classList.remove('hidden');
        document.getElementById('cameraToggle').textContent = '📷 Disable AR';
        cameraEnabled = true;
        
        sphere.material.opacity = 0.8;
        document.getElementById('opacityControl').value = 0.8;
        document.getElementById('opacityValue').textContent = '80%';
        
        // For mobile AR, use device orientation
        if (isMobile) {
            window.addEventListener('deviceorientation', handleOrientation);
        }
    }).catch(function(error) {
        console.error('Error accessing camera:', error);
        alert('Camera access is required for AR mode. Please enable camera permissions.');
        toggleCamera();
    });
}

function toggleCamera() {
    if (cameraEnabled) {
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        document.getElementById('cameraContainer').innerHTML = '';
        
        if (isMobile) {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
        
        document.getElementById('cameraToggle').textContent = '📷 Enable AR';
        document.getElementById('transparencyControl').classList.add('hidden');
        
        sphere.material.opacity = 1;
        cameraEnabled = false;
        resetView();
    } else {
        setupCameraFeed();
    }
}

function handleOrientation(event) {
    if (!cameraEnabled || !isMobile) return;
    
    // Get device orientation in radians
    const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
    const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
    const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
    
    // Apply rotation to camera
    camera.rotation.set(beta, alpha, -gamma, 'YXZ');
}

function resetView() {
    camera.position.set(0, 0, 0.3);
    controls.reset();
}

function zoom(amount) {
    const newDistance = controls.getDistance() * (amount > 0 ? 1.25 : 0.8);
    if (newDistance >= controls.minDistance && newDistance <= controls.maxDistance) {
        controls.dollyTo(newDistance, true);
        showZoomFeedback(amount > 0 ? "Zooming Out" : "Zooming In");
    }
}

function showZoomFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'zoom-feedback';
    feedback.textContent = message;
    document.getElementById('controls').appendChild(feedback);
    
    setTimeout(() => {
        feedback.classList.add('fade-out');
        setTimeout(() => feedback.remove(), 500);
    }, 800);
}

function setupControls() {
    document.getElementById('cameraToggle').addEventListener('click', toggleCamera);
    
    document.getElementById('opacityControl').addEventListener('input', function(e) {
        if (cameraEnabled) {
            const value = parseFloat(e.target.value);
            sphere.material.opacity = value;
            document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
        }
    });
    
    document.getElementById('resetView').addEventListener('click', resetView);
    
    // Enhanced zoom controls
    document.getElementById('zoomIn').addEventListener('click', () => zoom(-1));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(1));
    
    // Pinch-to-zoom for mobile
    if (isMobile) {
        let initialDistance = 0;
        
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = getDistanceBetweenTouches(e);
            }
        });
        
        renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = getDistanceBetweenTouches(e);
                const delta = initialDistance - currentDistance;
                zoom(delta * 0.005);
                initialDistance = currentDistance;
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
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
