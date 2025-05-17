import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';

export class World {
    constructor(scene) {
        this.scene = scene;
        this.blocks = new THREE.Group();
        this.scene.add(this.blocks);
        
        // Block types
        this.blockTypes = {
            grass: new THREE.MeshLambertMaterial({ color: 0x567d46 }),
            dirt: new THREE.MeshLambertMaterial({ color: 0x8b4513 }),
            stone: new THREE.MeshLambertMaterial({ color: 0x808080 }),
            wood: new THREE.MeshLambertMaterial({ color: 0x8b4513 }),
            leaves: new THREE.MeshLambertMaterial({ color: 0x228b22 })
        };
        
        // Create block geometry
        this.blockGeometry = new THREE.BoxGeometry(1, 1, 1);
        
        // Initialize noise generator
        this.noise2D = createNoise2D();
        
        // Create textures with borders
        this.createTextures();
        
        // Generate initial terrain
        this.generateTerrain();
    }

    createTextures() {
        const textureSize = 16;
        const borderSize = 1;
        
        // Create a canvas for each texture
        Object.keys(this.blockTypes).forEach(type => {
            const canvas = document.createElement('canvas');
            canvas.width = textureSize;
            canvas.height = textureSize;
            const ctx = canvas.getContext('2d');

            // Get the base color
            const color = this.blockTypes[type].color;
            const r = Math.floor(color.r * 255);
            const g = Math.floor(color.g * 255);
            const b = Math.floor(color.b * 255);

            // Fill with base color
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.fillRect(0, 0, textureSize, textureSize);

            // Add darker border
            ctx.fillStyle = `rgb(${Math.floor(r * 0.7)}, ${Math.floor(g * 0.7)}, ${Math.floor(b * 0.7)})`;
            ctx.fillRect(0, 0, textureSize, borderSize); // Top
            ctx.fillRect(0, textureSize - borderSize, textureSize, borderSize); // Bottom
            ctx.fillRect(0, 0, borderSize, textureSize); // Left
            ctx.fillRect(textureSize - borderSize, 0, borderSize, textureSize); // Right

            // Create texture from canvas
            const texture = new THREE.CanvasTexture(canvas);
            texture.magFilter = THREE.NearestFilter;
            texture.minFilter = THREE.NearestFilter;

            // Update material with new texture
            this.blockTypes[type] = new THREE.MeshLambertMaterial({ map: texture });
        });
    }

    generateTerrain() {
        const size = 48; // Increased world size from 32 to 100
        const height = 8; // Maximum terrain height
        
        // Create a flat base layer
        for (let x = -size/2; x < size/2; x++) {
            for (let z = -size/2; z < size/2; z++) {
                // Generate height using simplex noise with adjusted scale for larger world
                const elevation = Math.floor(
                    (this.noise2D(x * 0.05, z * 0.05) + 1) * height/2
                );
                
                // Create ground blocks
                for (let y = 0; y <= elevation; y++) {
                    let material;
                    if (y === elevation) {
                        material = this.blockTypes.grass;
                    } else if (y > elevation - 3) {
                        material = this.blockTypes.dirt;
                    } else {
                        material = this.blockTypes.stone;
                    }
                    
                    this.addBlock(new THREE.Vector3(x, y, z), material);
                }
                
                // Generate trees with reduced frequency for larger world
                if (Math.random() < 0.01) { // Reduced from 0.02 to 0.01
                    this.generateTree(x, elevation + 1, z);
                }
            }
        }

        // Add a skybox
        const skyboxGeometry = new THREE.BoxGeometry(1000, 1000, 1000);
        const skyboxMaterial = new THREE.MeshBasicMaterial({
            color: 0x87CEEB,
            side: THREE.BackSide
        });
        const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterial);
        this.scene.add(skybox);
    }

    generateTree(x, y, z) {
        const treeHeight = 4 + Math.floor(Math.random() * 3);
        
        // Generate trunk
        for (let i = 0; i < treeHeight; i++) {
            this.addBlock(
                new THREE.Vector3(x, y + i, z),
                this.blockTypes.wood
            );
        }
        
        // Generate leaves
        for (let lx = -2; lx <= 2; lx++) {
            for (let ly = -1; ly <= 2; ly++) {
                for (let lz = -2; lz <= 2; lz++) {
                    // Skip corners for a more natural look
                    if (Math.abs(lx) === 2 && Math.abs(lz) === 2) continue;
                    
                    this.addBlock(
                        new THREE.Vector3(x + lx, y + treeHeight + ly, z + lz),
                        this.blockTypes.leaves
                    );
                }
            }
        }
    }

    addBlock(position, material = this.blockTypes.dirt) {
        const block = new THREE.Mesh(this.blockGeometry, material);
        block.position.copy(position);
        block.userData.type = material === this.blockTypes.grass ? 'grass' :
                            material === this.blockTypes.dirt ? 'dirt' :
                            material === this.blockTypes.stone ? 'stone' :
                            material === this.blockTypes.wood ? 'wood' : 'leaves';
        this.blocks.add(block);
    }

    removeBlock(block) {
        if (block && block.parent === this.blocks) {
            this.blocks.remove(block);
        }
    }

    // Find a safe spawn position
    findSafeSpawnPosition() {
        // Start at the center of the world
        const centerX = 0;
        const centerZ = 0;
        
        // Find the highest block at this position
        let highestY = 0;
        for (const block of this.blocks.children) {
            if (block.position.x === centerX && block.position.z === centerZ) {
                highestY = Math.max(highestY, block.position.y);
            }

        }
        
        // Return position above the highest block
        return new THREE.Vector3(centerX, highestY + 2, centerZ);
    }

    update(playerPosition) {
        // Here you could implement chunk loading/unloading based on player position
        // For now, we'll keep it simple and just update the entire world
    }

    handleTouchInput(touchX, touchY) {
        // Calculate movement direction based on touch input
        const moveX = (touchX / window.innerWidth) * 2 - 1; // Normalize to -1 to 1
        const moveZ = (touchY / window.innerHeight) * 2 - 1; // Normalize to -1 to 1

        // Update player movement
        this.move({ x: moveX, z: moveZ }, false); // Pass false for sprinting
    }
} 