#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号文章图片和视频提取工具
使用说明：
1. 安装依赖：pip install requests beautifulsoup4 lxml
2. 运行脚本：python wechat_extractor.py
3. 输入微信公众号文章链接

注意：本工具仅供学习研究使用，请遵守相关法律法规，尊重原创内容版权。
"""

import requests
import re
import os
import json
from urllib.parse import urljoin, urlparse
from bs4 import BeautifulSoup
import time

class WeChatExtractor:
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1'
        })
    
    def extract_content(self, url):
        """
        提取微信公众号文章内容
        """
        try:
            print(f"正在获取文章内容: {url}")
            response = self.session.get(url, timeout=30)
            response.raise_for_status()
            response.encoding = 'utf-8'
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # 提取文章标题
            title_elem = soup.find('h1', class_='rich_media_title')
            title = title_elem.get_text(strip=True) if title_elem else "未知标题"
            
            # 提取文章内容区域
            content_elem = soup.find('div', class_='rich_media_content')
            if not content_elem:
                print("未找到文章内容区域")
                return None
            
            # 提取图片
            images = self.extract_images(content_elem, url)
            
            # 提取视频
            videos = self.extract_videos(response.text, url)
            
            return {
                'title': title,
                'url': url,
                'images': images,
                'videos': videos
            }
            
        except Exception as e:
            print(f"提取内容时出错: {e}")
            return None
    
    def extract_images(self, content_elem, base_url):
        """
        提取文章中的图片
        """
        images = []
        
        # 查找所有图片标签
        img_tags = content_elem.find_all('img')
        
        for img in img_tags:
            img_url = img.get('data-src') or img.get('src')
            if img_url:
                # 处理相对URL
                if img_url.startswith('//'):
                    img_url = 'https:' + img_url
                elif img_url.startswith('/'):
                    img_url = urljoin(base_url, img_url)
                
                # 获取图片描述
                alt_text = img.get('alt', '')
                
                images.append({
                    'url': img_url,
                    'alt': alt_text,
                    'type': 'image'
                })
        
        print(f"找到 {len(images)} 张图片")
        return images
    
    def extract_videos(self, html_content, base_url):
        """
        提取文章中的视频
        """
        videos = []
        
        # 方法1: 查找iframe中的视频
        iframe_pattern = r'<iframe[^>]*src=["\']([^"\'>]*)["\'][^>]*></iframe>'
        iframe_matches = re.findall(iframe_pattern, html_content, re.IGNORECASE)
        
        for iframe_src in iframe_matches:
            if 'v.qq.com' in iframe_src or 'player.youku.com' in iframe_src or 'player.bilibili.com' in iframe_src:
                videos.append({
                    'url': iframe_src,
                    'type': 'iframe_video',
                    'platform': self.get_video_platform(iframe_src)
                })
        
        # 方法2: 查找微信原生视频
        # 查找视频相关的data属性
        video_pattern = r'data-src=["\']([^"\'>]*\.mp4[^"\'>]*)["\']'
        video_matches = re.findall(video_pattern, html_content, re.IGNORECASE)
        
        for video_url in video_matches:
            if video_url.startswith('//'):
                video_url = 'https:' + video_url
            elif video_url.startswith('/'):
                video_url = urljoin(base_url, video_url)
            
            videos.append({
                'url': video_url,
                'type': 'native_video',
                'platform': 'wechat'
            })
        
        # 方法3: 查找mpvideo相关内容
        mpvideo_pattern = r'"vid"\s*:\s*"([^"]+)"'
        vid_matches = re.findall(mpvideo_pattern, html_content)
        
        for vid in vid_matches:
            # 构造微信视频URL
            video_url = f"https://mp.weixin.qq.com/mp/readtemplate?t=pages/video_player_tmpl&action=mpvideo&auto=0&vid={vid}"
            videos.append({
                'url': video_url,
                'type': 'wechat_video',
                'platform': 'wechat',
                'vid': vid
            })
        
        print(f"找到 {len(videos)} 个视频")
        return videos
    
    def get_video_platform(self, url):
        """
        根据URL判断视频平台
        """
        if 'v.qq.com' in url:
            return 'tencent'
        elif 'youku.com' in url:
            return 'youku'
        elif 'bilibili.com' in url:
            return 'bilibili'
        elif 'weixin.qq.com' in url:
            return 'wechat'
        else:
            return 'unknown'
    
    def download_media(self, media_list, download_dir):
        """
        下载媒体文件
        """
        if not os.path.exists(download_dir):
            os.makedirs(download_dir)
        
        downloaded = []
        
        for i, media in enumerate(media_list):
            try:
                url = media['url']
                media_type = media['type']
                
                # 跳过iframe视频（这些通常需要特殊处理）
                if media_type == 'iframe_video':
                    print(f"跳过iframe视频: {url}")
                    continue
                
                print(f"正在下载 {media_type}: {url}")
                
                response = self.session.get(url, timeout=30)
                response.raise_for_status()
                
                # 确定文件扩展名
                parsed_url = urlparse(url)
                filename = os.path.basename(parsed_url.path)
                if not filename or '.' not in filename:
                    if media_type == 'image':
                        filename = f"image_{i+1}.jpg"
                    else:
                        filename = f"video_{i+1}.mp4"
                
                filepath = os.path.join(download_dir, filename)
                
                with open(filepath, 'wb') as f:
                    f.write(response.content)
                
                downloaded.append({
                    'original_url': url,
                    'local_path': filepath,
                    'type': media_type
                })
                
                print(f"下载完成: {filepath}")
                time.sleep(1)  # 避免请求过快
                
            except Exception as e:
                print(f"下载失败 {url}: {e}")
        
        return downloaded
    
    def save_results(self, results, output_file):
        """
        保存提取结果到JSON文件
        """
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"结果已保存到: {output_file}")

def main():
    print("微信公众号文章图片和视频提取工具")
    print("=" * 50)
    
    # 获取用户输入
    url = input("请输入微信公众号文章链接: ").strip()
    
    if not url.startswith('https://mp.weixin.qq.com/'):
        print("错误: 请输入有效的微信公众号文章链接")
        return
    
    # 创建提取器
    extractor = WeChatExtractor()
    
    # 提取内容
    results = extractor.extract_content(url)
    
    if not results:
        print("提取失败")
        return
    
    print(f"\n文章标题: {results['title']}")
    print(f"图片数量: {len(results['images'])}")
    print(f"视频数量: {len(results['videos'])}")
    
    # 显示提取的媒体信息
    if results['images']:
        print("\n图片列表:")
        for i, img in enumerate(results['images'], 1):
            print(f"  {i}. {img['url']}")
    
    if results['videos']:
        print("\n视频列表:")
        for i, video in enumerate(results['videos'], 1):
            print(f"  {i}. [{video['platform']}] {video['url']}")
    
    # 询问是否下载
    download = input("\n是否下载媒体文件? (y/n): ").strip().lower()
    
    if download == 'y':
        # 创建下载目录
        safe_title = re.sub(r'[<>:"/\\|?*]', '_', results['title'])
        download_dir = f"downloads/{safe_title}"
        
        # 下载图片
        if results['images']:
            img_dir = os.path.join(download_dir, 'images')
            downloaded_images = extractor.download_media(results['images'], img_dir)
            results['downloaded_images'] = downloaded_images
        
        # 下载视频
        if results['videos']:
            video_dir = os.path.join(download_dir, 'videos')
            downloaded_videos = extractor.download_media(results['videos'], video_dir)
            results['downloaded_videos'] = downloaded_videos
    
    # 保存结果
    output_file = f"extraction_results_{int(time.time())}.json"
    extractor.save_results(results, output_file)
    
    print("\n提取完成!")

if __name__ == "__main__":
    main()