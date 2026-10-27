<?php
declare(strict_types=1);
// Only these named server-side secrets may be loaded. Never expose values in a response.
foreach (['MAESTRO_DB_PASSWORD'=>'db_password','MAESTRO_ADMIN_TOKEN'=>'admin_token','MAESTRO_IP_PEPPER'=>'ip_pepper'] as $env=>$file) {
    $path='/run/secrets/'.$file;
    $value=is_readable($path) ? trim((string)file_get_contents($path)) : '';
    if (strlen($value)<32 || strlen($value)>256 || preg_match('/[\r\n\x00]/',$value)) {
        http_response_code(503);
        header('Content-Type: application/json; charset=utf-8');
        header('Cache-Control: no-store');
        echo '{"ok":false,"error":"not_configured"}';
        exit;
    }
    putenv($env.'='.$value);
}
require '/srv/lead-api.php';
