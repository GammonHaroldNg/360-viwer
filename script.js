let scene, camera, renderer, sphere, controls;
let videoStream = null;
let arEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroGroup = new THREE.Group();
let manualGroup = new THREE.Group();
let initialPosition = new THREE.Vector3(0, 0, 0.1);
let deviceQuaternion = new THREE.Quaternion();

async function init() {
    setupScene();
    setupControls();
    setupGyro();
    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    
    // Initialize gyroGroup to face forward (horizontal view)
    gyroGroup.rotation.set(-Math.PI/2, 0, 0); // Tilt down to face horizon
    scene.add(gyroGroup);
    gyroGroup.add(manualGroup);
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.copy(initialPosition);
    manualGroup.add(camera);

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // 360 image setup
    new THREE.TextureLoader().load('images/Panorama7D6346.jpg', texture => {
        const geometry = new THREE.SphereGeometry(5, 64, 64).scale(-1, 1, 1);
        sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        }));
        scene.add(sphere);
        document.getElementById('loading').remove();
    });

    // Orbit controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.05;
    controls.maxDistance = 10;
    controls.rotateSpeed = 0.5;
}

function setupControls() {
    document.getElementById('arToggle').addEventListener('click', toggleAR);
    document.getElementById('gyroToggle').addEventListener('click', toggleGyro);
    document.getElementById('resetView').addEventListener('click', () => {
        manualGroup.position.set(0, 0, 0);
        manualGroup.rotation.set(0, 0, 0);
        gyroGroup.rotation.set(0, 0, 0); // Reset to horizontal view
        controls.reset();
    });
    document.getElementById('opacitySlider').addEventListener('input', e => {
        if(sphere) sphere.material.opacity = e.target.value;
        document.getElementById('opacityValue').textContent = `${Math.round(e.target.value * 100)}%`;
    });
}

function setupGyro() {
    if(!isMobile) return;
    
    window.addEventListener('deviceorientation', event => {
        if(!gyroEnabled || !event.alpha) return;
        
        // Convert device orientation (now maps directly to horizontal view)
        const alpha = THREE.MathUtils.degToRad(event.alpha);
        const beta = THREE.MathUtils.degToRad(event.beta);
        const gamma = THREE.MathUtils.degToRad(event.gamma);
        
        const quaternion = new THREE.Quaternion()
            .setFromEuler(new THREE.Euler(
                beta,  // Removed Math.PI/2 adjustment
                alpha,
                -gamma,
                'YXZ'
            ));
        
        deviceQuaternion.slerp(quaternion, 0.1);
    });
}

async function toggleAR() {
    try {
        arEnabled = !arEnabled;
        
        if(arEnabled) {
            videoStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            
            const video = document.createElement('video');
            video.srcObject = videoStream;
            video.playsInline = true;
            video.style.cssText = `position:fixed;width:100%;height:100%;object-fit:cover;transform:scaleX(-1);`;
            document.getElementById('cameraContainer').appendChild(video);
            await video.play();
            
            if(sphere) sphere.material.opacity = 0.8;
            document.getElementById('transparencyControl').classList.remove('hidden');
        } else {
            if(videoStream) videoStream.getTracks().forEach(t => t.stop());
            document.getElementById('cameraContainer').innerHTML = '';
            if(sphere) sphere.material.opacity = 1;
            document.getElementById('transparencyControl').classList.add('hidden');
        }
        
        updateUI();
    } catch(error) {
        console.error('AR error:', error);
        alert(`Error: ${error.message}`);
    }
}

function toggleGyro() {
    if (!isMobile) return;

    // Capture current camera orientation
    const cameraWorldQuaternion = new THREE.Quaternion();
    camera.getWorldQuaternion(cameraWorldQuaternion);

    gyroEnabled = !gyroEnabled;

    if (gyroEnabled) {
        // Apply correction quaternion to align with device's forward direction
        const correction = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI/2, 0, 0));
        gyroGroup.quaternion.copy(correction.multiply(cameraWorldQuaternion));
        manualGroup.rotation.set(0, 0, 0);
    } else {
        // Transfer orientation back to manualGroup
        const euler = new THREE.Euler().setFromQuaternion(cameraWorldQuaternion, 'YXZ');
        manualGroup.rotation.copy(euler);
    }

    controls.enabled = !gyroEnabled;
    controls.update();

    // iOS permission handling
    if (gyroEnabled && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permission => {
                if (permission !== 'granted') {
                    gyroEnabled = false;
                    updateUI();
                }
            })
            .catch(console.error);
    }

    updateUI();
}

function updateUI() {
    // AR Button
    document.getElementById('arToggle').classList.toggle('ar-active', arEnabled);
    document.getElementById('arToggle').classList.toggle('ar-inactive', !arEnabled);
    document.getElementById('arToggle').textContent = arEnabled ? '📷 AR Mode' : '📷 Enable AR';

    // Gyro Button
    document.getElementById('gyroToggle').classList.toggle('gyro-active', gyroEnabled);
    document.getElementById('gyroToggle').classList.toggle('gyro-inactive', !gyroEnabled);
    document.getElementById('gyroToggle').textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);

    if(gyroEnabled) {
        // Apply gyro rotation to gyroGroup
        gyroGroup.quaternion.copy(deviceQuaternion);

        // Combine with manual controls
        controls.update();
    } else {
        // Normal controls only
        controls.update();
    }

    renderer.render(scene, camera);
}

window.addEventListener('load', init);
