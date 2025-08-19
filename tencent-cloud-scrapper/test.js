const { chromium } = require('playwright');

const TENCENT_CLOUD_URL = 'https://cloud.tencent.com/act/pro/warmup202506?fromSource=gwzcw.9884456.9884456.9884456&utm_medium=cpc&utm_id=gwzcw.9884456.9884456.9884456&msclkid=fe143e7722f61bc6630656e4b3da6563#LH';

async function testBuyServer() {
    console.log('🧪 Starting test of the server purchase process...');
    const browser = await chromium.launch({ headless: false }); // 非无头模式，可以看到浏览器操作
    const page = await browser.newPage();

    try {
        console.log('🌐 Navigating to Tencent Cloud page...');
        // 增加超时时间并使用更宽松的等待条件
        await page.goto(TENCENT_CLOUD_URL, { 
            waitUntil: 'domcontentloaded', 
            timeout: 60000 
        });
        console.log('✅ Page loaded successfully.');

        // 等待页面加载完成
        await page.waitForTimeout(3000);
        
        // 查找轻量应用服务器区域
        console.log('🔍 Looking for 轻量应用服务器 section...');
        
        // 尝试多种可能的选择器来定位轻量应用服务器
        const possibleSelectors = [
            'text=轻量应用服务器',
            '[class*="product"] >> text=轻量应用服务器',
            '.product-card >> text=轻量应用服务器',
            'div:has-text("轻量应用服务器")',
            'text=4核4G3M',
            'text=300GB 月流量'
        ];
        
        let serverElement = null;
        for (const selector of possibleSelectors) {
            try {
                serverElement = await page.waitForSelector(selector, { timeout: 5000 });
                console.log(`✅ Found server element with selector: ${selector}`);
                break;
            } catch (e) {
                console.log(`❌ Selector ${selector} not found, trying next...`);
            }
        }
        
        if (!serverElement) {
            console.log('❌ 无法找到轻量应用服务器元素');
            // 截图保存当前页面状态用于调试
            await page.screenshot({ path: 'test-debug-page.png', fullPage: true });
            console.log('📸 已保存页面截图到 test-debug-page.png');
        } else {
            console.log('✅ 成功找到轻量应用服务器区域');
        }
        
        // 查找抢购按钮
        console.log('🔍 Looking for purchase button...');
        
        const buttonSelectors = [
            'text=立即抢购',
            'text=已抢光',
            'button:has-text("立即抢购")',
            'a:has-text("立即抢购")',
            '.btn:has-text("立即抢购")',
            '[class*="buy"]:has-text("立即抢购")',
            'text=38 >> .. >> text=立即抢购'
        ];
        
        let buyButton = null;
        let buttonFound = false;
        
        for (const selector of buttonSelectors) {
            try {
                buyButton = await page.waitForSelector(selector, { timeout: 3000 });
                const buttonText = await buyButton.textContent();
                console.log(`✅ Found button with text: "${buttonText}" using selector: ${selector}`);
                buttonFound = true;
                
                // 检查按钮状态
                if (buttonText.includes('已抢光') || buttonText.includes('已售完')) {
                    console.log('❌ 商品已抢光，无法购买');
                } else if (buttonText.includes('立即抢购')) {
                    console.log('✅ 找到可用的抢购按钮！');
                }
                break;
            } catch (e) {
                console.log(`❌ Button selector ${selector} not found, trying next...`);
            }
        }
        
        if (!buttonFound) {
            console.log('❌ 未找到任何抢购按钮');
            // 截图保存当前页面状态用于调试
            await page.screenshot({ path: 'test-no-button.png', fullPage: true });
            console.log('📸 已保存页面截图到 test-no-button.png');
        }
        
        // 获取页面上所有可见的文本，用于调试
        console.log('\n📋 页面上的主要文本内容:');
        const pageText = await page.textContent('body');
        const relevantText = pageText.match(/(轻量应用服务器|立即抢购|已抢光|4核4G|300GB|38元)/g);
        if (relevantText) {
            console.log('找到相关文本:', relevantText.join(', '));
        } else {
            console.log('未找到相关文本，可能页面结构已变化');
        }
        
        console.log('\n🎉 测试完成！浏览器将在5秒后关闭...');
        await page.waitForTimeout(5000);

    } catch (error) {
        console.error('❌ 测试过程中发生错误:', error.message);
        try {
            await page.screenshot({ path: 'test-error.png', fullPage: true, timeout: 10000 });
            console.log('📸 已保存错误截图到 test-error.png');
        } catch (screenshotError) {
            console.log('❌ 无法保存截图:', screenshotError.message);
        }
    } finally {
        await browser.close();
        console.log('🔚 浏览器已关闭，测试结束');
    }
}

// 立即运行测试
testBuyServer().catch(console.error);