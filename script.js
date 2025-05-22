let scene, camera, renderer, sphere, controls;
let videoElement, cameraEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let deviceOrientation = {};
let screenOrientation = 0;

function init() {
    setupScene();
    setupControls();
    setupOrientationListeners();
    window.addEventListener('resize', onWindowResize);
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.0001, 1000);
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
    controls.minDistance = 0.0005;
    controls.maxDistance = 10;
    
    new THREE.TextureLoader().load('images/Panorama7D6346.jpg', (texture) => {
        document.getElementById('loading').classList.add('hidden');
        const geometry = new THREE.SphereGeometry(2, 64, 64).scale(-1, 1, 1);
        sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        }));
        scene.add(sphere);
    }, undefined, (err) => console.error(err));
    
    animate();
}

function setupControls() {
    document.getElementById('cameraToggle').addEventListener('click', toggleCamera);
    document.getElementById('gyroToggle').addEventListener('click', handleGyroToggle);
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('opacityControl').addEventListener('input', updateOpacity);
    
    if(isMobile) setupTouchControls();
}

function setupOrientationListeners() {
    window.addEventListener('orientationchange', () => screenOrientation = window.orientation || 0);
    if(isMobile && typeof DeviceOrientationEvent.requestPermission === 'function') {
        document.getElementById('gyroToggle').addEventListener('click', requestGyroPermission);
    }
}

function handleGyroToggle() {
    if(!isMobile) return;
    gyroEnabled ? disableGyro() : enableGyro();
}

function enableGyro() {
    window.addEventListener('deviceorientation', handleDeviceOrientation);
    gyroEnabled = true;
    updateUI();
}

function disableGyro() {
    window.removeEventListener('deviceorientation', handleDeviceOrientation);
    gyroEnabled = false;
    controls.reset();
    updateUI();
}

function handleDeviceOrientation(e) {
    const alpha = e.alpha ? THREE.MathUtils.degToRad(e.alpha) : 0;
    const beta = e.beta ? THREE.MathUtils.degToRad(e.beta) : 0;
    const gamma = e.gamma ? THREE.MathUtils.degToRad(e.gamma) : 0;
    
    gyroQuaternion.setFromEuler(new THREE.Euler(
        Math.max(-Math.PI/2, Math.min(Math.PI/2, beta)),
        alpha,
        -gamma,
        'YXZ'
    ));
    
    const orientationCorrection = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0, 0, -THREE.MathUtils.degToRad(screenOrientation))
    );
    gyroQuaternion.multiply(orientationCorrection);
}

async function requestGyroPermission() {
    try {
        const permission = await DeviceOrientationEvent.requestPermission();
        if(permission === 'granted') enableGyro();
    } catch(err) {
        console.error('Gyro permission error:', err);
    }
}

function toggleCamera() {
    cameraEnabled ? disableCamera() : enableCamera();
    updateUI();
}

function enableCamera() {
    const cameraContainer = document.getElementById('cameraContainer');
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    cameraContainer.appendChild(videoElement);
    
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }})
        .then(stream => {
            videoElement.srcObject = stream;
            videoElement.play();
            cameraEnabled = true;
            updateUI();
        })
        .catch(err => alert('Camera error: ' + err.message));
}

function disableCamera() {
    if(videoElement?.srcObject) videoElement.srcObject.getTracks().forEach(t => t.stop());
    document.getElementById('cameraContainer').innerHTML = '';
    cameraEnabled = false;
    updateUI();
}

function updateOpacity(e) {
    if(cameraEnabled) {
        const value = parseFloat(e.target.value);
        sphere.material.opacity = value;
        document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
    }
}

function resetView() {
    camera.position.set(0, 0, 0.1);
    controls.reset();
}

function setupTouchControls() {
    let touchStartDistance = 0;
    
    renderer.domElement.addEventListener('touchstart', e => {
        if(e.touches.length === 2) touchStartDistance = getTouchDistance(e);
    });
    
    renderer.domElement.addEventListener('touchmove', e => {
        if(e.touches.length === 2) {
            const delta = (touchStartDistance - getTouchDistance(e)) * 0.002;
            controls.dolly(delta);
            touchStartDistance = getTouchDistance(e);
        }
    });
}

function getTouchDistance(e) {
    const [a, b] = e.touches;
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
}

function updateUI() {
    document.getElementById('cameraToggle').textContent = cameraEnabled ? '📷 Disable AR' : '📷 Enable AR';
    document.getElementById('gyroToggle').textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
    document.getElementById('gyroToggle').className = `control-btn ${gyroEnabled ? 'gyro-on' : 'gyro-off'}`;
    document.getElementById('transparencyControl').classList.toggle('hidden', !cameraEnabled);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if(gyroEnabled) camera.quaternion.copy(gyroQuaternion);
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
