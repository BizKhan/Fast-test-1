import { Scene } from './Scene.js';
import { Sprite } from '../entities/Sprite.js';

/**
 * PongScene - Simple Pong game with touch controls for player and AI opponent
 */
export class PongScene extends Scene {
  constructor() {
    super('PongScene');

    // Game constants
    this.CANVAS_WIDTH = 1080;
    this.CANVAS_HEIGHT = 1920;
    this.PADDLE_WIDTH = 20;
    this.PADDLE_HEIGHT = 150;
    this.BALL_SIZE = 20;
    this.PADDLE_SPEED = 500; // pixels per second
    this.BALL_SPEED = 400;

    // Game objects
    this.playerPaddle = null;
    this.aiPaddle = null;
    this.ball = null;

    // Ball velocity
    this.ballVelX = 0;
    this.ballVelY = 0;

    // Scores
    this.playerScore = 0;
    this.aiScore = 0;

    // AI settings
    this.AI_REACTION_TIME = 0.05 + Math.random() * 0.1; // 0.05-0.15 seconds random reaction time
    this.aiTargetY = this.CANVAS_HEIGHT / 2;
    this.aiReactionTimer = 0;
  }

  init() {
    // Create paddles
    this.playerPaddle = new Sprite(
      50,
      this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2,
      this.PADDLE_WIDTH,
      this.PADDLE_HEIGHT
    );
    this.playerPaddle.setColor('#ffffff');

    this.aiPaddle = new Sprite(
      this.CANVAS_WIDTH - 50 - this.PADDLE_WIDTH,
      this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2,
      this.PADDLE_WIDTH,
      this.PADDLE_HEIGHT
    );
    this.aiPaddle.setColor('#ffffff');

    // Create ball
    this.ball = new Sprite(
      this.CANVAS_WIDTH / 2 - this.BALL_SIZE / 2,
      this.CANVAS_HEIGHT / 2 - this.BALL_SIZE / 2,
      this.BALL_SIZE,
      this.BALL_SIZE
    );
    this.ball.setColor('#ffffff');

    // Initialize ball velocity (serve to player)
    this.resetBall();

    // Add to layers
    this.populateLayers();
  }

  populateLayers() {
    // Add background
    const background = {
      render: (ctx) => {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, this.CANVAS_WIDTH, this.CANVAS_HEIGHT);

        // Draw center line
        ctx.strokeStyle = '#ffffff';
        ctx.setLineDash([10, 10]);
        ctx.beginPath();
        ctx.moveTo(this.CANVAS_WIDTH / 2, 0);
        ctx.lineTo(this.CANVAS_WIDTH / 2, this.CANVAS_HEIGHT);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    };
    this.layerManager.addToLayer(background, 'BG_FAR');

    // Add scores display
    const scoresDisplay = {
      sceneRef: this,
      CANVAS_WIDTH: this.CANVAS_WIDTH,
      render: (ctx) => {
        ctx.fillStyle = '#ffffff';
        ctx.font = '48px Arial';
        ctx.textAlign = 'center';

        // Player score (left)
        ctx.fillText(this.sceneRef.playerScore.toString(), this.CANVAS_WIDTH / 4, 100);

        // AI score (right)
        ctx.fillText(this.sceneRef.aiScore.toString(), 3 * this.CANVAS_WIDTH / 4, 100);
      }
    };
    this.layerManager.addToLayer(scoresDisplay, 'UI');

    // Add game objects to default layer
    this.layerManager.addToLayer(this.playerPaddle, 'default');
    this.layerManager.addToLayer(this.aiPaddle, 'default');
    this.layerManager.addToLayer(this.ball, 'default');
  }

  update(deltaTime) {
    if (!this.isActive) return;

    // Handle player input (touch/mouse)
    this.handlePlayerInput(deltaTime);

    // Update AI
    this.updateAI(deltaTime);

    // Update ball physics
    this.updateBall(deltaTime);

    // Check collisions
    this.checkCollisions();

    // Check scoring
    this.checkScoring();
  }

  handlePlayerInput(deltaTime) {
    const mousePos = this.inputHandler.getMousePos();

    // Move paddle towards mouse/touch position
    const targetY = mousePos.y - this.PADDLE_HEIGHT / 2;

    // Clamp to screen bounds
    const clampedY = Math.max(0, Math.min(this.CANVAS_HEIGHT - this.PADDLE_HEIGHT, targetY));

    // Smooth movement towards target
    const currentY = this.playerPaddle.y;
    const diff = clampedY - currentY;
    const moveAmount = Math.sign(diff) * Math.min(Math.abs(diff), this.PADDLE_SPEED * deltaTime);

    this.playerPaddle.y += moveAmount;
  }

  updateAI(deltaTime) {
    // Simple AI: react after a delay, then move towards predicted ball position
    this.aiReactionTimer -= deltaTime;

    if (this.aiReactionTimer <= 0) {
      // Calculate where the ball will be when it reaches the AI paddle
      const timeToReachAI = (this.aiPaddle.x - (this.ball.x + this.BALL_SIZE)) / this.ballVelX;
      if (timeToReachAI > 0) {
        this.aiTargetY = this.ball.y + this.ballVelY * timeToReachAI - this.PADDLE_HEIGHT / 2;
      } else {
        // Ball is moving away, center the paddle
        this.aiTargetY = this.CANVAS_HEIGHT / 2 - this.PADDLE_HEIGHT / 2;
      }

      // Clamp target
      this.aiTargetY = Math.max(0, Math.min(this.CANVAS_HEIGHT - this.PADDLE_HEIGHT, this.aiTargetY));

      // Reset reaction timer
      this.aiReactionTimer = this.AI_REACTION_TIME;
    }

    // Move towards target
    const currentY = this.aiPaddle.y;
    const diff = this.aiTargetY - currentY;
    const moveAmount = Math.sign(diff) * Math.min(Math.abs(diff), this.PADDLE_SPEED * deltaTime);

    this.aiPaddle.y += moveAmount;
  }

  updateBall(deltaTime) {
    this.ball.x += this.ballVelX * deltaTime;
    this.ball.y += this.ballVelY * deltaTime;
  }

  checkCollisions() {
    // Ball collision with top/bottom walls
    if (this.ball.y <= 0) {
      this.ballVelY = Math.abs(this.ballVelY);
      this.ball.y = 0;
    } else if (this.ball.y + this.BALL_SIZE >= this.CANVAS_HEIGHT) {
      this.ballVelY = -Math.abs(this.ballVelY);
      this.ball.y = this.CANVAS_HEIGHT - this.BALL_SIZE;
    }

    // Ball collision with paddles
    // Player paddle (left)
    if (this.ballVelX < 0 && // Ball moving left
        this.ball.x <= this.playerPaddle.x + this.PADDLE_WIDTH &&
        this.ball.x + this.BALL_SIZE >= this.playerPaddle.x &&
        this.ball.y + this.BALL_SIZE >= this.playerPaddle.y &&
        this.ball.y <= this.playerPaddle.y + this.PADDLE_HEIGHT) {

      // Calculate hit position relative to paddle center (-1 to 1)
      const hitPos = (this.ball.y + this.BALL_SIZE / 2 - this.playerPaddle.getCenterY()) / (this.PADDLE_HEIGHT / 2);

      // Adjust angle based on hit position (max 60 degrees)
      const maxAngle = Math.PI / 3;
      const angle = hitPos * maxAngle;
      const speed = Math.sqrt(this.ballVelX * this.ballVelX + this.ballVelY * this.ballVelY);

      this.ballVelX = Math.abs(speed * Math.cos(angle));
      this.ballVelY = speed * Math.sin(angle);

      // Ensure ball is outside paddle
      this.ball.x = this.playerPaddle.x + this.PADDLE_WIDTH;
    }

    // AI paddle (right)
    if (this.ballVelX > 0 && // Ball moving right
        this.ball.x + this.BALL_SIZE >= this.aiPaddle.x &&
        this.ball.x <= this.aiPaddle.x + this.PADDLE_WIDTH &&
        this.ball.y + this.BALL_SIZE >= this.aiPaddle.y &&
        this.ball.y <= this.aiPaddle.y + this.PADDLE_HEIGHT) {

      // Calculate hit position relative to paddle center (-1 to 1)
      const hitPos = (this.ball.y + this.BALL_SIZE / 2 - this.aiPaddle.getCenterY()) / (this.PADDLE_HEIGHT / 2);

      // Adjust angle based on hit position (max 60 degrees)
      const maxAngle = Math.PI / 3;
      const angle = hitPos * maxAngle;
      const speed = Math.sqrt(this.ballVelX * this.ballVelX + this.ballVelY * this.ballVelY);

      this.ballVelX = -Math.abs(speed * Math.cos(angle));
      this.ballVelY = speed * Math.sin(angle);

      // Ensure ball is outside paddle
      this.ball.x = this.aiPaddle.x - this.BALL_SIZE;
    }
  }

  checkScoring() {
    // Player scores
    if (this.ball.x + this.BALL_SIZE >= this.CANVAS_WIDTH) {
      this.playerScore++;
      this.resetBall();
    }

    // AI scores
    if (this.ball.x <= 0) {
      this.aiScore++;
      this.resetBall();
    }
  }

  resetBall() {
    // Reset ball position
    this.ball.x = this.CANVAS_WIDTH / 2 - this.BALL_SIZE / 2;
    this.ball.y = this.CANVAS_HEIGHT / 2 - this.BALL_SIZE / 2;

    // Reset AI reaction time for fair play
    this.AI_REACTION_TIME = 0.05 + Math.random() * 0.1;

    // Serve towards player (left side)
    const angle = (Math.random() - 0.5) * Math.PI / 3; // -60 to 60 degrees

    this.ballVelX = -this.BALL_SPEED * Math.cos(angle);
    this.ballVelY = this.BALL_SPEED * Math.sin(angle);
  }

  render() {
    // Rendering is handled by layer manager
  }
}