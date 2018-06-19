import { PongerModel } from './model';

/** Class for Ponger view layer */
class PongerView {
  /**
   * Create a Ponger view
   * @param {PongerModel} model - dependency injection
   */
  constructor(model) {
    this.model = model;
    this.canvas = document.getElementById('canvas');
    this.context = this.canvas.getContext('2d');
  }

  /** Initialize view */
  init() {
    this.model.init();
    this.sound = new Audio('./sound.wav');
    this.started = false;
    this.playing = false;

    // handle window resize
    window.addEventListener('resize', () => { this.resizeCanvas(); }, false);
    this.resizeCanvas();

    const menu = document.getElementById('menu');

    // if connecting to a started game
    if (window.location.hash !== '' && window.location.hash !== '#') {
      if (menu) menu.classList.add('hidden');

      this.start('online', window.location.hash.substr(1));

      return;
    }

    // handle menu
    if (menu) {
      menu.classList.remove('hidden');

      menu.querySelectorAll('button').forEach((element, index) => {
        if (index === 0) element.focus();

        element.addEventListener('click', (event) => {
          menu.classList.add('hidden');

          const btn = event.target && event.target.closest && event.target.closest('button');
          if (btn) btn.blur();
          this.start(btn && btn.value);
        });
      });
    }
  }

  /**
   * Start a new game
   * @param {string} mode - game mode: singleplayer of twoplayer
   * @param {string} hash - id of the room to connect
   */
  start(mode, hash) {
    this.model.init(mode, hash);
    this.prevTime = new Date();

    window.addEventListener('keydown', (event) => {
      this.model.keyDown(event.which);
    });
    window.addEventListener('keyup', (event) => {
      this.model.keyUp(event.which);
    });

    window.addEventListener('keypress', (event) => {
      if (event.which === 32) {
        switch (this.model.state) {
          case this.model.states.OFFLINE: {
            this.started = true;
            this.playing = !this.playing;
            break;
          }
          case this.model.states.WAITING_PLAYER: {
            this.model.playerStarted();
            break;
          }
          default:
        }
      }
    });

    if (this.model.state === this.model.states.OFFLINE) {
      window.addEventListener('blur', () => {
        this.playing = false;
      });
    }

    this.handleModelEvents();

    this.loop();
  }

  /** Handle model's events */
  handleModelEvents() {
    document.addEventListener('open_room', () => {
      window.location.hash = this.model.roomId;
    });

    document.addEventListener('playing_online', () => {
      this.playing = true;
    });

    document.addEventListener('disconnected', () => {
      this.playing = false;
    });

    document.addEventListener('collision', () => {
      this.sound.play();
    });
  }

  /** Resize <canvas> element */
  resizeCanvas() {
    const containerSize = { w: window.innerWidth, h: window.innerHeight };
    const fieldRatio = this.model.abstractWidth / this.model.abstractHeight;

    if (containerSize.w < containerSize.h * fieldRatio) {
      this.canvas.width = containerSize.w - 10;
      this.canvas.height = (containerSize.w - 10) / fieldRatio;
    } else {
      this.canvas.width = (containerSize.h - 10) * fieldRatio;
      this.canvas.height = containerSize.h - 10;
    }
  }

  /** Main loop */
  loop() {
    window.requestAnimationFrame(() => { this.loop(); });

    if (this.playing) {
      const dt = new Date() - this.prevTime;

      this.model.updateBall(dt);
      if (this.model.state === this.model.states.OFFLINE) {
        this.model.updateBats(dt);
        this.model.detectCollision(this.model.leftBat);
        this.model.detectCollision(this.model.rightBat);
        this.model.detectPoint();
      }
    }

    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.drawLines();
    this.drawPoints();
    this.drawBat(this.model.leftBat);
    this.drawBat(this.model.rightBat);
    this.drawBall();

    if (!this.playing) {
      this.drawPausedInfo();
    }

    this.prevTime = new Date();
  }

  /** Draw dashed half-way line */
  drawLines() {
    this.context.beginPath();
    this.context.strokeStyle = 'rgba(255, 255, 255, .1)';
    this.context.setLineDash([this.canvas.width * 0.04, this.canvas.width * 0.047]);
    this.context.lineWidth = this.canvas.width * 0.015;
    this.context.moveTo(this.canvas.width / 2, 0);
    this.context.lineTo(this.canvas.width / 2, this.canvas.height);
    this.context.stroke();
    this.context.setLineDash([]);
  }

  /** Write out current points of players */
  drawPoints() {
    this.context.fillStyle = 'rgba(255, 255, 255, .3)';
    this.context.font = `${this.canvas.width / 10}px "Lucida Console", Monaco, monospace`;
    this.context.textBaseline = 'top';

    this.context.textAlign = 'right';
    this.context.fillText(
      this.model.points ? this.model.points[0] : 0,
      (this.canvas.width / 2) - (this.canvas.width * 0.02),
      this.canvas.width * 0.02,
    );

    this.context.fillStyle = 'rgba(255, 255, 255, .3)';
    this.context.textAlign = 'left';
    this.context.fillText(
      this.model.points ? this.model.points[1] : 0,
      (this.canvas.width / 2) + (this.canvas.width * 0.02),
      this.canvas.width * 0.02,
    );
  }

  /** Draw the ball */
  drawBall() {
    this.context.beginPath();
    this.context.fillStyle = 'yellow';
    this.context.arc(
      this.model.ball.x / this.model.abstractWidth * this.canvas.width,
      this.model.ball.y / this.model.abstractHeight * this.canvas.height,
      this.canvas.width * this.model.ball.r / this.model.abstractWidth, 0, Math.PI * 2,
    );
    this.context.fill();
  }

  /**
   * Draw a bat
   * @param {Object} bat
   * @param {number} bat.x - X position
   * @param {number} bat.y - Y position
   * @param {number} bat.w - abstract width
   * @param {number} bat.h - abstract height
   */
  drawBat(bat) {
    this.context.fillStyle = 'white';
    this.context.fillRect(
      (bat.x - (bat.w / 2)) / this.model.abstractWidth * this.canvas.width,
      (bat.y - (bat.h / 2)) / this.model.abstractHeight * this.canvas.height,
      bat.w / this.model.abstractWidth * this.canvas.width,
      bat.h / this.model.abstractHeight * this.canvas.height,
    );
  }

  /** Write out message when paused */
  drawPausedInfo() {
    this.context.fillStyle = 'rgba(255, 255, 255, .6)';
    this.context.fillRect(
      (this.canvas.width / 2) - (this.canvas.width * 0.35),
      (this.canvas.height / 2) - (this.canvas.height * 0.1),
      this.canvas.width * 0.7,
      this.canvas.height * 0.2,
    );

    this.context.fillStyle = '#2e3f73';
    this.context.font = `${this.canvas.width / 25}px "Lucida Console", Monaco, monospace`;
    this.context.textBaseline = 'middle';
    this.context.textAlign = 'center';

    this.context.fillText(
      this.getInfoText(),
      this.canvas.width / 2,
      this.canvas.height / 2,
      this.canvas.width * 0.65,
    );
  }

  /**
   * Return info text about current state
   * @return {string}
   */
  getInfoText() {
    switch (this.model.state) {
      case this.model.states.CONNECTING: return 'Connecting...';
      case this.model.states.CONNECTION_FAILED: return 'Connection failed.';
      case this.model.states.WAITING_OPPONENT_TO_CONNECT:
        return 'Share the URL with your opponent to connect!';
      case this.model.states.WAITING_OPPONENT_TO_START: return 'Waiting opponent to start.';
      case this.model.states.OPPONENT_DISCONNECTED: return 'Opponent disconnected.';
      default: return `Press "SPACE" to ${this.started ? 'continue' : 'start'}!`;
    }
  }
}

const model = new PongerModel();
const view = new PongerView(model);

view.init();
