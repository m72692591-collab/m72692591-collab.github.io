<?php
declare(strict_types=1);

/** Private RF-hosted receiver. Never executable on GitHub Pages.
 * All production credentials remain server-side. No external notification or AI call.
 * Apply the v2 schema/migration before activation. Legacy clients without request_id
 * remain supported; the new web client always supplies an unpredictable UUID.
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
function clean(mixed $value, int $max, string $field): string {
    if (!is_string($value) || !mb_check_encoding($value, 'UTF-8')) {
        respond(422, ['ok' => false, 'error' => 'invalid_field', 'field' => $field]);
    }
    $value = trim(preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', ' ', $value) ?? '');
    if (mb_strlen($value, 'UTF-8') > $max) {
        respond(422, ['ok' => false, 'error' => 'field_too_long', 'field' => $field, 'limit' => $max]);
    }
    return $value; // Never silently truncate a user's specification.
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
function receipt(int $id, bool $duplicate): never {
    respond($duplicate ? 200 : 201, [
        'ok' => true, 'received' => true, 'duplicate' => $duplicate,
        'reference' => 'M-' . str_pad((string)$id, 7, '0', STR_PAD_LEFT),
    ]);
}
function existingRequest(PDO $db, string $requestId, string $payloadHash): bool {
    $query = $db->prepare('SELECT id, request_hash FROM maestro_leads WHERE request_id = :request_id LIMIT 1');
    $query->execute(['request_id' => $requestId]);
    $row = $query->fetch();
    if ($row === false) return false;
    if (!is_string($row['request_hash']) || !hash_equals($row['request_hash'], $payloadHash)) {
        respond(409, ['ok' => false, 'error' => 'request_conflict']);
    }
    receipt((int)$row['id'], true);
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
    $adminToken = setting('MAESTRO_ADMIN_TOKEN');
    $provided = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($adminToken === '' || !hash_equals('Bearer ' . $adminToken, $provided)) {
        header('WWW-Authenticate: Bearer realm="Maestro Leads"');
        respond(401, ['ok' => false, 'error' => 'unauthorized']);
    }
    try {
        $rows = connection()->query(
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
const MAX_BODY_BYTES = 65536;
if ((int)($_SERVER['CONTENT_LENGTH'] ?? 0) > MAX_BODY_BYTES) respond(413, ['ok' => false, 'error' => 'too_large']);
$stream = fopen('php://input', 'rb');
if ($stream === false) respond(400, ['ok' => false, 'error' => 'invalid_body']);
$raw = stream_get_contents($stream, MAX_BODY_BYTES + 1);
fclose($stream);
if ($raw === false || strlen($raw) > MAX_BODY_BYTES) respond(413, ['ok' => false, 'error' => 'too_large']);
try {
    $data = json_decode($raw, true, 16, JSON_THROW_ON_ERROR);
} catch (JsonException $e) {
    respond(400, ['ok' => false, 'error' => 'invalid_json']);
}
if (!is_array($data)) respond(400, ['ok' => false, 'error' => 'invalid_data']);
if (($data['consent'] ?? false) !== true) respond(422, ['ok' => false, 'error' => 'consent_required']);
if (clean($data['website'] ?? '', 100, 'website') !== '') {
    respond(200, ['ok' => true, 'received' => false]);
}
$requestId = $data['request_id'] ?? null;
if ($requestId !== null) {
    if (!is_string($requestId) || !preg_match('/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iD', $requestId)) {
        respond(422, ['ok' => false, 'error' => 'invalid_request_id']);
    }
    $requestId = strtolower($requestId);
}
$allowedInterests = ['Сайт', 'Лендинг', 'Блог', 'Бот', 'CRM', 'ИИ-оператор', 'Автоматизация', 'Аудит', 'HR', 'Другое'];
$name = clean($data['name'] ?? '', 100, 'name');
$contact = clean($data['contact'] ?? '', 160, 'contact');
$interest = clean($data['interest'] ?? '', 60, 'interest');
$business = clean($data['business'] ?? '', 6000, 'business');
$channels = clean($data['channels'] ?? '', 1500, 'channels');
if ($name === '' || $contact === '' || $business === '' || $channels === '') {
    respond(422, ['ok' => false, 'error' => 'fields_required']);
}
if (!in_array($interest, $allowedInterests, true)) respond(422, ['ok' => false, 'error' => 'invalid_interest']);
if (mb_strlen($contact) < 4 || mb_strlen($name) < 2) respond(422, ['ok' => false, 'error' => 'invalid_contact']);
$pepper = setting('MAESTRO_IP_PEPPER');
if (strlen($pepper) < 32) respond(503, ['ok' => false, 'error' => 'not_configured']);
$ipHash = hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', $pepper);
$payloadHash = hash_hmac('sha256', json_encode([$name, $contact, $interest, $business, $channels], JSON_THROW_ON_ERROR), $pepper);
try {
    $db = connection();
    // Check completed retries before the rate limit: a retry is not a new lead.
    if ($requestId !== null) existingRequest($db, $requestId, $payloadHash);
    $limiter = $db->prepare('SELECT COUNT(*) FROM maestro_leads WHERE ip_hash = :ip_hash AND created_at >= DATE_SUB(UTC_TIMESTAMP(), INTERVAL 1 HOUR)');
    $limiter->execute(['ip_hash' => $ipHash]);
    if ((int)$limiter->fetchColumn() >= 5) respond(429, ['ok' => false, 'error' => 'rate_limited']);
    $stmt = $db->prepare(
        'INSERT INTO maestro_leads (created_at,name,contact,interest,business,channels,ip_hash,consent_at,request_id,request_hash)
         VALUES (UTC_TIMESTAMP(), :name, :contact, :interest, :business, :channels, :ip_hash, UTC_TIMESTAMP(), :request_id, :request_hash)'
    );
    try {
        $stmt->execute([
            'name' => $name, 'contact' => $contact, 'interest' => $interest,
            'business' => $business, 'channels' => $channels, 'ip_hash' => $ipHash,
            'request_id' => $requestId, 'request_hash' => $requestId === null ? null : $payloadHash,
        ]);
    } catch (PDOException $e) {
        // Database UNIQUE constraint also protects simultaneous identical retries.
        if ($e->getCode() === '23000' && $requestId !== null) existingRequest($db, $requestId, $payloadHash);
        throw $e;
    }
    receipt((int)$db->lastInsertId(), false);
} catch (Throwable $e) {
    error_log('MAESTRO leads storage operation failed');
    respond(503, ['ok' => false, 'error' => 'unavailable']);
}
