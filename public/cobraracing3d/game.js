/**
 * COBRA RACING 3D - CORE ENGINE
 * Developed for Cobra Games Jr.
 */

// --- CONFIGURATION ---
const CONFIG = {
    LAPS_TO_WIN: 3,
    MAX_SPEED: 220,
    ACCELERATION: 40,
    BRAKING: 120,
    FRICTION: 15,
    STEER_SPEED: 0.05,
    MAX_STEER: 0.8,
    NITRO_STRENGTH: 1.8,
    NITRO_RECHARGE: 0.1,
    NITRO_CONSUMPTION: 0.5,
    AI_COUNT: 3
};

// --- BRIDGE PROTOCOL ---
const Bridge = {
    send(type, data = {}) {
        window.parent.postMessage({ type: 'CG_' + type, data }, '*');
    },
    ready(version = '1.0.0') { this.send('GAME_READY', { version }); },
    progress(progress) { this.send('LOAD_PROGRESS', { progress }); },
    gameOver(score) { this.send('GAME_OVER', { score }); },
    error(message) { this.send('ERROR', { message }); }
};

// --- GAME ENGINE ---
class Game {
    constructor() {
        this.container = document.getElementById('game-container');
        this.loadingScreen = document.getElementById('loading-screen');
        this.menuOverlay = document.getElementById('menu-overlay');
        this.hud = {
            laps: document.getElementById('lap-count'),
            timer: document.getElementById('timer-value'),
            speed: document.getElementById('speed-value'),
            nitro: document.getElementById('nitro-bar')
        };

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        
        this.gameState = 'LOADING'; // LOADING, MENU, RACING, FINISHED
        this.player = null;
        this.opponents = [];
        this.track = null;
        
        this.keys = {};
        this.touch = {
            accel: false,
            brake: false,
            left: false,
            right: false,
            nitro: false
        };

        this.init();
    }

    async init() {
        try {
            this.setupScene();
            this.setupLights();
            this.setupTrack();
            this.setupCars();
            this.setupInput();
            this.setupUI();

            // Simulate loading progress
            let progress = 0;
            const loadInterval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 100) {
                    progress = 100;
                    clearInterval(loadInterval);
                    this.onLoadComplete();
                }
                this.updateLoading(progress);
                Bridge.progress(progress);
            }, 200);

        } catch (err) {
            console.error(err);
            Bridge.error(err.message);
        }
    }

    setupScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x020205);
        this.scene.fog = new THREE.FogExp2(0x020205, 0.002);

        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 2000);
        
        this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.container.appendChild(this.renderer.domElement);

        window.addEventListener('resize', () => this.onResize());
    }

    setupLights() {
        const ambient = new THREE.AmbientLight(0x404040, 0.5);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0x00f2ff, 1);
        sun.position.set(100, 200, 100);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 2048;
        sun.shadow.mapSize.height = 2048;
        sun.shadow.camera.left = -500;
        sun.shadow.camera.right = 500;
        sun.shadow.camera.top = 500;
        sun.shadow.camera.bottom = -500;
        this.scene.add(sun);

        // Add some atmospheric point lights around the track
        for (let i = 0; i < 20; i++) {
            const light = new THREE.PointLight(i % 2 === 0 ? 0x00f2ff : 0xff004c, 2, 50);
            const angle = (i / 20) * Math.PI * 2;
            light.position.set(Math.cos(angle) * 300, 10, Math.sin(angle) * 300);
            this.scene.add(light);
        }
    }

    setupTrack() {
        // Create a professional circuit path
        const points = [];
        const radius = 350;
        for (let i = 0; i < 100; i++) {
            const angle = (i / 100) * Math.PI * 2;
            const r = radius + Math.sin(angle * 4) * 50 + Math.cos(angle * 2) * 30;
            const x = Math.cos(angle) * r;
            const z = Math.sin(angle) * r;
            const y = Math.sin(angle * 3) * 10;
            points.push(new THREE.Vector3(x, y, z));
        }
        
        this.curve = new THREE.CatmullRomCurve3(points, true);
        
        // Create track geometry
        const tubeGeo = new THREE.TubeGeometry(this.curve, 400, 15, 20, true);
        
        // Custom Shader Material for Asphalt with Neon Edges
        const asphaltMaterial = new THREE.MeshStandardMaterial({
            color: 0x111111,
            roughness: 0.8,
            metalness: 0.2
        });

        const trackMesh = new THREE.Mesh(tubeGeo, asphaltMaterial);
        trackMesh.receiveShadow = true;
        this.scene.add(trackMesh);

        // Add curbs (Neon blue and pink)
        const curbPoints = this.curve.getSpacedPoints(400);
        const curbWidth = 18;
        
        const curbLeftGeo = new THREE.BufferGeometry().setFromPoints(this.curve.getSpacedPoints(1000));
        // Simple visual indicators for track limits
        for (let i = 0; i < 1000; i++) {
            const pos = this.curve.getPointAt(i / 1000);
            const tangent = this.curve.getTangentAt(i / 1000);
            const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
            
            if (i % 10 === 0) {
                const curbBox = new THREE.BoxGeometry(2, 0.5, 4);
                const curbMat = new THREE.MeshStandardMaterial({ 
                    color: i % 20 === 0 ? 0x00f2ff : 0xff004c,
                    emissive: i % 20 === 0 ? 0x00f2ff : 0xff004c,
                    emissiveIntensity: 0.5
                });
                const curb = new THREE.Mesh(curbBox, curbMat);
                curb.position.copy(pos).add(normal.clone().multiplyScalar(16));
                curb.lookAt(pos.clone().add(tangent));
                this.scene.add(curb);

                const curb2 = curb.clone();
                curb2.position.copy(pos).add(normal.clone().multiplyScalar(-16));
                this.scene.add(curb2);
            }
        }

        // Add a ground plane
        const groundGeo = new THREE.PlaneGeometry(2000, 2000);
        const groundMat = new THREE.MeshStandardMaterial({ color: 0x010101, roughness: 1 });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -20;
        ground.receiveShadow = true;
        this.scene.add(ground);
        
        // Add start line
        const startLineGeo = new THREE.PlaneGeometry(40, 2);
        const startLineMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8 });
        const startLine = new THREE.Mesh(startLineGeo, startLineMat);
        const startPos = this.curve.getPointAt(0);
        const startTangent = this.curve.getTangentAt(0);
        startLine.position.copy(startPos).add(new THREE.Vector3(0, 0.1, 0));
        startLine.lookAt(startPos.clone().add(startTangent));
        startLine.rotateX(-Math.PI / 2);
        this.scene.add(startLine);
    }

    setupCars() {
        // Player Car
        this.player = new Car(this.scene, 0x00f2ff, true);
        const startPos = this.curve.getPointAt(0);
        this.player.mesh.position.copy(startPos);
        
        // Opponents
        for (let i = 0; i < CONFIG.AI_COUNT; i++) {
            const ai = new Car(this.scene, 0xff004c, false);
            ai.curveOffset = (i + 1) * 0.05; // Offset their start position
            const pos = this.curve.getPointAt(ai.curveOffset);
            ai.mesh.position.copy(pos);
            this.opponents.push(ai);
        }
    }

    setupInput() {
        window.addEventListener('keydown', (e) => this.keys[e.code] = true);
        window.addEventListener('keyup', (e) => this.keys[e.code] = false);

        // Mobile buttons
        const bindBtn = (id, action) => {
            const el = document.getElementById(id);
            el.addEventListener('touchstart', (e) => { e.preventDefault(); this.touch[action] = true; });
            el.addEventListener('touchend', (e) => { e.preventDefault(); this.touch[action] = false; });
            el.addEventListener('mousedown', () => this.touch[action] = true);
            el.addEventListener('mouseup', () => this.touch[action] = false);
        };

        bindBtn('btn-accel', 'accel');
        bindBtn('btn-brake', 'brake');
        bindBtn('btn-left', 'left');
        bindBtn('btn-right', 'right');
        bindBtn('btn-nitro', 'nitro');
    }

    setupUI() {
        document.getElementById('start-btn').onclick = () => this.startRace();
    }

    updateLoading(progress) {
        document.getElementById('loading-progress').style.width = progress + '%';
    }

    onLoadComplete() {
        this.loadingScreen.style.display = 'none';
        this.gameState = 'MENU';
        Bridge.ready();
        this.animate();
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    startRace() {
        this.menuOverlay.classList.add('hidden');
        this.gameState = 'RACING';
        this.player.reset();
        this.opponents.forEach(ai => ai.reset());
        this.startTime = Date.now();
        this.laps = 1;
        this.updateHUD();
    }

    update(dt) {
        if (this.gameState !== 'RACING') return;

        // Player Logic
        const input = {
            accel: this.keys['ArrowUp'] || this.keys['KeyW'] || this.touch.accel,
            brake: this.keys['ArrowDown'] || this.keys['KeyS'] || this.touch.brake,
            left: this.keys['ArrowLeft'] || this.keys['KeyA'] || this.touch.left,
            right: this.keys['ArrowRight'] || this.keys['KeyD'] || this.touch.right,
            nitro: this.keys['ShiftLeft'] || this.keys['Space'] || this.touch.nitro
        };

        this.player.update(dt, input, this.curve);
        this.updateCamera(dt);

        // AI Logic
        this.opponents.forEach((ai, index) => {
            ai.updateAI(dt, this.curve, index);
        });

        // Lap Checking
        const progress = this.player.progress;
        if (progress < 0.1 && this.player.lastProgress > 0.9) {
            this.laps++;
            if (this.laps > CONFIG.LAPS_TO_WIN) {
                this.finishRace();
            }
        }
        this.player.lastProgress = progress;

        this.updateHUD();
    }

    updateCamera(dt) {
        // Follow camera
        const offset = new THREE.Vector3(0, 5, -12);
        const carMatrix = this.player.mesh.matrixWorld;
        const targetPos = offset.applyMatrix4(carMatrix);
        
        this.camera.position.lerp(targetPos, dt * 5);
        this.camera.lookAt(this.player.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)));
    }

    updateHUD() {
        this.hud.laps.textContent = `${Math.min(this.laps, CONFIG.LAPS_TO_WIN)} / ${CONFIG.LAPS_TO_WIN}`;
        this.hud.speed.textContent = Math.round(this.player.speed);
        this.hud.nitro.style.width = (this.player.nitro * 100) + '%';

        const elapsed = (Date.now() - this.startTime) / 1000;
        const mins = Math.floor(elapsed / 60);
        const secs = Math.floor(elapsed % 60);
        const ms = Math.floor((elapsed % 1) * 100);
        this.hud.timer.textContent = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
    }

    finishRace() {
        this.gameState = 'FINISHED';
        this.menuOverlay.classList.remove('hidden');
        document.getElementById('start-btn').textContent = 'Correr Novamente';
        
        const score = Math.floor(100000 / ((Date.now() - this.startTime) / 1000));
        Bridge.gameOver(score);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const dt = this.clock.getDelta();
        this.update(dt);
        this.renderer.render(this.scene, this.camera);
    }
}

// --- CAR CLASS ---
class Car {
    constructor(scene, color, isPlayer) {
        this.isPlayer = isPlayer;
        this.mesh = this.createModel(color);
        scene.add(this.mesh);

        this.speed = 0;
        this.progress = 0;
        this.lastProgress = 0;
        this.nitro = 1;
        this.steer = 0;
        this.lateralOffset = 0; // Displacement from track center
    }

    createModel(color) {
        const group = new THREE.Group();

        // Car Body (Stylized Sports Car)
        const bodyGeo = new THREE.BoxGeometry(2.5, 0.8, 5);
        const bodyMat = new THREE.MeshStandardMaterial({ 
            color: color, 
            metalness: 0.9, 
            roughness: 0.1 
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.6;
        body.castShadow = true;
        group.add(body);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(2, 0.6, 2);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 1, roughness: 0 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.2, -0.5);
        group.add(cabin);

        // Neon Strips
        const neonGeo = new THREE.BoxGeometry(2.6, 0.1, 5.1);
        const neonMat = new THREE.MeshBasicMaterial({ color: color });
        const neon = new THREE.Mesh(neonGeo, neonMat);
        neon.position.y = 0.3;
        group.add(neon);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.5, 0.5, 0.4, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
        const wheelPositions = [
            [-1.3, 0.5, 1.5], [1.3, 0.5, 1.5],
            [-1.3, 0.5, -1.5], [1.3, 0.5, -1.5]
        ];

        wheelPositions.forEach(pos => {
            const wheel = new THREE.Mesh(wheelGeo, wheelMat);
            wheel.position.set(...pos);
            wheel.rotation.z = Math.PI / 2;
            group.add(wheel);
        });

        // Headlights
        const lightGeo = new THREE.BoxGeometry(0.8, 0.2, 0.1);
        const lightMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const fl = new THREE.Mesh(lightGeo, lightMat);
        fl.position.set(0.8, 0.7, 2.5);
        group.add(fl);
        const fr = fl.clone();
        fr.position.x = -0.8;
        group.add(fr);

        return group;
    }

    reset() {
        this.speed = 0;
        this.progress = 0;
        this.nitro = 1;
        this.steer = 0;
        this.lateralOffset = 0;
    }

    update(dt, input, curve) {
        // Accel / Brake
        if (input.accel) {
            let mult = 1;
            if (input.nitro && this.nitro > 0) {
                mult = CONFIG.NITRO_STRENGTH;
                this.nitro -= CONFIG.NITRO_CONSUMPTION * dt;
            } else {
                this.nitro = Math.min(1, this.nitro + CONFIG.NITRO_RECHARGE * dt);
            }
            this.speed += CONFIG.ACCELERATION * mult * dt;
        } else if (input.brake) {
            this.speed -= CONFIG.BRAKING * dt;
        } else {
            this.speed -= CONFIG.FRICTION * dt;
        }

        this.speed = Math.max(0, Math.min(this.speed, CONFIG.MAX_SPEED));

        // Steering
        if (input.left) this.steer = Math.min(CONFIG.MAX_STEER, this.steer + CONFIG.STEER_SPEED);
        else if (input.right) this.steer = Math.max(-CONFIG.MAX_STEER, this.steer - CONFIG.STEER_SPEED);
        else this.steer *= 0.9;

        this.lateralOffset += this.steer * (this.speed / 50) * dt * 20;
        this.lateralOffset = Math.max(-12, Math.min(12, this.lateralOffset));

        // Move along curve
        this.progress += (this.speed / 1000) * dt;
        if (this.progress > 1) this.progress -= 1;

        const pos = curve.getPointAt(this.progress);
        const tangent = curve.getTangentAt(this.progress);
        const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
        
        this.mesh.position.copy(pos).add(normal.clone().multiplyScalar(this.lateralOffset));
        this.mesh.lookAt(pos.clone().add(tangent));
        
        // Roll effect
        this.mesh.rotation.z = -this.steer * 0.5;

        // Exhaust Particles (Nitro)
        if (input.accel && input.nitro && this.nitro > 0) {
            this.createExhaust();
        }
    }

    createExhaust() {
        const exhaustPos = new THREE.Vector3(0, 0.6, -2.5).applyMatrix4(this.mesh.matrixWorld);
        const particleGeo = new THREE.SphereGeometry(0.1, 4, 4);
        const particleMat = new THREE.MeshBasicMaterial({ color: 0xff004c, transparent: true, opacity: 0.8 });
        const particle = new THREE.Mesh(particleGeo, particleMat);
        particle.position.copy(exhaustPos);
        this.mesh.parent.add(particle);

        const startTime = Date.now();
        const duration = 500;
        const animateParticle = () => {
            const elapsed = Date.now() - startTime;
            const t = elapsed / duration;
            if (t >= 1) {
                this.mesh.parent.remove(particle);
                particle.geometry.dispose();
                particle.material.dispose();
                return;
            }
            particle.scale.setScalar(1 + t * 2);
            particle.material.opacity = 0.8 * (1 - t);
            particle.position.add(new THREE.Vector3(0, 0, -1).applyMatrix4(this.mesh.matrixWorld).sub(this.mesh.position).normalize().multiplyScalar(0.2));
            requestAnimationFrame(animateParticle);
        };
        animateParticle();
    }

    updateAI(dt, curve, index) {
        // AI just follows the track with a bit of offset
        const aiSpeed = 150 + Math.sin(Date.now() * 0.001 + index) * 20;
        this.progress += (aiSpeed / 1000) * dt;
        if (this.progress > 1) this.progress -= 1;

        const pos = curve.getPointAt(this.progress);
        const tangent = curve.getTangentAt(this.progress);
        const normal = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
        
        // AI has fixed lateral offset based on its index
        const lateralOffset = (index * 8) - 12;
        
        this.mesh.position.copy(pos).add(normal.clone().multiplyScalar(lateralOffset));
        this.mesh.lookAt(pos.clone().add(tangent));
    }
}

// Start Game
new Game();
