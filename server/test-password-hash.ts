#!/usr/bin/env ts-node

/**
 * Password Hash Test Script
 * 用于测试PasswordUtils的hashPassword方法
 */

import { PasswordUtils } from './src/utils/helpers';

async function testPasswordHash() {
    try {
        console.log('🔐 测试密码哈希功能...');
        console.log('');

        const password = 'admin123';
        console.log(`输入密码: ${password}`);

        // 生成密码哈希
        const hashedPassword = await PasswordUtils.hashPassword(password);

        console.log(`生成的哈希: ${hashedPassword}`);
        console.log('');

        // 验证密码
        const isValid = await PasswordUtils.comparePassword(password, hashedPassword);
        console.log(`密码验证结果: ${isValid ? '✅ 正确' : '❌ 错误'}`);

        // 测试错误密码
        const wrongPassword = 'wrongpassword';
        const isWrongValid = await PasswordUtils.comparePassword(wrongPassword, hashedPassword);
        console.log(`错误密码验证结果: ${isWrongValid ? '✅ 正确' : '❌ 错误'}`);

        console.log('');
        console.log('🎉 密码哈希测试完成！');

    } catch (error) {
        console.error('❌ 测试过程中出现错误:', error);
        process.exit(1);
    }
}

// 运行测试
testPasswordHash();