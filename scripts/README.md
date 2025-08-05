# 网页媒体资源抓取脚本

这个脚本用于从指定的网页中抓取图片和视频资源，并自动上传到婚礼客户管理系统中。

## 功能特性

- 🌐 自动获取网页内容
- 🖼️ 智能识别和提取图片资源
- 🎥 智能识别和提取视频资源
- 🔐 自动登录管理员账号
- 📤 批量上传媒体文件到系统
- 📊 生成详细的处理报告

## 安装依赖

在scripts目录下运行以下命令安装依赖：

```bash
cd scripts
npm install
```

## 配置说明

脚本中的配置项位于 `CONFIG` 对象中：

```javascript
const CONFIG = {
  baseUrl: 'http://localhost:3000/api',  // 系统API地址
  admin: {
    identifier: 'admin',                 // 管理员账号
    password: 'admin123'                 // 管理员密码
  },
  downloadDir: './downloads',            // 临时下载目录
  urls: [                               // 要抓取的网页URL列表
    'https://mp.weixin.qq.com/s/ghrZ_XT5yMD70Ihf9_bHtA',
    'https://www.ihunyu.com/sirdzm?accessToken=1fe1e5dd-30c5-4e6c-901d-e64613c39295&scheduleDate=2025-06-30&time=2&shareAccessToken=1fe1e5dd-30c5-4e6c-901d-e64613c39295&registerType=5&jy=1'
  ]
};
```

## 使用方法

### 1. 确保系统运行

首先确保婚礼客户管理系统的后端服务正在运行：

```bash
# 在项目根目录
cd server
npm run dev
```

### 2. 运行抓取脚本

```bash
# 在scripts目录
npm start
# 或者
node web-scraper.js
```

## 工作流程

1. **登录系统** - 使用管理员账号登录获取访问token
2. **获取网页内容** - 访问指定的URL获取HTML内容
3. **解析媒体资源** - 使用cheerio解析HTML，提取图片和视频URL
4. **下载文件** - 将媒体文件下载到本地临时目录
5. **上传到系统** - 使用系统的direct-upload API上传文件
6. **清理临时文件** - 删除本地临时文件
7. **生成报告** - 输出处理结果和详细报告

## 输出文件

脚本执行完成后会生成以下文件：

- `scraping-report.json` - 详细的处理报告，包含所有上传文件的信息

## 限制说明

为了避免过度消耗资源，脚本设置了以下限制：

- 每个页面最多处理5张图片
- 每个页面最多处理2个视频
- 请求间隔2秒，避免频繁访问

## 支持的文件格式

### 图片格式
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)
- BMP (.bmp)
- SVG (.svg)

### 视频格式
- MP4 (.mp4)
- AVI (.avi)
- MOV (.mov)
- WMV (.wmv)
- FLV (.flv)
- WebM (.webm)
- MKV (.mkv)

## 错误处理

脚本包含完善的错误处理机制：

- 网络请求超时处理
- 文件下载失败重试
- 上传失败跳过继续处理
- 详细的错误日志输出

## 注意事项

1. **网络环境** - 确保网络连接稳定，能够访问目标网页
2. **存储空间** - 确保系统有足够的存储空间
3. **权限问题** - 确保管理员账号有文件上传权限
4. **版权问题** - 请确保有权使用抓取的媒体资源

## 自定义配置

如需抓取其他网页，可以修改 `CONFIG.urls` 数组：

```javascript
const CONFIG = {
  // ... 其他配置
  urls: [
    'https://example.com/page1',
    'https://example.com/page2',
    // 添加更多URL
  ]
};
```

## 故障排除

### 常见问题

1. **登录失败**
   - 检查管理员账号密码是否正确
   - 确认系统API地址是否正确
   - 检查后端服务是否正常运行

2. **下载失败**
   - 检查网络连接
   - 确认目标网页是否可访问
   - 检查防火墙设置

3. **上传失败**
   - 检查文件大小是否超出限制
   - 确认存储服务是否正常
   - 检查token是否有效

### 调试模式

可以在脚本中添加更多日志输出来调试问题：

```javascript
// 在相关函数中添加
console.log('调试信息:', data);
```

## 扩展功能

脚本支持以下扩展：

1. **添加更多媒体类型支持**
2. **实现断点续传功能**
3. **添加文件去重功能**
4. **支持批量URL导入**
5. **添加定时任务功能**

## 许可证

MIT License