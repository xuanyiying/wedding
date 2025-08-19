const { chromium } = require('playwright');

async function simpleTest() {
    console.log('🧪 Running simple Playwright test...');
    
    const browser = await chromium.launch({ headless: false });
    const page = await browser.newPage();
    
    try {
        // 测试访问一个简单的页面
        console.log('🌐 Navigating to example.com...');
        await page.goto('https://example.com', { timeout: 30000 });
        console.log('✅ Page loaded successfully!');
        
        // 获取页面标题
        const title = await page.title();
        console.log('📄 Page title:', title);
        
        // 等待2秒
        await page.waitForTimeout(2000);
        
        console.log('✅ Simple test completed successfully!');
        
    } catch (error) {
        console.error('❌ Simple test failed:', error.message);
    } finally {
        await browser.close();
        console.log('🔚 Browser closed');
    }
}

// 运行简单测试
simpleTest().catch(console.error);