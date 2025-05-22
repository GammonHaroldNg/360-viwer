let scene, camera, renderer, sphere, controls;
let videoElement, cameraEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let deviceOrientation = {};
let screenOrientation = 0;
let lastGyroUpdate = 0;
const GYRO_UPDATE_INTERVAL = 16; // ~60fps

// ... (keep all previous variable declarations)

function init() {
    setupScene();
    setupControls();  // Initialize controls first
    setupOrientationListeners();
    window.addEventListener('resize', onWindowResize);
}

function setupControls() {
    // Camera Toggle Button
    document.getElementById('cameraToggle').addEventListener('click', function() {
        console.log('Camera toggle clicked');
        toggleCamera();
    });

    // Gyro Toggle Button
    document.getElementById('gyroToggle').addEventListener('click', function() {
        console.log('Gyro toggle clicked');
        if (isMobile && typeof DeviceOrientationEvent !== 'undefined' && 
            typeof DeviceOrientationEvent.requestPermission === 'function') {
            requestGyroPermission();
        } else {
            toggleGyro();
        }
    });

    // Reset View Button
    document.getElementById('resetView').addEventListener('click', function() {
        console.log('Reset view clicked');
        resetView();
    });

    // Transparency Control
    document.getElementById('opacityControl').addEventListener('input', function(e) {
        if (cameraEnabled) {
            const value = parseFloat(e.target.value);
            sphere.material.opacity = value;
            document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
        }
    });

    // Touch controls for mobile
    if (isMobile) {
        setupTouchControls();
    }
}

function toggleCamera() {
    if (cameraEnabled) {
        disableCamera();
    } else {
        enableCamera();
    }
    updateUI();
}

function enableCamera() {
    if (cameraEnabled) return;
    
    const cameraContainer = document.getElementById('cameraContainer');
    cameraContainer.innerHTML = '';
    
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    cameraContainer.appendChild(videoElement);
    
    navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
    }).then(function(stream) {
        videoElement.srcObject = stream;
        videoElement.play();
        cameraEnabled = true;
        updateUI();
    }).catch(function(error) {
        console.error('Camera error:', error);
        alert('Could not access camera: ' + error.message);
    });
}

function disableCamera() {
    if (!cameraEnabled) return;
    
    if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
    }
    document.getElementById('cameraContainer').innerHTML = '';
    cameraEnabled = false;
    updateUI();
}

function toggleGyro() {
    if (!isMobile) {
        alert('Gyroscope only works on mobile devices');
        return;
    }
    
    gyroEnabled = !gyroEnabled;
    
    if (gyroEnabled) {
        window.addEventListener('deviceorientation', handleDeviceOrientation);
        controls.enableDamping = false;
    } else {
        window.removeEventListener('deviceorientation', handleDeviceOrientation);
        controls.enableDamping = true;
    }
    updateUI();
}

function resetView() {
    camera.position.set(0, 0, 0.1);
    controls.reset();
    updateUI();
}

function updateUI() {
    // Update camera toggle
    const cameraToggle = document.getElementById('cameraToggle');
    cameraToggle.textContent = cameraEnabled ? '📷 Disable AR' : '📷 Enable AR';
    
    // Update gyro toggle
    const gyroToggle = document.getElementById('gyroToggle');
    gyroToggle.textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
    gyroToggle.classList.toggle('gyro-on', gyroEnabled);
    gyroToggle.classList.toggle('gyro-off', !gyroEnabled);
    
    // Show/hide transparency control
    const transparencyControl = document.getElementById('transparencyControl');
    if (cameraEnabled) {
        transparencyControl.classList.remove('hidden');
        sphere.material.opacity = 0.8;
    } else {
        transparencyControl.classList.add('hidden');
        sphere.material.opacity = 1.0;
    }
}

// ... (keep all other existing functions like animate, handleDeviceOrientation, etc.)

window.addEventListener('load', function() {
    console.log('Window loaded, initializing...');
    init();
});
