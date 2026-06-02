$body = '{"jsonrpc":"2.0","method":"tools/list","id":1}'
$w = [System.Net.HttpWebRequest]::Create('http://127.0.0.1:3107/mcp')
$w.Method = 'POST'
$w.ContentType = 'application/json'
$bs = [System.Text.Encoding]::UTF8.GetBytes($body)
$w.ContentLength = $bs.Length
$s = $w.GetRequestStream()
$s.Write($bs, 0, $bs.Length)
$s.Close()
$resp = $w.GetResponse()
$rs = $resp.GetResponseStream()
$sr = New-Object System.IO.StreamReader($rs)
$sr.ReadToEnd()
