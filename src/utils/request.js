import axios from 'axios';
import { ElMessage } from 'element-plus';
// 创建axios实例
const service = axios.create({
  baseURL: 'https://api.mindcraft.com.cn/', 
  timeout: 5000 // 请求超时时间
});

// 请求拦截器
service.interceptors.request.use(
  config => {
    const token = sessionStorage.getItem("apiKey");
    if (token) {
      config.headers['Authorization'] = 'Bearer ' + token;
    }
    return config;
  },
  error => {
    console.error(error);
    Promise.reject(error);
  }
);
// 响应拦截器
service.interceptors.response.use(
  response => {
   return response.data;
  },
  error => {
    if (error.response?.status === 401) {
      ElMessage.error('无效的token')
    }
    console.error('err' + error);
    return Promise.reject(error);
  }
);

export default service;