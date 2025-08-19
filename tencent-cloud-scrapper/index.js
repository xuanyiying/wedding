const { chromium } = require('playwright');
const cron = require('node-cron');

const TENCENT_CLOUD_URL = 'https://cloud.tencent.com/act/pro/warmup202506?fromSource=gwzcw.9884456.9884456.9884456&utm_medium=cpc&utm_id=gwzcw.9884456.9884456.9884456&msclkid=fe143e7722f61bc6630656e4b3da6563#LH';

async function buyServer() {
    console.log('🚀 Starting the server purchase process...');
    const browser = await chromium.launch({ headless: false }); // Set headless to false to see the browser UI
    const page = await browser.newPage();

    try {
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
            throw new Error('无法找到轻量应用服务器元素');
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
        for (const selector of buttonSelectors) {
            try {
                buyButton = await page.waitForSelector(selector, { timeout: 3000 });
                const buttonText = await buyButton.textContent();
                console.log(`✅ Found button with text: ${buttonText}`);
                
                // 检查按钮状态
                if (buttonText.includes('已抢光') || buttonText.includes('已售完')) {
                    console.log('❌ 商品已抢光，无法购买');
                    return;
                }
                
                if (buttonText.includes('立即抢购')) {
                    break;
                }
            } catch (e) {
                console.log(`❌ Button selector ${selector} not found, trying next...`);
            }
        }
        
        if (!buyButton) {
            console.log('❌ 未找到可用的抢购按钮');
            // 截图保存当前页面状态用于调试
            await page.screenshot({ path: 'debug-page.png', fullPage: true });
            console.log('📸 已保存页面截图到 debug-page.png');
            return;
        }
        
        // 点击抢购按钮
        console.log('🎯 Attempting to click purchase button...');
        
        // 注意：这里取消注释以启用实际点击
        /*
        try {
            await buyButton.click();
            console.log('✅ Successfully clicked the purchase button!');
            
            // 等待页面跳转或弹窗
            await page.waitForTimeout(2000);
            
            // 检查是否需要登录
            const loginSelectors = [
                'input[type="password"]',
                'text=登录',
                'text=手机号',
                'text=验证码',
                '.login-form'
            ];
            
            let needLogin = false;
            for (const selector of loginSelectors) {
                try {
                    await page.waitForSelector(selector, { timeout: 2000 });
                    needLogin = true;
                    console.log('🔐 需要登录，请手动完成登录流程');
                    break;
                } catch (e) {
                    // 继续检查下一个选择器
                }
            }
            
            if (needLogin) {
                console.log('⚠️  请在浏览器中手动完成登录和后续购买流程');
                // 保持浏览器打开更长时间以便手动操作
                await page.waitForTimeout(300000); // 5分钟
            } else {
                console.log('✅ 可能已经登录，请检查购买流程');
            }
            
        } catch (clickError) {
            console.error('❌ 点击抢购按钮失败:', clickError);
            await page.screenshot({ path: 'click-error.png', fullPage: true });
        }
        */

        console.log('🎉 Purchase process script finished. Please complete the remaining steps manually.');

    } catch (error) {
        console.error('❌ An error occurred:', error);
    } finally {
        // Keep the browser open for a while for manual inspection, then close it.
        setTimeout(async () => {
            await browser.close();
        }, 120000); // 2 minutes
    }
}

// Schedule the task to run at 10:00 AM and 3:00 PM every day.
// For testing, you can use a more frequent schedule, like every minute: '* * * * *'
console.log('🕒 Scheduling the purchase task...');
cron.schedule('0 10,15 * * *', () => {
    console.log('🔔 It\'s time! Running the purchase task...');
    buyServer();
}, {
    scheduled: true,
    timezone: "Asia/Shanghai"
});

console.log('✅ Purchase task scheduled. Waiting for the scheduled time...');

// For immediate testing, you can call the function directly.
// buyServer();