// src/config.js
// 动态获取后端地址：如果是本地开发，自动指向当前域名的 8000 端口
const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
export const API_BASE_URL = isLocal 
    ? 'http://127.0.0.1:8000' 
    : `http://${window.location.hostname}:8000`;

// 注意：请确保这是你 Django 项目的正确端口，通常是 8000
// 如果是在手机上测试，请通过 PC 的局域网 IP（如 192.168.x.x）访问前端
