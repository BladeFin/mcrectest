import * as THREE from 'three';
import { PointerLockControls } from 'three/examples/jsm/controls/PointerLockControls.js';
import { World } from './world.js';
import { Player } from './player.js';
import { InputHandler } from './input.js';

class Game {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = new THREE.WebGLRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(this.renderer.domElement);

        // Add ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Add directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.6);
        directionalLight.position.set(10, 20, 10);
        this.scene.add(directionalLight);

        // Initialize world first
        this.world = new World(this.scene);

        // Initialize controls
        this.controls = new PointerLockControls(this.camera, document.body);
        this.scene.add(this.controls.getObject());

        // Initialize player with safe spawn position
        const spawnPosition = this.world.findSafeSpawnPosition();
        this.player = new Player(this.camera, this.controls);
        this.player.position.copy(spawnPosition);
        this.player.camera.position.copy(spawnPosition);
        this.player.world = this.world; // Set the world reference
        
        this.input = new InputHandler(this.player, this.world);

        // Add FPS counter
        this.fpsCounter = document.createElement('div');
        this.fpsCounter.style.position = 'fixed';
        this.fpsCounter.style.top = '10px';
        this.fpsCounter.style.left = '10px';
        this.fpsCounter.style.color = 'white';
        this.fpsCounter.style.fontFamily = 'monospace';
        this.fpsCounter.style.fontSize = '14px';
        this.fpsCounter.style.textShadow = '1px 1px 1px black';
        this.fpsCounter.style.pointerEvents = 'none';
        document.body.appendChild(this.fpsCounter);

        // FPS calculation variables
        this.frameCount = 0;
        this.lastTime = performance.now();
        this.fps = 0;
        this.targetFPS = 60;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastFrameTime = 0;

        // Add click-to-start overlay
        this.overlay = document.createElement('div');
        this.overlay.style.position = 'fixed';
        this.overlay.style.top = '0';
        this.overlay.style.left = '0';
        this.overlay.style.width = '100%';
        this.overlay.style.height = '100%';
        this.overlay.style.background = 'rgba(0, 0, 0, 0.5)';
        this.overlay.style.color = 'white';
        this.overlay.style.display = 'flex';
        this.overlay.style.justifyContent = 'center';
        this.overlay.style.alignItems = 'center';
        this.overlay.style.fontSize = '24px';
        this.overlay.style.cursor = 'pointer';
        this.overlay.textContent = 'Click to Start';
        document.body.appendChild(this.overlay);

        // Setup pointer lock
        this.overlay.addEventListener('click', () => {
            this.controls.lock();
        });

        this.controls.addEventListener('lock', () => {
            this.overlay.style.display = 'none';
        });

        this.controls.addEventListener('unlock', () => {
            this.overlay.style.display = 'flex';
        });

        // Handle window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Start game loop
        this.animate();
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));
        
        const currentTime = performance.now();
        const elapsed = currentTime - this.lastFrameTime;
        
        // Only update if enough time has passed
        if (elapsed >= this.frameInterval) {
            // Calculate FPS
            this.frameCount++;
            const timeSinceLastFPSUpdate = currentTime - this.lastTime;
            
            if (timeSinceLastFPSUpdate >= 1000) {
                this.fps = Math.round((this.frameCount * 1000) / timeSinceLastFPSUpdate);
                this.fpsCounter.textContent = `FPS: ${this.fps}`;
                this.frameCount = 0;
                this.lastTime = currentTime;
            }
            
            const delta = this.frameInterval / 1000; // Convert to seconds
            this.input.update();
            this.player.update(delta);
            this.world.update(this.player.position);
            
            this.renderer.render(this.scene, this.camera);
            
            this.lastFrameTime = currentTime;
        }
    }
}

// Start the game
const game = new Game(); 