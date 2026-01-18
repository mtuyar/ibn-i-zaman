// Maze generation utilities with enemy patrol paths
// Generates a perfect maze with collectibles and enemy spawn points

export interface Cell {
    x: number;
    y: number;
    walls: {
        top: boolean;
        right: boolean;
        bottom: boolean;
        left: boolean;
    };
    visited: boolean;
}

export interface PatrolEnemy {
    id: string;
    startX: number;
    startY: number;
    endX: number;
    endY: number;
    speed: number; // cells per second
}

export interface Collectible {
    x: number;
    y: number;
    type: 'namaz' | 'tesbih' | 'zikir' | 'kuran';
    points: number;
}

export interface Maze {
    grid: Cell[][];
    width: number;
    height: number;
    start: { x: number; y: number };
    end: { x: number; y: number };
    collectibles: Collectible[];
    timeFragments: { x: number; y: number }[];
    enemies: PatrolEnemy[];
    // Legacy support
    crystals: { x: number; y: number; color: string }[];
}

const DIRECTIONS = [
    { dx: 0, dy: -1, wall: 'top', opposite: 'bottom' },
    { dx: 1, dy: 0, wall: 'right', opposite: 'left' },
    { dx: 0, dy: 1, wall: 'bottom', opposite: 'top' },
    { dx: -1, dy: 0, wall: 'left', opposite: 'right' },
] as const;

function shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
}

function createGrid(width: number, height: number): Cell[][] {
    const grid: Cell[][] = [];
    for (let y = 0; y < height; y++) {
        const row: Cell[] = [];
        for (let x = 0; x < width; x++) {
            row.push({
                x,
                y,
                walls: { top: true, right: true, bottom: true, left: true },
                visited: false,
            });
        }
        grid.push(row);
    }
    return grid;
}

function generateMazePaths(grid: Cell[][], startX: number, startY: number): void {
    const stack: Cell[] = [];
    const start = grid[startY][startX];
    start.visited = true;
    stack.push(start);

    while (stack.length > 0) {
        const current = stack[stack.length - 1];
        const neighbors: { cell: Cell; direction: typeof DIRECTIONS[number] }[] = [];

        for (const dir of DIRECTIONS) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            if (nx >= 0 && nx < grid[0].length && ny >= 0 && ny < grid.length) {
                const neighbor = grid[ny][nx];
                if (!neighbor.visited) {
                    neighbors.push({ cell: neighbor, direction: dir });
                }
            }
        }

        if (neighbors.length > 0) {
            const { cell: next, direction } = shuffle(neighbors)[0];
            current.walls[direction.wall as keyof Cell['walls']] = false;
            next.walls[direction.opposite as keyof Cell['walls']] = false;
            next.visited = true;
            stack.push(next);
        } else {
            stack.pop();
        }
    }
}

// Find horizontal or vertical corridors for enemy patrol
function findPatrolPaths(
    grid: Cell[][],
    start: { x: number; y: number },
    end: { x: number; y: number },
    count: number
): PatrolEnemy[] {
    const enemies: PatrolEnemy[] = [];
    const usedRows = new Set<number>();
    const usedCols = new Set<number>();

    // Find horizontal corridors (at least 2 cells connected horizontally)
    for (let y = 1; y < grid.length - 1; y++) {
        if (usedRows.has(y)) continue;

        for (let x = 0; x < grid[0].length - 1; x++) {
            const cell = grid[y][x];
            // Skip if near start or end
            if ((Math.abs(x - start.x) <= 1 && Math.abs(y - start.y) <= 1) ||
                (Math.abs(x - end.x) <= 1 && Math.abs(y - end.y) <= 1)) continue;

            // Check for horizontal corridor
            if (!cell.walls.right) {
                let corridorEnd = x;
                while (corridorEnd < grid[0].length - 1 && !grid[y][corridorEnd].walls.right) {
                    corridorEnd++;
                }

                if (corridorEnd - x >= 2) {
                    enemies.push({
                        id: `enemy-${enemies.length}`,
                        startX: x,
                        startY: y,
                        endX: corridorEnd,
                        endY: y,
                        speed: 0.8 + Math.random() * 0.4 // 0.8 - 1.2 cells/sec
                    });
                    usedRows.add(y);

                    if (enemies.length >= count) return enemies;
                    break;
                }
            }
        }
    }

    // Find vertical corridors if we need more
    for (let x = 1; x < grid[0].length - 1; x++) {
        if (usedCols.has(x) || enemies.length >= count) continue;

        for (let y = 0; y < grid.length - 1; y++) {
            const cell = grid[y][x];
            if ((Math.abs(x - start.x) <= 1 && Math.abs(y - start.y) <= 1) ||
                (Math.abs(x - end.x) <= 1 && Math.abs(y - end.y) <= 1)) continue;

            if (!cell.walls.bottom) {
                let corridorEnd = y;
                while (corridorEnd < grid.length - 1 && !grid[corridorEnd][x].walls.bottom) {
                    corridorEnd++;
                }

                if (corridorEnd - y >= 2) {
                    enemies.push({
                        id: `enemy-${enemies.length}`,
                        startX: x,
                        startY: y,
                        endX: x,
                        endY: corridorEnd,
                        speed: 0.6 + Math.random() * 0.4
                    });
                    usedCols.add(x);

                    if (enemies.length >= count) return enemies;
                    break;
                }
            }
        }
    }

    return enemies;
}

function placeCollectibles(
    grid: Cell[][],
    start: { x: number; y: number },
    end: { x: number; y: number },
    level: number
): { collectibles: Collectible[]; timeFragments: { x: number; y: number }[] } {
    const collectibles: Collectible[] = [];
    const timeFragments: { x: number; y: number }[] = [];
    const usedPositions = new Set<string>();

    usedPositions.add(`${start.x},${start.y}`);
    usedPositions.add(`${end.x},${end.y}`);

    const deadEnds: { x: number; y: number }[] = [];
    const corners: { x: number; y: number }[] = [];

    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[0].length; x++) {
            const cell = grid[y][x];
            const openings = Object.values(cell.walls).filter(w => !w).length;

            if (openings === 1 && !usedPositions.has(`${x},${y}`)) {
                deadEnds.push({ x, y });
            } else if (openings === 2 && !usedPositions.has(`${x},${y}`)) {
                const { top, right, bottom, left } = cell.walls;
                const isCorner = (!top && !right) || (!right && !bottom) ||
                    (!bottom && !left) || (!left && !top);
                if (isCorner) {
                    corners.push({ x, y });
                }
            }
        }
    }

    const shuffledDeadEnds = shuffle(deadEnds);
    const shuffledCorners = shuffle(corners);

    // Define collectible types with their rarities and points
    const collectibleTypes: Array<{ type: Collectible['type']; points: number; weight: number }> = [
        { type: 'namaz', points: 30, weight: 40 },
        { type: 'tesbih', points: 20, weight: 35 },
        { type: 'zikir', points: 40, weight: 20 },
        { type: 'kuran', points: 100, weight: 5 },
    ];

    const getRandomType = () => {
        const totalWeight = collectibleTypes.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        for (const type of collectibleTypes) {
            random -= type.weight;
            if (random <= 0) return type;
        }
        return collectibleTypes[0];
    };

    // Place time fragments (1-2 based on level)
    const fragmentCount = Math.min(1 + Math.floor(level / 3), 2);
    for (let i = 0; i < Math.min(fragmentCount, shuffledDeadEnds.length); i++) {
        const pos = shuffledDeadEnds[i];
        timeFragments.push({ x: pos.x, y: pos.y });
        usedPositions.add(`${pos.x},${pos.y}`);
    }

    // Place collectibles (4-8 based on level)
    const collectibleCount = Math.min(4 + level, 8);
    const availablePositions = [
        ...shuffledDeadEnds.slice(fragmentCount),
        ...shuffledCorners
    ].filter(p => !usedPositions.has(`${p.x},${p.y}`));

    for (let i = 0; i < Math.min(collectibleCount, availablePositions.length); i++) {
        const pos = availablePositions[i];
        const typeInfo = getRandomType();
        collectibles.push({
            x: pos.x,
            y: pos.y,
            type: typeInfo.type,
            points: typeInfo.points
        });
        usedPositions.add(`${pos.x},${pos.y}`);
    }

    return { collectibles, timeFragments };
}

function findFarthestPoint(
    grid: Cell[][],
    startX: number,
    startY: number
): { x: number; y: number } {
    const distances: number[][] = grid.map(row => row.map(() => -1));
    const queue: { x: number; y: number; dist: number }[] = [{ x: startX, y: startY, dist: 0 }];
    distances[startY][startX] = 0;

    let farthest = { x: startX, y: startY, dist: 0 };

    while (queue.length > 0) {
        const current = queue.shift()!;
        const cell = grid[current.y][current.x];

        for (const dir of DIRECTIONS) {
            const nx = current.x + dir.dx;
            const ny = current.y + dir.dy;

            if (
                nx >= 0 && nx < grid[0].length &&
                ny >= 0 && ny < grid.length &&
                distances[ny][nx] === -1 &&
                !cell.walls[dir.wall as keyof Cell['walls']]
            ) {
                const newDist = current.dist + 1;
                distances[ny][nx] = newDist;
                queue.push({ x: nx, y: ny, dist: newDist });

                if (newDist > farthest.dist) {
                    farthest = { x: nx, y: ny, dist: newDist };
                }
            }
        }
    }

    return { x: farthest.x, y: farthest.y };
}

export function generateMaze(
    width: number,
    height: number,
    level: number = 1
): Maze {
    const grid = createGrid(width, height);
    const startX = 0;
    const startY = 0;

    generateMazePaths(grid, startX, startY);
    const end = findFarthestPoint(grid, startX, startY);

    const { collectibles, timeFragments } = placeCollectibles(
        grid,
        { x: startX, y: startY },
        end,
        level
    );

    // Add enemies based on level (0 at level 1, then increase)
    const enemyCount = Math.min(Math.floor((level - 1) / 2), 3);
    const enemies = enemyCount > 0 ? findPatrolPaths(
        grid,
        { x: startX, y: startY },
        end,
        enemyCount
    ) : [];

    // Legacy crystals support - convert collectibles to crystals format
    const crystals = collectibles.map(c => ({
        x: c.x,
        y: c.y,
        color: c.type === 'kuran' ? '#FFD700' :
            c.type === 'zikir' ? '#9C27B0' :
                c.type === 'namaz' ? '#2196F3' : '#795548'
    }));

    return {
        grid,
        width,
        height,
        start: { x: startX, y: startY },
        end,
        collectibles,
        timeFragments,
        enemies,
        crystals
    };
}

export function cellToScreen(
    cellX: number,
    cellY: number,
    cellSize: number,
    offsetX: number = 0,
    offsetY: number = 0
): { x: number; y: number } {
    return {
        x: cellX * cellSize + cellSize / 2 + offsetX,
        y: cellY * cellSize + cellSize / 2 + offsetY
    };
}

export function canMove(
    maze: Maze,
    fromX: number,
    fromY: number,
    direction: 'up' | 'down' | 'left' | 'right'
): boolean {
    if (fromX < 0 || fromX >= maze.width || fromY < 0 || fromY >= maze.height) {
        return false;
    }

    const cell = maze.grid[fromY][fromX];

    switch (direction) {
        case 'up': return !cell.walls.top;
        case 'down': return !cell.walls.bottom;
        case 'left': return !cell.walls.left;
        case 'right': return !cell.walls.right;
    }
}

// Calculate enemy position based on time (ping-pong motion)
export function getEnemyPosition(
    enemy: PatrolEnemy,
    time: number
): { x: number; y: number; direction: number } {
    const dx = enemy.endX - enemy.startX;
    const dy = enemy.endY - enemy.startY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    // Time to complete one way
    const oneWayTime = distance / enemy.speed;
    const cycleTime = oneWayTime * 2;

    // Current position in cycle
    const cycleProgress = (time % cycleTime) / cycleTime;

    // Ping-pong: 0-0.5 going forward, 0.5-1 going back
    let progress: number;
    let direction: number;

    if (cycleProgress < 0.5) {
        progress = cycleProgress * 2;
        direction = 1;
    } else {
        progress = 1 - (cycleProgress - 0.5) * 2;
        direction = -1;
    }

    return {
        x: enemy.startX + dx * progress,
        y: enemy.startY + dy * progress,
        direction
    };
}
