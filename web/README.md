# Wedding Client - 前端应用

基于 React + TypeScript + Vite 构建的现代化婚礼工作室前端应用。

## 🚀 技术栈

- **React 18** - 现代化用户界面框架
- **TypeScript** - 类型安全的JavaScript
- **Vite** - 快速构建工具，支持HMR热更新
- **Ant Design 5** - 企业级UI组件库
- **Redux Toolkit** - 状态管理
- **React Router** - 路由管理

## 📁 项目结构

```
web/
├── src/
│   ├── components/     # 通用组件
│   ├── pages/         # 页面组件
│   ├── services/      # API服务
│   ├── store/         # Redux状态管理
│   ├── types/         # TypeScript类型定义
│   ├── utils/         # 工具函数
│   └── styles/        # 样式文件
├── public/            # 静态资源
└── build/            # 构建输出
```

## 🛠️ 开发指南

### 本地开发
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 代码规范
```bash
# 代码检查
npm run lint

# 类型检查
npm run type-check
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      ...tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      ...tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      ...tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```
