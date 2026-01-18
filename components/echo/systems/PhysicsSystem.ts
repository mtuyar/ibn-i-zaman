'worklet';
export interface PhysicsState {
    position: { x: number; y: number };
    velocity: { x: number; y: number };
}

export const GRAVITY = 0.5;
export const JUMP_FORCE = -12;
export const MOVE_SPEED = 5;
export const FRICTION = 0.8;

export const updatePhysics = (
    state: PhysicsState,
    input: { left: boolean; right: boolean; jump: boolean },
    dt: number
): PhysicsState => {
    let { position, velocity } = state;

    // Horizontal Movement
    if (input.left) velocity.x -= 1;
    if (input.right) velocity.x += 1;

    // Apply Friction
    velocity.x *= FRICTION;

    // Clamp Speed
    if (velocity.x > MOVE_SPEED) velocity.x = MOVE_SPEED;
    if (velocity.x < -MOVE_SPEED) velocity.x = -MOVE_SPEED;

    // Gravity
    velocity.y += GRAVITY;

    // Apply Velocity
    position.x += velocity.x;
    position.y += velocity.y;

    // Floor Collision (Simple)
    if (position.y > 500) {
        position.y = 500;
        velocity.y = 0;

        // Jump
        if (input.jump) {
            velocity.y = JUMP_FORCE;
        }
    }

    return { position, velocity };
};
