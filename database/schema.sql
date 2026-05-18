-- Skema MySQL — kolom snake_case selaras ESP32 / ThingsBoard / CSV training
CREATE DATABASE IF NOT EXISTS ultrasonic_iot
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE ultrasonic_iot;

-- Snapshot telemetri (per menit / per poll)
CREATE TABLE IF NOT EXISTS water_telemetry (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(64) NOT NULL,
  recorded_at DATETIME(3) NOT NULL,
  jarak_cm DECIMAL(8, 3) NULL COMMENT 'Jarak sensor ke permukaan air',
  level_cm DECIMAL(8, 3) NULL COMMENT 'Tinggi air dari dasar tangki',
  level_air_percent DECIMAL(6, 3) NULL COMMENT 'level_air_percent / level_percent',
  tank_volume_liter DECIMAL(8, 3) NULL DEFAULT 57.0,
  volume_liter DECIMAL(8, 3) NULL,
  flow_in_lpm DECIMAL(8, 3) NULL COMMENT 'flow_in_lpm / flow_sensor_1',
  flow_out_lpm DECIMAL(8, 3) NULL COMMENT 'flow_out_lpm / flow_sensor_2',
  flow_diff_lpm DECIMAL(8, 3) NULL,
  loss_percent DECIMAL(6, 3) NULL,
  pump_on TINYINT(1) NOT NULL DEFAULT 0,
  pump_status ENUM('ON', 'OFF') NULL,
  pump_mode VARCHAR(16) NULL,
  activity VARCHAR(32) NULL,
  leak_detected TINYINT(1) NOT NULL DEFAULT 0,
  error_count INT UNSIGNED NOT NULL DEFAULT 0,
  total_used_liter DECIMAL(12, 4) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_device_recorded (device_id, recorded_at),
  KEY idx_recorded (recorded_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Agregat harian untuk grafik & statistik (sumber: aktual / rekayasa)
CREATE TABLE IF NOT EXISTS water_daily_consumption (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  device_id VARCHAR(64) NOT NULL,
  consumption_date DATE NOT NULL,
  liters DECIMAL(10, 4) NOT NULL,
  source ENUM('device', 'computed', 'seed') NOT NULL DEFAULT 'seed',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uk_device_date (device_id, consumption_date),
  KEY idx_consumption_date (consumption_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
