#!/bin/bash

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$PROJECT_DIR"

clear || true
echo "========================================"
echo "       安妮内容卡片生成器"
echo "========================================"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "尚未安装 Node.js。浏览器将打开官方下载页。"
  echo "请安装 LTS 版本后，再双击本文件。"
  open "https://nodejs.org/zh-cn/download"
  echo
  read -r -p "按回车键关闭窗口……"
  exit 1
fi

NODE_MAJOR="$(node -p "process.versions.node.split('.')[0]")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "当前 Node.js 版本过低：$(node -v)"
  echo "请安装 Node.js 20 或更高版本。"
  open "https://nodejs.org/zh-cn/download"
  echo
  read -r -p "按回车键关闭窗口……"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "第一次启动：正在安装运行组件，请稍等……"
  npm install
  echo
fi

echo "正在启动。浏览器会自动打开："
echo "http://127.0.0.1:5173"
echo
echo "使用期间请不要关闭这个窗口。"
echo "不用时按 Control + C 停止。"
echo

(sleep 2; open "http://127.0.0.1:5173") &
npm run dev -- --host 127.0.0.1 --port 5173
