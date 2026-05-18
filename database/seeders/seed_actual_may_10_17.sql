-- Seeder SQL: data aktual rekayasa 10–17 Mei 2026
-- Jalankan setelah schema: mysql -u root -p ultrasonic_iot < database/seeders/seed_actual_may_10_17.sql

USE ultrasonic_iot;

SET @device_id = '8ca66a20-4fb4-11f1-8db5-c3197a5d8b3d';

DELETE FROM water_daily_consumption
WHERE device_id = @device_id
  AND consumption_date BETWEEN '2026-05-10' AND '2026-05-17';

DELETE FROM water_telemetry
WHERE device_id = @device_id
  AND recorded_at >= '2026-05-10 00:00:00'
  AND recorded_at < '2026-05-18 00:00:00';

INSERT INTO water_daily_consumption (device_id, consumption_date, liters, source) VALUES
(@device_id, '2026-05-10', 10.2400, 'seed'),
(@device_id, '2026-05-11',  8.7100, 'seed'),
(@device_id, '2026-05-12', 11.0800, 'seed'),
(@device_id, '2026-05-13',  9.4300, 'seed'),
(@device_id, '2026-05-14',  7.8600, 'seed'),
(@device_id, '2026-05-15', 10.5200, 'seed'),
(@device_id, '2026-05-16',  9.9100, 'seed'),
(@device_id, '2026-05-17', 11.2700, 'seed');

-- Contoh telemetri per jam (10 Mei, jam 06–08 pompa ON)
INSERT INTO water_telemetry (
  device_id, recorded_at, jarak_cm, level_cm, level_air_percent,
  tank_volume_liter, volume_liter, flow_in_lpm, flow_out_lpm, flow_diff_lpm,
  loss_percent, pump_on, pump_status, pump_mode, activity,
  leak_detected, error_count, total_used_liter
) VALUES
(@device_id, '2026-05-10 06:00:00.000', 12.50, 37.50, 75.00, 57.00, 42.75, 2.56, 2.48, 0.08, 3.13, 1, 'ON',  'MANUAL', 'shower', 0, 0, 2.5600),
(@device_id, '2026-05-10 07:00:00.000', 13.10, 36.90, 73.80, 57.00, 42.07, 2.71, 2.63, 0.08, 2.95, 1, 'ON',  'MANUAL', 'shower', 0, 0, 5.1200),
(@device_id, '2026-05-10 08:00:00.000', 13.70, 36.30, 72.60, 57.00, 41.38, 2.86, 2.78, 0.08, 2.80, 1, 'ON',  'MANUAL', 'shower', 0, 0, 7.6800),
(@device_id, '2026-05-10 12:00:00.000', 14.80, 35.20, 70.40, 57.00, 40.13, 2.56, 2.48, 0.08, 3.13, 1, 'ON',  'MANUAL', 'low_use', 0, 0, 9.8500),
(@device_id, '2026-05-10 18:00:00.000', 15.40, 34.60, 69.20, 57.00, 39.44, 2.71, 2.63, 0.08, 2.95, 1, 'ON',  'MANUAL', 'shower', 0, 0, 12.0100);

-- Untuk semua jam 10–17 Mei gunakan: npm run db:seed
