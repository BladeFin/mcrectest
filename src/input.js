import * as THREE from 'three';

export class InputHandler {
    constructor(player, world, domElement) {
        this.player = player;
        this.world = world;
        this.domElement = domElement; // The DOM element to attach listeners to
        
        // Movement state
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            jump: false,
            sprint: false
        };
        
        // Mouse state
        this.mouseDown = false;
        this.lastClickTime = 0;
        
        // Block highlight
        this.highlightedBlock = null;
        this.originalMaterials = new Map(); // Store original materials
        
        // Setup event listeners
        this.setupKeyboardEvents();
        this.setupMouseEvents();
        this.setupTouchEvents(); // Add touch events
        this.setupMobileKeypadEvents(); // Add keypad events

        // Debug: Log that input handler is initialized
        console.log('Input handler initialized');
    }

    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            console.log('Key pressed:', e.code); // Debug log
            switch(e.code) {
                case 'KeyW':
                    this.keys.forward = true;
                    break;
                case 'KeyS':
                    this.keys.backward = true;
                    break;
                case 'KeyA':
                    this.keys.left = true;
                    break;
                case 'KeyD':
                    this.keys.right = true;
                    break;
                case 'Space':
                    console.log('Space pressed - attempting jump'); // Debug log
                    this.keys.jump = true;
                    this.player.jump();
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.sprint = true;
                    console.log('Sprint activated'); // Debug log
                    break;
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                case 'Digit8':
                case 'Digit9':
                    const slot = parseInt(e.code.replace('Digit', '')) - 1;
                    this.player.setSelectedSlot(slot);
                    break;
            }
        });

        document.addEventListener('keyup', (e) => {
            console.log('Key released:', e.code); // Debug log
            switch(e.code) {
                case 'KeyW':
                    this.keys.forward = false;
                    break;
                case 'KeyS':
                    this.keys.backward = false;
                    break;
                case 'KeyA':
                    this.keys.left = false;
                    break;
                case 'KeyD':
                    this.keys.right = false;
                    break;
                case 'Space':
                    console.log('Space released'); // Debug log
                    this.keys.jump = false;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.sprint = false;
                    console.log('Sprint deactivated'); // Debug log
                    break;
            }
        });
    }

    setupMouseEvents() {
        document.addEventListener('mousedown', (e) => {
            if (e.button === 0) { // Left click
                this.mouseDown = true;
                this.handleBlockInteraction();
            } else if (e.button === 2) { // Right click
                this.handleBlockPlacement();
            }
        });

        document.addEventListener('mouseup', (e) => {
            if (e.button === 0) {
                this.mouseDown = false;
            }
        });

        // Prevent context menu on right click
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
        });
    }

    setupTouchEvents() {
        let touchStartX = null;
        let touchStartY = null;
        let touchStartTime = null; // To detect taps
        let initialTouches = 0; // To count fingers on touchstart
        const tapThresholdTime = 300; // ms
        const tapThresholdDistance = 10; // pixels

        this.domElement.addEventListener('touchstart', (e) => {
            initialTouches = e.touches.length;
            if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = performance.now();
            } else {
                 // Reset if more than one touch starts for drag
                touchStartX = null;
                touchStartY = null;
                touchStartTime = null;
            }
        });

        this.domElement.addEventListener('touchmove', (e) => {
            e.preventDefault(); // Keep this to prevent scrolling while dragging
            if (e.touches.length === 1 && touchStartX !== null && touchStartY !== null) {
                const touchCurrentX = e.touches[0].clientX;
                const touchCurrentY = e.touches[0].clientY;

                // Reverse delta values for inverted controls
                const deltaX = touchStartX - touchCurrentX;
                const deltaY = touchStartY - touchCurrentY;

                // Apply rotation to player's camera based on delta
                const rotationSpeed = 0.002; // Adjust this value for sensitivity

                // Rotate horizontally (yaw)
                this.player.camera.rotation.y += deltaX * rotationSpeed; // Use += for reversed horizontal

                // Rotate vertically (pitch), clamping to prevent flipping
                this.player.camera.rotation.x += deltaY * rotationSpeed; // Use += for reversed vertical
                this.player.camera.rotation.x = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2,
                    this.player.camera.rotation.x)
                );

                touchStartX = touchCurrentX;
                touchStartY = touchCurrentY;

                // Prevent tap from being registered if there's significant movement
                if (Math.abs(deltaX) > tapThresholdDistance || Math.abs(deltaY) > tapThresholdDistance) {
                     touchStartTime = null; // Invalidate tap detection
                }
            } else {
                 // Reset drag tracking if the number of touches changes
                touchStartX = null;
                touchStartY = null;
            }
        });

        this.domElement.addEventListener('touchend', (e) => {
            // Check for tap gesture only if a touch started and didn't move much
            if (touchStartTime !== null && performance.now() - touchStartTime < tapThresholdTime) {
                 // Check if all fingers lifted and how many were initially used
                if (e.touches.length === 0) {
                    if (initialTouches === 1) {
                        // One-finger tap to break block
                        console.log('One-finger tap detected - attempting to break block'); // Debug
                        this.handleBlockInteraction();
                    } else if (initialTouches === 2) {
                        // Two-finger tap to place block
                         console.log('Two-finger tap detected - attempting to place block'); // Debug
                        this.handleBlockPlacement();
                    }
                }
            }

            // Reset touch state
            touchStartX = null;
            touchStartY = null;
            touchStartTime = null;
            initialTouches = 0;
        });
    }

    setupMobileKeypadEvents() {
        const moveForwardButton = document.getElementById('move-forward');
        const moveBackwardButton = document.getElementById('move-backward');
        const moveLeftButton = document.getElementById('move-left');
        const moveRightButton = document.getElementById('move-right');
        const jumpButton = document.getElementById('jump-button');

        if (moveForwardButton) {
            moveForwardButton.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.forward = true; console.log('Keypad Forward: true', this.keys); });
            moveForwardButton.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.forward = false; console.log('Keypad Forward: false', this.keys); });
        }
        if (moveBackwardButton) {
            moveBackwardButton.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.backward = true; console.log('Keypad Backward: true', this.keys); });
            moveBackwardButton.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.backward = false; console.log('Keypad Backward: false', this.keys); });
        }
        if (moveLeftButton) {
            moveLeftButton.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.left = true; console.log('Keypad Left: true', this.keys); });
            moveLeftButton.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.left = false; console.log('Keypad Left: false', this.keys); });
        }
        if (moveRightButton) {
            moveRightButton.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.right = true; console.log('Keypad Right: true', this.keys); });
            moveRightButton.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.right = false; console.log('Keypad Right: false', this.keys); });
        }
        if (jumpButton) {
            jumpButton.addEventListener('touchstart', (e) => { e.stopPropagation(); e.preventDefault(); this.player.jump(); console.log('Keypad Jump'); });
            // For jump, we only need touchstart to trigger the jump
            // jumpButton.addEventListener('touchend', (e) => { e.stopPropagation(); e.preventDefault(); this.keys.jump = false; }); // Not needed for jump action, removed preventDefault too
        }
    }

    handleBlockInteraction() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.player.camera);
        
        const intersects = raycaster.intersectObjects(this.world.blocks.children);
        if (intersects.length > 0) {
            const block = intersects[0].object;
            // Check if block is within reach (5 blocks)
            const distance = block.position.distanceTo(this.player.position);
            if (distance <= 5) {
                // Add block to inventory
                const blockType = block.userData.type;
                this.player.addToInventory(blockType);
                this.world.removeBlock(block);
            }
        }
    }

    handleBlockPlacement() {
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.player.camera);
        
        const intersects = raycaster.intersectObjects(this.world.blocks.children);
        if (intersects.length > 0) {
            const intersection = intersects[0];
            const normal = intersection.face.normal;
            const position = intersection.point.add(normal.multiplyScalar(0.5));
            
            // Round position to nearest block
            position.x = Math.round(position.x);
            position.y = Math.round(position.y);
            position.z = Math.round(position.z);
            
            // Check if block is within reach (5 blocks)
            const distance = position.distanceTo(this.player.position);
            if (distance <= 5) {
                // Create a box for the block that would be placed
                const blockBox = new THREE.Box3().setFromCenterAndSize(
                    position,
                    new THREE.Vector3(1, 1, 1)
                );
                
                // Create player bounding box
                const playerBox = new THREE.Box3().setFromCenterAndSize(
                    this.player.position,
                    new THREE.Vector3(this.player.width, this.player.height, this.player.width)
                );
                
                // Only place block if it doesn't intersect with player
                if (!blockBox.intersectsBox(playerBox)) {
                    // Get block type from selected inventory slot
                    const blockType = this.player.getSelectedBlockType();
                    if (blockType) {
                        this.world.addBlock(position, this.world.blockTypes[blockType]);
                        this.player.removeFromInventory();
                    }
                }
            }
        }
    }

    update() {
        // Calculate movement direction
        const direction = new THREE.Vector3(
            (this.keys.right ? 1 : 0) - (this.keys.left ? 1 : 0),
            0,
            (this.keys.forward ? 1 : 0) - (this.keys.backward ? 1 : 0)
        );
        
        // Update block highlight
        const raycaster = new THREE.Raycaster();
        raycaster.setFromCamera(new THREE.Vector2(0, 0), this.player.camera);
        const intersects = raycaster.intersectObjects(this.world.blocks.children);
        
        // Restore previous highlighted block
        if (this.highlightedBlock && this.highlightedBlock !== intersects[0]?.object) {
            const originalMaterial = this.originalMaterials.get(this.highlightedBlock);
            if (originalMaterial) {
                this.highlightedBlock.material = originalMaterial;
                this.originalMaterials.delete(this.highlightedBlock);
            }
            this.highlightedBlock = null;
        }
        
        // Highlight new block
        if (intersects.length > 0) {
            const block = intersects[0].object;
            if (block !== this.highlightedBlock) {
                // Store original material if not already stored
                if (!this.originalMaterials.has(block)) {
                    this.originalMaterials.set(block, block.material);
                    
                    // Create highlighted material
                    const highlightMaterial = block.material.clone();
                    if (highlightMaterial.map) {
                        // If the material has a texture, adjust its color
                        highlightMaterial.color.multiplyScalar(1.5); // Make it 50% brighter
                    } else {
                        // If it's a solid color, make it brighter
                        highlightMaterial.color.multiplyScalar(1.5);
                    }
                    block.material = highlightMaterial;
                }
                this.highlightedBlock = block;
            }
        }
        
        // Debug: Log movement state
        if (direction.length() > 0) {
            console.log('Moving:', direction, 'Sprint:', this.keys.sprint);
        }
        
        this.player.move(direction, this.keys.sprint);

        // Debug: Log keys state if any movement key is active
        if (this.keys.forward || this.keys.backward || this.keys.left || this.keys.right || this.keys.jump || this.keys.sprint) {
             console.log('InputHandler Update Keys State:', this.keys);
        }
    }
} 