<?php
declare(strict_types=1);

/**
 * MAESTRO lead receiver for a PHP 8.2+ host in Russia.
 * Deploy to a separately configured Russian-hosted HTTPS endpoint.
 * It is NOT executable on GitHub Pages.
 * All credentials are server-side environment variables.
 * No third-party analytics, email gateways, Telegram API, or outgoing PD transfers.
 */
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');
header('X-Content-Type-Options: nosniff');

function respond(int $status, array $data): never {
    http_response_code($status);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}
function setting(string $name): string {
    $value = getenv($name);
    return is_string($value) ? trim($value) : '';
}
function clean(mixed $value, int $max): string {
    if (!is_string($value)) return '';
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', ' ', $value) ?? '');
    if (!mb_check_encoding($value, 'UTF-8')) return '';
    return mb_substr($value, 0, $max, 'UTF-8');
}
function connection(): PDO {
    $dsn = setting('MAESTRO_DB_DSN');
    $user = setting('MAESTRO_DB_USER');
    $password = setting('MAESTRO_DB_PASSWORD');
    if ($dsn === '' || $user === '' || $password === '') respond(503, ['ok' => false, 'error' => 'not_configured']);
    try {
        return new PDO($dsn, $user, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_EMULATE_PREPARES => false,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        ]);
    } catch (Throwable $e) {
        error_log('MAESTRO leads database unavailable');
        respond(503, ['ok' => false, 'error' => 'unavailable']);
    }
}
$method = $_SERVER['REQUEST_METHOD'] ?? '';
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowedOrigin = setting('MAESTRO_ALLOWED_ORIGIN');
if ($allowedOrigin === '') respond(503, ['ok' => false, 'error' => 'not_configured']);
if ($origin !== '' && hash_equals($allowedOrigin, $origin)) {
    header('Access-Control-Allow-Origin: ' . $allowedOrigin);
    header('Vary: Origin');
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
}
if ($method === 'OPTIONS') {
    if ($origin !== $allowedOrigin) respond(403, ['ok' => false, 'error' => 'forbidden']);
    http_response_code(204);
    exit;
}
if ($method === 'GET') {
    // Operator-only read endpoint. Never expose MAESTRO_ADMIN_TOKEN in JS or source.
    $adminToken = setting('MAESTRO_ADMIN_TOKEN');
    $provided = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($adminToken === '' || !hash_equals('Bearer ' . $adminToken, $provided)) {
        header('WWW-Authenticate: Bearer realm="Maestro Leads"');
        respond(401, ['ok' => false, 'error' => 'unauthorized']);
    }
    try {
        $db = connection();
        $rows = $db->query(
            'SELECT id, created_at, name, contact, interest, business, channels FROM maestro_leads ORDER BY id DESC LIMIT 50'
        )->fetchAll();
        respond(200, ['ok' => true, 'leads' => $rows]);
    } catch (Throwable $e) {
        error_log('MAESTRO leads admin read error');
        respond(503, ['ok' => false, 'error' => 'unavailable']);
    }
}
if ($method !== 'POST') {
    header('Allow: GET, POST, OPTIONS');
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}
if (!hash_equals($allowedOrigin, $origin)) respond(403, ['ok' => false, 'error' => 'forbidden']);
if (strtolower(trim(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0])) !== 'application/json') {
    respond(415, ['ok' => false, 'error' => 'json_required']);
}
$size = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
if ($size > 16000) respond(413, ['ok' => false, 'error' => 'too_large']);
$stream = fopen('php://input', 'rb');
if ($stream === false) respond(400, ['ok' => false, 'error' => 'invalid_body']);
$raw = stream_get_contents($stream, 16001);
fclose($stream);
if ($raw === false || strlen($raw) > 16000) respond(413, ['ok' => false, 'error' => 'too_large']);
try {
    $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}
if (!is_array($data)) respond(400, ['ok' => false, 'error' => 'invalid_data']);
if (clean($data['website'] ?? '', 50) !== '') {
    // Honeypot: no storage, no alert.
    respond(200, ['ok' => true, 'received' => false]);
}
$allowedInterests = ['Сайт', 'Лендинг', 'Блог', 'Бот', 'CRM', 'ИИ-оператор', 'Автоматизация', 'Аудит', 'HR', 'Другое'];
$name = clean($data['name'] ?? '', 100);
$contact = clean($data['contact'] ?? '', 160);
$interest = clean($data['interest'] ?? '', 60);
$business = clean($data['business'] ?? '', 6000);
$channels = clean($data['channels'] ?? '', 1500);
if (($data['consent'] ?? false) !== true) respond(422, ['ok' => false, 'error' => 'consent_required']);
if ($name === '' || $contact === '' || $business === '' || $channels === '') {
    respond(422, ['ok' => false, 'error' => 'fields_required']);
}
if (!in_array($interest, $allowedInterests, true)) {
    respond(422, ['ok' => false, 'error' => 'invalid_interest']);
}
if (mb_strlen($contact) < 4 || mb_strlen($name) < 2) {
    respond(422, ['ok' => false, 'error' => 'invalid_contact']);
}
$pepper = setting('MAESTRO_IP_PEPPER');
if (strlen($pepper) < 32) respond(503, ['ok' => false, 'error' => 'not_configured']);
$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$ipHash = hash_hmac('sha256', $ip, $pepper);
try {
    $db = connection();
    // This is a basic rate limit, not a substitute for WAF/CAPTCHA during an attack.
    $limiter = $db->prepare(
        'SELECT COUNT(*) FROM maestro_leads WHERE ip_hash = :ip_hash AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)'
    );
    $limiter->execute(['ip_hash' => $ipHash]);
    if ((int)$limiter->fetchColumn() >= 5) respond(429, ['ok' => false, 'error' => 'rate_limited']);
    $stmt = $db->prepare(
        'INSERT INTO maestro_leads (created_at,name,contact,interest,business,channels,ip_hash,consent_at)
         VALUES (UTC_TIMESTAMP(), :name, :contact, :interest, :business, :channels, :ip_hash, UTC_TIMESTAMP())'
    );
    $stmt->execute([
        'name' => $name, 'contact' => $contact, 'interest' => $interest,
        'business' => $business, 'channels' => $channels, 'ip_hash' => $ipHash
    ]);
    $leadId = (int)$db->lastInsertId();
    respond(201, ['ok' => true, 'received' => true, 'reference' => 'M-' . str_pad((string)$leadId, 7, '0', STR_PAD_LEFT)]);
} catch (Throwable $e) {
    error_log('MAESTRO leads insert error');
    respond(503, ['ok' => false, 'error' => 'unavailable']);
}
