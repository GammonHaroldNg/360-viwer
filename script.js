let scene, camera, renderer, sphere, controls;
let videoElement, cameraEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let deviceOrientation = {};
let screenOrientation = 0;
let lastGyroUpdate = 0;
const GYRO_UPDATE_INTERVAL = 16; // ~60fps

function init() {
    setupScene();
    setupControls();
    setupOrientationListeners();
    window.addEventListener('resize', onWindowResize);
}

function setupScene() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.0001, 1000);
    camera.position.set(0, 0, 0.1);
    
    renderer = new THREE.WebGLRenderer({ 
        antialias: true, 
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').prepend(renderer.domElement);
    
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.0005;
    controls.maxDistance = 10;
    controls.enablePan = false;
    
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'images/Panorama7D6346.jpg',
        (texture) => {
            document.getElementById('loading').classList.add('hidden');
            const geometry = new THREE.SphereGeometry(2, 64, 64);
            geometry.scale(-1, 1, 1);
            
            sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1
            }));
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

function setupOrientationListeners() {
    // iOS 13+ permission handling
    if (isMobile && typeof DeviceOrientationEvent !== 'undefined' && 
        typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.getElementById('gyroToggle').addEventListener('click', requestGyroPermission);
    } else {
        document.getElementById('gyroToggle').addEventListener('click', toggleGyro);
    }
    
    window.addEventListener('orientationchange', updateScreenOrientation);
    updateScreenOrientation();
}

function requestGyroPermission() {
    DeviceOrientationEvent.requestPermission()
        .then(response => {
            if (response === 'granted') {
                setupGyroEvents();
                toggleGyro();
            } else {
                alert('Gyroscope permission denied');
            }
        })
        .catch(console.error);
}

function setupGyroEvents() {
    window.addEventListener('deviceorientation', handleDeviceOrientation);
}

function updateScreenOrientation() {
    screenOrientation = window.orientation || 0;
}

function handleDeviceOrientation(event) {
    if (!gyroEnabled) return;
    
    const now = performance.now();
    if (now - lastGyroUpdate < GYRO_UPDATE_INTERVAL) return;
    lastGyroUpdate = now;
    
    deviceOrientation = {
        alpha: event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0,
        beta: event.beta ? THREE.MathUtils.degToRad(event.beta) : 0,
        gamma: event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0,
        absolute: event.absolute
    };
    
    updateGyroRotation();
}

function updateGyroRotation() {
    if (!deviceOrientation.alpha && !deviceOrientation.beta && !deviceOrientation.gamma) return;
    
    // Convert device orientation to quaternion
    const z = deviceOrientation.alpha; // Z axis (compass)
    const x = deviceOrientation.beta;  // X axis (front/back tilt)
    const y = deviceOrientation.gamma; // Y axis (left/right tilt)
    
    // Apply screen orientation correction
    const orientationCorrection = new THREE.Quaternion();
    orientationCorrection.setFromEuler(new THREE.Euler(
        0,
        0,
        -THREE.MathUtils.degToRad(screenOrientation),
        'YXZ'
    ));
    
    // Create quaternion from device orientation
    const deviceQuaternion = new THREE.Quaternion();
    deviceQuaternion.setFromEuler(new THREE.Euler(
        Math.max(-Math.PI/2, Math.min(Math.PI/2, x)), // Limit X rotation
        y,
        z,
        'YXZ'
    ));
    
    // Combine with orientation correction
    gyroQuaternion.copy(deviceQuaternion).multiply(orientationCorrection);
}

function toggleGyro() {
    if (!isMobile) return;
    
    gyroEnabled = !gyroEnabled;
    
    const gyroButton = document.getElementById('gyroToggle');
    gyroButton.textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
    gyroButton.classList.toggle('gyro-on', gyroEnabled);
    gyroButton.classList.toggle('gyro-off', !gyroEnabled);
    
    if (gyroEnabled) {
        setupGyroEvents();
        controls.enableDamping = false;
    } else {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
        controls.enableDamping = true;
        controls.reset();
    }
}

// ... (keep all other existing functions like setupCameraFeed, toggleCamera, etc.)

function animate() {
    requestAnimationFrame(animate);
    
    if (gyroEnabled && gyroQuaternion) {
        // Apply gyro rotation
        camera.quaternion.copy(gyroQuaternion);
        
        // Apply manual rotation on top
        const manualRotation = controls.getPolarAngle();
        camera.rotation.y += manualRotation;
    }
    
    // Always update controls for damping
    controls.update();
    
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
