#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
微信公众号文章媒体资源下载工具
从提取的JSON文件中下载图片和视频
"""

import json
import os
import requests
from urllib.parse import urlparse
import time
from pathlib import Path

def create_download_folder(base_name="wechat_media"):
    """创建下载文件夹"""
    timestamp = int(time.time())
    folder_name = f"{base_name}_{timestamp}"
    os.makedirs(folder_name, exist_ok=True)
    return folder_name

def get_file_extension(url, content_type=None):
    """从URL或Content-Type获取文件扩展名"""
    # 首先尝试从URL获取
    parsed_url = urlparse(url)
    path = parsed_url.path
    if '.' in path:
        ext = os.path.splitext(path)[1]
        if ext:
            return ext
    
    # 从URL参数中获取格式信息
    if 'wx_fmt=' in url:
        fmt = url.split('wx_fmt=')[1].split('&')[0]
        return f'.{fmt}'
    
    # 从Content-Type获取
    if content_type:
        if 'image/jpeg' in content_type or 'image/jpg' in content_type:
            return '.jpg'
        elif 'image/png' in content_type:
            return '.png'
        elif 'image/gif' in content_type:
            return '.gif'
        elif 'video/mp4' in content_type:
            return '.mp4'
    
    # 默认扩展名
    return '.jpg'

def download_file(url, folder_path, filename_prefix, index):
    """下载单个文件"""
    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Referer': 'https://mp.weixin.qq.com/'
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        # 获取文件扩展名
        content_type = response.headers.get('content-type', '')
        ext = get_file_extension(url, content_type)
        
        # 生成文件名
        filename = f"{filename_prefix}_{index:03d}{ext}"
        file_path = os.path.join(folder_path, filename)
        
        # 保存文件
        with open(file_path, 'wb') as f:
            f.write(response.content)
        
        print(f"✓ 下载成功: {filename} ({len(response.content)} bytes)")
        return True, filename
        
    except Exception as e:
        print(f"✗ 下载失败: {url} - {str(e)}")
        return False, None

def download_media_from_json(json_file_path):
    """从JSON文件下载媒体资源"""
    try:
        # 读取JSON文件
        with open(json_file_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        print(f"文章标题: {data.get('title', 'Unknown')}")
        print(f"原文链接: {data.get('url', 'Unknown')}")
        print()
        
        # 创建下载文件夹
        download_folder = create_download_folder()
        print(f"下载文件夹: {download_folder}")
        print()
        
        # 下载图片
        images = data.get('images', [])
        if images:
            print(f"开始下载 {len(images)} 张图片...")
            image_folder = os.path.join(download_folder, 'images')
            os.makedirs(image_folder, exist_ok=True)
            
            success_count = 0
            for i, image in enumerate(images, 1):
                url = image.get('url', '')
                if url:
                    success, filename = download_file(url, image_folder, 'image', i)
                    if success:
                        success_count += 1
                    time.sleep(0.5)  # 避免请求过快
            
            print(f"图片下载完成: {success_count}/{len(images)}")
            print()
        
        # 下载视频封面
        videos = data.get('videos', [])
        if videos:
            print(f"开始下载 {len(videos)} 个视频封面...")
            video_folder = os.path.join(download_folder, 'video_covers')
            os.makedirs(video_folder, exist_ok=True)
            
            success_count = 0
            for i, video in enumerate(videos, 1):
                url = video.get('url', '')
                if url:
                    success, filename = download_file(url, video_folder, 'video_cover', i)
                    if success:
                        success_count += 1
                    time.sleep(0.5)  # 避免请求过快
            
            print(f"视频封面下载完成: {success_count}/{len(videos)}")
            print()
        
        # 保存下载信息
        info_file = os.path.join(download_folder, 'download_info.json')
        download_info = {
            'title': data.get('title', ''),
            'url': data.get('url', ''),
            'download_time': time.strftime('%Y-%m-%d %H:%M:%S'),
            'total_images': len(images),
            'total_videos': len(videos),
            'download_folder': download_folder
        }
        
        with open(info_file, 'w', encoding='utf-8') as f:
            json.dump(download_info, f, ensure_ascii=False, indent=2)
        
        print(f"下载信息已保存到: {info_file}")
        print(f"所有文件已下载到: {os.path.abspath(download_folder)}")
        
    except Exception as e:
        print(f"处理JSON文件时出错: {str(e)}")

def main():
    """主函数"""
    json_file = '/Users/yiying/dev-app/wedding-client/wechat_extraction_1754793462.json'
    
    if not os.path.exists(json_file):
        print(f"错误: JSON文件不存在: {json_file}")
        return
    
    print("微信公众号文章媒体资源下载工具")
    print("=" * 50)
    print()
    
    download_media_from_json(json_file)

if __name__ == '__main__':
    main()