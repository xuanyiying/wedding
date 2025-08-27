#!/usr/bin/env ts-node

/**
 * MinIO Presigned URL Test Script
 * 用于测试MinIO预签名URL功能
 */

import axios from 'axios';

async function testMinIOPresignedUrl() {
    try {
        console.log('🔐 测试MinIO预签名URL功能...');
        console.log('');

        // 首先登录获取token
        const loginResponse = await axios.post('http://localhost/api/v1/auth/login', {
            identifier: 'admin',
            password: 'admin123'
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 10000
        });

        if (loginResponse.status !== 200) {
            console.error('❌ 登录失败');
            return;
        }

        const token = loginResponse.data.data?.tokens?.accessToken;
        if (!token) {
            console.error('❌ 无法获取访问token');
            return;
        }

        console.log('✅ 登录成功，获取到token');
        console.log('');

        // 测试预签名URL
        const presignedResponse = await axios.post('http://localhost/api/v1/direct-upload/presigned-url', {
            fileName: 'test-image.jpg',
            fileType: 'image',
            contentType: 'image/jpeg',
            fileSize: 1024 * 1024, // 1MB
            category: 'work'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            timeout: 10000
        });

        if (presignedResponse.status === 200) {
            console.log('✅ 预签名URL生成成功！');
            console.log('响应数据:', presignedResponse.data);
        } else {
            console.log('❌ 预签名URL生成失败');
            console.log('响应状态:', presignedResponse.status);
            console.log('响应数据:', presignedResponse.data);
        }

    } catch (error: any) {
        if (error.response) {
            console.error('❌ 请求失败:');
            console.error('状态码:', error.response.status);
            console.error('错误信息:', error.response.data);
            if (error.response.status === 404) {
                console.error('提示: API路由可能不存在，请检查路由配置');
            }
        } else if (error.request) {
            console.error('❌ 无法连接到服务器:', error.message);
        } else {
            console.error('❌ 请求配置错误:', error.message);
        }
    }
}

// 运行测试
testMinIOPresignedUrl();