<?php
$api_base = 'https://kitchenasty-api.onrender.com';
$path = $_GET['api_path'] ?? '/';

$params = $_GET;
unset($params['api_path']);
if ($params) {
    $path .= '?' . http_build_query($params);
}

$url = $api_base . $path;
$method = $_SERVER['REQUEST_METHOD'];

$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HEADER, true);
curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
curl_setopt($ch, CURLOPT_ENCODING, '');

$body = file_get_contents('php://input');
if ($body) curl_setopt($ch, CURLOPT_POSTFIELDS, $body);

$headers = [];
foreach (getallheaders() as $name => $value) {
    if (!in_array(strtolower($name), ['host', 'content-length'])) {
        $headers[] = "$name: $value";
    }
}
curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

$response = curl_exec($ch);
$header_size = curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$response_body = substr($response, $header_size);
curl_close($ch);

http_response_code($http_code);
$skip = ['transfer-encoding', 'content-encoding', 'connection'];
foreach (explode("\r\n", substr($response, 0, $header_size)) as $h) {
    $name = strtolower(explode(':', $h, 2)[0] ?? '');
    if ($name && !in_array($name, $skip)) {
        header($h, false);
    }
}
echo $response_body;
