<?php
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $_POST['url']);
curl_setopt($ch, CURLOPT_POST, 1);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($_POST['data']));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$data          = curl_exec ($ch);
$response_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);

curl_close ($ch);

header('HTTP/1.1 ' . $response_code, true, $response_code);
header('Content-Type: application/json');
echo $data;
