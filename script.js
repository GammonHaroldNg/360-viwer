// script.js
let scene, camera, renderer, sphere, controls;
let videoStream = null;
let arEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let initialPosition = new THREE.Vector3(0, 0, 0.1);

async function init() {
    setupScene();
    setupControls();
    setupGyro();
    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.copy(initialPosition);
    camera.rotation.x = -0.5; // Look at horizon

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Load 360 image
    new THREE.TextureLoader().load('images/Panorama7D6346.jpg', texture => {
        const geometry = new THREE.SphereGeometry(5, 64, 64).scale(-1, 1, 1);
        sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        }));
        scene.add(sphere);
        document.getElementById('loading').remove();
    }, undefined, err => {
        console.error('Image load error:', err);
        document.getElementById('loading').textContent = 'Failed to load image';
    });

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.05;
    controls.maxDistance = 10;
}

function setupControls() {
    document.getElementById('arToggle').addEventListener('click', toggleAR);
    document.getElementById('gyroToggle').addEventListener('click', toggleGyro);
    document.getElementById('resetView').addEventListener('click', () => {
        camera.position.copy(initialPosition);
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
        
        const alpha = THREE.MathUtils.degToRad(event.alpha);
        const beta = THREE.MathUtils.degToRad(event.beta);
        const gamma = THREE.MathUtils.degToRad(event.gamma);
        
        gyroQuaternion.setFromEuler(new THREE.Euler(
            Math.max(-Math.PI/2, Math.min(Math.PI/2, beta)),
            alpha,
            -gamma,
            'YXZ'
        ));
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
            
            if(isMobile) {
                gyroEnabled = true;
                controls.enabled = false;
                if(typeof DeviceOrientationEvent.requestPermission === 'function') {
                    await DeviceOrientationEvent.requestPermission();
                }
            }
        } else {
            if(videoStream) videoStream.getTracks().forEach(t => t.stop());
            document.getElementById('cameraContainer').innerHTML = '';
            if(sphere) sphere.material.opacity = 1;
            document.getElementById('transparencyControl').classList.add('hidden');
            gyroEnabled = false;
            controls.enabled = true;
        }
        
        updateUI();
    } catch(error) {
        console.error('AR error:', error);
        alert(`Error: ${error.message}`);
    }
}

function toggleGyro() {
    if(!isMobile || arEnabled) return;
    
    gyroEnabled = !gyroEnabled;
    controls.enabled = !gyroEnabled;
    updateUI();
}

function updateUI() {
    document.getElementById('arToggle').classList.toggle('ar-active', arEnabled);
    document.getElementById('arToggle').classList.toggle('ar-inactive', !arEnabled);
    document.getElementById('arToggle').textContent = arEnabled ? '📷 AR Mode' : '📷 Enable AR';
    
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
        camera.quaternion.slerp(gyroQuaternion, 0.1);
        controls.target.set(0, 0, 0);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
