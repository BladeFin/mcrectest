import * as THREE from 'three';

export class Player {
    constructor(camera, controls) {
        this.camera = camera;
        this.controls = controls;
        
        // Player state
        this.position = new THREE.Vector3(0, 20, 0);
        this.velocity = new THREE.Vector3();
        this.onGround = false;
        this.fallTime = 0; // Track how long we've been falling
        
        // Movement parameters
        this.walkSpeed = 7; // Back to original value
        this.sprintSpeed = 9.1; // Back to original value
        this.jumpForce = 8.5; // Back to original value
        this.baseGravity = 25;
        this.maxGravity = 35; // Maximum gravity after falling for a while
        this.gravityAcceleration = 14; // How quickly gravity increases
        
        // Player dimensions
        this.height = 1.2; // Reduced height to feel more natural
        this.width = 0.6;
        
        // Initialize camera position
        this.camera.position.copy(this.position);
        this.camera.position.y += 1.0; // Eye level (1.2 - 0.2 for head position)
        
        // Inventory
        this.inventory = Array(9).fill(null).map(() => ({ type: null, count: 0 }));
        this.selectedSlot = 0;

        // Debug: Log that player is initialized
        console.log('Player initialized at position:', this.position);
    }

    update(delta) {
        // Use fixed time step for physics
        const fixedDelta = 1/60; // 60 FPS fixed time step
        
        // Store old position for collision detection
        const oldPosition = this.position.clone();

        // Apply gravity with acceleration
        if (!this.onGround) {
            // Increase fall time
            this.fallTime += fixedDelta;
            
            // Calculate current gravity based on fall time
            const currentGravity = Math.min(
                this.baseGravity + (this.fallTime * this.gravityAcceleration),
                this.maxGravity
            );
            
            this.velocity.y -= currentGravity * fixedDelta;
            
            // Debug: Log falling state
            console.log('Falling with gravity:', currentGravity, 'Fall time:', this.fallTime);
        } else {
            // Reset fall time when on ground
            this.fallTime = 0;
        }

        // Update position based on velocity
        this.position.x += this.velocity.x * fixedDelta;
        this.position.z += this.velocity.z * fixedDelta;
        this.position.y += this.velocity.y * fixedDelta;
        
        // Check for collisions with blocks
        this.handleCollisions(oldPosition);
        
        // Update camera position
        this.camera.position.x = this.position.x;
        this.camera.position.z = this.position.z;
        this.camera.position.y = this.position.y + 1.0; // Keep camera at eye level

        // Debug: Log ground state and position
        console.log('Ground state:', this.onGround, 'Position:', this.position);
    }

    handleCollisions(oldPosition) {
        if (!this.world || !this.world.blocks) return;

        // Create player bounding box
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            this.position,
            new THREE.Vector3(this.width, this.height, this.width)
        );

        // Check collision with all blocks
        let highestBlockY = -Infinity;
        let collision = false;

        for (const block of this.world.blocks.children) {
            const blockBox = new THREE.Box3().setFromObject(block);
            
            if (playerBox.intersectsBox(blockBox)) {
                collision = true;
                
                // Calculate collision response
                const blockCenter = new THREE.Vector3();
                blockBox.getCenter(blockCenter);
                
                // Calculate penetration depth for each axis
                const penetrationX = Math.min(
                    Math.abs(playerBox.max.x - blockBox.min.x),
                    Math.abs(playerBox.min.x - blockBox.max.x)
                );
                const penetrationY = Math.min(
                    Math.abs(playerBox.max.y - blockBox.min.y),
                    Math.abs(playerBox.min.y - blockBox.max.y)
                );
                const penetrationZ = Math.min(
                    Math.abs(playerBox.max.z - blockBox.min.z),
                    Math.abs(playerBox.min.z - blockBox.max.z)
                );

                // Find the minimum penetration axis
                const minPenetration = Math.min(penetrationX, penetrationY, penetrationZ);

                // Handle vertical collision
                if (minPenetration === penetrationY) {
                    if (this.position.y > block.position.y) {
                        // Only snap to block if we're moving downward and close to the block
                        if (this.velocity.y <= 0 && this.position.y - (blockBox.max.y + this.height/2) < 0.1) {
                            this.position.y = blockBox.max.y + this.height / 2;
                            this.velocity.y = 0;
                            highestBlockY = Math.max(highestBlockY, block.position.y + 1);
                            this.onGround = true;
                        }
                    } else {
                        // Hitting ceiling - stop upward momentum
                        this.position.y = blockBox.min.y - this.height / 2;
                        this.velocity.y = Math.min(0, this.velocity.y); // Only stop upward momentum
                    }
                } else if (minPenetration === penetrationX) {
                    // Horizontal collision (X axis)
                    if (this.position.x > block.position.x) {
                        this.position.x = blockBox.max.x + this.width / 2;
                    } else {
                        this.position.x = blockBox.min.x - this.width / 2;
                    }
                    this.velocity.x = 0;
                } else if (minPenetration === penetrationZ) {
                    // Horizontal collision (Z axis)
                    if (this.position.z > block.position.z) {
                        this.position.z = blockBox.max.z + this.width / 2;
                    } else {
                        this.position.z = blockBox.min.z - this.width / 2;
                    }
                    this.velocity.z = 0;
                }
            }
        }

        // Update ground state if not standing on any block
        if (this.position.y > highestBlockY + 0.1) {
            this.onGround = false;
        }
    }

    move(direction, isSprinting) {
        // Debug: Log movement input
        console.log('Move called with direction:', direction, 'Sprinting:', isSprinting);

        // Get the forward and right vectors from the camera
        const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion);
        const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
        
        // Remove y component for horizontal movement
        forward.y = 0;
        right.y = 0;
        forward.normalize();
        right.normalize();
        
        // Calculate movement vector
        const moveVector = new THREE.Vector3();
        moveVector.addScaledVector(forward, direction.z);
        moveVector.addScaledVector(right, direction.x);
        
        // Apply movement
        if (moveVector.length() > 0) {
            moveVector.normalize();
            const speed = isSprinting ? this.sprintSpeed : this.walkSpeed;
            this.velocity.x = moveVector.x * speed;
            this.velocity.z = moveVector.z * speed;
            
            // Debug: Log velocity
            console.log('New velocity:', this.velocity, 'Speed:', speed);
        } else {
            this.velocity.x = 0;
            this.velocity.z = 0;
        }
    }

    jump() {
        console.log('Jump called, onGround:', this.onGround); // Debug log
        if (this.onGround) {
            this.velocity.y = this.jumpForce;
            this.onGround = false;
            console.log('Jumping with velocity:', this.velocity); // Debug log
        } else {
            console.log('Cannot jump - not on ground'); // Debug log
        }
    }

    setSelectedSlot(slot) {
        if (slot >= 0 && slot < 9) {
            this.selectedSlot = slot;
            // Update UI
            document.querySelectorAll('.inventory-slot').forEach((el, index) => {
                el.classList.toggle('selected', index === slot);
            });
        }
    }

    addToInventory(blockType) {
        // Find first slot with same block type or empty slot
        let slot = this.inventory.findIndex(item => item.type === blockType || item.type === null);
        if (slot === -1) {
            slot = this.selectedSlot; // Use selected slot if no matching slots
        }
        
        // Add to inventory
        if (this.inventory[slot].type === null) {
            this.inventory[slot] = { type: blockType, count: 1 };
        } else {
            this.inventory[slot].count++;
        }
        
        this.updateInventoryUI();
    }

    removeFromInventory() {
        const slot = this.inventory[this.selectedSlot];
        if (slot && slot.type !== null) {
            slot.count--;
            if (slot.count <= 0) {
                slot.type = null;
                slot.count = 0;
            }
            this.updateInventoryUI();
        }
    }

    getSelectedBlockType() {
        return this.inventory[this.selectedSlot].type;
    }

    updateInventoryUI() {
        document.querySelectorAll('.inventory-slot').forEach((el, index) => {
            const slot = this.inventory[index];
            if (slot.type) {
                el.textContent = `${slot.type[0].toUpperCase()}${slot.count > 1 ? slot.count : ''}`;
            } else {
                el.textContent = (index + 1).toString();
            }
        });
    }
} 