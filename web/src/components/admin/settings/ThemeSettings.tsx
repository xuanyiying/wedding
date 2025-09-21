import React, { useState, useEffect } from 'react';
import {
  Form,
  Button,
  Space,
  Row,
  Col,
  InputNumber,
  Switch,
  ColorPicker,
  Typography,
  Tooltip,
  Alert,
  message,
} from 'antd';
import {
  SaveOutlined,
  EyeOutlined,
  BgColorsOutlined,
  HeartOutlined,
  StarOutlined,
  CrownOutlined,
  CheckCircleOutlined,
} from '@ant-design/icons';
import styled from 'styled-components';
import { useSettings } from '../../../contexts/SettingsContext';

const { Title, Text } = Typography;

// 婚礼主题预设方案
const WEDDING_THEME_PRESETS = [
  {
    id: 'elegant-rose',
    name: '优雅玫瑰',
    description: '温柔浪漫的玫瑰金配色，营造优雅氛围',
    icon: <HeartOutlined />,
    colors: {
      primary: '#D4A574',
      secondary: '#F5E6D3',
      accent: '#B8956A',
      background: '#FEFCF9',
      text: '#5D4E37'
    }
  },
  {
    id: 'classic-ivory',
    name: '经典象牙白',
    description: '纯净典雅的象牙白主题，永恒经典',
    icon: <StarOutlined />,
    colors: {
      primary: '#F8F6F0',
      secondary: '#E8E2D5',
      accent: '#D4C4A8',
      background: '#FFFFFF',
      text: '#4A4A4A'
    }
  },
  {
    id: 'royal-purple',
    name: '皇室紫',
    description: '高贵典雅的紫色系，彰显尊贵气质',
    icon: <CrownOutlined />,
    colors: {
      primary: '#8B5A96',
      secondary: '#E6D7EA',
      accent: '#6B4C75',
      background: '#FAF8FB',
      text: '#4A3B4F'
    }
  },
  {
    id: 'modern-blush',
    name: '现代腮红',
    description: '时尚的腮红粉配色，现代浪漫风格',
    icon: <HeartOutlined />,
    colors: {
      primary: '#E8B4B8',
      secondary: '#F5E1E3',
      accent: '#D19CA1',
      background: '#FEFBFC',
      text: '#5A4A4C'
    }
  }
];

const SettingSection = styled.div`
  margin-bottom: 40px;
  
  .section-title {
    font-size: 18px;
    font-weight: 600;
    margin-bottom: 8px;
    color: var(--admin-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .section-description {
    color: var(--admin-text-secondary);
    margin-bottom: 24px;
    font-size: 14px;
    line-height: 1.6;
  }
`;

const ThemePresetGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 32px;
`;

const ThemePresetCard = styled.div<{ selected?: boolean }>`
  border: 2px solid ${props => props.selected ? 'var(--admin-primary-color)' : 'var(--admin-border-color)'};
  border-radius: 12px;
  padding: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: var(--admin-bg-container);
  position: relative;
  
  &:hover {
    border-color: var(--admin-primary-color);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    transform: translateY(-2px);
  }
  
  .preset-header {
    display: flex;
    align-items: center;
    gap: 12px;
    margin-bottom: 12px;
  }
  
  .preset-icon {
    font-size: 20px;
    color: var(--admin-primary-color);
  }
  
  .preset-name {
    font-weight: 600;
    font-size: 16px;
    color: var(--admin-text-primary);
  }
  
  .preset-description {
    color: var(--admin-text-secondary);
    font-size: 13px;
    line-height: 1.5;
    margin-bottom: 16px;
  }
  
  .color-palette {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  
  .color-swatch {
    width: 32px;
    height: 32px;
    border-radius: 6px;
    border: 2px solid rgba(255, 255, 255, 0.8);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .selected-badge {
    position: absolute;
    top: 12px;
    right: 12px;
    color: var(--admin-primary-color);
    font-size: 18px;
  }
`;

const ColorCustomizer = styled.div`
  background: var(--admin-bg-secondary, #fafafa);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  
  .customizer-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--admin-text-primary);
  }
`;

const PreviewSection = styled.div`
  background: var(--admin-bg-secondary, #fafafa);
  border-radius: 12px;
  padding: 24px;
  margin-bottom: 24px;
  
  .preview-title {
    font-size: 16px;
    font-weight: 600;
    margin-bottom: 16px;
    color: var(--admin-text-primary);
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .preview-content {
    border: 1px solid var(--admin-border-color);
    border-radius: 8px;
    padding: 20px;
    background: white;
    min-height: 200px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
`;

const SaveButtonGroup = styled.div`
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  padding-top: 24px;
  border-top: 1px solid var(--admin-border-color);
  margin-top: 32px;
  
  @media (max-width: 768px) {
    flex-direction: column;
    
    .ant-btn {
      width: 100%;
    }
  }
`;

const ThemeSettings: React.FC = () => {
  const [form] = Form.useForm();
  const { state, updateThemeSettings, saveThemeSettings } = useSettings();

  // 主题相关状态
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [customColors, setCustomColors] = useState({
    primary: '#D4A574',
    secondary: '#F5E6D3',
    accent: '#B8956A',
    background: '#FEFCF9',
    text: '#5D4E37'
  });
  const [previewMode, setPreviewMode] = useState(false);

  // 初始化表单数据
  useEffect(() => {
    if (state.theme) {
      const theme = state.theme;
      const formData = {
        primaryColor: theme.colors?.primary || '#D4A574',
        secondaryColor: theme.colors?.secondary || '#F5E6D3',
        accentColor: theme.colors?.accent || '#B8956A',
        backgroundColor: theme.colors?.background || '#FEFCF9',
        textColor: theme.colors?.text || '#5D4E37',
        borderRadius: theme.borderRadius || 8,
        fontSize: theme.fontSize || 14,
        compactMode: theme.compactMode || false,
        darkMode: theme.darkMode || false,
        clientThemeVariant: theme.clientThemeVariant || 'custom'
      };
      
      form.setFieldsValue(formData);
      
      if (theme.colors) {
        setCustomColors({
          primary: theme.colors.primary || '#D4A574',
          secondary: theme.colors.secondary || '#F5E6D3',
          accent: theme.colors.accent || '#B8956A',
          background: theme.colors.background || '#FEFCF9',
          text: theme.colors.text || '#5D4E37'
        });
      }
      
      if (theme.clientThemeVariant && theme.clientThemeVariant !== 'custom') {
        setSelectedPreset(theme.clientThemeVariant);
      }
    }
  }, [state.theme, form]);

  // 选择主题预设
  const handlePresetSelect = (presetId: string) => {
    const preset = WEDDING_THEME_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setSelectedPreset(presetId);
      setCustomColors(preset.colors);

      // 更新表单值
      form.setFieldsValue({
        primaryColor: preset.colors.primary,
        secondaryColor: preset.colors.secondary,
        accentColor: preset.colors.accent,
        backgroundColor: preset.colors.background,
        textColor: preset.colors.text,
        clientThemeVariant: presetId
      });

      // 更新主题配置
      updateThemeSettings({
        colors: preset.colors,
        clientThemeVariant: presetId
      });

      // 实时预览
      if (previewMode) {
        applyPreviewTheme(preset.colors);
      }
    }
  };

  // 应用预览主题
  const applyPreviewTheme = (colors: any) => {
    const root = document.documentElement;
    root.style.setProperty('--client-primary-color', colors.primary);
    root.style.setProperty('--client-secondary-color', colors.secondary);
    root.style.setProperty('--client-accent-color', colors.accent);
    root.style.setProperty('--client-bg-primary', colors.background);
    root.style.setProperty('--client-text-primary', colors.text);
  };

  // 切换预览模式
  const togglePreviewMode = () => {
    setPreviewMode(!previewMode);
    if (!previewMode) {
      applyPreviewTheme(customColors);
    }
  };

  // 自定义颜色变化处理
  const handleColorChange = (colorType: string, color: any) => {
    const colorValue = typeof color === 'string' ? color : color.toHexString();
    const newColors = { ...customColors, [colorType]: colorValue };
    setCustomColors(newColors);

    // 清除预设选择
    setSelectedPreset('');

    // 更新主题配置
    updateThemeSettings({
      colors: newColors,
      clientThemeVariant: 'custom'
    });

    // 实时预览
    if (previewMode) {
      applyPreviewTheme(newColors);
    }
  };

  // 保存主题设置
  const handleSave = async (values: any) => {
    try {
      console.log('📝 表单提交的值:', values);
      console.log('📝 当前主题设置状态:', state.theme);
      
      const themeData = {
        colors: {
          primary: customColors.primary,
          secondary: customColors.secondary,
          accent: customColors.accent,
          background: customColors.background,
          text: customColors.text
        },
        fonts: {
          primary: 'Arial, sans-serif',
          secondary: 'Georgia, serif'
        },
        spacing: {
          containerPadding: values.spacing?.containerPadding || '16px',
          sectionPadding: values.spacing?.sectionPadding || '24px'
        },
        borderRadius: values.borderRadius || 8,
        compactMode: values.compactMode || false,
        darkMode: values.darkMode || false,
        fontSize: values.fontSize || 14,
        clientThemeVariant: selectedPreset || 'custom'
      };

      console.log('📝 构建的主题设置数据:', themeData);

      // 先更新本地状态
      updateThemeSettings(themeData);
      
      // 保存到服务器
      const success = await saveThemeSettings();

      if (success) {
        // 关闭预览模式
        setPreviewMode(false);
        message.success('主题设置保存成功');
      } else {
        throw new Error('主题设置保存失败');
      }
    } catch (error) {
      console.error('❌ 保存主题设置失败:', error);
      message.error('保存主题设置失败，请重试');
    }
  };

  const handleReset = () => {
    setSelectedPreset('');
    setCustomColors({
      primary: '#D4A574',
      secondary: '#F5E6D3',
      accent: '#B8956A',
      background: '#FEFCF9',
      text: '#5D4E37'
    });
    form.resetFields();
    updateThemeSettings({
      colors: {
        primary: '#D4A574',
        secondary: '#F5E6D3',
        accent: '#B8956A',
        background: '#FEFCF9',
        text: '#5D4E37'
      },
      clientThemeVariant: 'custom'
    });
  };

  return (
    <div>
      {/* 预览模式提示 */}
      {previewMode && (
        <Alert
          message="预览模式已开启"
          description="您正在实时预览主题效果，记得保存设置以应用到客户端界面"
          type="info"
          showIcon
          closable
          onClose={() => setPreviewMode(false)}
          style={{ marginBottom: 24 }}
        />
      )}

      <Form
        form={form}
        layout="vertical"
        onFinish={handleSave}
      >
        {/* 婚礼主题预设 */}
        <SettingSection>
          <div className="section-title">
            <HeartOutlined />
            婚礼主题预设
          </div>
          <div className="section-description">
            选择专为婚礼服务设计的精美主题配色方案，营造浪漫优雅的视觉体验
          </div>

          <ThemePresetGrid>
            {WEDDING_THEME_PRESETS.map((preset) => (
              <ThemePresetCard
                key={preset.id}
                selected={selectedPreset === preset.id}
                onClick={() => handlePresetSelect(preset.id)}
              >
                {selectedPreset === preset.id && (
                  <div className="selected-badge">
                    <CheckCircleOutlined />
                  </div>
                )}
                <div className="preset-header">
                  <div className="preset-icon">{preset.icon}</div>
                  <div className="preset-name">{preset.name}</div>
                </div>
                <div className="preset-description">{preset.description}</div>
                <div className="color-palette">
                  <div
                    className="color-swatch"
                    style={{ backgroundColor: preset.colors.primary }}
                    title="主色调"
                  />
                  <div
                    className="color-swatch"
                    style={{ backgroundColor: preset.colors.secondary }}
                    title="辅助色"
                  />
                  <div
                    className="color-swatch"
                    style={{ backgroundColor: preset.colors.accent }}
                    title="强调色"
                  />
                  <div
                    className="color-swatch"
                    style={{ backgroundColor: preset.colors.background }}
                    title="背景色"
                  />
                </div>
              </ThemePresetCard>
            ))}
          </ThemePresetGrid>
        </SettingSection>

        {/* 自定义颜色配置 */}
        <SettingSection>
          <div className="section-title">
            <BgColorsOutlined />
            自定义颜色配置
          </div>
          <div className="section-description">
            精细调整主题颜色，打造独特的品牌视觉效果
          </div>

          <ColorCustomizer>
            <div className="customizer-title">主题色彩</div>
            <Row gutter={[16, 16]}>
              <Col span={12} md={8}>
                <Form.Item label="主色调" name="primaryColor">
                  <ColorPicker
                    value={customColors.primary}
                    onChange={(color) => handleColorChange('primary', color)}
                    showText
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12} md={8}>
                <Form.Item label="辅助色" name="secondaryColor">
                  <ColorPicker
                    value={customColors.secondary}
                    onChange={(color) => handleColorChange('secondary', color)}
                    showText
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12} md={8}>
                <Form.Item label="强调色" name="accentColor">
                  <ColorPicker
                    value={customColors.accent}
                    onChange={(color) => handleColorChange('accent', color)}
                    showText
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12} md={8}>
                <Form.Item label="背景色" name="backgroundColor">
                  <ColorPicker
                    value={customColors.background}
                    onChange={(color) => handleColorChange('background', color)}
                    showText
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col span={12} md={8}>
                <Form.Item label="文字色" name="textColor">
                  <ColorPicker
                    value={customColors.text}
                    onChange={(color) => handleColorChange('text', color)}
                    showText
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>
          </ColorCustomizer>
        </SettingSection>

        {/* 实时预览 */}
        <SettingSection>
          <div className="section-title">
            <EyeOutlined />
            实时预览
          </div>
          <div className="section-description">
            开启预览模式，实时查看主题效果
          </div>

          <PreviewSection>
            <div className="preview-title">
              <EyeOutlined />
              主题效果预览
              <Tooltip title={previewMode ? "关闭预览模式" : "开启预览模式"}>
                <Button
                  type={previewMode ? "primary" : "default"}
                  size="small"
                  icon={<EyeOutlined />}
                  onClick={togglePreviewMode}
                  style={{ marginLeft: 'auto' }}
                >
                  {previewMode ? '关闭预览' : '开启预览'}
                </Button>
              </Tooltip>
            </div>

            <div className="preview-content" style={{
              backgroundColor: customColors.background,
              color: customColors.text,
              border: `2px solid ${customColors.secondary}`
            }}>
              <Title level={4} style={{ color: customColors.primary, margin: 0 }}>
                完美婚礼，从这里开始
              </Title>
              <Text style={{ color: customColors.text, display: 'block', margin: '12px 0' }}>
                专业的婚礼策划团队，为您打造独一无二的梦想婚礼
              </Text>
              <Button
                type="primary"
                style={{
                  backgroundColor: customColors.primary,
                  borderColor: customColors.primary,
                  color: customColors.background
                }}
              >
                开始策划您的婚礼
              </Button>
              <div style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: customColors.secondary,
                borderRadius: 8,
                border: `1px solid ${customColors.accent}`
              }}>
                <Text style={{ color: customColors.accent, fontSize: 12 }}>
                  预览效果 • 当前主题：{selectedPreset ? WEDDING_THEME_PRESETS.find(p => p.id === selectedPreset)?.name : '自定义'}
                </Text>
              </div>
            </div>
          </PreviewSection>
        </SettingSection>

        {/* 高级设置 */}
        <SettingSection>
          <div className="section-title">高级设置</div>
          <div className="section-description">配置主题的高级选项和样式细节</div>

          <Row gutter={16}>
            <Col span={12} md={8}>
              <Form.Item
                name="borderRadius"
                label="边框圆角 (px)"
                initialValue={8}
              >
                <InputNumber min={0} max={20} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12} md={8}>
              <Form.Item
                name="fontSize"
                label="字体大小 (px)"
                initialValue={14}
              >
                <InputNumber min={12} max={18} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12} md={8}>
              <Form.Item name="compactMode" valuePropName="checked">
                <Space>
                  <Switch />
                  <span>紧凑模式</span>
                </Space>
              </Form.Item>
            </Col>
          </Row>
        </SettingSection>

        <SaveButtonGroup>
          <Button onClick={handleReset}>
            重置设置
          </Button>
          <Button
            type="primary"
            htmlType="submit"
            icon={<SaveOutlined />}
            loading={state.loading}
            size="large"
          >
            保存主题设置
          </Button>
        </SaveButtonGroup>
      </Form>
    </div>
  );
};

export default ThemeSettings;