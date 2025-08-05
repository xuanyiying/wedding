const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');
const https = require('https');
const http = require('http');
const url = require('url');

// 配置
const CONFIG = {
  baseUrl: 'http://localhost:3000/api/v1',
  admin: {
    identifier: 'admin',
    password: 'admin123'
  },
  downloadDir: './downloads',
  urls: [
    'https://mp.weixin.qq.com/s/ghrZ_XT5yMD70Ihf9_bHtA',
    'https://www.ihunyu.com/sirdzm?accessToken=1fe1e5dd-30c5-4e6c-901d-e64613c39295&scheduleDate=2025-06-30&time=2&shareAccessToken=1fe1e5dd-30c5-4e6c-901d-e64613c39295&registerType=5&jy=1'
  ]
};

class WebScraper {
  constructor() {
    this.token = null;
    this.downloadedFiles = [];
  }

  /**
   * 登录获取token
   */
  async login() {
    try {
      console.log('🔐 正在登录管理员账号...');
      const response = await axios.post(`${CONFIG.baseUrl}/auth/login`, {
        identifier: CONFIG.admin.identifier,
        password: CONFIG.admin.password
      });

      if (response.data.success && response.data.data.tokens) {
        this.token = response.data.data.tokens.accessToken;
        console.log('✅ 登录成功，获取到token');
        return true;
      } else {
        throw new Error('登录响应格式错误');
      }
    } catch (error) {
      console.error('❌ 登录失败:', error.response?.data?.message || error.message);
      return false;
    }
  }

  /**
   * 获取网页内容
   */
  async fetchPageContent(pageUrl) {
    try {
      console.log(`🌐 正在获取页面内容: ${pageUrl}`);
      
      // 设置请求头，模拟浏览器
      const response = await axios.get(pageUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'Accept-Encoding': 'gzip, deflate, br',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        timeout: 30000
      });

      return response.data;
    } catch (error) {
      console.error(`❌ 获取页面内容失败: ${pageUrl}`, error.message);
      return null;
    }
  }

  /**
   * 解析页面中的媒体资源
   */
  parseMediaResources(html, baseUrl) {
    const $ = cheerio.load(html);
    const resources = {
      images: [],
      videos: []
    };

    // 提取图片
    $('img').each((i, elem) => {
      const src = $(elem).attr('src') || $(elem).attr('data-src') || $(elem).attr('data-original');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && this.isValidImageUrl(absoluteUrl)) {
          resources.images.push({
            url: absoluteUrl,
            alt: $(elem).attr('alt') || '',
            title: $(elem).attr('title') || ''
          });
        }
      }
    });

    // 提取视频
    $('video').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && this.isValidVideoUrl(absoluteUrl)) {
          resources.videos.push({
            url: absoluteUrl,
            poster: $(elem).attr('poster') || ''
          });
        }
      }
    });

    // 提取video标签内的source
    $('video source').each((i, elem) => {
      const src = $(elem).attr('src');
      if (src) {
        const absoluteUrl = this.resolveUrl(src, baseUrl);
        if (absoluteUrl && this.isValidVideoUrl(absoluteUrl)) {
          resources.videos.push({
            url: absoluteUrl,
            type: $(elem).attr('type') || ''
          });
        }
      }
    });

    console.log(`📊 发现 ${resources.images.length} 个图片, ${resources.videos.length} 个视频`);
    return resources;
  }

  /**
   * 解析相对URL为绝对URL
   */
  resolveUrl(relativeUrl, baseUrl) {
    try {
      if (relativeUrl.startsWith('http')) {
        return relativeUrl;
      }
      if (relativeUrl.startsWith('//')) {
        return 'https:' + relativeUrl;
      }
      if (relativeUrl.startsWith('/')) {
        const parsedBase = new URL(baseUrl);
        return `${parsedBase.protocol}//${parsedBase.host}${relativeUrl}`;
      }
      return new URL(relativeUrl, baseUrl).href;
    } catch (error) {
      console.warn(`⚠️ URL解析失败: ${relativeUrl}`);
      return null;
    }
  }

  /**
   * 验证是否为有效的图片URL
   */
  isValidImageUrl(url) {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg'];
    const lowerUrl = url.toLowerCase();
    return imageExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('image') || 
           lowerUrl.includes('img');
  }

  /**
   * 验证是否为有效的视频URL
   */
  isValidVideoUrl(url) {
    const videoExtensions = ['.mp4', '.avi', '.mov', '.wmv', '.flv', '.webm', '.mkv'];
    const lowerUrl = url.toLowerCase();
    return videoExtensions.some(ext => lowerUrl.includes(ext)) || 
           lowerUrl.includes('video');
  }

  /**
   * 下载文件
   */
  async downloadFile(fileUrl, filename) {
    return new Promise((resolve, reject) => {
      try {
        // 确保下载目录存在
        if (!fs.existsSync(CONFIG.downloadDir)) {
          fs.mkdirSync(CONFIG.downloadDir, { recursive: true });
        }

        const filePath = path.join(CONFIG.downloadDir, filename);
        const file = fs.createWriteStream(filePath);
        
        const protocol = fileUrl.startsWith('https:') ? https : http;
        
        const request = protocol.get(fileUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }, (response) => {
          if (response.statusCode === 200) {
            response.pipe(file);
            file.on('finish', () => {
              file.close();
              console.log(`✅ 下载完成: ${filename}`);
              resolve(filePath);
            });
          } else {
            file.close();
            fs.unlinkSync(filePath);
            reject(new Error(`下载失败，状态码: ${response.statusCode}`));
          }
        });

        request.on('error', (error) => {
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(error);
        });

        request.setTimeout(30000, () => {
          request.abort();
          file.close();
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
          reject(new Error('下载超时'));
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * 上传文件到系统
   */
  async uploadFile(filePath, fileType = 'image') {
    try {
      if (!this.token) {
        throw new Error('未登录，无法上传文件');
      }

      const filename = path.basename(filePath);
      const stats = fs.statSync(filePath);
      const fileBuffer = fs.readFileSync(filePath);
      
      // 获取文件MIME类型
      const ext = path.extname(filename).toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (['.jpg', '.jpeg'].includes(ext)) mimeType = 'image/jpeg';
      else if (ext === '.png') mimeType = 'image/png';
      else if (ext === '.gif') mimeType = 'image/gif';
      else if (ext === '.webp') mimeType = 'image/webp';
      else if (ext === '.mp4') mimeType = 'video/mp4';
      else if (ext === '.avi') mimeType = 'video/avi';
      else if (ext === '.mov') mimeType = 'video/mov';

      // 使用direct-upload API
      console.log(`📤 正在上传文件: ${filename}`);
      
      // 1. 获取预签名URL
      const presignedResponse = await axios.post(
        `${CONFIG.baseUrl}/direct-upload/presigned-url`,
        {
          fileName: filename,
          fileSize: stats.size,
          contentType: mimeType,
          fileType: fileType,
          expires: 3600
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!presignedResponse.data.success) {
        throw new Error(presignedResponse.data.message || '获取预签名URL失败');
      }

      const { uploadUrl, uploadSessionId } = presignedResponse.data.data;

      // 2. 直接上传到OSS
      await axios.put(uploadUrl, fileBuffer, {
        headers: {
          'Content-Type': mimeType
        },
        maxContentLength: Infinity,
        maxBodyLength: Infinity
      });

      // 3. 确认上传完成
      const confirmResponse = await axios.post(
        `${CONFIG.baseUrl}/direct-upload/confirm`,
        {
          uploadSessionId: uploadSessionId,
          actualFileSize: stats.size
        },
        {
          headers: {
            'Authorization': `Bearer ${this.token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!confirmResponse.data.success) {
        throw new Error(confirmResponse.data.message || '确认上传失败');
      }

      console.log(`✅ 上传成功: ${filename}`);
      return confirmResponse.data.data;
    } catch (error) {
      console.error(`❌ 上传失败: ${path.basename(filePath)}`, error.response?.data?.message || error.message);
      throw error;
    }
  }

  /**
   * 生成唯一文件名
   */
  generateUniqueFilename(originalUrl) {
    const urlObj = new URL(originalUrl);
    const pathname = urlObj.pathname;
    const extension = path.extname(pathname) || '.jpg';
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `scraped_${timestamp}_${random}${extension}`;
  }

  /**
   * 处理单个页面
   */
  async processPage(pageUrl) {
    try {
      console.log(`\n🔍 开始处理页面: ${pageUrl}`);
      
      // 获取页面内容
      const html = await this.fetchPageContent(pageUrl);
      if (!html) {
        console.log(`⚠️ 跳过页面: ${pageUrl}`);
        return;
      }

      // 解析媒体资源
      const resources = this.parseMediaResources(html, pageUrl);
      
      // 下载并上传图片
      for (const image of resources.images.slice(0, 5)) { // 限制前5张图片
        try {
          const filename = this.generateUniqueFilename(image.url);
          const filePath = await this.downloadFile(image.url, filename);
          const uploadResult = await this.uploadFile(filePath, 'image');
          
          this.downloadedFiles.push({
            type: 'image',
            originalUrl: image.url,
            filename: filename,
            uploadResult: uploadResult
          });
          
          // 清理本地文件
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`❌ 处理图片失败: ${image.url}`, error.message);
        }
      }

      // 下载并上传视频
      for (const video of resources.videos.slice(0, 2)) { // 限制前2个视频
        try {
          const filename = this.generateUniqueFilename(video.url);
          const filePath = await this.downloadFile(video.url, filename);
          const uploadResult = await this.uploadFile(filePath, 'video');
          
          this.downloadedFiles.push({
            type: 'video',
            originalUrl: video.url,
            filename: filename,
            uploadResult: uploadResult
          });
          
          // 清理本地文件
          fs.unlinkSync(filePath);
        } catch (error) {
          console.error(`❌ 处理视频失败: ${video.url}`, error.message);
        }
      }
      
    } catch (error) {
      console.error(`❌ 处理页面失败: ${pageUrl}`, error.message);
    }
  }

  /**
   * 生成报告
   */
  generateReport() {
    console.log('\n📋 处理报告:');
    console.log('=' .repeat(50));
    console.log(`总共处理文件: ${this.downloadedFiles.length}`);
    
    const images = this.downloadedFiles.filter(f => f.type === 'image');
    const videos = this.downloadedFiles.filter(f => f.type === 'video');
    
    console.log(`图片: ${images.length} 个`);
    console.log(`视频: ${videos.length} 个`);
    
    console.log('\n📁 上传的文件:');
    this.downloadedFiles.forEach((file, index) => {
      console.log(`${index + 1}. [${file.type.toUpperCase()}] ${file.filename}`);
      console.log(`   原始URL: ${file.originalUrl}`);
      console.log(`   系统URL: ${file.uploadResult.url}`);
      console.log('');
    });

    // 保存报告到文件
    const reportData = {
      timestamp: new Date().toISOString(),
      summary: {
        total: this.downloadedFiles.length,
        images: images.length,
        videos: videos.length
      },
      files: this.downloadedFiles
    };
    
    fs.writeFileSync('./scraping-report.json', JSON.stringify(reportData, null, 2));
    console.log('📄 详细报告已保存到: scraping-report.json');
  }

  /**
   * 主执行函数
   */
  async run() {
    try {
      console.log('🚀 开始网页媒体资源抓取任务...');
      
      // 登录
      const loginSuccess = await this.login();
      if (!loginSuccess) {
        console.error('❌ 登录失败，终止任务');
        return;
      }

      // 处理每个页面
      for (const pageUrl of CONFIG.urls) {
        await this.processPage(pageUrl);
        // 添加延迟，避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // 生成报告
      this.generateReport();
      
      console.log('\n🎉 任务完成！');
    } catch (error) {
      console.error('❌ 任务执行失败:', error.message);
    }
  }
}

// 执行脚本
if (require.main === module) {
  const scraper = new WebScraper();
  scraper.run().catch(console.error);
}

module.exports = WebScraper;