import React, { useState } from 'react';
import EnhancedUploader from '../components/common/EnhancedUploader';
import type { EnhancedUploadResult } from '../types/enhanced-upload.types';
import { formatFileSize } from '../utils/upload-utils';

const UploadDemo: React.FC = () => {
  const [uploadResults, setUploadResults] = useState<EnhancedUploadResult[]>([]);
  const [uploadMode, setUploadMode] = useState<'direct' | 'server'>('direct');
  const [fileType, setFileType] = useState<'image' | 'video' | 'audio' | 'document' | 'other'>('image');
  const [enableResume, setEnableResume] = useState(true);
  const [enableCompression, setEnableCompression] = useState(true);
  
  const handleUploadSuccess = (results: EnhancedUploadResult[]) => {
    setUploadResults(prev => [...prev, ...results]);
  };
  
  const handleUploadError = (error: Error) => {
    console.error('上传错误:', error);
  };
  
  const clearResults = () => {
    setUploadResults([]);
  };
  
  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">增强上传组件演示</h1>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">上传配置</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              上传模式
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="uploadMode"
                  value="direct"
                  checked={uploadMode === 'direct'}
                  onChange={() => setUploadMode('direct')}
                />
                <span className="ml-2">直传OSS</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  className="form-radio"
                  name="uploadMode"
                  value="server"
                  checked={uploadMode === 'server'}
                  onChange={() => setUploadMode('server')}
                />
                <span className="ml-2">服务端上传</span>
              </label>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              文件类型
            </label>
            <select
              className="form-select block w-full mt-1 rounded-md border-gray-300 shadow-sm"
              value={fileType}
              onChange={(e) => setFileType(e.target.value as any)}
            >
              <option value="image">图片</option>
              <option value="video">视频</option>
              <option value="audio">音频</option>
              <option value="document">文档</option>
              <option value="other">其他</option>
            </select>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={enableResume}
                onChange={(e) => setEnableResume(e.target.checked)}
              />
              <span className="ml-2">启用断点续传</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              支持暂停和恢复上传，适合大文件上传
            </p>
          </div>
          
          <div>
            <label className="flex items-center">
              <input
                type="checkbox"
                className="form-checkbox"
                checked={enableCompression}
                onChange={(e) => setEnableCompression(e.target.checked)}
              />
              <span className="ml-2">启用图片压缩</span>
            </label>
            <p className="text-sm text-gray-500 mt-1">
              仅对图片文件有效，可减小文件大小
            </p>
          </div>
        </div>
        
        <EnhancedUploader
          fileType={fileType}
          category="demo"
          multiple={true}
          enableDirectUpload={uploadMode === 'direct'}
          enableResume={enableResume}
          enableCompression={enableCompression}
          retryCount={3}
          timeout={300000} // 5分钟
          onUploadSuccess={handleUploadSuccess}
          onUploadError={handleUploadError}
          className="mb-6"
        />
      </div>
      
      {uploadResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">上传结果</h2>
            <button
              onClick={clearResults}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
            >
              清除结果
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文件名
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    文件类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    大小
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    上传时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {uploadResults.map((result) => (
                  <tr key={result.fileId}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {result.originalName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {result.fileType}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {formatFileSize(result.fileSize)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">
                        {new Date(result.uploadedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-900"
                      >
                        查看
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadDemo;