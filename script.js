let scene, camera, renderer, sphere, controls;
let videoElement, cameraEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let initialBeta = null;

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
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 1000);
    camera.position.set(0, 0, 0.1);
    
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
    controls.dampingFactor = 0.1; // Smoother rotation
    controls.screenSpacePanning = false;
    controls.minDistance = 0.0005;  // Extreme close zoom
    controls.maxDistance = 10;
    controls.enablePan = false;
    
    // Load 360 image
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'images/Panorama7D6346.jpg',
        (texture) => {
            document.getElementById('loading').classList.add('hidden');
            
            // Create larger sphere for closer appearance
            const geometry = new THREE.SphereGeometry(2, 64, 64); // Increased size
            geometry.scale(-1, 1, 1);
            
            const material = new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1
            });
            
            sphere = new THREE.Mesh(geometry, material);
            scene.add(sphere);
        },
        undefined,
        (error) => {
            console.error('Error loading image:', error);
            document.getElementById('loading').textContent = 'Error loading image';
        }
    );
    
    animate();
}

function setupCameraFeed() {
    const cameraContainer = document.getElementById('cameraContainer');
    cameraContainer.innerHTML = '';
    
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
        
        if (gyroEnabled) {
            enableGyro();
        }
    }).catch(function(error) {
        console.error('Error accessing camera:', error);
        alert('Camera access is required for AR mode. Please enable camera permissions.');
        toggleCamera();
    });
}

function toggleGyro() {
    gyroEnabled = !gyroEnabled;
    
    // Update button appearance
    const gyroButton = document.getElementById('gyroToggle');
    gyroButton.textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
    gyroButton.classList.toggle('gyro-on', gyroEnabled);
    gyroButton.classList.toggle('gyro-off', !gyroEnabled);
    
    if (gyroEnabled) {
        enableGyro();
    } else {
        disableGyro();
    }
}

function enableGyro() {
    if (!isMobile) return;
    
    // Reset initial orientation
    initialBeta = null;
    
    if (window.DeviceOrientationEvent) {
        window.addEventListener('deviceorientation', handleOrientation);
    }
    
    // Smooth transition to gyro control
    controls.enableDamping = true;
}

function disableGyro() {
    if (!isMobile) return;
    
    window.removeEventListener('deviceorientation', handleOrientation);
    controls.reset();
    controls.enableDamping = true;
}

function handleOrientation(event) {
    if (!gyroEnabled || !isMobile) return;
    
    const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
    const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
    const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
    
    // Set initial beta on first event
    if (initialBeta === null) {
        initialBeta = beta;
    }
    
    // Calculate relative rotation from initial position
    const relativeBeta = beta - initialBeta;
    
    // Apply rotation with limits
    camera.rotation.set(
        Math.max(-Math.PI/2, Math.min(Math.PI/2, relativeBeta)), // Limit vertical rotation
        alpha,
        -gamma,
        'YXZ'
    );
}

function toggleCamera() {
    if (cameraEnabled) {
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        document.getElementById('cameraContainer').innerHTML = '';
        
        document.getElementById('cameraToggle').textContent = '📷 Enable AR';
        document.getElementById('transparencyControl').classList.add('hidden');
        
        sphere.material.opacity = 1;
        cameraEnabled = false;
        resetView();
    } else {
        setupCameraFeed();
    }
}

function resetView() {
    camera.position.set(0, 0, 0.1);
    controls.reset();
    initialBeta = null;
}

function setupControls() {
    document.getElementById('cameraToggle').addEventListener('click', toggleCamera);
    document.getElementById('gyroToggle').addEventListener('click', toggleGyro);
    
    document.getElementById('opacityControl').addEventListener('input', function(e) {
        if (cameraEnabled) {
            const value = parseFloat(e.target.value);
            sphere.material.opacity = value;
            document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
        }
    });
    
    document.getElementById('resetView').addEventListener('click', resetView);
    
    // Enhanced touch zoom
    if (isMobile) {
        let initialDistance = 0;
        
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                initialDistance = getDistanceBetweenTouches(e);
                e.preventDefault();
            }
        });
        
        renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                const currentDistance = getDistanceBetweenTouches(e);
                const delta = (initialDistance - currentDistance) * 0.002; // More sensitive zoom
                controls.dolly(delta);
                initialDistance = currentDistance;
                e.preventDefault();
            }
        });
    }
    
    // Mouse wheel zoom
    renderer.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        controls.dolly(e.deltaY * 0.001);
    });
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
    
    if (!gyroEnabled || !isMobile) {
        controls.update();
    }
    
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
