-- MAESTRO lead storage. Run once in a database hosted in Russia.
-- MySQL 5.7+ / MariaDB. Use UTF8MB4 for Russian text.
CREATE TABLE IF NOT EXISTS maestro_leads (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  name VARCHAR(100) NOT NULL,
  contact VARCHAR(160) NOT NULL,
  interest VARCHAR(60) NOT NULL,
  business TEXT NOT NULL,
  channels VARCHAR(1500) NOT NULL,
  ip_hash CHAR(64) NOT NULL,
  consent_at DATETIME NOT NULL,
  INDEX idx_created (created_at),
  INDEX idx_ip_rate (ip_hash,created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
