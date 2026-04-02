import pygame
import random

# Initialize Pygame
pygame.init()

# Settings
WIDTH, HEIGHT = 800, 600
BALL_SPEED = 5
PADDLE_SPEED = 10

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)

# Setup the display
screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption('Pong Game')

# Define the paddles and ball
class Paddle:
    def __init__(self, x, y):
        self.rect = pygame.Rect(x, y, 10, 100)

    def move(self, dy):
        self.rect.y += dy
        # Keep the paddle on the screen
        if self.rect.top < 0:
            self.rect.top = 0
        if self.rect.bottom > HEIGHT:
            self.rect.bottom = HEIGHT

class Ball:
    def __init__(self):
        self.rect = pygame.Rect(WIDTH // 2, HEIGHT // 2, 15, 15)
        self.speed_x = random.choice((-BALL_SPEED, BALL_SPEED))
        self.speed_y = random.choice((-BALL_SPEED, BALL_SPEED))

    def move(self):
        self.rect.x += self.speed_x
        self.rect.y += self.speed_y

        # Bounce off top and bottom
        if self.rect.top <= 0 or self.rect.bottom >= HEIGHT:
            self.speed_y = -self.speed_y

        # Reset if ball goes out of bounds
        if self.rect.left <= 0 or self.rect.right >= WIDTH:
            self.reset()

    def reset(self):
        self.rect.center = (WIDTH // 2, HEIGHT // 2)
        self.speed_x *= -1

# Initialize the paddles and ball
player_paddle = Paddle(30, HEIGHT // 2 - 50)
ai_paddle = Paddle(WIDTH - 40, HEIGHT // 2 - 50)
ball = Ball()

# Score variables
player_score = 0
ai_score = 0

# Main game loop
running = True
while running:
    for event in pygame.event.get():
        if event.type == pygame.QUIT:
            running = False

    keys = pygame.key.get_pressed()
    if keys[pygame.K_UP]:
        ai_paddle.move(-PADDLE_SPEED)
    if keys[pygame.K_DOWN]:
        ai_paddle.move(PADDLE_SPEED)
    if keys[pygame.K_w]:  # Player's paddle up
        player_paddle.move(-PADDLE_SPEED)
    if keys[pygame.K_s]:  # Player's paddle down
        player_paddle.move(PADDLE_SPEED)

    # AI Logic for Paddle Movement
    if ai_paddle.rect.centery < ball.rect.centery:
        ai_paddle.move(PADDLE_SPEED)
    if ai_paddle.rect.centery > ball.rect.centery:
        ai_paddle.move(-PADDLE_SPEED)

    ball.move()

    # Collision detection
    if ball.rect.colliderect(player_paddle.rect):
        ball.speed_x = -ball.speed_x
    elif ball.rect.colliderect(ai_paddle.rect):
        ball.speed_x = -ball.speed_x

    # Fill the background
    screen.fill(BLACK)
    # Draw paddles and ball
    pygame.draw.rect(screen, WHITE, player_paddle.rect)
    pygame.draw.rect(screen, WHITE, ai_paddle.rect)
    pygame.draw.ellipse(screen, WHITE, ball.rect)

    # Draw the scoreboard
    font = pygame.font.Font(None, 36)
    score_text = font.render(f'{player_score} - {ai_score}', True, WHITE)
    screen.blit(score_text, (WIDTH // 2 - score_text.get_width() // 2, 20))

    pygame.display.flip()
    pygame.time.delay(30)

pygame.quit()