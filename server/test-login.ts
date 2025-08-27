#!/usr/bin/env ts-node

/**
 * Login Test Script
 * 用于测试管理员登录功能
 */

import axios from 'axios';

async function testLogin() {
    try {
        console.log('🔐 测试管理员登录功能...');
        console.log('');

        const loginData = {
            username: 'admin',
            password: 'admin123'
        };

        console.log('登录信息:', loginData);
        console.log('');

        // 测试登录
        const response = await axios.post('http://localhost/api/auth/login', loginData, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (response.status === 200) {
            console.log('✅ 登录成功！');
            console.log('响应状态:', response.status);
            console.log('用户信息:', response.data.data?.user);
            console.log('Token已生成:', !!response.data.data?.tokens?.accessToken);
        } else {
            console.log('❌ 登录失败');
            console.log('响应状态:', response.status);
            console.log('响应数据:', response.data);
        }

    } catch (error: any) {
        if (error.response) {
            console.error('❌ 登录请求失败:');
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
        } else if (error.request) {
            console.error('❌ 无法连接到服务器:', error.message);
        } else {
            console.error('❌ 请求配置错误:', error.message);
        }
    }
}

// 运行测试
testLogin();