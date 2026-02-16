CREATE DATABASE IF NOT EXISTS fitness_tracker;
USE fitness_tracker;

-- Users
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    current_weight DECIMAL(5,1) NOT NULL DEFAULT 145,
    goal_weight DECIMAL(5,1) NOT NULL DEFAULT 180,
    start_weight DECIMAL(5,1) NOT NULL DEFAULT 145,
    calorie_goal INT NOT NULL DEFAULT 3000,
    best_streak INT NOT NULL DEFAULT 0,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Daily logs (one per user per date)
CREATE TABLE daily_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    log_date DATE NOT NULL,
    water BOOLEAN NOT NULL DEFAULT FALSE,
    calories INT NOT NULL DEFAULT 0,
    UNIQUE KEY unique_user_date (user_id, log_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meals
CREATE TABLE meals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_log_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories INT NOT NULL,
    timestamp VARCHAR(50),
    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);

-- Gym sessions
CREATE TABLE gym_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_log_id INT NOT NULL,
    exercises TEXT NOT NULL,
    prs TEXT,
    timestamp VARCHAR(50),
    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);

-- Run sessions
CREATE TABLE run_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    daily_log_id INT NOT NULL,
    distance DECIMAL(5,2) NOT NULL,
    pace VARCHAR(20),
    duration INT,
    timestamp VARCHAR(50),
    FOREIGN KEY (daily_log_id) REFERENCES daily_logs(id) ON DELETE CASCADE
);

-- Weight history
CREATE TABLE weight_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    weigh_date DATE NOT NULL,
    weight DECIMAL(5,1) NOT NULL,
    UNIQUE KEY unique_user_weigh (user_id, weigh_date),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Personal records
CREATE TABLE personal_records (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    record_date DATE NOT NULL,
    description TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Meal presets
CREATE TABLE meal_presets (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    calories INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Exercise library
CREATE TABLE exercises (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    category ENUM('Push', 'Pull', 'Legs', 'Core', 'Cardio') NOT NULL,
    last_weight DECIMAL(6,2),
    last_reps INT,
    last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_exercise (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Progress photos
CREATE TABLE progress_photos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    photo_date DATE NOT NULL,
    image_data LONGTEXT NOT NULL,
    notes TEXT,
    weight_at_time DECIMAL(5,1),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
