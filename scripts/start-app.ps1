$ErrorActionPreference = "Stop"

Write-Host "正在启动 Local Project Memory..." -ForegroundColor Cyan

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host "错误: 未找到 Node.js，请先安装 Node.js 18+" -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "config.yaml")) {
    Write-Host "错误: 未找到 config.yaml" -ForegroundColor Red
    exit 1
}

Write-Host "安装依赖..." -ForegroundColor Yellow
npm install

Write-Host "安装 Electron 二进制..." -ForegroundColor Yellow
$env:ELECTRON_MIRROR = "https://npmmirror.com/mirrors/electron/"
npm run install:electron

Write-Host "构建项目..." -ForegroundColor Yellow
npm run build

Write-Host "启动应用..." -ForegroundColor Green
npm run app
