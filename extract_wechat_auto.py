#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号文章图片和视频自动提取工具
直接处理指定的微信公众号文章链接
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
            video_url = f"https://mp.weixin.qq.com/mp/readtemplate?t=pages/video_player_tmpl&action=mpvideo&auto=0&vid={vid}"
            videos.append({
                'url': video_url,
                'type': 'wechat_video',
                'platform': 'wechat',
                'vid': vid
            })
        
        # 方法4: 查找更多视频模式
        # 查找视频封面图片，通常视频会有对应的封面
        video_cover_pattern = r'data-cover=["\']([^"\'>]*)["\']'
        cover_matches = re.findall(video_cover_pattern, html_content)
        
        for cover_url in cover_matches:
            if cover_url and 'mmbiz' in cover_url:
                videos.append({
                    'url': cover_url,
                    'type': 'video_cover',
                    'platform': 'wechat'
                })
        
        print(f"找到 {len(videos)} 个视频相关资源")
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
    
    def save_results(self, results, output_file):
        """
        保存提取结果到JSON文件
        """
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(results, f, ensure_ascii=False, indent=2)
        print(f"结果已保存到: {output_file}")

def main():
    # 指定要提取的微信公众号文章链接
    url = "https://mp.weixin.qq.com/s/ghrZ_XT5yMD70Ihf9_bHtA"
    
    print("微信公众号文章图片和视频自动提取工具")
    print("=" * 50)
    print(f"目标文章: {url}")
    print()
    
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
        print("\n=== 图片列表 ===")
        for i, img in enumerate(results['images'], 1):
            print(f"  {i}. {img['url']}")
            if img['alt']:
                print(f"     描述: {img['alt']}")
    
    if results['videos']:
        print("\n=== 视频列表 ===")
        for i, video in enumerate(results['videos'], 1):
            print(f"  {i}. [{video['platform']}] {video['type']}")
            print(f"     URL: {video['url']}")
            if 'vid' in video:
                print(f"     VID: {video['vid']}")
    
    # 保存结果
    timestamp = int(time.time())
    output_file = f"wechat_extraction_{timestamp}.json"
    extractor.save_results(results, output_file)
    
    print(f"\n提取完成! 共找到 {len(results['images'])} 张图片和 {len(results['videos'])} 个视频资源")
    print(f"详细结果已保存到: {output_file}")
    
    # 创建简化的URL列表文件
    url_file = f"wechat_urls_{timestamp}.txt"
    with open(url_file, 'w', encoding='utf-8') as f:
        f.write(f"微信公众号文章: {results['title']}\n")
        f.write(f"原文链接: {url}\n\n")
        
        if results['images']:
            f.write("=== 图片URL列表 ===\n")
            for i, img in enumerate(results['images'], 1):
                f.write(f"{i}. {img['url']}\n")
            f.write("\n")
        
        if results['videos']:
            f.write("=== 视频URL列表 ===\n")
            for i, video in enumerate(results['videos'], 1):
                f.write(f"{i}. [{video['platform']}] {video['url']}\n")
    
    print(f"URL列表已保存到: {url_file}")

if __name__ == "__main__":
    main()